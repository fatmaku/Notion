// Unit tests for js/sketch.js (LiveFX 2.3 "Zeichenfilm"): the stroke library (completeness, unit box, seeded
// deterministic jitter, walk cycle without line boil), the draw-in scheduler (timing math), the scene composer
// (story state -> elements inside the band, stable keys, styles), colours (theme / mood ink, sky wash) and the
// Node-safe API surface. Rendering itself is covered by test/e2e/31-sketch.js. Run: node --test "test/*.test.js"
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const MOD = path.join(__dirname, '..', 'js', 'sketch.js');
const K = require(MOD);
const Director = require('../js/story-director.js');

const near = (a, b, eps, what) => assert.ok(Math.abs(a - b) <= eps, `${what || 'value'}: ${a} vs ${b} (±${eps})`);

// The drawings the "Zeichenfilm" brief asks for (ids in LIBRARY).
const REQUIRED = [
  'house', 'tree', 'pine', 'car', 'sun', 'moon', 'cloud', 'rain', 'snowflake', 'lightning', 'mountains', 'waves', 'boat', 'ship',
  'castle', 'dragon', 'cat', 'dog', 'bird', 'flower', 'person', 'heart', 'star', 'chest', 'campfire', 'road', 'horizon',
];

// ------------------------------------------------------------------ library
test('LIBRARY: ≥ 24 drawings incl. every required one; frozen; UMD global + module export', () => {
  assert.ok(K.LIBRARY.length >= 24, `${K.LIBRARY.length} drawings`);
  for (const id of REQUIRED) assert.ok(K.LIBRARY.includes(id), `missing drawing: ${id}`);
  assert.ok(Object.isFrozen(K.LIBRARY));
  assert.equal(new Set(K.LIBRARY).size, K.LIBRARY.length, 'ids are unique');
  assert.equal(globalThis.LiveFXSketch, K, 'global LiveFXSketch');
  for (const fn of ['attach', 'pathFor', 'record', 'compose', 'schedule', 'durationFor']) assert.equal(typeof K[fn], 'function', fn);
  assert.deepEqual(K.STYLES, ['emoji', 'sketch', 'mixed']);
});

test('pathFor: every drawing is a list of ordered strokes inside the unit box', () => {
  for (const id of K.LIBRARY) {
    const p = K.pathFor(id);
    assert.equal(p.id, id);
    assert.ok(p.aspect > 0, `${id}: aspect`);
    assert.ok(Array.isArray(p.strokes) && p.strokes.length >= 1, `${id}: strokes`);
    assert.ok(p.length > 1, `${id}: ink length ${p.length}`);
    let sum = 0;
    for (const s of p.strokes) {
      assert.ok(s.pts.length >= 2 && s.pts.length % 2 === 0, `${id}: point pairs`);
      assert.ok(s.w > 0 && s.w < 2.5, `${id}: width factor ${s.w}`);
      for (const v of s.pts) assert.ok(Number.isFinite(v) && v >= -0.05 && v <= 1.05, `${id}: point ${v} outside the unit box`);
      if (s.dot) assert.equal(s.pts.length, 2, `${id}: a dot is one point`);
      sum += s.len;
    }
    near(sum, p.length, 0.01, `${id}: length = sum of stroke lengths`);
    // a drawing reads as an outline: a closed (fillable) shape or several strokes
    assert.ok(p.strokes.some((s) => s.closed) || p.strokes.length >= 2, `${id}: has a shape`);
  }
  assert.equal(K.pathFor('no-such-thing'), null);
  assert.equal(K.pathFor('__proto__'), null);
});

test('pathFor: seeded hand-jitter is deterministic (same seed -> identical strokes, also in a fresh module)', () => {
  const a = JSON.stringify(K.pathFor('car', { seed: 42 }));
  const b = JSON.stringify(K.pathFor('car', { seed: 42 }));
  assert.equal(a, b);
  // fresh module instance (empty path cache) -> same numbers
  delete require.cache[require.resolve(MOD)];
  const saved = globalThis.LiveFXSketch;
  delete globalThis.LiveFXSketch;
  const K2 = require(MOD);
  globalThis.LiveFXSketch = saved;
  assert.notEqual(K2, K);
  assert.equal(JSON.stringify(K2.pathFor('car', { seed: 42 })), a, 'fresh instance draws the same car');
  assert.equal(JSON.stringify(K2.pathFor('dragon')), JSON.stringify(K.pathFor('dragon')), 'default seed = hash of the id');
  // another seed -> another hand, same drawing
  const c = K.pathFor('car', { seed: 43 });
  assert.notEqual(JSON.stringify(c), a, 'a different seed jitters differently');
  assert.equal(c.strokes.length, JSON.parse(a).strokes.length, 'same strokes');
  const p42 = JSON.parse(a).strokes[0].pts;
  let maxd = 0;
  for (let i = 0; i < Math.min(p42.length, c.strokes[0].pts.length); i++) maxd = Math.max(maxd, Math.abs(p42[i] - c.strokes[0].pts[i]));
  assert.ok(maxd > 0 && maxd < 0.03, `jitter is slight (${maxd})`);
});

test('pathFor: person walk cycle – phases differ, mirrored half-cycle is identical (no line boil), rest pose', () => {
  const rest = K.pathFor('person');
  assert.equal(rest.phase, null);
  const p0 = K.pathFor('person', { phase: 0 });
  const p25 = K.pathFor('person', { phase: 0.25 });
  const p75 = K.pathFor('person', { phase: 0.75 });
  assert.equal(p0.strokes.length, p25.strokes.length, 'same strokes in every pose');
  assert.notEqual(JSON.stringify(p25.strokes), JSON.stringify(p75.strokes), 'legs swing');
  // sin(0) = sin(π): the poses at 0 and 0.5 are the same body -> the same jitter (strokes do not re-jitter per frame)
  assert.equal(JSON.stringify(K.pathFor('person', { phase: 0.5 }).strokes), JSON.stringify(p0.strokes));
  assert.equal(JSON.stringify(K.pathFor('person', { phase: 1.25 }).strokes), JSON.stringify(p25.strokes), 'phase wraps');
  // still things ignore the phase
  assert.equal(K.pathFor('house', { phase: 0.3 }).phase, null);
  // dragon / bird flap, campfire flickers
  assert.notEqual(JSON.stringify(K.pathFor('dragon', { phase: 0 }).strokes), JSON.stringify(K.pathFor('dragon', { phase: 0.5 }).strokes));
  assert.notEqual(JSON.stringify(K.pathFor('campfire', { phase: 0 }).strokes), JSON.stringify(K.pathFor('campfire', { phase: 0.4 }).strokes));
});

test('pathFor: wide items (road, horizon) take the requested aspect', () => {
  const r = K.pathFor('road', { aspect: 12 });
  assert.equal(r.aspect, 12);
  assert.ok(r.strokes.length > K.pathFor('road', { aspect: 4 }).strokes.length, 'more lane marks on a longer road');
  assert.equal(K.pathFor('car', { aspect: 9 }).aspect, 2, 'fixed items keep their aspect');
});

// ------------------------------------------------------------------ scheduler
test('durationFor: 0.6 s + 0.09 s per unit of ink, clamped to 0.6..1.2 s', () => {
  assert.equal(K.durationFor(0), 0.6);
  assert.equal(K.durationFor(-3), 0.6);
  assert.equal(K.durationFor('x'), 0.6);
  near(K.durationFor(3), 0.87, 1e-9);
  assert.equal(K.durationFor(100), 1.2);
  for (const id of K.LIBRARY) {
    const d = K.durationFor(K.pathFor(id).length);
    assert.ok(d >= K.LIMITS.DRAW_MIN && d <= K.LIMITS.DRAW_MAX, `${id}: ${d}`);
  }
});

test('schedule: strokes one after another, time ∝ length, short pen lifts, last stroke ends at the duration', () => {
  const s = K.schedule([1, 1, 2], 1);
  // gap = min(60 ms, 20 % / 2) = 60 ms; 0.88 s of ink split 1 : 1 : 2
  near(s[0].t0, 0, 1e-9);
  near(s[0].t1, 0.22, 1e-9);
  near(s[1].t0, 0.28, 1e-9);
  near(s[1].t1, 0.5, 1e-9);
  near(s[2].t0, 0.56, 1e-9);
  assert.equal(s[2].t1, 1);
  assert.deepEqual(K.schedule([], 1), []);
  assert.deepEqual(K.schedule([5], 0.8), [{ t0: 0, t1: 0.8 }]);
  // a dot (length 0) still gets a moment of its own; small durations shrink the gaps (≤ 20 % in total)
  const d = K.schedule([3, 0, 3], 0.2);
  assert.ok(d[1].t1 > d[1].t0, 'dot has time');
  const gaps = d[1].t0 - d[0].t1 + (d[2].t0 - d[1].t1);
  assert.ok(gaps <= 0.2 * 0.2 + 1e-9, `gaps ${gaps}`);
  // every library item: monotonic, inside [0, D]
  for (const id of K.LIBRARY) {
    const p = K.pathFor(id);
    const D = K.durationFor(p.length);
    const sch = K.schedule(p.strokes.map((x) => x.len), D);
    assert.equal(sch.length, p.strokes.length);
    let t = 0;
    for (const x of sch) {
      assert.ok(x.t0 >= t - 1e-9 && x.t1 >= x.t0, `${id}: ordered`);
      t = x.t1;
    }
    near(sch[sch.length - 1].t1, D, 1e-9, `${id}: ends at D`);
  }
});

test('progress: 0 before a stroke, linear inside, 1 after', () => {
  const s = K.schedule([1, 1], 1);
  assert.deepEqual(K.progress(s, -1), [0, 0]);
  assert.deepEqual(K.progress(s, 0), [0, 0]);
  const mid = K.progress(s, s[0].t1 / 2);
  near(mid[0], 0.5, 1e-9);
  assert.equal(mid[1], 0);
  assert.deepEqual(K.progress(s, 1), [1, 1]);
  assert.deepEqual(K.progress(s, 99), [1, 1]);
});

test('stagger: new elements of one update start ≤ 0.16 s apart, all within 1.4 s', () => {
  assert.deepEqual(K.stagger(0), []);
  assert.deepEqual(K.stagger(1), [0]);
  assert.deepEqual(K.stagger(3), [0, 0.16, 0.32]);
  const many = K.stagger(30);
  assert.equal(many.length, 30);
  near(many[29], 1.4, 0.001);
  for (let i = 1; i < many.length; i++) assert.ok(many[i] - many[i - 1] <= 0.16 + 1e-9 && many[i] > many[i - 1]);
});

// ------------------------------------------------------------------ composer
const RAIN_FOREST_CAR = {
  scene: 'rain', weather: 'rain', time: 'day', place: 'forest', mood: 'calm',
  actors: [{ emoji: '👧', role: 'girl', action: 'go' }],
  props: [{ emoji: '🚗', role: 'car' }],
};
const BANDS = { obs169: { w: 1920, h: 238 }, obs916: { w: 1080, h: 384 }, phone: { w: 390, h: 169 } };

function inBand(comp, size, what) {
  for (const e of comp.els) {
    if (e.proc) continue;
    assert.ok(e.y - e.h >= -1 && e.y <= size.h + 1, `${what}: ${e.key} y ${e.y - e.h}..${e.y} outside 0..${size.h}`);
    assert.ok(e.x >= -size.w * 0.05 && e.x <= size.w * 1.05, `${what}: ${e.key} x ${e.x}`);
    assert.ok(e.h > 0 && e.h <= size.h + 1, `${what}: ${e.key} h ${e.h}`);
  }
}

test('compose: rain + forest + car + girl -> horizon, trees, car, girl, clouds, falling rain – all inside the band', () => {
  for (const [name, size] of Object.entries(BANDS)) {
    const c = K.compose(RAIN_FOREST_CAR, size, { style: 'sketch' });
    const keys = c.els.map((e) => e.key);
    assert.ok(keys.includes('ground:horizon'), `${name}: horizon`);
    assert.ok(keys.includes('prop:car'), `${name}: car`);
    assert.ok(keys.includes('actor:girl'), `${name}: girl`);
    assert.ok(keys.includes('wx:rain'), `${name}: rain strokes`);
    assert.ok(keys.filter((k) => k.startsWith('forest:')).length >= 2, `${name}: trees`);
    assert.ok(keys.some((k) => k.startsWith('sky:cloud:')), `${name}: rain clouds`);
    assert.ok(!keys.includes('sky:sun'), `${name}: no sun in the rain`);
    assert.equal(c.els.find((e) => e.key === 'prop:car').id, 'car');
    assert.equal(c.els.find((e) => e.key === 'actor:girl').id, 'girl');
    assert.ok(c.wash && c.wash.top[3] > 0, `${name}: sky wash`);
    inBand(c, size, name);
    // stable: the same state lays out the same way
    assert.deepEqual(K.compose(RAIN_FOREST_CAR, size, { style: 'sketch' }).els, c.els, `${name}: deterministic`);
  }
});

test('compose: car and girl do not stand on each other; background keeps out of their way or steps back', () => {
  const size = BANDS.obs916;
  const c = K.compose({ ...RAIN_FOREST_CAR, props: [{ emoji: '🚗', role: 'car' }, { emoji: '🏠', role: 'house' }] }, size, { style: 'sketch' });
  const fronts = c.els.filter((e) => e.key.startsWith('prop:') || e.key.startsWith('actor:'));
  const half = (e) => (e.h * (K.pathFor(e.id).aspect || 1)) / 2;
  for (let i = 0; i < fronts.length; i++) {
    for (let j = i + 1; j < fronts.length; j++) {
      const a = fronts[i];
      const b = fronts[j];
      assert.ok(Math.abs(a.x - b.x) >= (half(a) + half(b)) * 0.8, `${a.key} vs ${b.key} overlap (${Math.round(a.x)} / ${Math.round(b.x)})`);
    }
  }
  for (const t of c.els.filter((e) => e.key.startsWith('forest:'))) {
    const blocked = fronts.some((f) => Math.abs(f.x - t.x) < half(f) + half(t) * 0.55);
    if (blocked) assert.ok(t.alpha <= 0.7, `${t.key} behind a front element is drawn fainter`);
  }
});

test('compose: styles – mixed leaves figures (+ props) to the emoji renderer and skips the weather strokes', () => {
  const size = BANDS.obs169;
  const mixed = K.compose(RAIN_FOREST_CAR, size, { style: 'mixed' });
  const keys = mixed.els.map((e) => e.key);
  assert.ok(!keys.some((k) => k.startsWith('actor:')), 'no drawn actors in mixed');
  assert.ok(!keys.some((k) => k.startsWith('prop:')), 'props stay emoji (renderer shows them)');
  assert.ok(!keys.includes('wx:rain'), 'emoji parallax shows the rain');
  assert.ok(keys.some((k) => k.startsWith('forest:')), 'scenery is drawn');
  assert.equal(mixed.wash, null, 'the emoji scene keeps its own background');
  const mixedProps = K.compose(RAIN_FOREST_CAR, size, { style: 'mixed', mixedProps: true });
  assert.ok(mixedProps.els.some((e) => e.key === 'prop:car'), 'mixed + mixedProps draws the car');
  assert.ok(!mixedProps.els.some((e) => e.key.startsWith('actor:')));
  const storm = K.compose({ ...RAIN_FOREST_CAR, scene: 'storm', weather: 'storm' }, size, { style: 'mixed' });
  assert.ok(storm.els.some((e) => e.proc === 'lightning'), 'mixed storm still flashes drawn lightning');
});

test('compose: end / no scene / garbage -> nothing on stage', () => {
  assert.deepEqual(K.compose({ ...RAIN_FOREST_CAR, end: true }, BANDS.obs169).els, []);
  assert.deepEqual(K.compose({ ...RAIN_FOREST_CAR, scene: null }, BANDS.obs169).els, []);
  assert.deepEqual(K.compose(null, BANDS.obs169).els, []);
  assert.deepEqual(K.compose([1, 2], BANDS.obs169).els, []);
  assert.deepEqual(K.compose('rain', BANDS.obs169).els, []);
  const tiny = K.compose(RAIN_FOREST_CAR, { w: 0, h: -5 });
  assert.ok(Array.isArray(tiny.els));
});

test('compose: every place, time and weather of the director draws something sensible', () => {
  const size = BANDS.obs916;
  for (const place of Object.keys(Director.LEX.place)) {
    const c = K.compose({ scene: 'forest', place, actors: [], props: [] }, size, { style: 'sketch' });
    const scenery = c.els.filter((e) => e.layer !== 5 && !e.key.startsWith('ground:') && !e.key.startsWith('sky:'));
    assert.ok(scenery.length >= 1 || place === 'sea', `${place}: scenery (${c.els.map((e) => e.key)})`);
    inBand(c, size, place);
  }
  const night = K.compose({ scene: 'night', time: 'night', place: 'forest' }, size);
  assert.ok(night.els.some((e) => e.key === 'sky:moon') && night.els.some((e) => e.key.startsWith('sky:star:')), 'night: moon + stars');
  const morning = K.compose({ scene: 'sunrise', time: 'morning', place: 'meadow' }, size);
  assert.ok(morning.els.some((e) => e.key === 'sky:sun:low' && e.rays), 'morning: low sun with turning rays');
  const day = K.compose({ scene: 'forest', time: 'day', weather: 'clear', place: 'forest' }, size);
  assert.ok(day.els.some((e) => e.key === 'sky:sun' && e.rays));
  const snow = K.compose({ scene: 'snow', weather: 'snow', place: 'village' }, size);
  assert.ok(snow.els.some((e) => e.proc === 'snow'));
  const sea = K.compose({ scene: 'sea', place: 'sea', props: [{ emoji: '⛵', role: 'ship' }] }, size);
  assert.ok(sea.els.some((e) => e.proc === 'waves'), 'sea: animated waves');
  const ship = sea.els.find((e) => e.key === 'prop:ship');
  assert.ok(ship && ship.float && ship.y < size.h, 'the ship floats on the water');
  // a bare scene id still gets its place / weather
  const bare = K.compose({ scene: 'castle' }, size);
  assert.ok(bare.els.some((e) => e.id === 'castle'));
  const fire = K.compose({ scene: 'fire' }, size);
  assert.ok(fire.els.some((e) => e.id === 'campfire'), 'scene fire draws a campfire');
});

test('compose: positions of elements already on stage are kept (no shuffle when a prop arrives)', () => {
  const size = BANDS.obs916;
  const first = K.compose({ scene: 'forest', place: 'forest', actors: [], props: [] }, size);
  const keep = new Set(first.els.map((e) => e.key));
  const pos = new Map(first.els.map((e) => [e.key, e.x]));
  const next = K.compose({ scene: 'forest', place: 'forest', actors: [], props: [{ emoji: '🚗', role: 'car' }] }, size, { keep, pos });
  for (const e of first.els.filter((x) => x.key.startsWith('forest:'))) {
    const n = next.els.find((x) => x.key === e.key);
    assert.ok(n, `${e.key} stays`);
    assert.equal(n.x, e.x, `${e.key} keeps its place`);
  }
  assert.ok(next.els.some((e) => e.key === 'prop:car'));
  const k1 = new Set(next.els.map((e) => e.key));
  const d = K.diff([...keep], [...k1]);
  assert.deepEqual(d.added, ['prop:car']);
  assert.deepEqual(d.removed, []);
});

const halfW = (e) => (e.h * (e.aspect || K.pathFor(e.id).aspect)) / 2;
const boxOf = (e) => ({ l: e.x - halfW(e), r: e.x + halfW(e), t: e.y - e.h, b: e.y });
const hits = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

test('compose: sky items stay below the band\'s top fade; new trees under a cloud / the sun stay below it', () => {
  const sizes = { ...BANDS, full: { w: 1920, h: 1080 }, portrait35: { w: 1080, h: 672 } };
  const states = [RAIN_FOREST_CAR, { ...RAIN_FOREST_CAR, scene: 'forest', weather: 'clear' }, { ...RAIN_FOREST_CAR, scene: 'night', time: 'night', weather: 'clear' }];
  for (const [name, size] of Object.entries(sizes)) {
    for (const st of states) {
      const c = K.compose(st, size, { style: 'sketch' });
      const sky = c.els.filter((e) => /^sky:(cloud|sun|moon)/.test(e.key));
      assert.ok(sky.length >= 1, `${name} ${st.weather}/${st.time}: sky`);
      for (const s of sky) assert.ok(s.y - s.h >= size.h * 0.12 - 1, `${name}: ${s.key} top ${Math.round(s.y - s.h)} inside the top fade (css mask 0..18 %)`);
      for (const t of c.els.filter((e) => e.key.startsWith('forest:'))) {
        for (const s of sky) {
          const reach = halfW(t) + halfW(s) + (typeof s.drift === 'number' ? s.drift : 0);
          const bottom = s.y + (s.rays ? s.h * 0.21 : 0);
          if (Math.abs(t.x - s.x) < reach) assert.ok(t.y - t.h >= bottom, `${name} ${st.weather}/${st.time}: ${t.key} (top ${Math.round(t.y - t.h)}) reaches into ${s.key} (bottom ${Math.round(bottom)})`);
        }
      }
      inBand(c, size, name);
    }
  }
});

test('compose: at night the moon and the stars keep clear of a castle, a dragon and the scenery', () => {
  const night = {
    scene: 'night', time: 'night', weather: 'clear', place: 'village', mood: 'scary',
    actors: [{ emoji: '🐉', role: 'dragon', action: 'fly' }, { emoji: '🤴', role: 'king', action: 'run' }],
    props: [{ emoji: '🏰', role: 'castle' }, { emoji: '🔥', role: 'fire' }],
  };
  for (const [name, size] of Object.entries({ obs169: BANDS.obs169, obs916: BANDS.obs916, portrait35: { w: 1080, h: 672 } })) {
    for (const place of ['village', 'forest']) {
      const c = K.compose({ ...night, place }, size, { style: 'sketch' });
      const tall = c.els.filter((e) => /^(prop|actor|village|forest)/.test(e.key));
      const moon = c.els.find((e) => e.key === 'sky:moon');
      assert.ok(moon, `${name}: moon`);
      assert.deepEqual(tall.filter((t) => hits(boxOf(moon), boxOf(t))).map((t) => t.key), [], `${name} ${place}: the moon is not hidden`);
      const stars = c.els.filter((e) => e.id === 'star' && e.key.startsWith('sky:'));
      assert.ok(stars.length >= 2, `${name} ${place}: stars (${stars.length})`);
      for (const s of stars) assert.deepEqual(tall.filter((t) => hits(boxOf(s), boxOf(t))).map((t) => t.key), [], `${name} ${place}: ${s.key} hidden`);
      assert.ok(!stars.some((s) => hits(boxOf(s), boxOf(moon))), `${name} ${place}: no star behind the moon`);
      inBand(c, size, `${name} ${place}`);
    }
  }
});

test('draw plan: settled elements become one cached run, moving ones are drawn above it only where they overlap nothing', () => {
  const size = BANDS.obs169;
  const sk = new K.Sketch(null, null, {});
  sk._size = { w: size.w, h: size.h, dpr: 1, W: size.w, H: size.h };
  const c = K.compose(RAIN_FOREST_CAR, size, { style: 'sketch' });
  sk._u = c.u;
  sk._ground = c.ground;
  sk.els = c.els.map((d) => sk._makeEl(d, 0, true)).sort((a, b) => a.layer - b.layer);
  sk._wash = { cur: c.wash, prev: null, t0: 1 };
  const t = 10000;
  for (const el of sk.els) el._m = sk._motion(el, t);
  const s = { w: size.w, h: size.h, dpr: 1, canvas: { width: size.w, height: size.h } };
  const show = (plan) => plan.map((it) => (it.run ? `[${it.items.map((x) => x.key).join(' ')}]${it.under ? '*' : ''}` : it.key));
  const plan = show(sk._plan(s, t));
  // wash + horizon + trees + car (all still) in one run, no occlusion mask needed (nothing is drawn below it)
  assert.equal(plan[0], `[wash ground:horizon ${c.els.filter((e) => e.key.startsWith('forest:')).map((e) => e.key).join(' ')} prop:car]`);
  assert.deepEqual(plan.slice(1), ['sky:cloud:0', 'sky:cloud:1', 'sky:cloud:2', 'actor:girl', 'wx:rain'], 'drifting clouds (clear of the trees), walking girl, rain');
  // a cloud right behind a tree top must stay below the tree: the run splits and masks what is drawn under it
  const tree = sk.els.find((e) => e.key === 'forest:1');
  const cloud = sk.els.find((e) => e.key === 'sky:cloud:0');
  cloud.x = tree.x;
  cloud.y = tree.y - tree.h + 20;
  const split = show(sk._plan(s, t));
  assert.equal(split[0], '[wash]');
  assert.equal(split[1], 'sky:cloud:0');
  assert.ok(split[2].startsWith('[ground:horizon') && split[2].endsWith(']*'), `the scenery run masks the cloud (${split[2]})`);
  // something drawing in is never cached
  const car = sk.els.find((e) => e.key === 'prop:car');
  car.state = 'draw';
  car._m = 0;
  assert.ok(!show(sk._plan(s, t)).some((x) => x.startsWith('[') && x.includes('prop:car')), 'the car drawing in is drawn live');
});

test('diff: added / removed / kept', () => {
  assert.deepEqual(K.diff(['a', 'b'], ['b', 'c']), { added: ['c'], removed: ['a'], kept: ['b'] });
  assert.deepEqual(K.diff(null, ['x']), { added: ['x'], removed: [], kept: [] });
});

test('idFor: every figure and object of the story director has a drawing', () => {
  for (const [role, emoji] of Object.entries(Director.SPRITE)) {
    const id = K.idFor({ role, emoji });
    assert.ok(id && K.LIBRARY.includes(id), `${role} ${emoji} -> ${id}`);
    assert.equal(K.idFor({ role: 'actor', emoji }) !== null || role === 'treasure', true, `${emoji} alone -> drawing`);
  }
  assert.equal(K.idFor({ role: 'car', emoji: '🚗' }), 'car');
  assert.equal(K.idFor({ role: 'treasure', emoji: '💰' }), 'chest');
  assert.equal(K.idFor({ role: 'fire', emoji: '🔥' }), 'campfire');
  assert.equal(K.idFor({ role: 'thing', emoji: '🚗' }), 'car', 'emoji fallback');
  assert.equal(K.idFor({ role: 'thing', emoji: '🧀' }), null);
  assert.equal(K.idFor(null), null);
});

// ------------------------------------------------------------------ colours
test('inkFor: white ink with a dark halo by default, mood tints, themes', () => {
  assert.deepEqual(K.inkFor('neon', 'calm'), { ink: '#ffffff', halo: '#000000', under: 0.5 });
  assert.deepEqual(K.inkFor(undefined, undefined), K.inkFor('neon', 'calm'), 'unknown -> neon / calm');
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const sad = rgb(K.inkFor('neon', 'sad').ink);
  assert.ok(sad[2] > sad[0], 'sad = bluish ink');
  const happy = rgb(K.inkFor('neon', 'happy').ink);
  assert.ok(happy[0] > happy[2], 'happy = warm ink');
  const tense = rgb(K.inkFor('neon', 'tense').ink);
  assert.ok(tense[0] > tense[1], 'tense = reddish');
  assert.equal(K.inkFor('kinderbuch', 'calm').halo, '#4a2c10');
  for (const t of ['neon', 'pastel', 'minimal', 'kinderbuch']) {
    const c = K.inkFor(t, 'calm');
    assert.match(c.ink, /^#[0-9a-f]{6}$/);
    assert.ok(Math.min(...rgb(c.ink)) > 200, `${t}: light ink (readable on a dark halo)`);
  }
});

test('washFor: time of day / weather set a semi-transparent sky wash (no ground in space)', () => {
  const day = K.washFor({ time: 'day', weather: 'clear', place: 'forest' });
  const night = K.washFor({ time: 'night', weather: 'clear', place: 'forest' });
  const rain = K.washFor({ time: 'day', weather: 'rain', place: 'forest' });
  const space = K.washFor({ time: 'night', place: 'space' });
  for (const w of [day, night, rain, space]) {
    assert.ok(w.top[3] > 0 && w.top[3] < 0.7, `semi-transparent (${w.top[3]})`);
    assert.equal(typeof w.key, 'string');
  }
  assert.ok(night.top[3] > day.top[3], 'night is darker');
  assert.ok(night.top[0] + night.top[1] + night.top[2] < day.top[0] + day.top[1] + day.top[2]);
  assert.ok(rain.top[2] < day.top[2], 'rain greys the sky');
  assert.equal(space.ground, null);
  assert.notEqual(day.key, night.key);
  assert.equal(K.washFor(null), null);
});

// ------------------------------------------------------------------ API in Node (no DOM)
test('attach / update / setStyle / stats work without a DOM; one sketch per renderer; record rejects', async () => {
  const renderer = { layout: { storyStyle: 'mixed' }, onScene: null };
  const sk = K.attach(renderer, () => null);
  assert.equal(K.attach(renderer, () => null), sk, 'attach twice -> same sketch');
  assert.equal(sk.style, 'mixed', 'starts in the layout style');
  assert.equal(typeof renderer.onScene, 'function', 'chains the renderer scene hook');
  assert.equal(sk.setStyle('sketch'), 'sketch');
  assert.equal(sk.setStyle('bogus'), 'sketch');
  const st = sk.update({ ...RAIN_FOREST_CAR, style: 'sketch', idle: false });
  assert.equal(st, sk.stats);
  assert.equal(sk.stats.updates, 1);
  assert.equal(sk.stats.style, 'sketch');
  sk.update({ ...RAIN_FOREST_CAR, style: 'emoji' });
  assert.equal(sk.style, 'emoji', 'update carries the style');
  assert.equal(sk.stats.running, false);
  for (const k of ['elements', 'drawing', 'frameMs', 'avgMs', 'p95Ms', 'maxMs', 'fps', 'running']) assert.ok(k in sk.stats, k);
  sk.detach();
  assert.equal(renderer.onScene, null, 'detach restores the hook');
  assert.notEqual(K.attach(renderer, () => null), sk, 'a detached sketch is replaced');
  assert.throws(() => K.attach(null), TypeError);
  await assert.rejects(K.record({}), /captureStream/);
  await assert.rejects(K.record({ canvas: { captureStream() {} } }), /MediaRecorder/);
});
