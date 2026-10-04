// 2.1 bundled sticker sets: memes/index.json + memes/fluent/*.webp (built by scripts/build-memes.js),
// hard content exclusions, licence notice and static serving of /memes/…. Run: node --test "test/*.test.js"
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

require('../js/schema.js');
const S = globalThis.LiveFXSchema;
const build = require('../scripts/build-memes.js');
const { resolveTarget } = require('../server/static.js');
const { startServer, api } = require('./helpers/server');

const ROOT = path.join(__dirname, '..');
const MEMES = path.join(ROOT, 'memes');
const index = JSON.parse(fs.readFileSync(path.join(MEMES, 'index.json'), 'utf8'));
const MAX_FILE = 60 * 1024;
const MAX_TOTAL = 6 * 1024 * 1024;

// Independent copy of the hard exclusions from the release brief (emoji as written there), so a change to
// the build script's own list cannot silently weaken the check.
const BANNED = [
  ...'✝☦☪🕉✡🔯☸☯🛐🕎📿⛪🕌🕍🛕🕋⛩', // religious symbols / places
  ...'🔫💣🔪🗡☠🩸💀⚔🪓', // weapons / violence
  ...'🚬🍺🍻🍷🥃🍸🍹🍾🥂🍶💉💊', // drugs / alcohol / tobacco
  ...'🖕🍆🍑💦', // obscene / innuendo
  ...'🏳🏴🚩🎌🏁', // flags (country flags: regional indicators below)
].map((c) => c.codePointAt(0));
const isFlagCp = (cp) => (cp >= 0x1f1e6 && cp <= 0x1f1ff) || (cp >= 0xe0020 && cp <= 0xe007f);

function webpInfo(file) {
  const b = fs.readFileSync(file);
  const riff = b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  return { riff, animated: riff && b.includes(Buffer.from('ANIM')), bytes: b.length };
}

test('memes: index.json structure (version, MIT set, items)', () => {
  assert.equal(index.version, 1);
  assert.ok(Array.isArray(index.sets) && index.sets.length >= 1);
  const fluent = index.sets.find((s) => s.id === 'fluent');
  assert.ok(fluent, 'fluent set');
  assert.equal(fluent.license, 'MIT');
  assert.ok(fluent.source.some((u) => /github\.com\/microsoft\/fluentui-emoji/.test(u)));
  assert.equal(typeof fluent.animated, 'boolean');
  assert.ok(Array.isArray(index.items));
  assert.ok(index.items.length >= 120 && index.items.length <= 150, `${index.items.length} items`);
  const sets = new Set(index.sets.map((s) => s.id));
  for (const it of index.items) {
    for (const k of ['id', 'set', 'file', 'category', 'emoji']) assert.equal(typeof it[k], 'string', `${it.id}.${k}`);
    assert.equal(typeof it.animated, 'boolean', `${it.id}.animated`);
    assert.ok(sets.has(it.set), `${it.id}: set ${it.set}`);
    assert.equal(it.file, `memes/${it.set}/${it.id}.webp`, `${it.id}: file path`);
    assert.ok(S.MEMES_IMAGE_RE.test(it.file), `${it.id}: file accepted by the schema`);
    assert.ok(S.normalizeTrigger({ id: 'x', visual: { kind: 'image', src: it.file } }).trigger.visual.kind === 'image');
  }
});

test('memes: ids unique, keywords in de / tr / en, categories set', () => {
  const ids = new Set();
  for (const it of index.items) {
    assert.match(it.id, /^[a-z0-9_-]{1,80}$/);
    assert.ok(!ids.has(it.id), `duplicate id ${it.id}`);
    ids.add(it.id);
    for (const l of ['de', 'tr', 'en']) {
      assert.ok(Array.isArray(it.keywords[l]) && it.keywords[l].length >= 1, `${it.id}: ${l} keywords`);
      for (const k of it.keywords[l]) assert.ok(typeof k === 'string' && k.trim() === k && k.length > 0, `${it.id}: keyword "${k}"`);
    }
    assert.ok(it.category.length > 0);
  }
  const cats = new Set(index.items.map((it) => it.category));
  for (const must of ['laugh', 'shock', 'love', 'fire', 'party', 'applause', 'sad', 'facepalm', 'thinking', 'cool', 'thumbs', '100', 'rocket', 'crown', 'ghost', 'money', 'star', 'sparkles', 'eyes', 'pleading', 'sleeping', 'popcorn', 'trophy', 'animals', 'weather', 'food']) {
    assert.ok(cats.has(must), `category ${must}`);
  }
});

test('memes: every file exists, is a WebP <= 60 KB, total <= 6 MB, animated flag matches the file', () => {
  let total = 0;
  for (const it of index.items) {
    const file = path.join(ROOT, it.file);
    assert.ok(fs.existsSync(file), `${it.file} exists`);
    const info = webpInfo(file);
    assert.ok(info.riff, `${it.file} is a RIFF/WEBP file`);
    assert.ok(info.bytes > 0 && info.bytes <= MAX_FILE, `${it.file}: ${info.bytes} bytes <= ${MAX_FILE}`);
    assert.equal(info.animated, it.animated, `${it.id}: animated flag`);
    total += info.bytes;
  }
  assert.ok(total <= MAX_TOTAL, `total ${total} bytes <= ${MAX_TOTAL}`);
  assert.ok(index.items.filter((it) => it.animated).length >= 50, 'at least 50 animated stickers');
  // no stray files next to the indexed ones
  for (const set of index.sets) {
    const listed = new Set(index.items.filter((it) => it.set === set.id).map((it) => path.basename(it.file)));
    for (const f of fs.readdirSync(path.join(MEMES, set.id))) assert.ok(listed.has(f), `memes/${set.id}/${f} is listed in index.json`);
  }
});

test('memes: hard exclusions – no flags, religious, weapon/violence, drug/alcohol/tobacco or obscene emoji, no brands', () => {
  for (const it of index.items) {
    const cps = Array.from(it.emoji, (c) => c.codePointAt(0));
    for (const cp of cps) {
      assert.ok(!BANNED.includes(cp), `${it.id}: ${it.emoji} contains banned U+${cp.toString(16)}`);
      assert.ok(!isFlagCp(cp), `${it.id}: ${it.emoji} is a flag`);
    }
    assert.equal(build.excludedCategory(it.emoji), null, `${it.id}: ${it.emoji} excluded by the build script`);
    assert.ok(!build.EXCLUDED_NAME_RE.test(it.name || ''), `${it.id}: asset name ${it.name}`);
    assert.ok(!/logo|brand/i.test(`${it.id} ${it.name || ''}`), `${it.id}: brand logo`);
  }
  // the build-script filter itself catches every category of the brief
  for (const [emoji, cat] of [['🇹🇷', 'flags'], ['🏴‍☠️', 'flags'], ['🏳️‍🌈', 'flags'], ['☪️', 'religious'], ['✝️', 'religious'], ['🕌', 'religious'], ['⛩️', 'religious'], ['🔫', 'violence'], ['☠️', 'violence'], ['🩸', 'violence'], ['🍺', 'drugs'], ['💉', 'drugs'], ['🚬', 'drugs'], ['🖕', 'obscene'], ['🍆', 'obscene'], ['💦', 'obscene']]) {
    assert.equal(build.excludedCategory(emoji), cat, `${emoji} -> ${cat}`);
  }
  assert.equal(build.excludedCategory('😂'), null);
  assert.equal(build.excludedCategory('🧑‍🚀'), null, 'people / identity emoji are allowed');
  assert.doesNotThrow(() => build.checkList(), 'curated list passes its own checks');
  assert.equal(build.items().length, index.items.length, 'index.json is in sync with the curated list');
});

test('memes: licence notice and docs ship with the stickers', () => {
  const notices = fs.readFileSync(path.join(ROOT, 'THIRD-PARTY-NOTICES.md'), 'utf8');
  assert.match(notices, /Fluent Emoji/);
  assert.match(notices, /MIT License/);
  assert.match(notices, /Copyright \(c\) Microsoft Corporation/);
  assert.match(notices, /Permission is hereby granted, free of charge/);
  assert.match(notices, /THE SOFTWARE IS PROVIDED "AS IS"/);
  const doc = fs.readFileSync(path.join(ROOT, 'docs', 'STICKER.md'), 'utf8');
  assert.match(doc, /node scripts\/build-memes\.js/);
});

test('memes: static allow-list maps /memes/<set>/<file> with a week of cache, rejects everything else', () => {
  const ctx = { rootDir: ROOT, dataDir: path.join(ROOT, 'data') };
  const ok = resolveTarget('/memes/fluent/joy.webp', ctx);
  assert.ok(ok, 'webp allowed');
  assert.equal(path.join(ok.base, ok.rel), path.join(MEMES, 'fluent', 'joy.webp'));
  assert.match(ok.cache, /max-age=604800/);
  assert.ok(resolveTarget('/memes/fluent/x.png', ctx));
  assert.ok(resolveTarget('/memes/fluent/meta.json', ctx));
  assert.ok(resolveTarget('/memes/index.json', ctx));
  for (const bad of ['/memes/../data/token.txt', '/memes/fluent/../../server.js', '/memes/fluent/x.gif', '/memes/fluent/x.js', '/memes/fluent/sub/x.webp', '/memes/x.webp', '/memes/Fluent/x.webp', '/memes/fluent/.webp', '/memes/', '/memes/fluent/x.webp/']) {
    assert.equal(resolveTarget(bad, ctx), null, `${bad} rejected`);
  }
});

test('memes: the server serves stickers and index.json over HTTP', async () => {
  const server = await startServer();
  try {
    const r = await fetch(`${server.base}/memes/fluent/joy.webp`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/webp');
    assert.match(r.headers.get('cache-control'), /max-age=604800/);
    const body = Buffer.from(await r.arrayBuffer());
    assert.equal(body.toString('ascii', 8, 12), 'WEBP');
    const j = await api(server.base, 'GET', '/memes/index.json');
    assert.equal(j.status, 200);
    assert.equal(j.json.items.length, index.items.length);
    assert.equal((await api(server.base, 'GET', '/memes/fluent/nope.webp')).status, 404);
    assert.equal((await api(server.base, 'GET', '/memes/%2e%2e/server.js')).status, 404);
  } finally {
    await server.stop();
  }
});

// ---- 2.1 integration: sticker library helpers of the panel (js/assets.js → LiveFXAssets.stickers) ----

test('sticker library: index cleans to 143 schema-valid items, search folds de/tr/en + diacritics', () => {
  require('../js/assets.js');
  const St = globalThis.LiveFXAssets.stickers;
  const items = St.clean(index);
  assert.equal(items.length, 143);
  for (const it of items) assert.ok(S.isImageSrc(it.file) && S.MEMES_IMAGE_RE.test(it.file), it.file);
  const ids = (q, c) => St.search(items, q, c).map((x) => x.id);
  assert.ok(ids('lach').includes('joy'), 'de');
  assert.ok(ids('gül').includes('joy'), 'tr');
  assert.deepEqual(ids('gul'), ids('gül'), 'ü folded');
  assert.ok(ids('LOL').includes('joy'), 'en, case-insensitive');
  assert.equal(ids('').length, 143);
  assert.ok(ids('', 'animals').length > 5 && St.search(items, '', 'animals').every((x) => x.category === 'animals'));
  assert.deepEqual(ids('zzzz-nothing'), []);
  assert.equal(St.fold('İYİ Işık'), 'iyi isik');
  // hostile index entries are dropped
  const bad = St.clean({ items: [{ id: 'x', file: 'memes/../data/token.txt' }, { id: 'y', file: 'https://evil.net/a.webp' }, { id: 'z' }, null, { id: 'ok', file: 'memes/fluent/joy.webp' }] });
  assert.deepEqual(bad.map((x) => x.id), ['ok']);
  // hand-over to the panel: image asset with emoji fallback + keywords of the requested language
  const asset = St.toAsset(items.find((x) => x.id === 'joy'), 'tr');
  assert.deepEqual({ url: asset.url, type: asset.type, emoji: asset.emoji, sticker: asset.sticker }, { url: 'memes/fluent/joy.webp', type: 'image', emoji: '😂', sticker: true });
  assert.ok(asset.keywords.length >= 1 && asset.keywords.length <= 3 && asset.keywords.every((k) => index.items.find((x) => x.id === 'joy').keywords.tr.includes(k)));
  const n = S.normalizeTrigger({ id: 't', label: asset.name, keywords: asset.keywords, visual: { kind: 'image', src: asset.url, emoji: asset.emoji } });
  assert.deepEqual(n.warnings, []);
  assert.equal(n.trigger.visual.src, 'memes/fluent/joy.webp');
});
