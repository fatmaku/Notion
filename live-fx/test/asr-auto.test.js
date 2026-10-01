// node --test test/asr-auto.test.js
// Unit tests for the `auto` backend of js/asr.js (DE/TR/EN language detection on top of webspeech).
// Same fake SpeechRecognition + mocked timers as test/asr.test.js; every FakeSR instance is independent,
// so parallel recognizers "work" unless a test fires `error: aborted` the way Chrome does.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

require('../js/asr.js');
const { LiveFXASR } = globalThis;

// ---------------------------------------------------------------- fakes

class FakeSR {
  constructor() {
    FakeSR.instances.push(this);
    this.lang = null;
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.calls = [];
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }
  start() {
    this.calls.push('start');
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
  emit(name, ev) {
    const h = this['on' + name];
    if (typeof h === 'function') h(ev);
  }
  /** Shorthand: one final (or interim) result with `text`. */
  say(text, { final = true, confidence } = {}) {
    const alt = { transcript: text, confidence: typeof confidence === 'number' ? confidence : 0.5 };
    const r = { isFinal: final, length: 1, 0: alt };
    this.emit('result', { resultIndex: 0, results: [r] });
  }
}
FakeSR.instances = [];

function last() {
  return FakeSR.instances[FakeSR.instances.length - 1];
}

function byLang(tag) {
  const live = FakeSR.instances.filter((r) => r.lang === tag && r.count('abort') === 0);
  return live[live.length - 1];
}

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
  globalThis.SpeechRecognition = FakeSR;
  const calls = [];
  const states = [];
  const errors = [];
  const events = [];
  const asr = LiveFXASR.create('auto', {
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
  const langEvents = () => events.filter((e) => e.type === 'lang').map((e) => ({ lang: e.lang, family: e.family, mode: e.mode, reason: e.reason }));
  return { asr, calls, states, errors, events, langEvents };
}

/** start() in switching mode and bring the single recognizer to 'listening'. */
function startSwitching(t, opts = {}) {
  const ctx = setup(t, { parallel: 'off', ...opts });
  ctx.asr.start();
  last().emit('start');
  return ctx;
}

/** start() in parallel mode; all recognizers report onstart. */
function startParallel(t, opts = {}) {
  const ctx = setup(t, opts);
  ctx.asr.start();
  for (const r of FakeSR.instances) r.emit('start');
  return ctx;
}

// ---------------------------------------------------------------- registry

test('auto: registry and construction', async (t) => {
  await t.test('backends lists auto (supported with SpeechRecognition), create() works', (t) => {
    const { asr } = setup(t);
    const entry = LiveFXASR.backends.find((b) => b.name === 'auto');
    assert.deepEqual(entry, { name: 'auto', label: 'Automatisch (DE/TR/EN)', supported: true });
    assert.equal(LiveFXASR.backends[1].name, 'auto', 'listed right after webspeech');
    assert.equal(asr.name, 'auto');
    assert.equal(asr.state, 'idle');
    assert.equal(asr.lang, 'de-DE');
    assert.equal(asr.family, 'de');
    assert.deepEqual(asr.langs, ['de-DE', 'tr-TR', 'en-US']);
    assert.equal(asr.pinned, false);
    assert.deepEqual(asr.options, { alternatives: false, restartEveryMs: 0, stallMs: 20000, langs: ['de-DE', 'tr-TR', 'en-US'], window: 3, switchAfter: 2, parallel: 'try' });
    assert.deepEqual(asr.stats, { results: 0, finals: 0, restarts: 0, plannedRestarts: 0, stalls: 0, lastResultAt: null, lastFinalAt: null, startedAt: null, switches: 0, parallel: false, detected: { de: 0, tr: 0, en: 0 } });
    assert.deepEqual(LiveFXASR.AUTO_LANGS, ['de-DE', 'tr-TR', 'en-US']);
    assert.equal(LiveFXASR.AUTO_PARALLEL_PROBE_MS, 1500);
    assert.equal(LiveFXASR.AUTO_DEDUPE_MS, 800);
  });

  await t.test('langs with variants; start language = opts.lang when its family is listed, else langs[0]', (t) => {
    const a = setup(t, { lang: 'de-AT', langs: ['tr-TR', 'de-DE', 'en-GB', 'fr-FR', 'de-CH'] }).asr;
    assert.deepEqual(a.langs, ['tr-TR', 'de-AT', 'en-GB'], 'fr dropped, later variant of a family replaces the earlier one, opts.lang wins');
    assert.equal(a.lang, 'de-AT');
    const b = LiveFXASR.create('auto', { lang: 'en-US', langs: ['tr-TR', 'de-DE'] });
    assert.equal(b.lang, 'tr-TR');
    assert.equal(b.family, 'tr');
    const c = LiveFXASR.create('auto', { langs: ['xx'], window: 0, switchAfter: 9, parallel: true });
    assert.deepEqual(c.langs, ['de-DE', 'tr-TR', 'en-US'], 'no usable langs -> defaults');
    assert.equal(c.options.window, 3);
    assert.equal(c.options.switchAfter, 3, 'switchAfter is capped at window');
    assert.equal(c.options.parallel, 'on');
    assert.equal(LiveFXASR.create('auto', { parallel: false }).options.parallel, 'off');
  });

  await t.test('unsupported without SpeechRecognition', (t) => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    t.after(() => mock.timers.reset());
    delete globalThis.SpeechRecognition;
    const errors = [];
    const asr = LiveFXASR.create('auto', { onError: (e) => errors.push(e) });
    assert.equal(asr.state, 'unsupported');
    asr.start();
    assert.equal(asr.state, 'unsupported');
    assert.equal(errors[0].code, 'unsupported');
    assert.equal(errors[0].fatal, true);
    assert.equal(LiveFXASR.backends.find((b) => b.name === 'auto').supported, false);
    assert.equal(FakeSR.instances.length, 0);
  });
});

// ---------------------------------------------------------------- switching mode

test('auto: switching mode', async (t) => {
  await t.test('start: one recognizer in the start language, lang event "start", meta carries source/lang/recognizer', (t) => {
    const { asr, calls, states, langEvents, events } = startSwitching(t);
    assert.equal(FakeSR.instances.length, 1);
    const rec = last();
    assert.equal(rec.lang, 'de-DE');
    assert.equal(rec.continuous, true);
    assert.deepEqual(states, ['starting', 'listening']);
    assert.equal(asr.stats.parallel, false);
    assert.deepEqual(langEvents(), [{ lang: 'de-DE', family: 'de', mode: 'switch', reason: 'start' }]);
    rec.say('das ist', { final: false });
    rec.say('das ist krass alter', { confidence: 0.9 });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].isFinal, false);
    assert.deepEqual(calls[1].meta, { source: 'auto', lang: 'de-DE', recognizer: 'de-DE', at: Date.now(), confidence: 0.9 });
    assert.equal(asr.stats.results, 2);
    assert.equal(asr.stats.finals, 1);
    assert.equal(asr.stats.lastFinalAt, Date.now());
    assert.deepEqual(asr.stats.detected, { de: 1, tr: 0, en: 0 });
    assert.equal(asr.stats.switches, 0);
    assert.deepEqual(
      events.filter((e) => e.type === 'result' || e.type === 'final').map((e) => [e.type, e.text, e.recognizer]),
      [
        ['result', 'das ist', 'de-DE'],
        ['final', 'das ist krass alter', 'de-DE'],
      ],
    );
  });

  await t.test('two Turkish finals in a row -> recognizer swapped to tr-TR right after the second final', (t) => {
    const { asr, calls, langEvents, events } = startSwitching(t);
    const rec1 = last();
    rec1.say('yok artik abi');
    assert.equal(FakeSR.instances.length, 1, 'one Turkish final is not enough');
    assert.equal(asr.lang, 'de-DE');
    advance(2000);
    rec1.say('bu oyun çok zor değil mi');
    assert.equal(FakeSR.instances.length, 2, 'switched');
    assert.equal(rec1.count('abort'), 1);
    const rec2 = last();
    assert.equal(rec2.lang, 'tr-TR');
    assert.equal(rec2.count('start'), 1);
    assert.equal(asr.lang, 'tr-TR');
    assert.equal(asr.family, 'tr');
    assert.equal(asr.stats.switches, 1);
    assert.deepEqual(asr.stats.detected, { de: 0, tr: 2, en: 0 });
    assert.equal(calls.length, 2, 'both finals were forwarded (in the language they were heard in)');
    assert.equal(calls[1].meta.lang, 'de-DE');
    const ev = events.filter((e) => e.type === 'lang').pop();
    assert.equal(ev.lang, 'tr-TR');
    assert.equal(ev.family, 'tr');
    assert.equal(ev.mode, 'switch');
    assert.equal(ev.reason, 'detected');
    assert.ok(ev.score > 0.5 && ev.score <= 1, `score ${ev.score}`);
    assert.deepEqual(langEvents().map((e) => e.reason), ['start', 'detected']);
    // stale generation is ignored
    rec1.say('alte generation');
    rec1.emit('end');
    assert.equal(calls.length, 2);
    assert.equal(FakeSR.instances.length, 2);
    rec2.emit('start');
    assert.equal(asr.state, 'listening');
    rec2.say('harika oldu abi');
    assert.equal(calls[2].meta.lang, 'tr-TR');
    assert.equal(calls[2].meta.recognizer, 'tr-TR');
  });

  await t.test('window reset: after a switch the agreement starts from zero; a final in the current language breaks a streak', (t) => {
    const { asr } = startSwitching(t, { window: 3, switchAfter: 2 });
    last().say('yok artik abi');
    last().say('tamam tamam anladım');
    assert.equal(asr.lang, 'tr-TR');
    last().emit('start');
    last().say('krass alter'); // de #1 after the switch – the earlier Turkish finals do not count against it
    assert.equal(asr.lang, 'tr-TR');
    last().say('hadi lan gidiyoruz'); // tr: breaks the German streak
    last().say('das ist nicht gut'); // de #1 again
    assert.equal(asr.lang, 'tr-TR');
    assert.equal(asr.stats.switches, 1);
    last().say('wir spielen jetzt'); // de #2 -> switch
    assert.equal(asr.lang, 'de-DE');
    assert.equal(asr.stats.switches, 2);
    assert.equal(FakeSR.instances.length, 3);
  });

  await t.test('switchAfter 3 needs three agreeing finals; unknown text does not count', (t) => {
    const { asr } = startSwitching(t, { window: 4, switchAfter: 3 });
    last().say("that's wild bro");
    last().say('xyz qwq'); // undetectable: ignored, streak intact
    last().say('what the hell is going on');
    assert.equal(asr.lang, 'de-DE');
    last().say('okay okay chill guys');
    assert.equal(asr.lang, 'en-US');
    assert.deepEqual(asr.stats.detected, { de: 0, tr: 0, en: 3 });
  });

  await t.test('with voiceActivity the switch waits for a speech gap (1 s steps, forced after 10 s)', (t) => {
    let voice = true;
    const { asr, langEvents } = startSwitching(t, { voiceActivity: () => voice, stallMs: 0 });
    const rec1 = last();
    rec1.say('yok artik abi');
    rec1.say('tamam tamam anladım');
    assert.equal(FakeSR.instances.length, 1, 'deferred: voice active');
    assert.equal(asr.lang, 'de-DE');
    advance(3000);
    assert.equal(FakeSR.instances.length, 1);
    voice = false;
    advance(1000);
    assert.equal(FakeSR.instances.length, 2, 'switched at the next 1 s check');
    assert.equal(last().lang, 'tr-TR');
    assert.equal(rec1.count('abort'), 1);
    assert.deepEqual(langEvents().map((e) => e.reason), ['start', 'detected']);
    // forced after 10 s of continuous voice
    const rec2 = last();
    rec2.emit('start');
    voice = true;
    rec2.say('krass alter');
    rec2.say('das ist nicht gut');
    advance(9000);
    assert.equal(FakeSR.instances.length, 2);
    advance(1000);
    assert.equal(FakeSR.instances.length, 3, 'forced after 10 s');
    assert.equal(last().lang, 'de-DE');
    // a pending switch is dropped by stop()
    last().emit('start');
    last().say('yok artik abi');
    last().say('tamam tamam anladım');
    asr.stop();
    assert.equal(asr._switchTimer, null);
    voice = false;
    advance(5000);
    assert.equal(FakeSR.instances.length, 3);
  });

  await t.test('variants from langs are used for the switch target', (t) => {
    const { asr } = startSwitching(t, { lang: 'de-DE', langs: ['de-DE', 'tr-TR', 'en-GB'] });
    last().say("that's wild bro");
    last().say('what the hell is going on');
    assert.equal(asr.lang, 'en-GB');
    assert.equal(last().lang, 'en-GB');
  });

  await t.test('restart/stall events and stats are aggregated from the inner recognizer', (t) => {
    const { asr, events, errors } = startSwitching(t, { stallMs: 5000 });
    const rec1 = last();
    rec1.emit('end'); // backoff 0
    assert.equal(asr.state, 'restarting');
    advance(0);
    assert.equal(FakeSR.instances.length, 2);
    assert.equal(asr.stats.restarts, 1);
    const restart = events.find((e) => e.type === 'restart');
    assert.equal(restart.delay, 0);
    assert.equal(restart.recognizer, 'de-DE');
    last().emit('start');
    advance(5000);
    assert.equal(asr.stats.stalls, 1);
    assert.equal(asr.stats.restarts, 2);
    assert.equal(errors[0].code, 'stalled');
    assert.equal(errors[0].recognizer, 'de-DE');
    assert.equal(events.find((e) => e.type === 'stall').recognizer, 'de-DE');
  });

  await t.test('fatal inner error -> onError(fatal), everything stopped, state error', (t) => {
    const { asr, errors, states } = startSwitching(t);
    last().emit('error', { error: 'not-allowed' });
    assert.equal(errors.length, 1);
    assert.equal(errors[0].fatal, true);
    assert.equal(errors[0].code, 'not-allowed');
    assert.equal(asr.state, 'error');
    assert.deepEqual(states, ['starting', 'listening', 'error']);
    assert.equal(last().count('abort'), 1);
    advance(60_000);
    assert.equal(FakeSR.instances.length, 1);
    asr.start(); // can be started again
    assert.equal(FakeSR.instances.length, 2);
  });

  await t.test('setOptions forwards to the recognizer (alternatives respawn, options getter merges)', (t) => {
    const { asr } = startSwitching(t);
    const rec1 = last();
    asr.setOptions({ alternatives: true, window: 5, switchAfter: 4, stallMs: 0 });
    assert.equal(FakeSR.instances.length, 2, 'alternatives needs a fresh recognizer');
    assert.equal(rec1.count('abort'), 1);
    assert.equal(last().maxAlternatives, 3);
    assert.deepEqual(asr.options, { alternatives: true, restartEveryMs: 0, stallMs: 0, langs: ['de-DE', 'tr-TR', 'en-US'], window: 5, switchAfter: 4, parallel: 'off' });
    asr.setOptions({ switchAfter: 9 });
    assert.equal(asr.options.switchAfter, 5);
  });
});

// ---------------------------------------------------------------- parallel mode

test('auto: parallel mode', async (t) => {
  await t.test('start: one recognizer per family, interims only from the leader, aggregate state', (t) => {
    const { asr, calls, states, langEvents } = startParallel(t);
    assert.deepEqual(
      FakeSR.instances.map((r) => r.lang),
      ['de-DE', 'tr-TR', 'en-US'],
    );
    assert.ok(FakeSR.instances.every((r) => r.count('start') === 1));
    assert.equal(asr.stats.parallel, true);
    assert.equal(asr.parallel, true);
    assert.deepEqual(states, ['starting', 'listening']);
    assert.deepEqual(langEvents(), [{ lang: 'de-DE', family: 'de', mode: 'parallel', reason: 'start' }]);
    byLang('tr-TR').say('bir', { final: false });
    byLang('en-US').say('the', { final: false });
    assert.equal(calls.length, 0, 'interims of non-leading recognizers are dropped');
    byLang('de-DE').say('das ist', { final: false });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].meta, { source: 'auto', lang: 'de-DE', recognizer: 'de-DE', at: Date.now() });
  });

  await t.test('finals: a confident final is forwarded at once, the other recognizers\' versions are dropped', (t) => {
    const { asr, calls, events } = startParallel(t);
    byLang('de-DE').say('das ist krass alter', { confidence: 0.9 });
    assert.equal(calls.length, 1, 'confident German from the German recognizer: no waiting');
    assert.equal(calls[0].text, 'das ist krass alter');
    assert.equal(calls[0].meta.recognizer, 'de-DE');
    advance(100);
    byLang('tr-TR').say('das ist kras alta');
    byLang('en-US').say('this is crass alter');
    assert.equal(calls.length, 1, 'same utterance within 800 ms -> duplicates');
    assert.deepEqual(
      events.filter((e) => e.type === 'duplicate').map((e) => e.recognizer),
      ['tr-TR', 'en-US'],
    );
    assert.equal(asr.stats.finals, 1);
    assert.deepEqual(asr.stats.detected, { de: 2, tr: 0, en: 1 }, 'detections are counted for every final heard');
    advance(2000);
    byLang('tr-TR').say('das ist krass alter');
    assert.equal(calls.length, 1, 'near-identical text within 3 s is a duplicate too');
    advance(3000);
    byLang('de-DE').say('das ist krass alter');
    assert.equal(calls.length, 2, 'the same sentence later on is a new utterance');
  });

  await t.test('finals: the best-scoring version wins after the dedupe window; the leader follows it', (t) => {
    const { asr, calls, events, langEvents } = startParallel(t);
    byLang('de-DE').say('jok artig abi'); // German recognizer mangles Turkish
    assert.equal(calls.length, 0, 'not confident: held');
    advance(200);
    byLang('tr-TR').say('yok artık abi');
    assert.equal(calls.length, 1, 'confident Turkish from the Turkish recognizer releases the hold');
    assert.equal(calls[0].text, 'yok artık abi');
    assert.equal(calls[0].meta.recognizer, 'tr-TR');
    assert.equal(calls[0].meta.lang, 'tr-TR');
    assert.equal(asr.lang, 'tr-TR');
    assert.equal(asr.family, 'tr');
    assert.equal(asr.stats.switches, 1);
    const ev = events.filter((e) => e.type === 'lang').pop();
    assert.equal(ev.mode, 'parallel');
    assert.equal(ev.reason, 'detected');
    assert.equal(ev.lang, 'tr-TR');
    assert.ok(FakeSR.instances.every((r) => r.count('abort') === 0), 'no recognizer is restarted in parallel mode');
    // now the Turkish recognizer leads: its interims pass, the others' are dropped
    byLang('de-DE').say('ich', { final: false });
    byLang('tr-TR').say('ben', { final: false });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].text, 'ben');
    // nobody confident: the window closes after 800 ms and the best score is forwarded
    advance(2000);
    byLang('tr-TR').say('okey okey');
    byLang('de-DE').say('okay okay'); // English words from the German recognizer
    advance(100);
    byLang('en-US').say('okay okay', { confidence: 0.95 }); // English words from the English recognizer, but only 2 tokens -> not >= 0.75? it is 1.0 -> confident
    assert.equal(calls.length, 3);
    assert.equal(calls[2].text, 'okay okay');
    assert.equal(calls[2].meta.recognizer, 'en-US');
    assert.equal(asr.lang, 'en-US');
    advance(2000);
    byLang('en-US').say('bla bla');
    advance(100);
    byLang('tr-TR').say('bla bla bla');
    assert.equal(calls.length, 3, 'undetectable text is held until the window closes');
    advance(800);
    assert.equal(calls.length, 4);
    assert.equal(calls[3].text, 'bla bla');
    assert.equal(calls[3].meta.recognizer, 'en-US', 'tie on score -> the first one heard');
    assert.equal(asr.lang, 'en-US', 'no detection -> leader unchanged');
    assert.deepEqual(langEvents().map((e) => [e.family, e.reason]), [['de', 'start'], ['tr', 'detected'], ['en', 'detected']]);
  });

  await t.test('a new utterance releases the held one', (t) => {
    const { calls } = startParallel(t);
    byLang('de-DE').say('bla bla');
    advance(300);
    byLang('tr-TR').say('bu oyun çok zor değil mi');
    assert.equal(calls.length, 1, 'confident Turkish 300 ms later still counts as the same utterance and wins');
    assert.equal(calls[0].meta.recognizer, 'tr-TR');
    advance(1000);
    byLang('en-US').say('qwq xyz');
    advance(900);
    byLang('de-DE').say('zzz yyy');
    assert.equal(calls.length, 2, 'a final > 800 ms later is a new utterance: the held one is forwarded first');
    assert.equal(calls[1].text, 'qwq xyz');
    advance(800);
    assert.equal(calls.length, 3);
    assert.equal(calls[2].text, 'zzz yyy');
  });

  await t.test('parallel: "try" falls back to switching mode when a recognizer is aborted within 1.5 s', (t) => {
    const { asr, calls, langEvents, events } = startParallel(t);
    const [de, tr, en] = FakeSR.instances;
    advance(500);
    tr.emit('error', { error: 'aborted' }); // Chrome: starting the 2nd recognizer aborts one of them
    assert.equal(asr.stats.parallel, false);
    assert.equal(asr.parallel, false);
    assert.equal(tr.count('abort'), 1);
    assert.equal(en.count('abort'), 1);
    assert.equal(de.count('abort'), 0, 'the primary (start language) keeps running');
    assert.deepEqual(langEvents().pop(), { lang: 'de-DE', family: 'de', mode: 'switch', reason: 'parallel-unsupported' });
    tr.emit('end');
    en.emit('end');
    advance(1000);
    assert.equal(FakeSR.instances.length, 3, 'the stopped recognizers do not restart');
    // from here on: switching mode
    de.say('yok artik abi');
    de.say('tamam tamam anladım');
    assert.equal(calls.length, 2);
    assert.equal(FakeSR.instances.length, 4);
    assert.equal(last().lang, 'tr-TR');
    assert.equal(de.count('abort'), 1);
    assert.equal(events.filter((e) => e.type === 'lang').pop().mode, 'switch');
  });

  await t.test('parallel: not-allowed on a secondary recognizer within the probe window is not fatal', (t) => {
    const { asr, errors } = startParallel(t);
    const [de, tr] = FakeSR.instances;
    tr.emit('error', { error: 'not-allowed' });
    assert.equal(errors.length, 0);
    assert.equal(asr.state, 'listening');
    assert.equal(asr.stats.parallel, false);
    assert.equal(de.count('abort'), 0);
    assert.equal(asr._inners.length, 1);
    // but on the primary it is the real thing
    de.emit('error', { error: 'not-allowed' });
    assert.equal(errors.length, 1);
    assert.equal(errors[0].fatal, true);
    assert.equal(asr.state, 'error');
  });

  await t.test('parallel: an aborted after the probe window does not fall back', (t) => {
    const a = startParallel(t);
    advance(1600);
    FakeSR.instances[1].emit('error', { error: 'aborted' });
    assert.equal(a.asr.stats.parallel, true);
    assert.equal(a.asr._inners.length, 3);
  });

  await t.test('parallel "on" never falls back', (t) => {
    const b = startParallel(t, { parallel: 'on' });
    FakeSR.instances[FakeSR.instances.length - 1].emit('error', { error: 'aborted' });
    assert.equal(b.asr.stats.parallel, true);
    assert.equal(b.asr._inners.length, 3);
  });

  await t.test('parallel with two languages only; start language from opts.lang', (t) => {
    const { asr } = startParallel(t, { lang: 'tr-TR', langs: ['de-DE', 'tr-TR'] });
    assert.deepEqual(FakeSR.instances.map((r) => r.lang), ['tr-TR', 'de-DE']);
    assert.equal(asr.lang, 'tr-TR');
    const single = LiveFXASR.create('auto', { langs: ['de-DE'] });
    single.start();
    assert.equal(single.stats.parallel, false, 'one language -> nothing to run in parallel');
    single.stop();
  });

  await t.test('inner restarts in parallel mode keep the others alive', (t) => {
    const { asr } = startParallel(t);
    const tr = byLang('tr-TR');
    tr.emit('end');
    assert.equal(asr.state, 'listening', 'other recognizers are still listening');
    advance(0);
    assert.equal(FakeSR.instances.length, 4);
    assert.equal(last().lang, 'tr-TR');
    assert.equal(asr.stats.restarts, 1);
    last().emit('start');
    assert.equal(asr._inners.length, 3);
  });
});

// ---------------------------------------------------------------- stop / setLang

test('auto: stop() and setLang()', async (t) => {
  await t.test('stop() stops every recognizer, clears timers, state idle; start() again works', (t) => {
    const { asr, states, calls } = startParallel(t);
    byLang('de-DE').say('bla bla'); // held final
    asr.stop();
    assert.ok(FakeSR.instances.every((r) => r.count('abort') === 1));
    assert.equal(asr.state, 'idle');
    assert.equal(asr._inners.length, 0);
    assert.equal(asr._hold, null);
    advance(5000);
    assert.equal(calls.length, 0, 'the held final is dropped');
    assert.equal(FakeSR.instances.length, 3);
    for (const r of FakeSR.instances) {
      r.say('yok artik abi');
      r.emit('end');
    }
    assert.equal(calls.length, 0);
    assert.equal(FakeSR.instances.length, 3, 'stale recognizers do not respawn');
    assert.deepEqual(states, ['starting', 'listening', 'idle']);
    asr.stop(); // twice is fine
    asr.start();
    assert.equal(FakeSR.instances.length, 6);
    assert.equal(asr.stats.parallel, true);
    assert.equal(asr.stats.switches, 0);
  });

  await t.test('setLang(tag) pins the family: immediate switch, no automatic switching until setLang("auto")', (t) => {
    const { asr, langEvents } = startSwitching(t);
    const rec1 = last();
    asr.setLang('tr-TR');
    assert.equal(asr.pinned, true);
    assert.equal(asr.lang, 'tr-TR');
    assert.equal(rec1.count('abort'), 1);
    assert.equal(last().lang, 'tr-TR');
    assert.equal(asr.stats.switches, 1);
    assert.deepEqual(langEvents().pop(), { lang: 'tr-TR', family: 'tr', mode: 'switch', reason: 'pinned' });
    last().emit('start');
    last().say("that's wild bro");
    last().say('what the hell is going on');
    last().say('okay okay chill guys');
    assert.equal(asr.lang, 'tr-TR', 'pinned: no switch');
    assert.equal(FakeSR.instances.length, 2);
    assert.deepEqual(asr.stats.detected, { de: 0, tr: 0, en: 3 }, 'detections are still counted');
    asr.setLang('tr-TR'); // same again: nothing happens
    assert.equal(FakeSR.instances.length, 2);
    assert.equal(asr.stats.switches, 1);
    asr.setLang('auto');
    assert.equal(asr.pinned, false);
    assert.deepEqual(langEvents().pop(), { lang: 'tr-TR', family: 'tr', mode: 'switch', reason: 'unpinned' });
    last().say("that's wild bro");
    last().say('what the hell is going on');
    assert.equal(asr.lang, 'en-US');
    assert.equal(FakeSR.instances.length, 3);
    asr.setLang(null); // already auto: no event
    assert.equal(langEvents().length, 4);
  });

  await t.test('setLang with a new variant adds it to langs; while stopped only the state changes', (t) => {
    const { asr } = setup(t, { parallel: 'off' });
    asr.setLang('de-AT');
    assert.equal(asr.lang, 'de-AT');
    assert.deepEqual(asr.langs, ['de-AT', 'tr-TR', 'en-US']);
    assert.equal(FakeSR.instances.length, 0);
    asr.setLang('fr-FR');
    assert.equal(asr.lang, 'de-AT', 'unknown family ignored');
    asr.start();
    assert.equal(last().lang, 'de-AT');
    asr.setLang('en-GB');
    assert.equal(last().lang, 'en-GB');
    assert.deepEqual(asr.langs, ['de-AT', 'tr-TR', 'en-GB']);
  });

  await t.test('setLang in parallel mode changes the leader without restarting anything', (t) => {
    const { asr, calls } = startParallel(t);
    asr.setLang('en-US');
    assert.ok(FakeSR.instances.every((r) => r.count('abort') === 0));
    assert.equal(FakeSR.instances.length, 3);
    byLang('de-DE').say('ich', { final: false });
    byLang('en-US').say('i', { final: false });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].meta.recognizer, 'en-US');
    byLang('tr-TR').say('yok artık abi');
    assert.equal(calls.length, 2, 'finals from other recognizers are still forwarded');
    assert.equal(asr.lang, 'en-US', 'pinned: the leader stays');
  });
});
