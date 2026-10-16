// Screenshots for the user manual (German UI, demo data): node tools/manual-shots.js [--langs]
// Starts its own server with the demo world. --langs adds the driver start screen in all languages.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../server/index.js';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = path.join(ROOT, 'docs/handbuch/img');
fs.mkdirSync(OUT, { recursive: true });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-manual-'));
const srv = createServer({ dataDir: dir, quiet: true, demoData: true });
const port = await srv.listen(0, '127.0.0.1');
const BASE = `http://127.0.0.1:${port}`;
const b = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (p, name) => { await wait(700); await p.screenshot({ path: path.join(OUT, name + '.png') }); console.log(' ', name); };
const errs = [];
async function ctx(vp, mobile) {
  const c = await b.newContext({ viewport: vp, deviceScaleFactor: mobile ? 2 : 1, isMobile: !!mobile, hasTouch: !!mobile, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  const p = await c.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  return p;
}
async function office(p, email, pw = 'Demo-Passwort-2026') {
  await p.goto(BASE + '/');
  await p.click('[data-act="loginMode"][data-m="office"]');
  await p.fill('form[data-form=office] [name=email]', email);
  await p.fill('form[data-form=office] [name=password]', pw);
  await p.click('form[data-form=office] button[type=submit]');
  await p.waitForSelector('.shell');
}
const ui = (p, js, arg) => p.evaluate(js, arg);
const stepTap = async (p, sel) => { await p.tap(sel); await p.waitForSelector('.success'); await p.waitForSelector('.success', { state: 'detached' }); };

const ONLY = process.argv.includes('--only-langs');
if (!ONLY) {
// ---------- driver (Sven, German) ----------
const d = await ctx({ width: 390, height: 844 }, true);
await d.goto(BASE + '/t/KAYA');
await d.fill('form[data-form=driver] [name=phone]', '0176 1000 0004');
await shot(d, 'fahrer-01-anmeldung');
for (const k of '123456') await d.tap(`[data-act=pinKey][data-k="${k}"]`);
await d.waitForSelector('.drv');
await shot(d, 'fahrer-02-start');
await d.tap('[data-key=pick-truck] .step-btn');
await d.waitForSelector('[data-act=pickVehicle]');
await shot(d, 'fahrer-03-lkw-waehlen');
await d.tap('[data-act=pickVehicle][data-kind=truck]:not([disabled]) >> nth=0');
await d.waitForSelector('[data-act=pickVehicle][data-kind=truck][aria-pressed=true]');
await d.tap('[data-act=pickVehicle][data-kind=trailer]:not([data-id=""]):not([disabled]) >> nth=0');
await wait(400);
await d.tap('.sheet [data-act=close] >> nth=0');
await d.waitForSelector('[data-act=step][data-step=accepted]');
await shot(d, 'fahrer-04-auftrag-bestaetigen');
await d.tap('[data-act=step][data-step=accepted]');
await d.waitForSelector('.success'); await wait(250);
await d.screenshot({ path: path.join(OUT, 'fahrer-05-erfolg.png') });
await d.waitForSelector('.success', { state: 'detached' });
await shot(d, 'fahrer-06-tour-mit-rueckgaengig');
await stepTap(d, '.step-btn[data-step=arrived_pickup]');
await stepTap(d, '.step-btn[data-step=loaded]');
await ui(d, () => document.querySelector('.drv-main').scrollTo(0, 0));
await shot(d, 'fahrer-07-unterwegs');
await d.tap('.quick [data-type=note]'); await d.waitForSelector('#note-text');
await d.tap('.chip >> nth=0');
await shot(d, 'fahrer-08-notiz');
await d.tap('button[form=noteForm]'); await wait(600);
await d.tap('.sheet [data-act=close] >> nth=0');
await d.tap('.quick .warn'); await d.tap('[data-act=pickProblem][data-code=waiting]');
await shot(d, 'fahrer-09-problem');
await d.tap('.sheet [data-act=close] >> nth=0');
await stepTap(d, '.step-btn[data-step=arrived_dropoff]');
await d.tap('.step-btn[data-step=unloaded]'); await d.waitForSelector('[data-key=pallets]');
await shot(d, 'fahrer-10-palettentausch');
await stepTap(d, '[data-act=commitStep]');
await d.tap('.step-btn[data-step=delivered]');
await d.setInputFiles('input[data-input=podFile]', path.join(ROOT, 'e2e/fixtures/lieferschein.jpg'));
await d.waitForSelector('[data-key=pod] .doc img');
await d.fill('#pod-receiver', 'Herr Schulz');
await d.tap('[data-act=wantSig]');
await d.waitForSelector('canvas.sig');
const box = await d.locator('canvas.sig').boundingBox();
await d.mouse.move(box.x + 30, box.y + 120); await d.mouse.down();
for (let i = 0; i < 40; i++) await d.mouse.move(box.x + 30 + i * 7, box.y + 110 - Math.sin(i / 3) * 34);
await d.mouse.up();
await shot(d, 'fahrer-11-lieferschein-unterschrift');
await d.tap('[data-act=finish]'); await d.waitForSelector('.success'); await wait(250);
await d.screenshot({ path: path.join(OUT, 'fahrer-12-zugestellt.png') });
await d.waitForSelector('.success', { state: 'detached' });
await d.tap('.tabbar [data-to=jobs]'); await shot(d, 'fahrer-13-auftraege');
await d.tap('.tabbar [data-to=history]'); await d.waitForSelector('[data-key^="h-"]'); await shot(d, 'fahrer-14-verlauf');
await d.tap('.tabbar [data-to=more]'); await shot(d, 'fahrer-15-mehr');
await d.tap('.tabbar [data-to=home]');
await ui(d, () => { window.ladeklar.ui.locked = true; window.ladeklar.render(); });
await shot(d, 'fahrer-16-fahrsperre');
await ui(d, () => { window.ladeklar.ui.locked = false; window.ladeklar.render(); });

// ---------- office (Ayşe, admin) ----------
const o = await ctx({ width: 1440, height: 900 });
await o.goto(BASE + '/'); await o.click('[data-act="loginMode"][data-m="office"]'); await shot(o, 'buero-01-anmeldung');
await office(o, 'ayse@kaya-logistik.de');
await shot(o, 'buero-02-live');
await o.click('[data-act=openSheet][data-type=notifications]'); await o.waitForSelector('[data-key=notifications] .li'); await shot(o, 'buero-03-mitteilungen'); await o.keyboard.press('Escape');
await o.click('.rail [data-to=deliveries]'); await o.waitForSelector('.tour'); await shot(o, 'buero-04-lieferungen');
await o.click('.tour.prob'); await o.waitForSelector('[data-key=delivery] .timeline'); await shot(o, 'buero-05-lieferung-details'); await o.keyboard.press('Escape');
await o.click('[data-act=dtab][data-tab=done]'); await o.waitForSelector('tr[data-act=openDelivery]'); await shot(o, 'buero-06-erledigt');
await o.click('tr[data-act=openDelivery] >> nth=0'); await o.waitForSelector('[data-key=delivery] .doc img'); await shot(o, 'buero-07-lieferschein-im-buero');
await o.click('[data-act=proof]'); await o.waitForSelector('.proof-doc'); await shot(o, 'buero-08-abliefernachweis'); await o.keyboard.press('Escape');
await o.click('[data-act=newDelivery] >> nth=0'); await o.fill('#dForm [name="pickup.city"]', 'Stu'); await o.waitForSelector('.suggest .menu'); await shot(o, 'buero-09-neue-lieferung-vorschlaege');
await o.click('.suggest .menu button >> nth=0'); await o.fill('#dForm [name="dropoff.city"]', 'Hamburg'); await o.fill('#dForm [name="goods.text"]', 'Ersatzteile'); await o.fill('#dForm [name="goods.pallets"]', '20');
await o.click('button[form=dForm]'); await o.waitForSelector('[data-key=delivery]'); await shot(o, 'buero-10-lieferung-angelegt'); await o.keyboard.press('Escape');
await o.click('.rail [data-to=drivers]'); await o.waitForSelector('[data-key^="u-"]'); await shot(o, 'buero-11-fahrer');
await o.click('[data-act=resetPin] >> nth=0'); await o.waitForSelector('.qr'); await shot(o, 'buero-12-fahrer-einladung'); await o.keyboard.press('Escape');
await o.click('[data-act=newDriver] >> nth=0'); await shot(o, 'buero-13-fahrer-anlegen'); await o.keyboard.press('Escape');
await o.click('.rail [data-to=vehicles]'); await o.waitForSelector('[data-key^="v-"]'); await shot(o, 'buero-14-fahrzeuge');
await o.click('[data-act=newVehicle] >> nth=0'); await shot(o, 'buero-15-fahrzeug-anlegen'); await o.keyboard.press('Escape');
await o.click('.rail [data-to=reports]'); await o.waitForSelector('.tbl'); await shot(o, 'buero-16-berichte');
await o.click('.rail [data-to=settings]'); await shot(o, 'buero-17-einstellungen-marke');
for (const [k, n] of [['flow', 'buero-18-ablaeufe'], ['team', 'buero-19-team'], ['license', 'buero-20-lizenz'], ['data', 'buero-21-daten'], ['api', 'buero-22-api']]) { await o.click(`[data-act=ssec][data-k=${k}]`); await shot(o, n); }
const tb = await ctx({ width: 1024, height: 768 });
await office(tb, 'jonas@kaya-logistik.de'); await shot(tb, 'tablet-01-disposition');
const tbd = await ctx({ width: 1180, height: 820 }, true);
await tbd.goto(BASE + '/t/KAYA'); await tbd.fill('form[data-form=driver] [name=phone]', '0176 1000 0001');
for (const k of '123456') await tbd.tap(`[data-act=pinKey][data-k="${k}"]`);
await tbd.waitForSelector('.drv'); await shot(tbd, 'tablet-02-fahrerhaus');

// ---------- licensor ----------
const l = await ctx({ width: 1440, height: 900 });
await office(l, 'inhaber@ladeklar.de', 'Ladeklar-Demo-2026');
await shot(l, 'lizenzgeber-01-uebersicht');
await l.click('.rail [data-to=tenants]'); await l.waitForSelector('.tbl'); await shot(l, 'lizenzgeber-02-lizenznehmer');
await l.click('tr >> text=Kaya Logistik'); await l.waitForSelector('[data-key=tenant] form'); await shot(l, 'lizenzgeber-03-lizenz-bearbeiten'); await l.keyboard.press('Escape');
await l.click('[data-act=newTenant] >> nth=0'); await l.fill('form[data-form=tenant] [name=name]', 'Muster Spedition GmbH'); await l.fill('form[data-form=tenant] [name=adminEmail]', 'chef@muster-spedition.de'); await shot(l, 'lizenzgeber-04-anlegen');
await l.click('button[form=ntForm]'); await l.waitForSelector('[data-key=created]'); await shot(l, 'lizenzgeber-05-zugang'); await l.keyboard.press('Escape');
await l.click('.rail [data-to=billing]'); await l.waitForSelector('.tbl'); await shot(l, 'lizenzgeber-06-abrechnung');
await l.click('.rail [data-to=plans]'); await shot(l, 'lizenzgeber-07-tarife');

} // !ONLY
// ---------- driver start screen in every language ----------
if (process.argv.includes('--langs') || ONLY) {
  const p = await ctx({ width: 390, height: 844 }, true);
  await p.goto(BASE + '/t/KAYA'); await p.fill('form[data-form=driver] [name=phone]', '0176 1000 0001');
  for (const k of '123456') await p.tap(`[data-act=pinKey][data-k="${k}"]`);
  await p.waitForSelector('.drv');
  for (const lang of ['de', 'en', 'pl', 'ro', 'cs', 'tr', 'ru', 'uk']) {
    await ui(p, (l) => window.ladeklar.setLang(l), lang);
    await ui(p, () => document.querySelector('.drv-main').scrollTo(0, 0));
    await shot(p, `sprache-${lang}`);
  }
  await ui(p, () => window.ladeklar.setLang('tr'));
}
await b.close(); await srv.close(); fs.rmSync(dir, { recursive: true, force: true });
console.log(errs.length ? 'Fehler: ' + errs.join(' | ') : 'ok, keine Browser-Fehler');
