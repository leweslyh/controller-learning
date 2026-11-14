/* ============================================================
   layout.js — 设备布局切换（V4.0）
   ------------------------------------------------------------
   · 自动适配：UA + 触控能力 + 视口宽度识别电脑 / 平板 / 手机
   · 手动切换：电脑端 / 平板端 / 手机端，强制覆盖响应式断点
   · 默认自动；识别不了时回落电脑端
   · 偏好保存在 localStorage（ctrlsim.v4.layout）
   ============================================================ */
(function (global) {
  'use strict';
  const NS = global.CtrlSim = global.CtrlSim || {};
  const doc = global.document;
  const STORE_KEY = 'ctrlsim.v4.layout';
  const VALID = ['auto', 'desktop', 'tablet', 'mobile'];
  const LABELS = { auto: '自动', desktop: '电脑端', tablet: '平板端', mobile: '手机端' };
  const ICONS = { desktop: 'i-monitor', tablet: 'i-tablet', mobile: 'i-phone' };

  let pref = 'auto';
  let detected = 'desktop';
  let menuOpen = false;
  let resizeTimer = 0;
  const el = {};

  /* ── 客户端识别：识别不了回落电脑端 ───────────────────── */
  function detect() {
    const nav = global.navigator || {};
    const ua = String(nav.userAgent || '').toLowerCase();
    const touch = Number(nav.maxTouchPoints || 0) > 0;
    const w = Number(global.innerWidth) || 0;
    if (!ua && !w) return 'desktop';
    if (/iphone|ipod|windows phone|blackberry|opera mini|android.*mobile/.test(ua)) return 'mobile';
    if (/ipad|tablet|silk|playbook/.test(ua)) return 'tablet';
    /* iPadOS 13+ 默认桌面 UA：Macintosh + 多点触控 */
    if (/macintosh/.test(ua) && touch && /safari/.test(ua)) return 'tablet';
    if (/android/.test(ua)) return 'tablet';
    if (!w) return 'desktop';
    if (touch && w <= 640) return 'mobile';
    if (touch && w <= 1100) return 'tablet';
    return 'desktop';
  }

  function activeDevice() {
    return pref === 'auto' ? detected : pref;
  }

  function refreshUi() {
    const device = activeDevice();
    if (el.use) el.use.setAttribute('href', '#' + (ICONS[device] || 'i-monitor'));
    if (el.label) el.label.textContent = LABELS[pref] || '自动';
    if (el.btn) {
      el.btn.title = pref === 'auto'
        ? '布局：自动适配（当前 ' + LABELS[device] + '）'
        : '布局：' + LABELS[pref];
    }
    if (el.detected) el.detected.textContent = LABELS[detected];
    if (el.menu) {
      Array.prototype.forEach.call(el.menu.querySelectorAll('[data-layout]'), (btn) => {
        btn.setAttribute('aria-checked', String(btn.dataset.layout === pref));
      });
    }
  }

  function apply() {
    const root = doc.documentElement;
    if (pref === 'auto') {
      detected = detect();
      root.dataset.layout = 'auto';
      root.dataset.device = detected;
    } else {
      root.dataset.layout = pref;
      root.dataset.device = pref;
    }
    refreshUi();
    closeDrawer();
    closeTopbarMenu();
    /* 强制平板 / 手机或手动电脑端时展开两栏，避免挂起态留下空白列 */
    if (pref !== 'auto' || detected !== 'desktop') {
      if (NS.rails && NS.rails.set) NS.rails.set(false, false);
    }
    /* 布局宽度变化后让画布与三栏高度重新计算 */
    global.setTimeout(() => {
      if (NS.charts && NS.charts.resize) NS.charts.resize();
      if (NS.ui && NS.ui.syncColumnHeights) NS.ui.syncColumnHeights();
    }, 80);
  }

  function set(next) {
    pref = VALID.indexOf(next) >= 0 ? next : 'auto';
    try {
      if (global.localStorage) global.localStorage.setItem(STORE_KEY, pref);
    } catch (err) { /* file:// 存储受限时仅本次会话有效 */ }
    apply();
    closeMenu();
  }

  /* ── 手机端：顶栏折叠与左右栏抽屉 ─────────────────────── */
  function mobileMode() {
    const root = doc.documentElement;
    return root.dataset.layout === 'mobile' || root.dataset.device === 'mobile';
  }
  function closeTopbarMenu() {
    if (!el.actions) return;
    el.actions.classList.remove('is-open');
    if (el.topbar) el.topbar.classList.remove('is-menu-open');
    if (el.menuBtn) el.menuBtn.setAttribute('aria-expanded', 'false');
  }
  function toggleTopbarMenu() {
    if (!el.actions) return;
    const open = el.actions.classList.toggle('is-open');
    if (el.topbar) el.topbar.classList.toggle('is-menu-open', open);
    if (el.menuBtn) el.menuBtn.setAttribute('aria-expanded', String(open));
  }
  function closeDrawer() {
    ['browser', 'inspector'].forEach((id) => {
      const node = doc.getElementById(id);
      if (node) node.classList.remove('is-mobile-open');
    });
    if (el.scrim) el.scrim.hidden = true;
    doc.documentElement.classList.remove('is-drawer-open');
  }
  function openDrawer(which) {
    if (!mobileMode()) return;
    closeTopbarMenu();
    closeDrawer();
    const node = doc.getElementById(which === 'inspector' ? 'inspector' : 'browser');
    if (!node) return;
    node.classList.add('is-mobile-open');
    if (el.scrim) el.scrim.hidden = false;
    doc.documentElement.classList.add('is-drawer-open');
  }

  /* ── 菜单 ────────────────────────────────────────────── */
  function positionMenu() {
    if (!el.menu || !el.btn) return;
    const r = el.btn.getBoundingClientRect();
    const w = el.menu.offsetWidth || 190;
    const left = Math.min(global.innerWidth - w - 10, Math.max(10, r.right - w));
    el.menu.style.left = left + 'px';
    el.menu.style.top = (r.bottom + 6) + 'px';
  }

  function openMenu() {
    if (!el.menu) return;
    menuOpen = true;
    el.menu.hidden = false;
    el.btn.setAttribute('aria-expanded', 'true');
    positionMenu();
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    el.menu.hidden = true;
    if (el.btn) el.btn.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() { if (menuOpen) closeMenu(); else openMenu(); }

  function bind() {
    el.btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleMenu();
    });
    el.menu.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-layout]');
      if (btn) set(btn.dataset.layout);
    });
    if (el.menuBtn) {
      el.menuBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggleTopbarMenu();
      });
    }
    if (el.mobileBrowser) {
      el.mobileBrowser.addEventListener('click', () => openDrawer('browser'));
    }
    if (el.mobileInspector) {
      el.mobileInspector.addEventListener('click', () => openDrawer('inspector'));
    }
    if (el.scrim) el.scrim.addEventListener('click', closeDrawer);
    ['btn-browser-collapse', 'btn-inspector-collapse'].forEach((id) => {
      const btn = doc.getElementById(id);
      if (btn) btn.addEventListener('click', closeDrawer);
    });
    doc.addEventListener('click', (ev) => {
      if (menuOpen && !ev.target.closest('#layout-menu') && !ev.target.closest('#btn-layout')) {
        closeMenu();
      }
      if (el.actions && el.actions.classList.contains('is-open') && !ev.target.closest('.topbar')) {
        closeTopbarMenu();
      }
    });
    doc.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      if (el.scrim && !el.scrim.hidden) {
        ev.preventDefault(); ev.stopPropagation(); closeDrawer(); return;
      }
      if (el.actions && el.actions.classList.contains('is-open')) {
        ev.preventDefault(); ev.stopPropagation(); closeTopbarMenu(); return;
      }
      if (!menuOpen) return;
      ev.preventDefault(); ev.stopPropagation(); closeMenu();
    }, true);
    global.addEventListener('resize', () => {
      if (menuOpen) positionMenu();
      if (pref !== 'auto') return;
      global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(() => {
        const next = detect();
        if (next !== detected) apply();
      }, 160);
    });
  }

  function init() {
    el.btn = doc.getElementById('btn-layout');
    el.menu = doc.getElementById('layout-menu');
    if (!el.btn || !el.menu) return;
    el.use = doc.getElementById('layout-icon-use');
    el.label = doc.getElementById('layout-label');
    el.detected = doc.getElementById('layout-detected');
    el.topbar = doc.querySelector('.topbar');
    el.actions = doc.querySelector('.topbar-actions');
    el.menuBtn = doc.getElementById('btn-topbar-menu');
    el.mobileBrowser = doc.getElementById('btn-mobile-browser');
    el.mobileInspector = doc.getElementById('btn-mobile-inspector');
    el.scrim = doc.getElementById('mobile-scrim');
    try {
      const saved = global.localStorage && global.localStorage.getItem(STORE_KEY);
      if (VALID.indexOf(saved) >= 0) pref = saved;
    } catch (err) { /* 忽略 */ }
    apply();
    bind();
  }

  NS.layout = {
    set: set,
    get: function () { return pref; },
    current: function () { return activeDevice(); },
    detect: detect,
    apply: apply
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
