/* ============================================================
   rails.js — 侧栏挂起 / 展开与专注模式
   规则：首次进入（本浏览器第一次打开本实验台）左栏展开；
        此后默认收起为贴边简略条，手动展开只在本次会话有效。
   独立模块，自动挂载；不改动 ui.js / app.js 的主流程。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const doc = global.document;
  const VISIT_KEY = 'ctrlsim.rails.visited';
  let leftCollapsed = false;
  let rightCollapsed = false;

  function readVisited() {
    try {
      return !!((global.localStorage && global.localStorage.getItem(VISIT_KEY)) ||
        (global.sessionStorage && global.sessionStorage.getItem(VISIT_KEY)));
    } catch (err) { return false; }
  }
  function markVisited() {
    try {
      if (global.localStorage) global.localStorage.setItem(VISIT_KEY, '1');
      if (global.sessionStorage) global.sessionStorage.setItem(VISIT_KEY, '1');
    } catch (err) { /* file:// 下存储不可用时静默降级 */ }
  }

  function apply() {
    const ws = doc.getElementById('workspace');
    if (!ws) return;
    ws.classList.toggle('is-browser-collapsed', leftCollapsed);
    ws.classList.toggle('is-inspector-collapsed', rightCollapsed);
    const b = doc.getElementById('browser');
    const i = doc.getElementById('inspector');
    if (b) b.setAttribute('aria-expanded', String(!leftCollapsed));
    if (i) i.setAttribute('aria-expanded', String(!rightCollapsed));
    const focus = doc.getElementById('btn-focus');
    if (focus) focus.setAttribute('aria-pressed', String(leftCollapsed && rightCollapsed));
    // 列宽变化后让画布按新的像素尺寸重绘
    if (NS.charts && NS.charts.resize) NS.charts.resize();
    if (NS.sim && NS.sim.markDirty) NS.sim.markDirty();
  }

  function set(left, right) {
    leftCollapsed = !!left;
    rightCollapsed = !!right;
    apply();
  }
  function toggleLeft() { set(!leftCollapsed, rightCollapsed); }
  function toggleRight() { set(leftCollapsed, !rightCollapsed); }
  function toggleFocus() {
    const on = !(leftCollapsed && rightCollapsed);
    set(on, on);
  }

  function mount() {
    if (!doc.getElementById('workspace')) return;
    const firstVisit = !readVisited();
    markVisited();
    // 首次进入展开目录；其余时候默认贴边挂起
    leftCollapsed = !firstVisit;
    rightCollapsed = false;
    apply();

    const on = (id, fn) => {
      const el = doc.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };
    on('btn-browser-expand', toggleLeft);
    on('btn-browser-collapse', toggleLeft);
    on('btn-inspector-expand', toggleRight);
    on('btn-inspector-collapse', toggleRight);
    on('btn-focus', toggleFocus);

    doc.addEventListener('click', (ev) => {
      const item = ev.target.closest('.method-item[data-method]');
      if (item) return;
      if (ev.target.closest('#btn-sim-guide')) {
        if (NS.docs && NS.docs.open && NS.sim && NS.sim.getSettings) {
          NS.docs.open(NS.sim.getSettings().method);
        }
      }
    });

    doc.addEventListener('keydown', (ev) => {
      if (ev.key !== 'f' && ev.key !== 'F') return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const tag = ev.target && ev.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (ev.target && ev.target.isContentEditable) return;
      toggleFocus();
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();

  NS.rails = {
    set, toggleLeft, toggleRight, toggleFocus,
    state: () => ({ leftCollapsed, rightCollapsed })
  };
})(window);
