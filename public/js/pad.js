/* ============================================================
   pad.js — 手写板（V4.0）
   ------------------------------------------------------------
   · 全屏透明画布：批注不改变页面内容，关闭后页面恢复交互
   · 工具：铅笔 / 橡皮 / 浏览页面；颜色 8 色；撤销 / 重做 / 清空
   · 浮工具条可拖动，位置与颜色保存在 localStorage
   · 笔迹只保留在本次会话，刷新即清空
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const doc = global.document;
  const STORE_KEY = 'ctrlsim.v4.pad';
  const MAX_DPR = 2;
  const PEN_SIZE = 3;
  const ERASER_SIZE = 22;

  const el = {};
  let ctx = null;
  let open = false;
  let tool = 'pen';
  let color = '#151715';
  let strokes = [];
  let undone = [];
  let drawing = null;
  let drag = null;
  let toggleDrag = null;
  let lastToggleDrag = 0;
  let state = { color: '#151715', position: null, togglePos: null };

  const U = NS.utils;
  const $ = U.$;
  const clamp = U.clamp;
  function dpr() { return Math.min(global.devicePixelRatio || 1, MAX_DPR); }

  /* ── 持久化：只存颜色与工具条位置 ─────────────────────── */
  function loadState() {
    try {
      const raw = global.localStorage && global.localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) || {};
      if (/^#[0-9a-f]{6}$/i.test(p.color || '')) { state.color = p.color; color = p.color; }
      if (p.position && Number.isFinite(p.position.x) && Number.isFinite(p.position.y)) {
        state.position = { x: p.position.x, y: p.position.y };
      }
      if (p.togglePos && Number.isFinite(p.togglePos.x) && Number.isFinite(p.togglePos.y)) {
        state.togglePos = { x: p.togglePos.x, y: p.togglePos.y };
      }
    } catch (err) { /* file:// 存储受限时仅本次会话有效 */ }
  }
  function saveState() {
    try {
      if (global.localStorage) global.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (err) { /* 静默降级 */ }
  }

  /* ── 画布尺寸与重绘 ───────────────────────────────────── */
  function resize() {
    if (!el.canvas || !ctx) return;
    const scale = dpr();
    const w = Math.max(1, global.innerWidth);
    const h = Math.max(1, global.innerHeight);
    el.canvas.width = Math.round(w * scale);
    el.canvas.height = Math.round(h * scale);
    el.canvas.style.width = w + 'px';
    el.canvas.style.height = h + 'px';
    redraw();
  }

  function paintStroke(s) {
    if (!s || !s.points.length) return;
    ctx.save();
    ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (s.points.length === 1) {
      const p = s.points[0];
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      s.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    }
    ctx.restore();
  }

  function redraw() {
    if (!ctx) return;
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);
    strokes.forEach(paintStroke);
  }

  function refreshTools() {
    [el.pen, el.eraser, el.browse].forEach((btn) => {
      if (!btn) return;
      const active = btn.dataset.tool === tool;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    if (el.undo) el.undo.disabled = !strokes.length;
    if (el.redo) el.redo.disabled = !undone.length;
    if (el.canvas) el.canvas.classList.toggle('is-browse', tool === 'browse');
  }

  function setTool(next) {
    tool = next === 'eraser' || next === 'browse' ? next : 'pen';
    refreshTools();
  }

  function setColor(next) {
    if (!/^#[0-9a-f]{6}$/i.test(next || '')) return;
    color = next;
    state.color = next;
    saveState();
    Array.prototype.forEach.call(doc.querySelectorAll('.pad-color'), (b) => {
      const active = b.dataset.color.toLowerCase() === next.toLowerCase();
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  /* ── 手写板入口按钮：全图拖动，位置记忆 ──────────────── */
  function applyTogglePosition() {
    if (!el.toggle) return;
    const w = el.toggle.offsetWidth || 46;
    const h = el.toggle.offsetHeight || 46;
    const base = state.togglePos || {
      x: global.innerWidth - w - 14,
      y: Math.round(global.innerHeight / 2 - h / 2)
    };
    const x = clamp(base.x, 8, Math.max(8, global.innerWidth - w - 8));
    const y = clamp(base.y, 8, Math.max(8, global.innerHeight - h - 8));
    el.toggle.style.left = x + 'px';
    el.toggle.style.top = y + 'px';
    el.toggle.style.right = 'auto';
    el.toggle.style.transform = 'none';
  }

  function startToggleDrag(ev) {
    if (ev.button !== undefined && ev.button !== 0) return;
    const rect = el.toggle.getBoundingClientRect();
    toggleDrag = {
      dx: ev.clientX - rect.left,
      dy: ev.clientY - rect.top,
      id: ev.pointerId,
      x0: ev.clientX,
      y0: ev.clientY,
      moved: false
    };
    if (el.toggle.setPointerCapture) {
      try { el.toggle.setPointerCapture(ev.pointerId); } catch (err) { /* 忽略 */ }
    }
    el.toggle.classList.add('is-dragging');
    ev.preventDefault();
  }

  function moveToggleDrag(ev) {
    if (!toggleDrag || (ev.pointerId !== undefined && ev.pointerId !== toggleDrag.id)) return;
    if (Math.abs(ev.clientX - toggleDrag.x0) + Math.abs(ev.clientY - toggleDrag.y0) > 4) {
      toggleDrag.moved = true;
    }
    const w = el.toggle.offsetWidth;
    const h = el.toggle.offsetHeight;
    const x = clamp(ev.clientX - toggleDrag.dx, 8, Math.max(8, global.innerWidth - w - 8));
    const y = clamp(ev.clientY - toggleDrag.dy, 8, Math.max(8, global.innerHeight - h - 8));
    el.toggle.style.left = x + 'px';
    el.toggle.style.top = y + 'px';
    el.toggle.style.right = 'auto';
    el.toggle.style.transform = 'none';
  }

  function endToggleDrag() {
    if (!toggleDrag) return;
    const moved = toggleDrag.moved;
    toggleDrag = null;
    el.toggle.classList.remove('is-dragging');
    state.togglePos = {
      x: parseFloat(el.toggle.style.left) || 0,
      y: parseFloat(el.toggle.style.top) || 0
    };
    saveState();
    if (moved) lastToggleDrag = Date.now();
  }

  /* ── 工具条位置（可拖动，记忆位置） ───────────────────── */
  function applyPanelPosition() {
    if (!el.panel) return;
    const w = el.panel.offsetWidth || 360;
    const h = el.panel.offsetHeight || 84;
    const base = state.position || { x: global.innerWidth - w - 18, y: 84 };
    const x = clamp(base.x, 8, Math.max(8, global.innerWidth - w - 8));
    const y = clamp(base.y, 8, Math.max(8, global.innerHeight - h - 8));
    el.panel.style.left = x + 'px';
    el.panel.style.top = y + 'px';
  }

  /* ── 打开 / 关闭 ─────────────────────────────────────── */
  function openPad() {
    if (open || !el.canvas || !el.panel) return;
    open = true;
    el.canvas.classList.add('is-open');
    el.panel.hidden = false;
    /* 方形入口按钮与长方形面板互斥：面板打开期间隐藏按钮，关闭后再出现 */
    el.toggle.hidden = true;
    el.toggle.setAttribute('aria-expanded', 'true');
    resize();
    applyPanelPosition();
    setTool(tool);
  }

  function closePad() {
    if (!open) return;
    open = false;
    drawing = null;
    el.canvas.classList.remove('is-open');
    el.panel.hidden = true;
    /* 关闭面板后入口按钮重新出现，回到拖动记忆的位置 */
    el.toggle.hidden = false;
    el.toggle.setAttribute('aria-expanded', 'false');
    applyTogglePosition();
  }

  function togglePad() { if (open) closePad(); else openPad(); }

  function clearAll() {
    strokes = [];
    undone = [];
    redraw();
    refreshTools();
  }

  function undo() {
    if (!strokes.length) return;
    undone.push(strokes.pop());
    redraw();
    refreshTools();
  }

  function redo() {
    if (!undone.length) return;
    strokes.push(undone.pop());
    redraw();
    refreshTools();
  }

  /* ── 绘制：Pointer Events，支持鼠标 / 触控 / 手写笔 ──── */
  function pointFrom(ev) {
    return { x: ev.clientX, y: ev.clientY };
  }

  function startDraw(ev) {
    if (!open || tool === 'browse' || (ev.button !== undefined && ev.button !== 0)) return;
    ev.preventDefault();
    const erasing = tool === 'eraser';
    drawing = {
      color: color,
      size: erasing ? ERASER_SIZE : PEN_SIZE,
      erase: erasing,
      points: [pointFrom(ev)]
    };
    strokes.push(drawing);
    undone = [];
    if (el.canvas.setPointerCapture) {
      try { el.canvas.setPointerCapture(ev.pointerId); } catch (err) { /* 忽略 */ }
    }
    paintStroke(drawing);
    refreshTools();
  }

  function moveDraw(ev) {
    if (!drawing) return;
    const last = drawing.points[drawing.points.length - 1];
    const next = pointFrom(ev);
    if (Math.abs(next.x - last.x) + Math.abs(next.y - last.y) < 1.2) return;
    drawing.points.push(next);
    ctx.save();
    ctx.globalCompositeOperation = drawing.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = drawing.color;
    ctx.lineWidth = drawing.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    ctx.restore();
  }

  function endDraw() {
    if (!drawing) return;
    drawing = null;
    refreshTools();
  }

  /* ── 工具条拖动 ──────────────────────────────────────── */
  function startDrag(ev) {
    if (ev.target.closest('button')) return;
    if (ev.button !== undefined && ev.button !== 0) return;
    const rect = el.panel.getBoundingClientRect();
    drag = { dx: ev.clientX - rect.left, dy: ev.clientY - rect.top, id: ev.pointerId };
    if (el.panel.setPointerCapture) {
      try { el.panel.setPointerCapture(ev.pointerId); } catch (err) { /* 忽略 */ }
    }
    el.panel.classList.add('is-dragging');
    ev.preventDefault();
  }

  function moveDrag(ev) {
    if (!drag || (ev.pointerId !== undefined && ev.pointerId !== drag.id)) return;
    const w = el.panel.offsetWidth;
    const h = el.panel.offsetHeight;
    const x = clamp(ev.clientX - drag.dx, 8, Math.max(8, global.innerWidth - w - 8));
    const y = clamp(ev.clientY - drag.dy, 8, Math.max(8, global.innerHeight - h - 8));
    el.panel.style.left = x + 'px';
    el.panel.style.top = y + 'px';
  }

  function endDrag() {
    if (!drag) return;
    drag = null;
    el.panel.classList.remove('is-dragging');
    state.position = {
      x: parseFloat(el.panel.style.left) || 0,
      y: parseFloat(el.panel.style.top) || 0
    };
    saveState();
  }

  /* ── 事件绑定 ────────────────────────────────────────── */
  function bind() {
    el.toggle.addEventListener('click', (ev) => {
      if (Date.now() - lastToggleDrag < 250) {
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      togglePad();
    });
    el.toggle.addEventListener('pointerdown', startToggleDrag);
    el.toggle.addEventListener('pointermove', moveToggleDrag);
    el.toggle.addEventListener('pointerup', endToggleDrag);
    el.toggle.addEventListener('pointercancel', endToggleDrag);
    el.toggle.addEventListener('lostpointercapture', endToggleDrag);
    el.close.addEventListener('click', closePad);
    el.pen.addEventListener('click', () => setTool('pen'));
    el.eraser.addEventListener('click', () => setTool('eraser'));
    el.browse.addEventListener('click', () => setTool('browse'));
    el.undo.addEventListener('click', undo);
    el.redo.addEventListener('click', redo);
    el.clear.addEventListener('click', clearAll);

    el.colors.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.pad-color');
      if (btn) setColor(btn.dataset.color);
    });

    el.canvas.addEventListener('pointerdown', startDraw);
    el.canvas.addEventListener('pointermove', moveDraw);
    el.canvas.addEventListener('pointerup', endDraw);
    el.canvas.addEventListener('pointercancel', endDraw);
    el.canvas.addEventListener('lostpointercapture', endDraw);

    el.panel.addEventListener('pointerdown', startDrag);
    el.panel.addEventListener('pointermove', moveDrag);
    el.panel.addEventListener('pointerup', endDrag);
    el.panel.addEventListener('pointercancel', endDrag);
    el.panel.addEventListener('lostpointercapture', endDrag);

    global.addEventListener('resize', () => {
      applyTogglePosition();
      if (!open) return;
      resize();
      applyPanelPosition();
    });

    doc.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape' || !open) return;
      ev.preventDefault();
      ev.stopPropagation();
      closePad();
    }, true);
  }

  function init() {
    el.canvas = $('pad-canvas');
    el.toggle = $('pad-toggle');
    if (!el.canvas || !el.toggle) return;
    ctx = el.canvas.getContext ? el.canvas.getContext('2d') : null;
    if (!ctx) return;
    el.panel = $('pad-panel');
    el.close = $('pad-close');
    el.pen = $('pad-pen');
    el.eraser = $('pad-eraser');
    el.browse = $('pad-browse');
    el.undo = $('pad-undo');
    el.redo = $('pad-redo');
    el.clear = $('pad-clear');
    el.colors = $('pad-colors');
    loadState();
    setColor(color);
    refreshTools();
    applyTogglePosition();
    bind();
  }

  NS.pad = {
    open: openPad, close: closePad, toggle: togglePad,
    clear: clearAll, undo: undo, redo: redo,
    getStrokes: function () { return strokes.slice(); },
    isOpen: function () { return open; }
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
