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
  const VERSION = '4.0';

  let prefs = loadPrefs();
  let rafId = null;
  let lastTime = 0;
  let frameCount = 0;

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
    prefs.recent = [key].concat(prefs.recent.filter((k) => k !== key)).slice(0, 12);
    savePrefs();
    ui.setRecent(prefs.recent);
    ui.setActiveMethod(key);
    refreshAll();
    ui.toast('已切换：' + D.CONTROLLER_CONFIGS[key].name);
  }

  function changeParam(key, value, store, needReset) {
    sim.setParam(key, value, store);
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
  function disturb() { sim.triggerDisturbance(); touch(); ui.toast('已施加 150 N 脉冲扰动'); }
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
    ui.renderPlant();
    ui.renderParams();
    ui.renderTracks();
    refreshAll();
    ui.toast('全部参数已恢复默认');
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
    prefs.recent = [preset.method].concat(prefs.recent.filter((k) => k !== preset.method)).slice(0, 12);
    savePrefs();
    ui.setRecent(prefs.recent);
    ui.setActiveMethod(preset.method);
    ui.renderPlant();
    ui.renderParams();
    refreshAll();
    ui.toast('已加载场景：' + preset.title);
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
      'coulombFriction', 'actuatorDeadzone', 'plantDelay', 'speed'].forEach((k) => { env[k] = s[k]; });
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
      if (payload.plant && D.PLANTS[payload.plant]) {
        s.plantId = payload.plant;
        if (payload.pp && typeof payload.pp === 'object') {
          Object.keys(payload.pp).forEach((id) => {
            if (!s.plantParams[id]) s.plantParams[id] = {};
            Object.assign(s.plantParams[id], payload.pp[id]);
          });
        }
      }
      if (payload.p) Object.assign(s.physParams, payload.p);
      if (payload.e) {
        Object.keys(payload.e).forEach((k) => {
          if (k !== 'speed' && k in s) s[k] = payload.e[k];
        });
        if (Number.isFinite(payload.e.speed)) sim.setSpeed(payload.e.speed);
      }
      sim.setMethod(payload.m);
      if (payload.c) {
        Object.keys(payload.c).forEach((k) => {
          if (k in s.ctrlParams) s.ctrlParams[k] = payload.c[k];
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
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const el = ev.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' || el.isContentEditable);
      if (ev.key === 'Escape') return;
      if (typing) return;
      /* 焦点在原生交互元素上时，空格交给元素自身（尤其 <summary> 的展开/收起），
         否则会被「启动/暂停」快捷键 preventDefault 掉，键盘用户无法操作折叠块。 */
      if (ev.key === ' ' && el && (el.tagName === 'SUMMARY' || el.tagName === 'BUTTON' || el.tagName === 'A')) return;
      switch (ev.key) {
        case ' ': ev.preventDefault(); toggleRun(); break;
        case 'ArrowRight': ev.preventDefault(); step(); break;
        case 'r': case 'R': reset(); break;
        case 'd': case 'D': disturb(); break;
        case '1': setSpeed(1); break;
        case '2': setSpeed(2); break;
        case '4': setSpeed(4); break;
        case 's': case 'S': share(); break;
        case 'e': case 'E': exportCSV(); break;
        case 'm': case 'M': ui.renderPlantModel(); ui.openOverlayById('overlay-plant'); break;
        case 'g': case 'G': ui.openOverlayById('overlay-glossary'); break;
        case 'p': case 'P': ui.openOverlayById('overlay-presets'); break;
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
        resetParams, setSpeed, toggleCompare, applyPreset, toggleFavorite,
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
      if (!prefs.guideDismissed) ui.openOverlay('overlay-guide');
      rafId = global.requestAnimationFrame(loop);
    } catch (err) {
      console.error('控制理论模拟器初始化失败：请确认 index.html 与 js/ 目录下的脚本完整。', err);
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  NS.app = { init, refreshAll, share, buildHash, restoreFromHash, exportPapers };
})(window);
