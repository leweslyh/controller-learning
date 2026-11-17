#!/usr/bin/env node
/* ============================================================
   tools/sync-doc-params.js — 把教学文档第 6 章参数表的默认值
   同步为实验台的真实运行默认值（对象固定为推导所用的 msd）。
   同时修正 V4→V5 遗留的 msd 阻尼/阻尼比文字（c=0.50→1.50，ζ=0.177→0.530）。
   运行：node tools/sync-doc-params.js [--check]
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'public');
const CHECK = process.argv.includes('--check');
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
  parseFloat, parseInt, isNaN, isFinite
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
['core.js', 'data.js', 'simulation.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(app, 'js', f), 'utf8'), sandbox, { filename: f });
});
const NS = sandbox.CtrlSim;
const D = NS.data;
const sim = NS.sim;

const dir = path.join(app, 'docs', 'methods');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
const ZETA = (() => {
  const p = D.PLANTS.msd.defaults;
  return p.c / (2 * Math.sqrt(p.k * p.m));
})();
const ZETA_TXT = ZETA.toFixed(3);

let changedDocs = 0, changedCells = 0, changedText = 0;
const problems = [];

for (const file of files) {
  const key = file.replace(/^\d+-/, '').replace(/\.md$/, '');
  if (!D.CONTROLLER_CONFIGS[key]) continue;
  sim.setPlant('msd');
  sim.setMethod(key);
  const runtime = sim.getSettings().ctrlParams;
  const full = path.join(dir, file);
  const raw = fs.readFileSync(full, 'utf8');
  let text = raw;
  let docCells = 0;

  /* 只改「六、参数怎么调」之后的第一张参数表，避免误改推导/算例中的示例值 */
  const sec = text.indexOf('## 七、参数怎么调');
  if (sec >= 0) {
    const before = text.slice(0, sec);
    const afterLines = text.slice(sec).split('\n');
    let inTable = false, done = false;
    for (let i = 0; i < afterLines.length; i++) {
      const line = afterLines[i];
      if (!done && line.startsWith('|')) inTable = true;
      if (inTable && !line.startsWith('|')) { inTable = false; done = true; }
      if (!inTable || done) continue;
      const cells = line.split('|');
      if (cells.length < 5) continue;
      const k = cells[1].trim();
      if (!(k in runtime) || typeof runtime[k] !== 'number') continue;
      const old = cells[3].trim();
      if (!/^-?\d+(\.\d+)?$/.test(old)) continue;
      const next = String(runtime[k]);
      if (old === next) continue;
      cells[3] = ' ' + next + ' ';
      afterLines[i] = cells.join('|');
      docCells++;
    }
    text = before + afterLines.join('\n');
  }

  /* V4→V5 遗留：msd 默认阻尼与阻尼比 */
  const beforeText = text;
  text = text.replace(/0\.50 N·s\/m/g, '1.50 N·s/m');
  text = text.replace(/0\.177/g, ZETA_TXT);
  text = text.replace(/c = 0\.50/g, 'c = 1.50');
  if (text !== beforeText) changedText += (beforeText.match(/0\.50 N·s\/m/g) || []).length + (beforeText.match(/0\.177/g) || []).length;
  if (docCells) { changedDocs++; changedCells += docCells; }
  if (CHECK) {
    if (text !== raw) problems.push(file + ' 未同步（参数 ' + docCells + ' 处，文本差异 ' + (text !== beforeText) + '）');
  } else if (text !== raw) {
    fs.writeFileSync(full, text, 'utf8');
  }
}

if (CHECK) {
  if (problems.length) {
    console.error('文档参数未同步：' + problems.length + ' 篇');
    problems.slice(0, 10).forEach((p) => console.error('  ' + p));
    process.exit(1);
  }
  console.log('文档参数已全部同步（' + files.length + ' 篇）。');
} else {
  console.log('已同步参数表：' + changedDocs + ' 篇 / ' + changedCells + ' 个默认值；文本修正 ' + changedText + ' 处；ζ=' + ZETA_TXT + '。');
}
