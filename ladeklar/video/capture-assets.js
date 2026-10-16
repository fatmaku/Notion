// Captures real app screens for the trailer (German UI, demo data, Kaya Logistik):
// phone screens of a full tour Stuttgart → Hamburg, the office live board, proof of delivery,
// two white-label login screens. Also stores the step button positions (assets.json).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../server/index.js';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = path.join(ROOT, 'video/assets');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-video-'));
const srv = createServer({ dataDir: dir, quiet: true, demoData: true });
const port = await srv.listen(0, '127.0.0.1');
const BASE = `http://127.0.0.1:${port}`;
const E = srv.engine;
const admin = E.auth.login({ email: 'ayse@kaya-logistik.de', password: 'Demo-Passwort-2026' });
E.call(admin, 'updateCompany', { settings: { trackArrival: false, palletExchange: false } });
const sven = E.call(admin, 'listUsers', { role: 'driver' }).find((u) => u.name.startsWith('Sven'));
const veh = E.call(admin, 'listVehicles', {});
for (const plate of ['S-KL 2043', 'S-KL 9003']) { const v = veh.find((x) => x.plate === plate); if (v?.busy) E.call(admin, 'releaseVehicle', { id: v.id }); }
for (const d of E.call(admin, 'listDeliveries', { tab: 'all' })) if (d.driverId === sven.id && d.status === 'open') E.call(admin, 'cancelDelivery', { id: d.id, reason: 'Trailer' });
const tour = E.call(admin, 'createDelivery', { customer: 'Bosch', reference: 'PO-4520311', pickup: { place: 'Bosch Werk Feuerbach', street: 'Wernerstraße 1', zip: '70469', city: 'Stuttgart', date: new Date().toISOString().slice(0, 10), from: '06:00', to: '07:30' }, dropoff: { place: 'HHLA Container Terminal', street: 'Bei St. Annen 1', zip: '20457', city: 'Hamburg', date: new Date().toISOString().slice(0, 10), from: '15:00', to: '20:00' }, goods: { text: 'Ersatzteile, Gitterboxen', pallets: 30, weightKg: 17800 }, driverId: sven.id, instructions: 'Gate B anmelden. Ladungssicherung mit Antirutschmatten.' });

const b = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const meta = {};
const phone = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'de-DE', timezoneId: 'Europe/Berlin' })).newPage();
const snap = async (p, name, sel) => {
  await wait(800);
  await p.screenshot({ path: path.join(OUT, name + '.png') });
  if (sel) { const bb = await p.locator(sel).first().boundingBox(); meta[name] = bb ? { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, w: bb.width, h: bb.height } : null; }
  console.log(' ', name);
};
await phone.goto(BASE + '/t/KAYA');
await snap(phone, 'login-kaya');
await phone.fill('form[data-form=driver] [name=phone]', '0176 1000 0004');
for (const k of '123456') await phone.tap(`[data-act=pinKey][data-k="${k}"]`);
await phone.waitForSelector('.drv');
await phone.tap('[data-key=pick-truck] .step-btn');
await phone.tap('[data-act=pickVehicle][data-kind=truck]:has-text("S-KL 2043")');
await phone.waitForSelector('[data-act=pickVehicle][data-kind=truck][aria-pressed=true]');
await phone.tap('[data-act=pickVehicle][data-kind=trailer]:has-text("S-KL 9003")');
await wait(300); await phone.tap('.sheet [data-act=close] >> nth=0');
await phone.waitForSelector('.job [data-step=accepted]');
await phone.evaluate(() => document.querySelector('.drv-main').scrollTo(0, 0));
await snap(phone, 'phone-1-confirm', '.job [data-step=accepted]');
const tapStep = async (sel, after) => { await phone.tap(sel); await phone.waitForSelector('.success'); await wait(350); await phone.screenshot({ path: path.join(OUT, after + '.png') }); console.log(' ', after); await phone.waitForSelector('.success', { state: 'detached' }); };
await tapStep('.job [data-step=accepted]', 'phone-1b-ok');
await phone.evaluate(() => { window.ladeklar.ui.undo = null; window.ladeklar.render(); document.querySelector('.drv-main').scrollTo(0, 0); });
await snap(phone, 'phone-2-loaded', '.step-btn[data-step=loaded]');
await tapStep('.step-btn[data-step=loaded]', 'phone-2b-ok');
await phone.evaluate(() => { window.ladeklar.ui.undo = null; window.ladeklar.render(); document.querySelector('.drv-main').scrollTo(0, 0); });
await snap(phone, 'phone-3-unloaded', '.step-btn[data-step=unloaded]');
await tapStep('.step-btn[data-step=unloaded]', 'phone-3b-ok');
await phone.evaluate(() => { window.ladeklar.ui.undo = null; window.ladeklar.render(); document.querySelector('.drv-main').scrollTo(0, 0); });
await snap(phone, 'phone-4-podbutton', '.step-btn[data-step=delivered]');
await phone.tap('.step-btn[data-step=delivered]');
await phone.setInputFiles('input[data-input=podFile]', path.join(ROOT, 'e2e/fixtures/lieferschein.jpg'));
await phone.waitForSelector('[data-key=pod] .doc img');
await phone.fill('#pod-receiver', 'Herr Jensen');
await phone.evaluate(() => document.activeElement.blur());
await snap(phone, 'phone-5-pod', '[data-act=finish]');
await tapStep('[data-act=finish]', 'phone-6-delivered');

const office = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'de-DE', timezoneId: 'Europe/Berlin' })).newPage();
await office.goto(BASE + '/');
await office.click('[data-act="loginMode"][data-m="office"]');
await office.fill('form[data-form=office] [name=email]', 'ayse@kaya-logistik.de');
await office.fill('form[data-form=office] [name=password]', 'Demo-Passwort-2026');
await office.click('form[data-form=office] button[type=submit]');
await office.waitForSelector('.kpi');
await snap(office, 'office-live');
await office.click('.rail [data-to=deliveries]'); await office.click('[data-act=dtab][data-tab=done]');
await office.click(`tr[data-act=openDelivery] >> text=${tour.bookingNo}`);
await office.waitForSelector('[data-key=delivery] .doc img');
await snap(office, 'office-delivery');
await office.click('[data-act=proof]'); await office.waitForSelector('.proof-doc img');
await wait(600);
const proof = office.locator('.proof-doc');
await proof.screenshot({ path: path.join(OUT, 'office-proof.png') });
console.log('  office-proof');

const p2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'de-DE' })).newPage();
await p2.goto(BASE + '/t/NORD'); await snap(p2, 'login-nord');
meta.bookingNo = tour.bookingNo;
fs.writeFileSync(path.join(OUT, 'assets.json'), JSON.stringify(meta, null, 1));
await b.close(); await srv.close(); fs.rmSync(dir, { recursive: true, force: true });
console.log('ok', meta.bookingNo);
