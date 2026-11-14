#!/usr/bin/env node
/* ============================================================
   tools/verify-file-protocol.js — 开发期 file:// 双击可用验收
   运行：node tools/verify-file-protocol.js
   直接以 file:// 打开 index.html，验证零外部请求、无控制台报错、
   侧栏挂起规则、专注模式、TeX 公式、7 个对象教学可视化、
   99 法教学文档、99 项切换、导出菜单与响应式。
   Playwright 模块不可用时自动跳过。
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');

function loadPlaywright() {
  const candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@playwright', 'cli', 'node_modules', 'playwright'),
    'playwright'
  ];
  for (const c of candidates) { try { return require(c); } catch (err) { /* 尝试下一个 */ } }
  return null;
}
const hideGuide = () => {
  const guide = document.getElementById('overlay-guide');
  if (guide) guide.hidden = true;
};

(async () => {
  const pw = loadPlaywright();
  if (!pw) {
    console.log('SKIP: 未找到 Playwright 模块，跳过 file:// 验收（不影响页面运行）');
    return;
  }
  const errors = [];
  let browser = null;
  try {
    try { browser = await pw.chromium.launch({ headless: true, channel: 'chrome' }); }
    catch (err) { browser = await pw.chromium.launch({ headless: true }); }
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('request', (r) => { if (/^https?:/i.test(r.url())) errors.push('external request: ' + r.url()); });

    const root = path.resolve(__dirname, '..');
    const app = path.join(root, 'public');
    const shots = path.join(root, 'screenshots');
    fs.mkdirSync(shots, { recursive: true });
    const file = path.join(app, 'index.html').replace(/\\/g, '/');
    const url = 'file:///' + file;

    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(hideGuide);
    await page.waitForTimeout(350);

    // 侧栏挂起规则：首次进入展开 → 刷新后默认贴边 → 可展开 → 专注模式
    const railFirst = await page.evaluate(() => !document.getElementById('workspace').classList.contains('is-browser-collapsed'));
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(hideGuide);
    await page.waitForTimeout(350);
    const railAfterReload = await page.evaluate(() => document.getElementById('workspace').classList.contains('is-browser-collapsed'));
    await page.click('#btn-browser-expand');
    await page.waitForTimeout(150);
    const railExpanded = await page.evaluate(() => !document.getElementById('workspace').classList.contains('is-browser-collapsed'));
    await page.click('#btn-focus');
    await page.waitForTimeout(150);
    const focusOn = await page.evaluate(() => {
      const w = document.getElementById('workspace');
      return w.classList.contains('is-browser-collapsed') && w.classList.contains('is-inspector-collapsed');
    });
    await page.click('#btn-focus');
    await page.click('#btn-browser-collapse');
    await page.waitForTimeout(150);

    const state = await page.evaluate(() => ({
      title: document.title,
      ns: Object.keys(window.CtrlSim || {}),
      methods: window.CtrlSim ? Object.keys(window.CtrlSim.data.CONTROLLER_CONFIGS).length : 0,
      items: document.querySelectorAll('.method-item').length,
      params: document.querySelectorAll('.param-row').length,
      plants: window.CtrlSim ? Object.keys(window.CtrlSim.data.PLANTS).length : 0,
      plantOptions: document.getElementById('plant-select').options.length,
      defaultPlant: window.CtrlSim ? window.CtrlSim.sim.getSettings().plantId : '',
      defaultPlantName: document.getElementById('plant-tag').textContent.trim(),
      selectedPlant: document.getElementById('plant-select').value,
      selectedPlantLabel: (document.getElementById('plant-select').selectedOptions[0] || {}).textContent || '',
      formulaRendered: !!document.querySelector('#plant-formula .math'),
      profileFormula: !!document.querySelector('.profile-eq .math'),
      profileDocsBtn: !!document.getElementById('btn-profile-docs'),
      formulaCopyButtons: document.querySelectorAll('.formula-copy').length,
      metricCards: document.querySelectorAll('.metric').length,
      docsOverlay: !!document.getElementById('overlay-docs'),
      fitChips: document.querySelectorAll('.fit-chip').length,
      formulaMathML: !!document.querySelector('#plant-formula math, #plant-formula .katex'),
      eqbar: !!document.querySelector('.eqbar #plant-formula .math'),
      modelBtn: !!document.getElementById('btn-plant-model'),
      railsModule: !!window.CtrlSim.rails,
      chatterMetric: !!document.getElementById('m-chatter'),
      simCanvas: document.getElementById('canvas-sim').width,
      posCanvas: document.getElementById('canvas-pos').width
    }));

    // 99 法教学文档
    await page.click('#btn-docs');
    await page.waitForTimeout(200);
    const docState = await page.evaluate(() => ({
      open: !document.getElementById('overlay-docs').hidden,
      sections: document.querySelectorAll('#docs-content .doc-section').length,
      tableRows: document.querySelectorAll('#docs-content .doc-table tbody tr').length,
      navItems: document.querySelectorAll('#docs-list .doc-nav-item').length,
      counter: document.getElementById('docs-counter').textContent,
      hasMath: document.querySelectorAll('#docs-content .doc-math .math').length,
      noExportBtn: !document.getElementById('docs-export'),
      navExpected: (window.CtrlSim && window.CtrlSim.data) ? window.CtrlSim.data.methodList.length : 0,
      useBtn: !!document.getElementById('docs-use')
    }));
    await page.screenshot({ path: path.join(shots, 'v3-docs.png'), fullPage: false });
    await page.click('#docs-next');
    await page.waitForTimeout(120);
    const nextCounter = await page.evaluate(() => document.getElementById('docs-counter').textContent);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    const docClosed = await page.evaluate(() => document.getElementById('overlay-docs').hidden);

    // 对象模型弹窗：按需打开，公式 / 参数表 / 分区齐备
    await page.click('#btn-plant-model');
    await page.waitForTimeout(220);
    const modelState = await page.evaluate(() => {
      const plantId = window.CtrlSim.sim.getSettings().plantId;
      const plant = window.CtrlSim.data.PLANTS[plantId];
      return {
        open: !document.getElementById('overlay-plant').hidden,
        hasEq: !!document.querySelector('#plant-model-body .eq-surface-main .math'),
        rows: document.querySelectorAll('#plant-model-body .model-table tbody tr').length,
        expectRows: plant ? plant.params.length : 0,
        plantId: plantId,
        blocks: document.querySelectorAll('#plant-model-body .model-block').length
      };
    });
    await page.screenshot({ path: path.join(shots, 'v3-model.png'), fullPage: false });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    modelState.closed = await page.evaluate(() => document.getElementById('overlay-plant').hidden);

    // 切换被控对象：主公式条、弹窗内容与参数同步变化
    await page.selectOption('#plant-select', 'pendulum');
    await page.waitForTimeout(250);
    const plantAfter = await page.evaluate(() => ({
      id: window.CtrlSim.sim.getSettings().plantId,
      formula: document.getElementById('plant-formula').textContent.slice(0, 40),
      relation: document.querySelector('#plant-model-body .eq-surface-main').textContent.slice(0, 40),
      params: document.querySelectorAll('.param-row').length,
      order: window.CtrlSim.sim.getPlant().order
    }));
    const eqbarFit = [];
    for (const pid of ['msd', 'freeMass', 'pendulum']) {
      await page.evaluate((id) => {
        CtrlSim.sim.setPlant(id);
        CtrlSim.ui.renderPlant();
        CtrlSim.ui.renderParams();
        CtrlSim.app.refreshAll();
      }, pid);
      await page.waitForTimeout(180);
      eqbarFit.push(await page.evaluate(() => {
        const box = document.querySelector('.eqbar-math');
        const math = box ? box.querySelector('.math') : null;
        return {
          width: box ? box.clientWidth : 0,
          need: math ? Math.ceil(math.getBoundingClientRect().width) : 0,
          font: math ? getComputedStyle(math).fontSize : ''
        };
      }));
      const canvas = await page.$('#canvas-sim');
      if (canvas) await canvas.screenshot({ path: path.join(shots, 'plant-' + pid + '.png') });
      if (pid === 'pendulum') {
        const eqbar = await page.$('.eqbar');
        if (eqbar) await eqbar.screenshot({ path: path.join(shots, 'eqbar-pendulum.png') });
      }
    }
    await page.evaluate(() => {
      CtrlSim.sim.setPlant('msd');
      CtrlSim.ui.renderPlant();
      CtrlSim.ui.renderParams();
      CtrlSim.app.refreshAll();
    });
    await page.selectOption('#plant-select', 'msd');
    await page.waitForTimeout(150);

    const alreadyRunning = await page.evaluate(() => window.CtrlSim.sim.getSettings().running);
    if (!alreadyRunning) await page.click('#btn-run');
    await page.click('#btn-disturb');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(shots, 'v3-desktop.png'), fullPage: false });

    // 深色实验室主题：展开两栏取整页视觉证据
    await page.click('#btn-theme');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.evaluate(() => CtrlSim.rails.set(false, false));
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(shots, 'v3-dark.png'), fullPage: false });
    await page.evaluate(() => CtrlSim.rails.set(true, false));
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({
      t: window.CtrlSim.sim.getState().t,
      tracks: window.CtrlSim.sim.getTracks().length,
      points: window.CtrlSim.sim.getHistory().length,
      plant: window.CtrlSim.sim.getSettings().plantId
    }));

    const kinds = await page.evaluate(() => Object.keys(CtrlSim.data.PLANT_VIEWS).map((id) => CtrlSim.charts.getPlantView(id).kind));
    const interactions = await page.evaluate(() => {
      const keys = Object.keys(CtrlSim.data.CONTROLLER_CONFIGS);
      const bad = [];
      keys.forEach((k) => {
        try { CtrlSim.sim.setMethod(k); CtrlSim.ui.setActiveMethod(k); CtrlSim.sim.stepOnce(); }
        catch (err) { bad.push(k + ': ' + err.message); }
      });
      CtrlSim.sim.setPlant('msd');
      CtrlSim.ui.renderPlant();
      CtrlSim.ui.renderParams();
      CtrlSim.sim.setMethod('PID');
      CtrlSim.ui.setActiveMethod('PID');
      return { count: keys.length, badTotal: bad.length, bad: bad.slice(0, 4) };
    });
    await page.click('#btn-export');
    const menuItems = await page.evaluate(() => document.querySelectorAll('.export-menu [data-export]').length);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 375, height: 780 });
    await page.waitForTimeout(200);
    const narrow = await page.evaluate(() => ({ vw: innerWidth, sw: document.documentElement.scrollWidth }));
    await page.setViewportSize({ width: 1440, height: 900 });

    /* 小车位置闭环在真实页面环境下的双方法验证：PID 与 SMC 都必须同时锁定位置与摆角 */
    const cartLoop = await page.evaluate(() => {
      const sim = window.CtrlSim.sim;
      const run = (m) => {
        sim.setPlant('pendulum');
        sim.setMethod(m);
        const s = sim.getSettings();
        s.cartLoop = 'on';
        s.cartTarget = 1.0;
        sim.resetSim(m, 0, 0.15);
        for (let i = 0; i < 1200; i++) sim.stepOnce();
        const st = sim.getState();
        return { xc: st.xc, th: st.x, ok: Math.abs(st.xc - 1) < 0.12 && Math.abs(st.x) < 0.12 };
      };
      const pid = run('PID');
      const smc = run('SMC');
      sim.setPlant('msd');
      sim.setMethod('PID');
      sim.resetSim();
      return { pid, smc };
    });

    console.log('file:// URL = ' + url);
    console.log('rails  = ' + JSON.stringify({ railFirst, railAfterReload, railExpanded, focusOn }));
    console.log('state  = ' + JSON.stringify(state));
    console.log('docs   = ' + JSON.stringify(docState) + ' next=' + nextCounter + ' closed=' + docClosed);
    console.log('plant  = ' + JSON.stringify(plantAfter));
    console.log('theme  = ' + theme);
    console.log('after  = ' + JSON.stringify(after));
    console.log('model    = ' + JSON.stringify(modelState));
    console.log('eqbarFit = ' + JSON.stringify(eqbarFit));
    console.log('visualKinds = ' + JSON.stringify(kinds));
    console.log('cartLoop = ' + JSON.stringify(cartLoop));
    console.log('interactions = ' + JSON.stringify(interactions) + ' menu=' + menuItems + ' narrow=' + JSON.stringify(narrow));
    console.log('errors = ' + (errors.length ? errors.join(' | ') : '0'));

    const ok = cartLoop.pid.ok && cartLoop.smc.ok &&
      state.methods === 99 && state.ns.length === 9 && state.items === 99 &&
      state.params > 0 && state.plants === 3 && state.plantOptions === 3 &&
      state.defaultPlant === 'freeMass' && state.selectedPlant === 'freeMass' &&
      state.defaultPlantName.indexOf('二阶') >= 0 &&
      state.selectedPlantLabel.indexOf('二阶积分器') >= 0 &&
      state.formulaRendered && state.profileFormula && state.profileDocsBtn &&
      state.formulaCopyButtons === 0 && state.metricCards === 8 && state.docsOverlay &&
      state.eqbar && state.modelBtn && state.fitChips === 3 && state.formulaMathML && state.railsModule && state.chatterMetric && state.simCanvas > 0 && state.posCanvas > 0 &&
      railFirst && railAfterReload && railExpanded && focusOn &&
      docState.open && docState.sections >= 8 && docState.tableRows >= 3 &&
      docState.navItems === docState.navExpected && docState.hasMath >= 3 && docState.noExportBtn && docState.useBtn &&
      nextCounter !== docState.counter && docClosed &&
      modelState.open && modelState.hasEq && modelState.rows >= 1 &&
      modelState.rows === modelState.expectRows && modelState.blocks === 4 && modelState.closed &&
      plantAfter.id === 'pendulum' && plantAfter.order === 2 && plantAfter.relation.length > 0 &&
      after.points > 0 && after.plant === 'msd' && theme === 'dark' &&
      interactions.count === 99 && interactions.badTotal === 0 && menuItems === 3 &&
      kinds.length === 3 && new Set(kinds).size === 3 && narrow.sw <= narrow.vw &&
      eqbarFit.length === 3 && eqbarFit.every((e) => e.need > 0 && e.need <= e.width + 2) &&
      errors.length === 0;
    console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL');
    if (!ok) process.exitCode = 1;
  } catch (err) {
    console.log('RESULT: FAIL (' + err.message + ')');
    console.log('errors = ' + errors.join(' | '));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
