// Unit tests for js/schema.js (trigger schema v2 + v3 additions). Run: node --test "test/*.test.js"
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/triggers.js');
require('../js/schema.js');

const S = globalThis.LiveFXSchema;
const defaults = globalThis.LiveFXDefaultTriggers;

test('normalizeTrigger: full valid trigger passes through and gets defaults', () => {
  const r = S.normalizeTrigger({
    id: 'hype',
    label: 'Hype',
    keywords: ['hype', 'let\'s go'],
    sound: 'airhorn',
    hint: 'streamer is excited',
    visual: { kind: 'banner', position: 'top', emoji: '🔥', text: 'HYPE', bg: '#ff0000', color: 'rgba(255, 255, 255, 0.9)' },
  });
  assert.ok(r);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.trigger.id, 'hype');
  assert.equal(r.trigger.enabled, true);
  assert.equal(r.trigger.cooldown, 4);
  assert.equal(r.trigger.hint, 'streamer is excited');
  assert.equal(r.trigger.visual.kind, 'banner');
  assert.equal(r.trigger.visual.position, 'top');
  assert.equal(r.trigger.visual.bg, '#ff0000');
  assert.equal(r.trigger.visual.color, 'rgba(255, 255, 255, 0.9)');
});

test('normalizeTrigger: non-object input yields null', () => {
  assert.equal(S.normalizeTrigger(null), null);
  assert.equal(S.normalizeTrigger('x'), null);
  assert.equal(S.normalizeTrigger([1, 2]), null);
  assert.equal(S.normalizeTrigger(42), null);
});

test('normalizeTrigger: invalid / missing id becomes custom-n and label falls back to id', () => {
  const used = new Set();
  const a = S.normalizeTrigger({ id: 'bad id!' }, { usedIds: used });
  assert.equal(a.trigger.id, 'custom-1');
  assert.equal(a.trigger.label, 'custom-1');
  assert.match(a.warnings[0], /invalid id/);
  const b = S.normalizeTrigger({}, { usedIds: used });
  assert.equal(b.trigger.id, 'custom-2');
  assert.match(b.warnings[0], /missing id/);
  assert.ok(used.has('custom-1') && used.has('custom-2'));
  const long = S.normalizeTrigger({ id: 'a'.repeat(41) });
  assert.equal(long.trigger.id, 'custom-1');
});

test('normalizeTriggers: duplicate ids are renamed, non-array input yields []', () => {
  const r = S.normalizeTriggers([{ id: 'x' }, { id: 'X' }, { id: 'x' }]);
  assert.deepEqual(
    r.triggers.map((t) => t.id),
    ['x', 'X', 'custom-3']
  );
  assert.ok(r.warnings.some((w) => /duplicate id "x"/.test(w)));

  const bad = S.normalizeTriggers({ id: 'x' });
  assert.deepEqual(bad.triggers, []);
  assert.equal(bad.warnings.length, 1);
  assert.deepEqual(S.normalizeTriggers(undefined).triggers, []);
});

test('normalizeTriggers: skips non-object entries with a warning', () => {
  const r = S.normalizeTriggers([{ id: 'a' }, 'nope', null, { id: 'b' }]);
  assert.deepEqual(
    r.triggers.map((t) => t.id),
    ['a', 'b']
  );
  assert.equal(r.warnings.filter((w) => /not an object/.test(w)).length, 2);
});

test('normalizeTriggers: caps the list at LIMITS.triggers', () => {
  const many = Array.from({ length: S.LIMITS.triggers + 5 }, (_, i) => ({ id: `t${i}` }));
  const r = S.normalizeTriggers(many);
  assert.equal(r.triggers.length, S.LIMITS.triggers);
  assert.match(r.warnings[0], /too many triggers/);
});

test('keywords: trimmed, case-insensitively deduped, capped, comma string accepted', () => {
  const r = S.normalizeTrigger({ id: 'k', keywords: [' Wow ', 'wow', 'WOW', '', 'x'.repeat(80), 7] });
  assert.deepEqual(r.trigger.keywords, ['Wow', 'x'.repeat(S.LIMITS.keywordLen)]);

  const s = S.normalizeTrigger({ id: 'k', keywords: 'a, b ,a' });
  assert.deepEqual(s.trigger.keywords, ['a', 'b']);

  const many = S.normalizeTrigger({ id: 'k', keywords: Array.from({ length: 70 }, (_, i) => `kw${i}`) });
  assert.equal(many.trigger.keywords.length, S.LIMITS.keywords);
  assert.ok(many.warnings.some((w) => /too many keywords/.test(w)));
});

test('label / text / emoji / hint are trimmed and cut to their limits', () => {
  const r = S.normalizeTrigger({
    id: 'l',
    label: ' ' + 'L'.repeat(60),
    hint: 'h'.repeat(200),
    visual: { emoji: '🙂'.repeat(20), text: 't'.repeat(100) },
  });
  assert.equal(r.trigger.label.length, S.LIMITS.label);
  assert.equal(r.trigger.hint.length, S.LIMITS.hint);
  assert.equal(r.trigger.visual.text.length, S.LIMITS.text);
  assert.equal(r.trigger.visual.emoji.length, S.LIMITS.emoji);
});

test('enabled defaults to true, only false disables; cooldown clamped', () => {
  assert.equal(S.normalizeTrigger({ id: 'e' }).trigger.enabled, true);
  assert.equal(S.normalizeTrigger({ id: 'e', enabled: 0 }).trigger.enabled, true);
  assert.equal(S.normalizeTrigger({ id: 'e', enabled: false }).trigger.enabled, false);
  assert.equal(S.normalizeTrigger({ id: 'e', cooldown: 99999 }).trigger.cooldown, S.LIMITS.cooldown);
  assert.equal(S.normalizeTrigger({ id: 'e', cooldown: '2.5' }).trigger.cooldown, 2.5);
  const neg = S.normalizeTrigger({ id: 'e', cooldown: -1 });
  assert.equal(neg.trigger.cooldown, 4);
  assert.ok(neg.warnings.some((w) => /invalid cooldown/.test(w)));
});

test('sound: builtin and file forms kept, invalid dropped with a warning', () => {
  assert.equal(S.normalizeTrigger({ id: 's', sound: 'airhorn' }).trigger.sound, 'airhorn');
  assert.equal(S.normalizeTrigger({ id: 's', sound: 'file:assets/boom.mp3' }).trigger.sound, 'file:assets/boom.mp3');
  assert.equal(S.normalizeTrigger({ id: 's', sound: '' }).trigger.sound, null);
  for (const bad of ['file:../secret.mp3', 'file:assets/x.exe', 'no spaces', 'file:assets/../x.mp3', 42]) {
    const r = S.normalizeTrigger({ id: 's', sound: bad });
    assert.equal(r.trigger.sound, null, `sound ${bad}`);
    assert.ok(r.warnings.some((w) => /invalid sound/.test(w)), `warning for ${bad}`);
  }
});

test('parseSound', () => {
  assert.deepEqual(S.parseSound('airhorn'), { kind: 'builtin', name: 'airhorn' });
  assert.deepEqual(S.parseSound('file:assets/boom.mp3'), { kind: 'file', url: 'assets/boom.mp3' });
  assert.equal(S.parseSound('file:assets/../boom.mp3'), null);
  assert.equal(S.parseSound('file:other/boom.mp3'), null);
  assert.equal(S.parseSound('file:assets/boom.txt'), null);
  assert.equal(S.parseSound(''), null);
  assert.equal(S.parseSound(null), null);
  assert.equal(S.parseSound('1abc'), null);
});

test('visual: src validation, image without src falls back to card, count clamp, colors', () => {
  const ok = S.normalizeTrigger({ id: 'v', visual: { kind: 'image', src: 'assets/pic.PNG' } });
  assert.equal(ok.trigger.visual.kind, 'image');
  assert.equal(ok.trigger.visual.src, 'assets/pic.PNG');
  const http = S.normalizeTrigger({ id: 'v', visual: { kind: 'image', src: 'https://example.com/a.gif?x=1' } });
  assert.equal(http.trigger.visual.src, 'https://example.com/a.gif?x=1');

  for (const bad of ['assets/../x.png', 'javascript:alert(1)', 'assets/x.svg', 'data:image/png;base64,AAAA', '/etc/passwd']) {
    const r = S.normalizeTrigger({ id: 'v', visual: { kind: 'image', src: bad } });
    assert.equal(r.trigger.visual.src, undefined, `src ${bad}`);
    assert.equal(r.trigger.visual.kind, 'card', `kind for ${bad}`);
    assert.ok(r.warnings.some((w) => /invalid visual.src/.test(w)));
    assert.ok(r.warnings.some((w) => /without src/.test(w)));
  }

  const noSrc = S.normalizeTrigger({ id: 'v', visual: { kind: 'image' } });
  assert.equal(noSrc.trigger.visual.kind, 'card');

  assert.equal(S.normalizeTrigger({ id: 'v', visual: { kind: 'rain', count: 500 } }).trigger.visual.count, S.LIMITS.rainCount);
  assert.equal(S.normalizeTrigger({ id: 'v', visual: { kind: 'rain', count: 0 } }).trigger.visual.count, 1);
  assert.equal(S.normalizeTrigger({ id: 'v', visual: { kind: 'rain', count: '12.4' } }).trigger.visual.count, 12);
  const badCount = S.normalizeTrigger({ id: 'v', visual: { kind: 'rain', count: 'abc' } });
  assert.equal(badCount.trigger.visual.count, undefined);
  assert.ok(badCount.warnings.some((w) => /invalid visual.count/.test(w)));

  const col = S.normalizeTrigger({ id: 'v', visual: { bg: 'url(x)', color: '#abc' } });
  assert.equal(col.trigger.visual.bg, undefined);
  assert.equal(col.trigger.visual.color, '#abc');
  assert.ok(col.warnings.some((w) => /invalid visual.bg/.test(w)));

  const unk = S.normalizeTrigger({ id: 'v', visual: { kind: 'shake', position: 'bottom', shake: 'yes' } });
  assert.equal(unk.trigger.visual.kind, 'card');
  assert.equal(unk.trigger.visual.position, 'center');
  assert.equal(unk.trigger.visual.shake, undefined);
  assert.equal(unk.warnings.length, 2);
  assert.equal(S.normalizeTrigger({ id: 'v', visual: { shake: true } }).trigger.visual.shake, true);
  assert.equal(S.normalizeTrigger({ id: 'v', visual: 'nope' }).trigger.visual.kind, 'card');
});

test('warnings are prefixed with the trigger id', () => {
  const r = S.normalizeTrigger({ id: 'pfx', sound: '!!' });
  assert.ok(r.warnings.every((w) => w.startsWith('pfx: ')));
});

test('newId: shape and uniqueness', () => {
  const ids = new Set();
  for (let i = 0; i < 500; i++) {
    const id = S.newId();
    assert.match(id, /^m-[0-9a-f]{12}$/);
    ids.add(id);
  }
  assert.equal(ids.size, 500);
  assert.match(S.newId('srv'), /^srv-[0-9a-f]{12}$/);
});

test('default trigger pack normalizes without warnings', () => {
  const r = S.normalizeTriggers(defaults);
  assert.equal(r.triggers.length, defaults.length);
  assert.deepEqual(r.warnings, []);
});

test('mergeWithDefaults + deriveRemoved', () => {
  const norm = S.normalizeTriggers(defaults).triggers;
  const withoutWow = norm.filter((t) => t.id !== 'wow');

  // Derived removed list names the missing default.
  assert.deepEqual(S.deriveRemoved(withoutWow, norm), ['wow']);
  assert.deepEqual(S.deriveRemoved(norm, norm), []);
  assert.deepEqual(S.deriveRemoved([], norm), norm.map((t) => t.id));

  // A deleted default is not resurrected when listed in removed …
  const merged = S.mergeWithDefaults({ triggers: withoutWow, removed: ['wow'] }, norm);
  assert.equal(merged.length, norm.length - 1);
  assert.ok(!merged.some((t) => t.id === 'wow'));

  // … but comes back when the removed list does not mention it.
  const back = S.mergeWithDefaults({ triggers: withoutWow, removed: [] }, norm);
  assert.equal(back.length, norm.length);
  assert.equal(back[back.length - 1].id, 'wow');

  // A new default id is appended as a deep copy; a stored override wins over the default.
  const newDefault = { id: 'brandnew', label: 'New', keywords: ['neu'], visual: { kind: 'card' } };
  const custom = { ...norm[0], label: 'Mine' };
  const m2 = S.mergeWithDefaults({ triggers: [custom], removed: [] }, [norm[0], newDefault]);
  assert.equal(m2.length, 2);
  assert.equal(m2[0].label, 'Mine');
  assert.equal(m2[1].id, 'brandnew');
  assert.notEqual(m2[1], newDefault);
  m2[1].keywords.push('x');
  assert.deepEqual(newDefault.keywords, ['neu']);

  // Robust against missing inputs.
  assert.equal(S.mergeWithDefaults({}, norm).length, norm.length);
  assert.deepEqual(S.mergeWithDefaults({ triggers: [] }, undefined), []);
});

test('validateEnvelope: fire', () => {
  const r = S.validateEnvelope({
    id: 'abc.def-1',
    type: 'fire',
    ts: 123,
    trigger: { id: 'wow', keywords: ['a'], _keywords: ['a'], visual: { kind: 'rain', count: 999 } },
    source: 's'.repeat(100),
    extra: 'nope',
  });
  assert.equal(r.ok, true);
  assert.equal(r.msg.id, 'abc.def-1');
  assert.equal(r.msg.ts, 123);
  assert.equal(r.msg.extra, undefined);
  assert.equal(r.msg.trigger._keywords, undefined);
  assert.equal(r.msg.trigger.visual.count, S.LIMITS.rainCount);
  assert.equal(r.msg.source.length, S.LIMITS.sourceLen);

  const gen = S.validateEnvelope({ type: 'fire', id: 'bad id', trigger: { id: 'x' } });
  assert.match(gen.msg.id, /^m-[0-9a-f]{12}$/);
  assert.equal(gen.msg.source, 'API');
  assert.ok(Number.isFinite(gen.msg.ts));

  assert.equal(S.validateEnvelope({ type: 'fire' }).ok, false);
  assert.equal(S.validateEnvelope({ type: 'fire', trigger: 'x' }).ok, false);
});

test('validateEnvelope: volume clamp and rejects', () => {
  assert.equal(S.validateEnvelope({ type: 'volume', volume: 7 }).msg.volume, 1);
  assert.equal(S.validateEnvelope({ type: 'volume', volume: -2 }).msg.volume, 0);
  assert.equal(S.validateEnvelope({ type: 'volume', volume: '0.25' }).msg.volume, 0.25);
  assert.equal(S.validateEnvelope({ type: 'volume', volume: 'loud' }).ok, false);
  assert.equal(S.validateEnvelope({ type: 'transcript', text: 'x' }).ok, false);
  assert.equal(S.validateEnvelope({ type: 'state' }).ok, false);
  assert.equal(S.validateEnvelope(null).ok, false);
  assert.equal(S.validateEnvelope([]).ok, false);
  assert.equal(S.validateEnvelope('fire').ok, false);
});

test('escapeHtml', () => {
  assert.equal(S.escapeHtml(`<b a="1">&'</b>`), '&lt;b a=&quot;1&quot;&gt;&amp;&#39;&lt;/b&gt;');
  assert.equal(S.escapeHtml(123), '123');
  assert.equal(S.escapeHtml(''), '');
});

test('isSafeName', () => {
  assert.equal(S.isSafeName('boom.mp3'), true);
  assert.equal(S.isSafeName('My-Pic_2.PNG'), true);
  assert.equal(S.isSafeName('..'), false);
  assert.equal(S.isSafeName('a..b.png'), false);
  assert.equal(S.isSafeName('.hidden'), false);
  assert.equal(S.isSafeName('dir/x.png'), false);
  assert.equal(S.isSafeName('x'.repeat(101)), false);
  assert.equal(S.isSafeName(''), false);
  assert.equal(S.isSafeName(null), false);
});

test('exported constants', () => {
  assert.equal(S.VERSION, 3);
  assert.equal(S.SCHEMA_VERSION, 3);
  assert.deepEqual(S.KINDS, ['card', 'image', 'banner', 'rain', 'confetti', 'scene', 'sticker', 'text', 'lower-third', 'combo']);
  assert.deepEqual(S.TEXT_STYLES, ['neon', 'gradient', 'bounce', 'glitch', 'sticker']);
  assert.deepEqual(S.THEMES, ['neon', 'pastel', 'minimal', 'kinderbuch']);
  assert.equal(S.LIMITS.comboSteps, 6);
  assert.deepEqual(S.POSITIONS, ['center', 'top', 'safe']);
  assert.equal(S.LIMITS.triggers, 200);
  assert.equal(S.LIMITS.assetBytes, 8 * 1024 * 1024);
  assert.ok(S.ID_RE.test('a-b_c'));
  assert.ok(!S.ID_RE.test('-abc'));
  assert.ok(S.COLOR_RE.test('#12345678'));
  assert.ok(!S.COLOR_RE.test('red'));
});

// ---------------------------------------------------------------- schema v3 (LiveFX 2.0)

test('v3: a v2 trigger normalizes byte-for-byte like before (no new keys appear)', () => {
  const v2 = { id: 'wow', label: 'Wow', keywords: ['wow'], enabled: true, cooldown: 4, sound: 'airhorn', visual: { kind: 'card', position: 'center', emoji: '🤯', text: 'KRASS' } };
  const r = S.normalizeTrigger(v2);
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.trigger, v2);
  assert.deepEqual(Object.keys(r.trigger).sort(), ['cooldown', 'enabled', 'id', 'keywords', 'label', 'sound', 'visual']);
  // Scene fields on a non-scene kind are still dropped (v2 rule), including intensity.
  const sw = S.normalizeTrigger({ id: 'c', visual: { kind: 'card', scene: 'rain', intensity: 3, duration: 4 } });
  assert.deepEqual(sw.warnings, []);
  assert.equal(sw.trigger.visual.intensity, undefined);
  assert.equal(sw.trigger.visual.scene, undefined);
});

test('v3: glow / tilt / impact are stored only when true, intensity 1..3 on every kind', () => {
  const r = S.normalizeTrigger({ id: 'g', visual: { kind: 'card', glow: true, tilt: true, impact: true, intensity: 3 } });
  assert.deepEqual(r.warnings, []);
  assert.equal(r.trigger.visual.glow, true);
  assert.equal(r.trigger.visual.tilt, true);
  assert.equal(r.trigger.visual.impact, true);
  assert.equal(r.trigger.visual.intensity, 3);
  const off = S.normalizeTrigger({ id: 'g', visual: { kind: 'rain', glow: 'yes', tilt: 1, impact: false, intensity: 0 } });
  assert.equal(off.trigger.visual.glow, undefined);
  assert.equal(off.trigger.visual.tilt, undefined);
  assert.equal(off.trigger.visual.impact, undefined);
  assert.equal(off.trigger.visual.intensity, 1);
  assert.equal(S.normalizeTrigger({ id: 'g', visual: { kind: 'confetti', intensity: 9 } }).trigger.visual.intensity, 3);
  assert.equal(S.normalizeTrigger({ id: 'g', visual: { kind: 'sticker', intensity: '2.2' } }).trigger.visual.intensity, 2);
  const bad = S.normalizeTrigger({ id: 'g', visual: { kind: 'banner', intensity: 'max' } });
  assert.equal(bad.trigger.visual.intensity, undefined);
  assert.ok(bad.warnings.some((w) => /invalid visual.intensity/.test(w)));
  assert.equal(S.normalizeTrigger({ id: 'g', visual: { kind: 'card' } }).trigger.visual.intensity, undefined, 'default (1) is implicit');
});

test('v3: gain clamps to 0..1, default stays implicit, invalid warns', () => {
  assert.equal(S.normalizeTrigger({ id: 'v' }).trigger.gain, undefined);
  assert.equal(S.normalizeTrigger({ id: 'v', gain: 0.4 }).trigger.gain, 0.4);
  assert.equal(S.normalizeTrigger({ id: 'v', gain: '0.25' }).trigger.gain, 0.25);
  assert.equal(S.normalizeTrigger({ id: 'v', gain: 7 }).trigger.gain, 1);
  assert.equal(S.normalizeTrigger({ id: 'v', gain: -3 }).trigger.gain, 0);
  assert.equal(S.normalizeTrigger({ id: 'v', gain: 0 }).trigger.gain, 0);
  const bad = S.normalizeTrigger({ id: 'v', gain: 'loud' });
  assert.equal(bad.trigger.gain, undefined);
  assert.ok(bad.warnings.some((w) => /invalid gain/.test(w)));
  // Round trip through the fire envelope.
  const env = S.validateEnvelope({ type: 'fire', trigger: { id: 'v', gain: 0.5, visual: { kind: 'card', glow: true } } });
  assert.equal(env.msg.trigger.gain, 0.5);
  assert.equal(env.msg.trigger.visual.glow, true);
});

test('v3: text kind – style default neon, unknown style warns, colours, missing text falls back to card', () => {
  const r = S.normalizeTrigger({ id: 't', visual: { kind: 'text', text: 'Hype', style: 'glitch', color: '#fff', color2: 'rgb(255, 0, 0)', glow: true } });
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.trigger.visual, { kind: 'text', position: 'center', text: 'Hype', color: '#fff', color2: 'rgb(255, 0, 0)', glow: true, style: 'glitch' });
  const def = S.normalizeTrigger({ id: 't', visual: { kind: 'text', text: 'x' } });
  assert.equal(def.trigger.visual.style, 'neon');
  const unk = S.normalizeTrigger({ id: 't', visual: { kind: 'text', text: 'x', style: 'rainbow', color2: 'red' } });
  assert.equal(unk.trigger.visual.style, 'neon');
  assert.equal(unk.trigger.visual.color2, undefined);
  assert.ok(unk.warnings.some((w) => /unknown visual.style/.test(w)));
  assert.ok(unk.warnings.some((w) => /invalid visual.color2/.test(w)));
  const none = S.normalizeTrigger({ id: 't', visual: { kind: 'text', emoji: '🎉' } });
  assert.equal(none.trigger.visual.kind, 'card');
  assert.equal(none.trigger.visual.style, undefined);
  assert.ok(none.warnings.some((w) => /text visual without text/.test(w)));
  const long = S.normalizeTrigger({ id: 't', visual: { kind: 'text', text: 'y'.repeat(200) } });
  assert.equal(long.trigger.visual.text.length, S.LIMITS.text);
});

test('v3: lower-third – title/subtitle limits, title falls back to text, missing title becomes banner', () => {
  const r = S.normalizeTrigger({ id: 'lt', visual: { kind: 'lower-third', title: ' Max ', subtitle: 'Gast', color: '#f00', emoji: '🎤' } });
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.trigger.visual, { kind: 'lower-third', position: 'center', emoji: '🎤', color: '#f00', title: 'Max', subtitle: 'Gast' });
  const fromText = S.normalizeTrigger({ id: 'lt', visual: { kind: 'lower-third', text: 'Nur Text' } });
  assert.equal(fromText.trigger.visual.title, 'Nur Text');
  const long = S.normalizeTrigger({ id: 'lt', visual: { kind: 'lower-third', title: 't'.repeat(100), subtitle: 's'.repeat(100) } });
  assert.equal(long.trigger.visual.title.length, S.LIMITS.title);
  assert.equal(long.trigger.visual.subtitle.length, S.LIMITS.subtitle);
  const none = S.normalizeTrigger({ id: 'lt', visual: { kind: 'lower-third', emoji: '🎤' } });
  assert.equal(none.trigger.visual.kind, 'banner');
  assert.ok(none.warnings.some((w) => /lower-third without title/.test(w)));
});

test('v3: combo – steps normalized recursively, delay clamped, sounds validated, bad steps skipped', () => {
  const r = S.normalizeTrigger({
    id: 'cb',
    visual: {
      kind: 'combo',
      steps: [
        { delay: 0, visual: { kind: 'text', text: 'GO', style: 'bounce' }, sound: 'airhorn' },
        { delay: '450.6', visual: { kind: 'rain', count: 999 } },
        { delay: 99999, visual: { kind: 'image' }, sound: 'nope!' },
        'junk',
        { visual: { kind: 'card', intensity: 7, glow: true } },
      ],
    },
  });
  const v = r.trigger.visual;
  assert.equal(v.kind, 'combo');
  assert.equal(v.steps.length, 4);
  assert.deepEqual(v.steps[0], { delay: 0, visual: { kind: 'text', position: 'center', text: 'GO', style: 'bounce' }, sound: 'airhorn' });
  assert.equal(v.steps[1].delay, 451);
  assert.equal(v.steps[1].visual.count, S.LIMITS.rainCount);
  assert.equal(v.steps[2].delay, S.LIMITS.comboDelay);
  assert.equal(v.steps[2].visual.kind, 'card', 'image without src inside a step falls back to card');
  assert.equal(v.steps[2].sound, undefined);
  assert.equal(v.steps[3].delay, 0);
  assert.equal(v.steps[3].visual.intensity, 3);
  assert.equal(v.steps[3].visual.glow, true);
  assert.ok(r.warnings.some((w) => /invalid sound in combo step #2/.test(w)));
  assert.ok(r.warnings.some((w) => /combo step #3 is not an object/.test(w)));
  assert.ok(r.warnings.some((w) => /without src/.test(w)));
  // Round trip through the fire envelope keeps the steps.
  const env = S.validateEnvelope({ type: 'fire', trigger: { id: 'cb', visual: v } });
  assert.equal(env.msg.trigger.visual.steps.length, 4);
});

test('v3: combo – max 6 steps, no combo inside a combo, empty combo falls back to card', () => {
  const many = S.normalizeTrigger({ id: 'cb', visual: { kind: 'combo', steps: Array.from({ length: 9 }, (_, i) => ({ delay: i * 100, visual: { kind: 'card', text: String(i) } })) } });
  assert.equal(many.trigger.visual.steps.length, S.LIMITS.comboSteps);
  assert.ok(many.warnings.some((w) => /too many combo steps \(9\)/.test(w)));

  const nested = S.normalizeTrigger({
    id: 'cb',
    visual: { kind: 'combo', steps: [{ delay: 0, visual: { kind: 'combo', steps: [{ delay: 0, visual: { kind: 'card' } }] } }, { delay: 10, visual: { kind: 'banner', text: 'ok' } }] },
  });
  assert.equal(nested.trigger.visual.steps.length, 2);
  assert.equal(nested.trigger.visual.steps[0].visual.kind, 'card', 'nested combo becomes a card');
  assert.equal(nested.trigger.visual.steps[0].visual.steps, undefined);
  assert.equal(nested.trigger.visual.steps[1].visual.kind, 'banner');
  assert.ok(nested.warnings.some((w) => /combo inside a combo/.test(w)));

  for (const bad of [undefined, 'x', [], [null, 7]]) {
    const r = S.normalizeTrigger({ id: 'cb', visual: { kind: 'combo', steps: bad, emoji: '🎬' } });
    assert.equal(r.trigger.visual.kind, 'card', `steps ${JSON.stringify(bad)}`);
    assert.equal(r.trigger.visual.steps, undefined);
    assert.ok(r.warnings.some((w) => /combo without/.test(w)));
  }
});

test('v3: validateEnvelope accepts theme messages and rejects unknown themes', () => {
  const ok = S.validateEnvelope({ type: 'theme', theme: 'pastel', id: 'th-1' });
  assert.equal(ok.ok, true);
  assert.deepEqual(Object.keys(ok.msg).sort(), ['id', 'theme', 'ts', 'type']);
  assert.equal(ok.msg.theme, 'pastel');
  assert.equal(S.validateEnvelope({ type: 'theme', theme: 'dark' }).ok, false);
  assert.equal(S.validateEnvelope({ type: 'theme' }).ok, false);
  assert.equal(S.validateEnvelope({ type: 'nope' }).ok, false);
});

test('v3 review: combo with 100 steps / delay 1e9, negative gain, string intensity, unknown style', () => {
  const steps = Array.from({ length: 100 }, (_, i) => ({ delay: i === 0 ? 1e9 : -5, visual: { kind: 'card', text: String(i), intensity: '3' } }));
  const r = S.normalizeTrigger({ id: 'big', gain: -1, visual: { kind: 'combo', steps } });
  const v = r.trigger.visual;
  assert.equal(v.steps.length, S.LIMITS.comboSteps);
  assert.equal(v.steps[0].delay, S.LIMITS.comboDelay, 'delay 1e9 clamped to the limit');
  assert.equal(v.steps[1].delay, 0, 'negative delay -> 0 with a warning');
  assert.ok(r.warnings.some((w) => /invalid delay in combo step #1/.test(w)));
  assert.ok(r.warnings.some((w) => /too many combo steps \(100\)/.test(w)));
  assert.equal(v.steps[0].visual.intensity, 3, "intensity '3' (string) -> 3");
  assert.equal(r.trigger.gain, 0, 'negative gain clamps to 0');
  assert.equal(JSON.stringify(r.trigger).includes('"steps":[{'), true);

  const t = S.normalizeTrigger({ id: 'tx', visual: { kind: 'text', text: 'Hi', style: 'disco', intensity: '2.6' } });
  assert.equal(t.trigger.visual.style, 'neon');
  assert.equal(t.trigger.visual.intensity, 3, 'string intensity is rounded');
  assert.ok(t.warnings.some((w) => /unknown visual.style "disco"/.test(w)));
  // the whole thing survives the fire envelope (what the overlay receives)
  const env = S.validateEnvelope({ type: 'fire', trigger: { id: 'big', gain: -1, visual: { kind: 'combo', steps } } });
  assert.equal(env.ok, true);
  assert.equal(env.msg.trigger.visual.steps.length, S.LIMITS.comboSteps);
  assert.equal(env.msg.trigger.gain, 0);
});

test('v3 review: colours and image sources that would break out of a style/src attribute are rejected', () => {
  const r = S.normalizeTrigger({
    id: 'x',
    visual: { kind: 'card', bg: '#fff; background:url(javascript:1)', color: 'red', color2: 'rgba(0,0,0,.5)', src: 'javascript:alert(1)' },
  });
  assert.equal(r.trigger.visual.bg, undefined);
  assert.equal(r.trigger.visual.color, undefined, 'named colours are not in the allow-list');
  assert.equal(r.trigger.visual.color2, 'rgba(0,0,0,.5)');
  assert.equal(r.trigger.visual.src, undefined);
  assert.equal(r.warnings.filter((w) => /invalid visual\.(bg|color|src)/.test(w)).length, 3);
  const lt = S.normalizeTrigger({ id: 'lt', visual: { kind: 'lower-third', title: '<b>x</b>'.repeat(20), subtitle: 7 } });
  assert.equal(lt.trigger.visual.title.length, S.LIMITS.title, 'title cut to the limit');
  assert.equal(lt.trigger.visual.subtitle, undefined, 'non-string subtitle dropped');
});

// ---- 2.1: bundled sticker sets (memes/) + text style `sticker` ----

test('2.1 memes: image.src accepts memes/<set>/<file>.(webp|png)', () => {
  for (const good of ['memes/fluent/joy.webp', 'memes/fluent/heart-fire.webp', 'memes/my_set/sticker_1.png', `memes/${'a'.repeat(40)}/${'b'.repeat(80)}.webp`]) {
    const r = S.normalizeTrigger({ id: 'm', visual: { kind: 'image', src: good, emoji: '😂' } });
    assert.deepEqual(r.warnings, [], `${good}: ${r.warnings.join('; ')}`);
    assert.equal(r.trigger.visual.kind, 'image');
    assert.equal(r.trigger.visual.src, good);
    assert.equal(r.trigger.visual.emoji, '😂');
    assert.ok(S.isImageSrc(good));
    assert.ok(S.MEMES_IMAGE_RE.test(good));
    assert.ok(S.ASSET_IMAGE_RE.test(good), 'renderers that check ASSET_IMAGE_RE accept bundled stickers too');
  }
});

test('2.1 memes: traversal, other extensions, nesting and odd names are rejected', () => {
  const bad = [
    'memes/../data/token.txt',
    'memes/../../etc/passwd.webp',
    'memes/fluent/../x.webp',
    'memes/..\\x.webp',
    'memes/fluent/a..b.webp',
    'memes/fluent/x.gif',
    'memes/fluent/x.svg',
    'memes/fluent/x.json',
    'memes/fluent/sub/x.webp',
    'memes/x.webp',
    'memes//x.webp',
    'memes/fluent/.webp',
    'memes/Fluent/x.webp',
    'memes/fluent/X.WEBP',
    '/memes/fluent/x.webp',
    'memes/fluent/x.webp?x=1',
    'memes/fluent/x y.webp',
    `memes/${'a'.repeat(41)}/x.webp`,
    `memes/fluent/${'b'.repeat(81)}.webp`,
  ];
  for (const src of bad) {
    const r = S.normalizeTrigger({ id: 'm', visual: { kind: 'image', src, emoji: '😂' } });
    assert.equal(r.trigger.visual.src, undefined, `src ${src}`);
    assert.equal(r.trigger.visual.kind, 'card', `${src} falls back to card`);
    assert.ok(r.warnings.some((w) => /invalid visual.src/.test(w)), src);
    assert.equal(S.isImageSrc(src), false, `isImageSrc(${src})`);
  }
  // the existing rules are unchanged
  assert.ok(S.isImageSrc('assets/pic.PNG'));
  assert.ok(S.isImageSrc('https://example.com/a.gif?x=1'));
  assert.ok(!S.isImageSrc('assets/../x.png'));
  assert.ok(S.UPLOAD_IMAGE_RE.test('assets/pic.png') && !S.UPLOAD_IMAGE_RE.test('memes/fluent/joy.webp'));
  assert.equal(S.isImageSrc(null), false);
});

test('2.1 text style sticker: accepted with two colours, unknown styles still fall back to neon', () => {
  const r = S.normalizeTrigger({ id: 't', visual: { kind: 'text', text: 'OHA', style: 'sticker', color: '#ffd166', color2: '#ef476f' } });
  assert.deepEqual(r.warnings, []);
  assert.equal(r.trigger.visual.style, 'sticker');
  assert.equal(r.trigger.visual.color, '#ffd166');
  assert.equal(r.trigger.visual.color2, '#ef476f');
  const u = S.normalizeTrigger({ id: 't', visual: { kind: 'text', text: 'X', style: 'comic' } });
  assert.equal(u.trigger.visual.style, 'neon');
  assert.ok(u.warnings.some((w) => /unknown visual.style/.test(w)));
  const c = S.normalizeTrigger({ id: 't', visual: { kind: 'combo', steps: [{ visual: { kind: 'text', text: 'GG', style: 'sticker' } }] } });
  assert.deepEqual(c.warnings, []);
  assert.equal(c.trigger.visual.steps[0].visual.style, 'sticker');
});
