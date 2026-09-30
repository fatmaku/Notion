// Unit tests for js/schema.js (trigger schema v2). Run: node --test "test/*.test.js"
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
  assert.equal(S.VERSION, 2);
  assert.deepEqual(S.KINDS, ['card', 'image', 'banner', 'rain', 'confetti']);
  assert.deepEqual(S.POSITIONS, ['center', 'top', 'safe']);
  assert.equal(S.LIMITS.triggers, 200);
  assert.equal(S.LIMITS.assetBytes, 8 * 1024 * 1024);
  assert.ok(S.ID_RE.test('a-b_c'));
  assert.ok(!S.ID_RE.test('-abc'));
  assert.ok(S.COLOR_RE.test('#12345678'));
  assert.ok(!S.COLOR_RE.test('red'));
});
