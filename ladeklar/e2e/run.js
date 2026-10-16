// End-to-end test of every role on real devices sizes, against a fresh server:
// licensor (desktop) → company admin (desktop + tablet) → driver (phone, touch) and back.
// Writes screenshots to e2e/screens and the report to e2e/TESTBERICHT.md.
//   node e2e/run.js            (needs Playwright's Chromium, see README)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../server/index.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SHOTS = path.join(HERE, 'screens');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const FIX = (f) => path.join(HERE, 'fixtures', f);
const results = [];
const errors = [];
let shotN = 0;

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ladeklar-e2e-'));
const srv = createServer({ dataDir, quiet: true, platformEmail: 'inhaber@ladeklar.de', platformPassword: 'Plattform-Test-2026' });
const port = await srv.listen(0, '127.0.0.1');
const BASE = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ args: ['--lang=de-DE'], env: { ...process.env, LANG: 'de_DE.UTF-8', LANGUAGE: 'de', LC_ALL: 'de_DE.UTF-8' } });

async function page(name, vp, extra = {}) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'de-DE', timezoneId: 'Europe/Berlin', deviceScaleFactor: vp.width < 500 ? 2 : 1, ...extra });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/401|Failed to load resource/.test(m.text())) errors.push(`[${name}] console: ${m.text()}`); });
  p.ctx = ctx;
  return p;
}
async function step(role, name, fn) {
  const t0 = Date.now();
  try { const shot = await fn(); results.push({ role, name, ok: true, ms: Date.now() - t0, shot }); console.log('  ✓', role, '–', name); }
  catch (e) { results.push({ role, name, ok: false, ms: Date.now() - t0, err: e.message.split('\n')[0] }); console.log('  ✗', role, '–', name, '\n     ', e.message.split('\n')[0]); }
}
async function shot(p, name, full = false) { await wait(650); const f = `${String(++shotN).padStart(2, '0')}-${name}.png`; await p.screenshot({ path: path.join(SHOTS, f), fullPage: full }); return f; }
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function officeLogin(p, email, password) {
  await p.goto(BASE + '/');
  await p.click('[data-act="loginMode"][data-m="office"]');
  await p.fill('form[data-form=office] input[name=email]', email);
  await p.fill('form[data-form=office] input[name=password]', password);
  await p.click('form[data-form=office] button[type=submit]');
  await p.waitForSelector('.shell', { timeout: 8000 });
}
const kpi = async (p, tab) => Number(await p.locator(`.kpi[data-tab=${tab}] .k-v`).innerText());
async function toastWith(p, re, ms = 6000) {
  const loc = p.locator('.toast', { hasText: re }).first();
  await loc.waitFor({ timeout: ms });
  return loc;
}

let adminPw, pin, bookingNo, bookingNo2;
const lic = await page('Lizenzgeber', { width: 1440, height: 900 });
const office = await page('Unternehmen', { width: 1440, height: 900 });
const phone = await page('Fahrer', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });

console.log('\nLADEKLAR E2E gegen', BASE);

// ---------------- Lizenzgeber ----------------
await step('Lizenzgeber', 'Anmeldeseite lädt mit Marke und Sprachen', async () => {
  await lic.goto(BASE + '/');
  await lic.waitForSelector('.login .wordmark');
  expect(await lic.locator('.langs button').count() === 8, '8 Sprachen erwartet');
  return shot(lic, 'login-desktop');
});
await step('Lizenzgeber', 'Anmelden (E-Mail + Passwort)', async () => { await officeLogin(lic, 'inhaber@ladeklar.de', 'Plattform-Test-2026'); await lic.waitForSelector('.mrr'); return shot(lic, 'lizenzgeber-uebersicht'); });
await step('Lizenzgeber', 'Lizenznehmer anlegen (Tarif Flotte, 30 Tage Test)', async () => {
  await lic.click('[data-act=newTenant] >> nth=0');
  const f = lic.locator('form[data-form=tenant]');
  await f.locator('[name=name]').fill('Test Spedition GmbH');
  await f.locator('[name=code]').fill('TEST');
  await f.locator('[name=contact]').fill('Petra Test');
  await f.locator('[name=adminEmail]').fill('petra@test-spedition.de');
  await f.locator('[name=plan]').selectOption('flotte');
  await lic.click('button[form=ntForm]');
  await lic.waitForSelector('[data-key=created] .secret');
  adminPw = (await lic.locator('[data-key=created] .secret .grow').innerText()).trim();
  expect(adminPw.length >= 12, 'Startpasswort fehlt');
  return shot(lic, 'lizenzgeber-angelegt');
});

// ---------------- Unternehmen ----------------
await step('Unternehmen', 'Admin meldet sich mit Startpasswort an – zuerst eigenes Passwort, vorher geht nichts', async () => {
  await office.goto(BASE + '/');
  await office.click('[data-act="loginMode"][data-m="office"]');
  await office.fill('form[data-form=office] input[name=email]', 'petra@test-spedition.de');
  await office.fill('form[data-form=office] input[name=password]', adminPw);
  await office.click('form[data-form=office] button[type=submit]');
  await office.waitForSelector('form[data-form=firstPassword]');
  const blocked = await office.evaluate(async () => (await (await fetch('/api/call/listDeliveries', { method: 'POST', headers: { 'X-Ladeklar': '1', 'Content-Type': 'application/json' }, body: '{}' })).json()).error?.code);
  expect(blocked === 'password_change', 'Startpasswort darf nichts freigeben: ' + blocked);
  const s = await shot(office, 'unternehmen-erstes-passwort');
  await office.fill('form[data-form=firstPassword] [name=current]', adminPw);
  await office.fill('form[data-form=firstPassword] [name=next]', 'Petra-Neu-Passwort-1');
  await office.fill('form[data-form=firstPassword] [name=again]', 'Petra-Neu-Passwort-1');
  await office.click('form[data-form=firstPassword] button[type=submit]');
  await office.waitForSelector('.kpi');
  await toastWith(office, /Passwort geändert/);
  return s;
});
await step('Unternehmen', 'Logo hochladen, Farbe und App-Name setzen (White-Label)', async () => {
  await office.click('.rail [data-to=settings]');
  await office.click('[data-act=ssec][data-k=brand]');
  await office.setInputFiles('input[data-input=logoFile]', FIX('logo.png'));
  await toastWith(office, /Logo gespeichert/, 10000);
  await office.click('[data-act=pickColor][data-c="#7c2d12"]');
  await office.fill('form[data-form=brand] [name=appName]', 'TS Fahrer');
  await office.click('form[data-form=brand] button[type=submit]');
  await toastWith(office, /neue Marke/);
  expect(await office.locator('.rail .logo-chip img').count() === 1, 'Logo nicht in der Navigation');
  const brand = await office.evaluate(() => getComputedStyle(document.getElementById('app')).getPropertyValue('--brand').trim());
  expect(brand === '#7c2d12', 'Markenfarbe nicht aktiv: ' + brand);
  return shot(office, 'unternehmen-marke');
});
await step('Unternehmen', 'Fahrzeug-Pool anlegen (LKW + Auflieger)', async () => {
  await office.click('.rail [data-to=vehicles]');
  await office.click('[data-act=newVehicle] >> nth=0');
  await office.fill('form[data-form=vehicle] [name=plate]', 'b-ts 100');
  await office.fill('form[data-form=vehicle] [name=name]', 'MAN TGX');
  await office.click('button[form=vForm]');
  await toastWith(office, /B-TS 100/);
  await office.click('[data-act=newVehicle] >> nth=0');
  await office.click('[data-act=vformKind][data-k=trailer]');
  await office.fill('form[data-form=vehicle] [name=plate]', 'B-TS 900');
  await office.click('button[form=vForm]');
  await toastWith(office, /B-TS 900/);
  await office.waitForSelector('[data-key^="v-"] >> nth=1');
  return shot(office, 'unternehmen-fahrzeuge');
});
await step('Unternehmen', 'Fahrer anlegen → PIN + Einladung mit QR-Code', async () => {
  await office.click('.rail [data-to=drivers]');
  await office.click('[data-act=newDriver] >> nth=0');
  await office.fill('form[data-form=driver] [name=name]', 'Tomasz Kowalski');
  await office.fill('form[data-form=driver] [name=phone]', '0151 2345678');
  await office.selectOption('form[data-form=driver] [name=lang]', 'pl');
  await office.click('button[form=drvForm]');
  await office.waitForSelector('#pin-val');
  pin = (await office.locator('#pin-val').innerText()).replace(/\s/g, '');
  expect(/^\d{6}$/.test(pin), 'PIN fehlt');
  expect(await office.locator('.qr svg').count() === 1, 'QR fehlt');
  const s = await shot(office, 'unternehmen-fahrer-einladung');
  await office.click('[data-key=access] [data-act=close]');
  return s;
});
await step('Unternehmen', 'Lieferung Stuttgart → Hamburg anlegen (offen für alle Fahrer)', async () => {
  await office.click('.rail [data-to=live]');
  await office.click('[data-act=newDelivery] >> nth=0');
  await office.fill('#dForm [name="pickup.place"]', 'Bosch Werk Feuerbach');
  await office.fill('#dForm [name="pickup.city"]', 'Stuttgart');
  await office.fill('#dForm [name="pickup.from"]', '07:00');
  await office.fill('#dForm [name="dropoff.city"]', 'Hamburg');
  await office.fill('#dForm [name="goods.text"]', 'Ersatzteile');
  await office.fill('#dForm [name="goods.pallets"]', '18');
  const s = await shot(office, 'unternehmen-neue-lieferung');
  await office.click('button[form=dForm]');
  await office.waitForSelector('[data-key=delivery] .sheet-h .mono');
  bookingNo = (await office.locator('[data-key=delivery] .sheet-h .mono').innerText()).trim();
  expect(/^TES-\d{4}-0001$/.test(bookingNo), 'Buchungsnummer ' + bookingNo);
  await office.keyboard.press('Escape');
  return s;
});

// ---------------- Fahrer (Handy) ----------------
await step('Fahrer', 'Firmen-Login /t/TEST zeigt Logo, Anmeldung per PIN-Tastatur', async () => {
  await phone.goto(BASE + '/t/TEST');
  await phone.waitForSelector('.brandlogin .logo-chip img');
  await phone.fill('form[data-form=driver] [name=phone]', '+49 151 2345678');
  const s = await shot(phone, 'fahrer-login');
  for (const k of pin) await phone.tap(`[data-act=pinKey][data-k="${k}"]`);
  await phone.waitForSelector('.drv');
  expect((await phone.evaluate(() => document.documentElement.lang)) === 'pl', 'Fahrer-Sprache Polnisch erwartet');
  return s;
});
await step('Fahrer', 'LKW und Auflieger aus dem Pool wählen', async () => {
  await phone.tap('[data-key=pick-truck] .step-btn');
  await phone.waitForSelector('[data-act=pickVehicle][data-kind=truck]');
  await phone.tap('[data-act=pickVehicle][data-kind=truck]');
  await phone.waitForSelector('[data-act=pickVehicle][data-kind=truck][aria-pressed=true]');
  await phone.tap('[data-act=pickVehicle][data-kind=trailer]:not([data-id=""])');
  await phone.waitForSelector('[data-act=pickVehicle][data-kind=trailer][aria-pressed=true]:not([data-id=""])');
  const s = await shot(phone, 'fahrer-fahrzeug-pool');
  await phone.tap('[data-key=sheet] [data-act=close], .sheet [data-act=close] >> nth=0');
  await phone.waitForSelector('.vbtn .plate');
  return s;
});
await step('Fahrer', 'Offene Lieferung sehen und Buchung bestätigen (1 Tipp)', async () => {
  await phone.waitForSelector('[data-act=step][data-step=accepted]');
  const s = await shot(phone, 'fahrer-offener-auftrag');
  await phone.tap('[data-act=step][data-step=accepted]');
  await phone.waitForSelector('.success');
  return s;
});
await step('Unternehmen', 'Bestätigung kommt live an (Mitteilung, Live-Board ohne Neuladen)', async () => {
  await toastWith(office, /Tomasz Kowalski/);
  await office.waitForFunction(() => document.querySelector('.kpi[data-tab=live] .k-v')?.textContent === '1', null, { timeout: 5000 });
  return shot(office, 'unternehmen-live-bestaetigt');
});
await step('Fahrer', 'Aufgeladen – Rückgängig ist 2 Minuten möglich', async () => {
  await phone.waitForSelector('.success', { state: 'detached', timeout: 4000 });
  await phone.tap('.step-btn[data-step=loaded]');
  await phone.waitForSelector('.undo');
  await phone.tap('[data-act=undo]');
  await phone.waitForSelector('.step-btn[data-step=loaded]');
  await phone.tap('.step-btn[data-step=loaded]');
  await phone.waitForSelector('.success');
  await phone.waitForSelector('.success', { state: 'detached', timeout: 4000 });
  return shot(phone, 'fahrer-unterwegs');
});
await step('Fahrer', 'Funkloch: Abgeladen offline tippen, wird später gesendet', async () => {
  await phone.ctx.setOffline(true);
  await phone.tap('.step-btn[data-step=unloaded]');
  await phone.waitForSelector('.offline');
  const s = await shot(phone, 'fahrer-offline');
  await phone.ctx.setOffline(false);
  await phone.waitForSelector('.offline', { state: 'detached', timeout: 20000 });
  await toastWith(office, /Entladen|Abgeladen/, 10000);
  return s;
});
await step('Fahrer', 'Notiz an die Disposition', async () => {
  await phone.waitForSelector('.step-btn[data-step=delivered]', { timeout: 8000 });
  await phone.tap('.quick [data-type=note]');
  await phone.tap('.chip >> nth=1');
  await phone.tap('button[form=noteForm]');
  await toastWith(office, /Notiz/);
  await phone.tap('.sheet [data-act=close] >> nth=0').catch(() => {});
});
await step('Fahrer', 'Lieferschein fotografieren, Empfänger, abschließen', async () => {
  await phone.tap('.step-btn[data-step=delivered]');
  await phone.waitForSelector('input[data-input=podFile]', { state: 'attached' });
  await phone.setInputFiles('input[data-input=podFile]', FIX('lieferschein.jpg'));
  await phone.waitForSelector('[data-key=pod] .doc img', { timeout: 10000 });
  await phone.fill('#pod-receiver', 'Herr Jensen');
  const s = await shot(phone, 'fahrer-lieferschein');
  await phone.tap('[data-act=finish]');
  await phone.waitForSelector('.success');
  await shot(phone, 'fahrer-zugestellt');
  return s;
});
await step('Unternehmen', 'Zugestellt mit Lieferschein: Verlauf, Foto, Abliefernachweis', async () => {
  await toastWith(office, /Zugestellt/);
  await office.waitForFunction(() => document.querySelector('.kpi[data-tab=done] .k-v')?.textContent === '1', null, { timeout: 5000 });
  await office.click('.rail [data-to=deliveries]');
  await office.click('[data-act=dtab][data-tab=done]');
  await office.click(`tr[data-act=openDelivery] >> text=${bookingNo}`);
  await office.waitForSelector('[data-key=delivery] .doc img');
  const tl = await office.locator('[data-key=delivery] .timeline').innerText();
  expect(/Zugestellt/.test(tl) && /Aufgeladen/.test(tl) && /Schritt zurückgenommen/.test(tl), 'Verlauf unvollständig');
  const s = await shot(office, 'unternehmen-lieferung-zugestellt');
  await office.click('[data-act=proof]');
  await office.waitForSelector('.proof-doc img');
  await shot(office, 'unternehmen-abliefernachweis');
  await office.keyboard.press('Escape');
  return s;
});
await step('Unternehmen', 'Zweite Lieferung direkt dem Fahrer zuweisen', async () => {
  await office.click('[data-act=newDelivery] >> nth=0');
  await office.fill('#dForm [name="pickup.city"]', 'Ludwigsburg');
  await office.fill('#dForm [name="dropoff.city"]', 'München');
  await office.selectOption('#dForm [name=driverId]', { label: 'Tomasz Kowalski' });
  await office.click('button[form=dForm]');
  await office.waitForSelector('[data-key=delivery] .sheet-h .mono');
  bookingNo2 = (await office.locator('[data-key=delivery] .sheet-h .mono').innerText()).trim();
  await office.keyboard.press('Escape');
});
await step('Fahrer', 'Push-Mitteilung „Neuer Auftrag“ (in der Sprache des Fahrers) und Problem melden', async () => {
  await toastWith(phone, new RegExp(bookingNo2));
  await phone.waitForSelector('[data-act=step][data-step=accepted]');
  await phone.tap('[data-act=step][data-step=accepted]');
  await phone.waitForSelector('.success', { state: 'detached', timeout: 5000 });
  await phone.tap('.quick .warn');
  await phone.tap('[data-act=pickProblem][data-code=delay]');
  await phone.fill('#problem-note', 'A8 Stau Leonberg');
  const s = await shot(phone, 'fahrer-problem');
  await phone.tap('button[form=problemForm]');
  await phone.waitForSelector('.sheet', { state: 'detached' });
  return s;
});
await step('Unternehmen', 'Problem kommt als dringende Mitteilung, Störung wird erledigt', async () => {
  await toastWith(office, /Stau/);
  expect(await office.locator('.toast.high').count() >= 1, 'keine dringende Mitteilung');
  await office.click('.rail [data-to=live]');
  await office.waitForFunction(() => document.querySelector('.kpi[data-tab=problems] .k-v')?.textContent === '1', null, { timeout: 5000 });
  const s = await shot(office, 'unternehmen-stoerung');
  await office.click('.tour.prob');
  await office.click('[data-act=resolve]');
  await office.waitForFunction(() => document.querySelector('.kpi[data-tab=problems] .k-v')?.textContent === '0', null, { timeout: 5000 });
  await office.keyboard.press('Escape');
  return s;
});
await step('Fahrer', 'Funkloch bis zum Schluss: Aufgeladen, Abgeladen, Lieferschein-Foto, Zugestellt – alles offline', async () => {
  await phone.waitForSelector('.step-btn[data-step=loaded]');
  await phone.ctx.setOffline(true);
  await phone.tap('.step-btn[data-step=loaded]');
  await phone.waitForSelector('.success'); await phone.waitForSelector('.success', { state: 'detached', timeout: 4000 });
  await phone.tap('.step-btn[data-step=unloaded]');
  await phone.waitForSelector('.success'); await phone.waitForSelector('.success', { state: 'detached', timeout: 4000 });
  await phone.tap('.step-btn[data-step=delivered]');
  await phone.waitForSelector('[data-key=pod] input[data-input=podFile]', { state: 'attached', timeout: 6000 });
  await phone.setInputFiles('input[data-input=podFile]', FIX('lieferschein.jpg'));
  await phone.waitForSelector('[data-key=pod] .doc img', { timeout: 10000 });
  await phone.fill('#pod-receiver', 'Frau Weber');
  await phone.tap('[data-act=finish]');
  await phone.waitForSelector('.success');
  await phone.waitForSelector('.success', { state: 'detached', timeout: 4000 });
  expect(await phone.locator('.offline').count() === 1, 'Offline-Hinweis fehlt');
  expect(await phone.evaluate(() => window.ladeklar?.queue ?? -1) >= 4, 'vier Einträge in der Warteschlange erwartet');
  const s = await shot(phone, 'fahrer-offline-abschluss');
  await phone.ctx.setOffline(false);
  await phone.waitForSelector('.offline', { state: 'detached', timeout: 25000 });
  await toastWith(office, /Zugestellt/, 15000);
  const d = await office.evaluate(async (no) => {
    const list = await (await fetch('/api/call/listDeliveries', { method: 'POST', headers: { 'X-Ladeklar': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ tab: 'all', q: no }) })).json();
    return list[0];
  }, bookingNo2);
  expect(d.status === 'delivered', 'Status im Büro: ' + d.status);
  expect((d.docs || []).some((x) => x.kind === 'pod'), 'Lieferschein fehlt im Büro');
  expect(d.receiver === 'Frau Weber', 'Empfänger fehlt');
  return s;
});
await step('Fahrer', 'Sicherheit: Fahrer kann keine Büro-Funktionen aufrufen', async () => {
  const st = await phone.evaluate(async () => (await fetch('/api/call/listDeliveries', { method: 'POST', headers: { 'X-Ladeklar': '1', 'Content-Type': 'application/json' }, body: '{}' })).status);
  expect(st === 403, 'erwartet 403, erhalten ' + st);
});
await step('Fahrer', 'Handy: keine waagerechte Scroll-Leiste, große Tipp-Flächen (≥ 56 px)', async () => {
  const r = await phone.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth, btn: Math.min(...[...document.querySelectorAll('.step-btn, .tabbar button, .quick a, .quick button')].map((b) => b.getBoundingClientRect().height).filter((h) => h > 0)) }));
  expect(r.sw <= r.w, `Seite breiter als Bildschirm (${r.sw} > ${r.w})`);
  expect(r.btn >= 56, 'zu kleine Tipp-Fläche: ' + r.btn);
});
await step('Fahrer', 'Sprache wechseln (Türkisch) und Verlauf ansehen', async () => {
  await phone.tap('.tabbar [data-to=more]');
  await phone.tap('[data-act=lang][data-lang=tr]');
  await phone.waitForFunction(() => document.documentElement.lang === 'tr');
  await phone.tap('.tabbar [data-to=history]');
  await phone.waitForSelector('[data-key^="h-"]');
  return shot(phone, 'fahrer-verlauf-tr');
});

// ---------------- Tablet ----------------
await step('Unternehmen', 'Tablet (1024 × 768): Live-Board mit Navigation', async () => {
  const tab = await page('Tablet', { width: 1024, height: 768 }, { hasTouch: true });
  await officeLogin(tab, 'petra@test-spedition.de', 'Petra-Neu-Passwort-1');
  await tab.waitForSelector('.kpi');
  const r = await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  expect(r, 'horizontaler Überlauf auf dem Tablet');
  const s = await shot(tab, 'tablet-live');
  await tab.ctx.close();
  return s;
});
await step('Fahrer', 'Tablet im Fahrerhaus (Querformat): Fahrer-App zweispaltig', async () => {
  const tab = await page('Fahrer-Tablet', { width: 1180, height: 820 }, { hasTouch: true, isMobile: true });
  await tab.goto(BASE + '/t/TEST');
  await tab.fill('form[data-form=driver] [name=phone]', '01512345678');
  for (const k of pin) await tab.tap(`[data-act=pinKey][data-k="${k}"]`);
  await tab.waitForSelector('.drv');
  const s = await shot(tab, 'tablet-fahrer');
  await tab.ctx.close();
  return s;
});

// ---------------- Lizenzgeber: Kontrolle ----------------
await step('Lizenzgeber', 'Sieht Nutzung (Fahrer, Fahrzeuge, Lieferungen), aber keine Lieferinhalte', async () => {
  await lic.reload();
  await lic.click('.rail [data-to=tenants]');
  const row = lic.locator('tr', { hasText: 'Test Spedition' });
  await row.waitFor();
  const txt = await row.innerText();
  expect(/1\/15/.test(txt), 'Fahrer-Plätze 1/15 erwartet: ' + txt);
  const all = await lic.locator('main').innerText();
  expect(!/Stuttgart|Hamburg|Tomasz/.test(all), 'Lizenzgeber sieht Lieferinhalte!');
  return shot(lic, 'lizenzgeber-lizenznehmer');
});
await step('Lizenzgeber', 'Sperren → Fahrer kann nichts mehr ändern; Aktivieren → weiter', async () => {
  await lic.click('tr >> text=Test Spedition');
  await lic.click('[data-act=setStatus][data-s=suspended]');
  await toastWith(lic, /Status gespeichert/);
  const st = await phone.evaluate(async () => (await fetch('/api/call/selectVehicle', { method: 'POST', headers: { 'X-Ladeklar': '1', 'Content-Type': 'application/json' }, body: '{"vehicleId":null}' })).json());
  expect(st.error?.code === 'license_inactive', 'Sperre greift nicht');
  await lic.click('[data-act=setStatus][data-s=active]');
  await toastWith(lic, /Status gespeichert/);
  return shot(lic, 'lizenzgeber-lizenz');
});
await step('Lizenzgeber', 'Abrechnung zeigt den aktiven Kunden mit 19 % USt.', async () => {
  await lic.keyboard.press('Escape');
  await lic.click('.rail [data-to=billing]');
  await lic.waitForSelector('main .tbl >> text=Test Spedition GmbH');
  const t = await lic.locator('main').innerText();
  expect(/129\s€/.test(t) && /153,51\s€/.test(t), 'Beträge stimmen nicht');
  return shot(lic, 'lizenzgeber-abrechnung');
});

// ---------------- Online-Demo ----------------
await step('Demo', 'Online-Demo: Split-Ansicht, Fahrer-Tipp erscheint live im Büro', async () => {
  const demo = path.join(HERE, '..', 'dist', 'demo.html');
  expect(fs.existsSync(demo), 'dist/demo.html fehlt – npm run build:demo');
  const d = await page('Demo', { width: 1600, height: 950 });
  await d.goto('file://' + demo);
  await d.click('[data-go=split]');
  await d.waitForSelector('#pane-phone .step-btn');
  await d.locator('#pane-phone .step-btn').first().click();
  await d.locator('#pane-office .toast').first().waitFor({ timeout: 5000 });
  const s = await shot(d, 'demo-split');
  await d.ctx.close();
  return s;
});

await browser.close();
await srv.close();
fs.rmSync(dataDir, { recursive: true, force: true });

// ---------------- report ----------------
const ok = results.filter((r) => r.ok).length;
const by = (role) => results.filter((r) => r.role === role);
const lines = [
  '# Testbericht – Ladeklar 1.0', '',
  `Automatischer End-to-End-Test vom ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} (Chromium ${browser.version?.() || ''}, echter Server, frische Datenbank).`, '',
  `**Ergebnis: ${ok} von ${results.length} Abläufen bestanden${errors.length ? `, ${errors.length} Browser-Fehlermeldung(en)` : ', keine Browser-Fehler'}.**`, '',
  'Geräte: Desktop 1440 × 900 (Lizenzgeber, Unternehmen) · Handy 390 × 844 mit Touch (Fahrer) · Tablet 1024 × 768 (Disposition) · Tablet quer 1180 × 820 (Fahrerhaus).', '',
];
for (const role of ['Lizenzgeber', 'Unternehmen', 'Fahrer', 'Demo']) {
  lines.push(`## ${role}`, '', '| | Ablauf | Dauer | Bild |', '|---|---|---|---|');
  for (const r of by(role)) lines.push(`| ${r.ok ? '✅' : '❌'} | ${r.name}${r.err ? ` – **${r.err}**` : ''} | ${(r.ms / 1000).toFixed(1)} s | ${r.shot ? `[${r.shot}](screens/${r.shot})` : ''} |`);
  lines.push('');
}
if (errors.length) lines.push('## Browser-Fehler', '', ...errors.map((e) => `- ${e}`), '');
lines.push('Unit- und API-Tests: `npm run test:unit` (Engine, Rechte, Mandantentrennung, HTTP, Push-Verschlüsselung).', '');
fs.writeFileSync(path.join(HERE, 'TESTBERICHT.md'), lines.join('\n'));
console.log(`\n${ok}/${results.length} bestanden${errors.length ? ' · Fehler im Browser:\n' + errors.join('\n') : ''}`);
process.exit(ok === results.length && !errors.length ? 0 : 1);
