/* ============================================================
   ui.js — 界面层（DOM 构建与局部更新；状态写回全部交给 app.js）
   V4.0：TeX 公式渲染、被控对象选择、能耗口径说明、坐标轴指标外置。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const D = NS.data;
  const sim = NS.sim;
  const doc = global.document;
  const $ = (id) => doc.getElementById(id);

  /* 会画出辅助参考流形（alg.ref_display）的方法清单：
     与 simulation.js 中实际写 ref_display 的 case 一一对应 */
  const REF_FLOW_METHODS = [
    'MRAC', 'MRAC-MIT', 'Composite-MRAC', 'L1', 'Flatness-Trajectory-Track',
    'InputShaping', 'Posicast', 'PPC', 'Funnel-Control', 'TimeVary-BLF',
    'RampSP-PID', 'TubeMPC', 'DMC-DynamicMatrix', 'Lorenz-Coupled'
  ];

  /* 理论体系章节号：与参考站点的中文数字编号保持一致 */
  const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

  /* 速度滑块用对数刻度：前半程 0.1×→1×，后半程 1×→10×，低倍速可精细调节 */
  const SPEED_MIN = 0.1, SPEED_MAX = 10, SPEED_STEPS = 1000;
  function speedFromSlider(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 1;
    const p = Math.max(0, Math.min(1, n / SPEED_STEPS));
    return Math.round(SPEED_MIN * Math.pow(SPEED_MAX / SPEED_MIN, p) * 100) / 100;
  }
  function sliderFromSpeed(speed) {
    const s = Math.max(SPEED_MIN, Math.min(SPEED_MAX, Number(speed) || 1));
    return Math.round(Math.log(s / SPEED_MIN) / Math.log(SPEED_MAX / SPEED_MIN) * SPEED_STEPS);
  }
  function formatSpeed(speed) {
    return String(Math.round((Number(speed) || 1) * 100) / 100) + '×';
  }

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
  /* 已经求解过最优增益的方法：用于决定「求解原理 · 教学文档」入口是否露出 */
  const solvedGainMethods = Object.create(null);

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
    /* 角度对象按度显示（内部计算仍用弧度）：状态、误差、RMSE 用 °，角速度保持 rad/s */
    const view0 = (NS.charts && NS.charts.getPlantView) ? NS.charts.getPlantView(plant.id) : null;
    const angUnit = view0 && view0.deg ? '°' : plant.unit;
    setUnit('u-x', angUnit);
    setUnit('u-v', plant.vUnit);
    setUnit('u-e', angUnit);
    setUnit('u-rmse', angUnit);
    /* 输入语义随对象切换：平移对象是力 u（N），姿态通道是力矩 M（N·m） */
    const inSym = plant.inputSymbol || 'u', inUnit = plant.inputUnit || 'N';
    const isTorque = inUnit.indexOf('N·m') >= 0;
    const inName = isTorque ? '控制力矩' : '控制力';
    const holdName = isTorque ? '稳态保持力矩' : '稳态保持力';
    setUnit('l-u', inName + ' ' + inSym);
    setUnit('unit-u', inUnit);
    setUnit('l-hold', holdName + ' ' + inSym + 'ₕ');
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
       速度图放最后一位（倒立摆为小车速度 v_c，姿态通道为角速度 ω，其余为质量速度 v） */
    const cartCard = $('chart-card-cart');
    if (cartCard) cartCard.hidden = plant.id !== 'pendulum';
    const isPendulum = plant.id === 'pendulum';
    const isAttitude = !!(view && view.angular) && !isPendulum;
    const capVel = $('chart-cap-vel');
    if (capVel) {
      capVel.textContent = isPendulum ? '小车速度' : (isAttitude ? (view.rateName || '角速度') : '速度');
    }
    const velMetric = $('chart-metric-vel');
    if (velMetric) {
      const rateSym = isPendulum ? 'v_c' : ((view && view.rateSymbol) || 'v');
      velMetric.textContent = rateSym + ' / ' + plant.vUnit;
    }
    renumberCharts();
    const phaseMetric = $('chart-metric-phase');
    if (phaseMetric) phaseMetric.textContent = view.symbol + ' / ' + angUnit + ' · ' + view.rateName + ' / ' + plant.vUnit;
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
    const vw = (NS.charts && NS.charts.getPlantView) ? NS.charts.getPlantView(plant.id) : null;
    const isAngular = !!(vw && vw.angular);
    const fmt = (v) => (typeof v === 'number' && isFinite(v)
      ? (Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2)) : esc(String(v)));

    const INPUT_NOTE = {
      msd: 'u 是作用在质量块上的水平力（N），直接出现在方程右端；对象自身带回复力 kx 与阻尼 cẋ。',
      freeMass: 'u 是作用在质量块上的水平力（N），位置是它的二重积分；对象没有回复力，也没有阻尼。',
      pendulum: 'F 是作用在小车上的水平推力（N）。摆杆转动与小车平动联立积分，小车会真实移动；目标角非零时没有静止平衡点，小车会持续加速，这与“持续推力”一致。',
      aircraft: 'M 是升降舵产生的俯仰力矩（N·m），直接作用在俯仰轴上。它不改变机速，只把机头抬起或压下；真实飞机上舵偏角 δ 与力矩近似成正比 M = q·S·c·C_mδ·δ，本实验把这条线性增益折进了 M。',
      missile: 'M 是舵面产生的俯仰力矩（N·m）。弹体静不稳定，撤掉力矩就会翻，所以这里看不到"松手自稳"——控制量必须持续存在，M 的稳态值正是配平所需的那一点点力（k·θ_ref，负号表示方向相反）。',
      uav: 'M 是左右两侧旋翼转速差产生的滚转力矩（N·m）。四旋翼没有气动回中力矩，力矩撤掉的瞬间角速度只是被阻尼慢慢吃掉，滚转角会停在任意位置。'
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
          'x_ref = ' + fmt(st.cartTarget) + ' m · K_x = ' + fmt(st.cartKp) + ' rad/m · K_v = ' + fmt(st.cartKd) + ' rad·s/m · θ_max = ' + fmt(st.cartThetaMax * 180 / Math.PI, 1) + '°。</p>' +
          '<p>推荐内环：SMC / LQR / TSMC / FTSMC / PID（默认参数下均可稳定停在 x_ref）。</p>' +
        '</section>';
    }
    /* 姿态通道进阶：由 plant.teaching 数据驱动，任何对象都能自带一段专属讲解 */
    if (plant.teaching && plant.teaching.title) {
      advancedBlock +=
        '<section class="model-block">' +
          '<h3><span>05</span> ' + esc(plant.teaching.title) + '</h3>' +
          NS.math.md(plant.teaching.body) +
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
        '<h3><span>03</span> 等效二阶形式（159 条控制律的接入点）</h3>' +
        '<div class="model-eff">' +
          '<div class="model-eff-eq">' +
            NS.math.render(plant.effTex || 'm\\ddot{x}+c\\dot{x}+kx=u') + '</div>' +
          '<div class="model-eff-grid">' +
            '<div><span>' + (isAngular ? 'J' : 'm') + '</span><strong>' + fmt(eff.m) + '</strong></div>' +
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
        html += '<details class="method-group" data-cat-index="' + catIndex + '"' + (openByDefault ? ' open' : '') + '>' +
          '<summary><span class="chapter-no">' + (CN_NUM[catIndex] || String(catIndex + 1)) + '</span>' +
          '<span class="chapter-name">' + esc(cat.replace(/^\d+\.\s*/, '')) + '</span>' +
          '<span class="group-count">' + items.length + '</span>' +
          '<svg class="icon chapter-arrow" aria-hidden="true"><use href="#i-chevron"/></svg></summary>' +
          items.map((m) => methodButton(m.key, favSet.has(m.key))).join('') + '</details>';
      });
      if (!total) html = '<p class="method-empty">没有匹配的控制器，试试其他关键词</p>';
    }
    host.innerHTML = html;
    renderRailNav();
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

  /* ── 挂起态章节导航（参考「粒子先生的物理实验室」） ──────
     窄条竖排 12 章中文数字；悬停或键盘聚焦弹出该章二级目录，
     二级项可直接切换控制器，点击章节号则展开左栏并定位该章。
     分类与方法数全部取自数据层，不写死 12 或 159。 */
  let railHideTimer = 0;
  let railOpenIndex = -1;

  /* 12 类理论体系各配一个语义图标（顺序与 data.js 的 CATEGORIES 一致）。
     分类数若变化，按下标取模兜底，不写死 12。 */
  const RAIL_ICONS = [
    'sliders',  // 01 PID 与工业变体：增益调节
    'chart',    // 02 频域与补偿：Bode / 频响曲线
    'target',   // 03 状态空间与最优：最优点
    'filter',   // 04 鲁棒与 H∞：抑制不确定
    'clock',    // 05 预测与滚动优化：滚动时域
    'zap',      // 06 滑模变结构：切换 / 快速
    'layers',   // 07 自抗扰与观测：扩张状态分层
    'refresh',  // 08 非线性几何与能量：坐标变换
    'settings', // 09 自适应与辨识：参数自整定
    'spark',    // 10 数据驱动与智能：学习 / 智能
    'check',    // 11 有限时间与安全约束：保证安全
    'compare'   // 12 时滞与网络化：跨周期对比
  ];
  function railIcon(idx) {
    return RAIL_ICONS[idx % RAIL_ICONS.length] || 'layers';
  }

  function railChapterLabel(cat, idx) {
    return '第 ' + (CN_NUM[idx] || String(idx + 1)) + ' 章 ' + cat.replace(/^\d+\.\s*/, '');
  }

  function renderRailNav() {
    const nav = $('rail-nav');
    if (!nav) return;
    nav.innerHTML = D.sortedCategories.map((cat, i) => {
      const items = D.groupedMethods[cat] || [];
      const active = items.some((m) => m.key === activeMethod);
      const label = railChapterLabel(cat, i) + '，共 ' + items.length + ' 种方法';
      return '<button type="button" class="rail-chapter' + (active ? ' is-active' : '') +
        '" data-cat-index="' + i + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' +
        '<span class="rail-chapter-no">' + esc(CN_NUM[i] || String(i + 1)) + '</span>' +
        '<span class="rail-chapter-icon" aria-hidden="true">' + icon(railIcon(i)) + '</span>' +
        '</button>';
    }).join('');
  }

  function updateRailActive() {
    const nav = $('rail-nav');
    if (!nav) return;
    nav.querySelectorAll('.rail-chapter').forEach((b) => {
      const cat = D.sortedCategories[Number(b.dataset.catIndex)];
      const items = (cat && D.groupedMethods[cat]) || [];
      b.classList.toggle('is-active', items.some((m) => m.key === activeMethod));
    });
  }

  function railPopoverHtml(idx) {
    const cat = D.sortedCategories[idx];
    if (!cat) return '';
    const items = D.groupedMethods[cat] || [];
    const ic = icon(railIcon(idx));
    return '<div class="rail-pop-head">' +
        '<span class="rail-pop-no">' + esc(CN_NUM[idx] || String(idx + 1)) + '</span>' +
        '<span class="rail-pop-name">' + esc(cat.replace(/^\d+\.\s*/, '')) + '</span>' +
        '<span class="rail-pop-count">' + items.length + ' 法</span></div>' +
      '<div class="rail-pop-list">' + items.map((m, n) =>
        '<button type="button" class="rail-pop-item' + (m.key === activeMethod ? ' is-active' : '') +
        '" data-method="' + esc(m.key) + '" title="' + esc(m.name) + '">' +
        '<span class="rail-pop-idx">' + (n + 1) + '</span>' +
        '<span class="rail-pop-icon" aria-hidden="true">' + ic + '</span>' +
        '<span class="rail-pop-item-name">' + esc(m.name) + '</span></button>').join('') +
      '</div>' +
      '<div class="rail-pop-foot">点方法直接切换 · 点章节号展开目录 · Esc 关闭</div>';
  }

  function showRailPopover(idx, anchor) {
    const pop = $('rail-popover');
    if (!pop || !anchor || idx < 0) return;
    global.clearTimeout(railHideTimer);
    railOpenIndex = idx;
    pop.innerHTML = railPopoverHtml(idx);
    pop.hidden = false;
    /* 先显示再按真实尺寸定位，避免下方空间不足时溢出视口 */
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.min(r.right + 10, global.innerWidth - w - 8);
    const top = Math.min(r.top - 8, global.innerHeight - h - 8);
    pop.style.left = Math.max(8, left) + 'px';
    pop.style.top = Math.max(8, top) + 'px';
    const nav = $('rail-nav');
    if (nav) nav.querySelectorAll('.rail-chapter').forEach((b) => {
      b.classList.toggle('is-pop', Number(b.dataset.catIndex) === idx);
    });
  }

  function hideRailPopover(delay) {
    const pop = $('rail-popover');
    if (!pop) return;
    global.clearTimeout(railHideTimer);
    const close = () => {
      pop.hidden = true;
      railOpenIndex = -1;
      const nav = $('rail-nav');
      if (nav) nav.querySelectorAll('.rail-chapter.is-pop').forEach((b) => b.classList.remove('is-pop'));
    };
    if (delay) railHideTimer = global.setTimeout(close, delay);
    else close();
  }

  function jumpToChapter(idx) {
    hideRailPopover(0);
    const ws = $('workspace');
    if (ws && ws.classList.contains('is-browser-collapsed') && NS.rails && NS.rails.toggleLeft) {
      NS.rails.toggleLeft();
    }
    const list = $('browser-list');
    const group = list && list.querySelector('.method-group[data-cat-index="' + idx + '"]');
    if (group) {
      group.open = true;
      group.scrollIntoView({ block: 'nearest' });
    }
  }

  function setActiveMethod(key) {
    activeMethod = key;
    updateRailActive();
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

  /* ── 原论文卡片 ─────────────────────────────────────
     数据来自 js/papers.js（CtrlSim.papers），离线只渲染元数据与链接，
     不发起任何网络请求。核验状态由开发期 tools/port-v4-verify-citations.js 写入。 */
  const PAPER_STATUS = {
    verified: { label: '已核验', cls: 'is-verified' },
    suspect: { label: '存疑', cls: 'is-suspect' },
    unreachable: { label: '链接不可达', cls: 'is-unreachable' },
    unverified: { label: '待核验', cls: 'is-unverified' }
  };
  function paperBlock(key) {
    const P = NS.papers;
    if (!P || typeof P.getPaper !== 'function') return '';
    const p = P.getPaper(key);
    if (!p || !p.title) return '';
    const v = (P.getVerify && P.getVerify(key)) || { status: 'unverified' };
    const st = PAPER_STATUS[v.status] || PAPER_STATUS.unverified;
    const url = /^https?:\/\//i.test(p.url || '') ? p.url : '';
    const link = url
      ? '<a class="paper-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" ' +
        'title="在新标签打开原文链接（离线环境下不会自动请求）">' + icon('external') + '查看原文</a>'
      : '<span class="paper-link is-disabled">暂无可用链接</span>';
    /* 默认折叠：收起态仍可读「原论文 · SOURCE」标签与核验状态徽章；
       展开后只铺题名 / 作者 / 出处 / 原文链接，不再重复核验说明。
       .fold-box 必须是 summary 的直接子元素，以复用统一的旋转/反白样式。 */
    return '<details class="paper-card" aria-label="本方法的原论文出处">' +
      '<summary class="paper-head">' +
        '<span class="fold-box">' + icon('chevron') + '</span>' +
        '<span class="paper-tag">原论文 · SOURCE</span>' +
        '<span class="paper-status ' + st.cls + '"' + (v.reason ? ' title="' + esc(v.reason) + '"' : '') + '>' +
        esc(st.label) + '</span></summary>' +
      '<div class="paper-body">' +
        '<p class="paper-title">' + esc(p.title) + '</p>' +
        '<p class="paper-authors">' + esc(p.authors || '作者未标注') + '</p>' +
        '<p class="paper-journal">' + esc(p.journal || '出处未标注') + '</p>' +
        '<div class="paper-foot">' + link + '</div>' +
      '</div>' +
      '</details>';
  }

  /* ── 控制器档案（公式使用标准 TeX） ───────────────── */
  /* 三对象适用性徽章：来自开发期 159×3 审计（tools/build-fit.js） */
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
    /* 姿态对象无审计数据：如实说明覆盖范围，并按同构关系指引参照对象，不编造评级 */
    const attitudeNote = ['freeMass', 'msd', 'pendulum'].indexOf(current) < 0
      ? '<p class="track-hint fit-note">适用性评级仅覆盖经典三对象。姿态通道与二阶模型同构：飞机≈弹簧对象、导弹≈倒立摆、四旋翼≈积分器，可参照对应徽章并以实测为准。</p>'
      : '';
    return '<div class="fit-row"><span class="fit-label">适用对象</span>' + chips + '</div>' + warn + attitudeNote;
  }

  /* 控制律宽度自适应：宁可缩小字号，也不把公式折成两行。
     量之前先清掉上一次的内联字号，回到 CSS 基准，否则会拿「已缩小的宽度」
     再算一次，收敛到偏大的固定点。
     模块级函数：档案 details 展开时由 bind() 的 toggle 监听复用同一次测量。
     折叠态容器不参与布局（clientWidth=0），必须早退，否则字号会被钉到下限。 */
  function fitProfileFormula(host) {
    if (!host) return;
    const wrap = host.querySelector('.profile-eq .math-wrap');
    const mathEl = wrap ? wrap.querySelector('.math') : null;
    if (!wrap || !mathEl || !wrap.clientWidth) return;
    mathEl.style.fontSize = '';
    const base = parseFloat(global.getComputedStyle(mathEl).fontSize) || 22;
    mathEl.style.fontSize = base + 'px';
    const avail = wrap.clientWidth - 4;
    const need = mathEl.scrollWidth;
    if (need > avail && need > 0) {
      mathEl.style.fontSize = Math.max(14, Math.round(base * avail / need * 10) / 10) + 'px';
    }
  }

  /* ── 三栏等高：左右侧栏跟随中间舞台的实际高度 ───────────
     不用纯 CSS align-items:stretch —— grid 的 auto 行轨道会被左栏
     159 项列表的 max-content 撑开，实测舞台 932px 会被拉成 1445px。
     改为监听舞台尺寸并显式同步左右栏高度，行高仍只由舞台内容决定，
     整页滚动模型不变；侧栏内容超出时由各自 overflow-y:auto 承担。 */
  function syncColumnHeights() {
    const stage = $('stage');
    const browser = $('browser');
    const inspector = $('inspector');
    if (!stage || !browser || !inspector) return;
    /* 仅桌面三栏并排时等高；≤1024px 是堆叠布局（workspace 变 flex），
       强行同步会让三张卡片各占舞台全高，产生数千像素空白。 */
    const ws = $('workspace');
    const isGrid = !ws || getComputedStyle(ws).display === 'grid';
    if (!isGrid) {
      [browser, inspector].forEach((el) => { el.style.height = ''; el.style.maxHeight = ''; });
      return;
    }
    const h = Math.round(stage.getBoundingClientRect().height);
    if (h <= 0) return;
    [browser, inspector].forEach((el) => {
      el.style.maxHeight = 'none';
      el.style.height = h + 'px';
    });
  }

  /* 舞台标题栏：空间不足时把「场景预设 / 方程与符号 / 实验指南」
     退化为图标，保证控制条在宽屏始终一行 */
  let stageHeadRaf = 0;
  function syncStageHead() {
    if (stageHeadRaf) return;
    stageHeadRaf = global.requestAnimationFrame(() => {
      stageHeadRaf = 0;
      const head = doc.querySelector('.stage-head');
      if (!head) return;
      head.classList.remove('is-compact', 'is-tight');
      head.classList.add('is-measuring');
      const avail = head.clientWidth;
      let need = head.scrollWidth;
      if (need > avail + 1) {
        head.classList.add('is-compact');
        need = head.scrollWidth;
        if (need > avail + 1) head.classList.add('is-tight');
      }
      head.classList.remove('is-measuring');
    });
  }

  function mountColumnSync() {
    const stage = $('stage');
    if (!stage) return;
    syncColumnHeights();
    syncStageHead();
    /* 首屏字体与 KaTeX 渲染稍晚，补一帧避免拿到中间态高度 */
    global.requestAnimationFrame(() => { syncColumnHeights(); syncStageHead(); });
    if (typeof global.ResizeObserver === 'function') {
      new global.ResizeObserver(() => {
        syncColumnHeights();
        syncStageHead();
      }).observe(stage);
    }
    /* 断点切换（grid ↔ flex）时 stage 尺寸不一定变化，需显式重算 */
    global.addEventListener('resize', () => { syncColumnHeights(); syncStageHead(); });
  }

  function renderProfile(key) {
    const host = $('controller-profile');
    const conf = D.CONTROLLER_CONFIGS[key];
    if (!host || !conf) return;
    /* 不记忆折叠状态：外层 details 是静态骨架，innerHTML 重建不会重置它，
       因此每次渲染都显式回到默认折叠（不读写任何 storage）。 */
    const profileDetails = $('profile-details');
    if (profileDetails) profileDetails.open = false;
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
      paperBlock(key) +
      '</div>';

    /* 折叠态会在模块级 fitProfileFormula 里早退（宽度 0）；
       展开时由 bind() 的 toggle 监听重算，布局稳定后再补算一次。 */
    fitProfileFormula(host);
    global.requestAnimationFrame(() => fitProfileFormula(host));
  }

  /* ── 参数抽屉 ─────────────────────────────────────── */
  function paramRow(item, store, value) {
    const step = item.step;
    const d = decimals(step);
    const scale = item.displayScale || 1;
    const shown = (Number(value) * scale).toFixed(item.decimals !== undefined ? item.decimals : d);
    const plant = sim.getPlant();
    /* 单位解析优先级：显式 displayUnit → 被控对象属性（plant.params 自带单位）
       → 与环境力/力矩相关的量（随对象输入量纲走，姿态通道是 N·m 而非 N）
       → 全局 PARAM_UNITS 字典 */
    const FORCE_KEYS = { actuatorLimit: 1, actuatorDeadzone: 1, contDisturbance: 1, coulombFriction: 1 };
    let unit;
    if (item.displayUnit) unit = item.displayUnit;
    else if (store === 'plant') unit = item.unit || '';
    else if (FORCE_KEYS[item.key]) unit = plant.inputUnit || 'N';
    else unit = paramUnit(item.key, item.unit || '');
    if ((item.key === 'target' || item.key === 'initialX') && !item.displayUnit) unit = plant.unit;
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
          /* 目标基准与初始偏置跟随对象量纲：角度对象内部是 rad（±0.7，步长 0.05），
             界面上按度显示（×180/π，单位 °）；平移对象是 m（±12，步长 0.5）。
             步长/小数位由 PLANT_VIEWS 声明 */
          if (view && (next.key === 'target' || next.key === 'initialX')) {
            next.min = view.min;
            next.max = view.max;
            next.step = view.step !== undefined ? view.step : 0.5;
            next.decimals = view.decimals !== undefined ? view.decimals : 1;
            if (view.deg) {
              next.displayScale = 180 / Math.PI;
              next.displayUnit = '°';
              next.decimals = 1;
            }
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
      /* 增益组顶部：一键最优增益求解（移植自 index(14).html）
         求解成功后在同一行补一个直达原理文档的入口，未求解时不占位 */
      const solveRow = section.id === 'gains'
        ? '<div class="solve-row">' +
          '<button type="button" class="btn btn-primary solve-btn" id="btn-solve-optimal">' +
          icon('spark') + '一键最优增益求解</button>' +
          '<button type="button" class="btn btn-ghost solve-doc-btn" id="btn-solve-doc"' +
          (solvedGainMethods[settings.method] ? '' : ' hidden') + '>' +
          icon('book') + '求解原理 · 教学文档</button>' +
          '</div>'
        : '';
      html += '<details class="param-group"' + (idx < 2 ? ' open' : '') + '>' +
        '<summary>' +
        '<span class="fold-box">' + icon('chevron') + '</span>' +
        '<span class="param-group-title">' + esc(title) + '</span>' +
        '<button type="button" class="group-reset-btn" data-reset-group="' + section.id +
        '" title="仅恢复本组参数默认值，其他参数保持不变">' + icon('refresh') + '恢复本组</button></summary>' +
        '<div class="param-body">' + solveRow + rows + '</div></details>';
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
    /* 角度对象按度显示（内部仍是弧度） */
    const view = (NS.charts && NS.charts.getPlantView) ? NS.charts.getPlantView(sim.getPlant().id) : null;
    const k = view && view.deg ? 180 / Math.PI : 1;
    const dg = view && view.deg ? 2 : 3;
    set('m-x', clean(m.x * k, dg));
    set('m-v', clean(m.v, 3));
    set('m-e', clean(m.e * k, dg));
    set('m-u', clean(m.u, 2));
    set('m-rmse', clean(m.rmse * k, dg));
    set('m-energy', clean(m.energy || 0, 1));
    set('m-energy-dyn', clean(m.energyDyn || 0, 1));
    set('m-hold', clean(m.holdForce || 0, 2));
    set('m-os', clean(m.overshoot || 0, 1));
    set('m-ts', (m.settle === undefined || m.settle === null) ? '—' : Number(m.settle).toFixed(2));
    const pos = $('chart-metric-pos');
    if (pos) pos.textContent = 'RMSE ' + clean(m.rmse * k, dg) + (view && view.deg ? '°' : '') + (m.frozen ? ' · 定格' : '');
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
      track.textContent = (a ? a.label : 'A') + ' · ' +
        (info.compare ? 'A/B 对比' : (info.frozen ? '已定格' : '录制中'));
    }
    const compare = $('btn-compare');
    if (compare) compare.setAttribute('aria-pressed', String(!!info.compare));
    const speed = Number(info.speed) || 1;
    const speedSlider = $('speed-slider');
    if (speedSlider) {
      const raw = Number(speedSlider.value);
      if (!Number.isFinite(raw) || Math.abs(speedFromSlider(raw) - speed) > 0.005) {
        speedSlider.value = String(sliderFromSpeed(speed));
      }
      speedSlider.setAttribute('aria-valuetext', formatSpeed(speed));
    }
    const speedValue = $('speed-value');
    if (speedValue) speedValue.textContent = formatSpeed(speed);
  }

  function renderLegend() {
    const host = $('legend');
    if (!host) return;
    const method = sim.getSettings().method;
    const plant = sim.getPlant();
    const pv = D.PLANT_VIEWS[plant.id] || D.PLANT_VIEWS.msd;
    const angUnit = pv.deg ? '°' : plant.unit;
    const items = [
      { label: pv.stateName + ' ' + pv.symbol + ' (' + angUnit + ')', color: 'var(--curve-x)' },
      { label: '目标指令 r (' + angUnit + ')', color: 'var(--curve-r)' }
    ];
    if (REF_FLOW_METHODS.indexOf(method) >= 0) items.push({ label: '辅助参考流形', color: 'var(--curve-ref)', dash: true });
    const inSym = plant.inputSymbol || 'u', inUnit = plant.inputUnit || 'N';
    const isTorque = inUnit.indexOf('N·m') >= 0;
    const inName = isTorque ? '控制力矩' : '控制力';
    const holdName = isTorque ? '稳态保持力矩' : '稳态保持力';
    items.push({ label: inName + ' ' + inSym + ' (' + inUnit + ')', color: 'var(--curve-u)' });
    items.push({ label: holdName + ' ' + inSym + 'ₕ (' + inUnit + ')', color: 'var(--accent-strong)', dash: true });
    const vSym = pv.rateSymbol || 'v', xSym = pv.symbol || 'x';
    items.push({ label: '相轨迹 ' + vSym + ' vs ' + xSym, color: 'var(--curve-phase)', dot: true });
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
    /* A/B 叠加时每条轨迹各带自己的论文出处，悬停即可对照两法文献 */
    const paperTip = (key) => {
      const P = NS.papers;
      const p = P && P.getPaper && P.getPaper(key);
      return p && p.title ? ' · 原论文：' + p.title + (p.journal ? '（' + p.journal + '）' : '') : '';
    };
    host.innerHTML = tracks.map((t) => '<span class="track-chip' + (t === active ? ' is-active' : '') +
      '" title="' + esc(t.method + paperTip(t.method)) + '"><span class="swatch" style="background:' + esc(t.color) + '"></span>' +
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
    const duelCards = (D.DUELS || []).map((d) => {
      const na = (D.CONTROLLER_CONFIGS[d.a] || {}).name || d.a;
      const nb = (D.CONTROLLER_CONFIGS[d.b] || {}).name || d.b;
      return '<button type="button" class="preset-card duel-card" data-duel="' + esc(d.id) + '">' +
        '<span class="preset-tag">' + esc(d.tag) + '</span><strong>' + esc(d.label) + '</strong>' +
        '<p>' + esc(d.desc) + '</p><span class="preset-meta">A: ' + esc(na) + ' · B: ' + esc(nb) + '</span></button>';
    }).join('');
    host.innerHTML = '<div class="preset-grid">' + D.PRESETS.map((p) => {
      const plantName = p.plant && D.PLANTS[p.plant] ? D.PLANTS[p.plant].name : '二阶积分器';
      return '<button type="button" class="preset-card" data-preset="' + esc(p.id) + '">' +
        '<span class="preset-tag">' + esc(p.tag) + '</span><strong>' + esc(p.title) + '</strong>' +
        '<p>' + esc(p.desc) + '</p><span class="preset-meta">' + esc(D.CONTROLLER_CONFIGS[p.method].name) +
        ' · ' + esc(plantName) + '</span></button>';
    }).join('') + '</div>' +
      '<h3 class="preset-section-title">经典对决 · 一键双法同屏竞技</h3>' +
      '<p class="preset-section-note">两种流派各自跑完一段完整闭环（约 3.5 s），曲线以 A / B 双色叠加在同一坐标系里直接比较。</p>' +
      '<label class="checkline preset-opt"><input type="checkbox" id="duel-optimize">' +
      ' 对决前各自求解最优增益（更公平，每方法约 0.1–1 s）</label>' +
      '<div class="preset-grid">' + duelCards + '</div>';
  }

  function renderHelp() {
    const host = $('help-body');
    if (!host) return;
    const rows = [
      ['空格', '启动 / 暂停仿真'], ['→', '单步推进（暂停时可用）'],
      ['R', '重置仿真'], ['D', '施加脉冲扰动'],         ['1 / 2 / 4', '快捷设为 1× / 2× / 4×'],
      ['仿真速度滑块', '对数刻度 0.1×~10×；点击「仿真速度」恢复默认 1×'],
      ['O', '一键求解当前方法的最优增益'],
      ['/', '聚焦左栏方法搜索'],
      ['H', '打开当前方法教学文档'], ['M', '打开被控对象模型与符号参数'],
      ['F', '专注模式（挂起 / 展开两侧栏）'], ['S', '复制实验参数链接'], ['E', '导出 CSV 数据'],
      ['G', '打开符号术语词典'], ['P', '打开场景预设'], ['A', '打开 / 收起智能助手'],
      ['?', '打开本帮助'], ['Esc', '关闭浮层']
    ];
    host.innerHTML =
      '<section class="help-section"><h3>如何使用</h3><ul>' +
      '<li>左侧按 12 类体系浏览 ' + D.methodList.length + ' 种控制算法，支持关键词搜索、收藏与最近使用。</li>' +
      '<li>在刚体动画卡片上选择 6 个被控对象之一（二阶积分器、质量-弹簧-阻尼、小车-倒立摆、飞机俯仰、导弹俯仰、四旋翼滚转），右侧参数自动切换。</li>' +
      '<li>点「方程与符号」或按 M，在弹窗里看当前对象的动力学方程、物理含义、全部符号的当前取值、等效二阶参数与控制输入的施加位置。</li>' +
      '<li>右侧分组调节控制律增益、目标轨迹、硬件非理想条件与对象参数；控制律公式卡会同步显示本方法的 TeX 方程。</li>' +
      '<li>中间四张曲线（倒立摆为五张）带完整自适应坐标轴（nice 刻度、轴标题与单位），鼠标悬停可读精确数值；<strong>点击任意曲线卡</strong>可全屏高清放大检视。</li>' +
      '<li>右侧增益组顶部的<strong>「一键最优增益求解」</strong>（或按 O）会以「理论最优种子 + 多尺度坐标模式搜索」在当前对象与扰动条件下最小化 ITAE + ISE + 超调 + 能耗泛函，自动写回该方法的增益。</li>' +
      '<li>开启「A/B 对比」后切换控制器，可把多次实验曲线叠加在同一坐标系中比较；场景预设里的<strong>经典对决</strong>可一键让两种流派各跑一段并同屏对比。</li>' +
      '<li>移动端为精简布局：脉冲扰动、场景预设、对象模型弹窗与仿真指南为桌面端功能。</li></ul></section>' +
      '<section class="help-section"><h3>为什么到达目标后能耗还在增加？</h3><p>' +
      '<strong>累计能耗 ∫u²dt</strong> 统计控制器输出的总能量。在弹簧负载或倒立摆等对象上，稳态时仍需持续的<strong>保持力 uₕ</strong>（例如弹簧对象 uₕ = k·r）来抵消回复力，u² 不为零，因此累计能量会线性增长——这是物理上正确的，但把「维持代价」与「调节代价」混在了一起。' +
      '为此平台同时给出 <strong>动态能耗 ∫(u−uₕ)²dt</strong>，它扣除保持力，收敛后趋于平稳，更适合比较控制器的动态品质；控制力图中的橙色虚线就是 uₕ。' +
      '此外波形定格（主状态误差与速度均低于 0.02、倒立摆还要求小车基本静止、稳定 2 秒，或累计 2500 点）后 RMSE 与两种能耗同步冻结，不再累加；需要继续观察请点状态栏「重新录制」。</p></section>' +
      '<section class="help-section"><h3>公式格式</h3><p>所有控制律与被控对象方程以标准 TeX 语法存储，优先由本地随包 KaTeX 排版（零网络请求），KaTeX 不可用时自动回退到内置 MathML/HTML 轻量渲染器（分数、根号、上下标、重音、大运算符）。需要公式源码可从导出菜单获取公式手册 Markdown。</p></section>' +
      '<section class="help-section"><h3>快捷键</h3><table class="keys-table"><thead><tr><th>按键</th><th>功能</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><td><kbd>' + esc(r[0]) + '</kbd></td><td>' + esc(r[1]) + '</td></tr>').join('') +
      '</tbody></table></section>' +
      '<section class="help-section"><h3>离线与数据说明</h3><p>仿真、曲线与全部教学文档零外部依赖、零网络请求，双击 index.html 即可运行。' +
      '顶部「智能助手」可在设置里输入自己的 DeepSeek API Key（只保存在本机浏览器），并选择模型与思考长度；本机检索始终离线，联网提问时当前实验方法的文档片段、参数与长期记忆才会发送给你配置的 DeepSeek 服务，未连接时自动降级为本地文档摘录。' +
      '收藏、最近使用、主题、助手对话与记忆保存在浏览器 localStorage；导出通过 Blob 在本地完成，不会上传实验数据。' +
      esc(D.APPROXIMATION_NOTE) + '</p></section>';
  }

  /* ── 曲线全屏放大：把指定图表重绘到浮层高分辨率画布 ── */
  function zoomChart(key, captionEl) {
    const overlay = $('overlay-zoom');
    const canvas = $('canvas-zoom');
    if (!overlay || !canvas || !NS.charts || !NS.charts.drawOne) return;
    const title = $('zoom-title');
    if (title) {
      const raw = captionEl ? captionEl.textContent.replace(/\s+/g, ' ').trim() : '';
      title.textContent = raw || '波形检视';
    }
    openOverlayById('overlay-zoom');
    /* 等浮层完成布局（画布有真实宽高）后再绘制 */
    global.requestAnimationFrame(() => {
      global.requestAnimationFrame(() => NS.charts.drawOne(key, canvas));
    });
  }

  function openOverlay(id) {
    const el = $(id);
    if (!el) return;
    lastFocus = doc.activeElement;
    el.hidden = false;
    trapFocus(el);
    const focusable = el.querySelector('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  }
  function closeOverlay(id) {
    const el = $(id);
    if (!el || el.hidden) return;
    releaseFocusTrap(el);
    el.hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  /* ── 焦点陷阱：aria-modal 浮层内 Tab 循环，不逸出到背景页面 ──
     供 ui/docs/assistant 三处浮层复用；关闭时必须 release。 */
  const focusTraps = new Map();
  function trapFocus(el) {
    if (!el || focusTraps.has(el)) return;
    const handler = (ev) => {
      if (ev.key !== 'Tab') return;
      const items = Array.prototype.filter.call(
        el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        (n) => !n.disabled && n.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      const active = doc.activeElement;
      if (ev.shiftKey && (active === first || !el.contains(active))) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && (active === last || !el.contains(active))) { ev.preventDefault(); first.focus(); }
    };
    el.addEventListener('keydown', handler);
    focusTraps.set(el, handler);
  }
  function releaseFocusTrap(el) {
    if (!el) return;
    const handler = focusTraps.get(el);
    if (handler) { el.removeEventListener('keydown', handler); focusTraps.delete(el); }
  }
  function closeAllOverlays() {
    ['overlay-glossary', 'overlay-presets', 'overlay-help', 'overlay-guide', 'overlay-plant', 'overlay-zoom'].forEach(closeOverlay);
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
  function closeExportMenu(restoreFocus) {
    if (!exportMenu) return;
    exportMenu.remove(); exportMenu = null;
    if (restoreFocus) { const anchor = $('btn-export'); if (anchor) anchor.focus(); }
  }
  function toggleExportMenu() {
    if (exportMenu) { closeExportMenu(true); return; }
    const anchor = $('btn-export');
    if (!anchor) return;
    const menu = doc.createElement('div');
    menu.className = 'export-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = '<button type="button" role="menuitem" data-export="csv">' + icon('download') + ' 导出实验数据 CSV</button>' +
      '<button type="button" role="menuitem" data-export="png">' + icon('chart') + ' 导出图表 PNG</button>' +
      '<button type="button" role="menuitem" data-export="md">' + icon('book') + ' 导出公式手册 Markdown</button>' +
      '<button type="button" role="menuitem" data-export="papers">' + icon('external') + ' 导出论文出处 CSV</button>';
    doc.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.top = (rect.bottom + 8) + 'px';
    menu.style.left = Math.max(8, rect.right - 190) + 'px';
    exportMenu = menu;
    menu.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-export]');
      if (!btn) return;
      closeExportMenu(true);
      if (btn.dataset.export === 'csv') cb.exportCSV && cb.exportCSV();
      else if (btn.dataset.export === 'png') cb.exportPNG && cb.exportPNG();
      else if (btn.dataset.export === 'papers') cb.exportPapers && cb.exportPapers();
      else if (cb.exportFormulaBook) cb.exportFormulaBook();
    });
    /* 菜单键盘导航：上下循环 / Home / End / Esc 关闭并还原焦点 */
    menu.addEventListener('keydown', (ev) => {
      const items = Array.prototype.slice.call(menu.querySelectorAll('[data-export]'));
      if (!items.length) return;
      const idx = items.indexOf(doc.activeElement);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(idx + 1) % items.length].focus(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
      else if (ev.key === 'Home') { ev.preventDefault(); items[0].focus(); }
      else if (ev.key === 'End') { ev.preventDefault(); items[items.length - 1].focus(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeExportMenu(true); }
    });
    const first = menu.querySelector('[data-export]');
    if (first) first.focus();
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
    doc.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      closeAllOverlays();
      hideRailPopover(0);
    });
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
    /* 左栏关键词搜索：名称 / 键名 / 分类 / 简介均可命中（renderBrowser 内过滤） */
    const searchBox = $('browser-search');
    if (searchBox) {
      searchBox.addEventListener('input', () => {
        query = searchBox.value || '';
        renderBrowser();
      });
    }
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
      groups.addEventListener('click', (ev) => {
        const resetBtn = ev.target.closest('[data-reset-group]');
        if (resetBtn) {
          /* 按钮位于 <summary> 内：阻止 details 被顺带折叠/展开 */
          ev.preventDefault();
          ev.stopPropagation();
          if (cb.resetParamGroup) cb.resetParamGroup(resetBtn.dataset.resetGroup);
          return;
        }
        if (ev.target.closest('#btn-solve-optimal')) {
          if (cb.solveOptimal) cb.solveOptimal();
          return;
        }
        if (ev.target.closest('#btn-solve-doc')) {
          if (cb.openSolveGuide) cb.openSolveGuide();
        }
      });
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

    const speed = $('speed-slider');
    if (speed) speed.addEventListener('input', () => {
      if (cb.setSpeed) cb.setSpeed(speedFromSlider(speed.value));
    });

    const speedReset = $('speed-reset');
    if (speedReset) speedReset.addEventListener('click', () => {
      if (cb.setSpeed) cb.setSpeed(1);
    });

    const presets = $('presets-body');
    if (presets) presets.addEventListener('click', (ev) => {
      const duelCard = ev.target.closest('[data-duel]');
      if (duelCard) {
        const opt = $('duel-optimize');
        closeOverlay('overlay-presets');
        if (cb.applyDuel) cb.applyDuel(duelCard.dataset.duel, !!(opt && opt.checked));
        return;
      }
      const card = ev.target.closest('[data-preset]');
      if (!card) return;
      closeOverlay('overlay-presets');
      cb.applyPreset && cb.applyPreset(card.dataset.preset);
    });

    /* 曲线卡点击 → 全屏高清放大（移植自 index(14).html 的 zoomedChart 模态框） */
    const chartsGrid = $('charts-grid');
    if (chartsGrid) {
      chartsGrid.addEventListener('click', (ev) => {
        const card = ev.target.closest('[data-zoom]');
        if (!card) return;
        zoomChart(card.dataset.zoom, card.querySelector('figcaption'));
      });
      chartsGrid.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        const card = ev.target.closest('[data-zoom]');
        if (!card) return;
        ev.preventDefault();
        zoomChart(card.dataset.zoom, card.querySelector('figcaption'));
      });
    }

    const profile = $('controller-profile');
    if (profile) profile.addEventListener('click', (ev) => {
      const fitBtn = ev.target.closest('[data-fit-plant]');
      if (fitBtn && cb.selectPlant) { cb.selectPlant(fitBtn.dataset.fitPlant); return; }
      const btn = ev.target.closest('#btn-profile-star');
      if (btn && cb.toggleFavorite) cb.toggleFavorite(activeMethod);
    });

    /* 「收起参数栏」按钮位于档案 summary 内：阻止点击冒泡触发 details 的默认切换，
       否则一次点击会同时折叠档案并挂起右栏。rails.js 绑在同一按钮上的收起逻辑
       仍会执行（preventDefault 不影响其它监听器）。 */
    const collapseBtn = $('btn-inspector-collapse');
    if (collapseBtn) collapseBtn.addEventListener('click', (ev) => { ev.preventDefault(); });

    /* 档案展开后重新测量控制律公式：折叠时容器 clientWidth=0，测量会早退，
       必须等布局稳定后补算一次，否则字号停留在 CSS 基准或被钉到下限。 */
    const profileDetails = $('profile-details');
    if (profileDetails) profileDetails.addEventListener('toggle', () => {
      if (profileDetails.open) {
        global.requestAnimationFrame(() => fitProfileFormula($('controller-profile')));
      }
    });

    /* 挂起态章节导航：悬停 / 键盘聚焦弹出二级目录，移出延迟关闭以便移入卡片 */
    const railNav = $('rail-nav');
    const railPop = $('rail-popover');
    if (railNav && railPop) {
      const openFrom = (target) => {
        const btn = target && target.closest ? target.closest('.rail-chapter') : null;
        if (!btn) return;
        const idx = Number(btn.dataset.catIndex);
        if (railPop.hidden || railOpenIndex !== idx) showRailPopover(idx, btn);
      };
      railNav.addEventListener('mouseover', (ev) => openFrom(ev.target));
      railNav.addEventListener('focusin', (ev) => openFrom(ev.target));
      railNav.addEventListener('mouseleave', () => hideRailPopover(180));
      railNav.addEventListener('focusout', (ev) => {
        if (!railPop.contains(ev.relatedTarget)) hideRailPopover(180);
      });
      railNav.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.rail-chapter');
        if (btn) jumpToChapter(Number(btn.dataset.catIndex));
      });
      railPop.addEventListener('mouseenter', () => global.clearTimeout(railHideTimer));
      railPop.addEventListener('focusin', () => global.clearTimeout(railHideTimer));
      railPop.addEventListener('mouseleave', () => hideRailPopover(180));
      railPop.addEventListener('focusout', (ev) => {
        if (!railNav.contains(ev.relatedTarget) && !railPop.contains(ev.relatedTarget)) hideRailPopover(180);
      });
      railPop.addEventListener('click', (ev) => {
        const item = ev.target.closest('.rail-pop-item[data-method]');
        if (!item) return;
        if (cb.selectMethod) cb.selectMethod(item.dataset.method);
        hideRailPopover(0);
      });
      global.addEventListener('resize', () => hideRailPopover(0));
      global.addEventListener('scroll', () => hideRailPopover(0));
    }
  }

  function setFavorites(list) { favorites = list.slice(0, D.methodList.length); renderBrowser(); renderProfile(activeMethod); }
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
    mountColumnSync();
  }

  /* 标记某方法已求解过最优增益，并就地重绘增益卡片（露出原理文档入口） */
  function markSolved(key) {
    const k = key || sim.getSettings().method;
    solvedGainMethods[k] = true;
    renderParams();
  }

  NS.ui = {
    init, setFavorites, getFavorites, setRecent, setScope, syncColumnHeights,
    setActiveMethod, renderBrowser, renderProfile, renderPlant, renderPlantModel, renderParams,
    renderLegend, renderTracks, updateMetrics, updateStatus, markSolved,
    openOverlay, openOverlayById, closeOverlay, closeAllOverlays,
    trapFocus, releaseFocusTrap,
    setTheme, toast, syncParamControl
  };
})(window);
