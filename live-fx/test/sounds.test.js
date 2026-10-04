// node --test test/sounds.test.js
// Node has no WebAudio, so a minimal fake AudioContext records what the synth schedules.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
require('../js/sounds.js');
const { LiveFXSounds } = globalThis;

const LOOPS = ['rain', 'wind', 'fireplace', 'birds', 'sea', 'thunder', 'nightCrickets', 'heartbeatSlow', 'churchBells', 'cityHum', 'spaceDrone', 'storm'];
const NEW_SOUNDS = ['laugh', 'boing', 'slideWhistle', 'dramatic', 'coin', 'levelUp', 'bell', 'ooh', 'heartbeat', 'siren', 'nope', 'gong'];
// LiveFX 2.0 (audio-engine): 12 more one-shots.
const SOUNDS_20 = ['bleat', 'duck', 'fanfare', 'kidlaugh', 'scream', 'glass', 'camera', 'door', 'tick', 'sparkle', 'punch', 'whoosh2'];
const TOTAL = 38;

function makeFakeContext() {
  const log = { started: 0, stops: [], nodes: 0, edges: [], gains: [], panners: [], compressors: [], convolvers: [] };
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
        this.events.push(['target', v, t, tc]);
        return this;
      },
      isParam: true,
    };
  }
  function node(extra) {
    log.nodes++;
    const n = Object.assign({
      connect(target) {
        log.edges.push([n, target]);
        return target;
      },
      disconnect() {},
    }, extra);
    return n;
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
    createGain: () => {
      const g = node({ gain: param(1) });
      log.gains.push(g);
      return g;
    },
    createStereoPanner: () => {
      const p = node({ pan: param(0) });
      log.panners.push(p);
      return p;
    },
    createDynamicsCompressor: () => {
      const c = node({ threshold: param(-24), knee: param(30), ratio: param(12), attack: param(0.003), release: param(0.25) });
      log.compressors.push(c);
      return c;
    },
    createConvolver: () => {
      const c = node({ buffer: null, normalize: true });
      log.convolvers.push(c);
      return c;
    },
    state: 'running',
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(350), Q: param(1), gain: param(0) }),
    createBufferSource: () => source({ buffer: null, loop: false, playbackRate: param(1) }),
    createBuffer(channels, length, sampleRate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, sampleRate, getChannelData: (i) => data[i] };
    },
  };
  return { ctx, log };
}

test(`names: ${TOTAL} built-in sounds including the 1.x and 2.0 additions`, () => {
  assert.strictEqual(LiveFXSounds.names.length, TOTAL);
  for (const n of NEW_SOUNDS.concat(SOUNDS_20)) assert.ok(LiveFXSounds.names.includes(n), `missing sound ${n}`);
  assert.strictEqual(new Set(LiveFXSounds.names).size, TOTAL, 'names must be unique');
});

test('GROUPS: impact/funny/magic partition names, ambient-loops mirrors loops', () => {
  const G = LiveFXSounds.GROUPS;
  assert.deepStrictEqual(Object.keys(G), ['impact', 'funny', 'magic', 'ambient-loops']);
  const all = G.impact.concat(G.funny, G.magic);
  assert.strictEqual(all.length, TOTAL);
  assert.strictEqual(new Set(all).size, TOTAL, 'a sound belongs to exactly one group');
  assert.deepStrictEqual(all, LiveFXSounds.names, 'names are exported in grouped order');
  assert.deepStrictEqual(G['ambient-loops'], LiveFXSounds.loops);
  assert.strictEqual(typeof LiveFXSounds.startLoop, 'function');
  assert.strictEqual(LiveFXSounds.startLoop, LiveFXSounds.loop);
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
  assert.strictEqual(LiveFXSounds.names.length, TOTAL, 'one-shot names unchanged');
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

// ---- level budget (LiveFX 2.0) ----
// Gains that feed an AudioParam (LFO depth, vibrato in Hz) are modulation, not audio level, and are skipped.

function audioPathGainPeaks(log) {
  const modulation = new Set(log.edges.filter(([, target]) => target && target.isParam).map(([src]) => src));
  const peaks = [];
  for (const g of log.gains) {
    if (modulation.has(g)) continue;
    // Envelopes are scheduled via events (the fake's initial `.value` 1 is never heard); static gains use `.value`.
    const values = g.gain.events.filter((e) => e[0] !== 'cancel').map((e) => e[1]);
    peaks.push(values.length ? Math.max(...values) : g.gain.value);
  }
  return peaks;
}

for (const name of LiveFXSounds.names) {
  const budget = SOUNDS_20.includes(name) ? 0.6 : 1; // 2.0 sounds: 0.6 per voice; legacy recipes never exceed unity
  test(`play('${name}') keeps every audio-path gain <= ${budget}`, () => {
    const { ctx, log } = makeFakeContext();
    LiveFXSounds.play(name, ctx, ctx.destination, 0.5);
    const peaks = audioPathGainPeaks(log);
    assert.ok(peaks.length >= 1);
    for (const p of peaks) assert.ok(p <= budget + 1e-9, `gain ${p} exceeds ${budget}`);
  });
}

// ---- mixer (LiveFX 2.0) ----

function freshMixer() {
  const { ctx, log } = makeFakeContext();
  const mixer = LiveFXSounds.mixer;
  mixer.stopLoop(0.01);
  mixer.reverb(false);
  mixer.autoDuck = true;
  mixer.init(ctx);
  mixer.setMaster(1);
  mixer.setBus('sfx', 1);
  mixer.setBus('ambient', 1);
  return { ctx, log, mixer };
}

test('mixer.init builds sfx + ambient busses -> master -> limiter -> destination', () => {
  const { ctx, log, mixer } = freshMixer();
  assert.strictEqual(mixer.ctx, ctx);
  assert.strictEqual(log.compressors.length, 1, 'exactly one limiter');
  const lim = log.compressors[0];
  assert.strictEqual(lim.threshold.value, -6);
  assert.strictEqual(lim.ratio.value, 12);
  assert.ok(lim.attack.value <= 0.005, 'fast attack');
  const has = (a, b) => log.edges.some(([s, t]) => s === a && t === b);
  assert.ok(has(mixer.master, lim), 'master feeds the limiter');
  assert.ok(has(lim, ctx.destination), 'limiter feeds the destination');
  assert.ok(!has(mixer.master, ctx.destination), 'master does not bypass the limiter');
  assert.ok(has(mixer.sfxBus, mixer.master), 'sfx bus -> master');
  assert.ok(has(mixer.ambientBus, mixer.duckGain) && has(mixer.duckGain, mixer.master), 'ambient bus -> duck -> master');
  assert.strictEqual(mixer.init(ctx), mixer, 'init is idempotent for the same ctx');
  assert.strictEqual(log.compressors.length, 1);
  assert.deepStrictEqual(mixer.stats, { voices: 0, ducked: false, master: 1, sfx: 1, ambient: 1, reverb: false, loop: null, limiter: true });
});

test('mixer.init without createDynamicsCompressor falls back to master -> destination', () => {
  const { ctx, log } = makeFakeContext();
  delete ctx.createDynamicsCompressor;
  const mixer = LiveFXSounds.mixer;
  mixer.init(ctx);
  assert.strictEqual(mixer.limiter, null);
  assert.ok(log.edges.some(([s, t]) => s === mixer.master && t === ctx.destination));
  assert.strictEqual(mixer.stats.limiter, false);
});

for (const name of LiveFXSounds.names) {
  test(`mixer.play('${name}') schedules sources on the sfx bus and returns {stop}`, () => {
    const { ctx, log, mixer } = freshMixer();
    const before = log.started;
    const v = mixer.play(name);
    assert.ok(v && typeof v.stop === 'function');
    assert.strictEqual(v.name, name);
    assert.ok(log.started > before, 'at least one source started');
    assert.ok(v.end > ctx.currentTime && v.end <= ctx.currentTime + 3.1, `end ${v.end} within 3 s`);
    assert.strictEqual(mixer.stats.voices, 1);
    assert.strictEqual(log.panners.length, 0, 'no panner without pan');
    v.stop();
    assert.ok(log.stops.some((t) => Math.abs(t - (ctx.currentTime + 0.1)) < 1e-9), 'stop() stops sources shortly after now');
    assert.strictEqual(mixer.stats.voices, 1, 'voice still counted until its short fade ends');
  });
}

test('mixer.play returns null for unknown names and without init in Node (no AudioContext)', () => {
  const { mixer } = freshMixer();
  assert.strictEqual(mixer.play('doesNotExist'), null);
  mixer.ctx = null;
  mixer.master = null;
  assert.strictEqual(typeof AudioContext, 'undefined');
  assert.strictEqual(mixer.play('pop'), null, 'auto-init is guarded when AudioContext is missing');
  freshMixer();
});

test('mixer.play auto-inits with a global AudioContext when nobody called init()', () => {
  const { ctx, log } = makeFakeContext();
  const mixer = LiveFXSounds.mixer;
  mixer.stopLoop(0.01);
  mixer.ctx = null;
  mixer.master = null;
  globalThis.AudioContext = function FakeAC() { return ctx; };
  try {
    const v = mixer.play('pop');
    assert.ok(v, 'played');
    assert.strictEqual(mixer.ctx, ctx);
    assert.strictEqual(log.compressors.length, 1);
  } finally {
    delete globalThis.AudioContext;
  }
  freshMixer();
});

test('mixer.play honours gain (clamped 0..1), when and creates a panner with the clamped pan', () => {
  const { ctx, log, mixer } = freshMixer();
  const v = mixer.play('pop', { gain: 2.5, pan: 3, when: 0.5 });
  assert.strictEqual(log.panners.length, 1);
  assert.strictEqual(log.panners[0].pan.value, 1, 'pan clamped to 1');
  assert.ok(log.edges.some(([s, t]) => s === log.panners[0] && t === mixer.sfxBus), 'panner -> sfx bus');
  const voiceGain = log.gains.find((g) => log.edges.some(([s, t]) => s === g && t === log.panners[0]));
  assert.ok(voiceGain, 'voice gain feeds the panner');
  assert.strictEqual(voiceGain.gain.value, 1, 'gain clamped to 1');
  assert.ok(v.end >= ctx.currentTime + 0.5, '`when` shifts the voice into the future');
  mixer.play('pop', { pan: -7 });
  assert.strictEqual(log.panners[1].pan.value, -1);
  mixer.play('pop', { gain: -3 });
  const zero = log.gains[log.gains.length - 1];
  assert.ok(log.gains.some((g) => g.gain.value === 0), 'negative gain clamps to 0');
  assert.ok(zero);
});

test('mixer.play pan fallback: no StereoPannerNode -> createPanner (equalpower) or plain connect', () => {
  const { ctx, log, mixer } = freshMixer();
  delete ctx.createStereoPanner;
  let positioned = null;
  ctx.createPanner = () => Object.assign(log.gains.length ? {} : {}, {
    panningModel: '',
    setPosition(x, y, z) { positioned = [x, y, z]; },
    connect(t) { log.edges.push([this, t]); return t; },
  });
  mixer.play('pop', { pan: 0.5 });
  assert.deepStrictEqual(positioned, [0.5, 0, 0.5]);
  delete ctx.createPanner;
  assert.ok(mixer.play('pop', { pan: 0.5 }), 'still plays without any panner');
});

test('mixer.play intensity: 3 creates more sources than 1 (generic and dedicated layers)', () => {
  for (const name of ['pop', 'boom', 'coin']) {
    const a = freshMixer();
    a.mixer.play(name, { intensity: 1 });
    const one = a.log.started;
    const b = freshMixer();
    b.mixer.play(name, { intensity: 2 });
    const two = b.log.started;
    const c = freshMixer();
    c.mixer.play(name, { intensity: 3 });
    const three = c.log.started;
    assert.ok(two > one, `${name}: intensity 2 adds a layer (${two} > ${one})`);
    assert.ok(three > two, `${name}: intensity 3 adds another layer (${three} > ${two})`);
    assert.strictEqual(c.mixer.stats.voices, 1, 'layers belong to one voice');
    for (const p of audioPathGainPeaks(c.log)) assert.ok(p <= 1, `layer gain ${p} within 0..1`);
  }
  // Generic layers are detuned; a dedicated layer (boom) is not.
  const g = freshMixer();
  const oscs = [];
  const orig = g.ctx.createOscillator;
  g.ctx.createOscillator = () => { const o = orig(); oscs.push(o); return o; };
  g.mixer.play('pop', { intensity: 3 });
  const cents = oscs.map((o) => o.detune.value);
  assert.ok(cents.includes(9) && cents.includes(-14) && cents.includes(0), `detune set per layer: ${cents}`);
});

test('mixer.setMaster / setBus clamp to 0..1 and ramp the gains', () => {
  const { mixer } = freshMixer();
  assert.strictEqual(mixer.setMaster(1.7), 1);
  assert.strictEqual(mixer.setMaster(-1), 0);
  assert.strictEqual(mixer.setMaster('0.4'), 0.4);
  assert.strictEqual(mixer.stats.master, 0.4);
  const last = mixer.master.gain.events[mixer.master.gain.events.length - 1];
  assert.strictEqual(last[0], 'target');
  assert.strictEqual(last[1], 0.4);
  assert.strictEqual(mixer.setBus('sfx', 5), 1);
  assert.strictEqual(mixer.setBus('ambient', 0.25), 0.25);
  assert.strictEqual(mixer.setBus('nope', 0.5), null);
  assert.strictEqual(mixer.stats.sfx, 1);
  assert.strictEqual(mixer.stats.ambient, 0.25);
  assert.strictEqual(mixer.ambientBus.gain.events.slice(-1)[0][1], 0.25);
  // Levels survive a re-init on a new context.
  const { ctx } = makeFakeContext();
  mixer.init(ctx);
  assert.strictEqual(mixer.master.gain.value, 0.4);
  assert.strictEqual(mixer.ambientBus.gain.value, 0.25);
});

test('mixer.startLoop/stopLoop run one loop on the ambient bus with the existing fades', () => {
  const { ctx, log, mixer } = freshMixer();
  const h = mixer.startLoop('rain', { gain: 0.7 });
  assert.ok(h && h.name === 'rain');
  assert.strictEqual(mixer.stats.loop, 'rain');
  assert.ok(log.edges.some(([s, t]) => s === h.gain && t === mixer.ambientBus), 'loop master gain -> ambient bus');
  assert.deepStrictEqual(h.gain.gain.events[0], ['set', 0, ctx.currentTime]);
  assert.deepStrictEqual(h.gain.gain.events[1], ['linear', 0.7, ctx.currentTime + 1.5]);
  assert.strictEqual(mixer.startLoop('rain'), h, 'same name is a no-op');
  const h2 = mixer.startLoop('wind');
  assert.notStrictEqual(h2, h);
  const fade = h.gain.gain.events.filter((e) => e[0] === 'exp').pop();
  assert.ok(fade && Math.abs(fade[2] - (ctx.currentTime + 1.5)) < 1e-9, 'old loop faded out over 1.5 s');
  assert.strictEqual(mixer.stats.loop, 'wind');
  assert.strictEqual(mixer.startLoop('doesNotExist'), null);
  assert.strictEqual(mixer.stopLoop(0.5), true);
  assert.strictEqual(mixer.stats.loop, null);
  assert.strictEqual(mixer.stopLoop(), false);
});

test('mixer.duck lowers the ambient (duck) gain now and restores it after the last sfx + release', () => {
  const { ctx, mixer } = freshMixer();
  const v = mixer.play('boom');
  assert.strictEqual(mixer.duck(300, -8), true);
  const ev = mixer.duckGain.gain.events;
  const down = ev.find((e) => e[0] === 'target' && e[1] < 1);
  assert.ok(down, 'ducked');
  assert.ok(Math.abs(down[1] - Math.pow(10, -8 / 20)) < 1e-9, '-8 dB');
  assert.strictEqual(down[2], ctx.currentTime, 'immediately');
  const up = ev.filter((e) => e[0] === 'target' && e[1] === 1).pop();
  assert.ok(up, 'restore scheduled');
  assert.ok(Math.abs(up[2] - v.end) < 1e-9, 'restore starts when the last sfx ends');
  assert.ok(Math.abs(up[3] - 0.3 / 4) < 1e-9, 'time constant = release / 4');
  assert.strictEqual(mixer.stats.ducked, true);
  // Without active sfx the release starts right away.
  const m2 = freshMixer();
  m2.mixer.duck(500, -12);
  const up2 = m2.mixer.duckGain.gain.events.filter((e) => e[0] === 'target' && e[1] === 1).pop();
  assert.ok(Math.abs(up2[2] - (m2.ctx.currentTime + 0.5)) < 1e-9);
  // Ducking is a no-op before init.
  const m3 = LiveFXSounds.mixer;
  const keep = m3.duckGain;
  m3.duckGain = null;
  assert.strictEqual(m3.duck(), false);
  m3.duckGain = keep;
});

test('mixer.play auto-ducks while a loop runs (autoDuck can be turned off)', () => {
  const { mixer } = freshMixer();
  mixer.play('pop');
  assert.strictEqual(mixer.duckGain.gain.events.length, 0, 'no loop -> no ducking');
  mixer.startLoop('sea');
  mixer.play('pop');
  assert.ok(mixer.duckGain.gain.events.some((e) => e[0] === 'target' && e[1] < 1), 'ducked while the loop runs');
  const n = mixer.duckGain.gain.events.length;
  mixer.autoDuck = false;
  mixer.play('pop');
  assert.strictEqual(mixer.duckGain.gain.events.length, n);
  mixer.autoDuck = true;
  mixer.stopLoop(0.01);
});

test('mixer.reverb builds a decaying stereo impulse into a convolver on the ambient path', () => {
  const { ctx, log, mixer } = freshMixer();
  assert.strictEqual(mixer.reverb(true, { seconds: 2, mix: 0.3 }), true);
  assert.strictEqual(log.convolvers.length, 1);
  const cv = log.convolvers[0];
  assert.strictEqual(cv.buffer.numberOfChannels, 2);
  assert.strictEqual(cv.buffer.length, ctx.sampleRate * 2);
  const d = cv.buffer.getChannelData(0);
  const head = Math.max(...Array.from(d.slice(0, 2000)).map(Math.abs));
  const tail = Math.max(...Array.from(d.slice(-2000)).map(Math.abs));
  assert.ok(head > 0.3 && tail < 0.01, `exponential decay (head ${head}, tail ${tail})`);
  const has = (a, b) => log.edges.some(([s, t]) => s === a && t === b);
  assert.ok(has(mixer.duckGain, cv) && has(cv, mixer.wetGain) && has(mixer.wetGain, mixer.master), 'duck -> convolver -> wet -> master');
  assert.strictEqual(mixer.wetGain.gain.events.slice(-1)[0][1], 0.3, 'wet = mix');
  assert.strictEqual(mixer.stats.reverb, true);
  mixer.reverb(true, { mix: 0.5 });
  assert.strictEqual(log.convolvers.length, 1, 'same length reuses the impulse');
  mixer.reverb(true, { seconds: 1 });
  assert.strictEqual(log.convolvers.length, 2, 'new length rebuilds the impulse');
  assert.strictEqual(mixer.reverb(false), false);
  assert.strictEqual(mixer.wetGain.gain.events.slice(-1)[0][1], 0);
  assert.strictEqual(mixer.stats.reverb, false);
  // Without ConvolverNode reverb is refused.
  const m = freshMixer();
  delete m.ctx.createConvolver;
  assert.strictEqual(m.mixer.reverb(true), false);
});

test('backwards compat: play(name, ctx, out, volume) and loop() keep working beside the mixer', () => {
  const { ctx, log } = makeFakeContext();
  assert.strictEqual(LiveFXSounds.play('bleat', ctx, ctx.destination, 0.5), true);
  assert.strictEqual(log.gains[0].gain.value, 0.5);
  assert.ok(log.edges.some(([s, t]) => s === log.gains[0] && t === ctx.destination));
  const h = LiveFXSounds.startLoop('storm', ctx, ctx.destination, 1);
  assert.strictEqual(h.name, 'storm');
  h.stop(0.2);
});

// ---- 2.0 review: option robustness ----

test('mixer.play: NaN / non-numeric options mean "default" (pan 0, gain 1, intensity 1), not the clamp floor', () => {
  const { ctx, log, mixer } = freshMixer();
  const gains = log.gains.length;
  const v = mixer.play('pop', { gain: NaN, pan: NaN, intensity: 'x', when: undefined });
  assert.ok(v, 'played');
  assert.strictEqual(log.gains[gains].gain.value, 1, 'voice gain defaults to 1 for NaN');
  assert.strictEqual(log.panners.length, 0, 'pan NaN -> centre, no panner');
  assert.strictEqual(mixer.play('pop', { pan: '0.5' }) && log.panners.length, 1, 'numeric strings still pan');
  assert.strictEqual(log.panners[0].pan.value, 0.5);
  // gain 0 is a legitimate (silent) value and still plays.
  const g0 = log.gains.length;
  assert.ok(mixer.play('pop', { gain: 0 }));
  assert.strictEqual(log.gains[g0].gain.value, 0);
  // intensity rounding: 2.5 -> 3, -1 -> 1, '3' -> 3
  const sources = () => log.started;
  const s1 = sources();
  mixer.play('pop', { intensity: -1 });
  const one = sources() - s1;
  const s2 = sources();
  mixer.play('pop', { intensity: '3' });
  const three = sources() - s2;
  const s3 = sources();
  mixer.play('pop', { intensity: 2.5 });
  const twoHalf = sources() - s3;
  assert.ok(three > one, `intensity '3' layers more voices than -1 (${three} vs ${one})`);
  assert.strictEqual(twoHalf, three, '2.5 rounds up to 3');
  void ctx;
});

test('mixer.setMaster / setBus / duck ignore NaN instead of muting', () => {
  const { mixer } = freshMixer();
  mixer.setMaster(0.6);
  assert.strictEqual(mixer.setMaster(NaN), 0.6, 'NaN keeps the level and returns it');
  assert.strictEqual(mixer.setMaster(undefined), 0.6);
  assert.strictEqual(mixer.setMaster(''), 0.6);
  assert.strictEqual(mixer.stats.master, 0.6);
  assert.strictEqual(mixer.setBus('sfx', NaN), 1);
  assert.strictEqual(mixer.stats.sfx, 1);
  assert.strictEqual(mixer.duck(NaN, NaN), true);
  const ev = mixer.duckGain.gain.events;
  const down = ev.find((e) => e[0] === 'target' && e[1] < 1);
  assert.ok(Math.abs(down[1] - Math.pow(10, -8 / 20)) < 1e-9, 'duck NaN db -> default -8 dB');
  const up = ev.filter((e) => e[0] === 'target' && e[1] === 1).pop();
  assert.ok(Math.abs(up[3] - 0.3 / 4) < 1e-9, 'duck NaN ms -> default 300 ms');
});

test('mixer.duck / stopLoop before init and without a loop are safe no-ops', () => {
  const mixer = LiveFXSounds.mixer;
  mixer.stopLoop(0.01);
  const keep = { ctx: mixer.ctx, master: mixer.master, duckGain: mixer.duckGain };
  mixer.ctx = null;
  mixer.master = null;
  mixer.duckGain = null;
  assert.strictEqual(mixer.duck(250), false);
  assert.strictEqual(mixer.stopLoop(), false);
  assert.strictEqual(mixer.play('pop'), null, 'no AudioContext in Node -> null, no throw');
  assert.deepStrictEqual(mixer.stats.loop, null);
  Object.assign(mixer, keep);
  freshMixer();
});

test('mixer.init on a new context disconnects the old graph (no second path to the old destination)', () => {
  const a = freshMixer();
  const disconnected = [];
  for (const n of [a.mixer.master, a.mixer.limiter, a.mixer.sfxBus, a.mixer.ambientBus, a.mixer.duckGain]) {
    n.disconnect = () => disconnected.push(n);
  }
  const oldMaster = a.mixer.master;
  const { ctx } = makeFakeContext();
  a.mixer.init(ctx);
  assert.ok(disconnected.includes(oldMaster), 'old master disconnected');
  assert.strictEqual(disconnected.length, 5);
  assert.strictEqual(a.mixer.ctx, ctx);
  freshMixer();
});

test('mixer.startLoop with the same name twice keeps the running loop (no restart, no cross-fade)', () => {
  const { log, mixer } = freshMixer();
  const h = mixer.startLoop('rain');
  const started = log.started;
  const h2 = mixer.startLoop('rain', { gain: 0.2 });
  assert.strictEqual(h2, h);
  assert.strictEqual(log.started, started, 'nothing new scheduled');
  assert.strictEqual(h.gain.gain.events.filter((e) => e[0] === 'exp').length, 0, 'no fade-out on the running loop');
  mixer.stopLoop(0.01);
});

test('noise buffers are cached per AudioContext: replaying every sound allocates no new noise buffer', () => {
  const { ctx } = makeFakeContext();
  let buffers = 0;
  const create = ctx.createBuffer;
  ctx.createBuffer = (...a) => {
    buffers++;
    return create(...a);
  };
  for (const n of LiveFXSounds.names) LiveFXSounds.play(n, ctx, ctx.destination);
  const first = buffers;
  assert.ok(first >= 1 && first <= 2, `one shared 2-s noise buffer for the one-shots (got ${first})`);
  for (const n of LiveFXSounds.names) LiveFXSounds.play(n, ctx, ctx.destination);
  assert.strictEqual(buffers, first, 'second pass reuses the cached buffer');
  // A fresh context gets its own buffer (the sample rate may differ).
  const other = makeFakeContext().ctx;
  let otherBuffers = 0;
  const create2 = other.createBuffer;
  other.createBuffer = (...a) => {
    otherBuffers++;
    return create2(...a);
  };
  LiveFXSounds.play('ooh', other, other.destination);
  assert.strictEqual(otherBuffers, 1);
});

test('mixer voices share the noise cache of the real context (voiceContext.rawContext)', () => {
  const { ctx } = makeFakeContext();
  let buffers = 0;
  const create = ctx.createBuffer;
  ctx.createBuffer = (...a) => {
    buffers++;
    return create(...a);
  };
  const mixer = LiveFXSounds.mixer;
  mixer.init(ctx);
  const base = buffers; // reverb impulse response etc.
  mixer.play('ooh', { gain: 1 });
  const once = buffers - base;
  mixer.play('ooh', { gain: 1 });
  mixer.play('scream', { gain: 1 });
  assert.ok(once <= 1, `first noise voice allocates at most one buffer (${once})`);
  assert.strictEqual(buffers - base, once, 'later voices reuse it');
});
