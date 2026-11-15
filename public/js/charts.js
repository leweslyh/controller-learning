/* ============================================================
   charts.js — 渲染层（四画布；只读仿真状态）
   统一的自适应坐标轴：nice ticks、轴标题、网格、曲线裁剪与悬停读数；
   指标文字移至 DOM 卡片标题，画布只负责精确绘图。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const sim = NS.sim;
  const D = NS.data;
  const doc = global.document;

  /* V2.1:1153 的参考流形白名单原样保留 */
  const REF_FLOW_METHODS = [
    'MRAC', 'L1', 'Flatness', 'InputShaping', 'PPC', 'PTC', 'ESO-Follow',
    'MRAC-MIT', 'Topological', 'Posicast', 'Funnel', 'TimeVary-BLF', 'Lorenz-Coupled'
  ];

  const PAD = { l: 50, r: 12, t: 18, b: 28 };
  const IDS = { sim: 'canvas-sim', pos: 'canvas-pos', phase: 'canvas-phase', ctrl: 'canvas-ctrl', cart: 'canvas-cart', vel: 'canvas-vel' };
  let els = null;
  let palette = null;
  let hover = { key: null, x: null, y: null };
  let rangeCache = { key: '', value: null };
  let lastRange = null;

  function init() {
    els = {
      sim: doc.getElementById(IDS.sim),
      pos: doc.getElementById(IDS.pos),
      phase: doc.getElementById(IDS.phase),
      ctrl: doc.getElementById(IDS.ctrl),
      cart: doc.getElementById(IDS.cart),
      vel: doc.getElementById(IDS.vel)
    };
    bindHover();
    global.addEventListener('resize', resize, { passive: true });
    resize();
  }

  function css(name) { return getComputedStyle(doc.documentElement).getPropertyValue(name).trim(); }
  function theme() {
    if (!palette) {
      palette = {
        surface: css('--surface') || '#FFFFFF',
        surface3: css('--surface-3') || '#F7FBF8',
        grid: css('--divider') || '#E7F1EA',
        border: css('--border') || '#D8E8DE',
        text: css('--text') || '#0F2A26',
        muted: css('--text-faint') || '#577A6E',
        primary: css('--primary') || '#0F766E',
        accent: css('--accent-strong') || '#9A3412',
        x: css('--curve-x') || '#2563EB',
        r: css('--curve-r') || '#059669',
        u: css('--curve-u') || '#DC2626',
        ref: css('--curve-ref') || '#7C3AED',
        phase: css('--curve-phase') || '#7C3AED',
        warn: css('--warn') || '#B45309'
      };
    }
    return palette;
  }
  function refreshTheme() { palette = null; rangeCache.key = ''; sim.markDirty(); }
  function resize() { rangeCache.key = ''; sim.markDirty(); }

  function syncSize(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w < 2 || h < 2) return null;
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    return { ctx, w, h };
  }

  function fmt(v, d) { return Number.isFinite(v) ? v.toFixed(d === undefined ? 2 : d) : '—'; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ── 自适应坐标：1/2/5 × 10ⁿ 的「整数刻度」 ────────── */
  function niceStep(raw) {
    const r = Math.max(1e-9, raw || 1);
    const exp = Math.floor(Math.log10(r));
    const base = Math.pow(10, exp);
    const f = r / base;
    const mult = f <= 1 ? 1 : (f <= 2 ? 2 : (f <= 5 ? 5 : 10));
    return mult * base;
  }
  function niceRange(min, max, padRatio, maxTicks) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) { min = -1; max = 1; }
    if (max - min < 1e-9) { const c = (min + max) / 2; min = c - 1; max = c + 1; }
    const pad = Math.max((max - min) * (padRatio === undefined ? 0.1 : padRatio), 1e-6);
    let lo = min - pad, hi = max + pad;
    const step = niceStep((hi - lo) / (maxTicks || 5));
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    const ticks = [];
    for (let v = lo, guard = 0; v <= hi + step * 0.5 && guard < 30; v += step, guard++) {
      ticks.push(Number(v.toFixed(8)));
    }
    return { min: lo, max: hi, ticks, step };
  }
  function tickLabel(v) {
    const a = Math.abs(v);
    if (a >= 10000 || (a > 0 && a < 0.01)) return v.toExponential(1);
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(a < 1 ? 2 : 1);
  }

  /* 绘制坐标轴并返回映射函数与绘图区 */
  function drawAxes(ctx, w, h, p, cfg) {
    const plot = { x0: PAD.l, y0: PAD.t, x1: w - PAD.r, y1: h - PAD.b };
    const pw = Math.max(1, plot.x1 - plot.x0), ph = Math.max(1, plot.y1 - plot.y0);
    const mapX = (v) => plot.x0 + (v - cfg.x.min) / (cfg.x.max - cfg.x.min) * pw;
    const mapY = (v) => plot.y1 - (v - cfg.y.min) / (cfg.y.max - cfg.y.min) * ph;

    ctx.save();
    ctx.strokeStyle = p.grid; ctx.lineWidth = 1; ctx.beginPath();
    cfg.x.ticks.forEach((v) => { const x = mapX(v); ctx.moveTo(x, plot.y0); ctx.lineTo(x, plot.y1); });
    cfg.y.ticks.forEach((v) => { const y = mapY(v); ctx.moveTo(plot.x0, y); ctx.lineTo(plot.x1, y); });
    ctx.stroke();

    // 零线加粗，便于读出正负
    ctx.strokeStyle = p.border; ctx.lineWidth = 1.4; ctx.beginPath();
    if (cfg.x.min <= 0 && cfg.x.max >= 0) { const x = mapX(0); ctx.moveTo(x, plot.y0); ctx.lineTo(x, plot.y1); }
    if (cfg.y.min <= 0 && cfg.y.max >= 0) { const y = mapY(0); ctx.moveTo(plot.x0, y); ctx.lineTo(plot.x1, y); }
    ctx.stroke();

    ctx.fillStyle = p.muted;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    cfg.y.ticks.forEach((v) => {
      const y = mapY(v);
      if (y >= plot.y0 - 2 && y <= plot.y1 + 2) ctx.fillText(tickLabel(v), plot.x0 - 6, y);
    });
    /* 轴标题（放在绘图区边缘内侧，避免与刻度数字重叠） */
    ctx.fillStyle = p.muted; ctx.font = '600 10px ui-monospace, monospace';
    const xTitleW = ctx.measureText(cfg.xLabel).width;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    cfg.x.ticks.forEach((v) => {
      const x = mapX(v);
      if (x < plot.x0 - 2 || x > plot.x1 + 2) return;
      const txt = tickLabel(v) + (cfg.xUnit || '');
      const tw = ctx.measureText(txt).width;
      /* 右下角留给轴标题：与之相撞的刻度数字整体左移，避免叠字 */
      const limit = plot.x1 - xTitleW - 8;
      if (x + tw / 2 > limit) {
        ctx.textAlign = 'right';
        ctx.fillText(txt, Math.max(plot.x0 + tw / 2, limit), h - 8);
        ctx.textAlign = 'center';
      } else {
        ctx.fillText(txt, x, h - 8);
      }
    });
    ctx.fillStyle = p.muted; ctx.font = '600 10px ui-monospace, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(cfg.yLabel, plot.x0 + 4, 3);
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(cfg.xLabel, plot.x1, h - 8);
    ctx.restore();
    return { mapX, mapY, plot };
  }

  function clipPlot(ctx, plot) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(plot.x0, plot.y0, plot.x1 - plot.x0, plot.y1 - plot.y0);
    ctx.clip();
  }

  function plotSeries(ctx, points, key, color, axes, opts) {
    if (!points || points.length < 2) return;
    const o = opts || {};
    ctx.save();
    ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = o.width || 2;
    if (o.dash) ctx.setLineDash(o.dash); else ctx.setLineDash([]);
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const value = typeof key === 'function' ? key(pt) : pt[key];
      if (!Number.isFinite(value)) continue;
      const x = axes.mapX(pt.t), y = axes.mapY(value);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ── 对象专属可视化 ───────────────────────────────── */
  function getPlantView(id) { return D.PLANT_VIEWS[id] || D.PLANT_VIEWS.msd; }

  function arrow(ctx, x1, y1, x2, y2, color, width) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1), s = 7;
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
    ctx.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function label(ctx, str, x, y, color, align, font) {
    ctx.save();
    ctx.fillStyle = color; ctx.font = font || '600 11px ui-monospace, monospace';
    ctx.textAlign = align || 'left'; ctx.fillText(str, x, y); ctx.restore();
  }
  function drawSimBackdrop(b) {
    const { ctx, w, h, view, mapX, p } = b;
    const groundY = h - 30;
    ctx.save();
    ctx.strokeStyle = p.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const x = i / 10 * w; ctx.moveTo(x, 0); ctx.lineTo(x, groundY); }
    for (let i = 0; i <= 4; i++) { const y = i / 4 * groundY; ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.strokeStyle = p.border; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
    ctx.fillStyle = p.muted; ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'center';
    /* 倒立摆的地面刻度由 paintPendulum 按镜头滚动的米制标尺绘制；
       姿态通道的刻度画在圆周上（paintAttitude），这里都跳过静态地面刻度 */
    if (view.kind !== 'pendulum' && view.kind !== 'attitude') {
      view.ticks.forEach((t) => {
        const x = mapX(t);
        if (x >= 0 && x <= w) { ctx.fillRect(x, groundY, 1.5, 5); ctx.fillText(String(t), x, groundY + 17); }
      });
    }
    ctx.restore();
  }
  function drawTargetLine(b, yTop) {
    const { ctx, h, mapX, target, p, w } = b;
    const x = clamp(mapX(target), 2, w - 2), y0 = yTop || 56;
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = p.r; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, h - 30); ctx.stroke(); ctx.restore();
    label(ctx, 'r = ' + fmt(target, 2), clamp(x + 5, 4, w - 72), y0 - 4, p.r, 'left', 'bold 10px ui-monospace, monospace');
  }
  function drawSimReadout(b) {
    const { ctx, state, plant, p } = b;
    /* 画布不再显示对象名（面板下拉框已可见）；仅保留倒立摆小车平动量
       x_c / v_c（不在下方指标卡内，非重复）。 */
    if (plant.id === 'pendulum') {
      const cs = sim.getSettings();
      const refTxt = cs.cartLoop === 'on' ? '    x_ref = ' + fmt(cs.cartTarget || 0, 2) + ' m' : '';
      label(ctx, 'x_c = ' + fmt(state.xc || 0, 2) + ' m    v_c = ' + fmt(state.vc || 0, 2) + ' m/s' + refTxt, 10, 16, p.muted);
    }
  }
  function movingColor(b) { return b.impulse > 10 ? b.p.u : b.p.x; }
  /* 圆角矩形路径（标签底衬用） */
  function pillPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 控制输入箭头（三个对象统一）：
     锥形箭杆（尾细头粗）+ 大箭头 + 柔光 + accent 胶囊底衬数值标签；
     起点随受力方向翻到作用面另一侧；近零时整体变淡表示「几乎不施力」。
     长度用感知标度 len = minLen + (maxLen−minLen)·√(|u|/uRef)：
     小力也有清晰可见的最小长度，大力平滑趋近上限，中段区分度好、不饱和。 */
  function forceArrow(b, cx, y, halfW, opts) {
    const { ctx, p } = b;
    const o = opts || {};
    const u = b.u || 0, dir = u >= 0 ? 1 : -1;
    const sym = (b.plant && b.plant.inputSymbol) || 'u';
    const unit = (b.plant && b.plant.inputUnit) || 'N';
    const minLen = 16, maxLen = o.max || 64, uRef = o.uRef || 60;
    const len = minLen + (maxLen - minLen) * Math.sqrt(clamp(Math.abs(u) / uRef, 0, 1));
    const active = Math.abs(u) > 0.5;
    const color = p.accent;
    const x0 = cx + dir * (halfW + 3);
    const x1 = x0 + dir * len;

    ctx.save();
    ctx.globalAlpha = active ? 1 : 0.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = active ? 7 : 3;
    ctx.fillStyle = color;
    /* 锥形箭杆 + 箭头一体成形：尾部圆点 → 杆渐粗 → 三角箭头 */
    const tailW = 1.6, shaftW = 3.2, headHalf = 4.6;
    const headLen = Math.min(11, len * 0.45);
    const xs = x1 - dir * headLen;
    ctx.beginPath();
    ctx.moveTo(x0, y - tailW / 2);
    ctx.lineTo(xs, y - shaftW / 2);
    ctx.lineTo(xs, y - headHalf);
    ctx.lineTo(x1, y);
    ctx.lineTo(xs, y + headHalf);
    ctx.lineTo(xs, y + shaftW / 2);
    ctx.lineTo(x0, y + tailW / 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x0, y, tailW / 2 + 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* 数值胶囊：accent 底 + 米白字，置于箭杆中点上方 */
    const text = sym + '=' + fmt(u, 2) + ' ' + unit;
    ctx.save();
    ctx.font = 'bold 9px ui-monospace, monospace';
    const tw = ctx.measureText(text).width;
    const lx = x0 + dir * (len / 2);
    const pw = tw + 10, ph = 14;
    ctx.globalAlpha = active ? 0.95 : 0.6;
    ctx.fillStyle = color;
    pillPath(ctx, lx - pw / 2, y - 9 - ph, pw, ph, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFF8EE';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, lx, y - 9 - ph / 2 + 0.5);
    ctx.restore();
  }

  function paintSpring(b, nonlinear) {
    const { ctx, w, h, state, impulse, mapX, p, unit } = b;
    const groundY = h - 30, box = 44;
    const bx = clamp(mapX(state.x), box / 2 + 18, w - box / 2 - 8);
    const cy = groundY - box / 2;
    const springY = groundY - box + 10;   /* 弹簧轴线：接在质量块上部 */
    const damperY = groundY - 12;         /* 阻尼器轴线：接在质量块下部，整体悬在地面之上 */
    drawTargetLine(b, 56);

    /* 固定墙：竖线 + 斜剖面线（经典力学示意图画法） */
    ctx.save();
    ctx.strokeStyle = p.border; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(14, 56); ctx.lineTo(14, groundY); ctx.stroke();
    ctx.globalAlpha = 0.55; ctx.strokeStyle = p.muted; ctx.lineWidth = 1.2;
    for (let y = 60; y < groundY; y += 9) {
      ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(6, y + 8); ctx.stroke();
    }
    ctx.restore();

    /* 弹簧与阻尼器（并联）：弹簧接质量块上部，阻尼器接质量块下部，
       二者均从墙面水平直连质量块侧壁，互不重叠、不与横坐标相交 */
    const attachX = bx - box / 2;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const seg = 22, step = Math.max(0, attachX - 14) / seg;
    ctx.strokeStyle = nonlinear ? p.accent : p.muted;
    ctx.lineWidth = nonlinear ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(14, springY);
    for (let i = 1; i <= seg; i++) ctx.lineTo(14 + step * i, springY + (i % 2 === 0 ? 7 : -7));
    ctx.lineTo(attachX, springY); ctx.stroke();
    if (nonlinear) {
      ctx.beginPath(); ctx.moveTo(14, springY - 9);
      for (let i = 1; i <= seg; i++) ctx.lineTo(14 + step * i, springY - 9 + (i % 2 === 0 ? 5 : -5));
      ctx.lineTo(attachX, springY - 9); ctx.stroke();
    } else {
      ctx.strokeStyle = p.muted; ctx.lineWidth = 1.5;
      pillPath(ctx, 14, damperY - 7, 28, 14, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(42, damperY); ctx.lineTo(attachX, damperY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(34, damperY - 7); ctx.lineTo(34, damperY + 7); ctx.stroke();
    }
    ctx.restore();

    /* 质量块：与小车同一套刚体风格（圆角 / 高光 / 侧裙 / 接地阴影）+ 运动色柔光 */
    const color = movingColor(b);
    drawMassBody(ctx, bx, groundY - box, box, box, color, p);
    ctx.save();
    ctx.globalAlpha = 0.22; ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    pillPath(ctx, bx - box / 2, groundY - box, box, box, 7); ctx.fill();
    ctx.restore();
    label(ctx, 'm', bx, groundY - box / 2 + 4, '#FFFFFF', 'center', 'bold 12px ui-monospace, monospace');
    label(ctx, nonlinear ? 'k + k₃x³' : 'k', 20, springY - 12, p.muted, 'left', '10px ui-monospace, monospace');
    if (!nonlinear) label(ctx, 'c', 48, damperY - 3, p.muted, 'left', '11px ui-monospace, monospace');
    forceArrow(b, bx, cy, box / 2);
  }

  /* 统一的刚体块绘制（三个对象共用同一风格）：
     圆角车身 + 墨线描边 + 顶面高光 + 底部侧裙；接地软阴影位置由 shadowY 指定 */
  function drawMassBody(ctx, cx, topY, bw, bh, color, p, shadowY) {
    ctx.save();
    ctx.fillStyle = 'rgba(15,42,38,0.14)';
    ctx.beginPath();
    ctx.ellipse(cx, (shadowY === undefined ? topY + bh + 2 : shadowY), bw * 0.58, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = color;
    pillPath(ctx, cx - bw / 2, topY, bw, bh, 6);
    ctx.fill();
    ctx.strokeStyle = p.border; ctx.lineWidth = 1.6;
    pillPath(ctx, cx - bw / 2, topY, bw, bh, 6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - bw / 2 + 7, topY + 3.5);
    ctx.lineTo(cx + bw / 2 - 7, topY + 3.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(15,42,38,0.18)';
    ctx.fillRect(cx - bw / 2 + 4, topY + bh - 5, bw - 8, 3.5);
    ctx.restore();
  }

  /* 美化小车底盘（二阶积分器 / 倒立摆共用）：
     车身用统一的 drawMassBody，再加滚动车轮（外胎 / 轮毂 / 三辐条随位移转动）；
     车轮半径决定车底离轨高度，车身顶面 = groundY − 2r − bh */
  function drawCartBody(ctx, cx, groundY, bw, bh, wheelR, color, roll, p) {
    const bodyTop = groundY - wheelR * 2 - bh;
    drawMassBody(ctx, cx, bodyTop, bw, bh, color, p, groundY + 2);

    /* 车轮：外胎 → 轮毂 → 三辐条（roll 随位移转动）→ 轴心 */
    [-1, 1].forEach((s) => {
      const wx = cx + s * bw * 0.28, wy = groundY - wheelR;
      ctx.save();
      ctx.fillStyle = p.border;
      ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.surface3;
      ctx.beginPath(); ctx.arc(wx, wy, wheelR * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = p.border; ctx.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) {
        const a = roll + k * (Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.moveTo(wx - Math.cos(a) * wheelR * 0.55, wy - Math.sin(a) * wheelR * 0.55);
        ctx.lineTo(wx + Math.cos(a) * wheelR * 0.55, wy + Math.sin(a) * wheelR * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = p.text;
      ctx.beginPath(); ctx.arc(wx, wy, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  function paintCart(b) {
    const { ctx, w, h, state, mapX, p } = b;
    const groundY = h - 30, bw = 52, bh = 26, wheelR = 6;
    const bx = clamp(mapX(state.x), bw / 2 + 8, w - bw / 2 - 8);
    drawTargetLine(b, 56);
    drawCartBody(ctx, bx, groundY, bw, bh, wheelR, movingColor(b), (state.x || 0) * 6, p);
    /* 速度感：|v| 明显时在运动反侧画三道渐隐流线 */
    const vNow = state.v || 0;
    if (Math.abs(vNow) > 0.3) {
      const dirS = vNow > 0 ? 1 : -1;
      const sx0 = bx - dirS * (bw / 2 + 6);
      ctx.save();
      ctx.strokeStyle = movingColor(b); ctx.lineCap = 'round';
      [10, 17, 24].forEach((d, i) => {
        ctx.globalAlpha = 0.42 - i * 0.12;
        ctx.lineWidth = 2.2 - i * 0.5;
        ctx.beginPath();
        ctx.moveTo(sx0 - dirS * d, groundY - 20 - i * 7);
        ctx.lineTo(sx0 - dirS * (d + 12), groundY - 20 - i * 7);
        ctx.stroke();
      });
      ctx.restore();
    }
    label(ctx, 'm', bx, groundY - wheelR * 2 - bh / 2, '#FFFFFF', 'center', 'bold 12px ui-monospace, monospace');
    forceArrow(b, bx, groundY - bh / 2 - 12, bw / 2);
  }

  function paintPendulum(b) {
    const { ctx, w, h, state, target, p, view, cartLoop, cartTarget } = b;
    const groundY = h - 26;
    const cartW = 62, cartH = 22, wheelR = 6.5;
    const L = Math.min(h * 0.44, 104);
    const theta = clamp(state.x, view.min, view.max);
    const tTheta = clamp(target, view.min, view.max);
    /* θ 向右倾为正：输入是摆轴力矩，支座随小车移动，摆杆绕支点转动 */
    const span = view.cartRange || 3;
    const half = Math.max(60, w / 2 - 70);
    /* 镜头跟随：小车固定在画面中央，滑轨刻度按世界坐标滚动。
       匀速 / 加速的稳态运动由「刻度向后退」直观呈现，绝对位置读刻度即可。 */
    const camX = state.xc || 0;
    const sx = (worldX) => w / 2 + (worldX - camX) / span * half;
    const cartX = w / 2;
    /* 外环开启时标出小车目标位置 x_ref：在画面内画虚线，出画面则画边缘指示箭头 */
    if (cartLoop === 'on') {
      const refX = sx(cartTarget || 0);
      if (refX >= 20 && refX <= w - 20) {
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = p.r; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(refX, 40); ctx.lineTo(refX, groundY + 8); ctx.stroke();
        ctx.restore();
        /* 标注位于参考线的最上端 */
        label(ctx, 'x_ref=' + fmt(cartTarget || 0, 2) + ' m', refX, 34, p.r, 'center',
          'bold 9px ui-monospace, monospace');
      } else {
        const dist = (cartTarget || 0) - camX;
        const dirX = dist > 0 ? 1 : -1;
        const edgeX = dist > 0 ? w - 16 : 16;
        arrow(ctx, edgeX - dirX * 22, groundY - 10, edgeX, groundY - 10, p.r, 2);
        label(ctx, 'x_ref=' + fmt(cartTarget || 0, 1) + ' m ' + (dirX > 0 ? '→' : '←'),
          edgeX - dirX * 26, groundY - 18, p.r, dirX > 0 ? 'right' : 'left',
          'bold 9px ui-monospace, monospace');
      }
    }
    const pivotY = groundY - wheelR * 2 - cartH;
    const ballX = cartX + Math.sin(theta) * L;
    const ballY = pivotY - Math.cos(theta) * L;
    const ballR = Math.max(9, Math.min(12, L * 0.115));
    const moving = movingColor(b);

    /* 滑轨：实线 + 随镜头滚动的斜齿与米制刻度尺（整数米标数，半米小刻度） */
    ctx.save();
    ctx.strokeStyle = p.border; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = p.grid; ctx.lineWidth = 1;
    for (let m = Math.floor((camX - span) / 0.25) * 0.25; m <= camX + span; m += 0.25) {
      if (Math.abs(m - Math.round(m)) < 1e-9) continue;
      const gx = sx(m);
      if (gx < -10 || gx > w + 10) continue;
      ctx.beginPath(); ctx.moveTo(gx, groundY + 2); ctx.lineTo(gx - 8, groundY + 10); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let m = Math.floor((camX - span) / 0.5) * 0.5; m <= camX + span + 0.25; m += 0.5) {
      const gx = sx(m);
      if (gx < 14 || gx > w - 14) continue;
      const isMeter = Math.abs(m - Math.round(m)) < 1e-9;
      ctx.strokeStyle = isMeter ? p.muted : p.grid;
      ctx.lineWidth = isMeter ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(gx, groundY); ctx.lineTo(gx, groundY - (isMeter ? 7 : 4)); ctx.stroke();
      if (isMeter) {
        ctx.fillStyle = p.muted; ctx.font = '9px ui-monospace, monospace';
        ctx.fillText((Math.round(m) === 0 ? '0' : (m > 0 ? '+' : '') + Math.round(m)) + ' m', gx, groundY + 8);
      }
    }
    ctx.restore();

    /* 竖直基准线（θ=0） */
    ctx.save();
    ctx.setLineDash([4, 5]); ctx.lineWidth = 1.3; ctx.globalAlpha = 0.7;
    ctx.strokeStyle = p.muted;
    ctx.beginPath(); ctx.moveTo(cartX, pivotY - 16); ctx.lineTo(cartX, pivotY - L - 24); ctx.stroke();
    ctx.restore();

    /* 目标姿态（与当前姿态重合时省略，避免与基准线打架） */
    if (Math.abs(tTheta - theta) > 0.005) {
      ctx.save();
      ctx.setLineDash([6, 5]); ctx.lineWidth = 1.8; ctx.strokeStyle = p.r;
      ctx.beginPath(); ctx.moveTo(cartX, pivotY);
      ctx.lineTo(cartX + Math.sin(tTheta) * (L + 20), pivotY - Math.cos(tTheta) * (L + 20)); ctx.stroke();
      ctx.restore();
    }

    /* θ 角弧：画在质量小球的上方（半径 = 摆长 + 球半径 + 10，恰好挂在竖直
       基准虚线的下端），accent 色（与力箭头同色）；箭头与 θ 符号并排放在一起、
       均在球的上方——箭头在弧的摆杆侧端、θ 紧随其外侧；
       始终按「起点→终点递增」正向扫描（end > start），杜绝 canvas 反向补 2π
       的超大弧 bug；摆角小于 0.1°（π/1800）时整体隐藏 */
    if (Math.abs(theta) > Math.PI / 1800) {
      const aEnd = -Math.PI / 2 + theta;
      const dS = theta >= 0 ? 1 : -1;
      const arcR = L + ballR + 10;
      const gap = Math.min(0.10, Math.abs(theta) * 0.4);
      const aTip = aEnd - dS * gap;
      const a0 = theta >= 0 ? -Math.PI / 2 : aTip;
      const a1 = theta >= 0 ? aTip : -Math.PI / 2;
      ctx.save();
      ctx.strokeStyle = p.accent; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cartX, pivotY, arcR, a0, a1, false);
      ctx.stroke();
      ctx.restore();
      const txE = -dS * Math.sin(aTip), tyE = dS * Math.cos(aTip);
      const axE = cartX + Math.cos(aTip) * arcR, ayE = pivotY + Math.sin(aTip) * arcR;
      arrow(ctx, axE - txE * 9, ayE - tyE * 9, axE + txE * 4, ayE + tyE * 4, p.accent, 1.6);
      /* θ 符号与箭头同一高度：紧挨箭头外侧水平排列 */
      label(ctx, 'θ', axE + dS * 16, ayE + 4, p.accent, 'center',
        'bold 11px ui-monospace, monospace');
    }

    /* 小车与轮子：与其他对象同一底盘绘制（圆角车身 / 辐条车轮 / 接地阴影），
       辐条转动量取小车位移，视觉上真实滚动 */
    drawCartBody(ctx, cartX, groundY, cartW, cartH, wheelR, movingColor(b), (state.xc || 0) * 6, p);
    /* 小车质量符号 M：放在车身正中（白字），与另外两对象一致 */
    label(ctx, 'M', cartX, pivotY + cartH / 2 + 4, '#FFFFFF', 'center',
      'bold 12px ui-monospace, monospace');

    /* 摆球与摆杆：先画球（描边 + 高光），再把摆杆压画到球之上直到球心，
       杆与球连为一体不再有描边造成的断口；支点圆点最后画在杆端 */
    ctx.save();
    ctx.lineCap = 'round';
    ctx.fillStyle = moving;
    ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.surface; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(ballX - ballR * 0.45, ballY - ballR * 0.5, ballR * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = moving; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(cartX, pivotY); ctx.lineTo(ballX, ballY); ctx.stroke();
    /* 摆球质量符号 m：放在球心（白字），与另外两对象一致 */
    label(ctx, 'm', ballX, ballY + 4, '#FFFFFF', 'center',
      'bold 11px ui-monospace, monospace');
    ctx.fillStyle = p.text;
    ctx.beginPath(); ctx.arc(cartX, pivotY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* 控制力：作用在小车上的水平推力 F（N），与其他对象同一支美化箭头 */
    forceArrow(b, cartX, pivotY + cartH / 2, cartW / 2, { uRef: 12, max: 58 });

    if (cartLoop !== 'on' && Math.abs(target) > 0.01) {
      label(ctx, '非零目标角：小车持续加速移动', w / 2, 30, p.r, 'center',
        '10px ui-monospace, monospace');
    }

  }

  /* ── 姿态通道（飞机 / 导弹 / 无人机，二维单通道） ─────────────────────
     姿态是**绕质心**的转动，质心不动、机体绕它转，所以画成「质心 + 量角器」：
       质心十字 = 转动中心（固定在画布中心，不平移）
       水平虚线 = 零位基准（θ = 0 时机头指向）
       机体外形 = 当前姿态，以质心为中心旋转 -θ（飞机/导弹侧视图，四旋翼正视图）
       刻度圈   = 量角器，红色虚线 = 目标姿态 r，蓝色弧 = 当前角 θ
       弧线箭头 = 控制力矩 M 的方向与相对大小（绕质心）
     角度按数学正方向（抬头/左滚为正）绘制，而 canvas 的 y 轴向下，故旋转取 -θ。 */
  function attitudePoint(cx, cy, ang, len) {
    return { x: cx + Math.cos(ang) * len, y: cy - Math.sin(ang) * len };
  }
  /* 圆弧端点箭头：tip 为弧线终点，cx/cy 为圆心，dir 为弧线沿 canvas 角度增(+1)/减(-1) 的走向。
     半径向量必须先单位化，否则箭头尺寸会被半径放大成巨块。 */
  function arcHead(ctx, tipX, tipY, cx, cy, dir, size) {
    const dx = tipX - cx, dy = tipY - cy;
    const rl = Math.hypot(dx, dy) || 1;
    const ux = dx / rl, uy = dy / rl;      /* 径向单位向量 */
    const tx = -uy * dir, ty = ux * dir;    /* 切向单位向量（径向旋转 90°） */
    ctx.beginPath();
    ctx.moveTo(tipX + tx * size, tipY + ty * size);
    ctx.lineTo(tipX - tx * size * 0.35 + ux * size * 0.45, tipY - ty * size * 0.35 + uy * size * 0.45);
    ctx.lineTo(tipX - tx * size * 0.35 - ux * size * 0.45, tipY - ty * size * 0.35 - uy * size * 0.45);
    ctx.closePath(); ctx.fill();
  }
  /* 飞机：侧视图（机头朝 +x，画布 y 向下 → 机腹在 +y）。俯仰角就是这张图里的转动角。
     比例走「极修长」路线：机身长径比约 11:1，垂尾低而后掠、平尾极薄、机腹只露一点主翼根——
     细节只保留能一眼认出是飞机的几个特征，不堆装饰。 */
  function glyphAircraft(ctx, s, color, p) {
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = p.border; ctx.lineWidth = 1.1;
    ctx.lineJoin = 'round';
    /* 垂直尾翼：低、明显后掠（机尾上方的三角，侧视最好认的特征） */
    ctx.beginPath();
    ctx.moveTo(-0.32 * s, -0.060 * s);
    ctx.lineTo(-0.52 * s, -0.35 * s);
    ctx.lineTo(-0.60 * s, -0.35 * s);
    ctx.lineTo(-0.60 * s, -0.040 * s);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    /* 平尾：极薄的一片，向后伸出 */
    ctx.beginPath();
    ctx.moveTo(-0.52 * s, -0.045 * s);
    ctx.lineTo(-0.76 * s, -0.070 * s);
    ctx.lineTo(-0.76 * s, -0.038 * s);
    ctx.lineTo(-0.54 * s, -0.015 * s);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    /* 主翼根部：侧视只见贴着机腹的薄剖面，向后掠一小段 */
    ctx.beginPath();
    ctx.moveTo(0.16 * s, 0.055 * s);
    ctx.lineTo(-0.06 * s, 0.055 * s);
    ctx.lineTo(-0.18 * s, 0.130 * s);
    ctx.lineTo(0.00 * s, 0.130 * s);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    /* 机身：尖机头 → 极细等直径段 → 上翘尾锥 */
    ctx.beginPath();
    ctx.moveTo(0.80 * s, -0.004 * s);
    ctx.lineTo(0.52 * s, -0.060 * s);
    ctx.lineTo(-0.30 * s, -0.066 * s);
    ctx.lineTo(-0.58 * s, -0.030 * s);
    ctx.lineTo(-0.66 * s, 0.012 * s);
    ctx.lineTo(-0.56 * s, 0.044 * s);
    ctx.lineTo(-0.28 * s, 0.060 * s);
    ctx.lineTo(0.52 * s, 0.056 * s);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    /* 座舱盖：扁扁的一小片 */
    ctx.beginPath();
    ctx.moveTo(0.24 * s, -0.055 * s);
    ctx.lineTo(0.16 * s, -0.130 * s);
    ctx.lineTo(0.04 * s, -0.135 * s);
    ctx.lineTo(-0.02 * s, -0.062 * s);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    /* 进气道（机头下方的小斜口，一笔带过） */
    ctx.beginPath();
    ctx.moveTo(0.28 * s, 0.044 * s);
    ctx.lineTo(0.14 * s, 0.044 * s);
    ctx.lineTo(0.17 * s, 0.078 * s);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    /* 机身高光：一条细白线，让细长机身有金属质感 */
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0.46 * s, -0.034 * s); ctx.lineTo(-0.30 * s, -0.040 * s); ctx.stroke();
    ctx.restore();
  }
  /* 导弹：侧视图。比例参考响尾蛇/爱国者——短粗弹身、小而后掠的尾翼 + 中段小翼，
     只用「短」和「小翼」两个特征说清它不是火箭。 */
  function glyphMissile(ctx, s, color, p) {
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = p.border; ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    /* 尾翼：小而后掠的梯形翼（响尾蛇的尾翼比例，不做大三角） */
    [-1, 1].forEach((sy) => {
      ctx.beginPath();
      ctx.moveTo(-0.42 * s, sy * 0.044 * s);
      ctx.lineTo(-0.52 * s, sy * 0.160 * s);
      ctx.lineTo(-0.58 * s, sy * 0.160 * s);
      ctx.lineTo(-0.55 * s, sy * 0.044 * s);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    /* 中段小翼（响尾蛇前部的小三角翼） */
    [-1, 1].forEach((sy) => {
      ctx.beginPath();
      ctx.moveTo(0.18 * s, sy * 0.044 * s);
      ctx.lineTo(0.08 * s, sy * 0.130 * s);
      ctx.lineTo(0.02 * s, sy * 0.130 * s);
      ctx.lineTo(0.05 * s, sy * 0.044 * s);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    /* 弹体：短卵形尖锥头 → 等直径细弹身 → 收口尾段 */
    ctx.beginPath();
    ctx.moveTo(0.66 * s, 0);
    ctx.quadraticCurveTo(0.50 * s, -0.040 * s, 0.32 * s, -0.048 * s);
    ctx.lineTo(-0.36 * s, -0.048 * s);
    ctx.lineTo(-0.50 * s, -0.030 * s);
    ctx.lineTo(-0.54 * s, 0);
    ctx.lineTo(-0.50 * s, 0.030 * s);
    ctx.lineTo(-0.36 * s, 0.048 * s);
    ctx.lineTo(0.32 * s, 0.048 * s);
    ctx.quadraticCurveTo(0.50 * s, 0.040 * s, 0.66 * s, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    /* 尾喷口 */
    ctx.fillStyle = p.border;
    ctx.beginPath();
    ctx.moveTo(-0.56 * s, -0.020 * s); ctx.lineTo(-0.50 * s, -0.017 * s);
    ctx.lineTo(-0.50 * s, 0.017 * s); ctx.lineTo(-0.56 * s, 0.020 * s);
    ctx.closePath(); ctx.fill();
    /* 弹体高光 */
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-0.34 * s, -0.024 * s); ctx.lineTo(0.34 * s, -0.024 * s); ctx.stroke();
    ctx.restore();
  }
  /* 四旋翼：正视图（沿机头方向看过去）。滚转角 φ 就是这张图绕质心的转动角。
     构型做成「机身 + 两条机臂 + 电机舱 + 四副旋翼」，一眼能认出是四旋翼：
     近侧两副旋翼实心，远侧两副压淡并向上错开一点，形成前后层次。 */
  function glyphUav(ctx, s, color, p) {
    ctx.save();
    /* 远侧两副旋翼（先画、半透明、向上错开，暗示在机身另一侧） */
    ctx.fillStyle = color;
    [-1, 1].forEach((sx) => {
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.ellipse(sx * 0.70 * s, -0.17 * s, 0.25 * s, 0.07 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    /* 机臂（两条横贯左右的粗杆，中间略低、端部略高） */
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(2.8, 0.13 * s); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.70 * s, 0.06 * s); ctx.lineTo(0, 0.0);
    ctx.lineTo(0.70 * s, 0.06 * s); ctx.stroke();
    /* 电机舱 + 近侧两副旋翼 */
    [-1, 1].forEach((sx) => {
      const mx = sx * 0.70 * s;
      /* 电机舱（竖直短柱） */
      ctx.fillStyle = color; ctx.strokeStyle = p.border; ctx.lineWidth = 1.1;
      pillPath(ctx, mx - 0.055 * s, -0.12 * s, 0.11 * s, 0.22 * s, 0.04 * s);
      ctx.fill(); ctx.stroke();
      /* 旋翼盘（实心 + 上方一道残影，表现旋转） */
      ctx.fillStyle = color; ctx.strokeStyle = p.border; ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(mx, -0.14 * s, 0.33 * s, 0.085 * s, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.ellipse(mx, -0.21 * s, 0.27 * s, 0.055 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      /* 桨毂 */
      ctx.beginPath();
      ctx.arc(mx, -0.14 * s, 0.05 * s, 0, Math.PI * 2);
      ctx.fillStyle = p.surface || '#FFFFFF'; ctx.fill();
    });
    /* 机身（中央短舱，压在机臂之上） */
    ctx.fillStyle = color; ctx.strokeStyle = p.border; ctx.lineWidth = 1.2;
    pillPath(ctx, -0.24 * s, -0.15 * s, 0.48 * s, 0.31 * s, 0.12 * s);
    ctx.fill(); ctx.stroke();
    /* 机头摄像头（正视图正对镜头）+ 天线 */
    ctx.beginPath();
    ctx.arc(0, 0.03 * s, 0.07 * s, 0, Math.PI * 2);
    ctx.fillStyle = p.surface || '#FFFFFF'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.6, 0.05 * s);
    ctx.beginPath();
    ctx.moveTo(0, -0.15 * s); ctx.lineTo(0, -0.27 * s); ctx.stroke();
    /* 起落架两条支腿 */
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.8, 0.055 * s);
    [-0.13, 0.13].forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx * s, 0.14 * s);
      ctx.lineTo(sx * 1.35 * s, 0.36 * s);
      ctx.stroke();
    });
    ctx.restore();
  }
  function paintAttitude(b) {
    const { ctx, w, h, state, target, view, p, plant } = b;
    /* 质心固定在画布中心：姿态是绕质心的转动，机体不平移 */
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w * 0.40, h * 0.38);
    const ang = clamp(state.x, -1.55, 1.55);
    const tAng = clamp(target, -1.55, 1.55);
    const glyph = view.glyph || 'aircraft';
    const size = Math.max(22, R * 0.64);
    const accent = movingColor(b);
    const u = b.u || 0;
    /* 半径分层（由内到外）：机体 → 力矩弧 → 绿色目标虚线 → 目标标记 → 量角器刻度 */
    const R_ARC = R * 0.72;      /* 力矩弧半径：起点落在蓝色当前姿态虚线上（同半径、角度=θ） */
    const R_TGT_IN = R * 0.72;   /* 绿色目标虚线内端（与力矩弧同半径，但角度=目标 r） */
    const R_TGT_OUT = R * 0.90;  /* 绿色目标虚线外端 */
    const R_MARK = R * 0.97;     /* 绿色目标标记（量角器内侧的目标位置） */
    const R_TICK = R * 1.04;     /* 量角器刻度圈 */

    /* 零位基准：过质心的水平虚线（θ = 0 的机头指向） */
    ctx.save();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = p.grid; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(14, cy); ctx.lineTo(w - 14, cy); ctx.stroke();
    ctx.restore();

    /* 量角器：每 10° 一个短刻度，30° 为主刻度（角度制，不用弧度） */
    ctx.save();
    ctx.strokeStyle = p.muted; ctx.lineWidth = 1;
    for (let d = -90; d <= 90; d += 10) {
      const a = d * Math.PI / 180;
      const major = d % 30 === 0;
      const p1 = attitudePoint(cx, cy, a, R_TICK);
      const p2 = attitudePoint(cx, cy, a, R_TICK + R * (major ? 0.06 : 0.03));
      ctx.globalAlpha = major ? 0.85 : 0.3;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    ctx.restore();
    view.ticks.forEach((tk) => {
      if (!tk) return;
      const pt = attitudePoint(cx, cy, tk, R_TICK + R * 0.13);
      label(ctx, Math.round(tk * 180 / Math.PI) + '°', pt.x, pt.y + 3, p.muted, 'center',
        '9px ui-monospace, monospace');
    });

    /* 目标姿态：绿色虚线（从质心沿目标角 r 径向延伸）+ 量角器上的绿色目标标记 */
    const gt0 = attitudePoint(cx, cy, tAng, R_TGT_IN);
    const gt1 = attitudePoint(cx, cy, tAng, R_TGT_OUT);
    ctx.save();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = p.r; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gt0.x, gt0.y); ctx.lineTo(gt1.x, gt1.y); ctx.stroke();
    ctx.setLineDash([]);
    /* 目标标记：量角器内侧的短粗绿线 + 圆点 */
    ctx.strokeStyle = p.r; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const gm0 = attitudePoint(cx, cy, tAng, R_TGT_OUT);
    const gm1 = attitudePoint(cx, cy, tAng, R_MARK);
    ctx.beginPath(); ctx.moveTo(gm0.x, gm0.y); ctx.lineTo(gm1.x, gm1.y); ctx.stroke();
    ctx.fillStyle = p.r;
    ctx.beginPath(); ctx.arc(gm1.x, gm1.y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* 当前姿态轴：从质心沿 θ 指向刻度圈的细参考线（机体外形盖在上面） */
    const ap = attitudePoint(cx, cy, ang, R * 0.99);
    ctx.save();
    ctx.strokeStyle = accent; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.45;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ap.x, ap.y); ctx.stroke();
    ctx.restore();

    /* 质心：十字 + 实心点，强调「绕质心转动」（十字画在机体之下，避免糊住外形） */
    ctx.save();
    ctx.strokeStyle = p.text; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
    ctx.stroke();
    ctx.restore();

    /* 机体：以质心为转动中心，绕 -θ 旋转（机头指向当前姿态） */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-ang);
    const painter = { aircraft: glyphAircraft, missile: glyphMissile, uav: glyphUav }[glyph] || glyphAircraft;
    const objScale = glyph === 'uav' ? 0.72 : 1;   /* 四旋翼正视图包络较宽，整体缩一档与飞机/导弹协调 */
    painter(ctx, size * objScale, accent, p);
    ctx.restore();

    /* 质心标记（压在机体之上，一个小点） */
    ctx.save();
    ctx.fillStyle = p.text;
    ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* 控制力矩：画面里唯一的箭头。
       起点落在蓝色当前姿态虚线上、随被控物体当前姿态 θ 一起转动，
       扫向方向 = 力矩方向，弧长随 |M| 增长；M > 0 表示把角度往大的方向推（抬头）。 */
    const uRef = Math.max(1, (plant.defaultActuatorLimit || 50));
    const spanA = 0.26 + 0.58 * Math.sqrt(clamp(Math.abs(u) / uRef, 0, 1));
    const dir = u >= 0 ? 1 : -1;
    const active = Math.abs(u) > 0.5;
    const aEnd = ang + dir * spanA;        /* 弧末端（姿态空间） */
    ctx.save();
    ctx.strokeStyle = p.accent;
    ctx.globalAlpha = active ? 1 : 0.5;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, R_ARC, -ang, -aEnd, dir > 0);
    ctx.stroke();
    const mTip = attitudePoint(cx, cy, aEnd, R_ARC);
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 1;
    arcHead(ctx, mTip.x, mTip.y, cx, cy, dir > 0 ? -1 : 1, 7);
    ctx.restore();

    /* M 的数值胶囊：放在弧末端的外侧（沿扫向再偏一点，避开绿色目标虚线），
       样式与 msd / 倒立摆的力数值标签一致（accent 底 + 米白字）。 */
    const radX = Math.cos(aEnd), radY = -Math.sin(aEnd);     /* 径向单位向量（屏幕坐标） */
    const tanX = -Math.sin(aEnd), tanY = -Math.cos(aEnd);    /* 切向单位向量（姿态角增大方向） */
    const lx = mTip.x + radX * 12 + tanX * 16 * dir;
    const ly = mTip.y + radY * 12 + tanY * 16 * dir;
    const text = (plant.inputSymbol || 'M') + '=' + fmt(u, 2) + ' ' + (plant.inputUnit || 'N·m');
    ctx.save();
    ctx.font = 'bold 9px ui-monospace, monospace';
    const tw = ctx.measureText(text).width;
    const pw = tw + 10, ph = 14;
    ctx.globalAlpha = active ? 0.95 : 0.6;
    ctx.fillStyle = p.accent;
    pillPath(ctx, lx - pw / 2, ly - ph / 2, pw, ph, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFF8EE';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, lx, ly + 0.5);
    ctx.restore();
  }

  function drawSimulation(p) {
    const size = syncSize(els.sim);
    if (!size) return;
    const { ctx, w, h } = size;
    const state = sim.getState();
    const target = sim.getActiveTarget();
    const impulse = sim.getImpulse();
    const plant = sim.getPlant();
    const view = getPlantView(plant.id);
    const mapX = (v) => (v - view.min) / (view.max - view.min) * w;
    const b = {
      ctx, w, h, state, target, impulse, plant, view, mapX, p,
      unit: plant.unit, u: sim.getMetrics().u,
      cartLoop: sim.getSettings().cartLoop, cartTarget: sim.getSettings().cartTarget
    };
    drawSimBackdrop(b);
    const painters = {
      spring: paintSpring, cart: paintCart, pendulum: paintPendulum, attitude: paintAttitude
    };
    (painters[view.kind] || paintSpring)(b);
    drawSimReadout(b);
  }

  /* ── 数据范围（缓存，避免每帧重复扫描） ─────────────── */
  /* angK：角度对象的显示换算系数（弧度 → 度）；其余对象为 1 */
  function collectRanges(tracks, method, angK) {
    const k = angK || 1;
    let count = 0;
    for (const t of tracks) count += t.points.length;
    const key = tracks.length + ':' + count + ':' + (tracks.length ? tracks[tracks.length - 1].id : '') + ':' + method + ':' + k;
    if (rangeCache.key === key && rangeCache.value) return rangeCache.value;

    let minT = Infinity, maxT = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minU = Infinity, maxU = -Infinity;
    let minX = Infinity, maxX = -Infinity;
    let minV = Infinity, maxV = -Infinity;
    let minC = Infinity, maxC = -Infinity;
    let minCV = Infinity, maxCV = -Infinity;
    const consider = (v, which) => {
      if (!Number.isFinite(v)) return;
      if (which === 'y') { if (v < minY) minY = v; if (v > maxY) maxY = v; }
      else if (which === 'u') { if (v < minU) minU = v; if (v > maxU) maxU = v; }
      else if (which === 'x') { if (v < minX) minX = v; if (v > maxX) maxX = v; }
      else if (which === 'v') { if (v < minV) minV = v; if (v > maxV) maxV = v; }
      else if (which === 'c') { if (v < minC) minC = v; if (v > maxC) maxC = v; }
      else if (which === 'cv') { if (v < minCV) minCV = v; if (v > maxCV) maxCV = v; }
    };
    for (const t of tracks) {
      for (let i = 0; i < t.points.length; i++) {
        const pt = t.points[i];
        if (pt.t < minT) minT = pt.t;
        if (pt.t > maxT) maxT = pt.t;
        consider(pt.x * k, 'y'); consider(pt.target * k, 'y'); consider(0, 'y');
        consider(pt.u, 'u'); consider(pt.hold, 'u'); consider(0, 'u');
        consider(pt.x * k, 'x'); consider(pt.v, 'v');
        consider(pt.xc, 'c'); consider(pt.vc, 'cv');
        if (method === 'PPC' && Number.isFinite(pt.ref)) {
          consider((pt.target + pt.ref) * k, 'y'); consider((pt.target - pt.ref) * k, 'y');
        }
        if (REF_FLOW_METHODS.indexOf(method) >= 0 && Number.isFinite(pt.ref)) consider(pt.ref * k, 'y');
      }
    }
    if (!Number.isFinite(minT)) { minT = 0; maxT = 2; }
    const span = maxT - minT;
    if (span < 0.5) maxT = minT + 0.5;
    else maxT = minT + span * 1.02;
    if (!Number.isFinite(minY)) { minY = -1; maxY = 6; }
    if (!Number.isFinite(minU)) { minU = -10; maxU = 10; }
    if (!Number.isFinite(minX)) { minX = -5; maxX = 5; }
    if (!Number.isFinite(minV)) { minV = -5; maxV = 5; }
    if (!Number.isFinite(minC)) { minC = -2; maxC = 2; }
    if (!Number.isFinite(minCV)) { minCV = -2; maxCV = 2; }
    const value = {
      x: niceRange(minT, maxT, 0.015, 6),
      y: niceRange(minY, maxY, 0.1, 5),
      u: niceRange(minU, maxU, 0.12, 5),
      px: niceRange(minX, maxX, 0.1, 5),
      pv: niceRange(minV, maxV, 0.1, 5),
      c: niceRange(minC, maxC, 0.1, 5),
      cv: niceRange(minCV, maxCV, 0.1, 5)
    };
    rangeCache = { key, value };
    return value;
  }

  function drawCrosshair(ctx, axes, p, key) {
    if (hover.key !== key || hover.x === null) return;
    const x = clamp(hover.x, axes.plot.x0, axes.plot.x1);
    ctx.save();
    ctx.strokeStyle = p.accent; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, axes.plot.y0); ctx.lineTo(x, axes.plot.y1); ctx.stroke();
    if (hover.y !== null) {
      const y = clamp(hover.y, axes.plot.y0, axes.plot.y1);
      ctx.beginPath(); ctx.moveTo(axes.plot.x0, y); ctx.lineTo(axes.plot.x1, y); ctx.stroke();
    }
    ctx.restore();
  }

  /* ── 三张曲线画布 ─────────────────────────────────── */
  function drawCharts(p) {
    const tracks = sim.getTracks();
    const active = sim.getActiveTrack();
    const method = sim.getSettings().method;
    const plant = sim.getPlant();
    const view = getPlantView(plant.id);
    /* 角度对象按度显示（人类习惯），内部计算仍用弧度 */
    const angK = view.deg ? 180 / Math.PI : 1;
    const angUnit = view.deg ? '°' : plant.unit;
    const R = collectRanges(tracks, method, angK);
    lastRange = { x: R.x, y: R.y, u: R.u, plant, view };
    const mainPts = active ? active.points : [];

    /* 01 位置响应 */
    const posSize = syncSize(els.pos);
    if (posSize) {
      const { ctx, w, h } = posSize;
      const axes = drawAxes(ctx, w, h, p, {
        x: R.x, y: R.y, xUnit: 's', xLabel: 't / s', yLabel: view.symbol + ' , r / ' + angUnit
      });
      clipPlot(ctx, axes.plot);
      plotSeries(ctx, mainPts, (pt) => pt.target * angK, p.r, axes, { width: 1.8 });
      if (REF_FLOW_METHODS.indexOf(method) >= 0) {
        plotSeries(ctx, mainPts, (pt) => pt.ref * angK, p.ref, axes, { width: 1.4, dash: [4, 4], alpha: 0.9 });
      }
      if (method === 'PPC' && mainPts.length > 1) {
        [1, -1].forEach((sign) => plotSeries(ctx, mainPts,
          (pt) => (pt.target + sign * (pt.ref || 0)) * angK, p.ref, axes,
          { width: 1, dash: [3, 3], alpha: 0.75 }));
      }
      for (const t of tracks) {
        const isActive = t === active;
        plotSeries(ctx, t.points, (pt) => pt.x * angK, isActive ? p.x : t.color, axes,
          { width: isActive ? 2.4 : 1.6, alpha: isActive ? 1 : 0.72 });
      }
      ctx.restore();
      drawCrosshair(ctx, axes, p, 'pos');
    }

    /* 02 相空间轨迹 */
    const phaseSize = syncSize(els.phase);
    if (phaseSize) {
      const { ctx, w, h } = phaseSize;
      const axes = drawAxes(ctx, w, h, p, {
        x: R.px, y: R.pv, xUnit: angUnit, xLabel: view.symbol + ' / ' + angUnit,
        yLabel: (view.rateSymbol || 'v') + ' / ' + plant.vUnit
      });
      clipPlot(ctx, axes.plot);
      for (const t of tracks) {
        const isActive = t === active;
        const pts = t.points;
        if (pts.length < 2) continue;
        ctx.save(); ctx.globalAlpha = isActive ? 1 : 0.72;
        ctx.beginPath(); ctx.strokeStyle = isActive ? p.phase : t.color; ctx.lineWidth = isActive ? 1.8 : 1.4;
        ctx.lineJoin = 'round';
        for (let i = 0; i < pts.length; i++) {
          const px = axes.mapX(pts[i].x * angK), py = axes.mapY(pts[i].v);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke(); ctx.restore();
        const last = pts[pts.length - 1];
        ctx.beginPath(); ctx.fillStyle = isActive ? p.u : t.color;
        ctx.arc(axes.mapX(last.x * angK), axes.mapY(last.v), 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      drawCrosshair(ctx, axes, p, 'phase');
    }

    /* 03 执行器输出 */
    const ctrlSize = syncSize(els.ctrl);
    if (ctrlSize) {
      const { ctx, w, h } = ctrlSize;
      const axes = drawAxes(ctx, w, h, p, {
        x: R.x, y: R.u, xUnit: 's', xLabel: 't / s',
        yLabel: (plant.inputSymbol || 'u') + ' / ' + (plant.inputUnit || 'N')
      });
      clipPlot(ctx, axes.plot);
      // 稳态保持力参考线：解释「为什么累计能耗仍会增长」
      plotSeries(ctx, mainPts, 'hold', p.accent, axes, { width: 1.2, dash: [5, 4], alpha: 0.8 });
      for (const t of tracks) {
        const isActive = t === active;
        plotSeries(ctx, t.points, 'u', isActive ? p.u : t.color, axes,
          { width: isActive ? 2 : 1.6, alpha: isActive ? 1 : 0.72 });
      }
      ctx.restore();
      drawCrosshair(ctx, axes, p, 'ctrl');
    }

    /* 04 小车位置（仅倒立摆显示，图卡隐藏时画布尺寸为 0 自动跳过） */
    const cartSize = els.cart ? syncSize(els.cart) : null;
    if (cartSize) {
      const { ctx, w, h } = cartSize;
      const axes = drawAxes(ctx, w, h, p, {
        x: R.x, y: R.c, xUnit: 's', xLabel: 't / s', yLabel: 'x_c / m'
      });
      clipPlot(ctx, axes.plot);
      const st = sim.getSettings();
      if (st.cartLoop === 'on') {
        plotSeries(ctx, mainPts, () => st.cartTarget || 0, p.r, axes, { width: 1.8 });
      }
      for (const t of tracks) {
        const isActive = t === active;
        plotSeries(ctx, t.points, 'xc', isActive ? p.x : t.color, axes,
          { width: isActive ? 2.2 : 1.6, alpha: isActive ? 1 : 0.72 });
      }
      ctx.restore();
      drawCrosshair(ctx, axes, p, 'cart');
    }

    /* 05 速度（放最后一位：重要性较低；倒立摆显示小车速度 v_c，其余对象显示质量速度 v） */
    const velSize = els.vel ? syncSize(els.vel) : null;
    if (velSize) {
      const { ctx, w, h } = velSize;
      const isPend = plant.id === 'pendulum';
      const axes = drawAxes(ctx, w, h, p, {
        x: R.x, y: isPend ? R.cv : R.pv, xUnit: 's', xLabel: 't / s',
        yLabel: (isPend ? 'v_c' : (view.rateSymbol || 'v')) + ' / ' + plant.vUnit
      });
      clipPlot(ctx, axes.plot);
      const vKey = isPend ? 'vc' : 'v';
      for (const t of tracks) {
        const isActive = t === active;
        plotSeries(ctx, t.points, vKey, isActive ? p.x : t.color, axes,
          { width: isActive ? 2.2 : 1.6, alpha: isActive ? 1 : 0.72 });
      }
      ctx.restore();
      drawCrosshair(ctx, axes, p, 'vel');
    }
  }

  function draw() {
    if (!els) init();
    const p = theme();
    drawSimulation(p);
    drawCharts(p);
  }

  /* ── 悬停读数 ─────────────────────────────────────── */
  function nearestPoint(x, w) {
    const active = sim.getActiveTrack();
    const pts = active ? active.points : [];
    if (!pts.length || !lastRange) return null;
    const plotW = Math.max(1, w - PAD.l - PAD.r);
    const ratio = clamp((x - PAD.l) / plotW, 0, 1);
    const targetT = lastRange.x.min + ratio * (lastRange.x.max - lastRange.x.min);
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid].t < targetT) lo = mid + 1; else hi = mid; }
    return pts[lo] || null;
  }

  function bindHover() {
    ['pos', 'phase', 'ctrl', 'cart', 'vel'].forEach((key) => {
      const canvas = els[key];
      if (!canvas) return;
      const wrap = canvas.parentElement;
      const tip = wrap ? wrap.querySelector('.chart-tooltip') : null;
      canvas.addEventListener('mousemove', (ev) => {
        const rect = canvas.getBoundingClientRect();
        const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
        hover = { key, x, y };
        const pt = nearestPoint(x, rect.width);
        const plantR = lastRange ? lastRange.plant : null;
        const viewR = lastRange ? lastRange.view : null;
        const unit = plantR ? plantR.unit : 'm';
        const vUnit = plantR ? plantR.vUnit : 'm/s';
        const sym = (viewR && viewR.symbol) || 'x';
        const rateSym = (viewR && viewR.rateSymbol) || 'v';
        const uSym = (plantR && plantR.inputSymbol) || 'u';
        const uUnit = (plantR && plantR.inputUnit) || 'N';
        /* 角度对象按度显示 */
        const degMode = !!(viewR && viewR.deg);
        const k = degMode ? 180 / Math.PI : 1;
        const angUnit = degMode ? '°' : unit;
        if (tip && pt) {
          let text;
          if (key === 'phase') text = sym + ' = ' + fmt(pt.x * k, 2) + ' ' + angUnit + '\n' + rateSym + ' = ' + fmt(pt.v, 3) + ' ' + vUnit;
          else if (key === 'ctrl') text = 't = ' + fmt(pt.t, 2) + ' s\n' + uSym + ' = ' + fmt(pt.u, 2) + ' ' + uUnit +
            '\n保持量 = ' + fmt(pt.hold, 2) + ' ' + uUnit;
          else if (key === 'cart') text = 't = ' + fmt(pt.t, 2) + ' s\nx_c = ' + fmt(pt.xc || 0, 3) + ' m';
          else if (key === 'vel') {
            const isPend = plantR && plantR.id === 'pendulum';
            text = 't = ' + fmt(pt.t, 2) + ' s\n' + (isPend ? 'v_c' : rateSym) + ' = ' +
              fmt(isPend ? (pt.vc || 0) : pt.v, 3) + ' ' + vUnit;
          }
          else text = 't = ' + fmt(pt.t, 2) + ' s\n' + sym + ' = ' + fmt(pt.x * k, 2) + ' ' + angUnit +
            '\nr = ' + fmt(pt.target * k, 2) + ' ' + angUnit;
          tip.textContent = text;
          tip.hidden = false;
          tip.style.left = clamp(x + 12, 4, Math.max(4, rect.width - 140)) + 'px';
          tip.style.top = clamp(y + 12, 4, Math.max(4, rect.height - 68)) + 'px';
        }
        sim.markDirty();
      }, { passive: true });
      canvas.addEventListener('mouseleave', () => {
        hover = { key: null, x: null, y: null };
        if (tip) tip.hidden = true;
        sim.markDirty();
      }, { passive: true });
    });
  }

  /* ── 导出：CSV 与 PNG（Blob，无外部依赖） ──────────── */
  function download(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const a = doc.createElement('a');
      a.href = url; a.download = filename;
      doc.body.appendChild(a); a.click(); a.remove();
      global.setTimeout(() => URL.revokeObjectURL(url), 1500);
      return true;
    } catch (err) {
      console.error('导出失败：浏览器不支持 Blob 下载。', err);
      return false;
    }
  }

  function exportCSV() {
    const tracks = sim.getTracks();
    const rows = ['track,method,plant,t,x,v,u,target,ref,hold_force,x_c,v_c'];
    const plantId = sim.getSettings().plantId;
    for (const t of tracks) {
      for (let i = 0; i < t.points.length; i++) {
        const pt = t.points[i];
        rows.push([
          t.label, JSON.stringify(t.method), plantId, pt.t.toFixed(3), pt.x.toFixed(6),
          pt.v.toFixed(6), pt.u.toFixed(6), pt.target.toFixed(6),
          Number.isFinite(pt.ref) ? pt.ref.toFixed(6) : '',
          Number.isFinite(pt.hold) ? pt.hold.toFixed(6) : '',
          (pt.xc || 0).toFixed(6),
          (pt.vc || 0).toFixed(6)
        ].join(','));
      }
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return download(new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }),
      'ctrl-sim-' + stamp + '.csv');
  }

  function exportPNG() {
    try {
      const p = theme();
      const ids = ['canvas-pos', 'canvas-phase', 'canvas-ctrl', 'canvas-cart', 'canvas-vel'];
      const sources = ids.map((id) => doc.getElementById(id))
        .filter((c) => c && c.offsetParent !== null);
      if (!sources.length) return false;
      const gap = 12, pad = 16, head = 46;
      const heights = sources.map((c) => c.height);
      const ch = Math.max.apply(null, heights);
      const widths = sources.map((c) => c.width);
      const out = doc.createElement('canvas');
      out.width = pad * 2 + widths.reduce((a, b) => a + b, 0) + gap * (sources.length - 1);
      out.height = pad * 2 + head + ch;
      const ctx = out.getContext('2d');
      ctx.fillStyle = p.surface; ctx.fillRect(0, 0, out.width, out.height);
      ctx.fillStyle = p.text; ctx.font = 'bold 20px sans-serif';
      ctx.fillText('控制理论模拟器 V3.0 · ' + sim.getSettings().method + ' · ' + sim.getPlant().name, pad, pad + 20);
      ctx.fillStyle = p.muted; ctx.font = '12px sans-serif';
      ctx.fillText(new Date().toLocaleString(), pad, pad + 38);
      let x = pad;
      sources.forEach((canvas, i) => {
        const y = pad + head;
        ctx.strokeStyle = p.border; ctx.lineWidth = 1;
        ctx.strokeRect(x - 1, y - 1, widths[i] + 2, heights[i] + 2);
        ctx.drawImage(canvas, x, y, widths[i], heights[i]);
        x += widths[i] + gap;
      });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      out.toBlob((blob) => {
        if (blob) download(blob, 'ctrl-sim-charts-' + stamp + '.png');
        else console.error('导出失败：无法生成 PNG。');
      }, 'image/png');
      return true;
    } catch (err) {
      console.error('导出失败：无法合成图表图片。', err);
      return false;
    }
  }

  NS.charts = { init, draw, resize, refreshTheme, exportCSV, exportPNG, download, getPlantView };
})(window);
