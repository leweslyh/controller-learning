/* ============================================================
   app.js — 编排层（唯一持有可写状态入口）
   初始化、订阅、固定步长主循环、快捷键、持久化、分享与导出。
   V4.0：159 法 / 12 类、原论文出处、被控对象切换、分享链接含对象参数。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim;
  const D = NS.data;
  const sim = NS.sim;
  const charts = NS.charts;
  const ui = NS.ui;
  const doc = global.document;
  const STORAGE_KEY = 'ctrlsim.v4.prefs';
  const LEGACY_STORAGE_KEY = 'ctrlsim.v3.prefs';
  const VERSION = D.VERSION;

  let prefs = loadPrefs();
  let rafId = null;
  let lastTime = 0;
  let frameCount = 0;
  /* 一键最优求解前的参数快照：用于撤销（V5.1 修复 E-12） */
  let solveSnapshot = null;

  /* ── 偏好持久化（能力降级，不因 file:// 限制而报错） ── */
  function loadPrefs() {
    const base = { favorites: [], recent: [], theme: 'light', guideDismissed: false };
    try {
      let raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      /* V4 换了存储键；首次升级时沿用 V3 的收藏/主题，避免用户偏好丢失 */
      if (!raw && global.localStorage) raw = global.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      return {
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((k) => D.CONTROLLER_CONFIGS[k]) : [],
        recent: Array.isArray(parsed.recent) ? parsed.recent.filter((k) => D.CONTROLLER_CONFIGS[k]) : [],
        theme: parsed.theme === 'dark' ? 'dark' : 'light',
        guideDismissed: !!parsed.guideDismissed
      };
    } catch (err) {
      console.warn('偏好读取失败，使用默认值。', err);
      return base;
    }
  }
  function savePrefs() {
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (err) {
      console.warn('偏好保存失败（可能受本地文件权限限制）。', err);
    }
  }

  function statusInfo() {
    const s = sim.getSettings();
    return {
      running: s.running, t: sim.getState().t, frozen: sim.isFrozen(),
      compare: sim.isCompareMode(), speed: s.speed
    };
  }
  function refreshAll() {
    charts.draw();
    ui.updateMetrics(sim.getMetrics());
    ui.updateStatus(statusInfo());
    ui.renderTracks();
    ui.renderLegend();
  }
  function touch() { sim.markDirty(); }

  /* ── 编排层动作 ───────────────────────────────────── */
  function selectMethod(key) {
    if (!D.CONTROLLER_CONFIGS[key] || !sim.setMethod(key)) return;
    solveSnapshot = null;
    ui.setSolveUndo(false);
    prefs.recent = [key].concat(prefs.recent.filter((k) => k !== key)).slice(0, 12);
    savePrefs();
    ui.setRecent(prefs.recent);
    ui.setActiveMethod(key);
    refreshAll();
    ui.toast('已切换：' + D.CONTROLLER_CONFIGS[key].name);
  }

  function changeParam(key, value, store, needReset) {
    const effective = sim.setParam(key, value, store);
    /* 内核钳制后的有效值回显到滑块/数值框，保证界面与状态一致 */
    if (typeof effective === 'number') ui.syncParamControl(key, effective);
    const shouldReset = !!needReset || key === 'initialX';
    if (shouldReset) {
      sim.resetSim();
      ui.renderParams();
      ui.renderTracks();
    }
    touch();
    refreshAll();
  }

  function toggleRun() { sim.toggleRun(); touch(); }
  function step() {
    sim.setRunning(false);
    sim.stepOnce();
    ui.updateMetrics(sim.getMetrics());
    ui.updateStatus(statusInfo());
    charts.draw();
  }
  function disturb() {
    sim.triggerDisturbance(); touch();
    /* 扰动幅值随对象缩放：平移对象 150 N，姿态对象 150×0.06 = 9 N·m */
    const plant = sim.getPlant();
    const mag = 150 * (plant.disturbanceScale || 1);
    ui.toast('已施加 ' + mag + ' ' + (plant.inputUnit || 'N') + ' 脉冲扰动');
  }
  function reset() {
    sim.resetSim();
    ui.renderParams();
    ui.renderTracks();
    refreshAll();
    ui.toast('仿真已重置');
  }
  function rerecord() { sim.rerecord(); touch(); refreshAll(); ui.toast('已开始重新录制'); }
  function resetParams() {
    sim.resetParams();
    solveSnapshot = null;
    ui.setSolveUndo(false);
    ui.renderPlant();
    ui.renderParams();
    ui.renderTracks();
    refreshAll();
    ui.toast('全部参数已恢复默认');
  }
  /* 实验参数下某个子卡片的「恢复本组」：只动这一组，其他参数保持不动 */
  function resetParamGroup(id) {
    if (!sim.resetParamGroup(id)) return;
    ui.renderPlant();
    ui.renderParams();
    ui.renderTracks();
    refreshAll();
    const section = (D.PARAM_SECTIONS || []).find((s) => s.id === id);
    const name = id === 'plant'
      ? '被控对象属性 · ' + sim.getPlant().name
      : (section ? section.title : '该组参数');
    ui.toast('「' + name + '」已恢复默认');
  }

  function setSpeed(value) { sim.setSpeed(value); ui.updateStatus(statusInfo()); }

  function toggleCompare() {
    const next = !sim.isCompareMode();
    sim.setCompareMode(next);
    ui.updateStatus(statusInfo());
    ui.renderTracks();
    ui.renderLegend();
    ui.toast(next ? 'A/B 对比已开启：切换控制器将叠加新轨迹' : 'A/B 对比已关闭');
  }

  function applyPreset(id) {
    const preset = D.PRESETS.find((p) => p.id === id);
    if (!preset || !sim.applyPreset(preset)) return;
    solveSnapshot = null;
    ui.setSolveUndo(false);
    prefs.recent = [preset.method].concat(prefs.recent.filter((k) => k !== preset.method)).slice(0, 12);
    savePrefs();
    ui.setRecent(prefs.recent);
    ui.setActiveMethod(preset.method);
    ui.renderPlant();
    ui.renderParams();
    refreshAll();
    ui.toast('已加载场景：' + preset.title);
  }

  /* ── 一键最优增益求解（移植自 index(14).html 的 handleSolveOptimalCurrent） ──
     求解是同步计算：先让 toast 绘制出来，再在下一帧跑寻优，避免界面看起来卡死。
     V5.1：增加不可行判定与求解前快照；toast 回报可观测指标而非内部代价。 */
  function solveOptimal() {
    const s = sim.getSettings();
    const name = (D.CONTROLLER_CONFIGS[s.method] || {}).name || s.method;
    ui.toast('正在为「' + name + '」求解最优增益…');
    global.setTimeout(() => {
      const before = { ...s.ctrlParams };
      const res = sim.optimizeGains();
      if (res.feasible === false) {
        solveSnapshot = null;
        ui.setSolveUndo(false);
        ui.toast('未找到满足收敛要求的增益：该方法在当前对象/工况下不可达，建议更换方法或对象');
        return;
      }
      solveSnapshot = { method: s.method, plant: s.plantId, params: before };
      s.ctrlParams = res.params;
      sim.resetSim();
      ui.markSolved(s.method);   /* 重绘增益卡并露出「求解原理 · 教学文档」入口 */
      ui.setSolveUndo(true);
      ui.renderTracks();
      refreshAll();
      const errTxt = Number.isFinite(res.finalError) ? res.finalError.toFixed(3) : '—';
      ui.toast('已按「' + res.ruleName + '」求解：末段误差 ' + errTxt +
        '，超调 ' + Number(res.overshoot || 0).toFixed(1) + '%' +
        (res.improvePct > 0.5 ? '（代价下降 ' + res.improvePct.toFixed(1) + '%）' : ''));
    }, 40);
  }

  /* 撤销一键求解：恢复求解前的整组增益（仅当方法与对象未切换时有效） */
  function undoSolve() {
    if (!solveSnapshot) { ui.toast('没有可撤销的求解记录'); return; }
    const s = sim.getSettings();
    if (s.method !== solveSnapshot.method || s.plantId !== solveSnapshot.plant) {
      solveSnapshot = null;
      ui.setSolveUndo(false);
      ui.toast('方法与对象已切换，求解记录已失效');
      return;
    }
    s.ctrlParams = { ...solveSnapshot.params };
    solveSnapshot = null;
    sim.resetSim();
    ui.setSolveUndo(false);
    ui.renderParams();
    ui.renderTracks();
    refreshAll();
    ui.toast('已撤销求解，恢复求解前的参数');
  }

  /* 打开「一键最优增益求解」的原理专题（public/docs/guides/001-最优增益求解原理.md） */
  function openSolveGuide() {
    if (NS.docs && NS.docs.openGuide) NS.docs.openGuide('optimal-gain');
    else ui.toast('原理文档未打包：请运行 node tools/build-docs.js');
  }

  /* ── 经典对决预设（移植自 index(14).html 的 PRESET_COMPARISONS） ── */
  function applyDuel(id, optimize) {
    const duel = (D.DUELS || []).find((d) => d.id === id);
    if (!duel) return;
    ui.toast('正在推演 ' + duel.label + (optimize ? '（含最优增益求解）' : '') + '…');
    global.setTimeout(() => {
      const res = sim.duel(duel.a, duel.b, { optimize: !!optimize, seconds: 3.5 });
      if (!res) { ui.toast('对决失败：方法键不存在'); return; }
      prefs.recent = [duel.b, duel.a].concat(prefs.recent.filter((k) => k !== duel.a && k !== duel.b)).slice(0, 12);
      savePrefs();
      ui.setRecent(prefs.recent);
      ui.setActiveMethod(duel.b);
      ui.renderTracks();
      refreshAll();
      ui.toast('对决完成：' + duel.label + ' · A/B 曲线已叠加');
    }, 40);
  }

  function toggleFavorite(key) {
    if (!D.CONTROLLER_CONFIGS[key]) return;
    const i = prefs.favorites.indexOf(key);
    if (i >= 0) prefs.favorites.splice(i, 1); else prefs.favorites.push(key);
    savePrefs();
    ui.setFavorites(prefs.favorites);
    ui.toast(i >= 0 ? '已取消收藏' : '已加入收藏');
  }

  function selectPlant(id) {
    if (!sim.setPlant(id)) return;
    solveSnapshot = null;
    ui.setSolveUndo(false);
    ui.renderPlant();
    ui.renderProfile(sim.getSettings().method);
    ui.renderParams();
    ui.renderLegend();
    refreshAll();
    ui.toast('已切换被控对象：' + sim.getPlant().name);
  }

  function toggleTheme() {
    prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';
    savePrefs();
    ui.setTheme(prefs.theme);
    touch();
  }

  function dismissGuide(noMore) {
    prefs.guideDismissed = !!noMore;
    savePrefs();
  }

  /* ── 导出与分享 ───────────────────────────────────── */
  function exportFormulaBook() {
    const md = NS.math.buildFormulaBook(D);
    const ok = charts.download(
      new Blob(['\ufeff' + md], { type: 'text/markdown;charset=utf-8' }),
      'ctrl-sim-formulas.md'
    );
    ui.toast(ok ? '公式手册 Markdown 已导出' : '公式手册导出失败');
  }

  function exportCSV() {
    const ok = charts.exportCSV();
    ui.toast(ok ? 'CSV 实验数据已导出' : 'CSV 导出失败');
  }
  function exportPNG() {
    const ok = charts.exportPNG();
    ui.toast(ok ? '正在生成图表 PNG…' : 'PNG 导出失败');
  }

  /* 导出 159 法的论文出处清单（含核验状态），CSV 字段统一加双引号转义 */
  function exportPapers() {
    const P = NS.papers;
    if (!P || !P.getPaper) { ui.toast('论文数据未加载'); return; }
    const cell = (v) => '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"';
    const head = ['方法键', '方法名称', '分类', '作者', '题名', '出处', '链接', '核验状态', '核验说明'];
    const rows = D.methodList.map((key) => {
      const conf = D.CONTROLLER_CONFIGS[key] || {};
      const p = P.getPaper(key) || {};
      const v = (P.getVerify && P.getVerify(key)) || {};
      return [key, conf.name || '', conf.category || '', p.authors || '', p.title || '',
        p.journal || '', p.url || '', v.status || 'unverified', v.reason || ''].map(cell).join(',');
    });
    const csv = '\ufeff' + head.map(cell).join(',') + '\r\n' + rows.join('\r\n') + '\r\n';
    const ok = charts.download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'ctrl-sim-papers.csv');
    ui.toast(ok ? '已导出 159 法论文出处 CSV' : '论文出处导出失败');
  }

  function buildHash() {
    const s = sim.getSettings();
    const env = {};
    ['targetMode', 'initialX', 'contDisturbance', 'actuatorLimit', 'sensorNoise',
      'coulombFriction', 'actuatorDeadzone', 'plantDelay', 'speed',
      'balanceAssist', 'cartLoop', 'cartTarget', 'cartKp', 'cartKd', 'cartThetaMax'].forEach((k) => { env[k] = s[k]; });
    const payload = {
      v: VERSION, m: s.method, c: s.ctrlParams, p: s.physParams, e: env,
      plant: s.plantId, pp: s.plantParams
    };
    return '#s=' + encodeURIComponent(JSON.stringify(payload));
  }

  function fallbackCopy(text) {
    const ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    doc.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = doc.execCommand('copy'); } catch (err) { ok = false; }
    ta.remove();
    return ok;
  }

  function share() {
    const hash = buildHash();
    const base = global.location.href.split('#')[0];
    const url = base + hash;
    try {
      if (global.history && global.history.replaceState) global.history.replaceState(null, '', hash);
      else global.location.hash = hash;
    } catch (err) {
      try { global.location.hash = hash; } catch (ignored) { /* file:// 限制，仍可复制文本 */ }
    }
    const done = (ok) => ui.toast(ok ? '实验参数链接已复制到剪贴板' : '参数已写入地址栏，请手动复制');
    if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(url).then(
        () => done(true),
        () => done(fallbackCopy(url))
      );
    } else {
      done(fallbackCopy(url));
    }
  }

  function restoreFromHash() {
    const match = /^#s=(.+)$/.exec(global.location.hash || '');
    if (!match) return false;
    try {
      const payload = JSON.parse(decodeURIComponent(match[1]));
      if (!payload || !D.CONTROLLER_CONFIGS[payload.m]) return false;
      const s = sim.getSettings();
      /* 分享链接一律走 setParam：保留范围钳制、NaN 拒绝与执行器联动，
         避免构造链接直接写入越界值或非有限数（旧实现直接改 settings）。 */
      if (payload.plant && D.PLANTS[payload.plant]) {
        /* 必须走 setPlant：否则执行器限幅/初值/单位仍停留在上一个对象，
           分享链接会把 uav 的 20 N·m 限幅恢复成默认 200（V5.1 修复） */
        sim.setPlant(payload.plant);
      }
      if (payload.pp && typeof payload.pp === 'object') {
        Object.keys(payload.pp).forEach((id) => {
          const values = payload.pp[id];
          if (!D.PLANTS[id] || !values || typeof values !== 'object') return;
          if (id === s.plantId) {
            Object.keys(values).forEach((k) => sim.setParam(k, values[k], 'plant'));
            return;
          }
          /* 非当前对象的参数先缓存，切回该对象时生效；只接受有限数值或字符串 */
          if (!s.plantParams[id]) s.plantParams[id] = {};
          Object.keys(values).forEach((k) => {
            const v = values[k];
            if (typeof v === 'number' ? Number.isFinite(v) : typeof v === 'string') s.plantParams[id][k] = v;
          });
        });
      }
      if (payload.p && typeof payload.p === 'object') {
        Object.keys(payload.p).forEach((k) => sim.setParam(k, payload.p[k], 'phys'));
      }
      if (payload.e && typeof payload.e === 'object') {
        Object.keys(payload.e).forEach((k) => {
          if (k !== 'speed' && k in s) sim.setParam(k, payload.e[k]);
        });
        if (Number.isFinite(payload.e.speed)) sim.setSpeed(payload.e.speed);
      }
      sim.setMethod(payload.m);
      if (payload.c && typeof payload.c === 'object') {
        Object.keys(payload.c).forEach((k) => {
          if (k in s.ctrlParams) sim.setParam(k, payload.c[k], 'ctrl');
        });
      }
      sim.resetSim(payload.m, s.physParams.target, s.initialX);
      ui.setActiveMethod(payload.m);
      ui.renderPlant();
      ui.renderParams();
      ui.toast('已从分享链接还原实验参数');
      return true;
    } catch (err) {
      console.warn('分享参数解析失败，已使用默认实验。', err);
      return false;
    }
  }

  /* ── 快捷键 ───────────────────────────────────────── */
  function bindShortcuts() {
    doc.addEventListener('keydown', (ev) => {
      const el = ev.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' || el.isContentEditable);
      /* Ctrl/Cmd+Z：撤销一键求解（输入框内保留浏览器原生撤销） */
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === 'z' || ev.key === 'Z')) {
        if (!typing && solveSnapshot) { ev.preventDefault(); undoSolve(); }
        return;
      }
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key === 'Escape') return;
      if (typing) return;
      /* 焦点在原生交互元素上时，空格交给元素自身（尤其 <summary> 的展开/收起），
         否则会被「启动/暂停」快捷键 preventDefault 掉，键盘用户无法操作折叠块。 */
      if (ev.key === ' ' && el && (el.tagName === 'SUMMARY' || el.tagName === 'BUTTON' || el.tagName === 'A')) return;
      switch (ev.key) {
        case ' ': ev.preventDefault(); toggleRun(); break;
        case 'ArrowRight': ev.preventDefault(); step(); break;
        case '/': {
          /* 聚焦左栏搜索；目录处于挂起态时先展开 */
          ev.preventDefault();
          const ws = doc.getElementById('workspace');
          if (ws && ws.classList.contains('is-browser-collapsed') && NS.rails && NS.rails.toggleLeft) NS.rails.toggleLeft();
          const box = doc.getElementById('browser-search');
          if (box) box.focus();
          break;
        }
        case 'r': case 'R': reset(); break;
        case 'd': case 'D': disturb(); break;
        case 'o': case 'O': solveOptimal(); break;
        case '1': setSpeed(1); break;
        case '2': setSpeed(2); break;
        case '4': setSpeed(4); break; // 快捷预设；精细调节用速度滑块
        case 's': case 'S': share(); break;
        case 'e': case 'E': exportCSV(); break;
        case 'm': case 'M': ui.renderPlantModel(); ui.openOverlayById('overlay-plant'); break;
        case 'g': case 'G': ui.openOverlayById('overlay-glossary'); break;
        case 'p': case 'P': ui.openOverlayById('overlay-presets'); break;
        case 'l': case 'L': ui.renderLearnPath(); ui.openOverlayById('overlay-learn'); break;
        case '?': ui.openOverlayById('overlay-help'); break;
        default: break;
      }
    });
  }

  /* ── 主循环 ───────────────────────────────────────── */
  function loop(now) {
    const delta = lastTime ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    sim.advance(delta);
    if (sim.consumeDirty()) {
      charts.draw();
      ui.updateMetrics(sim.getMetrics());
      ui.updateStatus(statusInfo());
      if (++frameCount % 12 === 0) ui.renderTracks();
    }
    rafId = global.requestAnimationFrame(loop);
  }

  function handleVisibility() {
    if (doc.hidden) {
      if (rafId) global.cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      lastTime = 0;
      rafId = global.requestAnimationFrame(loop);
    }
  }

  /* ── 初始化 ───────────────────────────────────────── */
  function init() {
    try {
      charts.init();
      ui.init({
        selectMethod, changeParam, toggleRun, step, disturb, reset, rerecord,
        resetParams, resetParamGroup, setSpeed, toggleCompare, applyPreset, applyDuel, solveOptimal, undoSolve, openSolveGuide, toggleFavorite,
        toggleTheme, dismissGuide, exportCSV, exportPNG, exportFormulaBook, exportPapers, share,
        selectPlant
      });
      ui.setTheme(prefs.theme);
      ui.setFavorites(prefs.favorites);
      ui.setRecent(prefs.recent);
      ui.setActiveMethod(sim.getSettings().method);
      restoreFromHash();
      bindShortcuts();
      doc.addEventListener('visibilitychange', handleVisibility);
      refreshAll();
      /* 教学文档 2.9 MB 不阻塞首屏：空闲时预取，首次打开阅读器时立即可用 */
      if (NS.docs && NS.docs.ensureDocs) {
        if (global.requestIdleCallback) global.requestIdleCallback(() => NS.docs.ensureDocs(), { timeout: 4000 });
        else global.setTimeout(() => NS.docs.ensureDocs(), 2500);
      }
      if (!prefs.guideDismissed) ui.openOverlay('overlay-guide');
      rafId = global.requestAnimationFrame(loop);
    } catch (err) {
      console.error('控制理论模拟器初始化失败：请确认 index.html 与 js/ 目录下的脚本完整。', err);
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  NS.app = { init, refreshAll, share, buildHash, restoreFromHash, exportPapers, solveOptimal, undoSolve, applyDuel };
})(window);
