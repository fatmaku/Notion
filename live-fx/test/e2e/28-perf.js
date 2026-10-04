// Performance (release 2.1, package A "Leistung"): a burst of 31 mixed effects within 3 s on a 1920×1080
// overlay (scene rain + 3 rounds of card / image / banner / rain 40 / confetti / neon text / glitch text /
// sticker / lower-third / combo, everything intensity 3 with glow / tilt / impact). Measured in the page for
// 5 s from the first fire: requestAnimationFrame frame time (mean / p99), max DOM nodes under #stage, long
// tasks (PerformanceObserver), JS heap (performance.memory) and – through CDP Performance.getMetrics – the
// main-thread time spent in tasks / style recalc / layout. Two runs, averaged.
//
// BASELINE (LiveFX 2.0 renderer before package A; headless Chromium with software compositing in the CI
// container, 1920×1080, mean of 4 runs – frames are slow here because every layer is composited on the CPU):
//   frame mean 203 ms · p99 842 ms · max DOM nodes under #stage 379 · long tasks 11.3 (1636 ms) · heap 9.5 MB
//   main thread per 5-s run: task 2226 ms (96 ms per rendered frame) · style recalc 59 ms · layout 412 ms
// AFTER (2.1, same machine): see docs/PERFORMANCE.md for the table.
// The numbers depend on the machine – the assertions below are generous regression bounds relative to the
// baseline (DOM nodes ≤ 60 %, frame mean or p99 ≤ 80 %).
// Also screenshots: perf-card-rays.png (card with rays at intensity 3) and perf-scene-rain.png.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const BASELINE = { frameMean: 203, frameP99: 842, maxNodes: 379, longTasks: 11.3, longTaskMs: 1636, heapMB: 9.5, taskMs: 2226, taskPerFrame: 96, styleMs: 59, layoutMs: 412 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs the burst inside the page and resolves the in-page numbers. */
function burst(page, imgSrc) {
  return page.evaluate(async (src) => {
    const r = window.livefx.renderer;
    const stage = document.getElementById('stage');
    const round = [
      { kind: 'card', emoji: '🔥', text: 'BOOM', intensity: 3, glow: true, tilt: true, impact: true },
      { kind: 'image', src, text: 'BILD', intensity: 3, glow: true, tilt: true },
      { kind: 'banner', emoji: '🎉', text: 'Neuer Follower', intensity: 3, glow: true },
      { kind: 'rain', emoji: '🍕', count: 40, intensity: 3, glow: true },
      { kind: 'confetti', intensity: 3, glow: true },
      { kind: 'text', text: 'LIVE FX', style: 'neon', intensity: 3, glow: true, impact: true },
      { kind: 'text', text: 'GLITCH', style: 'glitch', intensity: 3, glow: true },
      { kind: 'sticker', emoji: '🐉👸🛡️', text: 'Drache', intensity: 3, glow: true },
      { kind: 'lower-third', title: 'Max Mustermann', subtitle: 'Gast', emoji: '🎤', intensity: 3, glow: true },
      {
        kind: 'combo',
        steps: [
          { delay: 0, visual: { kind: 'card', emoji: '🏁', text: 'GO', intensity: 3, glow: true } },
          { delay: 150, visual: { kind: 'confetti', intensity: 3 } },
          { delay: 300, visual: { kind: 'text', text: 'COMBO', style: 'bounce', intensity: 3 } },
        ],
      },
    ];
    const list = [{ kind: 'scene', scene: 'rain', text: 'Es regnet', intensity: 3 }];
    for (let k = 0; k < 3; k++) list.push(...round);
    const longTasks = [];
    let po = null;
    try {
      po = new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration)));
      po.observe({ type: 'longtask', buffered: false });
    } catch (_) {
      po = null;
    }
    const frames = [];
    let maxNodes = 0;
    let maxHeap = 0;
    let last = 0;
    let running = true;
    const tick = (t) => {
      if (last) frames.push(t - last);
      last = t;
      const n = stage.getElementsByTagName('*').length;
      if (n > maxNodes) maxNodes = n;
      if (performance.memory && performance.memory.usedJSHeapSize > maxHeap) maxHeap = performance.memory.usedJSHeapSize;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const t0 = performance.now();
    const gap = 3000 / list.length;
    list.forEach((visual, i) => setTimeout(() => r.fire({ id: `perf-${i}`, visual }), Math.round(i * gap)));
    await new Promise((res) => setTimeout(res, 5000));
    running = false;
    if (po) po.disconnect();
    const sorted = frames.slice().sort((a, b) => a - b);
    const mean = frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length);
    const p99 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))] : 0;
    return {
      frames: frames.length,
      frameMean: mean,
      frameP99: p99,
      maxNodes,
      longTasks: longTasks.length,
      longTaskMs: longTasks.reduce((a, b) => a + b, 0),
      heapMB: maxHeap / 1048576,
      elapsed: performance.now() - t0,
      perf: r.perf || null,
      perfSwitches: (r.stats && r.stats.perfSwitches) || 0,
    };
  }, imgSrc);
}

async function metrics(cdp) {
  const { metrics: list } = await cdp.send('Performance.getMetrics');
  const m = {};
  for (const x of list) m[x.name] = x.value;
  return m;
}

const round1 = (n) => Math.round(n * 10) / 10;

async function run({ browser, startServer, shotDir, log }) {
  const server = await startServer();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    // ?perf=high pins the full look, so the run measures the cheaper CSS / single render path and not an
    // auto switch to eco (older builds ignore the parameter).
    await page.goto(`${server.base}/overlay.html?perf=high`);
    await page.waitForFunction(() => window.livefx && window.livefx.renderer && window.livefx.bus.serverOk, null, { timeout: 5000 });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    const imgSrc = `${server.base}/icons/icon-192.png`;

    const runs = [];
    for (let i = 0; i < 2; i++) {
      const before = await metrics(cdp);
      const res = await burst(page, imgSrc);
      const after = await metrics(cdp);
      res.taskMs = (after.TaskDuration - before.TaskDuration) * 1000;
      res.styleMs = (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000;
      res.layoutMs = (after.LayoutDuration - before.LayoutDuration) * 1000;
      res.taskPerFrame = res.taskMs / Math.max(1, res.frames); // more frames rendered = more total work, so compare per frame
      runs.push(res);
      log(`run ${i + 1}`, JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, typeof v === 'number' ? round1(v) : v]))));
      await page.evaluate(() => {
        window.livefx.renderer.clear();
        window.livefx.renderer.clearScene();
      });
      await sleep(1500);
    }
    const avg = (k) => round1(runs.reduce((a, r) => a + r[k], 0) / runs.length);
    const now = {
      frameMean: avg('frameMean'),
      frameP99: avg('frameP99'),
      maxNodes: Math.max(...runs.map((r) => r.maxNodes)),
      longTasks: avg('longTasks'),
      longTaskMs: avg('longTaskMs'),
      heapMB: avg('heapMB'),
      taskMs: avg('taskMs'),
      styleMs: avg('styleMs'),
      layoutMs: avg('layoutMs'),
      taskPerFrame: avg('taskPerFrame'),
    };
    log('BASELINE', JSON.stringify(BASELINE));
    log('NOW     ', JSON.stringify(now));
    const pct = (k) => {
      const d = Math.round((now[k] / BASELINE[k] - 1) * 100);
      return `${k} ${d > 0 ? '+' : ''}${d} %`;
    };
    log(`change vs baseline: ${['frameMean', 'frameP99', 'maxNodes', 'longTaskMs', 'taskMs', 'taskPerFrame', 'layoutMs'].map(pct).join(', ')}`);

    // Regression bounds (generous – machines differ): the single render path keeps the DOM small, and the
    // frame time stays well below the recorded baseline (measured: about -55 % mean / -70 % p99).
    assert.ok(now.maxNodes <= BASELINE.maxNodes * 0.6, `DOM nodes ${now.maxNodes} > 60 % of baseline ${BASELINE.maxNodes}`);
    assert.ok(now.frameMean <= BASELINE.frameMean * 0.8 || now.frameP99 <= BASELINE.frameP99 * 0.8, `frame time regressed: mean ${now.frameMean} / p99 ${now.frameP99} ms`);
    assert.ok(runs.every((r) => r.frames > 30), 'rAF kept running during the burst');
    assert.equal(runs[0].perf, 'high', '?perf=high pins the mode');
    assert.equal(runs[0].perfSwitches, 0, 'a pinned mode never auto-switches');

    // Screenshots: card with rays at intensity 3 and the rain scene (visual check).
    await page.evaluate(() => window.livefx.renderer.fire({ id: 'shot-card', visual: { kind: 'card', emoji: '🔥', text: 'BOOM', intensity: 3, glow: true } }));
    await sleep(600);
    await page.screenshot({ path: path.join(shotDir, 'perf-card-rays.png') });
    await page.evaluate(() => {
      window.livefx.renderer.clear();
      window.livefx.renderer.fire({ id: 'shot-scene', visual: { kind: 'scene', scene: 'rain', text: 'Es regnet in Strömen', intensity: 3 } });
    });
    await sleep(2500);
    await page.screenshot({ path: path.join(shotDir, 'perf-scene-rain.png') });
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    await ctx.close();
  } finally {
    await server.stop();
  }
}

module.exports = { run, burst, BASELINE };
