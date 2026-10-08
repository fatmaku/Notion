// Unit tests for js/story-director.js (LiveFX 2.2 live story): sentences in DE / TR / EN become a scene state
// (scene, weather, time, place, landmark, actors with actions, props, mood), interim lines only move the fast
// roles, "Ende" clears, "es war einmal" opens a fresh stage. Run: node --test "test/*.test.js"
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/schema.js');
const D = require('../js/story-director.js');

const S = globalThis.LiveFXSchema;

const SENTENCES = {
  de: 'Es regnete in der Nacht im Wald, der Drache flog über das Schloss',
  tr: 'gece ormanda yağmur yağıyordu, ejderha kalenin üzerinden uçtu',
  en: 'It was raining at night in the forest, the dragon flew over the castle',
};

function pick(st) {
  return { scene: st.scene, loop: st.loop, weather: st.weather, time: st.time, place: st.place, landmark: st.landmark, mood: st.mood, lang: st.lang, actors: st.actors, props: st.props };
}

for (const [lang, text] of Object.entries(SENTENCES)) {
  test(`${lang}: "${text}" -> rain + night + forest + dragon (flying) + castle`, () => {
    const d = D.create();
    const r = d.feed(text, { final: true });
    assert.equal(r.changed, true);
    assert.equal(r.lang, lang, `language detected (${r.lang})`);
    assert.deepEqual(pick(d.state), {
      scene: 'rain',
      loop: 'rain',
      weather: 'rain',
      time: 'night',
      place: 'forest',
      landmark: 'castle',
      mood: 'calm',
      lang,
      actors: [{ emoji: '🐉', role: 'dragon', action: 'fly' }],
      props: [{ emoji: '🏰', role: 'castle' }],
    });
    const roles = r.decisions.map((x) => x.role);
    for (const role of ['place', 'landmark', 'time', 'weather', 'figure', 'action']) assert.ok(roles.includes(role), `${lang}: decision ${role} (${roles})`);
    // The state is valid for the overlay envelope as-is.
    const env = S.validateEnvelope({ type: 'story-state', state: d.state });
    assert.equal(env.ok, true);
    assert.equal(env.msg.state.scene, 'rain');
    assert.equal(env.msg.state.actors[0].action, 'fly');
  });
}

test('forced language wins over detection; unknown forced language falls back to auto', () => {
  const d = D.create({ lang: 'tr' });
  assert.equal(d.lang, 'tr');
  assert.equal(d.setLang('xx'), 'auto');
  assert.equal(d.setLang('en'), 'en');
  const r = d.feed('the dragon came', { final: true });
  assert.equal(r.lang, 'en');
  assert.equal(d.feed('der Drache kam', { final: true, lang: 'de' }).lang, 'de', 'per-line override');
});

test('scene mapping: weather wins, then place, campfire, time of day; empty stage has no scene', () => {
  const d = D.create({ lang: 'de' });
  assert.equal(d.feed('Es war ein Tag', { final: true }).state.scene, null, 'daytime, nobody on stage');
  assert.equal(d.feed('Sie gingen ans Meer', { final: true }).state.scene, 'sea');
  assert.equal(d.feed('Es begann zu schneien', { final: true }).state.scene, 'snow', 'weather over place');
  assert.equal(d.feed('Der Schnee hörte auf', { final: true }).state.scene, 'sea', '"hörte auf" clears the weather');
  assert.equal(d.state.weather, 'clear');
  assert.equal(d.feed('Am Abend saßen sie am Lagerfeuer', { final: true }).state.scene, 'sea', 'place keeps precedence over the campfire');
  const e = D.create({ lang: 'de' });
  assert.equal(e.feed('Sie saßen am Lagerfeuer', { final: true }).state.scene, 'fire');
  assert.equal(e.feed('Es war einmal ein Abend', { final: true }).state.scene, 'sunrise', 'opening resets, evening -> sunrise');
  assert.equal(e.feed('In der Höhle war es dunkel', { final: true }).state.scene, 'night', 'cave -> night');
  assert.equal(e.feed('Sie stiegen auf den Berg', { final: true }).state.scene, 'snow', 'mountains -> snow');
  assert.equal(e.feed('Im Weltraum', { final: true }).state.scene, 'space');
  assert.equal(e.state.loop, 'spaceDrone');
  const f = D.create({ lang: 'en' });
  assert.equal(f.feed('A girl walked in', { final: true }).state.scene, 'sunrise', 'someone on a daytime stage gets a sunrise');
});

test('actors: actions attach to the nearest figure, vanish removes, cap 6, props cap 4', () => {
  const d = D.create({ lang: 'de' });
  d.feed('Das Mädchen und der Hund rannten, dann schlief die Katze ein', { final: true });
  const byRole = Object.fromEntries(d.state.actors.map((a) => [a.role, a.action]));
  assert.deepEqual(byRole, { girl: null, dog: 'run', cat: 'sleep' });
  d.feed('Der Hund verschwand', { final: true });
  assert.deepEqual(d.state.actors.map((a) => a.role), ['girl', 'cat']);
  d.feed('Er tanzte', { final: true });
  assert.equal(d.state.actors.find((a) => a.role === 'cat').action, 'dance', 'pronoun -> last figure');
  d.feed('König, Prinzessin, Ritter, Hexe, Fuchs, Eule und Hase kamen', { final: true });
  assert.equal(d.state.actors.length, 6, 'actors capped at 6 (oldest leave)');
  d.feed('Ein Baum, ein Haus, ein Schatz, ein Schiff, ein Auto und eine Blume', { final: true });
  assert.equal(d.state.props.length, 4, 'props capped at 4');
  assert.deepEqual(d.state.props.map((p) => p.role), ['treasure', 'ship', 'car', 'flower'], 'oldest props leave first');
});

test('interim lines move only place / time / weather / mood; the final line adds figures', () => {
  const d = D.create({ lang: 'en' });
  const events = [];
  d.onChange((s) => events.push(s.scene + ':' + s.actors.length));
  d.feed('at night in the forest the dragon', { final: false });
  assert.equal(d.state.scene, 'forest');
  assert.equal(d.state.time, 'night');
  assert.deepEqual(d.state.actors, [], 'no sprites from an interim line');
  d.feed('at night in the forest the dragon flew', { final: true });
  assert.deepEqual(d.state.actors, [{ emoji: '🐉', role: 'dragon', action: 'fly' }]);
  assert.deepEqual(events, ['forest:0', 'forest:1']);
  assert.equal(d.feed('at night in the forest the dragon flew', { final: true }).changed, false, 'same state emits nothing');
});

test('mood, shake, caption, end and reset', () => {
  const d = D.create({ lang: 'tr', caption: true });
  d.feed('aniden korkunç bir hayalet belirdi', { final: true });
  assert.equal(d.state.mood, 'scary');
  assert.equal(d.state.shake, true, '"aniden" (suddenly) shakes once');
  assert.equal(d.state.actors[0].role, 'ghost');
  assert.equal(d.state.caption, 'aniden korkunç bir hayalet belirdi');
  d.feed('hayalet güldü', { final: true });
  assert.equal(d.state.shake, false, 'shake is per line');
  assert.equal(d.state.actors[0].action, 'laugh');
  d.feed('masal bitti', { final: true });
  assert.equal(d.state.end, true);
  assert.equal(d.state.scene, null);
  assert.deepEqual(d.state.actors, []);
  d.feed('gece ormanda', { final: true });
  assert.equal(d.state.end, false, 'a new line after the end continues');
  assert.equal(d.state.scene, 'forest');
  const r = d.reset();
  assert.equal(r.scene, null);
  assert.equal(r.time, 'day');
});

test('robustness: garbage input, typos (one edit), Turkish suffixes, empty lines', () => {
  const d = D.create();
  assert.deepEqual(d.feed('', { final: true }).decisions, []);
  assert.equal(d.feed(null).changed, false);
  assert.equal(d.feed(12345, { final: true }).hits, 0);
  assert.equal(D.create({ lang: 'de' }).feed('der Drachen flog ins Schlos', { final: true }).state.landmark, null, 'Schlos (typo) without a nature place is the place');
  assert.equal(D.create({ lang: 'de' }).feed('der Drachen flog ins Schlos', { final: true }).state.place, 'castle');
  assert.equal(D.create({ lang: 'tr' }).feed('ejderhayı ormanlarda gördüler', { final: true }).state.place, 'forest', 'ormanlarda -> orman');
  assert.equal(D.create({ lang: 'en' }).feed('a cat sat on the mat' + ' <b>x</b>'.repeat(50), { final: true }).state.actors[0].role, 'cat');
  const long = 'wald '.repeat(400);
  assert.equal(D.create({ lang: 'de' }).feed(long, { final: true }).state.place, 'forest');
  assert.deepEqual(D.LANGS, ['de', 'tr', 'en']);
  assert.ok(Object.keys(D.SPRITE).length >= 38);
  assert.equal(D.LOOP_BY_SCENE.night, 'nightCrickets');
});

// ---- 2.2.1 lifecycle: props / actors live only while the story talks about them ----

/** Feeds final lines one by one and returns a compact view of the state after each line. */
function run(d, lines, opts = {}) {
  return lines.map((line) => {
    const r = d.feed(line, { final: true, ...opts });
    const s = d.state;
    return { line, lang: r.lang, scene: s.scene, weather: s.weather, place: s.place, props: s.props.map((p) => p.role), actors: s.actors.map((a) => a.role) };
  });
}

const RAIN_CAR_SUN_FOREST = {
  tr: ['yağmur yağıyordu', 'araba geldi', 'güneş açtı', 'ormanda yürüdük'],
  de: ['Es regnete', 'Ein Auto kam', 'Dann kam die Sonne raus', 'Wir gingen in den Wald'],
  en: ['It was raining', 'A car came', 'The sun came out', 'We walked into the forest'],
};
for (const [lang, lines] of Object.entries(RAIN_CAR_SUN_FOREST)) {
  test(`2.2.1 ${lang}: rain -> car -> sun -> forest: rain gone when the sun comes, car gone after 3 sentences`, () => {
    const d = D.create(); // auto language detection, as in the overlay
    const [rain, car, sun, forest] = run(d, lines);
    for (const step of [rain, car, sun, forest]) assert.equal(step.lang, lang, `${step.line}: language`);
    assert.deepEqual([rain.scene, rain.weather, rain.props], ['rain', 'rain', []]);
    assert.deepEqual([car.scene, car.props], ['rain', ['car']], 'the car drives into the rain');
    assert.equal(sun.weather, 'clear', 'rain gone when the sun comes');
    assert.notEqual(sun.scene, 'rain');
    assert.deepEqual(sun.props, ['car'], 'mentioned in the previous sentence: the car stays for the sunshine');
    assert.deepEqual([forest.scene, forest.place, forest.props], ['forest', 'forest', []], 'new place: the car (2 sentences old) is gone');
    assert.equal(d.lines, 4);
  });
}

test('2.2.1 a prop leaves after 3 later sentences without a mention; a mention refreshes it; interim lines do not count', () => {
  const d = D.create({ lang: 'tr' });
  const steps = run(d, ['araba geldi', 've sonra', 'şey işte', 'bir şey oldu']);
  assert.deepEqual(steps.map((x) => x.props.length), [1, 1, 1, 0], 'gone after the 3rd later sentence');
  assert.equal(steps[3].scene, null, 'nothing left on stage -> no scene');
  const e = D.create({ lang: 'tr' });
  run(e, ['araba geldi', 've sonra', 'şey işte']);
  for (let i = 0; i < 5; i++) e.feed('bir şey', { final: false });
  assert.deepEqual(e.state.props.map((p) => p.role), ['car'], 'interim lines are not sentences');
  run(e, ['araba çok güzeldi', 'bir', 'iki']);
  assert.deepEqual(e.state.props.map((p) => p.role), ['car'], 'a mention restarts the count');
  run(e, ['üç']);
  assert.deepEqual(e.state.props, []);
  // the castle landmark is a prop too
  const f = D.create({ lang: 'de' });
  const lm = run(f, ['Im Wald stand ein Schloss', 'und dann', 'na ja', 'also']);
  assert.deepEqual(lm.map((x) => x.props), [['castle'], ['castle'], ['castle'], []]);
  assert.equal(lm[3].scene, 'forest', 'the place stays');
});

test('2.2.1 actors walk out after 4 later sentences; verbs and person pronouns keep them', () => {
  const d = D.create({ lang: 'de' });
  const steps = run(d, ['Ein Mädchen kam', 'und dann', 'na ja', 'also gut', 'jedenfalls']);
  assert.deepEqual(steps.map((x) => x.actors.length), [1, 1, 1, 1, 0]);
  const e = D.create({ lang: 'de' });
  run(e, ['Ein Mädchen kam', 'und dann', 'na ja', 'sie lachte', 'eins', 'zwei', 'drei']);
  assert.deepEqual(e.state.actors.map((a) => a.role), ['girl'], 'the verb bound to her ("sie lachte") refreshed the girl');
  run(e, ['vier']);
  assert.deepEqual(e.state.actors, []);
  const f = D.create({ lang: 'de' });
  run(f, ['Ein Drache kam', 'eins', 'zwei', 'er war groß', 'drei', 'vier', 'fünf']);
  assert.deepEqual(f.state.actors.map((a) => a.role), ['dragon'], 'a person pronoun refreshes the last figure');
  run(f, ['es regnete nicht']);
  assert.deepEqual(f.state.actors, [], '"es" is no person pronoun');
});

test('2.2.1 time limits: tick(now) ends props after 45 s and actors after 60 s (whichever comes first)', () => {
  let t = 1000;
  const d = D.create({ lang: 'en', now: () => t });
  const seen = [];
  d.onChange((s, info) => seen.push(`${info.reason}:${s.props.length}/${s.actors.length}`));
  d.feed('A dragon came with a treasure', { final: true });
  assert.deepEqual([d.state.props.length, d.state.actors.length], [1, 1]);
  assert.equal(d.tick(1000 + 44999).changed, false);
  const r = d.tick(1000 + 45000);
  assert.equal(r.changed, true);
  assert.deepEqual(r.expired, [{ kind: 'prop', role: 'treasure' }]);
  assert.deepEqual([d.state.props.length, d.state.actors.length], [0, 1]);
  t = 1000 + 59999;
  assert.equal(d.tick().changed, false, 'tick() without an argument uses the clock');
  t = 1000 + 60000;
  assert.deepEqual(d.tick().expired, [{ kind: 'actor', role: 'dragon' }]);
  assert.equal(d.state.scene, null, 'empty stage');
  assert.deepEqual(seen, ['feed:1/1', 'tick:0/1', 'tick:0/0'], 'listeners get the reason');
  // feed() applies the time limit too (a host without tick())
  const e = D.create({ lang: 'en' });
  e.feed('A cat came with a ball', { final: true, now: 0 });
  const later = e.feed('the end of nothing special here', { final: true, now: 50000 });
  assert.deepEqual(e.state.props, [], 'ball older than 45 s');
  assert.deepEqual(e.state.actors.map((a) => a.role), ['cat']);
  assert.ok(later.decisions.some((x) => x.role === 'expire' && x.id === 'ball'), 'decision lists the expiry');
  assert.equal(D.create({ ttl: { propMs: 10 } }).tick(Date.now() + 5).changed, false, 'ttl override, nothing on stage');
  assert.deepEqual(D.TTL, { propLines: 3, propMs: 45000, actorLines: 4, actorMs: 60000 });
});

test('2.2.1 scene / weather changes keep actors mentioned in the same or previous sentence', () => {
  const de = D.create({ lang: 'de' });
  run(de, ['Der Drache flog über den Wald', 'Es fing an zu regnen']);
  assert.deepEqual([de.state.scene, de.state.actors.map((a) => a.role)], ['rain', ['dragon']]);
  run(de, ['Dann wurde es Nacht im Schnee']);
  assert.deepEqual([de.state.scene, de.state.actors.map((a) => a.role)], ['snow', ['dragon']], 'actors follow the story into a new picture');
  const en = D.create({ lang: 'en' });
  run(en, ['A girl walked into the forest with a lantern', 'Suddenly it started to snow']);
  assert.deepEqual([en.state.scene, en.state.actors.map((a) => a.role), en.state.props.map((p) => p.role)], ['snow', ['girl'], ['lantern']], 'same / previous sentence: everything stays');
  run(en, ['They went to the sea']);
  assert.deepEqual([en.state.scene, en.state.actors.map((a) => a.role), en.state.props], ['snow', ['girl'], []], 'new place: the lantern from two sentences ago leaves, the girl stays');
  const tr = D.create({ lang: 'tr' });
  run(tr, ['kız ormanda yürüyordu', 'birden yağmur başladı']);
  assert.deepEqual([tr.state.scene, tr.state.actors.map((a) => a.role)], ['rain', ['girl']]);
});

test('2.2.1 removal words remove the named actor / object; a destination makes "gitti" a walk', () => {
  const cases = [
    ['tr', ['kız geldi', 'kız gitti'], [], []],
    ['tr', ['kedi ve köpek geldi', 'köpek uzaklaştı'], ['cat'], []],
    ['tr', ['araba geldi', 'araba gitti'], [], []],
    ['tr', ['araba geldi', 'araba kayboldu'], [], []],
    ['tr', ['ejderha geldi', 'sonra gitti'], [], []],
    ['de', ['Der Hund kam', 'Der Hund ging weg'], [], []],
    ['de', ['Ein Auto kam', 'Das Auto verschwand'], [], []],
    ['de', ['Der Fuchs kam mit einem Ball', 'Der Fuchs verschwand'], [], ['ball']],
    ['de', ['Das Mädchen kam mit dem Auto', 'Das Mädchen sah, wie das Auto verschwand'], ['girl'], []],
    ['en', ['The cat came', 'The cat left'], [], []],
    ['en', ['The ghost appeared', 'The ghost disappeared'], [], []],
    ['en', ['A ship came', 'the ship sailed away'], [], []],
  ];
  for (const [lang, lines, actors, props] of cases) {
    const d = D.create({ lang });
    run(d, lines);
    assert.deepEqual([d.state.actors.map((a) => a.role), d.state.props.map((p) => p.role)], [actors, props], `${lang}: ${lines.join(' / ')}`);
  }
  const walk = D.create({ lang: 'tr' });
  run(walk, ['kız ormana gitti']);
  assert.deepEqual([walk.state.place, walk.state.actors], ['forest', [{ emoji: '👧', role: 'girl', action: 'go' }]], '"ormana gitti" = she walked into the forest');
  const castle = D.create({ lang: 'de' });
  run(castle, ['Ein Drache flog im Wald über das Schloss', 'Das Schloss verschwand']);
  assert.deepEqual([castle.state.landmark, castle.state.props, castle.state.actors.map((a) => a.role)], [null, [], ['dragon']], 'a vanishing landmark leaves, the dragon stays');
  const fog = D.create({ lang: 'de' });
  run(fog, ['Der Drache kam', 'Der Wald verschwand im Nebel']);
  assert.deepEqual(fog.state.actors.map((a) => a.role), ['dragon'], 'a place "vanishing" removes nobody');
  const pron = D.create({ lang: 'de' });
  run(pron, ['Der Drache kam', 'Im Wald verschwand er']);
  assert.deepEqual(pron.state.actors, [], '"verschwand er" = the last figure');
});

test('2.2.1 end words count at the end of a line only; the bare Turkish "son" only as a line of its own', () => {
  const tr = D.create({ lang: 'tr' });
  run(tr, ['en son ejderha geldi', 'son dakika', 'son olarak kedi geldi']);
  assert.equal(tr.state.end, false, '"en son", "son dakika", "son olarak" are not the end');
  assert.deepEqual(tr.state.actors.map((a) => a.role), ['dragon', 'cat']);
  run(tr, ['en son']);
  assert.equal(tr.state.end, false, '"en son" = lastly');
  run(tr, ['son']);
  assert.equal(tr.state.end, true);
  assert.deepEqual([tr.state.scene, tr.state.actors], [null, []]);
  const tr2 = D.create({ lang: 'tr' });
  run(tr2, ['kedi geldi', 've hikaye bitti']);
  assert.equal(tr2.state.end, true, '"hikaye bitti"');
  const de = D.create({ lang: 'de' });
  run(de, ['Am Ende des Tages kam der Drache']);
  assert.equal(de.state.end, false, '"am Ende des Tages"');
  assert.deepEqual(de.state.actors.map((a) => a.role), ['dragon']);
  run(de, ['Und das war das Ende']);
  assert.equal(de.state.end, true);
  const en = D.create({ lang: 'en' });
  run(en, ['At the end of the road a fox came']);
  assert.equal(en.state.end, false);
  run(en, ['The end']);
  assert.equal(en.state.end, true);
});
