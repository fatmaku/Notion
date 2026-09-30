// node --test test/sounds.test.js
// Node has no WebAudio, so a minimal fake AudioContext records what the synth schedules.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
require('../js/sounds.js');
const { LiveFXSounds } = globalThis;

const LOOPS = ['rain', 'wind', 'fireplace', 'birds', 'sea', 'thunder', 'nightCrickets', 'heartbeatSlow', 'churchBells', 'cityHum', 'spaceDrone', 'storm'];
const NEW_SOUNDS = ['laugh', 'boing', 'slideWhistle', 'dramatic', 'coin', 'levelUp', 'bell', 'ooh', 'heartbeat', 'siren', 'nope', 'gong'];

function makeFakeContext() {
  const log = { started: 0, stops: [], nodes: 0 };
  const currentTime = 12.5;
  function param(initial) {
    return {
      value: initial,
      events: [], // [method, value, time] – recorded so tests can inspect automation
      setValueAtTime(v, t) {
        assert.ok(Number.isFinite(v) && Number.isFinite(t), 'setValueAtTime args must be finite');
        this.events.push(['set', v, t]);
        return this;
      },
      linearRampToValueAtTime(v, t) {
        assert.ok(Number.isFinite(v) && Number.isFinite(t), 'linearRamp args must be finite');
        this.events.push(['linear', v, t]);
        return this;
      },
      exponentialRampToValueAtTime(v, t) {
        assert.ok(Number.isFinite(t), 'exponentialRamp time must be finite');
        assert.ok(v > 0, `exponentialRampToValueAtTime called with non-positive value ${v}`);
        this.events.push(['exp', v, t]);
        return this;
      },
      cancelScheduledValues(t) {
        assert.ok(Number.isFinite(t));
        this.events.push(['cancel', null, t]);
        return this;
      },
      setTargetAtTime(v, t, tc) {
        assert.ok(Number.isFinite(v) && Number.isFinite(t) && tc > 0);
        return this;
      },
    };
  }
  function node(extra) {
    log.nodes++;
    return Object.assign({ connect: (target) => target, disconnect() {} }, extra);
  }
  function source(extra) {
    return node(Object.assign({
      start(t) {
        assert.ok(t === undefined || (Number.isFinite(t) && t >= currentTime), `start time ${t} must be >= currentTime`);
        log.started++;
      },
      stop(t) {
        assert.ok(Number.isFinite(t), 'stop time must be finite');
        log.stops.push(t);
      },
    }, extra));
  }
  const ctx = {
    currentTime,
    sampleRate: 44100,
    destination: node({}),
    createOscillator: () => source({ type: 'sine', frequency: param(440), detune: param(0) }),
    createGain: () => node({ gain: param(1) }),
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(350), Q: param(1), gain: param(0) }),
    createBufferSource: () => source({ buffer: null, loop: false, playbackRate: param(1) }),
    createBuffer(channels, length, sampleRate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, sampleRate, getChannelData: (i) => data[i] };
    },
  };
  return { ctx, log };
}

test('names: 26 built-in sounds including the 12 new ones', () => {
  assert.strictEqual(LiveFXSounds.names.length, 26);
  for (const n of NEW_SOUNDS) assert.ok(LiveFXSounds.names.includes(n), `missing sound ${n}`);
  assert.strictEqual(new Set(LiveFXSounds.names).size, 26, 'names must be unique');
});

test('play() returns false for unknown names', () => {
  const { ctx, log } = makeFakeContext();
  assert.strictEqual(LiveFXSounds.play('doesNotExist', ctx, ctx.destination), false);
  assert.strictEqual(log.started, 0);
});

for (const name of LiveFXSounds.names) {
  test(`play('${name}') schedules nodes and stops within 3 s`, () => {
    const { ctx, log } = makeFakeContext();
    assert.strictEqual(LiveFXSounds.play(name, ctx, ctx.destination), true);
    assert.ok(log.started >= 1, 'at least one source must start()');
    assert.ok(log.stops.length >= 1, 'sources must schedule a stop()');
    for (const t of log.stops) {
      assert.ok(t <= ctx.currentTime + 3, `stop at ${t} exceeds currentTime + 3 s`);
      assert.ok(t > ctx.currentTime, 'stop must be in the future');
    }
  });
}

test('play() honours the volume argument via the master gain', () => {
  const { ctx } = makeFakeContext();
  let master = null;
  const orig = ctx.createGain;
  ctx.createGain = () => {
    const g = orig();
    if (!master) master = g;
    return g;
  };
  LiveFXSounds.play('pop', ctx, ctx.destination, 0.4);
  assert.strictEqual(master.gain.value, 0.4);
});

// ---- ambient loops (story mode) ----

test('loops: 12 ambient loop names in the documented order', () => {
  assert.deepStrictEqual(LiveFXSounds.loops, LOOPS);
  assert.strictEqual(LiveFXSounds.names.length, 26, 'one-shot names unchanged');
});

test('loop() returns null for unknown names', () => {
  const { ctx, log } = makeFakeContext();
  assert.strictEqual(LiveFXSounds.loop('doesNotExist', ctx, ctx.destination), null);
  assert.strictEqual(log.started, 0);
});

for (const name of LOOPS) {
  test(`loop('${name}') fades in from 0, stop(0.5) fades out and stops its sources`, () => {
    const { ctx, log } = makeFakeContext();
    let master = null;
    const orig = ctx.createGain;
    ctx.createGain = () => {
      const g = orig();
      if (!master) master = g; // the first gain a loop creates is its master (fade) gain
      return g;
    };
    const h = LiveFXSounds.loop(name, ctx, ctx.destination, 0.8);
    assert.ok(h && typeof h.stop === 'function', 'loop() must return { stop }');
    assert.strictEqual(h.name, name);
    assert.strictEqual(h.gain, master);
    assert.ok(log.started >= 1, 'at least one looping source must start()');
    // Fade-in: master gain set to 0 now and ramped to `volume` 1.5 s later.
    assert.deepStrictEqual(master.gain.events[0], ['set', 0, ctx.currentTime]);
    assert.deepStrictEqual(master.gain.events[1], ['linear', 0.8, ctx.currentTime + 1.5]);
    // Every scheduled stop so far belongs to one-shot events and is in the future.
    for (const t of log.stops) assert.ok(t > ctx.currentTime, 'event stops must be in the future');
    const before = log.stops.length;
    h.stop(0.5);
    const fade = master.gain.events.filter((e) => e[0] === 'exp');
    assert.ok(fade.length >= 1, 'stop() must schedule a fade-out ramp on the master gain');
    assert.strictEqual(fade[fade.length - 1][1], 0.0001);
    assert.ok(Math.abs(fade[fade.length - 1][2] - (ctx.currentTime + 0.5)) < 1e-9, 'fade-out ends after fadeSec');
    assert.ok(log.stops.length > before, 'stop() must stop the long-running sources');
    for (const t of log.stops.slice(before)) assert.ok(Math.abs(t - (ctx.currentTime + 0.55)) < 1e-9, `source stop at ${t} must follow the fade`);
    // Calling stop twice is harmless.
    h.stop();
  });
}

test('loop() honours the volume argument in the fade-in target', () => {
  const { ctx } = makeFakeContext();
  const h = LiveFXSounds.loop('rain', ctx, ctx.destination);
  assert.deepStrictEqual(h.gain.gain.events[1], ['linear', 1, ctx.currentTime + 1.5]);
});
