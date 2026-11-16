#!/usr/bin/env node
/* ============================================================
   tools/build-docs.js — 由 Markdown 单一来源生成阅读器产物
   运行：node tools/build-docs.js
   产出：
     public/js/docs-content.js            window.__DOCS__ = { key: {meta, body, raw} }
     public/docs/README.md                分类索引（只列链接与一句话简介，不复制正文）
   说明：仅依赖 Node 内置模块；页面运行时不加载本脚本。
   设计：Markdown 是文档唯一真相源；本脚本将其打包进 JS 全局对象，
        解决 file:// 下 fetch 本地文件被拦截的问题，保持离线双击可用。
        不再生成任何汇总副本（如「完整手册」），避免与 methods/*.md 内容重复。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'public');
const outDir = path.join(app, 'docs');
const methodsDir = path.join(outDir, 'methods');

/* ── 加载运行时数据，用于索引与手册的元信息 ── */
const sandbox = {
  console, Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
  parseFloat, parseInt, isNaN, isFinite,
  document: { readyState: 'complete', getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
['data.js', 'docs.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(app, 'js', f), 'utf8'), sandbox, { filename: f });
});
const NS = sandbox.CtrlSim;
const D = NS.data;

/* ── 极简 frontmatter 解析（只支持 key: value 与 [a, b] 数组） ── */
function parseFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return { meta: {}, body: text.replace(/^\uFEFF/, '') };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end < 0) return { meta: {}, body: text };
  const meta = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    const m = /^([A-Za-z_]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const k = m[1];
    let v = m[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      meta[k] = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      meta[k] = v.replace(/^["']|["']$/g, '');
    }
  }
  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');
  return { meta, body };
}

/* ── 扫描 methods 目录 ── */
/* V4.0：159 份文档统一使用三位序号（001…159），正则兼容历史两位命名 */
const files = fs.existsSync(methodsDir)
  ? fs.readdirSync(methodsDir).filter((f) => /^(\d{2,3})-.*\.md$/.test(f)).sort()
  : [];
const entries = {};
const fileByKey = {};
const errors = [];
files.forEach((fn) => {
  const full = path.join(methodsDir, fn);
  const raw = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
  const { meta, body } = parseFrontmatter(raw);
  const key = meta.key;
  if (!key) { errors.push(fn + '：缺少 frontmatter key'); return; }
  if (!D.CONTROLLER_CONFIGS[key]) { errors.push(fn + '：key=' + key + ' 不在 CONTROLLER_CONFIGS'); return; }
  fileByKey[key] = fn;
  const idx = D.methodList.indexOf(key) + 1;
  entries[key] = {
    meta: {
      index: Number(meta.index) || idx,
      key,
      title: meta.title || D.CONTROLLER_CONFIGS[key].name,
      category: meta.category || D.CONTROLLER_CONFIGS[key].category,
      plant: meta.plant || '',
      peers: Array.isArray(meta.peers) ? meta.peers : []
    },
    body,
    raw
  };
});

const keys = D.methodList.filter((k) => entries[k]);
const missing = D.methodList.filter((k) => !entries[k]);
if (missing.length) console.warn('⚠ 未找到文档的方法（' + missing.length + '）：' + missing.join(', '));
if (errors.length) { console.error('✗ frontmatter 错误：'); errors.forEach((e) => console.error('  ' + e)); }

/* ── 1. 打包进 docs-content.js ── */
const bundle = {};
keys.forEach((k) => {
  const e = entries[k];
  bundle[k] = {
    meta: e.meta,
    body: e.body,
    raw: e.raw
  };
});
const outJs = '/* 自动生成，请勿手动编辑。运行 node tools/build-docs.js 重新生成。 */\n' +
  'window.__DOCS__ = ' + JSON.stringify(bundle, null, 0) + ';\n';
fs.writeFileSync(path.join(app, 'js', 'docs-content.js'), outJs, 'utf8');
console.log('✓ public/js/docs-content.js  ' + keys.length + ' 篇');

/* ── 1b. 专题教程（docs/guides/*.md）：不带方法 key，独立打包 __GUIDES__ ── */
const guidesDir = path.join(outDir, 'guides');
const guideFiles = fs.existsSync(guidesDir)
  ? fs.readdirSync(guidesDir).filter((f) => /^(\d{2,3})-.*\.md$/.test(f)).sort()
  : [];
const guides = {};
guideFiles.forEach((fn) => {
  const raw = fs.readFileSync(path.join(guidesDir, fn), 'utf8').replace(/\r\n/g, '\n');
  const { meta, body } = parseFrontmatter(raw);
  const slug = meta.slug || fn.replace(/^\d{2,3}-/, '').replace(/\.md$/, '');
  guides[slug] = {
    meta: {
      slug,
      file: fn,
      title: meta.title || slug,
      category: meta.category || '专题教程',
      summary: meta.summary || ''
    },
    body,
    raw
  };
});
const guideJs = '/* 自动生成，请勿手动编辑。运行 node tools/build-docs.js 重新生成。 */\n' +
  'window.__GUIDES__ = ' + JSON.stringify(guides, null, 0) + ';\n';
fs.writeFileSync(path.join(app, 'js', 'guides-content.js'), guideJs, 'utf8');
console.log('✓ public/js/guides-content.js  ' + Object.keys(guides).length + ' 篇专题');

/* ── 1c. 对象手册（docs/plants/*.md）：独立打包 __PLANT_DOCS__ ── */
const plantsDir = path.join(outDir, 'plants');
const plantFiles = fs.existsSync(plantsDir)
  ? fs.readdirSync(plantsDir).filter((f) => /^(\d{2,3})-.*\.md$/.test(f)).sort()
  : [];
const plantDocs = {};
plantFiles.forEach((fn) => {
  const raw = fs.readFileSync(path.join(plantsDir, fn), 'utf8').replace(/\r\n/g, '\n');
  const { meta, body } = parseFrontmatter(raw);
  const slug = meta.slug || fn.replace(/^\d{2,3}-/, '').replace(/\.md$/, '');
  if (!D.PLANTS[slug]) { errors.push('对象手册 ' + fn + '：slug 与 PLANTS 不匹配'); return; }
  plantDocs[slug] = {
    meta: {
      slug,
      file: fn,
      title: meta.title || D.PLANTS[slug].name,
      category: meta.category || '对象手册',
      summary: meta.summary || ''
    },
    body,
    raw
  };
});
const plantJs = '/* 自动生成，请勿手动编辑。运行 node tools/build-docs.js 重新生成。 */\n' +
  'window.__PLANT_DOCS__ = ' + JSON.stringify(plantDocs, null, 0) + ';\n';
fs.writeFileSync(path.join(app, 'js', 'plant-docs.js'), plantJs, 'utf8');
console.log('✓ public/js/plant-docs.js  ' + Object.keys(plantDocs).length + ' 篇对象手册');

/* ── 2. 反向生成 README 索引（只有索引，不复制正文） ── */
const readme = [
  '# 控制方法 · 教学文档索引',
  '',
  '> 每法一份面向初学者的教学讲稿：生活类比 → 被控对象 → 为什么需要它 → 一步步推导 → 稳定性证明 → 算例 → 参数怎么调 → 局限与陷阱 → 延伸阅读。',
  '> 全部公式为 TeX 语法，编号由 `\\tag` 渲染在公式右侧；第四章给出推导，第五章在标称模型下给出 Lyapunov 稳定性证明与适用边界。',
  '',
  '**本目录的正文唯一来源是 `methods/*.md`**；阅读器读取的是同一份内容（由 `node tools/build-docs.js` 打包为 `public/js/docs-content.js`），因此不需要、也不再生成任何汇总副本。',
  '',
  '也可以直接在实验台中按 `H` 或点「教学文档」按钮打开阅读器，无需阅读这些文件。',
  ''
];
D.sortedCategories.forEach((cat) => {
  readme.push('## ' + cat, '');
  (D.groupedMethods[cat] || []).forEach((m) => {
    /* V5.0：链接指向磁盘实际文件名（文件编号与 methodList 顺序不一定一致） */
    const fn = fileByKey[m.key];
    if (!fn) return;
    readme.push('- [' + m.name + '](methods/' + fn + ') — ' + m.desc);
  });
  readme.push('');
});
if (Object.keys(plantDocs).length) {
  readme.push('## 对象手册', '');
  Object.keys(plantDocs).forEach((slug) => {
    const p = plantDocs[slug];
    readme.push('- [' + p.meta.title + '](plants/' + p.meta.file + ')' +
      (p.meta.summary ? ' — ' + p.meta.summary : ''));
  });
  readme.push('');
}
if (Object.keys(guides).length) {
  readme.push('## 专题教程', '');
  Object.keys(guides).forEach((slug) => {
    const g = guides[slug];
    readme.push('- [' + g.meta.title + '](guides/' + g.meta.file + ')' +
      (g.meta.summary ? ' — ' + g.meta.summary : ''));
  });
  readme.push('');
}
readme.push('---', '', '共 ' + keys.length + ' 讲 + ' + Object.keys(guides).length +
  ' 篇专题，按 `H` 在实验台内阅读。', '');
fs.writeFileSync(path.join(outDir, 'README.md'), readme.join('\n'), 'utf8');
console.log('✓ public/docs/README.md');

console.log('\n完成：' + keys.length + ' / ' + D.methodList.length + ' 篇已打包。');
