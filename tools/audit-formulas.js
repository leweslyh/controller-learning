#!/usr/bin/env node
/* tools/audit-formulas.js — 全量公式排版审计（KaTeX 主路径 + MathML 回退） */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');
/* 前端静态站根目录（Netlify publish 目录） */
const app = path.join(path.resolve(__dirname, '..'), 'public');

function loadPlaywright() {
  const c = [path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@playwright', 'cli', 'node_modules', 'playwright'), 'playwright'];
  for (const x of c) { try { return require(x); } catch (e) { /* next */ } }
  return null;
}

function collectFormulas() {
  const sb = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Map, Set, parseFloat, parseInt, isNaN, isFinite, document: { readyState: 'complete', getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
  sb.window = sb; sb.global = sb; vm.createContext(sb);
  ['data.js', 'math.js', 'docs.js'].forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(app, 'js', f), 'utf8'), sb, { filename: f });
  });
  const D = sb.CtrlSim.data, docs = sb.CtrlSim.docs, M = sb.CtrlSim.math;
  const out = [], seen = new Set();
  const push = (tex, where) => {
    if (typeof tex !== 'string' || !tex.trim()) return;
    const k = where + '|' + tex;
    if (seen.has(k)) return;
    seen.add(k); out.push({ tex: tex, where: where });
  };
  Object.keys(D.CONTROLLER_CONFIGS).forEach((key) => push(M.toTex(D.CONTROLLER_CONFIGS[key].eq), 'eq:' + key));
  D.PLANT_LIST.forEach((id) => push(D.PLANTS[id].tex, 'plant:' + id));
  Object.keys(docs.CATEGORY_INTROS).forEach((c) => push(docs.CATEGORY_INTROS[c].math, 'cat:' + c));
  D.methodList.forEach((key) => {
    const d = docs.buildDoc(key);
    (d.sections || []).forEach((sec) => (sec.blocks || []).forEach((b) => {
      if (b.type === 'math') push(b.tex, 'doc:' + key);
    }));
  });
  return out;
}

function pageFn(args) {
  const { formulas, probes } = args;
  const results = [];
  /* 把元素里的文字按「行带」聚类，返回每带字符数 */
  const bands = (el) => {
    const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
    const tol = Math.max(4, fs * 0.45);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const chars = [];
    let node;
    while ((node = walker.nextNode())) {
      const txt = node.nodeValue;
      for (let i = 0; i < txt.length; i++) {
        const r = document.createRange();
        r.setStart(node, i); r.setEnd(node, i + 1);
        const rects = r.getClientRects();
        if (!rects.length) continue;
        chars.push({ ch: txt[i], mid: rects[0].top + rects[0].height / 2 });
      }
    }
    const groups = [];
    chars.forEach((c) => {
      let g = null;
      for (const l of groups) { if (Math.abs(l.mid - c.mid) < tol) { g = l; break; } }
      if (!g) { g = { mid: c.mid, chars: [] }; groups.push(g); }
      g.chars.push(c.ch);
    });
    return groups;
  };
  for (const probe of probes) {
    const parent = document.querySelector(probe.parent);
    if (!parent) continue;
    const host = document.createElement('div');
    host.className = probe.cls;
    host.style.width = probe.width + 'px';
    host.style.position = 'absolute';
    host.style.left = '-99999px';
    host.style.top = '0';
    parent.appendChild(host);
    for (const f of formulas) {
      /* ① KaTeX 主路径必须渲染成功 */
      let html = null, errMsg = '';
      try { html = window.CtrlSim.math.safeKatex(f.tex, false); }
      catch (e) { errMsg = 'throw: ' + e.message; }
      if (!html) {
        if (!errMsg) {
          try {
            const raw = katex.renderToString(window.CtrlSim.math.fixAccents(f.tex), { throwOnError: false, strict: false, output: 'html' });
            const m = raw.match(/katex-error[^>]*>([^<]*)</);
            errMsg = m ? m[1] : '解析失败（无详情）';
          } catch (e) { errMsg = 'throw: ' + e.message; }
        }
        results.push({ kind: 'render', where: f.where, tex: f.tex, probe: probe.id, msg: errMsg.slice(0, 90) });
        continue;
      }
      /* ② 横向溢出：只有容器会「裁掉」内容才算问题；可横向滚动的属正常 */
      const inner = document.createElement('div');
      inner.className = 'math';
      inner.innerHTML = html;
      host.appendChild(inner);
      const w = inner.getBoundingClientRect().width;
      const hostOverflow = getComputedStyle(host).overflowX;
      const clip = hostOverflow !== 'auto' && hostOverflow !== 'scroll';
      if (w > probe.width + 2 && clip) {
        results.push({ kind: 'overflow', where: f.where, tex: f.tex, probe: probe.id, msg: '宽 ' + Math.round(w) + ' > 容器 ' + probe.width + '（overflow-x:' + hostOverflow + '，内容会被裁掉）' });
      }
      host.removeChild(inner);
      /* ③ MathML 回退路径：多字母标识符不能被拆成嵌套 <mi>，且必须禁止换行 */
      const mml = window.CtrlSim.math.renderMathML(f.tex);
      if (mml) {
        const box = document.createElement('div');
        box.className = 'math mathml';
        box.style.width = '140px';
        box.innerHTML = '<math display="inline">' + mml + '</math>';
        host.appendChild(box);
        const mathEl = box.querySelector('math');
        const ws = mathEl ? getComputedStyle(mathEl).whiteSpace : '';
        if (ws !== 'nowrap') {
          results.push({ kind: 'lonely', where: f.where, tex: f.tex, probe: probe.id, msg: 'MathML 未禁止换行（white-space=' + ws + '），可能被拆成一行一个字母' });
        }
        const nested = box.querySelectorAll('mi mi, mn mi, mtext mi');
        if (nested.length) {
          results.push({ kind: 'lonely', where: f.where, tex: f.tex, probe: probe.id, msg: '多字母标识符被拆成嵌套 <mi>：' + Array.prototype.map.call(nested, (n) => n.textContent).slice(0, 4).join('|') });
        }
        host.removeChild(box);
      }
    }
    parent.removeChild(host);
  }
  return results;
}

/* 端到端：渲染全部 99 份教学文档，扫描公式渲染失败与退化 */
function docFn(args) {
  const { methods } = args;
  const out = [];
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:780px';
  document.body.appendChild(host);
  for (const key of methods) {
    let html = '';
    try { html = window.CtrlSim.docs.renderDoc(window.CtrlSim.docs.buildDoc(key)); }
    catch (e) { out.push({ kind: 'doc', key: key, msg: '构建失败: ' + e.message }); continue; }
    host.innerHTML = html;
    const errs = host.querySelectorAll('.katex-error');
    if (errs.length) {
      out.push({ kind: 'doc', key: key, msg: '公式渲染失败 ' + errs.length + ' 处：' + (errs[0].textContent || '').trim().slice(0, 60) });
    }
    const fb = host.querySelectorAll('.math .m-text');
    for (let i = 0; i < fb.length; i++) {
      const t = (fb[i].textContent || '').trim();
      if (/\\[a-zA-Z]+|[_^]/.test(t)) {
        out.push({ kind: 'doc', key: key, msg: '退化为纯文本的公式：' + t.slice(0, 60) });
        break;
      }
    }
  }
  host.remove();
  return out;
}

(async () => {
  const formulas = collectFormulas();
  console.log('枚举公式数 = ' + formulas.length);
  const pw = loadPlaywright();
  if (!pw) { console.log('SKIP: 未找到 Playwright 模块'); return; }
  let browser = null;
  try {
    try { browser = await pw.chromium.launch({ headless: true, channel: 'chrome' }); }
    catch (err) { browser = await pw.chromium.launch({ headless: true }); }
    const root = path.resolve(__dirname, '..');
    const url = 'file:///' + path.join(app, 'index.html').replace(/\\/g, '/');
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const g = document.getElementById('overlay-guide'); if (g) g.hidden = true; });
    const probes = await page.evaluate(() => {
      const w = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().width) : 0; };
      const list = [
        { id: 'eqbar', parent: '.eqbar', cls: 'eqbar-math', width: w('.eqbar-math') },
        { id: 'profile', parent: '.profile', cls: 'eq-card-main', width: w('.eq-card-main') || w('.profile-eq') },
        { id: 'doc', parent: '.inspector', cls: 'doc-math', width: w('.inspector') - 26 }
      ];
      return list.filter((p) => p.width > 40);
    });
    console.log('探针宽度 = ' + JSON.stringify(probes.map((p) => p.id + ':' + p.width)));
    const res = await page.evaluate(pageFn, { formulas: formulas, probes: probes });
    const by = (k) => res.filter((r) => r.kind === k);
    const render = by('render'), overflow = by('overflow'), lonely = by('lonely');
    console.log('\n渲染失败 = ' + render.length + ' · 横向溢出 = ' + overflow.length + ' · 一个字母占一行 = ' + lonely.length);
    if (render.length) {
      console.log('\n[渲染失败]');
      render.slice(0, 30).forEach((r) => console.log('  ' + r.probe + ' ' + r.where + '  ' + r.msg + '\n      ' + r.tex.slice(0, 100)));
    }
    if (lonely.length) {
      console.log('\n[一个字母占一行]');
      lonely.slice(0, 30).forEach((r) => console.log('  ' + r.probe + ' ' + r.where + '  ' + r.msg + '\n      ' + r.tex.slice(0, 100)));
    }
    if (overflow.length) {
      console.log('\n[横向溢出]');
      overflow.slice(0, 30).forEach((r) => console.log('  ' + r.probe + ' ' + r.where + '  ' + r.msg + '\n      ' + r.tex.slice(0, 100)));
    }
    /* 端到端：全部 99 份教学文档 */
    const methods = await page.evaluate(() => window.CtrlSim.data.methodList);
    const docRes = await page.evaluate(docFn, { methods: methods });
    console.log('教学文档端到端问题 = ' + docRes.length);
    if (docRes.length) {
      console.log('\n[教学文档]');
      docRes.slice(0, 30).forEach((r) => console.log('  ' + r.key + '  ' + r.msg));
    }
    console.log('\nRESULT: ' + (render.length || lonely.length || docRes.length ? 'FAIL' : 'PASS'));
    if (render.length || lonely.length || docRes.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
