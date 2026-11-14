/* ============================================================
   ui.js — 界面层（DOM 构建与局部更新；状态写回全部交给 app.js）
   V3.1：TeX 公式渲染、被控对象选择、能耗口径说明、坐标轴指标外置。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const D = NS.data;
  const sim = NS.sim;
  const doc = global.document;
  const $ = (id) => doc.getElementById(id);

  const REF_FLOW_METHODS = [
    'MRAC', 'L1', 'Flatness', 'InputShaping', 'PPC', 'PTC', 'ESO-Follow',
    'MRAC-MIT', 'Topological', 'Posicast', 'Funnel', 'TimeVary-BLF', 'Lorenz-Coupled'
  ];

  /* 理论体系章节号：与参考站点的中文数字编号保持一致 */
  const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

  let cb = {};
  let scope = 'all';
  let query = '';
  let favorites = [];
  let recent = [];
  let starFilter = false;
  let activeMethod = 'PID';
  let lastFocus = null;
  let toastTimer = null;
  let exportMenu = null;

  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function icon(name) {
    return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }
  function decimals(step) {
    const s = String(step || 1);
    if (s.indexOf('.') < 0) return 0;
    return Math.min(4, s.split('.')[1].length);
  }
  function paramLabel(key) { return D.PARAM_LABELS[key] || key.toUpperCase(); }
  function paramUnit(key, fallback) { return D.PARAM_UNITS[key] !== undefined ? D.PARAM_UNITS[key] : (fallback || ''); }
  function shortName(key) {
    const conf = D.CONTROLLER_CONFIGS[key];
    if (!conf) return key;
    return conf.name.length > 16 ? conf.name.slice(0, 15) + '…' : conf.name;
  }

  /* ── TeX 公式块（渲染 + 复制 TeX / Markdown） ──────── */
  function formulaBlock(tex) {
    return '<span class="formula-math">' + NS.math.render(tex) + '</span>';
  }

  /* ── 被控对象 ─────────────────────────────────────── */
  function renderPlant() {
    const select = $('plant-select');
    if (select) {
      select.innerHTML = D.PLANT_LIST.map((id) => {
        const plant = D.PLANTS[id];
        return '<option value="' + esc(id) + '">' + esc(plant.name) + '</option>';
      }).join('');
      select.value = sim.getSettings().plantId;
    }
    const plant = sim.getPlant();
    renderPlantModel();
    const setUnit = (id, value) => { const el = $(id); if (el) el.textContent = value; };
    setUnit('u-x', plant.unit);
    setUnit('u-v', plant.vUnit);
    setUnit('u-e', plant.unit);
    setUnit('u-rmse', plant.unit);
    /* 输入语义随对象切换：平移对象是力 u（N），倒立摆是力矩 τ（N·m） */
    const inSym = plant.inputSymbol || 'u', inUnit = plant.inputUnit || 'N';
    setUnit('l-u', '控制力 ' + inSym);
    setUnit('unit-u', inUnit);
    setUnit('l-hold', '稳态保持力 ' + inSym + 'ₕ');
    setUnit('unit-hold', inUnit);
    const view = (NS.charts && NS.charts.getPlantView) ? NS.charts.getPlantView(plant.id) : null;
    if (view) {
      const cards = doc.querySelectorAll('#metrics .metric');
      if (cards.length >= 2) {
        cards[0].querySelector('.metric-label').textContent = view.stateName + ' ' + view.symbol;
        cards[1].querySelector('.metric-label').textContent = view.rateName;
      }
      const capPos = $('chart-cap-pos');
      if (capPos) capPos.textContent = view.stateName + '响应';
    }
    /* 观测器图组随对象变化：仅倒立摆有平动自由度，显示小车位置曲线；
       速度图放最后一位（倒立摆为小车速度 v_c，其余对象为质量速度 v） */
    const cartCard = $('chart-card-cart');
    if (cartCard) cartCard.hidden = plant.id !== 'pendulum';
    const capVel = $('chart-cap-vel');
    if (capVel) capVel.textContent = plant.id === 'pendulum' ? '小车速度' : '速度';
    const velMetric = $('chart-metric-vel');
    if (velMetric) velMetric.textContent = (plant.id === 'pendulum' ? 'v_c' : 'v') + ' / ' + plant.vUnit;
    renumberCharts();
    const phaseMetric = $('chart-metric-phase');
    if (phaseMetric) phaseMetric.textContent = view.symbol + ' / ' + plant.unit + ' · ' + view.rateName + ' / ' + plant.vUnit;
  }

  /* 图卡可显隐（小车位置仅倒立摆有），按可见顺序重排 01/02/… 编号 */
  function renumberCharts() {
    let n = 0;
    doc.querySelectorAll('#charts-grid .chart-card').forEach((card) => {
      if (card.hidden) return;
      n += 1;
      const idx = card.querySelector('.chart-index');
      if (idx) idx.textContent = String(n).padStart(2, '0');
    });
  }

  /* ── 对象模型弹窗：按需打开，不再常驻主界面 ─────────── */
  function renderPlantModel() {
    const host = $('plant-model-body');
    if (!host) return;
    const plant = sim.getPlant();
    const st = sim.getSettings();
    const pv = (st.plantParams && st.plantParams[plant.id]) ? st.plantParams[plant.id] : plant.defaults;
    const eff = plant.effective(pv);
    const fmt = (v) => (typeof v === 'number' && isFinite(v)
      ? (Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2)) : esc(String(v)));

    const INPUT_NOTE = {
      msd: 'u 是作用在质量块上的水平力（N），直接出现在方程右端；对象自身带回复力 kx 与阻尼 cẋ。',
      freeMass: 'u 是作用在质量块上的水平力（N），位置是它的二重积分；对象没有回复力，也没有阻尼。',
      pendulum: 'F 是作用在小车上的水平推力（N）。摆杆转动与小车平动联立积分，小车会真实移动；目标角非零时没有静止平衡点，小车会持续加速，这与“持续推力”一致。'
    };
    const inputNote = INPUT_NOTE[plant.id] || 'u 是施加到被控对象上的控制输入。';

    const rows = plant.params.map((p) =>
      '<tr><td class="model-sym">' + esc(p.key) + '</td>' +
      '<td>' + NS.math.mdInline(p.label.replace(/\s+[A-Za-z]$/, '')) + '</td>' +
      '<td class="model-val">' + fmt(pv[p.key]) + '</td>' +
      '<td class="model-unit">' + esc(p.unit || '—') + '</td>' +
      '<td class="model-range">' + esc(String(p.min)) + ' ~ ' + esc(String(p.max)) + '</td></tr>').join('');

    /* 倒立摆进阶：小车平动方程与位置闭环（串级）说明，仅该对象显示 */
    let advancedBlock = '';
    if (plant.id === 'pendulum') {
      const loopOn = st.cartLoop === 'on';
      advancedBlock =
        '<section class="model-block">' +
          '<h3><span>05</span> 进阶 · 小车平动与位置闭环（串级）</h3>' +
          '<p>摆杆转动与小车平动<strong>联立积分</strong>——小车会真实移动，其平动方程为：</p>' +
          '<div class="model-eff-eq">' + NS.math.render('\\ddot{x}_c=\\frac{F-ml\\ddot{\\theta}}{M+m}', { display: 'block' }) + '</div>' +
          '<p>其中 <code>x_c</code>、<code>v_c</code> 是小车的位置与速度，观测器里的「小车位置」「小车速度」两张图画的正是它们。' +
          '要注意：目标角非零时系统<strong>不存在静止平衡点</strong>——维持倾角需要持续的小车加速度，小车会持续加速，这是物理正确的行为。</p>' +
          '<p><strong>小车位置闭环（外环串级）</strong>' +
          (loopOn
            ? '当前为 <strong>开启</strong>。'
            : '当前为关闭，可在右侧「实验参数 → 小车位置闭环」中开启。') +
          '开启后，外环把小车位置误差映射为期望倾角：</p>' +
          '<div class="model-eff-eq">' + NS.math.render('\\theta_{ref}=sat\\left(K_x(x_{ref}-x_c)-K_v\\dot{x}_c,\\ \\pm\\theta_{max}\\right)', { display: 'block' }) + '</div>' +
          '<p>内环控制器（PID / SMC / LQR 等任选）跟踪该期望倾角，借助“小车先向目标方向倾斜、再回正”的方式把小车稳稳停在 <code>x_ref</code>。当前取值：' +
          'x_ref = ' + fmt(st.cartTarget) + ' m · K_x = ' + fmt(st.cartKp) + ' rad/m · K_v = ' + fmt(st.cartKd) + ' rad·s/m · θ_max = ' + fmt(st.cartThetaMax) + ' rad。</p>' +
          '<p>推荐内环：SMC / LQR / TSMC / FTSMC / PID（默认参数下均可稳定停在 x_ref）。</p>' +
        '</section>';
    }

    host.innerHTML =
      '<div class="eq-surface eq-surface-lg">' +
        '<div class="eq-surface-head">' +
          '<span class="eq-kicker">GOVERNING EQUATION</span>' +
          '<span class="eq-no">动力学方程</span>' +
        '</div>' +
        '<div class="eq-surface-main">' + NS.math.render(plant.tex, { display: 'block' }) + '</div>' +
        '<div class="eq-surface-foot">' + esc(plant.name) + ' · ' + esc(plant.category) +
          ' · ' + esc(String(plant.order)) + ' 阶</div>' +
      '</div>' +

      '<section class="model-block">' +
        '<h3><span>01</span> 物理含义</h3>' +
        '<div class="model-desc">' + NS.math.md(plant.desc) + '</div>' +
      '</section>' +

      '<section class="model-block">' +
        '<h3><span>02</span> 符号、参数与当前取值</h3>' +
        '<div class="model-table-wrap"><table class="model-table"><thead><tr>' +
          '<th>符号</th><th>物理含义</th><th>当前值</th><th>单位</th><th>可调范围</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="model-note">在右侧「实验参数」中修改后，回到本页即可看到最新取值。</p>' +
      '</section>' +

      '<section class="model-block">' +
        '<h3><span>03</span> 等效二阶形式（99 条控制律的接入点）</h3>' +
        '<div class="model-eff">' +
          '<div class="model-eff-eq">' + NS.math.render('m\\ddot{x}+c\\dot{x}+kx=u') + '</div>' +
          '<div class="model-eff-grid">' +
            '<div><span>m</span><strong>' + fmt(eff.m) + '</strong></div>' +
            '<div><span>c</span><strong>' + fmt(eff.c) + '</strong></div>' +
            '<div><span>k</span><strong>' + fmt(eff.k) + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<p>' + (eff.k < 0
          ? 'k 为负，说明开环有右半平面极点，必须靠反馈把极点拉回左半平面。'
          : (eff.k === 0 ? 'k = 0，对象没有自我回复能力，必须靠 D 项提供阻尼。'
            : 'k 为正，对象自身稳定，反馈主要用于加速与整形。')) +
        ' 控制律通过 effective(p) 取得这组等效参数，因此同一套算法可直接切换对象。</p>' +
      '</section>' +

      '<section class="model-block">' +
        '<h3><span>04</span> 控制输入 u 施加在哪</h3>' +
        '<p>' + esc(inputNote) + '</p>' +
      '</section>' + advancedBlock;
  }

  /* ── 控制器浏览器 ─────────────────────────────────── */
  function renderBrowser() {
    const host = $('browser-list');
    if (!host) return;
    const q = query.trim().toLowerCase();
    const favSet = new Set(favorites);
    let html = '';
    let total = 0;

    if (scope === 'recent') {
      const keys = recent.filter((k) => D.CONTROLLER_CONFIGS[k]);
      keys.forEach((key) => { html += methodButton(key, favSet.has(key)); total++; });
      if (!total) html = '<p class="method-empty">还没有最近使用的控制器</p>';
    } else {
      D.sortedCategories.forEach((cat, catIndex) => {
        let items = D.groupedMethods[cat] || [];
        if (scope === 'favorites' || starFilter) items = items.filter((m) => favSet.has(m.key));
        if (q) {
          items = items.filter((m) => (
            m.name.toLowerCase().indexOf(q) >= 0 ||
            m.key.toLowerCase().indexOf(q) >= 0 ||
            cat.toLowerCase().indexOf(q) >= 0 ||
            (m.desc || '').toLowerCase().indexOf(q) >= 0 ||
            (m.eq || '').toLowerCase().indexOf(q) >= 0
          ));
        }
        if (!items.length) return;
        total += items.length;
        const openByDefault = !!q || (scope !== 'all') || starFilter || items.some((m) => m.key === activeMethod);
        html += '<details class="method-group"' + (openByDefault ? ' open' : '') + '>' +
          '<summary><span class="chapter-no">' + (CN_NUM[catIndex] || String(catIndex + 1)) + '</span>' +
          '<span class="chapter-name">' + esc(cat.replace(/^\d+\.\s*/, '')) + '</span>' +
          '<span class="group-count">' + items.length + '</span>' +
          '<svg class="icon chapter-arrow" aria-hidden="true"><use href="#i-chevron"/></svg></summary>' +
          items.map((m) => methodButton(m.key, favSet.has(m.key))).join('') + '</details>';
      });
      if (!total) html = '<p class="method-empty">没有匹配的控制器，试试其他关键词</p>';
    }
    host.innerHTML = html;
  }

  function methodButton(key, isFav) {
    const conf = D.CONTROLLER_CONFIGS[key];
    return '<button type="button" class="method-item' + (key === activeMethod ? ' is-active' : '') +
      '" data-method="' + esc(key) + '" role="option" aria-selected="' + (key === activeMethod) +
      '" title="' + esc(conf.name) + '">' +
      '<span class="item-dot"></span><span class="item-name">' + esc(conf.name) + '</span>' +
      '<span class="star' + (isFav ? ' is-on' : '') + '" data-star="' + esc(key) + '" title="' +
      (isFav ? '取消收藏' : '收藏') + ' ' + esc(conf.name) + '">' + icon('star') + '</span></button>';
  }

  function setActiveMethod(key) {
    activeMethod = key;
    const host = $('browser-list');
    if (host) {
      const prev = host.querySelector('.method-item.is-active');
      if (prev) { prev.classList.remove('is-active'); prev.setAttribute('aria-selected', 'false'); }
      const safeKey = (global.CSS && global.CSS.escape) ? global.CSS.escape(key) : String(key).replace(/["\\]/g, '\\$&');
      const next = host.querySelector('.method-item[data-method="' + safeKey + '"]');
      if (next) {
        next.classList.add('is-active');
        next.setAttribute('aria-selected', 'true');
        const group = next.closest('details');
        if (group && !group.open) group.open = true;
        if (!query) next.scrollIntoView({ block: 'nearest' });
      }
    }
    const label = $('current-method-name');
    if (label) label.textContent = shortName(key);
    renderProfile(key);
    renderParams();
    renderLegend();
  }

  /* ── 控制器档案（公式使用标准 TeX） ───────────────── */
  /* 三对象适用性徽章：来自开发期 99×3 审计（tools/build-fit.js） */
  function fitBlock(key) {
    const fit = NS.fitData && NS.fitData.verdicts && NS.fitData.verdicts[key];
    if (!fit) return '';
    const names = NS.fitData.plantNames || { msd: '质量-弹簧-阻尼', freeMass: '二阶积分器', pendulum: '倒立摆' };
    const short = { msd: '弹簧', freeMass: '积分器', pendulum: '倒立摆' };
    const label = { good: '适用', fair: '一般', poor: '需调参', unfit: '不推荐' };
    const current = sim.getSettings().plantId;
    const chips = ['freeMass', 'msd', 'pendulum'].map((pid) => {
      const v = fit[pid] || 'fair';
      const note = (NS.fitData.notes && NS.fitData.notes[pid + '|' + key]) || '';
      const tip = names[pid] + '：' + (label[v] || v) + (note ? ' · ' + note : '');
      return '<button type="button" class="fit-chip is-' + v + (pid === current ? ' is-current' : '') +
        '" data-fit-plant="' + pid + '" title="' + esc(tip) + '">' +
        esc(short[pid] || names[pid]) + '<b>' + (label[v] || v) + '</b></button>';
    }).join('');
    const warn = fit[current] === 'unfit'
      ? '<p class="fit-warn">该对象下默认参数不收敛：建议按徽章切换到推荐对象，或先降低增益并增加阻尼。</p>'
      : '';
    return '<div class="fit-row"><span class="fit-label">适用对象</span>' + chips + '</div>' + warn;
  }

  function renderProfile(key) {
    const host = $('controller-profile');
    const conf = D.CONTROLLER_CONFIGS[key];
    if (!host || !conf) return;
    const isFav = favorites.indexOf(key) >= 0;
    const approx = D.isApproximation(conf);
    const tex = NS.math.cachedFormula(conf.eq).tex;
    const catMatch = String(conf.category).match(/^(\d+)\.\s*(.*)$/);
    const catNo = catMatch ? catMatch[1] : '';
    const catName = catMatch ? catMatch[2] : String(conf.category);
    host.innerHTML = '<div class="profile">' +
      '<div class="profile-head">' +
        '<span class="profile-cat">' +
          (catNo ? '<b class="cat-no">' + esc(catNo) + '</b>' : '') +
          '<span class="cat-name">' + esc(catName) + '</span>' +
        '</span>' +
        '<h3 class="profile-name">' + esc(conf.name) + '</h3>' +
      '</div>' +
      '<div class="profile-actions">' +
        '<button type="button" class="chip-btn" id="btn-profile-docs" title="打开本方法的初学者教学文档">' +
        icon('formula') + '教学文档</button>' +
        '<button type="button" class="chip-btn" id="btn-profile-star" aria-pressed="' + isFav + '" title="收藏/取消收藏">' +
        icon('star') + (isFav ? '已收藏' : '收藏') + '</button>' +
      '</div>' +
      fitBlock(key) +
      (approx ? '<p class="profile-note">' + icon('info') + '<span>' + esc(D.APPROXIMATION_NOTE) + '</span></p>' : '') +
      '<figure class="profile-eq eq-card">' +
        '<figcaption class="eq-card-head">' +
          '<span class="eq-tag">控制律</span>' +
          '<span class="eq-card-no">CONTROL LAW</span>' +
        '</figcaption>' +
        '<div class="math-wrap eq-card-main">' + formulaBlock(tex) + '</div>' +
      '</figure>' +
      (conf.detail ? '<details class="profile-block"><summary>' +
        '<span class="fold-box">' + icon('chevron') + '</span>' +
        '<span>参数意义与底层机理</span></summary>' + NS.math.md(conf.detail) + '</details>' : '') +
      (conf.tuning ? '<details class="profile-block"><summary>' +
        '<span class="fold-box">' + icon('chevron') + '</span>' +
        '<span class="tuning-tag">调参指引</span></summary>' +
        '<div class="profile-tuning"><span class="tuning-text">' + NS.math.md(conf.tuning) + '</span></div></details>' : '') +
      '</div>';

    /* 控制律宽度自适应：宁可缩小字号，也不把公式折成两行。
       量之前先清掉上一次的内联字号，回到 CSS 基准，否则会拿「已缩小的宽度」
       再算一次，收敛到偏大的固定点；布局稳定后再补算一次。 */
    const fitProfileFormula = () => {
      const wrap = host.querySelector('.profile-eq .math-wrap');
      const mathEl = wrap ? wrap.querySelector('.math') : null;
      if (!wrap || !mathEl) return;
      mathEl.style.fontSize = '';
      const base = parseFloat(global.getComputedStyle(mathEl).fontSize) || 22;
      mathEl.style.fontSize = base + 'px';
      const avail = wrap.clientWidth - 4;
      const need = mathEl.scrollWidth;
      if (need > avail && need > 0) {
        mathEl.style.fontSize = Math.max(14, Math.round(base * avail / need * 10) / 10) + 'px';
      }
    };
    fitProfileFormula();
    global.requestAnimationFrame(fitProfileFormula);
  }

  /* ── 参数抽屉 ─────────────────────────────────────── */
  function paramRow(item, store, value) {
    const step = item.step;
    const d = decimals(step);
    const scale = item.displayScale || 1;
    const shown = (Number(value) * scale).toFixed(item.decimals !== undefined ? item.decimals : d);
    const plant = sim.getPlant();
    let unit = item.displayUnit || paramUnit(item.key, item.unit || '');
    if (item.key === 'target' || item.key === 'initialX') unit = plant.unit;
    if (item.type === 'select') {
      const opts = item.options.map((o) => '<option value="' + esc(o.value) + '"' +
        (String(value) === String(o.value) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('');
      return '<div class="param-row"><div class="param-row-head"><label for="p-' + esc(item.key) + '">' +
        NS.math.mdInline(item.label) + '</label></div><select class="select-input" id="p-' + esc(item.key) +
        '" data-key="' + esc(item.key) + '" data-store="' + esc(store) + '" data-needreset="1">' + opts + '</select></div>';
    }
    return '<div class="param-row"><div class="param-row-head">' +
      '<label for="p-' + esc(item.key) + '">' + NS.math.mdInline(item.label) + '</label>' +
      '<span class="param-value-wrap"><input class="num-input" type="number" inputmode="decimal" id="n-' + esc(item.key) +
      '" data-key="' + esc(item.key) + '" data-store="' + esc(store) + '" data-scale="' + scale +
      '" data-decimals="' + (item.decimals !== undefined ? item.decimals : d) +
      '" min="' + (item.min * scale) + '" max="' + (item.max * scale) + '" step="' + (step * scale) +
      '" value="' + shown + '" aria-label="' + esc(item.label) + ' 数值"><span class="param-unit">' + esc(unit) + '</span></span></div>' +
      '<input type="range" id="p-' + esc(item.key) + '" data-key="' + esc(item.key) + '" data-store="' + esc(store) +
      '" data-scale="' + scale + '" min="' + item.min + '" max="' + item.max + '" step="' + step +
      '" value="' + Number(value) + '" aria-label="' + esc(item.label) + '">' +
      '</div>';
  }

  function renderParams() {
    const host = $('param-groups');
    if (!host) return;
    const settings = sim.getSettings();
    const conf = D.CONTROLLER_CONFIGS[settings.method];
    const plant = sim.getPlant();
    const plantParams = sim.getPlantParams();
    let html = '';
    D.PARAM_SECTIONS.forEach((section, idx) => {
      /* 小车位置外环只对倒立摆有意义 */
      if (section.id === 'cart' && plant.id !== 'pendulum') return;
      let items;
      let title = section.title;
      if (section.id === 'gains') {
        items = Object.keys(conf.params).map((key) => {
          const [defVal, min, max, step] = conf.params[key];
          return { key, label: paramLabel(key), unit: paramUnit(key, ''), min, max, step, store: 'ctrl' };
        });
        /* 滑模族：追加消抖模式（下拉）与平滑因子 */
        const smeta = (D.SLIDING_META && D.SLIDING_META[settings.method]) || null;
        if (smeta) {
          Object.keys(smeta).forEach((key) => {
            const m = smeta[key];
            items.push({
              key, label: m.label, unit: m.unit || '', min: m.min, max: m.max,
              step: m.step, type: m.type, options: m.options, store: 'ctrl'
            });
          });
        }
      } else if (section.id === 'plant') {
        title = '被控对象属性 · ' + plant.name;
        items = plant.params.map((p) => ({ ...p, store: 'plant' }));
      } else {
        const view = (NS.charts && NS.charts.getPlantView) ? NS.charts.getPlantView(plant.id) : null;
        items = section.items.map((item) => {
          const next = { ...item, store: item.store || section.source };
          /* 目标基准与初始偏置跟随对象量纲：倒立摆是 rad（±0.7），平移对象是 m */
          if (view && (next.key === 'target' || next.key === 'initialX')) {
            next.min = view.min;
            next.max = view.max;
            next.step = plant.id === 'pendulum' ? 0.05 : 0.5;
            next.decimals = plant.id === 'pendulum' ? 2 : 1;
          }
          return next;
        });
      }
      const rows = items.map((item) => {
        let value;
        if (item.store === 'ctrl') value = settings.ctrlParams[item.key];
        else if (item.store === 'phys') value = settings.physParams[item.key];
        else if (item.store === 'plant') value = plantParams[item.key];
        else value = settings[item.key];
        if (value === undefined) value = 0;
        return paramRow(item, item.store, value);
      }).join('');
      const hint = section.id === 'plant' ? plant.desc : section.hint;
      html += '<details class="param-group"' + (idx < 2 ? ' open' : '') + '>' +
        '<summary>' +
        '<span class="fold-box">' + icon('chevron') + '</span>' +
        '<span class="param-group-title">' + esc(title) + '</span>' +
        '<span class="group-count">' + items.length + '</span></summary>' +
        '<div class="param-body">' + (hint ? '<div class="track-hint">' + NS.math.md(hint) + '</div>' : '') +
        rows + '</div></details>';
    });
    host.innerHTML = html;
  }

  function syncParamControl(key, rawValue) {
    const range = doc.getElementById('p-' + key);
    const num = doc.getElementById('n-' + key);
    if (range) range.value = rawValue;
    if (num) {
      const scale = parseFloat(num.dataset.scale || '1');
      const d = parseInt(num.dataset.decimals || '', 10);
      const step = range ? range.step : '1';
      num.value = (Number(rawValue) * scale).toFixed(Number.isFinite(d) ? d : decimals(step));
    }
  }

  /* ── 指标卡、状态栏、图例与轨迹 ───────────────────── */
  function updateMetrics(m) {
    const clean = (v, digits) => {
      const threshold = 0.5 * Math.pow(10, -digits);
      return (Math.abs(v) < threshold ? 0 : v).toFixed(digits);
    };
    const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
    set('m-x', clean(m.x, 3));
    set('m-v', clean(m.v, 3));
    set('m-e', clean(m.e, 3));
    set('m-u', clean(m.u, 2));
    set('m-rmse', clean(m.rmse, 3));
    set('m-energy', clean(m.energy || 0, 1));
    set('m-energy-dyn', clean(m.energyDyn || 0, 1));
    set('m-hold', clean(m.holdForce || 0, 2));
    const pos = $('chart-metric-pos');
    if (pos) pos.textContent = 'RMSE ' + clean(m.rmse, 3) + (m.frozen ? ' · 定格' : '');
    const ctrl = $('chart-metric-ctrl');
    if (ctrl) ctrl.textContent = 'E ' + clean(m.energy || 0, 1) + ' J / E₍dyn₎ ' + clean(m.energyDyn || 0, 1) + ' J';
  }

  function updateStatus(info) {
    const running = info.running;
    const btn = $('btn-run');
    if (btn) {
      const use = btn.querySelector('use');
      const text = btn.querySelector('span');
      if (use) use.setAttribute('href', running ? '#i-pause' : '#i-play');
      if (text) text.textContent = running ? '暂停' : '启动';
      btn.setAttribute('aria-label', running ? '暂停仿真' : '启动仿真');
    }
    const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
    set('status-run', running ? '运行中' : '已暂停');
    set('status-time', Number(info.t || 0).toFixed(2));
    set('sim-state-text', running ? '实时仿真' : '已暂停');
    const dot = $('status-dot');
    if (dot) dot.className = 'dot ' + (running ? 'is-running' : 'is-paused');
    const rdot = $('run-dot');
    if (rdot) rdot.className = 'dot ' + (running ? 'is-running' : 'is-paused');
    const freeze = $('status-freeze');
    if (freeze) freeze.hidden = !info.frozen;
    const track = $('status-track');
    if (track) {
      const a = sim.getActiveTrack();
      track.textContent = '轨迹 ' + (a ? a.label : 'A') + ' · ' +
        (info.compare ? 'A/B 对比开启' : (info.frozen ? '波形与指标已定格' : '录制中'));
    }
    const compare = $('btn-compare');
    if (compare) compare.setAttribute('aria-pressed', String(!!info.compare));
    doc.querySelectorAll('.speed-btn').forEach((b) => {
      b.classList.toggle('is-active', Number(b.dataset.speed) === Number(info.speed));
    });
  }

  function renderLegend() {
    const host = $('legend');
    if (!host) return;
    const method = sim.getSettings().method;
    const plant = sim.getPlant();
    const items = [
      { label: (D.PLANT_VIEWS[plant.id] || D.PLANT_VIEWS.msd).stateName + ' ' + (D.PLANT_VIEWS[plant.id] || D.PLANT_VIEWS.msd).symbol + ' (' + plant.unit + ')', color: 'var(--curve-x)' },
      { label: '目标指令 r (' + plant.unit + ')', color: 'var(--curve-r)' }
    ];
    if (REF_FLOW_METHODS.indexOf(method) >= 0) items.push({ label: '辅助参考流形', color: 'var(--curve-ref)', dash: true });
    const inSym = plant.inputSymbol || 'u', inUnit = plant.inputUnit || 'N';
    items.push({ label: '控制力 ' + inSym + ' (' + inUnit + ')', color: 'var(--curve-u)' });
    items.push({ label: '稳态保持力 ' + inSym + 'ₕ (' + inUnit + ')', color: 'var(--accent-strong)', dash: true });
    items.push({ label: '相轨迹 v vs x', color: 'var(--curve-phase)', dot: true });
    const tracks = sim.getTracks();
    if (tracks.length > 1) {
      tracks.forEach((t) => items.push({ label: '轨迹 ' + t.label + ' · ' + shortName(t.method), color: t.color, dot: true }));
    }
    host.innerHTML = items.map((i) => '<span class="legend-item"><span class="legend-swatch ' +
      (i.dash ? 'dash' : (i.dot ? 'dot' : '')) + '" style="color:' + esc(i.color) + '"></span>' +
      esc(i.label) + '</span>').join('');
  }

  function renderTracks() {
    const host = $('track-strip');
    if (!host) return;
    const tracks = sim.getTracks();
    const active = sim.getActiveTrack();
    if (!tracks.length) { host.innerHTML = '<span class="track-hint">尚无实验轨迹</span>'; return; }
    host.innerHTML = tracks.map((t) => '<span class="track-chip' + (t === active ? ' is-active' : '') +
      '" title="' + esc(t.method) + '"><span class="swatch" style="background:' + esc(t.color) + '"></span>' +
      esc(t.label) + ' · ' + esc(shortName(t.method)) + ' · ' + t.points.length + ' 点</span>').join('') +
      '<span class="track-hint">' + (sim.isCompareMode() ? '切换控制器时会新建叠加轨迹' : '开启 A/B 对比可叠加多条轨迹') + '</span>';
  }

  /* ── 浮层内容 ─────────────────────────────────────── */
  function renderGlossary() {
    const host = $('glossary-body');
    if (!host) return;
    host.innerHTML = D.DICTIONARY_DATA.map((cat) =>
      '<section class="glossary-cat"><h3>' + esc(cat.category) + '</h3>' +
      cat.items.map((it) => '<div class="glossary-item"><div class="glossary-sym">' + NS.math.renderMixed(it.sym) +
        '</div><div><div class="glossary-name">' + NS.math.renderMixed(it.name) + '</div><p class="glossary-desc">' +
        NS.math.renderMixed(it.desc) + '</p></div></div>').join('') + '</section>').join('');
  }

  function renderPresets() {
    const host = $('presets-body');
    if (!host) return;
    host.innerHTML = '<div class="preset-grid">' + D.PRESETS.map((p) => {
      const plantName = p.plant && D.PLANTS[p.plant] ? D.PLANTS[p.plant].name : '二阶积分器';
      return '<button type="button" class="preset-card" data-preset="' + esc(p.id) + '">' +
        '<span class="preset-tag">' + esc(p.tag) + '</span><strong>' + esc(p.title) + '</strong>' +
        '<p>' + esc(p.desc) + '</p><span class="preset-meta">' + esc(D.CONTROLLER_CONFIGS[p.method].name) +
        ' · ' + esc(plantName) + '</span></button>';
    }).join('') + '</div>';
  }

  function renderHelp() {
    const host = $('help-body');
    if (!host) return;
    const rows = [
      ['空格', '启动 / 暂停仿真'], ['→', '单步推进（暂停时可用）'],
      ['R', '重置仿真'], ['D', '施加脉冲扰动'],         ['1 / 2 / 4', '切换仿真倍速'],
      ['H', '打开当前方法教学文档'], ['M', '打开被控对象模型与符号参数'],
      ['F', '专注模式（挂起 / 展开两侧栏）'], ['S', '复制实验参数链接'], ['E', '导出 CSV 数据'],
      ['G', '打开符号术语词典'], ['P', '打开场景预设'], ['?', '打开本帮助'], ['Esc', '关闭浮层']
    ];
    host.innerHTML =
      '<section class="help-section"><h3>如何使用</h3><ul>' +
      '<li>左侧按 11 类体系浏览 ' + D.methodList.length + ' 种控制算法，支持关键词搜索、收藏与最近使用。</li>' +
      '<li>在刚体动画卡片上选择 3 个经典被控对象之一（质量-弹簧-阻尼、二阶积分器、小车-倒立摆），右侧参数自动切换。</li>' +
      '<li>主舞台的公式条只显示当前对象的动力学方程；点「符号与参数」或按 M，在弹窗里看物理含义、全部符号的当前取值、等效二阶参数与控制输入 u 的施加位置。</li>' +
      '<li>右侧分组调节控制律增益、目标轨迹、硬件非理想条件与对象参数；控制律公式卡会同步显示本方法的 TeX 方程。</li>' +
      '<li>中间三张曲线带完整自适应坐标轴（nice 刻度、轴标题与单位），鼠标悬停可读精确数值。</li>' +
      '<li>开启「A/B 对比」后切换控制器，可把多次实验曲线叠加在同一坐标系中比较。</li></ul></section>' +
      '<section class="help-section"><h3>为什么到达目标后能耗还在增加？</h3><p>' +
      '<strong>累计能耗 ∫u²dt</strong> 统计控制器输出的总能量。在弹簧负载或倒立摆等对象上，稳态时仍需持续的<strong>保持力 uₕ</strong>（例如弹簧对象 uₕ = k·r）来抵消回复力，u² 不为零，因此累计能量会线性增长——这是物理上正确的，但把「维持代价」与「调节代价」混在了一起。' +
      '为此平台同时给出 <strong>动态能耗 ∫(u−uₕ)²dt</strong>，它扣除保持力，收敛后趋于平稳，更适合比较控制器的动态品质；控制力图中的橙色虚线就是 uₕ。' +
      '此外波形定格（主状态误差与速度均低于 0.02、倒立摆还要求小车基本静止、稳定 2 秒，或累计 2500 点）后 RMSE 与两种能耗同步冻结，不再累加；需要继续观察请点状态栏「重新录制」。</p></section>' +
      '<section class="help-section"><h3>公式格式</h3><p>所有控制律与被控对象方程以标准 TeX 语法存储，由内置轻量渲染器排版（分数、根号、上下标、重音、大运算符），无需联网、无需 KaTeX/MathJax。重音符号由 CSS 绘制，点与字母紧贴；界面不提供公式复制按钮，需要源码可从导出菜单获取公式手册 Markdown。</p></section>' +
      '<section class="help-section"><h3>快捷键</h3><table class="keys-table"><thead><tr><th>按键</th><th>功能</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><td><kbd>' + esc(r[0]) + '</kbd></td><td>' + esc(r[1]) + '</td></tr>').join('') +
      '</tbody></table></section>' +
      '<section class="help-section"><h3>离线与数据说明</h3><p>本版本为纯 HTML/CSS/JS 三件套，零外部依赖、零网络请求，双击 index.html 即可运行。' +
      '收藏、最近使用与主题偏好保存在浏览器 localStorage；导出通过 Blob 在本地完成，不会上传任何实验数据。' +
      esc(D.APPROXIMATION_NOTE) + '</p></section>';
  }

  function openOverlay(id) {
    const el = $(id);
    if (!el) return;
    lastFocus = doc.activeElement;
    el.hidden = false;
    const focusable = el.querySelector('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  }
  function closeOverlay(id) {
    const el = $(id);
    if (!el || el.hidden) return;
    el.hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }
  function closeAllOverlays() {
    ['overlay-glossary', 'overlay-presets', 'overlay-help', 'overlay-guide', 'overlay-plant'].forEach(closeOverlay);
    closeExportMenu();
  }
  function openOverlayById(id) { closeAllOverlays(); openOverlay(id); }

  function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    if (toastTimer) global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(() => { el.hidden = true; }, 2400);
  }

  function setTheme(name) {
    doc.documentElement.setAttribute('data-theme', name);
    const btn = $('btn-theme');
    if (btn) {
      const use = btn.querySelector('use');
      if (use) use.setAttribute('href', name === 'dark' ? '#i-sun' : '#i-moon');
      btn.setAttribute('aria-label', name === 'dark' ? '切换到浅色主题' : '切换到深色主题');
    }
    if (NS.charts && NS.charts.refreshTheme) NS.charts.refreshTheme();
  }

  /* ── 导出菜单 ─────────────────────────────────────── */
  function closeExportMenu() { if (exportMenu) { exportMenu.remove(); exportMenu = null; } }
  function toggleExportMenu() {
    if (exportMenu) { closeExportMenu(); return; }
    const anchor = $('btn-export');
    if (!anchor) return;
    const menu = doc.createElement('div');
    menu.className = 'export-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = '<button type="button" role="menuitem" data-export="csv">' + icon('download') + ' 导出实验数据 CSV</button>' +
      '<button type="button" role="menuitem" data-export="png">' + icon('chart') + ' 导出图表 PNG</button>' +
      '<button type="button" role="menuitem" data-export="md">' + icon('book') + ' 导出公式手册 Markdown</button>';
    doc.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.top = (rect.bottom + 8) + 'px';
    menu.style.left = Math.max(8, rect.right - 190) + 'px';
    exportMenu = menu;
    menu.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-export]');
      if (!btn) return;
      closeExportMenu();
      if (btn.dataset.export === 'csv') cb.exportCSV && cb.exportCSV();
      else if (btn.dataset.export === 'png') cb.exportPNG && cb.exportPNG();
      else if (cb.exportFormulaBook) cb.exportFormulaBook();
    });
  }

  /* ── 事件绑定（全部转发到编排层） ─────────────────── */
  function bind() {
    const on = (id, event, fn) => { const el = $(id); if (el) el.addEventListener(event, fn); };

    on('btn-run', 'click', () => cb.toggleRun && cb.toggleRun());
    on('btn-step', 'click', () => cb.step && cb.step());
    on('btn-disturb', 'click', () => cb.disturb && cb.disturb());
    on('btn-reset', 'click', () => cb.reset && cb.reset());
    on('btn-reset-params', 'click', () => cb.resetParams && cb.resetParams());
    on('btn-rerecord', 'click', () => cb.rerecord && cb.rerecord());
    on('btn-compare', 'click', () => cb.toggleCompare && cb.toggleCompare());
    on('btn-share', 'click', () => cb.share && cb.share());
    on('btn-export', 'click', toggleExportMenu);
    on('btn-theme', 'click', () => cb.toggleTheme && cb.toggleTheme());
    on('btn-help', 'click', () => openOverlayById('overlay-help'));
    on('btn-glossary', 'click', () => openOverlayById('overlay-glossary'));
    on('btn-presets', 'click', () => openOverlayById('overlay-presets'));
    on('btn-plant-model', 'click', () => { renderPlantModel(); openOverlayById('overlay-plant'); });
    on('plant-select', 'change', (ev) => cb.selectPlant && cb.selectPlant(ev.target.value));
    on('btn-guide-start', 'click', () => {
      const noMore = $('guide-no-more');
      cb.dismissGuide && cb.dismissGuide(noMore ? noMore.checked : false);
      closeOverlay('overlay-guide');
    });

    doc.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', () => closeOverlay(el.dataset.close));
    });
    doc.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeAllOverlays(); });
    doc.addEventListener('click', (ev) => {
      if (exportMenu && !ev.target.closest('.export-menu') && !ev.target.closest('#btn-export')) closeExportMenu();
    });


    doc.querySelectorAll('.browser-tabs .tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        scope = tab.dataset.scope;
        doc.querySelectorAll('.browser-tabs .tab').forEach((t) => {
          const active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', String(active));
        });
        renderBrowser();
      });
    });
    on('btn-star-filter', 'click', () => {
      starFilter = !starFilter;
      const btn = $('btn-star-filter');
      if (btn) btn.setAttribute('aria-pressed', String(starFilter));
      scope = starFilter ? 'favorites' : 'all';
      doc.querySelectorAll('.browser-tabs .tab').forEach((t) => {
        const active = t.dataset.scope === scope;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      renderBrowser();
    });

    const browser = $('browser-list');
    if (browser) browser.addEventListener('click', (ev) => {
      const star = ev.target.closest('[data-star]');
      if (star) { cb.toggleFavorite && cb.toggleFavorite(star.dataset.star); return; }
      const item = ev.target.closest('[data-method]');
      if (item && cb.selectMethod) cb.selectMethod(item.dataset.method);
    });

    const groups = $('param-groups');
    if (groups) {
      groups.addEventListener('input', (ev) => {
        const el = ev.target;
        if (!el.dataset || !el.dataset.key) return;
        if (el.type === 'range') {
          const raw = parseFloat(el.value);
          syncParamControl(el.dataset.key, raw);
          cb.changeParam && cb.changeParam(el.dataset.key, raw, el.dataset.store, false);
        }
      });
      groups.addEventListener('change', (ev) => {
        const el = ev.target;
        if (!el.dataset || !el.dataset.key) return;
        if (el.tagName === 'SELECT') {
          cb.changeParam && cb.changeParam(el.dataset.key, el.value, el.dataset.store, true);
        } else if (el.type === 'number') {
          const scale = parseFloat(el.dataset.scale || '1');
          const raw = parseFloat(el.value) / scale;
          if (Number.isFinite(raw)) {
            syncParamControl(el.dataset.key, raw);
            cb.changeParam && cb.changeParam(el.dataset.key, raw, el.dataset.store, false);
          }
        }
      });
    }

    const speed = $('speed-group');
    if (speed) speed.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-speed]');
      if (btn && cb.setSpeed) cb.setSpeed(Number(btn.dataset.speed));
    });

    const presets = $('presets-body');
    if (presets) presets.addEventListener('click', (ev) => {
      const card = ev.target.closest('[data-preset]');
      if (!card) return;
      closeOverlay('overlay-presets');
      cb.applyPreset && cb.applyPreset(card.dataset.preset);
    });

    const profile = $('controller-profile');
    if (profile) profile.addEventListener('click', (ev) => {
      const fitBtn = ev.target.closest('[data-fit-plant]');
      if (fitBtn && cb.selectPlant) { cb.selectPlant(fitBtn.dataset.fitPlant); return; }
      const btn = ev.target.closest('#btn-profile-star');
      if (btn && cb.toggleFavorite) cb.toggleFavorite(activeMethod);
    });
  }

  function setFavorites(list) { favorites = list.slice(0, 99); renderBrowser(); renderProfile(activeMethod); }
  function getFavorites() { return favorites.slice(); }
  function setRecent(list) { recent = list.slice(0, 12); renderBrowser(); }
  function setScope(next) {
    scope = next;
    doc.querySelectorAll('.browser-tabs .tab').forEach((t) => {
      const active = t.dataset.scope === next;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    renderBrowser();
  }
  function init(callbacks) {
    cb = callbacks || {};
    /* 左栏规模数字取自数据层，避免与实际条数脱节 */
    const setStat = (id, n) => { const el = $(id); if (el) el.textContent = String(n); };
    setStat('stat-methods', D.methodList.length);
    setStat('stat-categories', D.sortedCategories.length);
    setStat('stat-plants', D.PLANT_LIST.length);
    /* 侧栏标题里的方法总数同样动态，避免与实际条数脱节 */
    const railLabel = $('rail-methods-label');
    if (railLabel) railLabel.textContent = '控制算法体系 · ' + D.methodList.length;
    renderGlossary();
    renderPresets();
    renderHelp();
    renderBrowser();
    renderProfile(activeMethod);
    renderPlant();
    renderParams();
    renderLegend();
    renderTracks();
    bind();
  }

  NS.ui = {
    init, setFavorites, getFavorites, setRecent, setScope,
    setActiveMethod, renderBrowser, renderProfile, renderPlant, renderPlantModel, renderParams,
    renderLegend, renderTracks, updateMetrics, updateStatus,
    openOverlay, openOverlayById, closeOverlay, closeAllOverlays,
    setTheme, toast, syncParamControl
  };
})(window);
