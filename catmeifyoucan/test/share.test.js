// Öffentliche Katzenseiten /c/<id> (Link-Vorschau), robots.txt, sitemap.xml – und die Bausteine dazu.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { translator, absoluteBase, jpegSize, renderCatPage, sitemapXml, robotsTxt } from '../server/share.js';
import { createEngine } from '../public/core/engine.js';
import { MemoryStore } from '../public/core/store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const catJpg = fs.readFileSync(path.join(here, 'fixtures', 'cat.jpg'));
const jpeg = `data:image/jpeg;base64,${catJpg.toString('base64')}`;
const DAY = 86400000;

let app;
let base;
let tmp;
let ids;
let token;

/** Katze direkt in den Speicher legen (ohne Fang) – so lassen sich auch böse Namen testen. */
function putCat(store, patch) {
  const t = Date.now();
  const cat = {
    id: patch.id,
    regionId: 'kadikoy',
    district: 'caferaga',
    name: null,
    namedBy: null,
    title: null,
    legendary: false,
    discoveredBy: 'p_share_finder',
    discoveredAt: t - 3 * DAY,
    createdAt: t - 3 * DAY,
    firstSeenAt: t - 3 * DAY,
    lastSeenAt: t - 2 * DAY,
    lastLat: 40.98417231,
    lastLon: 29.02612345,
    profile: { pattern: 'smokin', ear_tip: 'tipped', age_group: 'adult' },
    latest: { age_group: 'adult' },
    photoId: null,
    photoUrl: null,
    status: 'active',
    rarity: 'rare',
    observationCount: 7,
    catcherIds: ['p_share_finder', 'p_share_other'],
    ...patch,
  };
  store.cats.insert(cat);
  return cat;
}

const get = (p, headers = {}) => fetch(base + p, { headers, redirect: 'manual' });
const text = async (p, headers) => {
  const res = await get(p, headers);
  return { res, html: await res.text() };
};
const meta = (html, prop) => {
  const m = new RegExp(`<meta (?:property|name)="${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" content="([^"]*)"`).exec(html);
  return m ? m[1] : null;
};

/** Anfrage mit eigener Host-Kopfzeile (fetch erlaubt das nicht). */
function rawGet(p, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(base);
    const req = http.request({ host: u.hostname, port: u.port, path: p, method: 'GET', headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test.before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-share-'));
  app = await createApp({ dataDir: tmp, aiMode: 'mock', demo: true, publicUrl: 'https://catme.example/', log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
  const { store } = app.engine.ctx;
  store.players.insert({ id: 'p_share_finder', nickname: 'ModaAyşe', lang: 'tr', role: 'player', tokenHash: 'x'.repeat(40), xp: 0, badges: [], banned: false, createdAt: Date.now() });
  store.players.insert({ id: 'p_share_other', nickname: 'Bad<b>Nick', lang: 'tr', role: 'player', tokenHash: 'y'.repeat(40), xp: 0, badges: [], banned: true, createdAt: Date.now() });
  ids = {
    named: putCat(store, { id: 'c_share_duman', name: 'Duman', namedBy: 'p_share_finder' }).id,
    evil: putCat(store, { id: 'c_share_evil', name: '<script>alert(1)</script>"\'&', title: '<img src=x onerror=alert(2)>', namedBy: 'p_share_finder' }).id,
    unnamed: putCat(store, { id: 'c_share_noname' }).id,
    help: putCat(store, { id: 'c_share_help', name: 'Pamuk', status: 'needs_help' }).id,
    deceased: putCat(store, { id: 'c_share_rip', name: 'Gece', status: 'deceased' }).id,
    missing: putCat(store, { id: 'c_share_gone', name: 'Bulut', lastSeenAt: Date.now() - 45 * DAY }).id,
    removed: putCat(store, { id: 'c_share_removed', name: 'Gizli', removed: true }).id,
    merged: putCat(store, { id: 'c_share_old', name: 'Eski', mergedInto: 'c_share_duman' }).id,
    bannedFinder: putCat(store, { id: 'c_share_banned', name: 'Zeytin', discoveredBy: 'p_share_other' }).id,
  };
  // echte Katze mit Foto über die API (Ausschnitt → og:image)
  const reg = await (await fetch(`${base}/api/players`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: 'Fotografin', lang: 'en' }) })).json();
  token = reg.token;
  const c = await fetch(`${base}/api/catch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ photo: jpeg, crop: jpeg, lat: 40.9842, lon: 29.0262, accuracy: 10, capturedAt: Date.now(), source: 'camera', fingerprint: { colors: { orange: 0.6, brown: 0.3, white: 0.1 }, hash: '0fedcba987654321' } }),
  });
  assert.equal(c.status, 201);
  ids.photo = (await c.json()).cat.id;
});

test.after(async () => {
  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Katzenseite: OG- und Twitter-Tags, absolut mit publicUrl, Cache und Sicherheits-Header', async () => {
  const { res, html } = await text(`/c/${ids.named}?lang=en`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(res.headers.get('cache-control'), /max-age=300/);
  assert.ok(res.headers.get('etag'));
  assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(html, /<html lang="en" dir="ltr">/);
  assert.equal(meta(html, 'og:title'), 'Meet Duman · Cat Me If You Can');
  assert.match(html, /<title>Meet Duman · Cat Me If You Can<\/title>/);
  const desc = meta(html, 'og:description');
  assert.match(desc, /Tuxedo/);
  assert.match(desc, /Caferağa \(Moda\), Kadıköy/);
  assert.match(desc, /Seen 7 times/);
  assert.match(desc, /Found first by ModaAyşe/);
  assert.equal(meta(html, 'description'), desc);
  assert.equal(meta(html, 'og:url'), `https://catme.example/c/${ids.named}?lang=en`);
  assert.match(meta(html, 'og:image'), /^https:\/\/catme\.example\/media\/og(-en)?\.png$/);
  assert.equal(meta(html, 'twitter:card'), 'summary_large_image');
  assert.equal(meta(html, 'twitter:image'), meta(html, 'og:image'));
  assert.ok(html.includes(`<link rel="canonical" href="https://catme.example/c/${ids.named}?lang=en">`));
  assert.ok(html.includes(`hreflang="x-default" href="https://catme.example/c/${ids.named}"`));
  // Spielen → App mit der Katze, Startseite, Macher-Zeile, kein Inline-Skript
  assert.ok(html.includes(`href="/app.html#/cat/${ids.named}"`));
  assert.match(html, /Play now – find <bdi>Duman<\/bdi>/);
  assert.ok(html.includes('A HappyTuncay product · Made at Happy Overthinking Coffee, Kadıköy'));
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, 'nur externe Skripte (CSP)');
  assert.doesNotMatch(html, /\son[a-z]+=/i, 'keine Inline-Event-Handler');
  // keine Koordinaten, nicht einmal gerundet
  assert.doesNotMatch(html, /40\.98|29\.02/);
  // 304 bei gleichem ETag
  const again = await get(`/c/${ids.named}?lang=en`, { 'If-None-Match': res.headers.get('etag') });
  assert.equal(again.status, 304);
});

test('Foto-Katze: og:image ist der öffentliche Ausschnitt mit Größe', async () => {
  const { html } = await text(`/c/${ids.photo}?lang=en`);
  const img = meta(html, 'og:image');
  assert.match(img, /^https:\/\/catme\.example\/photos\/[0-9a-f]{20}_c\.jpg$/);
  const size = jpegSize(catJpg);
  assert.ok(size && size.width > 0);
  assert.equal(meta(html, 'og:image:width'), String(size.width));
  assert.equal(meta(html, 'og:image:height'), String(size.height));
  assert.equal(meta(html, 'og:image:type'), 'image/jpeg');
  assert.match(html, /<img class="cp-img" src="\/photos\/[0-9a-f]{20}_c\.jpg"/);
  assert.doesNotMatch(html, /_f\.jpg/, 'nie das ganze Foto');
  const crop = await get(img.replace('https://catme.example', ''));
  assert.equal(crop.status, 200);
  // Unbenannt → noindex, „noch ohne Namen“
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /No name yet/);
  assert.match(html, /Find it and name it!/);
});

test('Namen werden escaped (auch im Titel, in Meta-Tags und data-Attributen)', async () => {
  const { res, html } = await text(`/c/${ids.evil}?lang=en`);
  assert.equal(res.status, 200);
  assert.ok(!html.includes('<script>alert(1)'), 'kein rohes <script> aus dem Namen');
  assert.ok(!html.includes('<img src=x'), 'kein rohes <img> aus dem Titel');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#39;&amp;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(2)&gt;'));
  assert.ok(meta(html, 'og:title').startsWith('Meet &lt;script&gt;'));
  // Gesperrte Konten erscheinen nie
  const banned = await text(`/c/${ids.bannedFinder}?lang=en`);
  assert.ok(!banned.html.includes('Bad&lt;b&gt;Nick') && !banned.html.includes('Bad<b>Nick'));
  assert.doesNotMatch(meta(banned.html, 'og:description'), /Found first/);
});

test('Sprache: ?lang vor Accept-Language vor Englisch; RTL und Persisch', async () => {
  const tr = await text(`/c/${ids.named}`, { 'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.5' });
  assert.match(tr.html, /<html lang="tr" dir="ltr">/);
  assert.equal(meta(tr.html, 'og:title'), 'Duman ile tanış · Cat Me If You Can');
  assert.equal(tr.res.headers.get('content-language'), 'tr');
  assert.match(tr.res.headers.get('vary'), /Accept-Language/);
  // ohne ?lang ist die Kanonische ohne Sprache
  assert.equal(meta(tr.html, 'og:url'), `https://catme.example/c/${ids.named}`);
  const ar = await text(`/c/${ids.named}?lang=ar`, { 'Accept-Language': 'de' });
  assert.match(ar.html, /<html lang="ar" dir="rtl">/);
  assert.equal(meta(ar.html, 'og:title'), 'تعرّف على Duman · Cat Me If You Can');
  assert.match(ar.html, /<h1 id="cp-name"><bdi>Duman<\/bdi><\/h1>/);
  const fa = await text(`/c/${ids.named}?lang=fa`);
  assert.match(meta(fa.html, 'og:description'), /۷/, 'Persische Ziffern');
  const en = await text(`/c/${ids.named}`, { 'Accept-Language': 'ja-JP' });
  assert.match(en.html, /<html lang="en"/);
  const xx = await text(`/c/${ids.named}?lang=xx`, { 'Accept-Language': 'de-DE' });
  assert.match(xx.html, /<html lang="de"/);
  // Sprachwahl-Links behalten die Katze
  assert.ok(en.html.includes(`href="/c/${ids.named}?lang=ru" hreflang="ru"`));
});

test('Status: braucht Hilfe, vermisst, verstorben', async () => {
  const help = await text(`/c/${ids.help}?lang=en`);
  assert.match(help.html, /This cat may need help\. Volunteers know about it\./);
  const gone = await text(`/c/${ids.missing}?lang=en`);
  assert.equal(meta(gone.html, 'og:title'), 'Have you seen Bulut? · Cat Me If You Can');
  assert.match(gone.html, /Not seen lately – have you seen <bdi>Bulut<\/bdi>\?/);
  const rip = await text(`/c/${ids.deceased}?lang=en`);
  assert.equal(meta(rip.html, 'og:title'), 'In memory of Gece · Cat Me If You Can');
  assert.match(rip.html, /In memory/);
  assert.ok(!rip.html.includes('data-play'), 'kein „finde sie“ bei verstorbenen Katzen');
  assert.ok(!rip.html.includes('/app.html#/cat/'));
});

test('404 für unbekannte, entfernte und ungültige IDs; Zusammenführung leitet um', async () => {
  for (const p of ['/c/c_nope_nope', `/c/${ids.removed}`, '/c/%3Cscript%3Ealert(1)%3C%2Fscript%3E', '/c/', '/c/%E0%A4%A']) {
    const { res, html } = await text(`${p}?lang=en`);
    assert.equal(res.status, 404, p);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(html, /We can’t find this cat/);
    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.ok(!html.includes('<script>alert'), p);
  }
  const moved = await get(`/c/${ids.merged}?lang=de`);
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get('location'), `/c/${ids.named}?lang=de`);
});

test('sitemap.xml: Startseite, App und nur benannte, echte Katzen; robots.txt', async () => {
  const res = await get('/sitemap.xml');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/xml/);
  const xml = await res.text();
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.ok(xml.includes('<loc>https://catme.example/</loc>'));
  assert.ok(xml.includes('<loc>https://catme.example/app.html</loc>'));
  assert.ok(xml.includes(`<loc>https://catme.example/c/${ids.named}</loc>`));
  assert.match(xml, new RegExp(`<loc>https://catme\\.example/c/${ids.named}</loc><lastmod>\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+00:00</lastmod>`));
  assert.ok(!xml.includes(ids.unnamed), 'unbenannte Katzen nicht');
  assert.ok(!xml.includes(ids.photo), 'unbenannte Foto-Katze nicht');
  assert.ok(!xml.includes(ids.removed), 'entfernte nicht');
  assert.ok(!xml.includes(ids.merged), 'zusammengeführte nicht');
  const demoNamed = app.engine.ctx.store.cats.all().find((c) => c.demo && c.name);
  assert.ok(demoNamed && !xml.includes(demoNamed.id), 'Demo-Katzen nicht');
  assert.ok(!xml.includes('<script>'), 'XML ohne fremdes Markup');

  const robots = await get('/robots.txt');
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get('content-type'), /text\/plain/);
  const body = await robots.text();
  assert.match(body, /User-agent: \*/);
  assert.match(body, /Allow: \//);
  assert.doesNotMatch(body, /Disallow/, 'alles erlaubt');
  assert.match(body, /Sitemap: https:\/\/catme\.example\/sitemap\.xml/);
});

test('Ohne publicUrl: absolute Adressen nur aus harmlosem Host; X-Forwarded-Proto nur hinter Proxy', async () => {
  const fake = (headers, socket = {}) => ({ headers, socket });
  assert.equal(absoluteBase(fake({ host: 'catme.example:8443' })), 'http://catme.example:8443');
  assert.equal(absoluteBase(fake({ host: 'catme.example' }, { encrypted: true })), 'https://catme.example');
  assert.equal(absoluteBase(fake({ host: 'evil.example"><script>' })), '');
  assert.equal(absoluteBase(fake({ host: 'a b' })), '');
  assert.equal(absoluteBase(fake({ host: 'catme.example', 'x-forwarded-proto': 'https' })), 'http://catme.example');
  assert.equal(absoluteBase(fake({ host: 'catme.example', 'x-forwarded-proto': 'https' }), { trustProxy: 1 }), 'https://catme.example');
  assert.equal(absoluteBase(fake({ host: 'catme.example', 'x-forwarded-proto': 'javascript' }), { trustProxy: 1 }), 'http://catme.example');
  assert.equal(absoluteBase(fake({ host: 'x' }), { publicUrl: 'https://catme.example/' }), 'https://catme.example');
  assert.equal(absoluteBase(fake({ host: 'x' }), { publicUrl: 'javascript:alert(1)' }), 'http://x');

  // echter Server ohne publicUrl
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-share2-'));
  const app2 = await createApp({ dataDir: tmp2, aiMode: 'mock', demo: false, publicUrl: '', log: () => {} });
  putCat(app2.engine.ctx.store, { id: 'c_share_local', name: 'Lokum' });
  app2.engine.ctx.store.players.insert({ id: 'p_share_finder', nickname: 'ModaAyşe', lang: 'tr', role: 'player', tokenHash: 'z'.repeat(40), xp: 0, badges: [], banned: false, createdAt: Date.now() });
  await new Promise((r) => app2.server.listen(0, '127.0.0.1', r));
  const port = app2.server.address().port;
  const prevBase = base;
  base = `http://127.0.0.1:${port}`;
  try {
    const ok = await rawGet('/c/c_share_local?lang=en', { Host: 'cats.example.org' });
    assert.equal(ok.status, 200);
    assert.match(ok.body, /<meta property="og:image" content="http:\/\/cats\.example\.org\/media\/og(-en)?\.png">/);
    const bad = await rawGet('/c/c_share_local?lang=en', { Host: 'evil.example/"x' });
    assert.ok([200, 400].includes(bad.status));
    if (bad.status === 200) assert.match(bad.body, /<meta property="og:image" content="\/media\/og(-en)?\.png">/, 'relativ bei seltsamem Host');
    const robots = await rawGet('/robots.txt', { Host: 'cats.example.org' });
    assert.match(robots.body, /Sitemap: http:\/\/cats\.example\.org\/sitemap\.xml/);
  } finally {
    base = prevBase;
    await app2.close();
    fs.rmSync(tmp2, { recursive: true, force: true });
  }
});

test('Bausteine: Plural (ru/ar), Zahlen (fa), JPEG-Größe, Sitemap/robots ohne Basis', () => {
  const ru = translator('ru');
  assert.equal(ru.t('cp.seenTimes', { n: 1 }), 'Видели 1 раз');
  assert.equal(ru.t('cp.seenTimes', { n: 3 }), 'Видели 3 раза');
  assert.equal(ru.t('cp.seenTimes', { n: 5 }), 'Видели 5 раз');
  const ar = translator('ar');
  assert.equal(ar.t('cp.times', { n: 2 }), 'مرتين');
  assert.equal(ar.t('cp.times', { n: 4 }), '4 مرات');
  const fa = translator('fa');
  assert.match(fa.t('cp.seenTimes', { n: 12 }), /۱۲/);
  const en = translator('en');
  assert.equal(en.t('cp.seenTimes', { n: 1 }), 'Seen 1 time');
  assert.equal(en.th('cp.meet', { name: '<b>' }), 'Meet <bdi>&lt;b&gt;</bdi>');
  assert.equal(translator('xx').lang, 'en');
  assert.equal(jpegSize(Buffer.from('nope')), null);
  assert.equal(jpegSize(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), null);
  assert.ok(!robotsTxt('').includes('Sitemap'));
  assert.match(sitemapXml('https://x.example', [{ id: 'c_a&b', updatedAt: 0 }]), /c_a%26b/);
});

test('Engine: publicCatPage enthält keine Koordinaten; funktioniert auch im Browser-Demo (ohne Server)', () => {
  const engine = createEngine({ store: new MemoryStore(), analyzer: { analyze: async () => ({}) }, photos: { save: async () => ({}), remove: async () => {} } });
  putCat(engine.ctx.store, { id: 'c_share_engine', name: 'Simit' });
  const d = engine.publicCatPage('c_share_engine');
  const json = JSON.stringify(d);
  assert.doesNotMatch(json, /lat|lon|40\.98|29\.02/i);
  assert.equal(d.name, 'Simit');
  assert.equal(d.districtAka, 'Moda');
  assert.equal(d.discoveredBy, null, 'Spieler:in unbekannt → kein Spitzname');
  assert.throws(() => engine.publicCatPage('../etc'), (e) => e.status === 404);
  assert.throws(() => engine.publicCatPage('c_missing_cat'), (e) => e.status === 404);
  assert.deepEqual(engine.sitemapCats().map((c) => c.id), ['c_share_engine']);
  // Rendern ohne Server-Kontext (z. B. Vorschau-Tests)
  const html = renderCatPage(d, { lang: 'de', base: 'https://x.example' });
  assert.match(html, /Lerne <bdi>Simit<\/bdi> kennen|Lerne Simit kennen/);
  assert.match(html, /Jetzt spielen – finde <bdi>Simit<\/bdi>/);
});
