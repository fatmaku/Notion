// Cat Me If You Can – End-to-End-Test im echten Browser (Chromium über Playwright).
//
// Ablauf: Server (Mock-Analyse, Demo-Daten) → Spitzname → Kamera (Fake-Kamera zeigt eine echte
// Katze) → AR-Erkennung → Fang → Namensgebung (Schimpfwort wird abgelehnt) → Gutschein →
// Café-Ansicht prüft und löst ein → Moderation → Demo-Modus ohne Server.
//
// node test/e2e.js            (Screenshots: E2E_SHOTS=/pfad)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { loadPlaywright, launchOptions } from './helpers/playwright.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const shots = process.env.E2E_SHOTS || null;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-e2e-'));
const log = (...a) => console.log('[e2e]', ...a);
let failures = 0;
const check = (cond, msg) => {
  if (cond) log('✓', msg);
  else {
    failures++;
    console.error('[e2e] ✗', msg);
  }
};

function fakeCameraFile() {
  const out = path.join(tmp, 'cat.y4m');
  try {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-loop', '1', '-i', path.join(here, 'fixtures', 'cat.jpg'), '-t', '3', '-r', '10', '-vf', 'scale=640:-2,format=yuv420p', out]);
    return out;
  } catch {
    return null; // ohne ffmpeg: Chromiums Standard-Testbild (dann ohne Katzenerkennung)
  }
}

const pw = await loadPlaywright();
const app = await createApp({ dataDir: path.join(tmp, 'data'), aiMode: 'mock', demo: true, log: () => {} });
await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.server.address().port}`;
log('Server:', base);

// Partner-Café mit Schwelle 1 Katze für den Test anlegen
const admin = { Authorization: `Bearer ${app.adminToken}`, 'Content-Type': 'application/json' };
const partnerRes = await fetch(`${base}/api/admin/places`, {
  method: 'POST', headers: admin,
  body: JSON.stringify({ type: 'partner', name: 'Test Kafe', lat: 40.9840, lon: 29.0270, address: 'Moda', reward: { minCats: 1, discountPct: 20 }, pin: '135790' }),
});
const partner = await partnerRes.json();
check(partnerRes.status === 200 && partner.id, 'Partner-Café über die Admin-API angelegt');

const y4m = fakeCameraFile();
const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
if (y4m) args.push(`--use-file-for-fake-video-capture=${y4m}`);
const browser = await pw.chromium.launch(launchOptions({ args }));
const ctx = await browser.newContext({
  // E2E_IGNORE_TLS=1: nur für Umgebungen mit TLS-abfangendem Proxy (Modell-Download von googleapis)
  ignoreHTTPSErrors: process.env.E2E_IGNORE_TLS === '1',
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'de-DE',
  permissions: ['camera', 'geolocation'], geolocation: { latitude: 40.98425, longitude: 29.02655, accuracy: 9 },
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !/ERR_TUNNEL|ERR_PROXY|ERR_NAME|tile|Failed to load resource/i.test(m.text())) errors.push(m.text());
});
const shot = async (name, opts = {}) => {
  if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`), ...opts });
};

try {
  // ---- Onboarding
  await page.goto(base);
  await page.waitForSelector('.onboarding');
  await page.fill('#nick', 'Orospu');
  await page.click('.onb-form button');
  await page.waitForSelector('.toast.error');
  check(true, 'Schimpfwort als Spitzname abgelehnt');
  await page.fill('#nick', 'Deniz Moda');
  await page.click('.onb-form button');
  await page.waitForSelector('.hero-card');
  check(await page.locator('.ring-text b').innerText() === '0', 'Startseite zeigt 0 Katzen');

  // ---- Fangen
  await page.goto(`${base}/#/catch`);
  await page.waitForFunction(() => document.querySelector('.cam-video') && document.querySelector('.cam-video').readyState >= 2, null, { timeout: 15000 });
  check(true, 'Kamera läuft');
  let arLocked = false;
  try {
    await page.waitForSelector('.cam[data-state="locked"]', { timeout: 45000 });
    arLocked = true;
  } catch {
    /* Modell nicht ladbar (offline) */
  }
  const arText = await page.locator('[data-ar]').innerText();
  if (arLocked) check(true, `AR-Erkennung findet die Katze (COCO-SSD: ${arText})`);
  else if (/AR (aus|off)|AR kapalı/i.test(arText)) log('⚠ AR-Modell nicht ladbar (offline?) – Test läuft ohne Katzenerkennung weiter');
  else check(!y4m, 'AR-Erkennung findet die Katze (COCO-SSD)');
  await page.waitForFunction(() => !/…/.test(document.querySelector('[data-loc]').textContent), null, { timeout: 10000 });
  await shot('e2e-1-camera');
  await page.click('[data-shoot]');
  await page.waitForSelector('.catcard', { timeout: 30000 });
  await page.waitForTimeout(400);
  await shot('e2e-2-card', { fullPage: false });
  check(await page.locator('.burst').count() === 1, 'Sammelkarte: NEUE KATZE');
  check(await page.locator('.namebox').count() === 1, 'Erstfinder:in darf den Namen geben');

  // Namensfilter (Klartext + verschleiert) und gültiger Name
  for (const bad of ['Siktir', 'f.u.c.k', 'S1KT1R']) {
    await page.fill('.namebox input', bad);
    await page.click('.namebox button.primary');
    await page.waitForSelector('.toast.error');
    await page.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  }
  check(await page.locator('.namebox').count() === 1, 'Schimpfwörter als Katzennamen abgelehnt (auch verschleiert)');
  await page.fill('.namebox input', 'Duman');
  await page.click('.namebox button.primary');
  await page.waitForFunction(() => document.querySelector('[data-name]').textContent === 'Duman');
  check(true, 'Katze heißt jetzt „Duman“');
  await page.click('.catcard [data-close].btn.primary');

  // ---- Profil der Katze, Rangliste
  const catId = await page.evaluate(async () => {
    const r = await fetch('/api/me/dex', { headers: { Authorization: `Bearer ${localStorage.getItem('catme.token')}` } });
    return (await r.json()).entries[0].catId;
  });
  await page.goto(`${base}/#/cat/${catId}`);
  await page.waitForSelector('.cat-hero');
  check((await page.locator('.cat-hero h1').innerText()).includes('Duman'), 'Katzenprofil zeigt den Namen');
  check((await page.locator('.rank li').first().innerText()).includes('Deniz Moda'), 'Fänger-Rangliste: Entdecker:in ganz oben');
  await shot('e2e-3-cat', { fullPage: true });

  // ---- Gutschein
  await page.goto(`${base}/#/voucher`);
  await page.waitForSelector('.voucher');
  await page.waitForSelector('.v-qr svg', { timeout: 5000 });
  const code = (await page.locator('.v-code b').innerText()).trim();
  check(/^CAT-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), `Gutschein mit QR-Code: ${code}`);
  await shot('e2e-4-voucher', { fullPage: true });

  // ---- Café löst ein
  const staff = await ctx.newPage();
  await staff.goto(`${base}/partner.html`);
  await staff.waitForSelector('select[name="partnerId"]');
  await staff.selectOption('select[name="partnerId"]', partner.id);
  await staff.fill('input[name="pin"]', '000000');
  await staff.click('form button.primary');
  await staff.waitForSelector('[data-err]:not([hidden])');
  check(true, 'Falsche PIN abgelehnt');
  await staff.fill('input[name="pin"]', '135790');
  await staff.click('form button.primary');
  await staff.waitForSelector('[data-start]');
  await staff.fill('.codeform input', code.toLowerCase().replace(/-/g, ' '));
  await staff.click('.codeform button');
  await staff.waitForSelector('.result.ok');
  check(true, 'Café: Gutschein GÜLTIG (auch klein/ohne Bindestriche getippt)');
  await staff.click('[data-redeem]');
  await staff.waitForSelector('.result.done');
  check(true, 'Café: eingelöst');
  if (shots) await staff.screenshot({ path: path.join(shots, 'e2e-5-partner.png'), fullPage: true });
  await staff.fill('.codeform input', code);
  await staff.click('.codeform button');
  await staff.waitForSelector('.result.bad');
  check((await staff.locator('.result-why').innerText()).length > 0, 'Zweites Einlösen wird abgelehnt');

  await page.reload();
  await page.waitForSelector('.voucher.redeemed');
  check(true, 'Spieler:in sieht „Eingelöst“');

  // ---- Moderation
  const mod = await ctx.newPage();
  await mod.goto(`${base}/admin.html`);
  await mod.fill('input[name="token"]', app.adminToken);
  await mod.click('form button');
  await mod.waitForSelector('[data-tab="queue"]');
  await mod.click('[data-tab="places"]');
  await mod.waitForSelector('.place-form');
  check(await mod.locator('details.review').count() >= 6, 'Moderation listet Cafés und Orte');
  if (shots) await mod.screenshot({ path: path.join(shots, 'e2e-6-admin.png'), fullPage: true });

  // ---- Statistik & Karte
  await page.goto(`${base}/#/stats`);
  await page.waitForSelector('.viz');
  check(await page.locator('.viz').count() >= 6, 'Statistik zeigt Diagramme');
  await page.goto(`${base}/#/map`);
  await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 });
  check(await page.locator('.pin-cat').count() > 10, 'Karte zeigt Katzen');

  // ---- Demo-Modus ohne Server (Engine im Browser)
  const demo = await ctx.newPage();
  await demo.goto(`${base}/?demo=1`);
  await demo.waitForSelector('.onboarding');
  await demo.fill('#nick', 'DemoKedi');
  await demo.click('.onb-form button');
  await demo.waitForSelector('.hero-card');
  await demo.goto(`${base}/?demo=1#/dex?tab=all`);
  await demo.waitForSelector('.tile');
  check(await demo.locator('.tile').count() > 20, 'Demo-Modus im Browser mit Demo-Katzen');
  await demo.close();

  check(!errors.length, `keine JS-Fehler${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  failures++;
  console.error('[e2e] Abbruch:', e);
  await shot('e2e-error', { fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures) {
  console.error(`[e2e] ${failures} Fehler`);
  process.exit(1);
}
log('alles grün');
