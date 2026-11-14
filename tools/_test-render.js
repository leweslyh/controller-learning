const fs = require('fs');
const vm = require('vm');
const sb = {
  console, Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set,
  parseFloat, parseInt, isNaN, isFinite,
  document: { readyState: 'complete', getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] }
};
sb.window = sb;
sb.global = sb;
vm.createContext(sb);
['data.js', 'math.js', 'docs.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync('public/js/' + f, 'utf8'), sb, { filename: f });
});
vm.runInContext(fs.readFileSync('public/js/docs-content.js', 'utf8'), sb, { filename: 'docs-content.js' });
const html = sb.CtrlSim.docs.renderDoc('PID');
const checks = {
  len: html.length,
  hasToc: /doc-toc/.test(html),
  hasSection: /doc-section/.test(html),
  hasMath: /doc-math/.test(html),
  hasMathCap_shouldBeFalse: /doc-math-cap/.test(html),
  hasWarnCallout: /doc-callout is-warn/.test(html),
  hasNoteCallout: /doc-callout(?! is-warn)/.test(html),
  peerBtn: /doc-peer[^>]*data-doc="P"/.test(html),
  table: /doc-table/.test(html),
  mathRendered: /class="math/.test(html),
  tagPresent: /\\tag/.test(sb.__DOCS__.PID.body)
};
Object.keys(checks).forEach((k) => console.log(k + ':', checks[k]));
console.log('\n--- first 600 chars ---');
console.log(html.slice(0, 600));
