/* 文档体检：frontmatter / 章节 / 公式配对 / TeX 命令 / 编号格式 / 字符损坏痕迹 */
'use strict';
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'public', 'docs', 'methods');
const CMDS = ['frac', 'tan', 'sec', 'sgn', 'dot', 'ddot', 'hat', 'left', 'right', 'sqrt', 'int', 'sum',
  'partial', 'operatorname', 'mathrm', 'qquad', 'quad', 'cdot', 'times', 'leq', 'geq', 'approx',
  'infty', 'Delta', 'delta', 'lambda', 'omega', 'zeta', 'alpha', 'beta', 'gamma', 'rho', 'sigma',
  'tau', 'mu', 'theta', 'varepsilon', 'varphi', 'begin', 'end', 'cases', 'tag', 'text'];
const bareCmd = new RegExp('(^|[^\\\\{])(' + CMDS.join('|') + ')([^a-zA-Z]|$)');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
let problems = 0;
files.forEach((fn) => {
  const t = fs.readFileSync(path.join(dir, fn), 'utf8').replace(/\r\n/g, '\n');
  const lines = t.split('\n');
  const bad = [];
  if (!/^---\n/.test(t)) bad.push('NO-FRONTMATTER');
  if (!/^key:\s*\S+/m.test(t)) bad.push('NO-KEY');
  if (!/^index:\s*\d+/m.test(t)) bad.push('NO-INDEX');
  if (!/^category:\s*"/m.test(t)) bad.push('NO-CATEGORY');
  const heads = lines.filter((l) => /^##\s/.test(l));
  if (heads.length !== 8) bad.push('HEADS=' + heads.length);
  ['一、', '二、', '三、', '四、', '五、', '六、', '七、', '八、'].forEach((h) => {
    if (t.indexOf('## ' + h) < 0) bad.push('MISS-SEC ' + h);
  });
  if (t.indexOf('## 二、被控对象') < 0) bad.push('NO-PLANT-SEC');
  lines.forEach((l, i) => {
    const n = (l.match(/\$/g) || []).length;
    if (n % 2 !== 0) bad.push((i + 1) + ' ODD-$ ' + l);
    if (l.indexOf('tag{') >= 0 && !/\\tag\{\d+\.\d+\}/.test(l)) bad.push((i + 1) + ' BAD-TAG ' + l);
    /* BARE-CMD 检查易误报（\dot 与 \ddot 相互重叠），已停用 */
  });
  const dollars = (t.match(/\$/g) || []).length;
  if (dollars % 2 !== 0) bad.push('TOTAL-$ ODD=' + dollars);
  const tags = (t.match(/\\tag\{/g) || []).length;
  if (tags < 4) bad.push('TAGS=' + tags);
  if (bad.length) { problems++; console.log('### ' + fn); console.log(bad.join('\n')); }
});
console.log('problems: ' + problems + ' / ' + files.length);
