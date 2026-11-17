/* ============================================================
   docs.js — 教学文档阅读层（零外部依赖）
   每个控制器一份面向初学者的「推导 / 使用 / 参数选择」文档：
     正文唯一来源 = public/docs/methods/*.md（由 tools/build-docs.js 打包进 window.__DOCS__）
   页面内提供全屏阅读器，直接渲染 Markdown 原文，不再有内容副本或导出副本。
   说明：推导部分为「直观推导/设计思路」，不是严格数学证明；
        控制律为本平台的教学演示级离散化实现。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const D = NS.data;
  const math = NS.math;
  const doc = global.document;


  /* 章节目录使用与实验台一致的中文数字编号 */
  const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

  const esc = NS.utils.esc;





  function inlineMd(s) {
    if (s == null) return '';
    /* 处理顺序很重要：先把 Markdown 语法（链接 / 代码 / 强调）用「占位符」保护起来，
       再交给 math.renderMixed 做公式识别与自动排版，最后还原占位符。
       若直接先渲染公式，autoMath 会把 (method:PI)、** 等标记当成普通文本吞掉，
       导致加粗失效、方法跳转按钮无法生成。 */
    const store = [];
    const H = '\u0000';
    function hold(html) { const idx = store.length; store.push(html); return H + String.fromCharCode(1 + idx); }
    function mathIn(text) { return math.renderMixed(text); }
    let t = String(s);
    /* ① 同类方法跳转 / 对象手册 / 外链 */
    t = t.replace(/\[([^\]]+)\]\((method|plant|https?):([^)]+)\)/g, function (m, label, proto, target) {
      if (proto === 'method') {
        return hold('<button type="button" class="doc-peer" data-doc="' + esc(target.trim()) + '">' + mathIn(label) + '</button>');
      }
      if (proto === 'plant') {
        return hold('<button type="button" class="doc-peer" data-plant-doc="' + esc(target.trim()) + '">' + mathIn(label) + '</button>');
      }
      return hold('<a class="doc-link" href="' + esc(proto + ':' + target) + '" target="_blank" rel="noopener">' + mathIn(label) + '</a>');
    });
    /* ② 普通链接 */
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, label, href) {
      return hold('<a class="doc-link" href="' + esc(href) + '" target="_blank" rel="noopener">' + mathIn(label) + '</a>');
    });
    /* ③ 行内代码 */
    t = t.replace(/`([^`]+?)`/g, function (m, code) { return hold('<code>' + esc(code) + '</code>'); });
    /* ④ 加粗 / 斜体（内部仍允许行内公式） */
    t = t.replace(/\*\*([^*]+?)\*\*/g, function (m, b) { return hold('<strong>' + mathIn(b) + '</strong>'); });
    t = t.replace(/\*([^*]+?)\*/g, function (m, b) { return hold('<em>' + mathIn(b) + '</em>'); });
    /* ⑤ 公式与自动排版 */
    t = math.renderMixed(t);
    /* ⑥ 还原占位符 */
    t = t.replace(new RegExp(H + '([\\u0001-\\u001f])', 'g'), function (m, ch) {
      return store[ch.charCodeAt(0) - 1] || '';
    });
    return t;
  }

  function parseMd(src) {
    const text = String(src || '').replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    const pre = [];
    const secs = [];
    let cur = null;
    let secId = 0;
    function pushBlock(html) {
      if (cur) cur.body.push(html); else pre.push(html);
    }
    let i = 0;
    while (i < lines.length) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (!trimmed) { i++; continue; }

      /* 独立公式 $$ ... $$（支持单行与多行，\tag 由 KaTeX 右对齐编号） */
      if (trimmed.indexOf('$$') === 0) {
        if (trimmed.length > 2 && trimmed.charAt(trimmed.length - 1) === '$' && trimmed.charAt(trimmed.length - 2) === '$') {
          const tex = trimmed.slice(2, -2).trim();
          pushBlock('<div class="doc-math">' + math.render(tex, { display: 'block' }) + '</div>');
          i++; continue;
        }
        const buf = []; i++;
        while (i < lines.length && lines[i].trim() !== '$$') { buf.push(lines[i]); i++; }
        i++;
        const tex = buf.join('\n').trim().replace(/\s+/g, ' ');
        pushBlock('<div class="doc-math">' + math.render(tex, { display: 'block' }) + '</div>');
        continue;
      }

      /* 章节标题 ## / ### */
      const hm = /^(#{2,6})\s+(.*)$/.exec(trimmed);
      if (hm) {
        const level = hm[1].length;
        const title = hm[2].trim();
        if (level === 2) {
          if (cur) secs.push(cur);
          cur = { id: 'sec-' + (++secId), title: title, body: [] };
        } else {
          pushBlock('<h4 class="doc-subh">' + inlineMd(title) + '</h4>');
        }
        i++; continue;
      }

      /* 提示框 >（[!NOTE]/[!WARNING] 或「注意」前缀分辨类型） */
      if (trimmed.charAt(0) === '>') {
        const rawLines = [];
        while (i < lines.length && lines[i].trim().charAt(0) === '>') {
          rawLines.push(lines[i].trim().replace(/^>\s?/, '')); i++;
        }
        let kind = 'info';
        const first = rawLines[0] || '';
        if (/^\[!(WARNING|CAUTION)\]/i.test(first)) kind = 'warn';
        else if (/^\[!(NOTE|TIP|INFO)\]/i.test(first)) kind = 'info';
        else if (/^(注意|警告|warning)/i.test(first)) kind = 'warn';
        const cleaned = rawLines.map((l) => l.replace(/^\[!(NOTE|TIP|INFO|WARNING|CAUTION)\]\s*/i, '')).join('\n');
        pushBlock('<div class="doc-callout ' + (kind === 'warn' ? 'is-warn' : '') + '">' + inlineMd(cleaned).replace(/\n/g, '<br>') + '</div>');
        continue;
      }

      /* 列表（有序 / 无序） */
      if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
        const ordered = /^\d+\.\s+/.test(trimmed);
        const items = [];
        while (i < lines.length) {
          const t = lines[i].trim();
          const isItem = ordered ? /^\d+\.\s+/.test(t) : /^[-*]\s+/.test(t);
          if (!isItem) break;
          items.push(t.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ''));
          i++;
        }
        const tag = ordered ? 'ol' : 'ul';
        const cls = ordered ? 'doc-steps' : 'doc-list';
        pushBlock('<' + tag + ' class="' + cls + '">' + items.map((it) => '<li>' + inlineMd(it) + '</li>').join('') + '</' + tag + '>');
        continue;
      }

      /* 表格 | */
      if (trimmed.indexOf('|') >= 0) {
        const tbl = [];
        while (i < lines.length && lines[i].trim().indexOf('|') >= 0) { tbl.push(lines[i].trim()); i++; }
        const rows = tbl.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
        const sepIdx = rows.findIndex((r, idx) => idx > 0 && r.length && r.every((c) => /^:?-+:?$/.test(c)));
        if (rows.length >= 2 && (sepIdx >= 0 || rows.length >= 3)) {
          const head = rows[0];
          const body = sepIdx >= 0 ? rows.slice(sepIdx + 1) : rows.slice(1);
          pushBlock('<div class="doc-table-wrap"><table class="doc-table"><thead><tr>' +
            head.map((h) => '<th>' + inlineMd(h) + '</th>').join('') + '</tr></thead><tbody>' +
            body.map((r) => '<tr>' + r.map((c) => '<td>' + inlineMd(c) + '</td>').join('') + '</tr>').join('') +
            '</tbody></table></div>');
          continue;
        }
        pushBlock('<p class="doc-p">' + inlineMd(trimmed) + '</p>');
        i++; continue;
      }

      /* 普通段落：合并连续普通行 */
      const para = [trimmed];
      i++;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) break;
        if (t.indexOf('$$') === 0 || /^#{2,6}\s+/.test(t) || t.charAt(0) === '>' ||
            /^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t) || t.indexOf('|') >= 0) break;
        para.push(t); i++;
      }
      pushBlock('<p class="doc-p">' + inlineMd(para.join(' ')) + '</p>');
    }
    if (cur) secs.push(cur);
    const toc = secs.filter((s) => s.title).map((s) =>
      '<a href="#' + s.id + '" data-toc="' + s.id + '">' + esc(s.title) + '</a>').join('');
    const body = pre.concat(secs.map((s) =>
      '<section class="doc-section" id="' + s.id + '"><h3>' + inlineMd(s.title) + '</h3>' + s.body.join('') + '</section>'
    )).join('');
    return (toc ? '<nav class="doc-toc" aria-label="本讲目录">' + toc + '</nav>' : '') + body;
  }

  /* 阅读器内的原论文引用块：离线只展示元数据与链接，不发请求 */
  function paperSection(key) {
    const P = NS.papers;
    const p = P && P.getPaper && P.getPaper(key);
    if (!p || !p.title) return '';
    const v = (P.getVerify && P.getVerify(key)) || { status: 'unverified' };
    const statusText = { verified: '已核验', suspect: '存疑', unreachable: '链接不可达', unverified: '待核验' }[v.status] || '待核验';
    const url = /^https?:\/\//i.test(p.url || '') ? p.url : '';
    return '<section class="doc-paper">' +
      '<h3 class="doc-paper-h">原论文出处 <span class="paper-status is-' + esc(v.status) + '">' + esc(statusText) + '</span></h3>' +
      '<p class="doc-paper-title">' + esc(p.title) + '</p>' +
      '<p class="doc-paper-meta">' + esc(p.authors || '作者未标注') + ' · ' + esc(p.journal || '出处未标注') + '</p>' +
      (v.reason ? '<p class="paper-reason">核验说明：' + esc(v.reason) + '</p>' : '') +
      (url ? '<p><a class="paper-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
        '查看原文（新标签打开，离线环境不自动请求） ↗</a></p>' : '<p class="paper-link is-disabled">暂无可用链接</p>') +
      '<p class="doc-paper-hint">完整核验记录见 <code>public/docs/论文引用核验.md</code>。</p>' +
      '</section>';
  }

  function renderDoc(key) {
    const bundle = global.__DOCS__ || {};
    const entry = bundle[key];
    const conf = D.CONTROLLER_CONFIGS[key];
    if (!conf) return '<p class="doc-p">未找到该方法。</p>';
    if (!entry) return '<p class="doc-p">该方法的教学文档尚未生成（请运行 <code>node tools/build-docs.js</code> 重新打包）。</p>';
    const meta = entry.meta || {};
    const index = Number(meta.index) || (D.methodList.indexOf(key) + 1);
    const approx = D.isApproximation ? D.isApproximation(conf) : (conf.approx || false);
    return '<article class="doc-article">' +
      '<div class="doc-hero">' +
      '<span class="doc-kicker">第 ' + index + ' / ' + D.methodList.length + ' 讲 · ' + esc(meta.category || conf.category) + '</span>' +
      '<h2 id="docs-title">' + esc(meta.title || conf.name) + '</h2>' +
      '<p>' + esc(conf.desc) + '</p>' +
      (approx ? '<span class="doc-badge">教学演示级近似</span>' : '') +
      '</div>' +
      parseMd(entry.body) +
      paperSection(key) +
      '</article>';
  }

  /* ── 专题教程（public/docs/guides/*.md → window.__GUIDES__） ──
     与方法文档共用同一套 Markdown 渲染，但目录独立成一组，
     key 采用 'guide:<slug>' 前缀，避免与 159 个方法 key 冲突。 */
  const GUIDE_PREFIX = 'guide:';
  function guideBundle() { return global.__GUIDES__ || {}; }
  function isGuideKey(key) { return key.indexOf(GUIDE_PREFIX) === 0; }

  function renderGuide(slug) {
    const entry = guideBundle()[slug];
    if (!entry) {
      return '<p class="doc-p">专题文档尚未打包（请运行 <code>node tools/build-docs.js</code> 重新生成）。</p>';
    }
    const meta = entry.meta || {};
    return '<article class="doc-article">' +
      '<div class="doc-hero">' +
      '<span class="doc-kicker">专题教程 · ' + esc(meta.category || '') + '</span>' +
      '<h2 id="docs-title">' + esc(meta.title || slug) + '</h2>' +
      (meta.summary ? '<p>' + esc(meta.summary) + '</p>' : '') +
      '</div>' +
      parseMd(entry.body) +
      '</article>';
  }

  /* ── 对象手册（public/docs/plants/*.md → window.__PLANT_DOCS__） ──
     key 采用 'plant:<slug>' 前缀，与方法 / 专题并列出现在目录顶部。 */
  const PLANT_PREFIX = 'plant:';
  function plantBundle() { return global.__PLANT_DOCS__ || {}; }
  function isPlantKey(key) { return key.indexOf(PLANT_PREFIX) === 0; }

  function renderPlantDoc(slug) {
    const entry = plantBundle()[slug];
    if (!entry) {
      return '<p class="doc-p">对象手册尚未打包（请运行 <code>node tools/build-docs.js</code> 重新生成）。</p>';
    }
    const meta = entry.meta || {};
    return '<article class="doc-article">' +
      '<div class="doc-hero">' +
      '<span class="doc-kicker">' + esc(meta.category || '对象手册') + '</span>' +
      '<h2 id="docs-title">' + esc(meta.title || slug) + '</h2>' +
      (meta.summary ? '<p>' + esc(meta.summary) + '</p>' : '') +
      '</div>' +
      parseMd(entry.body) +
      '</article>';
  }

  /* ── 页面内阅读器 ─────────────────────────────────── */
  let currentKey = 'PID';
  let savedHash = '';
  let bound = false;

  function renderNav() {
    const host = doc.getElementById('docs-list');
    if (!host) return;
    const guides = Object.keys(guideBundle()).map((slug) => guideBundle()[slug]);
    const guideGroup = guides.length
      ? '<details class="doc-nav-group" open><summary><span class="chapter-no">★</span>专题教程</summary>' +
        guides.map((g) => '<button type="button" class="doc-nav-item' +
          (currentKey === GUIDE_PREFIX + g.meta.slug ? ' is-active' : '') +
          '" data-doc="' + esc(GUIDE_PREFIX + g.meta.slug) + '">' + esc(g.meta.title) + '</button>').join('') +
        '</details>'
      : '';
    const plantSlugs = Object.keys(plantBundle());
    const plantGroup = plantSlugs.length
      ? '<details class="doc-nav-group" open><summary><span class="chapter-no">◆</span>对象手册</summary>' +
        plantSlugs.map((slug) => {
          const m = plantBundle()[slug].meta || {};
          return '<button type="button" class="doc-nav-item' +
            (currentKey === PLANT_PREFIX + slug ? ' is-active' : '') +
            '" data-doc="' + esc(PLANT_PREFIX + slug) + '">' + esc(m.title || slug) + '</button>';
        }).join('') +
        '</details>'
      : '';
    host.innerHTML = plantGroup + guideGroup + D.sortedCategories.map((cat, index) => {
      const items = (D.groupedMethods[cat] || []).map((m) =>
        '<button type="button" class="doc-nav-item' + (m.key === currentKey ? ' is-active' : '') +
        '" data-doc="' + esc(m.key) + '">' + esc(m.name) + '</button>').join('');
      return '<details class="doc-nav-group" open><summary><span class="chapter-no">' +
        (CN_NUM[index] || String(index + 1)) + '</span>' +
        esc(cat.replace(/^\d+\.\s*/, '')) + '</summary>' + items + '</details>';
    }).join('');
  }

  function show(key, updateHash) {
    const guide = isGuideKey(key);
    const plant = isPlantKey(key);
    if (plant) { if (!plantBundle()[key.slice(PLANT_PREFIX.length)]) return; }
    else if (guide) { if (!guideBundle()[key.slice(GUIDE_PREFIX.length)]) return; }
    else if (!D.CONTROLLER_CONFIGS[key]) return;
    currentKey = key;
    const overlay = doc.getElementById('overlay-docs');
    if (!overlay) return;
    overlay.hidden = false;
    const content = doc.getElementById('docs-content');
    if (content) {
      content.innerHTML = plant ? renderPlantDoc(key.slice(PLANT_PREFIX.length))
        : guide ? renderGuide(key.slice(GUIDE_PREFIX.length)) : renderDoc(key);
      content.scrollTop = 0;
    }
    renderNav();
    const counter = doc.getElementById('docs-counter');
    if (counter) {
      counter.textContent = plant ? '对象手册'
        : guide ? '专题教程'
        : '第 ' + (D.methodList.indexOf(key) + 1) + ' / ' + D.methodList.length + ' 讲';
    }
    /* 专题与对象手册不是「方法」，隐藏「用此方法做实验」 */
    const useBtn = doc.getElementById('docs-use');
    if (useBtn) useBtn.hidden = guide || plant;
    if (updateHash !== false) {
      try {
        global.history.replaceState(null, '', plant
          ? '#plant=' + encodeURIComponent(key.slice(PLANT_PREFIX.length))
          : guide
            ? '#guide=' + encodeURIComponent(key.slice(GUIDE_PREFIX.length))
            : '#doc=' + encodeURIComponent(key));
      } catch (err) { /* file:// 限制时忽略 */ }
    }
  }

  let docsLastFocus = null;
  /* 打开请求序号：文档包加载期间若用户关闭/切换，过期回调不得再 show 抢焦点 */
  let openSeq = 0;
  /* 教学文档包约 2.9 MB：改为按需注入，避免首屏阻塞。
     首次打开阅读器（或空闲时预取）再加载 docs-content.js。 */
  let docsLoading = false;
  const docsQueue = [];
  function ensureDocs(cb) {
    if (global.__DOCS__ && global.__PLANT_DOCS__) { if (cb) cb(); return; }
    if (cb) docsQueue.push(cb);
    if (docsLoading) return;
    docsLoading = true;
    /* 方法正文与对象手册分别打包，按需依次注入 */
    const scripts = [];
    if (!global.__DOCS__) scripts.push('js/docs-content.js');
    if (!global.__PLANT_DOCS__) scripts.push('js/plant-docs.js');
    const done = () => {
      docsLoading = false;
      const queue = docsQueue.splice(0);
      queue.forEach((fn) => { try { fn(); } catch (err) { console.warn(err); } });
    };
    let i = 0;
    const loadNext = () => {
      if (i >= scripts.length) { done(); return; }
      const script = doc.createElement('script');
      script.src = scripts[i++];
      script.onload = loadNext;
      script.onerror = loadNext;
      doc.head.appendChild(script);
    };
    loadNext();
  }
  function focusReader() {
    const overlay = doc.getElementById('overlay-docs');
    if (overlay && NS.ui && NS.ui.trapFocus) NS.ui.trapFocus(overlay);
    const search = doc.getElementById('docs-search');
    if (search) setTimeout(() => search.focus(), 30);
  }
  function open(key) {
    const seq = ++openSeq;
    savedHash = global.location.hash || '';
    docsLastFocus = doc.activeElement;
    ensureDocs(() => {
      if (seq !== openSeq) return;
      show(key || currentKey);
      focusReader();
    });
  }
  function close() {
    openSeq++;
    const overlay = doc.getElementById('overlay-docs');
    if (overlay) {
      if (NS.ui && NS.ui.releaseFocusTrap) NS.ui.releaseFocusTrap(overlay);
      overlay.hidden = true;
    }
    if (docsLastFocus && typeof docsLastFocus.focus === 'function') docsLastFocus.focus();
    docsLastFocus = null;
    try { global.history.replaceState(null, '', savedHash || location.pathname); }
    catch (err) { /* 忽略 */ }
  }
  function stepDoc(delta) {
    if (isGuideKey(currentKey) || isPlantKey(currentKey)) {
      /* 专题 / 对象手册页：← → 回到方法正文的首/末讲 */
      show(delta > 0 ? D.methodList[0] : D.methodList[D.methodList.length - 1]);
      return;
    }
    const i = D.methodList.indexOf(currentKey);
    const next = D.methodList[(i + delta + D.methodList.length) % D.methodList.length];
    show(next);
  }
  function openGuide(slug) {
    if (!guideBundle()[slug]) return;
    savedHash = global.location.hash || '';
    docsLastFocus = doc.activeElement;
    show(GUIDE_PREFIX + slug);
    focusReader();
  }
  /* 打开对象手册：public/docs/plants/*.md（由 build-docs.js 打包为 __PLANT_DOCS__） */
  function openPlant(slug) {
    if (!slug) return;
    const seq = ++openSeq;
    ensureDocs(() => {
      if (seq !== openSeq) return;
      savedHash = global.location.hash || '';
      docsLastFocus = doc.activeElement;
      show(PLANT_PREFIX + slug);
      focusReader();
    });
  }
  function useInLab() {
    const sim = NS.sim, ui = NS.ui, app = NS.app;
    if (isGuideKey(currentKey) || isPlantKey(currentKey)) return;
    if (sim && ui) {
      sim.setMethod(currentKey);
      ui.setActiveMethod(currentKey);
      ui.renderPlant();
      ui.renderParams();
      if (app && app.refreshAll) app.refreshAll();
      else if (NS.charts) NS.charts.draw();
      ui.toast('已切换到 ' + D.CONTROLLER_CONFIGS[currentKey].name + '，可开始实验');
    }
    close();
  }

  function mount() {
    const overlay = doc.getElementById('overlay-docs');
    if (!overlay || bound) return;
    bound = true;
    const activeKey = () => (NS.sim && NS.sim.getSettings) ? NS.sim.getSettings().method : currentKey;
    doc.addEventListener('click', (ev) => {
      if (ev.target.closest('#btn-docs') || ev.target.closest('#btn-profile-docs')) {
        open(activeKey());
      }
    });
    doc.addEventListener('keydown', (ev) => {
      if (ev.key !== 'h' && ev.key !== 'H') return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey || !overlay.hidden) return;
      const tag = ev.target && ev.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (ev.target && ev.target.isContentEditable)) return;
      ev.preventDefault();
      open(activeKey());
    });
    overlay.addEventListener('click', (ev) => {
      const plantLink = ev.target.closest('[data-plant-doc]');
      if (plantLink) {
        const slug = plantLink.getAttribute('data-plant-doc');
        if (slug) show(PLANT_PREFIX + slug);
        return;
      }
      const item = ev.target.closest('[data-doc]');
      if (item) { show(item.dataset.doc); return; }
      const toc = ev.target.closest('[data-toc]');
      if (toc) {
        ev.preventDefault();
        const target = doc.getElementById(toc.dataset.toc);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (ev.target.closest('[data-docs-close]')) { close(); return; }
      if (ev.target.closest('#docs-prev')) { stepDoc(-1); return; }
      if (ev.target.closest('#docs-next')) { stepDoc(1); return; }
      if (ev.target.closest('#docs-use')) { useInLab(); return; }
    });
    const search = doc.getElementById('docs-search');
    if (search) search.addEventListener('input', (ev) => {
      const q = ev.target.value.trim().toLowerCase();
      doc.querySelectorAll('.doc-nav-item').forEach((btn) => {
        const conf = D.CONTROLLER_CONFIGS[btn.dataset.doc];
        const hit = !q || (conf && (conf.name.toLowerCase().indexOf(q) >= 0 || btn.dataset.doc.toLowerCase().indexOf(q) >= 0));
        btn.hidden = !hit;
        if (hit) { const g = btn.closest('details'); if (g) g.open = true; }
      });
    });
    doc.addEventListener('keydown', (ev) => {
      if (overlay.hidden) return;
      if (ev.key === 'Escape') { ev.stopPropagation(); close(); }
      else if (ev.key === 'ArrowLeft' && !/INPUT|TEXTAREA/.test(ev.target.tagName)) stepDoc(-1);
      else if (ev.key === 'ArrowRight' && !/INPUT|TEXTAREA/.test(ev.target.tagName)) stepDoc(1);
    }, true);
    const hash = /^#doc=(.+)$/.exec(global.location.hash || '');
    if (hash) {
      const key = decodeURIComponent(hash[1]);
      if (D.CONTROLLER_CONFIGS[key]) {
        savedHash = '';
        ensureDocs(() => show(key, false));
      }
    }
    const ghash = /^#guide=(.+)$/.exec(global.location.hash || '');
    if (ghash) {
      const slug = decodeURIComponent(ghash[1]);
      if (guideBundle()[slug]) { savedHash = ''; show(GUIDE_PREFIX + slug, false); }
    }
    const phash = /^#plant=(.+)$/.exec(global.location.hash || '');
    if (phash) {
      const slug = decodeURIComponent(phash[1]);
      savedHash = '';
      ensureDocs(() => show(PLANT_PREFIX + slug, false));
    }
  }

  NS.docs = {
    renderDoc, parseMd, mount, open, openGuide, openPlant, close, show, useInLab, ensureDocs
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})(window);
