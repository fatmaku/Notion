// Unit tests for js/packs.js (language / culture meme packs, story packs 1.3, theme packs 2.0). Run: node --test "test/*.test.js"
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/sounds.js');
require('../js/triggers.js');
require('../js/schema.js');
require('../js/matcher.js');
require('../js/packs.js');

const S = globalThis.LiveFXSchema;
const P = globalThis.LiveFXPacks;
const defaults = globalThis.LiveFXDefaultTriggers;
const soundNames = globalThis.LiveFXSounds.names;
const MIN = { tr: 85, de: 49, en: 50, family: 25, gaming: 25, 'story-de': 25, 'story-tr': 25, 'story-en': 25 };
const MEME = ['tr', 'de', 'en'];
const THEME = ['family', 'gaming']; // 2.0 theme packs: mixed DE/TR/EN
const STORY = ['story-de', 'story-tr', 'story-en'];
// The story packs use visual kinds `scene` / `sticker` and `loop:` sounds (schema / sounds packages of 1.3).
// When those land later than the packs, the affected assertions are skipped with a console message.
const SCHEMA_HAS_SCENE = Array.isArray(S.KINDS) && S.KINDS.includes('scene') && S.KINDS.includes('sticker') && Array.isArray(S.SCENES);
const LOOPS = Array.isArray(globalThis.LiveFXSounds.loops) ? globalThis.LiveFXSounds.loops : null;
if (!SCHEMA_HAS_SCENE) console.log('packs.test: LiveFXSchema has no scene/sticker kinds yet – skipping story normalization assertions');
if (!LOOPS) console.log('packs.test: LiveFXSounds.loops missing – skipping loop assertions');

const lower = (k) => String(k).toLowerCase();

test('packs: list() describes tr / de / en + theme + story packs with counts', () => {
  const list = P.list();
  assert.deepEqual(list.map((p) => p.id).sort(), ['de', 'en', 'family', 'gaming', 'story-de', 'story-en', 'story-tr', 'tr']);
  for (const p of list) {
    assert.equal(typeof p.label, 'string');
    assert.equal(typeof p.flag, 'string');
    assert.equal(typeof p.description, 'string');
    assert.equal(p.count, P.packs[p.id].triggers.length);
    assert.ok(p.count >= MIN[p.id], `${p.id} has ${p.count} triggers (min ${MIN[p.id]})`);
    assert.equal(p.story, STORY.includes(p.id), `${p.id}.story`);
  }
  assert.equal(P.packs['story-de'].label, '📖 Geschichten (DE)');
  assert.equal(P.packs['story-tr'].label, '📖 Masal (TR)');
  assert.equal(P.packs['story-en'].label, '📖 Story (EN)');
  assert.equal(P.packs.family.label, '👨‍👩‍👧 Familie & Kinder');
  assert.equal(P.packs.gaming.label, '🎮 Gaming');
});

test('packs: storyPackFor() maps language tags to story packs', () => {
  assert.equal(P.storyPackFor('de-DE'), 'story-de');
  assert.equal(P.storyPackFor('de-AT'), 'story-de');
  assert.equal(P.storyPackFor('tr-TR'), 'story-tr');
  assert.equal(P.storyPackFor('en-GB'), 'story-en');
  assert.equal(P.storyPackFor('fr-FR'), 'story-de');
  assert.equal(P.storyPackFor(undefined), 'story-de');
});

test('packs: get() returns deep copies and [] for unknown ids', () => {
  const a = P.get('tr');
  const b = P.get('tr');
  assert.notEqual(a, b);
  assert.notEqual(a[0], b[0]);
  assert.deepEqual(a, b);
  a[0].keywords.push('mutated');
  assert.ok(!P.get('tr')[0].keywords.includes('mutated'), 'source pack untouched');
  assert.deepEqual(P.get('nope'), []);
  assert.deepEqual(P.get('toString'), []);
});

test('packs: every trigger normalizes without warnings and keeps its id', () => {
  for (const p of P.list()) {
    const story = STORY.includes(p.id);
    for (const t of P.get(p.id)) {
      const n = S.normalizeTrigger(t);
      assert.ok(n, `${t.id} is an object`);
      if (!story || SCHEMA_HAS_SCENE) assert.deepEqual(n.warnings, [], `${t.id}: ${n.warnings.join('; ')}`);
      assert.equal(n.trigger.id, t.id);
      assert.ok(t.id.startsWith(`${p.id}-`), `${t.id} is prefixed with ${p.id}-`);
      assert.equal(typeof t.hint, 'string');
      assert.ok(t.hint.length > 0 && t.hint.length <= S.LIMITS.hint, `${t.id} has a hint`);
      assert.ok(t.keywords.length >= 3 && t.keywords.length <= 8, `${t.id} has 3..8 keywords (${t.keywords.length})`);
      assert.ok(t.cooldown >= 1 && t.cooldown <= 60, `${t.id} cooldown sensible`);
      if (story) {
        assert.ok(['scene', 'sticker'].includes(t.visual.kind), `${t.id} visual kind`);
        if (t.visual.kind === 'sticker') assert.ok(t.visual.emoji && t.visual.text, `${t.id} sticker has emoji + text`);
      } else {
        assert.ok(['card', 'banner', 'rain', 'confetti'].includes(t.visual.kind), `${t.id} visual kind`);
        assert.ok(t.visual.emoji, `${t.id} has an emoji`);
        if (t.visual.kind !== 'rain') assert.ok(t.visual.text, `${t.id} has a text`);
      }
    }
  }
});

test('packs: ids unique across all packs and the defaults', () => {
  const seen = new Set(defaults.map((t) => t.id));
  for (const p of P.list()) {
    for (const t of P.get(p.id)) {
      assert.ok(!seen.has(t.id), `duplicate id ${t.id}`);
      seen.add(t.id);
    }
  }
});

test('packs: keywords non-empty, unique within a pack, and not copies of default keywords', () => {
  const defKw = new Set(defaults.flatMap((t) => t.keywords.map(lower)));
  for (const p of P.list()) {
    const seen = new Map();
    for (const t of P.get(p.id)) {
      for (const k of t.keywords) {
        assert.equal(typeof k, 'string');
        assert.ok(k.trim().length > 0, `${t.id}: empty keyword`);
        assert.equal(k, k.trim(), `${t.id}: keyword "${k}" not trimmed`);
        const l = lower(k);
        assert.ok(!seen.has(l), `${p.id}: keyword "${k}" in ${t.id} already used by ${seen.get(l)}`);
        seen.set(l, t.id);
        assert.ok(!defKw.has(l), `${t.id}: keyword "${k}" duplicates a default keyword`);
      }
    }
  }
});

test('packs: sounds are builtin names, loop:<name> (story) or null', () => {
  for (const p of P.list()) {
    for (const t of P.get(p.id)) {
      if (t.sound === null) continue;
      if (typeof t.sound === 'string' && t.sound.startsWith('loop:')) {
        assert.ok(STORY.includes(p.id), `${t.id}: loops only in story packs`);
        if (LOOPS) assert.ok(LOOPS.includes(t.sound.slice(5)), `${t.id}: unknown loop "${t.sound}"`);
        continue;
      }
      assert.ok(soundNames.includes(t.sound), `${t.id}: unknown sound "${t.sound}"`);
    }
  }
  assert.ok(P.get('tr').some((t) => t.sound), 'tr uses sounds');
});

test('packs: Turkish pack contains the signature phrases', () => {
  const kws = new Set(P.get('tr').flatMap((t) => t.keywords.map(lower)));
  for (const must of ['yok artık', 'helal olsun', 'aynen', 'kral', 'ohaa']) assert.ok(kws.has(must), `tr keyword "${must}"`);
});

test('packs: matcher fires Turkish pack triggers, longest keyword first', () => {
  const m = new globalThis.LiveFXMatcher.Matcher(defaults.concat(P.get('tr')));
  let hits = m.process('yok artık bu ne ya', 0);
  assert.ok(hits.length >= 1);
  assert.ok(hits[0].trigger.id.startsWith('tr-'), `tr trigger fired: ${hits[0].trigger.id}`);
  assert.equal(hits[0].keyword, 'yok artık');
  m.endUtterance();

  hits = m.process('helal olsun kral', 100);
  assert.equal(hits.length, 1, 'global gap lets only the first one through');
  assert.equal(hits[0].trigger.id, 'tr-helal');
  assert.equal(hits[0].keyword, 'helal olsun');
  m.endUtterance();

  hits = m.process('kral adam bu', 200);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].trigger.id, 'tr-kral');
});

test('packs: defaults + all meme packs fit into the trigger limit', () => {
  const all = defaults.concat(P.get('tr'), P.get('de'), P.get('en'));
  assert.ok(all.length <= S.LIMITS.triggers, `${all.length} <= ${S.LIMITS.triggers}`);
  const n = S.normalizeTriggers(all);
  assert.deepEqual(n.warnings, []);
  assert.equal(n.triggers.length, all.length);
});

test('packs: defaults + a meme pack + its story pack fit into the trigger limit', () => {
  for (const fam of MEME) {
    const all = defaults.concat(P.get(fam), P.get(`story-${fam}`));
    assert.ok(all.length <= S.LIMITS.triggers, `${fam}: ${all.length} <= ${S.LIMITS.triggers}`);
    const n = S.normalizeTriggers(all);
    if (SCHEMA_HAS_SCENE) assert.deepEqual(n.warnings, []);
    assert.equal(n.triggers.length, all.length);
  }
});

// ---- story packs (1.3) ----

test('story packs: >= 25 triggers each, scene triggers cover every scene, stickers on top with long cooldowns', () => {
  const scenes = SCHEMA_HAS_SCENE ? S.SCENES : P.SCENE_IDS;
  if (SCHEMA_HAS_SCENE) assert.deepEqual(P.SCENE_IDS, S.SCENES, 'packs.SCENE_IDS mirrors LiveFXSchema.SCENES');
  for (const id of STORY) {
    const list = P.get(id);
    assert.ok(list.length >= 25, `${id}: ${list.length} triggers`);
    const sceneTriggers = list.filter((t) => t.visual.kind === 'scene');
    const stickers = list.filter((t) => t.visual.kind === 'sticker');
    assert.ok(sceneTriggers.length >= 12, `${id}: ${sceneTriggers.length} scene triggers`);
    assert.ok(stickers.length >= 10, `${id}: ${stickers.length} stickers`);
    const used = new Set(sceneTriggers.map((t) => t.visual.scene));
    for (const sc of scenes) assert.ok(used.has(sc), `${id}: scene "${sc}" has a trigger`);
    for (const t of sceneTriggers) {
      assert.ok(scenes.includes(t.visual.scene), `${t.id}: scene "${t.visual.scene}" in SCENES`);
      assert.equal(t.cooldown, 8, `${t.id}: scene cooldown 8`);
      assert.ok(t.visual.intensity >= 1 && t.visual.intensity <= 3, `${t.id}: intensity 1..3`);
      if (t.visual.text) assert.ok(t.visual.text.length <= S.LIMITS.text, `${t.id}: caption length`);
      if (t.visual.scene === 'clear') assert.equal(t.sound, 'tada', `${t.id}: clear plays tada`);
      else assert.match(String(t.sound), /^loop:[a-z][a-zA-Z0-9]*$/, `${t.id}: scene has an ambient loop`);
    }
    for (const t of stickers) {
      assert.equal(t.visual.position, 'top', `${t.id}: sticker on top`);
      assert.equal(t.cooldown, 6, `${t.id}: sticker cooldown 6`);
      assert.ok(soundNames.includes(t.sound), `${t.id}: builtin sound`);
      const n = Array.from(t.visual.emoji.replace(/[\uFE0F\u200D]/g, '')).length;
      assert.ok(n >= 1 && n <= 4, `${t.id}: 1..4 emojis (${n})`);
    }
  }
});

test('story packs: keywords never equal keywords of the defaults or the meme packs', () => {
  const taken = new Map();
  for (const t of defaults) for (const k of t.keywords) taken.set(lower(k), t.id);
  for (const id of MEME) for (const t of P.get(id)) for (const k of t.keywords) taken.set(lower(k), t.id);
  for (const id of STORY) {
    for (const t of P.get(id)) {
      for (const k of t.keywords) assert.ok(!taken.has(lower(k)), `${t.id}: keyword "${k}" already used by ${taken.get(lower(k))}`);
    }
  }
});

test('story packs: signature phrases and the "clear" trigger are present', () => {
  const kws = (id) => new Set(P.get(id).flatMap((t) => t.keywords.map(lower)));
  const tr = kws('story-tr');
  for (const must of ['bir varmış bir yokmuş', 'yağmur yağıyordu', 'yağmur', 'gece', 'ormanda', 'orman', 'deniz', 'sarayda', 'padişah', 'kar yağıyordu', 'kar', 'çöl', 'şehir', 'yıldızlar', 'sabah', 'fırtına', 'ejderha', 'prenses', 'şövalye', 'hazine', 'cadı', 'büyü', 'gökkuşağı', 'gokkusagi', 'yagmur', 'firtina', 'son', 'masal bitti']) {
    assert.ok(tr.has(must), `story-tr keyword "${must}"`);
  }
  const de = kws('story-de');
  for (const must of ['es regnete', 'regen', 'in der nacht', 'im wald', 'am meer', 'schloss', 'schnee', 'wüste', 'stadt', 'sterne', 'gewitter', 'drache', 'prinzessin', 'ritter', 'ende', 'das ende', 'und wenn sie nicht gestorben sind']) {
    assert.ok(de.has(must), `story-de keyword "${must}"`);
  }
  const en = kws('story-en');
  for (const must of ['once upon a time', 'it was raining', 'forest', 'castle', 'dragon', 'princess', 'the end']) assert.ok(en.has(must), `story-en keyword "${must}"`);
  const opening = P.get('story-tr').find((t) => t.keywords.includes('bir varmış bir yokmuş'));
  assert.equal(opening.visual.kind, 'scene');
  assert.equal(opening.visual.scene, 'sunrise');
  assert.equal(opening.visual.text, 'Bir varmış, bir yokmuş…');
  for (const id of STORY) {
    const clear = P.get(id).filter((t) => t.visual.kind === 'scene' && t.visual.scene === 'clear');
    assert.equal(clear.length, 1, `${id}: exactly one clear trigger`);
  }
});

test('story packs: matcher at medium tolerance fires the intended scene', () => {
  const cases = [
    ['story-tr', 'tr', 've yağmur yağıyordu', 'rain'],
    ['story-tr', 'tr', 'bir varmış bir yokmuş', 'sunrise'],
    ['story-de', 'de', 'es regnete in strömen', 'rain'],
    ['story-de', 'de', 'tief im wald war es still', 'forest'],
    ['story-en', 'en', 'in the dark forest', 'forest'],
    ['story-en', 'en', 'once upon a time there was a king', 'sunrise'],
  ];
  for (const [pack, lang, text, scene] of cases) {
    const m = new globalThis.LiveFXMatcher.Matcher(defaults.concat(P.get(pack)), { tolerance: 'medium', lang, globalMinGap: 1.2 });
    const hits = m.process(text, 0);
    assert.ok(hits.length >= 1, `${pack}: "${text}" fires something`);
    const h = hits[0];
    assert.ok(h.trigger.id.startsWith(`${pack}-`), `${pack}: "${text}" fired ${h.trigger.id}`);
    assert.equal(h.trigger.visual.kind, 'scene', `${pack}: "${text}" is a scene trigger`);
    assert.equal(h.trigger.visual.scene, scene, `${pack}: "${text}" -> ${scene}`);
  }
  const m = new globalThis.LiveFXMatcher.Matcher(defaults.concat(P.get('story-de')), { tolerance: 'medium', lang: 'de', globalMinGap: 0 });
  const hits = m.process('und dann kam der drache', 0);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].trigger.visual.kind, 'sticker');
  assert.equal(hits[0].trigger.id, 'story-de-drache');
});

test('story packs: every story keyword fires its own trigger (defaults + meme pack + story pack)', () => {
  for (const fam of MEME) {
    const all = defaults.concat(P.get(fam), P.get(`story-${fam}`));
    for (const trig of P.get(`story-${fam}`)) {
      for (const kw of trig.keywords) {
        const m = new globalThis.LiveFXMatcher.Matcher(all, { globalMinGap: 0 });
        const hits = m.process(`und dann ${kw} sagte er`, 0);
        assert.ok(hits.some((h) => h.trigger.id === trig.id), `${trig.id}: "${kw}" fires (got ${hits.map((h) => h.trigger.id).join(',') || 'nothing'})`);
      }
    }
  }
});

// ---- theme packs (2.0) ----

const SOFT_SOUNDS = ['bell', 'pop', 'ding', 'coin', 'levelUp', 'tada', 'boing', 'laugh', 'whoosh', 'drumroll', 'applause'];

test('theme packs: >= 25 triggers, meme-style visuals, builtin sounds, family uses soft sounds only', () => {
  for (const id of THEME) {
    const list = P.get(id);
    assert.ok(list.length >= 25, `${id}: ${list.length} triggers`);
    assert.equal(P.packs[id].story, undefined, `${id} is not a story pack`);
    for (const t of list) {
      assert.ok(['card', 'banner', 'rain', 'confetti'].includes(t.visual.kind), `${t.id}: visual kind ${t.visual.kind}`);
      if (t.sound !== null) assert.ok(soundNames.includes(t.sound), `${t.id}: unknown sound "${t.sound}"`);
      if (id === 'family') assert.ok(t.sound === null || SOFT_SOUNDS.includes(t.sound), `${t.id}: "${t.sound}" is not a soft sound`);
    }
  }
});

test('theme packs: signature phrases present', () => {
  const kws = (id) => new Set(P.get(id).flatMap((t) => t.keywords.map(lower)));
  const fam = kws('family');
  for (const must of ['gute nacht', 'aferin', 'oyun zamanı', 'bedtime', 'happy birthday', 'essen ist fertig', 'mama', 'baba']) assert.ok(fam.has(must), `family keyword "${must}"`);
  const g = kws('gaming');
  for (const must of ['headshot', 'gg wp', 'rage quit', 'noob', 'respawn', 'boss fight', 'lag', 'level up', 'victory', 'first blood']) assert.ok(g.has(must), `gaming keyword "${must}"`);
});

test('theme packs: 2.0 additions to tr / de / en are present', () => {
  const kws = (id) => new Set(P.get(id).flatMap((t) => t.keywords.map(lower)));
  const tr = kws('tr');
  for (const must of ['hadi bakalım', 'aman tanrım', 'olm', 'ya sabır', 'eyvallah', 'çüş', 'oha', 'bayıldım', 'ağla', 'kral', 'efsane']) assert.ok(tr.has(must), `tr keyword "${must}"`);
  const de = kws('de');
  for (const must of ['alter schwede', 'geil', 'läuft bei dir', 'kein plan', 'diggi', 'ehrenmann', 'cringy', 'safe', 'lost', 'jackpot']) assert.ok(de.has(must), `de keyword "${must}"`);
  const en = kws('en');
  for (const must of ['no cap', 'slay', 'bruh moment', 'sus', 'rizz', 'big w', 'big l', 'lessgo', 'plot twist', 'cooked', 'hype']) assert.ok(en.has(must), `en keyword "${must}"`);
});

test('theme packs: defaults + family + gaming (+ one meme pack) fit into the trigger limit and normalize cleanly', () => {
  for (const fam of MEME) {
    const all = defaults.concat(P.get('family'), P.get('gaming'), P.get(fam));
    assert.ok(all.length <= S.LIMITS.triggers, `${fam}: ${all.length} <= ${S.LIMITS.triggers}`);
    const n = S.normalizeTriggers(all);
    assert.deepEqual(n.warnings, []);
    assert.equal(n.triggers.length, all.length);
  }
});

test('theme packs: the matcher fires them next to the defaults (exact short words included)', () => {
  const m = new globalThis.LiveFXMatcher.Matcher(defaults.concat(P.get('gaming'), P.get('family')), { globalMinGap: 0 });
  const cases = [
    ['das war ein headshot digga', 'gaming-headshot'],
    ['ok ggwp jungs', 'gaming-ggwp'],
    ['ich hab lag', 'gaming-lag'],
    ['aferin sana', 'family-aferin'],
    ['so, essen ist fertig', 'family-essenfertig'],
    ['hadi oyun zamanı', 'family-oyunzamani'],
  ];
  for (const [text, id] of cases) {
    const hits = m.process(text, 0);
    assert.ok(hits.some((h) => h.trigger.id === id), `"${text}" -> ${id} (got ${hits.map((h) => h.trigger.id).join(',') || 'nothing'})`);
    m.endUtterance();
  }
});
