/* ============================================================
   fix-sec3-numbers.js
   作用：把「三、为什么需要它」一节里的公式编号由 4.x 规整为 3.x，
   使「章.序」与所在章节严格对应，并消除少数文档中 4.1 重复的问题。
   同时同步修正正文中指向这些公式的交叉引用。
   幂等：已是 3.x 的节会被跳过。
   用法：node tools/fix-sec3-numbers.js [--dry]
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'docs', 'methods');
const BACKUP = path.join(__dirname, '_backup-methods');
const DRY = process.argv.includes('--dry');

const files = fs.readdirSync(DIR).filter(function (f) { return f.endsWith('.md'); }).sort();
let fixed = 0, skipped = 0;

files.forEach(function (fn) {
  const p = path.join(DIR, fn);
  const text = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  /* 定位第三节范围 */
  let s = -1, e = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^## 三、/.test(lines[i])) { s = i; continue; }
    if (s >= 0 && /^## 四、/.test(lines[i])) { e = i; break; }
  }
  if (s < 0) { skipped++; return; }

  /* 收集第三节内的公式编号 */
  const olds = [];
  for (let i = s; i < e; i++) {
    const m = /\\tag\{(\d+\.\d+)\}/.exec(lines[i]);
    if (m) olds.push(m[1]);
  }
  if (!olds.length) { skipped++; return; }
  if (olds.every(function (o) { return o.indexOf('3.') === 0; })) { skipped++; return; }

  /* 重新编号为 3.1, 3.2 ... */
  const map = {};
  olds.forEach(function (o, i) { map[o] = '3.' + (i + 1); });

  const sec = lines.slice(s, e);
  sec.forEach(function (l, i) {
    const m = /\\tag\{(\d+\.\d+)\}/.exec(l);
    if (m && map[m[1]]) lines[s + i] = l.replace(m[0], '\\tag{' + map[m[1]] + '}');
  });

  /* 旧编号若已无公式定义，则正文引用一并改指新编号 */
  const stillUsed = new Set((lines.join('\n').match(/\\tag\{(\d+\.\d+)\}/g) || []).map(function (x) { return x.slice(5, -1); }));
  Object.keys(map).forEach(function (old) {
    if (stillUsed.has(old)) return;
    lines.forEach(function (l, i) {
      if (l.indexOf('\\tag{') >= 0) return;
      lines[i] = l.split('（' + old + '）').join('（' + map[old] + '）')
                  .split('(' + old + ')').join('(' + map[old] + ')');
    });
  });

  const out = lines.join('\n');
  if (!DRY) {
    const bak = path.join(BACKUP, fn);
    if (!fs.existsSync(bak)) fs.copyFileSync(p, bak);
    fs.writeFileSync(p, out, 'utf8');
  }
  fixed++;
  console.log(fn + '  ' + olds.join(',') + ' -> ' + olds.map(function (o) { return map[o]; }).join(','));
});

console.log('规整第三节编号：' + fixed + ' 篇，跳过 ' + skipped + ' 篇');
