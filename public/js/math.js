/* ============================================================
   math.js — 轻量 TeX 公式引擎（零外部依赖）
   公式源统一为标准 TeX；渲染器把 TeX 子集排版为结构化 HTML，
   由 styles.css 的数学字体与上下标/分数/重音规则呈现。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};

  const SYMBOLS = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
    tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
    Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    infty: '∞', partial: '∂', nabla: '∇', forall: '∀', exists: '∃',
    cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', ast: '∗', star: '⋆',
    le: '≤', ge: '≥', ne: '≠', approx: '≈', equiv: '≡', propto: '∝',
    ll: '≪', gg: '≫', subset: '⊂', supset: '⊃', in: '∈', notin: '∉',
    to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftrightarrow: '⇔',
    int: '∫', sum: '∑', prod: '∏', oint: '∮', lim: 'lim',
    ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱',
    quad: ' ', qquad: ' ', ',': ' ', ';': ' ', '!': '', ' ': ' ',
    langle: '⟨', rangle: '⟩', lvert: '|', rvert: '|', Vert: '‖',
    sin: 'sin', cos: 'cos', tan: 'tan', sec: 'sec', exp: 'exp', log: 'log',
    ln: 'ln', max: 'max', min: 'min', det: 'det', arg: 'arg', deg: 'deg',
    prime: '′', degree: '°', ell: 'ℓ', hbar: 'ℏ'
  };

  /* 重音符号：独立定位排版，不再使用容易糊在一起的组合字符 */
  const ACCENTS = {
    dot: '˙', ddot: '¨', hat: 'ˆ', bar: '¯',
    tilde: '˜', vec: '⇀', check: 'ˇ', breve: '˘'
  };

  const TEXT_COMMANDS = new Set(['text', 'mathrm', 'operatorname', 'mathbf', 'mathsf', 'mathit', 'mathbb', 'mathcal', 'textrm']);
  const BIG_OPS = new Set(['int', 'sum', 'prod', 'oint']);
  const SPACING = { ',': '0.18em', ':': '0.22em', ';': '0.28em', '!': '-0.16em', quad: '1em', qquad: '2em' };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── MathML 主路径：交给浏览器数学排版引擎 ─────────
     分数、重音、运算符间距由 MathML 自动处理，避免 HTML 手工
     对齐带来的「重音偏移 / 分式松散 / 基线错位」。 */
  const ML_ACCENTS = { dot: '\u02D9', ddot: '\u00A8', hat: '\u02C6', bar: '\u00AF', tilde: '\u02DC', vec: '\u20D7', check: '\u02C7', breve: '\u02D8' };
  const ML_BIG_OPS = { int: '\u222B', sum: '\u2211', prod: '\u220F', oint: '\u222E' };

  function renderMathML(src) {
    let i = 0;
    function escML(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function token() {
      if (i >= src.length) return '<mrow></mrow>';
      const ch = src[i];
      if (ch === '{') { i++; return '<mrow>' + parse('}') + '</mrow>'; }
      if (ch === '\\') return command();
      i++;
      return charNode(ch);
    }
    function charNode(ch) {
      if (/[0-9]/.test(ch)) return '<mn>' + ch + '</mn>';
      if (/[A-Za-z]/.test(ch)) return '<mi>' + ch + '</mi>';
      if (/[\u4e00-\u9fff]/.test(ch)) return '<mtext>' + escML(ch) + '</mtext>';
      if (/[α-ωΑ-Ω]/.test(ch)) return '<mi>' + ch + '</mi>';
      const ops = { '-': '\u2212', '*': '\u22C5', '/': '/', '=': '=', '+': '+', '<': '&lt;', '>': '&gt;', '|': '|' };
      if (ops[ch] !== undefined) return '<mo>' + ops[ch] + '</mo>';
      return '<mo>' + escML(ch) + '</mo>';
    }
    function readWord() {
      let w = '';
      while (i < src.length && /[A-Za-z]/.test(src[i])) { w += src[i]; i++; }
      return w;
    }
    /* 读取 text/mathrm/operatorname 的参数：花括号内按原样取字符，否则取紧邻单词 */
    function readTextArg() {
      if (src[i] === '{') {
        i++; let t = '';
        while (i < src.length && src[i] !== '}') { t += src[i]; i++; }
        if (src[i] === '}') i++;
        return t;
      }
      return readWord() || token();
    }
    function command() {
      i++;
      if (i >= src.length) return '';
      const ch = src[i];
      if (!/[0-9A-Za-z]/.test(ch)) {
        i++;
        if (ch === ',' || ch === ':' || ch === ';') return '<mspace width="0.17em"/>';
        if (ch === '!') return '<mspace width="-0.17em"/>';
        if (ch === ' ') return '<mspace width="0.25em"/>';
        if (ch === '\\') return '<mspace linebreak="newline"/>';
        return '<mo>' + escML(ch) + '</mo>';
      }
      let name = '';
      while (i < src.length && /[A-Za-z]/.test(src[i])) { name += src[i]; i++; }
      /* 多字母命令后紧跟裸单词（如 \operatorname{sgn}）拆分为「命令名 + 参数词」 */
      const TEXT_CMDS = ['operatorname', 'mathrm', 'textrm', 'mathbf', 'mathsf', 'mathit', 'text'];
      let cmd = name, argWord = '';
      for (let c = 0; c < TEXT_CMDS.length; c++) {
        const k = TEXT_CMDS[c];
        if (name === k) { cmd = k; break; }
        if (name.indexOf(k) === 0 && name.length > k.length) { cmd = k; argWord = name.slice(k.length); break; }
      }
      if (ML_ACCENTS[cmd]) {
        const body = token();
        return '<mover accent="true">' + body + '<mo>' + ML_ACCENTS[cmd] + '</mo></mover>';
      }
      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac' || cmd === 'cfrac') {
        return '<mfrac>' + token() + token() + '</mfrac>';
      }
      if (cmd === 'sqrt') {
        let idx = '';
        if (src[i] === '[') { i++; idx = parse(']'); }
        const body = token();
        return idx ? '<mroot>' + body + '<mrow>' + idx + '</mrow></mroot>' : '<msqrt>' + body + '</msqrt>';
      }
      if (cmd === 'mathrm' || cmd === 'operatorname' || cmd === 'textrm' || cmd === 'mathbf' || cmd === 'mathsf' || cmd === 'mathit') {
        const body = argWord || readTextArg();
        return '<mi mathvariant="normal">' + body + '</mi>';
      }
      if (cmd === 'text') {
        const body = argWord || readTextArg();
        return '<mtext>' + body + '</mtext>';
      }
      if (name === 'left' || name === 'right' || name === 'big' || name === 'bigl' || name === 'bigr' || name === 'Big' || name === 'Bigl' || name === 'Bigr') return '';
      if (name === 'quad') return '<mspace width="1em"/>';
      if (name === 'qquad') return '<mspace width="2em"/>';
      if (ML_BIG_OPS[name]) return '<mo largeop="true">' + ML_BIG_OPS[name] + '</mo>';
      if (SYMBOLS[name] !== undefined) {
        const sym = SYMBOLS[name];
        if (/^[A-Za-z]{2,}$/.test(sym)) return '<mi mathvariant="normal">' + sym + '</mi>';
        if (/[α-ωΑ-Ω]/.test(sym)) return '<mi>' + sym + '</mi>';
        return '<mo>' + escML(sym) + '</mo>';
      }
      return '<mtext>' + escML(name) + '</mtext>';
    }
    function parse(stop) {
      const nodes = [];
      while (i < src.length) {
        const ch = src[i];
        if (stop && ch === stop) { i++; break; }
        if (ch === '}') { i++; continue; }
        if (ch === '^' || ch === '_') {
          i++;
          const arg = token();
          let base = nodes.pop() || '<mrow></mrow>';
          if (base.indexOf('<mspace') === 0) { nodes.push(base); base = '<mrow></mrow>'; }
          nodes.push(ch === '^' ? '<msup>' + base + arg + '</msup>' : '<msub>' + base + arg + '</msub>');
          continue;
        }
        if (/\s/.test(ch)) {
          i++;
          if (nodes.length) nodes.push('<mspace width="0.14em"/>');
          continue;
        }
        nodes.push(token());
      }
      return nodes.join('');
    }
    return parse('');
  }

  function supportsMathML() {
    try {
      if (typeof global.MathMLElement !== 'undefined') return true;
      /* 低版本回退探测：能否创建带正确命名空间的 <math> */
      if (global.document && typeof global.document.createElementNS === 'function') {
        const el = global.document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
        return !!el && el.namespaceURI === 'http://www.w3.org/1998/Math/MathML';
      }
    } catch (err) { /* 忽略 */ }
    return false;
  }

  /* 把残留的 Unicode 数学符号归一成 TeX 命令（不碰中文，供正文渲染用） */
  function unicodeToTex(s) {
    UNICODE_MAP.forEach(([re, rep]) => { s = s.replace(re, rep); });
    return s;
  }

  /* 把 accent 命令后直接跟的 token 补全成 { } 参数，兼容宽松写法
     （如 \dot x → \dot{x}、\bar\alpha_1 → \bar{\alpha_1}），KaTeX 严格需要参数 */
  function fixAccents(s) {
    return String(s).replace(
      /\\(bar|hat|dot|ddot|tilde|vec|check|breve|overline|underline|widehat|widetilde)(\s*)([A-Za-z0-9]|\\?[a-zA-Z][a-zA-Z0-9]*(?:_[A-Za-z0-9]+)?)/g,
      function (m, a, sp, tok) { return '\\' + a + '{' + tok + '}'; });
  }

  /* KaTeX 同步渲染；不可用时返回 null 让上层回退。
     若 KaTeX 内部解析失败（throwOnError:false 时返回含 katex-error 的 HTML），
     也返回 null，由上层降级为原样显示，避免出现红色错误框。 */
  function safeKatex(tex, display) {
    if (global.katex) {
      try {
        const h = global.katex.renderToString(fixAccents(String(tex == null ? '' : tex)), {
          displayMode: !!display,
          throwOnError: false,
          strict: false,
          output: 'html'
        });
        return h.indexOf('katex-error') >= 0 ? null : h;
      } catch (err) { /* 回退 */ }
    }
    return null;
  }

  /* 对外入口：KaTeX 优先（零依赖本地字体，标准 TeX 排版），
     缺失或异常时回退到自研 MathML / HTML。
     opts.display: 'inline'（默认，行内公式）| 'block'（独立成行、居中、displaystyle） */
  function render(tex, opts) {
    const display = !!(opts && opts.display === 'block');
    const k = safeKatex(tex, display);
    /* 统一包一层 .math，保证公式容器、字号与验收选择器对三种引擎一致 */
    if (k !== null) return '<span class="math katex-math">' + k + '</span>';
    const src = String(tex || '');
    if (supportsMathML()) {
      try {
        const open = display
          ? '<math display="block" displaystyle="true">'
          : '<math display="inline">';
        return '<span class="math mathml">' + open + renderMathML(src) + '</math></span>';
      } catch (err) { /* 回退 HTML */ }
    }
    return renderHTML(src);
  }

  /* 正文渲染：公式与变量均按 TeX 排版。
     先在文本里查找显式 $...$，再对「反斜杠命令 + 下标/上标」与「变量_下标」
     自动用 KaTeX 行内渲染；其余中文/标点原样。 */
  /* 把一个（已 unicode 归一、不含显式 $...$ 的）文本段拆成数学片段。
     先收集所有匹配，再把「中间仅含空白或数学/标点、不含中文」的相邻片段
     合并为整体方程交给 KaTeX。同时导出供离线校验脚本精确复用，保证
     校验路径与实际渲染路径完全一致。 */
  function extractFragments(seg) {
    seg = fixAccents(seg);
    const RE = /(\\\||\\[a-zA-Z]+[_^]?\{[^{}]*\}|\\[a-zA-Z]+|[A-Za-z0-9_^{}|()+\-*/=.,;:<>~!?%\s]+)/g;
    const ms = [];
    let m;
    while ((m = RE.exec(seg))) ms.push({ i: m.index, s: m[0] });
    const GAP = /^[A-Za-z0-9_^{}|()+\-*/=.,;:<>~!?%\s]*$/;
    const merged = [];
    for (const mt of ms) {
      const prev = merged[merged.length - 1];
      const gap = prev ? seg.slice(prev.end, mt.i) : '';
      if (prev && GAP.test(gap)) {
        prev.s += gap + mt.s;
        prev.end = mt.i + mt.s.length;
      } else {
        merged.push({ i: mt.i, s: mt.s, end: mt.i + mt.s.length });
      }
    }
    return merged;
  }

  function autoMath(seg) {
    const merged = extractFragments(seg);
    let out = '', last = 0;
    for (const mt of merged) {
      out += esc(seg.slice(last, mt.i));
      out += (/[<>]/.test(mt.s)) ? '<span class="m-text">' + esc(mt.s) + '</span>'
        : (safeKatex(mt.s, false) || '<span class="m-text">' + esc(mt.s) + '</span>');
      last = mt.end;
    }
    out += esc(seg.slice(last));
    return out;
  }

  function renderMixed(text) {
    if (text == null) return '';
    let t = unicodeToTex(String(text));
    const segs = t.split(/(\$[^$]+\$)/g);
    return segs.map((seg) => {
      if (seg.length >= 3 && seg[0] === '$' && seg[seg.length - 1] === '$') {
        return safeKatex(seg.slice(1, -1), false) || esc(seg);
      }
      return autoMath(seg);
    }).join('');
  }

  /* ── Markdown 子集（界面变量文本通用渲染） ─────────
     行内：$...$ → KaTeX；**粗体**；`行内代码`。
     块级：空行分段、- 列表、$$...$$ 独立成行公式。
     非 $ 文本交给 renderMixed 自动识别 ∫/∑/√/α 等数学片段，
     故词典里的 s = c·e + ė、∫e dt 等无需改写即能渲染。*/
  function mdInline(s) {
    if (s == null) return '';
    /* 先切公式，再切 **粗体** / `代码`，最后才交给 renderMixed。
       顺序不可颠倒：renderMixed 会把每个字符包进 <span>，星号被拆散后
       加粗正则就再也匹配不上（V5.3 修复：加粗曾原样显示）。 */
    return String(s).split(/(\$[^$\n]+?\$)/g).map((seg) => {
      if (seg.length >= 3 && seg[0] === '$' && seg[seg.length - 1] === '$') {
        return safeKatex(seg.slice(1, -1), false) || esc(seg.slice(1, -1));
      }
      return seg.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((piece) => {
        if (/^\*\*[\s\S]+\*\*$/.test(piece)) return '<strong>' + mdInline(piece.slice(2, -2)) + '</strong>';
        if (/^`[\s\S]+`$/.test(piece)) return '<code>' + esc(piece.slice(1, -1)) + '</code>';
        return piece.split('\n').map((ln) => renderMixed(ln)).join('<br>');
      }).join('');
    }).join('');
  }
  function md(src) {
    if (src == null) return '';
    const blocks = String(src).replace(/\r\n/g, '\n').split(/\n{2,}/);
    return blocks.map((b) => {
      const t = b.trim();
      if (!t) return '';
      if (/^\$\$[\s\S]*\$\$$/.test(t)) {
        const tex = t.slice(2, -2).trim().replace(/\s+/g, ' ');
        const h = safeKatex(tex, true);
        return '<div class="md-math">' + (h || esc(tex)) + '</div>';
      }
      if (/^(?:- .*(?:\n- .*)*)$/.test(t)) {
        const items = t.split('\n').map((l) => l.replace(/^- /, ''));
        return '<ul class="md-ul">' + items.map((it) => '<li>' + mdInline(it) + '</li>').join('') + '</ul>';
      }
      /* 注意：不得对整段输出做 \n → <br> 替换，否则会污染 KaTeX 生成的 SVG path 的 d 属性
         （KaTeX 的路径里本就含有换行）。行内换行已由 mdInline 的逐行 join('<br>') 处理。 */
      return '<p class="md-p">' + mdInline(t) + '</p>';
    }).join('');
  }

  function renderChar(ch) {
    if (/[0-9]/.test(ch)) return '<span class="m-num">' + ch + '</span>';
    if (/[A-Za-z]/.test(ch)) return '<span class="m-var">' + ch + '</span>';
    if (/[\u4e00-\u9fff]/.test(ch)) return '<span class="m-text">' + esc(ch) + '</span>';
    if (/[+\-=<>/|,.;:()\[\]!'*]/.test(ch)) return '<span class="m-op">' + esc(ch) + '</span>';
    if (/[α-ωΑ-Ω∞∂±≤≥≠≈∫∑√→]/.test(ch)) return '<span class="m-var">' + esc(ch) + '</span>';
    return '<span class="m-text">' + esc(ch) + '</span>';
  }

  /* 把 TeX 子集解析为结构化 HTML */
  function renderHTML(tex) {
    const src = String(tex || '');
    let i = 0;

    function readToken() {
      if (i >= src.length) return '';
      const ch = src[i];
      if (ch === '{') { i++; return '<span class="m-group">' + parse('}') + '</span>'; }
      if (ch === '\\') return parseCommand();
      i++;
      return renderChar(ch);
    }

    function readWord() {
      let w = '';
      while (i < src.length && /[A-Za-z]/.test(src[i])) { w += src[i]; i++; }
      return w;
    }
    /* 读取 text/mathrm/operatorname 的参数：花括号内按原样取字符，否则取紧邻单词 */
    function readTextArg() {
      if (src[i] === '{') {
        i++; let t = '';
        while (i < src.length && src[i] !== '}') { t += src[i]; i++; }
        if (src[i] === '}') i++;
        return t;
      }
      return readWord() || token();
    }

    function parseCommand() {
      i++;
      if (i >= src.length) return '';
      const ch = src[i];
      if (/[0-9A-Za-z]/.test(ch)) {
        let name = '';
        while (i < src.length && /[A-Za-z]/.test(src[i])) { name += src[i]; i++; }
        if (!name) { name = src[i]; i++; }
        return command(name);
      }
      i++;
      if (ch === ',' || ch === ':' || ch === ';' || ch === '!' || ch === ' ') {
        return '<span class="m-space" style="width:' + (SPACING[ch] || '0.25em') + '"></span>';
      }
      if (ch === '\\') return '<span class="m-op">\\</span>';
      return renderChar(ch === '{' ? '{' : (ch === '}' ? '}' : ch));
    }

    function command(name) {
      /* 多字母命令后紧跟裸单词（如 \operatorname{sgn}）拆分为命令名 + 参数词 */
      const TEXT_CMDS = ['operatorname', 'mathrm', 'textrm', 'mathbf', 'mathsf', 'mathit', 'text'];
      let cmd = name, argWord = '';
      for (let c = 0; c < TEXT_CMDS.length; c++) {
        const k = TEXT_CMDS[c];
        if (name === k) { cmd = k; break; }
        if (name.indexOf(k) === 0 && name.length > k.length) { cmd = k; argWord = name.slice(k.length); break; }
      }
      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac' || cmd === 'cfrac') {
        const a = readToken(), b = readToken();
        return '<span class="m-frac"><span class="m-numer">' + a + '</span><span class="m-denom">' + b + '</span></span>';
      }
      if (cmd === 'sqrt') {
        let index = '';
        if (src[i] === '[') { i++; index = parse(']'); }
        const body = readToken();
        return '<span class="m-sqrt">' + (index ? '<sup class="m-rootidx">' + index + '</sup>' : '') +
          '<span class="m-radical">√</span><span class="m-radicand">' + body + '</span></span>';
      }
      if (cmd === 'mathrm' || cmd === 'operatorname' || cmd === 'textrm' || cmd === 'mathbf') {
        const rmBody = argWord || readTextArg();
        return '<span class="m-rm">' + rmBody + '</span>';
      }
      if (TEXT_COMMANDS.has(cmd)) {
        const body = argWord || readTextArg();
        return '<span class="m-text">' + body + '</span>';
      }
      if (ACCENTS[name]) {
        const body = readToken();
        /* 重音不再用组合字符（字框空白导致与字母割裂），改由 CSS 精确绘制 */
        return '<span class="m-accent m-accent-' + name + '"><span class="m-base">' + body + '</span></span>';
      }
      if (name === 'left' || name === 'right' || name === 'big' || name === 'bigl' ||
          name === 'bigr' || name === 'Big' || name === 'Bigl' || name === 'Bigr') return '';
      if (name === 'quad' || name === 'qquad') {
        return '<span class="m-space" style="width:' + SPACING[name] + '"></span>';
      }
      if (name === 'operatorname*' || name === 'operatorname') {
        return '<span class="m-text">' + readToken() + '</span>';
      }
      if (name === 'begin' || name === 'end') return '<span class="m-text">' + readToken() + '</span>';
      if (SYMBOLS[name] !== undefined) {
        const sym = SYMBOLS[name];
        if (BIG_OPS.has(name)) return '<span class="m-bigop">' + esc(sym) + '</span>';
        if (/[A-Za-z]/.test(sym[0]) && name.length > 2) return '<span class="m-text">' + esc(sym) + '</span>';
        /* 希腊字母是变量而非运算符：用 m-var 避免运算符 margin 撑开重音与分式间距 */
        if (/[α-ωΑ-Ω]/.test(sym)) return '<span class="m-var">' + esc(sym) + '</span>';
        return '<span class="m-op">' + esc(sym) + '</span>';
      }
      return '<span class="m-text">' + esc(name) + '</span>';
    }

    function parse(stop) {
      let out = '';
      while (i < src.length) {
        const ch = src[i];
        if (stop && ch === stop) { i++; break; }
        if (ch === '}' && !stop) { i++; continue; }
        if (ch === '^' || ch === '_') {
          i++;
          const arg = readToken();
          out += ch === '^'
            ? '<sup class="m-sup">' + arg + '</sup>'
            : '<sub class="m-sub">' + arg + '</sub>';
          continue;
        }
        if (ch === '{') { i++; out += '<span class="m-group">' + parse('}') + '</span>'; continue; }
        if (ch === '\\') { out += parseCommand(); continue; }
        if (/\s/.test(ch)) { i++; out += ' '; continue; }
        out += renderChar(ch);
        i++;
      }
      return out;
    }

    try { return '<span class="math">' + parse('') + '</span>'; }
    catch (err) { return '<span class="math"><span class="m-text">' + esc(src) + '</span></span>'; }
  }

  /* V2.1 伪公式 → 标准 TeX（原始 eq 字符串保持不变） */
  /* 注意：希腊字母/运算符等「原子符号」归一为 TeX 命令后，必须在命令后补一个
     空格，否则若紧邻下一个字母（如 φe、Δu），KaTeX 会把 \varphi e 误读成未定义
     命令 \varphie；且空格能保证 \int_0 等边界把上下标正确归到前一元件。
     已带 {} 的 accent 类（\dot{x}、\hat{x} 等）无需处理；
     源文本里已有的合法命令（如 \hat\theta）不被此表触碰。 */
  const UNICODE_MAP = [
    [/ẍ/g, '\\ddot{x}'], [/ẋ/g, '\\dot{x}'], [/ẏ/g, '\\dot{y}'], [/ż/g, '\\dot{z}'],
    [/ė/g, '\\dot{e}'], [/ÿ/g, '\\ddot{y}'],
    [/x̂/g, '\\hat{x}'], [/v̂/g, '\\hat{v}'], [/d̂/g, '\\hat{d}'], [/m̂/g, '\\hat{m}'],
    [/k̂/g, '\\hat{k}'], [/ĉ/g, '\\hat{c}'], [/θ̂/g, '\\hat{\\theta}'], [/ŝ/g, '\\hat{s}'],
    [/F̂/g, '\\hat{F}'],
    [/ρ/g, '\\rho '], [/ε/g, '\\varepsilon '], [/γ/g, '\\gamma '], [/λ/g, '\\lambda '],
    [/ω/g, '\\omega '], [/τ/g, '\\tau '], [/θ/g, '\\theta '], [/μ/g, '\\mu '],
    [/σ/g, '\\sigma '], [/δ/g, '\\delta '], [/η/g, '\\eta '], [/ζ/g, '\\zeta '],
    [/β/g, '\\beta '], [/α/g, '\\alpha '], [/κ/g, '\\kappa '], [/ν/g, '\\nu '],
    [/φ/g, '\\varphi '], [/ψ/g, '\\psi '], [/π/g, '\\pi '], [/Δ/g, '\\Delta '],
    [/Σ/g, '\\Sigma '], [/Ω/g, '\\Omega '], [/Γ/g, '\\Gamma '], [/Λ/g, '\\Lambda '],
    [/∫/g, '\\int '], [/∑/g, '\\sum '], [/√/g, '\\sqrt'], [/∞/g, '\\infty '],
    [/∂/g, '\\partial '], [/·/g, ' '], [/×/g, '\\times '], [/±/g, '\\pm '],
    [/−/g, '-'], [/⊥/g, '\\perp '],
    [/≤/g, '\\le '], [/≥/g, '\\ge '], [/≠/g, '\\ne '], [/≈/g, '\\approx '],
    [/→/g, '\\to '], [/∈/g, '\\in '], [/₁/g, '_1'], [/₂/g, '_2'], [/₃/g, '_3'],
    [/²/g, '^2'], [/³/g, '^3'], [/ⁿ/g, '^n'], [/ᵀ/g, '^{\\mathsf{T}}']
  ];

  /* 把一段 TeX 压成可直接放进 \text{...} 的纯文本
     （KaTeX 文本模式里不能出现命令、分数或嵌套 \text） */
  function texToLiteral(src) {
    let t = String(src == null ? '' : src);
    let prev;
    do {
      prev = t;
      t = t.replace(/\\(?:text|mathrm|mathbf|mathsf|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1');
    } while (t !== prev);
    /* KaTeX 文本模式不接受 _ 与 ^，上下标改写成圆括号形式 */
    t = t.replace(/_\{([^{}]*)\}/g, '($1)').replace(/\^\{([^{}]*)\}/g, '($1)');
    t = t.replace(/_([^\s{}()])/g, '($1)').replace(/\^([^\s{}()])/g, '($1)');
    t = t.replace(/\\(?:hat|bar|tilde|vec|check|breve|widehat|widetilde)\s*\{([^{}]*)\}/g, '$1');
    t = t.replace(/\\(?:hat|bar|tilde|vec|dot|ddot)\s+([A-Za-z0-9])/g, '$1');
    t = t.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
    t = t.replace(/\\frac\s*\{([^{}]*)\}\s*([A-Za-z0-9])/g, '($1)/($2)');
    t = t.replace(/\\frac\s*([A-Za-z0-9])\s*([A-Za-z0-9])/g, '($1)/($2)');
    t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');
    t = t.replace(/\\sqrt\s*([A-Za-z0-9])/g, '√$1');
    t = t.replace(/\\(?:int|sum|prod|oint)\s*/g, '');
    const LIT = {
      theta: 'θ', vartheta: 'ϑ', rho: 'ρ', varphi: 'φ', phi: 'φ', lambda: 'λ', mu: 'μ',
      pi: 'π', sigma: 'σ', omega: 'ω', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ',
      epsilon: 'ε', tau: 'τ', psi: 'ψ', chi: 'χ', eta: 'η', zeta: 'ζ', kappa: 'κ',
      nu: 'ν', xi: 'ξ', infty: '∞', quad: ' ', qquad: ' ', times: '·', cdot: '·',
      le: '≤', ge: '≥', ne: '≠', approx: '≈', to: '→', in: '∈', perp: '⊥',
      partial: '∂', ln: 'ln', log: 'log', exp: 'exp', lim: 'lim', sin: 'sin', cos: 'cos',
      tan: 'tan', max: 'max', min: 'min', dot: '', ddot: ''
    };
    t = t.replace(/\\([A-Za-z]+)/g, (m, n) => (LIT[n] !== undefined ? LIT[n] : n));
    t = t.replace(/[{}]/g, '');
    t = t.replace(/\\[a-zA-Z]+/g, '');
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }

  function toTex(source) {
    let s = String(source || '').trim();
    const notes = [];
    s = s.replace(/\\\s*\(((?:[^()]|\([^()]*\))*)\)/g, (all, inner) => {
      notes.push(inner);
      return '\u0000N' + (notes.length - 1) + '\u0000';
    });
    UNICODE_MAP.forEach(([re, rep]) => { s = s.replace(re, rep); });
    // 修正 Unicode→TeX 后的粘连：\inte → \int e，√|s| → \sqrt{|s|}
    s = s.replace(/\\sqrt\|([^|]*)\|/g, '\\sqrt{|' + '$1' + '|}')
      .replace(/\\(int|sum|prod|oint|lim|sqrt)(?=[A-Za-z])/g, '\\$1 ');
    s = s.replace(/\bsgn\(/g, '\\operatorname{sgn}(')
      .replace(/\bsat\(/g, '\\operatorname{sat}(')
      .replace(/\bfal\(/g, '\\operatorname{fal}(')
      .replace(/\bDefuzzify\(/g, '\\operatorname{Defuzzify}(')
      .replace(/\bRules\(/g, '\\operatorname{Rules}(')
      .replace(/\bLPF\(/g, '\\operatorname{LPF}(')
      .replace(/\bargmin_\{u\}/g, '\\operatorname{arg\\,min}_{u}')
      .replace(/\barcmin/g, '\\operatorname{arg\\,min}')
      .replace(/\bsec\^2/g, '\\sec^{2}')
      .replace(/\bsec\(/g, '\\sec(')
      .replace(/\^T\b/g, '^{\\mathsf{T}}')
      .replace(/\^α/g, '^{\\alpha}')
      .replace(/\^β/g, '^{\\beta}')
      .replace(/\^q/g, '^{q}')
      .replace(/\^p/g, '^{p}')
      .replace(/\sdt\b/g, ' \\,\\mathrm{d}t')
      .replace(/\s+\|\s+/g, ' \\;|\\; ');
    s = s.replace(/[\u4e00-\u9fff][\u4e00-\u9fff，。、（）A-Za-z0-9]*/g, (m) => '\\text{' + m + '}');
    /* 最后放回说明文字：压成纯文本（KaTeX 文本模式里不能出现命令） */
    s = s.replace(/\u0000N(\d+)\u0000/g, (m, i) => '\\quad\\text{' + texToLiteral(notes[Number(i)]) + '}');
    return s.replace(/\s{2,}/g, ' ').trim();
  }

  function markdown(tex) { return '$$\n' + tex + '\n$$'; }
  function texSource(tex) { return tex; }
  function formula(eq) {
    const tex = toTex(eq);
    return { tex, md: markdown(tex), source: texSource(tex), html: render(tex) };
  }
  const cache = new Map();
  function cachedFormula(eq) {
    if (!cache.has(eq)) cache.set(eq, formula(eq));
    return cache.get(eq);
  }

  function buildFormulaBook(data) {
    const lines = [
      '# 控制理论模拟器 · 公式手册',
      '',
      '> 全部公式以标准 TeX 语法给出，可直接粘贴进 Markdown 或 LaTeX 文档。控制律为教学演示级离散化实现。',
      '',
      '## 一、被控对象模型（' + data.PLANT_LIST.length + ' 个）', ''
    ];
    data.PLANT_LIST.forEach((id) => {
      const p = data.PLANTS[id];
      lines.push('### ' + p.name + ' · ' + p.short, '', p.desc, '', '$$', p.tex, '$$', '');
    });
    lines.push('## 二、控制律（' + Object.keys(data.CONTROLLER_CONFIGS).length + ' 种）', '');
    data.sortedCategories.forEach((cat) => {
      lines.push('### ' + cat, '');
      data.groupedMethods[cat].forEach((conf) => {
        lines.push('#### ' + conf.name, '', '$$', cachedFormula(conf.eq).tex, '$$', '',
          '- ' + conf.desc, '- 调参指引：' + conf.tuning, '');
      });
    });
    return lines.join('\n');
  }

  NS.math = { render, renderHTML, renderMathML, renderMixed, md, mdInline, safeKatex, toTex, markdown, texSource, formula, cachedFormula, buildFormulaBook, supportsMathML, symbols: SYMBOLS, unicodeToTex, fixAccents, extractFragments };
})(window);
