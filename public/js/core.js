/* ============================================================
   core.js — 跨模块共用工具（无状态、无副作用、零依赖）
   必须在其余 js 之前加载：data.js 之后的模块统一从这里取
   esc / icon / clamp / clampFinite / fmt / $，避免各文件各写一份。
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const doc = global.document || null;

  /* HTML 转义：null/undefined 一律视为空串，供 innerHTML 拼接前调用 */
  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* 内联 SVG 图标（sprite 定义在 index.html 顶部） */
  function icon(name) {
    return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }

  /* 普通钳制：非有限值原样参与 Math.min/max（调用方需自行保证有限性） */
  function clamp(value, lo, hi) { return Math.max(lo, Math.min(hi, value)); }

  /* 有限性钳制：NaN/Infinity 按 0 处理，用于控制律输出与执行器量 */
  function clampFinite(value, lo, hi) {
    const v = Number.isFinite(value) ? value : 0;
    return Math.max(lo, Math.min(hi, v));
  }

  /* 数值格式化：非有限值显示破折号，digits 默认 2 位 */
  function fmt(value, digits) {
    return Number.isFinite(value) ? value.toFixed(digits === undefined ? 2 : digits) : '—';
  }

  function $(id) { return doc ? doc.getElementById(id) : null; }

  NS.utils = { esc, icon, clamp, clampFinite, fmt, $ };
})(window);
