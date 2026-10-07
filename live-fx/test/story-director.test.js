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
