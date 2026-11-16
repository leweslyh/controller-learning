#!/usr/bin/env node
/* ============================================================
   tools/normalize-doc-plants.js — 方法文档第 2 章去重（V5.3）
   问题：159 份方法文档都复制了一份「六个被控对象」总表，既与方法本身无关，
         也导致对象清单随对象库扩充而过时。
   处理：把「实验台提供六个被控对象…」到对象总表结束的整段，
         替换为一句「本讲只使用质量-弹簧-阻尼」+ 指向对象手册的链接。
   幂等：已替换过的文档不再变化。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'public', 'docs', 'methods');

const REPLACEMENT = '本讲**只使用「质量-弹簧-阻尼」这一个对象**做推导与算例——它是 159 条控制律共同的教学基准；' +
  '其余 10 个对象的完整方程、动特性与适用场景统一收在[对象手册](plant:msd)中，' +
  '切换对象不会改变控制律本身（控制律只读取对象给出的等效 $m/c/k$）。\n\n';

let changed = 0, skipped = 0;
fs.readdirSync(dir).filter((f) => /^\d{2,3}-.*\.md$/.test(f)).forEach((fn) => {
  const full = path.join(dir, fn);
  const src = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
  if (src.indexOf('实验台提供六个被控对象') < 0) { skipped++; return; }
  const next = src.replace(/实验台提供六个被控对象[\s\S]*?(?=\*\*本讲的推导基于)/, REPLACEMENT);
  if (next !== src) { fs.writeFileSync(full, next, 'utf8'); changed++; }
  else skipped++;
});
console.log('已替换 ' + changed + ' 篇，跳过 ' + skipped + ' 篇（已处理或无匹配）');
