// node --test test/asr.test.js
// Unit tests for js/asr.js (webspeech + external backends) and js/meter.js.
// Node has no Web Speech API: a fake `globalThis.SpeechRecognition` records every instance and lets the
// test drive it with `emit(name, ev)`. Timers and Date are mocked (node:test mock.timers); `performance.now`
// is redirected to the mocked Date so `stats.*At` and the speech-gap logic advance with `tick()`.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

require('../js/asr.js');
require('../js/meter.js');
const { LiveFXASR, LiveFXMeter } = globalThis;

// ---------------------------------------------------------------- fakes

class FakeSR {
  constructor() {
    FakeSR.instances.push(this);
    this.lang = null;
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.calls = []; // 'start' | 'stop' | 'abort'
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }
  start() {
    this.calls.push('start');
    if (FakeSR.throwOnStart) throw new Error('InvalidStateError');
  }
  stop() {
    this.calls.push('stop');
  }
  abort() {
    this.calls.push('abort');
  }
  count(name) {
    return this.calls.filter((c) => c === name).length;
  }
  /** Fires the handler the ASR attached (`onstart`, `onresult`, `onerror`, `onend`). */
  emit(name, ev) {
    const h = this['on' + name];
    if (typeof h === 'function') h(ev);
  }
}
FakeSR.instances = [];
FakeSR.throwOnStart = false;

/** Builds a SpeechRecognitionEvent: `specs` = [{ final, alts: ['primary', 'alt', ...], confidence }]. */
function resultEvent(specs, resultIndex = 0) {
  const results = specs.map((s) => {
    const alts = (s.alts || [s.text]).map((transcript, i) => ({ transcript, confidence: i === 0 && typeof s.confidence === 'number' ? s.confidence : 0.5 }));
    const r = { isFinal: !!s.final, length: alts.length };
    alts.forEach((a, i) => (r[i] = a));
    return r;
  });
  return { resultIndex, results };
}

function last() {
  return FakeSR.instances[FakeSR.instances.length - 1];
}

/** advance() runs one level of chained timers per call; step so re-armed timers fire in order. */
function advance(ms, step = 100) {
  let left = ms;
  while (left > 0) {
    const d = Math.min(step, left);
    mock.timers.tick(d);
    left -= d;
  }
  if (ms === 0) mock.timers.tick(0);
}

function setup(t, opts = {}) {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 });
  const origNow = performance.now;
  performance.now = () => Date.now();
  FakeSR.instances = [];
  FakeSR.throwOnStart = false;
  globalThis.SpeechRecognition = FakeSR;
  const calls = [];
  const states = [];
  const errors = [];
  const events = [];
  const asr = LiveFXASR.create('webspeech', {
    lang: 'de-DE',
    onText: (text, isFinal, meta) => calls.push({ text, isFinal, meta }),
    onState: (s) => states.push(s),
    onError: (e) => errors.push(e),
    onEvent: (e) => events.push(e),
    ...opts,
  });
  t.after(() => {
    asr.stop();
    delete globalThis.SpeechRecognition;
    performance.now = origNow;
    mock.timers.reset();
  });
  return { asr, calls, states, errors, events };
}

/** start() + onstart of the newest recognizer -> state 'listening'. */
function startListening(asr) {
  asr.start();
  last().emit('start');
  return last();
}

// ---------------------------------------------------------------- webspeech: basics

test('webspeech: recognizer setup and interim/final mapping', async (t) => {
  await t.test('defaults reproduce the old behaviour (maxAlternatives 1, no alternatives field)', (t) => {
    const { asr, calls, states } = setup(t);
    const rec = startListening(asr);
    assert.equal(rec.lang, 'de-DE');
    assert.equal(rec.continuous, true);
    assert.equal(rec.interimResults, true);
    assert.equal(rec.maxAlternatives, 1);
    assert.deepEqual(states, ['starting', 'listening']);
    rec.emit('result', resultEvent([{ final: true, alts: ['krass', 'grass'] }]));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].text, 'krass');
    assert.equal(calls[0].isFinal, true);
    assert.equal(calls[0].meta.source, 'Mikro');
    assert.equal(calls[0].meta.lang, 'de-DE');
    assert.equal(typeof calls[0].meta.at, 'number');
    assert.ok(!('alternatives' in calls[0].meta), 'no alternatives field when the option is off');
    assert.equal(asr.stats.results, 1);
    assert.equal(asr.stats.finals, 1);
    assert.equal(asr.stats.lastResultAt, calls[0].meta.at);
    assert.equal(asr.stats.lastFinalAt, calls[0].meta.at);
  });

  await t.test('interim chunks are joined with a space (regression: "hallowelt")', (t) => {
    const { asr, calls } = setup(t);
    const rec = startListening(asr);
    rec.emit('result', resultEvent([{ final: false, text: 'hallo' }, { final: false, text: 'welt' }]));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].text, 'hallo welt');
    assert.equal(calls[0].isFinal, false);
    assert.equal(asr.stats.results, 1);
    assert.equal(asr.stats.finals, 0);
    assert.equal(asr.stats.lastFinalAt, null);
  });

  await t.test('resultIndex is honoured and empty text is dropped', (t) => {
    const { asr, calls } = setup(t);
    const rec = startListening(asr);
    rec.emit('result', resultEvent([{ final: true, text: 'alt' }, { final: false, text: 'neu' }], 1));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].text, 'neu');
    rec.emit('result', resultEvent([{ final: false, text: '   ' }]));
    assert.equal(calls.length, 1);
  });

  await t.test('confidence of a final result lands in meta', (t) => {
    const { asr, calls } = setup(t);
    const rec = startListening(asr);
    rec.emit('result', resultEvent([{ final: true, text: 'krass', confidence: 0.87 }]));
    assert.equal(calls[0].meta.confidence, 0.87);
    rec.emit('result', resultEvent([{ final: false, text: 'kr', confidence: 0.3 }]));
    assert.ok(!('confidence' in calls[1].meta));
  });

  await t.test('onEvent: result / final', (t) => {
    const { asr, events } = setup(t);
    const rec = startListening(asr);
    rec.emit('result', resultEvent([{ final: false, text: 'kr' }]));
    rec.emit('result', resultEvent([{ final: true, text: 'krass' }]));
    assert.deepEqual(
      events.map((e) => [e.type, e.text]),
      [
        ['result', 'kr'],
        ['final', 'krass'],
      ],
    );
    assert.ok(events.every((e) => typeof e.at === 'number'));
  });
});

// ---------------------------------------------------------------- webspeech: alternatives

test('webspeech: alternatives', async (t) => {
  await t.test('on -> maxAlternatives 3, meta.alternatives deduped without the primary', (t) => {
    const { asr, calls } = setup(t, { alternatives: true });
    const rec = startListening(asr);
    assert.equal(rec.maxAlternatives, 3);
    rec.emit('result', resultEvent([{ final: true, alts: ['das ist krass', 'das ist grass', 'das ist krass', 'das ist crass'] }]));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].text, 'das ist krass');
    assert.deepEqual(calls[0].meta.alternatives, ['das ist grass', 'das ist crass']);
  });

  await t.test('interim results carry no alternatives; final without n-best -> empty array', (t) => {
    const { asr, calls } = setup(t, { alternatives: true });
    const rec = startListening(asr);
    rec.emit('result', resultEvent([{ final: false, alts: ['kr', 'gr'] }]));
    assert.ok(!('alternatives' in calls[0].meta));
    rec.emit('result', resultEvent([{ final: true, alts: ['krass'] }]));
    assert.deepEqual(calls[1].meta.alternatives, []);
  });

  await t.test('two final results in one event -> alternative substituted per result', (t) => {
    const { asr, calls } = setup(t, { alternatives: true });
    const rec = startListening(asr);
    rec.emit('result', resultEvent([{ final: true, alts: ['oh nein', 'oh mein'] }, { final: true, alts: ['krass', 'grass'] }]));
    assert.equal(calls[0].text, 'oh nein krass');
    assert.deepEqual(calls[0].meta.alternatives, ['oh mein krass', 'oh nein grass']);
  });

  await t.test('setOptions({alternatives:true}) respawns the recognizer with maxAlternatives 3', (t) => {
    const { asr, calls } = setup(t);
    const rec1 = startListening(asr);
    assert.equal(rec1.maxAlternatives, 1);
    asr.setOptions({ alternatives: true });
    assert.equal(FakeSR.instances.length, 2);
    const rec2 = last();
    assert.notEqual(rec1, rec2);
    assert.equal(rec1.count('abort'), 1);
    assert.equal(rec2.maxAlternatives, 3);
    assert.equal(rec2.count('start'), 1);
    assert.deepEqual(asr.options, { alternatives: true, restartEveryMs: 0, stallMs: 20000 });
    // the old generation is dead: its events are ignored
    rec1.emit('result', resultEvent([{ final: true, text: 'alt' }]));
    rec1.emit('end');
    assert.equal(calls.length, 0);
    assert.equal(FakeSR.instances.length, 2);
    rec2.emit('start');
    assert.equal(asr.state, 'listening');
    // same value again -> no respawn
    asr.setOptions({ alternatives: true });
    assert.equal(FakeSR.instances.length, 2);
    // while stopped only the option changes
    asr.stop();
    asr.setOptions({ alternatives: false });
    assert.equal(FakeSR.instances.length, 2);
    asr.start();
    assert.equal(last().maxAlternatives, 1);
  });
});

// ---------------------------------------------------------------- webspeech: planned restart

test('webspeech: planned restart', async (t) => {
  await t.test('restartEveryMs 60000 -> stop() after 60 s, respawn with delay 0, counted as planned', (t) => {
    const { asr, states, events, errors } = setup(t, { restartEveryMs: 60000, stallMs: 0 });
    const rec1 = startListening(asr);
    advance(59_999);
    assert.equal(rec1.count('stop'), 0);
    advance(1);
    assert.equal(rec1.count('stop'), 1, 'graceful stop() after 60 s');
    assert.equal(rec1.count('abort'), 0);
    assert.equal(FakeSR.instances.length, 1, 'no new recognizer before onend');
    assert.equal(asr.state, 'listening');
    // a pending final can still arrive after stop()
    rec1.emit('result', resultEvent([{ final: true, text: 'letzter satz' }]));
    rec1.emit('end');
    assert.equal(asr.state, 'restarting');
    advance(0);
    assert.equal(FakeSR.instances.length, 2, 'respawned with delay 0');
    const rec2 = last();
    assert.equal(rec2.count('start'), 1);
    assert.equal(asr.stats.plannedRestarts, 1);
    assert.equal(asr.stats.restarts, 1, 'total restarts include the planned one');
    assert.equal(asr._restarts, 0, 'backoff counter (error restarts) unchanged');
    assert.equal(errors.length, 0);
    assert.deepEqual(
      events.filter((e) => e.type !== 'result' && e.type !== 'final').map((e) => e.type),
      ['planned-restart'],
    );
    assert.deepEqual(states, ['starting', 'listening', 'restarting']);
    rec2.emit('start');
    assert.equal(asr.state, 'listening');
    // the timer is re-armed for the next generation
    advance(60_000);
    assert.equal(rec2.count('stop'), 1);
  });

  await t.test('deferred while a result arrived < 1.5 s ago', (t) => {
    const { asr } = setup(t, { restartEveryMs: 60000, stallMs: 0 });
    const rec = startListening(asr);
    advance(59_000);
    rec.emit('result', resultEvent([{ final: false, text: 'ich rede gerade' }]));
    advance(1_000); // 60 s: result is 1 s old -> deferred
    assert.equal(rec.count('stop'), 0);
    advance(1_000); // 61 s: deferred check, result is 2 s old -> restart
    assert.equal(rec.count('stop'), 1, 'restart happens at the next 1 s check once the gap is long enough');
  });

  await t.test('deferred while voiceActivity() is true, at most 10 s', (t) => {
    let voice = true;
    const { asr } = setup(t, { restartEveryMs: 60000, stallMs: 0, voiceActivity: () => voice });
    const rec = startListening(asr);
    advance(60_000);
    assert.equal(rec.count('stop'), 0, 'deferred: voice active');
    advance(5_000);
    assert.equal(rec.count('stop'), 0, 'still deferred after 5 s');
    advance(5_000);
    assert.equal(rec.count('stop'), 1, 'forced after 10 s of deferring');
    rec.emit('end');
    advance(0);
    assert.equal(asr.stats.plannedRestarts, 1);
    // once voice stops the deferral ends at the next 1 s check
    const rec2 = last();
    rec2.emit('start');
    advance(60_000);
    assert.equal(rec2.count('stop'), 0);
    voice = false;
    advance(1_000);
    assert.equal(rec2.count('stop'), 1);
  });

  await t.test('no onend after stop() -> abort + respawn after the grace period', (t) => {
    const { asr } = setup(t, { restartEveryMs: 60000, stallMs: 0 });
    const rec = startListening(asr);
    advance(60_000);
    assert.equal(rec.count('stop'), 1);
    advance(3_000);
    assert.equal(rec.count('abort'), 1);
    assert.equal(FakeSR.instances.length, 2);
    assert.equal(asr.stats.plannedRestarts, 1);
  });

  await t.test('restartEveryMs 0 (default) never stops the recognizer; setOptions re-arms live', (t) => {
    const { asr } = setup(t, { stallMs: 0 });
    const rec = startListening(asr);
    advance(600_000);
    assert.equal(rec.count('stop'), 0);
    asr.setOptions({ restartEveryMs: 60000 });
    advance(60_000);
    assert.equal(rec.count('stop'), 1);
    assert.equal(FakeSR.instances.length, 1, 'no respawn for a restartEveryMs change');
  });

  await t.test('timers are cleared by stop()', (t) => {
    const { asr } = setup(t, { restartEveryMs: 60000, stallMs: 0 });
    const rec = startListening(asr);
    asr.stop();
    assert.equal(asr._restartTimer, null);
    assert.equal(asr._stallTimer, null);
    advance(120_000);
    assert.equal(rec.count('stop'), 0);
    assert.equal(FakeSR.instances.length, 1);
    assert.equal(asr.state, 'idle');
  });
});

// ---------------------------------------------------------------- webspeech: stall watchdog

test('webspeech: stall watchdog', async (t) => {
  await t.test('20 s without results while listening -> stalled error, respawn, stats.stalls 1', (t) => {
    const { asr, errors, events, states } = setup(t);
    const rec1 = startListening(asr);
    advance(19_999);
    assert.equal(errors.length, 0);
    advance(1);
    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0], { code: 'stalled', message: 'Erkennung hängt – Neustart', fatal: false });
    assert.equal(rec1.count('abort'), 1);
    assert.equal(FakeSR.instances.length, 2, 'respawned immediately');
    assert.equal(asr.stats.stalls, 1);
    assert.equal(asr.stats.plannedRestarts, 0);
    assert.equal(asr.stats.restarts, 1);
    assert.equal(events.filter((e) => e.type === 'stall').length, 1);
    assert.deepEqual(states, ['starting', 'listening', 'restarting']);
    rec1.emit('end'); // stale generation: ignored
    assert.equal(FakeSR.instances.length, 2);
    const rec2 = last();
    rec2.emit('start');
    assert.equal(asr.state, 'listening');
    advance(20_000);
    assert.equal(asr.stats.stalls, 2, 'watchdog re-armed for the new generation');
  });

  await t.test('results re-arm the timer', (t) => {
    const { asr, errors } = setup(t);
    const rec = startListening(asr);
    advance(15_000);
    rec.emit('result', resultEvent([{ final: false, text: 'hallo' }]));
    advance(15_000); // 30 s after start, 15 s after the result
    assert.equal(errors.length, 0);
    advance(5_000);
    assert.equal(errors.length, 1);
    assert.equal(rec.count('abort'), 1);
  });

  await t.test('does not fire while not listening (restarting after onend)', (t) => {
    const { asr, errors } = setup(t);
    const rec = startListening(asr);
    rec.emit('end'); // backoff 0 -> respawn, but no onstart yet
    advance(0);
    assert.equal(FakeSR.instances.length, 2);
    assert.equal(asr.state, 'restarting');
    advance(60_000);
    assert.equal(errors.length, 0);
    assert.equal(FakeSR.instances.length, 2);
  });

  await t.test('with voiceActivity: only stalls when voice was seen since the last result', (t) => {
    let voice = false;
    const { asr, errors } = setup(t, { voiceActivity: () => voice });
    const rec = startListening(asr);
    advance(60_000);
    assert.equal(errors.length, 0, 'silence is not a stall');
    voice = true;
    advance(1_000);
    assert.equal(errors.length, 1, 'voice without results -> stalled');
    assert.equal(rec.count('abort'), 1);
    assert.equal(asr.stats.stalls, 1);
  });

  await t.test('stallMs 0 disables the watchdog; setOptions re-arms live', (t) => {
    const { asr, errors } = setup(t, { stallMs: 0 });
    startListening(asr);
    advance(120_000);
    assert.equal(errors.length, 0);
    asr.setOptions({ stallMs: 5000 });
    advance(5_000);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'stalled');
  });

  await t.test('timer cleared by stop()', (t) => {
    const { asr, errors } = setup(t);
    startListening(asr);
    advance(10_000);
    asr.stop();
    assert.equal(asr._stallTimer, null);
    advance(60_000);
    assert.equal(errors.length, 0);
    assert.equal(FakeSR.instances.length, 1);
  });
});

// ---------------------------------------------------------------- webspeech: generation guard + regressions

test('webspeech: generation guard and regressions', async (t) => {
  await t.test('events from an old instance are ignored', (t) => {
    const { asr, calls, errors, states } = setup(t);
    const rec1 = startListening(asr);
    asr.setLang('en-US');
    const rec2 = last();
    assert.notEqual(rec1, rec2);
    const before = states.slice();
    rec1.emit('result', resultEvent([{ final: true, text: 'old' }]));
    rec1.emit('error', { error: 'not-allowed' });
    rec1.emit('end');
    rec1.emit('start');
    assert.equal(calls.length, 0);
    assert.equal(errors.length, 0);
    assert.deepEqual(states, before);
    assert.equal(asr._rec, rec2);
    assert.equal(FakeSR.instances.length, 2);
  });

  await t.test('setLang swaps without two live recognizers', (t) => {
    const { asr, calls } = setup(t);
    const rec1 = startListening(asr);
    asr.setLang('tr-TR');
    assert.equal(rec1.count('abort'), 1);
    assert.equal(FakeSR.instances.length, 2);
    const rec2 = last();
    assert.equal(rec2.lang, 'tr-TR');
    assert.equal(asr.lang, 'tr-TR');
    assert.equal(asr._rec, rec2);
    rec2.emit('start');
    rec2.emit('result', resultEvent([{ final: true, text: 'harika' }]));
    assert.equal(calls[0].meta.lang, 'tr-TR');
    // same lang / while stopped: no swap
    asr.setLang('tr-TR');
    assert.equal(FakeSR.instances.length, 2);
    asr.stop();
    asr.setLang('de-DE');
    assert.equal(FakeSR.instances.length, 2);
  });

  await t.test('backoff sequence [0,250,1000,2000,5000,10000] on repeated onend without results', (t) => {
    const { asr, events } = setup(t);
    asr.start();
    const expected = [0, 250, 1000, 2000, 5000, 10000, 10000];
    for (let i = 0; i < expected.length; i++) {
      const rec = last();
      rec.emit('start');
      rec.emit('end');
      assert.equal(asr.state, 'restarting');
      if (expected[i] > 0) {
        advance(expected[i] - 1);
        assert.equal(FakeSR.instances.length, i + 1, `no respawn before ${expected[i]} ms (round ${i})`);
        advance(1);
      } else {
        advance(0);
      }
      assert.equal(FakeSR.instances.length, i + 2, `respawned after ${expected[i]} ms (round ${i})`);
    }
    assert.deepEqual(events.filter((e) => e.type === 'restart').map((e) => e.delay), expected);
    assert.equal(asr.stats.restarts, expected.length);
    assert.equal(asr.stats.plannedRestarts, 0);
    // a result resets the backoff
    const rec = last();
    rec.emit('start');
    rec.emit('result', resultEvent([{ final: false, text: 'da' }]));
    rec.emit('end');
    advance(0);
    assert.equal(FakeSR.instances.length, expected.length + 2);
    assert.equal(events.filter((e) => e.type === 'restart').pop().delay, 0);
  });

  await t.test('start() throwing -> retried via backoff', (t) => {
    const { asr } = setup(t);
    FakeSR.throwOnStart = true;
    asr.start();
    assert.equal(asr.state, 'restarting');
    assert.equal(asr._rec, null);
    FakeSR.throwOnStart = false;
    advance(250);
    assert.equal(FakeSR.instances.length, 2);
  });

  await t.test('not-allowed -> fatal error + state error, timers cleared', (t) => {
    const { asr, errors, states } = setup(t, { restartEveryMs: 60000, stallMs: 0 });
    const rec = startListening(asr);
    rec.emit('error', { error: 'not-allowed' });
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'not-allowed');
    assert.equal(errors[0].fatal, true);
    assert.equal(errors[0].message, 'Mikrofon-Zugriff verweigert.');
    assert.equal(asr.state, 'error');
    assert.deepEqual(states, ['starting', 'listening', 'error']);
    assert.equal(rec.count('abort'), 1);
    advance(120_000);
    assert.equal(FakeSR.instances.length, 1);
    assert.equal(errors.length, 1);
    rec.emit('end'); // stale: no restart
    assert.equal(FakeSR.instances.length, 1);
  });

  await t.test('audio-capture message, network backoff and fatal after 5, no-speech ignored', (t) => {
    const { asr, errors } = setup(t);
    let rec = startListening(asr);
    rec.emit('error', { error: 'no-speech' });
    rec.emit('error', { error: 'aborted' });
    assert.equal(errors.length, 0);
    for (let i = 1; i <= 4; i++) {
      rec.emit('error', { error: 'network' });
      assert.equal(errors[errors.length - 1].fatal, false);
      rec.emit('end');
      advance(10_000);
      rec = last();
      rec.emit('start');
    }
    assert.equal(errors.length, 4);
    rec.emit('error', { error: 'network' });
    assert.equal(errors.length, 5);
    assert.equal(errors[4].fatal, true);
    assert.equal(asr.state, 'error');
  });

  await t.test('audio-capture -> fatal with its own message', (t) => {
    const { asr, errors } = setup(t);
    startListening(asr).emit('error', { error: 'audio-capture' });
    assert.equal(errors[0].message, 'Kein Mikrofon gefunden.');
    assert.equal(errors[0].fatal, true);
    assert.equal(asr.state, 'error');
  });

  await t.test('unsupported when SpeechRecognition is missing', (t) => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    t.after(() => mock.timers.reset());
    delete globalThis.SpeechRecognition;
    const errors = [];
    const asr = LiveFXASR.create('webspeech', { onError: (e) => errors.push(e) });
    assert.equal(asr.state, 'unsupported');
    asr.start();
    assert.equal(asr.state, 'unsupported');
    assert.equal(errors[0].code, 'unsupported');
    assert.equal(errors[0].fatal, true);
    assert.equal(LiveFXASR.backends.find((b) => b.name === 'webspeech').supported, false);
  });
});

// ---------------------------------------------------------------- external

test('external backend', async (t) => {
  function fakeBus() {
    const listeners = new Set();
    return {
      serverBase: '',
      onMessage(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      emit(m) {
        for (const fn of listeners) fn(m);
      },
      get size() {
        return listeners.size;
      },
    };
  }

  await t.test('transcript messages -> onText with at; setOptions is a no-op', (t) => {
    const origNow = performance.now;
    performance.now = () => 4242;
    t.after(() => (performance.now = origNow));
    const bus = fakeBus();
    const calls = [];
    const states = [];
    const events = [];
    const asr = LiveFXASR.create('external', { bus, onText: (...a) => calls.push(a), onState: (s) => states.push(s), onEvent: (e) => events.push(e) });
    assert.equal(asr.state, 'idle');
    assert.equal(typeof asr.setOptions, 'function');
    assert.equal(asr.setOptions({ alternatives: true, restartEveryMs: 1, stallMs: 1 }), undefined);
    asr.start();
    asr.setOptions({ alternatives: true });
    assert.equal(asr.state, 'listening');
    bus.emit({ type: 'transcript', text: 'oh nein', final: true });
    bus.emit({ type: 'transcript', text: 'zwischen', final: false, source: 'Whisper', lang: 'en-US' });
    bus.emit({ type: 'fire', trigger: { id: 'x' } });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], ['oh nein', true, { source: 'Extern', lang: undefined, at: 4242 }]);
    assert.deepEqual(calls[1], ['zwischen', false, { source: 'Whisper', lang: 'en-US', at: 4242 }]);
    assert.deepEqual(asr.stats, { results: 2, finals: 1, restarts: 0, plannedRestarts: 0, stalls: 0, lastResultAt: 4242, lastFinalAt: 4242, startedAt: 4242 });
    assert.deepEqual(events.map((e) => e.type), ['final', 'result']);
    asr.stop();
    assert.equal(bus.size, 0);
    bus.emit({ type: 'transcript', text: 'nach stop' });
    assert.equal(calls.length, 2);
    assert.deepEqual(states, ['listening', 'idle']);
  });

  await t.test('unsupported without a server bus', () => {
    const errors = [];
    const asr = LiveFXASR.create('external', { bus: { serverBase: null, onMessage() {} }, onError: (e) => errors.push(e) });
    assert.equal(asr.state, 'unsupported');
    asr.start();
    assert.equal(errors[0].code, 'unsupported');
    assert.throws(() => LiveFXASR.create('nope', {}), /unbekanntes Backend/);
  });
});

// ---------------------------------------------------------------- meter

test('meter', async (t) => {
  function fakeAudio(t, { amplitude = 0, reject = null } = {}) {
    mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 5_000_000 });
    const origNow = performance.now;
    performance.now = () => Date.now();
    const log = { tracksStopped: 0, ctxClosed: 0, disconnected: 0, getUserMedia: [] };
    const state = { amplitude };
    const stream = { getTracks: () => [{ stop: () => log.tracksStopped++ }] };
    class FakeAnalyser {
      constructor() {
        this.fftSize = 2048;
      }
      getFloatTimeDomainData(buf) {
        for (let i = 0; i < buf.length; i++) buf[i] = i % 2 ? state.amplitude : -state.amplitude; // RMS == |amplitude|
      }
    }
    class FakeAudioContext {
      constructor() {
        this.state = 'suspended';
        FakeAudioContext.instances.push(this);
      }
      createAnalyser() {
        return new FakeAnalyser();
      }
      createMediaStreamSource(s) {
        assert.equal(s, stream);
        return { connect: () => {}, disconnect: () => log.disconnected++ };
      }
      resume() {
        this.state = 'running';
        return Promise.resolve();
      }
      close() {
        log.ctxClosed++;
        return Promise.resolve();
      }
    }
    FakeAudioContext.instances = [];
    globalThis.AudioContext = FakeAudioContext;
    const navDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator'); // a getter in Node >= 21
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        mediaDevices: {
          getUserMedia(c) {
            log.getUserMedia.push(c);
            return reject ? Promise.reject(reject) : Promise.resolve(stream);
          },
        },
      },
    });
    const warn = console.warn;
    const warned = [];
    console.warn = (...a) => warned.push(a);
    t.after(() => {
      console.warn = warn;
      delete globalThis.AudioContext;
      delete globalThis.navigator;
      if (navDesc) Object.defineProperty(globalThis, 'navigator', navDesc);
      performance.now = origNow;
      mock.timers.reset();
    });
    return { log, state, warned, FakeAudioContext };
  }

  await t.test('level == RMS, isVoiceActive above/below threshold, onLevel called', async (t) => {
    const { log, state, FakeAudioContext } = fakeAudio(t, { amplitude: 0.1 });
    const levels = [];
    const meter = LiveFXMeter.create({ fps: 10, threshold: 0.02, onLevel: (rms, peak) => levels.push([rms, peak]) });
    assert.equal(meter.isVoiceActive(), false);
    assert.equal(await meter.start(), true);
    assert.deepEqual(log.getUserMedia, [{ audio: true }]);
    assert.equal(FakeAudioContext.instances.length, 1);
    assert.equal(FakeAudioContext.instances[0].state, 'running');
    assert.equal(await meter.start(), true, 'second start() is a no-op');
    assert.equal(FakeAudioContext.instances.length, 1);
    advance(100);
    assert.ok(Math.abs(meter.level - 0.1) < 1e-6, `level ${meter.level}`);
    assert.ok(Math.abs(meter.peak - 0.1) < 1e-6);
    assert.equal(meter.isVoiceActive(), true);
    assert.equal(meter.lastVoiceAt, Date.now());
    assert.equal(levels.length, 1);
    assert.equal(meter.error, null);
    // below threshold -> false after the hold time
    state.amplitude = 0.01;
    const loudAt = meter.lastVoiceAt;
    advance(100);
    assert.ok(Math.abs(meter.level - 0.01) < 1e-6);
    assert.equal(meter.isVoiceActive(), true, 'hold keeps it active right after the loud tick');
    advance(200);
    assert.equal(meter.isVoiceActive(), false);
    assert.equal(meter.lastVoiceAt, loudAt);
    assert.ok(meter.peak < 0.1 && meter.peak > 0.01, 'peak decays');
    assert.equal(levels.length, 4);
    // stop releases everything, twice is fine
    meter.stop();
    meter.stop();
    assert.equal(log.tracksStopped, 1);
    assert.equal(log.ctxClosed, 1);
    assert.equal(log.disconnected, 1);
    assert.equal(meter.running, false);
    assert.equal(meter.level, 0);
    assert.equal(meter.isVoiceActive(), false);
    advance(1000);
    assert.equal(levels.length, 4, 'no ticks after stop');
  });

  await t.test('start() resolves false when getUserMedia rejects (warned once)', async (t) => {
    const { warned } = fakeAudio(t, { reject: new Error('NotAllowedError') });
    const meter = LiveFXMeter.create({});
    assert.equal(await meter.start(), false);
    assert.equal(meter.running, false);
    assert.equal(meter.error, 'NotAllowedError');
    assert.equal(await meter.start(), false);
    assert.equal(warned.length, 1);
    meter.stop();
  });

  await t.test('start() resolves false without mediaDevices / AudioContext', async (t) => {
    fakeAudio(t);
    delete globalThis.AudioContext;
    const m1 = LiveFXMeter.create();
    assert.equal(await m1.start(), false);
    assert.match(m1.error, /WebAudio/);
    delete globalThis.navigator;
    const m2 = LiveFXMeter.create();
    assert.equal(await m2.start(), false);
    assert.match(m2.error, /getUserMedia/);
  });

  await t.test('stop() during a pending start() releases the stream', async (t) => {
    const { log } = fakeAudio(t, { amplitude: 0.5 });
    const meter = LiveFXMeter.create();
    const p = meter.start();
    meter.stop();
    assert.equal(await p, false);
    assert.equal(log.tracksStopped, 1);
    assert.equal(meter.running, false);
  });
});
