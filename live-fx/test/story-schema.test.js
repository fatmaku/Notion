// Unit tests for the story-mode schema additions (LiveFX 1.3): scene / sticker kinds, SCENES, "loop:" sounds.
// Run: node --test "test/*.test.js"
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/schema.js');

const S = globalThis.LiveFXSchema;

test('KINDS contains scene and sticker, old kinds untouched', () => {
  assert.ok(S.KINDS.includes('scene'));
  assert.ok(S.KINDS.includes('sticker'));
  for (const k of ['card', 'image', 'banner', 'rain', 'confetti']) assert.ok(S.KINDS.includes(k), k);
});

test('SCENES list is fixed and ends with clear', () => {
  assert.deepEqual(S.SCENES, ['rain', 'night', 'forest', 'sea', 'fire', 'castle', 'snow', 'desert', 'city', 'space', 'sunrise', 'storm', 'clear']);
  assert.equal(S.LOOPS.length, 12);
  assert.ok(S.LOOPS.includes('rain') && S.LOOPS.includes('spaceDrone'));
});

test('normalizeTrigger keeps a scene visual with its fields', () => {
  const r = S.normalizeTrigger({
    id: 'regen',
    keywords: ['es regnete'],
    sound: 'loop:rain',
    visual: { kind: 'scene', scene: 'rain', text: 'Es regnete…', emoji: '💧', intensity: 2, duration: 12, caption: true },
  });
  assert.deepEqual(r.warnings, []);
  assert.equal(r.trigger.sound, 'loop:rain');
  assert.deepEqual(r.trigger.visual, { kind: 'scene', position: 'center', emoji: '💧', text: 'Es regnete…', scene: 'rain', intensity: 2, duration: 12, caption: true });
});

test('scene: intensity clamps to 1..3, duration >= 0 and capped, invalid values warn', () => {
  const v = (visual) => S.normalizeTrigger({ id: 's', visual: { kind: 'scene', scene: 'night', ...visual } });
  assert.equal(v({ intensity: 0 }).trigger.visual.intensity, 1);
  assert.equal(v({ intensity: 9 }).trigger.visual.intensity, 3);
  assert.equal(v({ intensity: '2.4' }).trigger.visual.intensity, 2);
  assert.equal(v({}).trigger.visual.intensity, undefined);
  assert.ok(v({ intensity: 'x' }).warnings.some((w) => /invalid visual.intensity/.test(w)));
  assert.equal(v({ duration: 0 }).trigger.visual.duration, 0);
  assert.equal(v({ duration: 5.5 }).trigger.visual.duration, 5.5);
  assert.equal(v({ duration: 99999 }).trigger.visual.duration, S.LIMITS.sceneDuration);
  const neg = v({ duration: -3 });
  assert.equal(neg.trigger.visual.duration, undefined);
  assert.ok(neg.warnings.some((w) => /invalid visual.duration/.test(w)));
  assert.equal(v({ caption: false }).trigger.visual.caption, false);
  assert.equal(v({ caption: 'yes' }).trigger.visual.caption, undefined);
});

test('scene: every SCENES id is accepted, including clear', () => {
  for (const id of S.SCENES) {
    const r = S.normalizeTrigger({ id: 'x', visual: { kind: 'scene', scene: id } });
    assert.equal(r.trigger.visual.kind, 'scene', id);
    assert.equal(r.trigger.visual.scene, id);
    assert.deepEqual(r.warnings, []);
  }
});

test('scene: invalid or missing scene id falls back to card with a warning', () => {
  for (const bad of ['volcano', '', undefined, 42, '<script>']) {
    const r = S.normalizeTrigger({ id: 'bad', visual: { kind: 'scene', scene: bad, text: 'hi' } });
    assert.equal(r.trigger.visual.kind, 'card', String(bad));
    assert.equal(r.trigger.visual.scene, undefined);
    assert.equal(r.trigger.visual.text, 'hi');
    assert.ok(r.warnings.some((w) => /unknown visual.scene/.test(w)), `warning for ${String(bad)}`);
  }
});

test('scene-only fields are not attached to other kinds', () => {
  const r = S.normalizeTrigger({ id: 'c', visual: { kind: 'card', scene: 'rain', intensity: 3, duration: 4 } });
  assert.deepEqual(r.warnings, []);
  assert.equal(r.trigger.visual.scene, undefined);
  assert.equal(r.trigger.visual.intensity, undefined);
  assert.equal(r.trigger.visual.duration, undefined);
});

test('sticker: kind kept, emoji allows up to 32 chars (four emojis), text kept', () => {
  const r = S.normalizeTrigger({ id: 'ritter', visual: { kind: 'sticker', emoji: '🛡️⚔️🐎👑', text: 'Der Ritter', position: 'top' } });
  assert.deepEqual(r.warnings, []);
  assert.equal(r.trigger.visual.kind, 'sticker');
  assert.equal(r.trigger.visual.emoji, '🛡️⚔️🐎👑');
  assert.equal(r.trigger.visual.position, 'top');
  const long = S.normalizeTrigger({ id: 'l', visual: { kind: 'sticker', emoji: 'x'.repeat(50) } });
  assert.equal(long.trigger.visual.emoji.length, S.LIMITS.stickerEmoji);
  const card = S.normalizeTrigger({ id: 'l', visual: { kind: 'card', emoji: 'x'.repeat(50) } });
  assert.equal(card.trigger.visual.emoji.length, S.LIMITS.emoji);
});

test('parseSound: loop form', () => {
  assert.deepEqual(S.parseSound('loop:rain'), { kind: 'loop', name: 'rain' });
  assert.deepEqual(S.parseSound('loop:nightCrickets'), { kind: 'loop', name: 'nightCrickets' });
  assert.equal(S.parseSound('loop:'), null);
  assert.equal(S.parseSound('loop:1rain'), null);
  assert.equal(S.parseSound('loop:../x'), null);
  assert.equal(S.parseSound('loop:no spaces'), null);
  assert.equal(S.parseSound('loop:' + 'a'.repeat(40)), null);
  // Old forms are unchanged.
  assert.deepEqual(S.parseSound('airhorn'), { kind: 'builtin', name: 'airhorn' });
  assert.deepEqual(S.parseSound('file:assets/boom.mp3'), { kind: 'file', url: 'assets/boom.mp3' });
});

test('normalizeTrigger: loop sounds kept, invalid loop names dropped with a warning', () => {
  assert.equal(S.normalizeTrigger({ id: 's', sound: 'loop:wind' }).trigger.sound, 'loop:wind');
  const bad = S.normalizeTrigger({ id: 's', sound: 'loop:9x' });
  assert.equal(bad.trigger.sound, null);
  assert.ok(bad.warnings.some((w) => /invalid sound/.test(w)));
});

test('validateEnvelope accepts a scene fire and keeps scene fields', () => {
  const r = S.validateEnvelope({ type: 'fire', trigger: { id: 'n', sound: 'loop:nightCrickets', visual: { kind: 'scene', scene: 'night', duration: 3 } } });
  assert.equal(r.ok, true);
  assert.equal(r.msg.trigger.visual.scene, 'night');
  assert.equal(r.msg.trigger.visual.duration, 3);
  assert.equal(r.msg.trigger.sound, 'loop:nightCrickets');
});
