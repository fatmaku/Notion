// js/phone-mic.js – „🎙 Handy-Mikro“: availability (https gate), language choice, level meter, transcript sender
// (POST /api/transcript, coalesced interims, auth errors), the PC-or-phone fire router and the Web Speech wrapper
// (auto-restart, fatal errors, audio-capture fallback) – all with a mock SpeechRecognition and a fake clock.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const PM = require('../js/phone-mic.js');

const flush = () => new Promise((r) => setImmediate(r));

/** Deterministic timers: advance(ms) runs everything due, in order. */
function fakeClock() {
  let now = 0;
  let seq = 0;
  const jobs = new Map(); // id -> { at, fn, every }
  const c = {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = ++seq;
      jobs.set(id, { at: now + Math.max(0, ms || 0), fn, every: 0 });
      return id;
    },
    clearTimeout: (id) => jobs.delete(id),
    setInterval: (fn, ms) => {
      const id = ++seq;
      jobs.set(id, { at: now + ms, fn, every: ms });
      return id;
    },
    clearInterval: (id) => jobs.delete(id),
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let nextId = null;
        let next = null;
        for (const [id, j] of jobs) if (j.at <= end && (!next || j.at < next.at)) [nextId, next] = [id, j];
        if (!next) break;
        now = next.at;
        if (next.every) next.at += next.every;
        else jobs.delete(nextId);
        next.fn();
      }
      now = end;
    },
    get pending() {
      return jobs.size;
    },
  };
  return c;
}

/** Mock Web Speech recognizer: records calls, the test drives the events. */
function mockSR() {
  const instances = [];
  class MockSpeechRecognition {
    constructor() {
      this.calls = [];
      instances.push(this);
    }
    start() {
      this.calls.push('start');
      if (MockSpeechRecognition.throwOnStart) {
        const e = new Error('busy');
        e.name = MockSpeechRecognition.throwOnStart;
        throw e;
      }
    }
    stop() {
      this.calls.push('stop');
    }
    abort() {
      this.calls.push('abort');
    }
    emitStart() {
      if (this.onstart) this.onstart();
      if (this.onaudiostart) this.onaudiostart();
    }
    emitResult(items, resultIndex = 0) {
      const results = items.map(([text, isFinal]) => {
        const r = [{ transcript: text, confidence: 0.9 }];
        r.isFinal = isFinal;
        return r;
      });
      this.onresult({ resultIndex, results });
    }
    emitError(code) {
      this.onerror({ error: code });
    }
    emitEnd() {
      this.onend();
    }
  }
  MockSpeechRecognition.instances = instances;
  MockSpeechRecognition.last = () => instances[instances.length - 1];
  return MockSpeechRecognition;
}

/** fetch mock: records requests, answers with `status` (or a function of the body). */
function mockFetch(status = 200) {
  const calls = [];
  const resolvers = [];
  const fn = (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    if (fn.manual) return new Promise((res) => resolvers.push(() => res({ ok: true, status: 200 })));
    const s = typeof status === 'function' ? status(JSON.parse(init.body)) : status;
    if (s === 0) return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve({ ok: s >= 200 && s < 300, status: s });
  };
  fn.calls = calls;
  fn.release = () => resolvers.shift()();
  return fn;
}

// ---------------------------------------------------------------- pure helpers

test('availability: http WLAN link = insecure, no Web Speech = unsupported, https + Web Speech = ok', () => {
  function SR() {}
  assert.deepEqual(PM.availability({ isSecureContext: false, webkitSpeechRecognition: SR }), { ok: false, reason: 'insecure', SpeechRecognition: SR });
  assert.equal(PM.availability({ isSecureContext: true }).reason, 'unsupported');
  const ok = PM.availability({ isSecureContext: true, webkitSpeechRecognition: SR });
  assert.equal(ok.ok, true);
  assert.equal(ok.SpeechRecognition, SR);
  assert.equal(PM.availability({ isSecureContext: true, SpeechRecognition: SR, webkitSpeechRecognition: () => {} }).SpeechRecognition, SR, 'standard name wins');
  assert.equal(PM.availability(null).reason, 'insecure');
  assert.match(PM.MESSAGES.insecure, /https/);
  assert.match(PM.MESSAGES.insecure, /Internet-Link/);
});

test('languages: TR / DE / EN / Auto; auto follows the phone language', () => {
  assert.deepEqual(PM.LANGS.map((l) => l.id), ['auto', 'de-DE', 'tr-TR', 'en-US']);
  assert.equal(PM.resolveLang('auto', 'tr-TR'), 'tr-TR');
  assert.equal(PM.resolveLang('auto', 'en-GB'), 'en-GB');
  assert.equal(PM.resolveLang('auto', 'en'), 'en-US');
  assert.equal(PM.resolveLang('auto', 'fr-FR'), 'de-DE', 'other languages fall back to German');
  assert.equal(PM.resolveLang(undefined, undefined), 'de-DE');
  assert.equal(PM.resolveLang('tr-TR', 'de-DE'), 'tr-TR', 'an explicit choice wins');
  assert.equal(PM.resolveLang('<script>', 'de'), 'de-DE', 'garbage is ignored');
  assert.equal(PM.langLabel('auto', 'tr'), 'Auto (Türkçe)');
  assert.equal(PM.langLabel('en-US', 'de'), 'English');
  assert.equal(PM.langLabel('de-DE'), 'Deutsch');
});

test('levelFromSamples: silence 0, full scale 1, monotonic in between', () => {
  assert.equal(PM.levelFromSamples(new Float32Array(256)), 0);
  assert.equal(PM.levelFromSamples(null), 0);
  const tone = (amp) => Float32Array.from({ length: 512 }, (_, i) => amp * Math.sin(i / 3));
  assert.equal(PM.levelFromSamples(tone(1)), 1);
  const quiet = PM.levelFromSamples(tone(0.003));
  const mid = PM.levelFromSamples(tone(0.05));
  assert.ok(quiet > 0 && quiet < mid && mid < 1, `${quiet} < ${mid}`);
});

// ---------------------------------------------------------------- sender

test('sender: finals go out in order with source „Handy-Mikro“ and the language; never two requests in flight', async () => {
  const clock = fakeClock();
  const f = mockFetch();
  f.manual = true;
  const s = PM.createSender({ fetch: f, ...clock });
  s.push('erste zeile', true, 'de-DE');
  s.push('zweite zeile', true, 'de-DE');
  s.push('   ', true, 'de-DE');
  assert.equal(f.calls.length, 1, 'one request in flight');
  assert.equal(f.calls[0].url, '/api/transcript');
  assert.equal(f.calls[0].init.method, 'POST');
  assert.equal(f.calls[0].init.credentials, 'same-origin', 'device cookie goes along');
  assert.equal(f.calls[0].init.headers['content-type'], 'application/json');
  assert.deepEqual(f.calls[0].body, { text: 'erste zeile', final: true, source: 'Handy-Mikro', lang: 'de-DE' });
  f.release();
  await flush();
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].body.text, 'zweite zeile');
  f.release();
  await flush();
  assert.equal(s.stats.sent, 2);
  assert.equal(s.pending, 0);
});

test('sender: interim lines are coalesced (latest wins, one per 400 ms), a final drops the waiting interim', async () => {
  const clock = fakeClock();
  const f = mockFetch();
  const s = PM.createSender({ fetch: f, ...clock });
  s.push('oh', false, 'de-DE');
  await flush();
  assert.deepEqual(f.calls.map((c) => [c.body.text, c.body.final]), [['oh', false]]);
  s.push('oh nein', false, 'de-DE');
  s.push('oh nein das', false, 'de-DE');
  await flush();
  assert.equal(f.calls.length, 1, 'throttled');
  clock.advance(400);
  await flush();
  assert.deepEqual(f.calls.map((c) => c.body.text), ['oh', 'oh nein das'], 'only the newest interim');
  s.push('oh nein das', false, 'de-DE');
  clock.advance(1000);
  await flush();
  assert.equal(f.calls.length, 2, 'an unchanged interim is not sent again');
  s.push('oh nein das war', false, 'de-DE'); // window passed: goes out at once
  s.push('oh nein das war ein', false, 'de-DE'); // throttled, waiting …
  s.push('oh nein das war ein fail', true, 'de-DE'); // … and replaced by the final
  await flush();
  clock.advance(1000);
  await flush();
  assert.deepEqual(
    f.calls.slice(2).map((c) => [c.body.text, c.body.final]),
    [
      ['oh nein das war', false],
      ['oh nein das war ein fail', true],
    ],
    'final replaces the waiting interim'
  );
});

test('sender: queue is capped, 401 reports an auth error, a network error is counted and the queue goes on', async () => {
  const clock = fakeClock();
  const statuses = [];
  let answer = 401;
  const f = mockFetch(() => answer);
  const s = PM.createSender({ fetch: f, ...clock, maxQueue: 3, onStatus: (x) => statuses.push(x) });
  s.push('a', true);
  await flush();
  assert.equal(s.stats.authError, true);
  assert.deepEqual(statuses[0], { ok: false, status: 401, authError: true });
  answer = 0;
  s.push('b', true);
  await flush();
  await flush();
  assert.equal(statuses[1].network, true);
  answer = 200;
  s.push('c', true);
  await flush();
  assert.equal(s.stats.authError, false, 'cleared by the next success');
  assert.deepEqual(statuses[2], { ok: true, status: 200 });
  f.manual = true;
  for (const t of ['1', '2', '3', '4', '5', '6']) s.push(t, true);
  assert.equal(s.stats.dropped, 2, 'oldest finals dropped beyond the cap (1 in flight + 3 queued)');
  s.close();
  assert.equal(s.push('later', true), false, 'closed sender ignores lines');
  assert.equal(s.stats.failed, 2);
});

// ---------------------------------------------------------------- router

test('router: no PC fire within the hold time → the phone fires (and keeps firing at once)', () => {
  const clock = fakeClock();
  const changes = [];
  const r = PM.createRouter({ ...clock, onChange: (s) => changes.push(s) });
  const fired = [];
  const fire = (h) => fired.push(h.id);
  assert.equal(r.state, 'unknown');
  assert.equal(r.hits([{ id: 'fail' }], fire), 0, 'held while unknown');
  assert.equal(r.pending, 1);
  clock.advance(PM.HOLD_MS - 1);
  assert.deepEqual(fired, []);
  clock.advance(1);
  assert.deepEqual(fired, ['fail']);
  assert.equal(r.state, 'phone');
  assert.equal(r.hits([{ id: 'wow' }, { id: 'lol' }], fire), 2, 'phone mode fires right away');
  assert.deepEqual(fired, ['fail', 'wow', 'lol']);
  assert.equal(r.hits([], fire), 0);
  assert.deepEqual(changes, ['phone']);
});

test('router: a panel fire „Handy-Mikro: …“ hands firing to the PC; three silent batches → unknown again', () => {
  const clock = fakeClock();
  const r = PM.createRouter({ ...clock });
  const fired = [];
  const fire = (h) => fired.push(h.id);
  r.hits([{ id: 'fail' }], fire);
  // foreign fires are ignored: tiles of the phone, the phone's own mic format (no colon), other sources
  assert.equal(r.observe({ type: 'fire', source: 'Handy', trigger: {} }), false);
  assert.equal(r.observe({ type: 'fire', source: 'Handy-Mikro „fail“' }), false);
  assert.equal(r.observe({ type: 'volume', source: 'Handy-Mikro: x' }), false);
  assert.equal(r.observe({ type: 'fire', source: 'Handy-Mikro: „fail“' }), true);
  assert.equal(r.state, 'pc');
  clock.advance(5000);
  assert.deepEqual(fired, [], 'held hit dropped – the PC fired it');
  // PC keeps answering → stays pc
  r.hits([{ id: 'wow' }], fire);
  r.observe({ type: 'fire', source: 'Handy-Mikro: „krass“ (≈ wow)' });
  clock.advance(5000);
  assert.equal(r.state, 'pc');
  // the panel stopped listening: three batches without an answer
  for (let i = 0; i < 3; i++) {
    r.hits([{ id: 'lol' }], fire);
    clock.advance(2000);
  }
  assert.equal(r.state, 'unknown');
  assert.deepEqual(fired, [], 'nothing fired twice');
  r.hits([{ id: 'gg' }], fire);
  clock.advance(PM.HOLD_MS);
  assert.deepEqual(fired, ['gg'], 'back to the phone');
  r.reset();
  assert.equal(r.state, 'unknown');
});

// ---------------------------------------------------------------- level

test('level: speech-event pulses decay to 0; analyser path reads RMS; disable() releases the microphone', async () => {
  const clock = fakeClock();
  const levels = [];
  const lv = PM.createLevel({ ...clock, onLevel: (v) => levels.push(v) });
  assert.equal(lv.disabled, true, 'no getUserMedia → pulses only');
  lv.pulse(0.7);
  assert.equal(lv.level, 0.7);
  clock.advance(2000);
  assert.equal(lv.level, 0, 'decayed');
  assert.ok(levels.length > 3 && levels[levels.length - 1] === 0);

  const stopped = [];
  const stream = { getTracks: () => [{ stop: () => stopped.push('track') }] };
  let closed = 0;
  class FakeCtx {
    createMediaStreamSource() {
      return { connect() {} };
    }
    createAnalyser() {
      return {
        fftSize: 0,
        getFloatTimeDomainData(buf) {
          for (let i = 0; i < buf.length; i++) buf[i] = 0.5 * Math.sin(i);
        },
      };
    }
    close() {
      closed++;
      return Promise.resolve();
    }
  }
  const lv2 = PM.createLevel({ ...clock, getUserMedia: async () => stream, AudioContext: FakeCtx });
  assert.equal(await lv2.startAnalyser(), true);
  assert.equal(lv2.analyser, true);
  clock.advance(200);
  assert.ok(lv2.level > 0.8, `analyser level ${lv2.level}`);
  lv2.pulse(0.1);
  assert.ok(lv2.level > 0.8, 'pulses ignored while the analyser runs');
  assert.equal(lv2.disable(), true);
  assert.deepEqual(stopped, ['track']);
  assert.equal(closed, 1);
  assert.equal(await lv2.startAnalyser(), false, 'stays off');

  const lv3 = PM.createLevel({ ...clock, getUserMedia: async () => Promise.reject(new Error('NotAllowed')), AudioContext: FakeCtx });
  assert.equal(await lv3.startAnalyser(), false);
  assert.equal(lv3.disabled, true, 'permission denied → pulses');
});

// ---------------------------------------------------------------- recognizer

test('recognizer: continuous + interim results, finals and interims reach onText, restarts after silence', () => {
  const clock = fakeClock();
  const SR = mockSR();
  const texts = [];
  const states = [];
  const rec = PM.createRecognizer({ ...clock, SpeechRecognition: SR, lang: 'tr-TR', onText: (t, f, m) => texts.push([t, f, m.lang]), onState: (s) => states.push(s) });
  assert.equal(rec.state, 'idle');
  assert.equal(rec.start(), true);
  const r1 = SR.last();
  assert.equal(r1.lang, 'tr-TR');
  assert.equal(r1.continuous, true);
  assert.equal(r1.interimResults, true);
  assert.deepEqual(r1.calls, ['start']);
  r1.emitStart();
  assert.equal(rec.state, 'listening');
  r1.emitResult([['yok artık', false]]);
  r1.emitResult([['yok artık', true], ['helal', false]]);
  r1.emitResult([['yok artık', true], ['helal olsun', true]], 1);
  assert.deepEqual(texts, [
    ['yok artık', false, 'tr-TR'],
    ['yok artık', true, 'tr-TR'],
    ['helal', false, 'tr-TR'],
    ['helal olsun', true, 'tr-TR'],
  ]);
  // Chrome ends after silence: restart shortly, as long as the mic is wanted
  r1.emitError('no-speech');
  r1.emitEnd();
  assert.equal(rec.state, 'restarting');
  assert.equal(SR.instances.length, 1);
  clock.advance(200);
  assert.equal(SR.instances.length, 2, 'new recognizer after silence');
  SR.last().emitStart();
  assert.equal(rec.state, 'listening');
  assert.equal(rec.stats.restarts, 1);
  // stop → recognizer.stop(), onend → idle, no restart
  rec.stop();
  assert.deepEqual(SR.last().calls, ['start', 'stop']);
  SR.last().emitEnd();
  assert.equal(rec.state, 'idle');
  clock.advance(5000);
  assert.equal(SR.instances.length, 2);
  assert.deepEqual(states, ['starting', 'listening', 'restarting', 'listening', 'idle']);
});

test('recognizer: quick empty ends back off, setLang restarts with the new language, stop without onend aborts', () => {
  const clock = fakeClock();
  const SR = mockSR();
  const rec = PM.createRecognizer({ ...clock, SpeechRecognition: SR, lang: 'de-DE' });
  rec.start();
  for (let i = 0; i < 3; i++) {
    SR.last().emitStart();
    SR.last().emitEnd(); // ended at once, nothing heard
    clock.advance(i < 2 ? 150 : 0);
  }
  assert.equal(SR.instances.length, 3);
  clock.advance(500);
  assert.equal(SR.instances.length, 3, 'third quick end waits longer');
  clock.advance(500);
  assert.equal(SR.instances.length, 4);
  SR.last().emitStart();
  assert.equal(rec.setLang('en-US'), 'en-US');
  assert.deepEqual(SR.last().calls, ['start', 'abort']);
  SR.last().emitEnd();
  clock.advance(200);
  assert.equal(SR.last().lang, 'en-US', 'restarted in English');
  rec.stop();
  clock.advance(1600); // the browser never fired onend
  assert.equal(rec.state, 'idle');
  assert.ok(SR.last().calls.includes('abort'));
});

test('recognizer: not-allowed is fatal (no restart loop), network errors back off and give up after five', () => {
  const clock = fakeClock();
  const SR = mockSR();
  const errors = [];
  const rec = PM.createRecognizer({ ...clock, SpeechRecognition: SR, onError: (e) => errors.push(e) });
  rec.start();
  SR.last().emitStart();
  SR.last().emitError('not-allowed');
  SR.last().emitEnd();
  assert.equal(rec.state, 'error');
  assert.equal(errors[0].fatal, true);
  assert.match(errors[0].message, /Mikrofon-Zugriff verweigert/);
  clock.advance(10000);
  assert.equal(SR.instances.length, 1, 'no restart after a permission error');

  errors.length = 0;
  rec.start();
  for (let i = 0; i < 5; i++) {
    const r = SR.last();
    r.emitStart();
    r.emitError('network');
    if (rec.state === 'error') break;
    r.emitEnd();
    clock.advance(6000);
  }
  assert.equal(rec.state, 'error');
  assert.deepEqual(errors.map((e) => e.fatal), [false, false, false, false, true]);
  assert.match(errors[4].message, /Internet/);
});

test('recognizer: audio-capture releases the level meter once and retries; without a meter it is fatal', () => {
  const clock = fakeClock();
  const SR = mockSR();
  let meterHeld = true;
  const errors = [];
  const rec = PM.createRecognizer({
    ...clock,
    SpeechRecognition: SR,
    onError: (e) => errors.push(e.code),
    onAudioCapture: () => {
      const had = meterHeld;
      meterHeld = false;
      return had;
    },
  });
  rec.start();
  SR.last().emitError('audio-capture');
  SR.last().emitEnd();
  assert.equal(rec.state, 'restarting');
  clock.advance(1000);
  assert.equal(SR.instances.length, 2, 'retried without the meter');
  SR.last().emitError('audio-capture');
  assert.equal(rec.state, 'error');
  assert.deepEqual(errors, ['audio-capture']);

  const none = PM.createRecognizer({ SpeechRecognition: null, onError: (e) => errors.push(e.code) });
  assert.equal(none.state, 'unsupported');
  assert.equal(none.start(), false);
  assert.equal(errors[errors.length - 1], 'unsupported');
});

test('recognizer: start() throwing InvalidStateError retries, NotAllowedError is fatal', () => {
  const clock = fakeClock();
  const SR = mockSR();
  SR.throwOnStart = 'InvalidStateError';
  const rec = PM.createRecognizer({ ...clock, SpeechRecognition: SR });
  rec.start();
  assert.equal(rec.state, 'restarting');
  SR.throwOnStart = null;
  clock.advance(600);
  assert.equal(SR.instances.length, 2);
  SR.last().emitStart();
  assert.equal(rec.state, 'listening');
  rec.stop();
  SR.last().emitEnd();
  SR.throwOnStart = 'NotAllowedError';
  rec.start();
  assert.equal(rec.state, 'error');
});

// ---------------------------------------------------------------- wired

test('create: speech → /api/transcript + phone matcher → router → fire; a panel fire hands over to the PC', async () => {
  const clock = fakeClock();
  const SR = mockSR();
  const f = mockFetch();
  const fired = [];
  const shown = [];
  const routes = [];
  const win = { isSecureContext: true, webkitSpeechRecognition: SR, navigator: { language: 'de-DE', userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129 Mobile' } };
  const mic = PM.create({
    win,
    fetch: f,
    ...clock,
    match: (text) => (/fail/.test(text) ? [{ trigger: { id: 'fail', label: 'Fail' }, keyword: 'fail', spoken: 'fail' }] : []),
    fire: (h) => fired.push(h.trigger.id),
    onText: (text, isFinal, hits) => shown.push([text, isFinal, hits.length]),
    onRoute: (s) => routes.push(s),
  });
  assert.equal(mic.availability.ok, true);
  assert.equal(mic.lang, 'de-DE', 'auto → phone language');
  assert.equal(mic.state, 'idle');
  mic.start();
  SR.last().emitStart();
  assert.equal(mic.state, 'listening');
  SR.last().emitResult([['oh nein das war ein fail', true]]);
  await flush();
  assert.deepEqual(f.calls.map((c) => c.body), [{ text: 'oh nein das war ein fail', final: true, source: 'Handy-Mikro', lang: 'de-DE' }]);
  assert.deepEqual(shown, [['oh nein das war ein fail', true, 1]]);
  assert.deepEqual(fired, [], 'waits for the PC first');
  clock.advance(PM.HOLD_MS);
  assert.deepEqual(fired, ['fail'], 'no panel matched → the phone fired');
  assert.equal(mic.route, 'phone');
  assert.ok(mic.level > 0, 'result pulse moved the level bar');

  // the panel switches to „Externe Transkripte“: its fire arrives on the bus → phone stops firing
  mic.observe({ type: 'fire', source: 'Handy-Mikro: „fail“', trigger: { id: 'fail' } });
  assert.equal(mic.route, 'pc');
  SR.last().emitResult([['noch ein fail', true]]);
  clock.advance(PM.HOLD_MS);
  assert.deepEqual(fired, ['fail'], 'PC fires now, the phone does not double it');
  assert.deepEqual(routes, ['phone', 'pc']);

  // language switch: Türkçe restarts the recognizer
  assert.equal(mic.setLang('tr-TR'), 'tr-TR');
  assert.equal(mic.choice, 'tr-TR');
  SR.last().emitEnd();
  clock.advance(200);
  assert.equal(SR.last().lang, 'tr-TR');
  mic.stop();
  SR.last().emitEnd();
  assert.equal(mic.state, 'idle');
  assert.equal(mic.level, 0, 'level bar resets when the mic stops');
  mic.start();
  assert.equal(mic.route, 'unknown', 'a new session asks again who fires');
});

test('create: insecure page → no recognizer (the page shows the internet-link hint instead)', () => {
  const errors = [];
  const mic = PM.create({ win: { isSecureContext: false, webkitSpeechRecognition: mockSR(), navigator: {} }, onError: (e) => errors.push(e.code) });
  assert.equal(mic.availability.reason, 'insecure');
  assert.equal(mic.state, 'unsupported');
  assert.equal(mic.start(), false);
  assert.deepEqual(errors, ['unsupported']);
});

test('create: no analyser on iPhone (Web Speech owns the microphone there), analyser elsewhere', async () => {
  const SR = mockSR();
  let asked = 0;
  const md = { getUserMedia: async () => (asked++, { getTracks: () => [] }) };
  class Ctx {
    createMediaStreamSource() {
      return { connect() {} };
    }
    createAnalyser() {
      return { getFloatTimeDomainData() {} };
    }
    close() {}
  }
  const iphone = PM.create({ win: { isSecureContext: true, webkitSpeechRecognition: SR, AudioContext: Ctx, navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)', mediaDevices: md } } });
  iphone.start();
  SR.last().emitStart();
  await flush();
  assert.equal(asked, 0);
  assert.equal(iphone.meter, 'pulse');
  iphone.stop();
  const android = PM.create({ win: { isSecureContext: true, webkitSpeechRecognition: SR, AudioContext: Ctx, navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14)', mediaDevices: md } } });
  android.start();
  SR.last().emitStart();
  await flush();
  await flush();
  assert.equal(asked, 1);
  assert.equal(android.meter, 'analyser');
  android.stop();
  SR.last().emitEnd();
  assert.equal(android.meter, 'pulse', 'microphone released on stop');
});
