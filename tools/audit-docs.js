#!/usr/bin/env node
/* ============================================================
   tools/audit-docs.js — 99 份教学文档的质量验收
   运行：node tools/audit-docs.js

   把「文档写得好不好」变成可自动判定的问题：
     ① 章节结构一致、内容非空、无占位符残留
     ② desc 不含内部批注（【…】）
     ③ METHOD_EXTRA 覆盖率与 exercise 字段齐全度
     ④ 闭环极点算例覆盖率（并区分「严格推导」与「理想化近似」）
     ⑤ 玩梗/吐槽文风关键词黑名单
     ⑥ 文档篇幅下限
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
/* 前端静态站根目录（Netlify publish 目录） */
const app = path.join(root, 'public');
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
  parseFloat, parseInt, isNaN, isFinite,
  document: { readyState: 'complete', getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
['data.js', 'math.js', 'fit-data.js', 'docs.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(app, 'js', f), 'utf8'), sandbox, { filename: f });
});
const D = sandbox.CtrlSim.data, docs = sandbox.CtrlSim.docs;

/* 玩梗 / 吐槽文风黑名单：这些词出现在教学正文里就是不合格 */
const MEME_WORDS = ['降维打击', '拔枪', '踹回去', '征服系统', '底牌', '拍死', '太极拳',
  '疯狂辨识', '侦查', '僵尸', '破铜烂铁', '残骸', '硬掰', '打脸', '秒杀', '牛逼',
  '吊炸', '宇宙无敌', '星际', '银河系', '佛系', '玄学', '整活', '骚操作', '玩命',
  '/spy/', '原型机', '毒瘤', '智商税', '秀肌肉', '拍脑袋'];
/* 占位符残留 */
const PLACEHOLDERS = ['本方法没有额外的机理长文', '待补充', 'TODO', 'FIXME', 'xxx'];
/* 章节基线：所有方法都应具备的章节 */
const BASE_SECTIONS = ['why', 'derive', 'loop', 'proof', 'params', 'tune', 'lab', 'mechanism', 'pitfalls', 'related'];

const problems = [];
const stats = { methods: 0, exact: 0, approx: 0, qualitative: 0, extraCovered: 0, exerciseCovered: 0 };
const sectionSets = {};
const details = { descAnnot: [], meme: [], placeholder: [], noExercise: [], noExtra: [], short: [] };

D.methodList.forEach((key) => {
  stats.methods++;
  const conf = D.CONTROLLER_CONFIGS[key];
  const doc = docs.buildDoc(key);
  if (!doc) { problems.push(key + '：buildDoc 返回空'); return; }
  /* ① 章节结构 */
  const ids = doc.sections.map((s) => s.id);
  sectionSets[ids.join(',')] = (sectionSets[ids.join(',')] || 0);
  BASE_SECTIONS.forEach((sid) => {
    if (ids.indexOf(sid) < 0) problems.push(key + '：缺少章节 ' + sid);
  });
  /* 章节内容非空（methods 块渲染的是同类方法跳转列表，不按文本判定） */
  doc.sections.forEach((s) => {
    if (!s.blocks || !s.blocks.length) problems.push(key + '：章节 ' + s.id + ' 为空');
    s.blocks.forEach((b, bi) => {
      if (b.type === 'methods') return;
      const t = (b.text || '') + (b.items || []).join('') + (b.rows || []).join('') + (b.tex || '');
      if (!t.trim()) problems.push(key + '：章节 ' + s.id + ' 第 ' + (bi + 1) + ' 块为空');
    });
  });
  /* 占位符 */
  const raw = JSON.stringify(doc);
  PLACEHOLDERS.forEach((w) => { if (raw.indexOf(w) >= 0) { problems.push(key + '：残留占位符「' + w + '」'); details.placeholder.push(key); } });
  /* ② desc 内部批注：只判定"开发过程备注"型前缀；
        【LESO + LSEF】这类架构标签是对学生有用的结构提示，予以保留 */
  const descTxt = String(conf.desc || '');
  const devNote = descTxt.match(/【[^】]{0,16}】/g) || [];
  devNote.forEach((tag) => {
    if (/严谨|重构|修正|内部|改名|修复|新增|调整|待|重写|旧版|原名/.test(tag)) {
      problems.push(key + '：desc 含开发批注 ' + tag);
      details.descAnnot.push(key + ' :: ' + descTxt.slice(0, 44));
    }
  });
  /* ⑤ 玩梗文风 */
  const scan = String(conf.desc || '') + '\n' + String(conf.detail || '') + '\n' + raw;
  MEME_WORDS.forEach((w) => {
    if (scan.indexOf(w) >= 0) { problems.push(key + '：出现玩梗词「' + w + '」'); details.meme.push(key + ' :: ' + w); }
  });
  /* ③ METHOD_EXTRA 覆盖 */
  const ex = docs.METHOD_EXTRA[key];
  if (ex) stats.extraCovered++;
  else details.noExtra.push(key);
  if (ex && ex.exercise && ex.exercise.goal && ex.exercise.steps && ex.exercise.expect && ex.exercise.judge) stats.exerciseCovered++;
  else { details.noExercise.push(key); problems.push(key + '：缺少「动手练习」内容（METHOD_EXTRA.exercise）'); }
  /* ④ 极点算例覆盖 */
  const loop = docs.analyzeLoop(key, conf, { plantId: 'msd', plantParams: null, ctrl: D.getDefaultParams(key) });
  if (!loop) stats.qualitative++;
  else if (loop.approx) stats.approx++;
  else stats.exact++;
  /* ⑥ 篇幅 */
  if (raw.length < 6000) { problems.push(key + '：篇幅偏短（' + raw.length + '）'); details.short.push(key + ':' + raw.length); }
});

/* ── 报告 ─────────────────────────────────────────────── */
console.log('方法数 = ' + stats.methods);
console.log('闭环极点算例：严格推导 ' + stats.exact + ' · 理想化近似 ' + stats.approx + ' · 定性说明 ' + stats.qualitative);
console.log('METHOD_EXTRA 覆盖 = ' + stats.extraCovered + '/' + stats.methods + ' · 动手练习齐全 = ' + stats.exerciseCovered + '/' + stats.methods);
console.log('章节结构组合数 = ' + Object.keys(sectionSets).length);
console.log('');
if (details.descAnnot.length) { console.log('[desc 内部批注] ' + details.descAnnot.length + ' 处：'); details.descAnnot.forEach((x) => console.log('  ' + x)); }
if (details.meme.length) { console.log('[玩梗文风] ' + details.meme.length + ' 处：'); details.meme.slice(0, 40).forEach((x) => console.log('  ' + x)); }
if (details.placeholder.length) { console.log('[占位符残留] ' + details.placeholder.length + ' 处'); }
if (details.noExtra.length) { console.log('[缺 METHOD_EXTRA] ' + details.noExtra.length + ' 个'); }
if (details.short.length) { console.log('[篇幅偏短] ' + details.short.length + ' 个'); }
console.log('');
if (problems.length) {
  console.log('问题清单（前 40 条，共 ' + problems.length + ' 条）：');
  problems.slice(0, 40).forEach((p) => console.log('  ' + p));
}
console.log('\nRESULT: ' + (problems.length ? 'FAIL (' + problems.length + ' 条)' : 'PASS'));
if (problems.length) process.exitCode = 1;
