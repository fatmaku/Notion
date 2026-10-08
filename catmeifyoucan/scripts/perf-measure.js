#!/usr/bin/env node
// Cat Me If You Can – Ladezeit bei schwachem Mobilnetz messen (Erweiterung perf).
//
// Startseite (/) und App (/app.html, angemeldete Spielerin, Ansicht „Heute“) in Chromium mit
// 1,6 Mbit/s runter, 750 kbit/s hoch, 150 ms Laufzeit und 4× langsamerer CPU (wie „Slow 4G“).
// Jede Messung startet mit leerem Cache; danach ein zweiter Besuch (Cache + Service Worker).
//
//   CATME_DEMO=1 CATME_AI=mock PORT=8790 node server.js &
//   node scripts/perf-measure.js                 # BASE=http://127.0.0.1:8790 RUNS=3 PERF_LANG=en
//   BASE=http://127.0.0.1:8790 RUNS=5 PERF_LANG=tr OUT=perf-tr.json node scripts/perf-measure.js
//
// Ausgabe je Seite (Median): übertragene KB, Anfragen, FCP, DOMContentLoaded, load, LCP und
// „bereit“ (Startseite: Skript fertig, Knöpfe gehen; App: „Heute“ ist gezeichnet), Start der 3D-Szene.
// Hinweis: jede App-Messung legt eine Spielerin an (Ratenbegrenzung: ~20 am Stück je IP).

import fs from 'node:fs';
import { loadPlaywright, launchOptions } from '../test/helpers/playwright.js';

const base = (process.env.BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const runs = Math.max(1, Number(process.env.RUNS) || 3);
const lang = process.env.PERF_LANG || 'en';
const NET = { offline: false, latency: 150, downloadThroughput: (1.6 * 1e6) / 8, uploadThroughput: (750 * 1e3) / 8 };

async function register() {
  const r = await fetch(`${base}/api/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: `Perf${Math.floor(Math.random() * 1e6)}`, lang }),
  });
  const j = await r.json();
  if (!j.token) throw new Error(`Anmelden ging nicht: ${JSON.stringify(j)}`);
  return j.token;
}

/** Läuft vor jedem Seitenskript: LCP mitschreiben und „bereit“ erkennen. */
function probe(kind) {
  window.__perf = { lcp: 0, ready: 0, hero3d: 0 };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__perf.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    /* alter Browser */
  }
  const mark = () => {
    const p = window.__perf;
    if (kind === 'landing') {
      if (!p.ready && window.__catme && document.querySelector('.hero')) p.ready = performance.now();
      if (!p.hero3d && document.querySelector('#hero.is-3d')) p.hero3d = performance.now();
    } else if (!p.ready && document.querySelector('.hero-card')) p.ready = performance.now();
  };
  new MutationObserver(mark).observe(document, { subtree: true, childList: true, attributes: true });
  const iv = setInterval(() => {
    mark();
    if (window.__perf.ready && (kind !== 'landing' || window.__perf.hero3d)) clearInterval(iv);
  }, 50);
}

async function measure(ctx, page, url) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', NET);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const seen = new Set();
  let bytes = 0;
  let requests = 0;
  let inflight = 0;
  let lastChange = Date.now();
  cdp.on('Network.requestWillBeSent', (e) => {
    if (!seen.has(e.requestId)) {
      seen.add(e.requestId);
      inflight++;
    }
    lastChange = Date.now();
  });
  const done = (e) => {
    inflight--;
    lastChange = Date.now();
    if (e.encodedDataLength != null) {
      bytes += e.encodedDataLength;
      requests++;
    }
  };
  cdp.on('Network.loadingFinished', done);
  cdp.on('Network.loadingFailed', done);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__perf && window.__perf.ready > 0, null, { timeout: 120000 });
  for (let i = 0; i < 160 && !(inflight <= 0 && Date.now() - lastChange > 2000); i++) await page.waitForTimeout(250);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return { fcp: fcp ? fcp.startTime : 0, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, lcp: window.__perf.lcp, ready: window.__perf.ready, hero3d: window.__perf.hero3d };
  });
  await cdp.detach().catch(() => {});
  return { ...m, kB: bytes / 1024, requests, quiet: lastChange - t0 };
}

const med = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

const pw = await loadPlaywright();
const browser = await pw.chromium.launch(launchOptions());
const all = {};
try {
  for (const kind of ['landing', 'app']) {
    const url = kind === 'landing' ? `${base}/?lang=${lang}` : `${base}/app.html`;
    for (const visit of ['first', 'repeat']) all[`${kind}:${visit}`] = [];
    for (let i = 0; i < runs; i++) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: lang });
      const token = kind === 'app' ? await register() : null;
      await ctx.addInitScript(({ token, lang }) => {
        try {
          localStorage.setItem('catme.lang', lang);
          if (token) localStorage.setItem('catme.token', token);
        } catch {
          /* egal */
        }
      }, { token, lang });
      await ctx.addInitScript(probe, kind);
      const first = await ctx.newPage();
      all[`${kind}:first`].push(await measure(ctx, first, url));
      await first.waitForTimeout(1500); // Service Worker installieren lassen
      const again = await ctx.newPage();
      await first.close();
      all[`${kind}:repeat`].push(await measure(ctx, again, url));
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

const summary = {};
for (const [k, list] of Object.entries(all)) {
  summary[k] = Object.fromEntries(['kB', 'requests', 'fcp', 'dcl', 'load', 'lcp', 'ready', 'hero3d', 'quiet'].map((f) => [f, Math.round(med(list.map((r) => r[f] || 0)) * 10) / 10]));
}
console.log(`Messung ${base} · Sprache ${lang} · ${runs}× · 1,6 Mbit/s, 150 ms, CPU ×4 (Median, Zeiten in ms)`);
console.table(summary);
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({ base, lang, runs, net: NET, summary, all }, null, 2));
