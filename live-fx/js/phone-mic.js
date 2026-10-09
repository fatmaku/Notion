// LiveFX – „🎙 Handy-Mikro“ (mobile.html): the phone is the speech input while the PC renders the effects.
// UMD: `window.LiveFXPhoneMic` / `module.exports`. No dependencies; every browser API is injectable (unit tests).
//
//   Recognizer  Web Speech on the phone (Chrome on Android, Safari on iOS). Browsers allow the microphone only in a
//               secure context: https (the internet link, docs/HANDY-HTTPS.md) or localhost – on the plain-http WLAN
//               link availability() answers `insecure` and the page explains the internet link instead.
//               Chrome stops after a few seconds of silence; the recognizer restarts by itself (short delay after
//               silence, growing backoff after errors) until stop().
//   Sender      Every recognized line goes to the PC: POST /api/transcript { text, final, lang, source: 'Handy-Mikro' }
//               with the paired-device cookie. The server relays it to every panel (`{type:'transcript'}`), where a
//               panel whose speech input is „Extern (POST /api/transcript)“ matches it with the PC's own settings. Finals are
//               queued (max 8), interim lines are coalesced (one request per INTERIM_MS at most, never two in flight).
//   Router      The phone runs the matcher as well (mobile.js passes `match`), and the router decides who fires:
//               a fire whose source starts with „Handy-Mikro:“ (the panel's format `<source>: „<word>“`) proves the
//               PC is matching these lines → the phone stays quiet. While that is unknown, the first hits wait HOLD_MS
//               for the PC and then fire from the phone (no panel listening = the phone fires, nothing is lost).
//               Three hit batches in a row without a PC fire → unknown again (the panel switched its input back).
//   Level       getUserMedia + AnalyserNode RMS (not on iOS, where a second capture interrupts Web Speech; and
//               released when the recognizer reports `audio-capture`); otherwise pulses from speech events.
//
//   pure:    availability(win), resolveLang(choice, navLang), langLabel(choice, navLang), levelFromSamples(buf), LANGS
//   parts:   createSender(opts), createRouter(opts), createRecognizer(opts), createLevel(opts)
//   wired:   create({ win, SpeechRecognition, fetch, lang, match, fire, onText, onState, onLevel, onError, onRoute })
//            → { start(), stop(), setLang(choice), observe(busMessage), state, lang, route, level, sender, router }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LiveFXPhoneMic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SOURCE = 'Handy-Mikro';
  const LANGS = Object.freeze([
    Object.freeze({ id: 'auto', label: 'Auto' }),
    Object.freeze({ id: 'de-DE', label: 'Deutsch' }),
    Object.freeze({ id: 'tr-TR', label: 'Türkçe' }),
    Object.freeze({ id: 'en-US', label: 'English' }),
  ]);
  const TRANSCRIPT_URL = '/api/transcript';
  const TEXT_MAX = 2000; // LiveFXSchema.LIMITS.transcriptChars
  const INTERIM_MS = 400;
  const QUEUE_MAX = 8;
  const HOLD_MS = 900; // phone → server → panel → server → phone, also through the tunnel
  const VERIFY_MS = 1800;
  const MISS_LIMIT = 3;
  const SILENCE_RESTART_MS = 150;
  const QUICK_END_MS = 1000;
  const ERROR_BACKOFF_MS = [500, 1000, 2000, 5000];
  const NETWORK_FATAL_AFTER = 5;
  const STOP_GRACE_MS = 1500;
  const LEVEL_TICK_MS = 80;

  const noop = () => {};

  function safe(fn, ...args) {
    if (typeof fn !== 'function') return undefined;
    try {
      return fn(...args);
    } catch (e) {
      if (typeof console !== 'undefined') console.error('LiveFXPhoneMic callback failed', e);
      return undefined;
    }
  }

  // ---------- pure helpers ----------

  /** { ok, reason: 'insecure' | 'unsupported' | null, SpeechRecognition } for a window-like object. */
  function availability(win) {
    const w = win || {};
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition || null;
    if (w.isSecureContext !== true) return { ok: false, reason: 'insecure', SpeechRecognition: SR };
    if (typeof SR !== 'function') return { ok: false, reason: 'unsupported', SpeechRecognition: null };
    return { ok: true, reason: null, SpeechRecognition: SR };
  }

  /** BCP-47 tag for a choice: 'auto' follows the phone's language (DE / TR / EN, everything else → Deutsch). */
  function resolveLang(choice, navLang) {
    if (typeof choice === 'string' && /^[a-z]{2}-[A-Z]{2}$/.test(choice)) return choice;
    const nav = String(navLang || 'de').toLowerCase();
    if (nav.startsWith('tr')) return 'tr-TR';
    if (nav.startsWith('en')) return nav === 'en-gb' ? 'en-GB' : 'en-US';
    return 'de-DE';
  }

  /** "Auto (Türkçe)", "Deutsch", … for the language picker. */
  function langLabel(choice, navLang) {
    const tag = resolveLang(choice, navLang);
    const fam = tag.slice(0, 2);
    const name = (LANGS.find((l) => l.id !== 'auto' && l.id.slice(0, 2) === fam) || { label: tag }).label;
    return choice === 'auto' || !choice ? `Auto (${name})` : name;
  }

  /** 0..1 loudness from time-domain samples (-60 dBFS → 0, -10 dBFS → 1). */
  function levelFromSamples(buf) {
    if (!buf || !buf.length) return 0;
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    if (!(rms > 0)) return 0;
    const db = 20 * Math.log10(rms);
    return Math.min(1, Math.max(0, (db + 60) / 50));
  }

  function timersOf(o) {
    return {
      setTimeout: (o && o.setTimeout) || ((fn, ms) => setTimeout(fn, ms)),
      clearTimeout: (o && o.clearTimeout) || ((t) => clearTimeout(t)),
      setInterval: (o && o.setInterval) || ((fn, ms) => setInterval(fn, ms)),
      clearInterval: (o && o.clearInterval) || ((t) => clearInterval(t)),
      now: (o && o.now) || (() => Date.now()),
    };
  }

  // ---------- sender: transcript lines → POST /api/transcript ----------

  function createSender(opts = {}) {
    const t = timersOf(opts);
    const doFetch = opts.fetch || (typeof fetch === 'function' ? (...a) => fetch(...a) : null);
    const url = opts.url || TRANSCRIPT_URL;
    const source = String(opts.source || SOURCE);
    const interimMs = Number.isFinite(opts.interimMs) ? opts.interimMs : INTERIM_MS;
    const maxQueue = Number.isFinite(opts.maxQueue) ? opts.maxQueue : QUEUE_MAX;
    const onStatus = opts.onStatus || noop;
    const queue = [];
    const stats = { sent: 0, failed: 0, dropped: 0, lastStatus: 0, authError: false };
    let interim = null;
    let lastInterimText = '';
    let lastInterimAt = -Infinity;
    let inFlight = false;
    let timer = null;
    let closed = false;

    function push(text, isFinal, lang) {
      if (closed) return false;
      const s = String(text == null ? '' : text).trim().slice(0, TEXT_MAX);
      if (!s) return false;
      const item = { text: s, final: !!isFinal, lang: typeof lang === 'string' ? lang.slice(0, 10) : '' };
      if (item.final) {
        queue.push(item);
        while (queue.length > maxQueue) {
          queue.shift();
          stats.dropped++;
        }
        interim = null; // the final supersedes every interim of the same sentence
        lastInterimText = '';
      } else {
        if (s === lastInterimText || (interim && interim.text === s)) return false;
        interim = item;
      }
      pump();
      return true;
    }

    function next() {
      if (queue.length) return queue.shift();
      if (!interim) return null;
      const wait = interimMs - (t.now() - lastInterimAt);
      if (wait > 0) {
        if (!timer) {
          timer = t.setTimeout(() => {
            timer = null;
            pump();
          }, wait);
        }
        return null;
      }
      const item = interim;
      interim = null;
      lastInterimText = item.text;
      lastInterimAt = t.now();
      return item;
    }

    function pump() {
      if (inFlight || closed || !doFetch) return;
      const item = next();
      if (!item) return;
      inFlight = true;
      const body = { text: item.text, final: item.final, source };
      if (item.lang) body.lang = item.lang;
      let p;
      try {
        p = Promise.resolve(
          doFetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          })
        );
      } catch (e) {
        p = Promise.reject(e);
      }
      p.then(
        (r) => {
          const status = (r && r.status) || 0;
          stats.lastStatus = status;
          if (r && r.ok) {
            stats.sent++;
            if (stats.authError) {
              stats.authError = false;
              safe(onStatus, { ok: true, status });
            }
          } else {
            stats.failed++;
            if (status === 401 || status === 403) stats.authError = true;
            safe(onStatus, { ok: false, status, authError: stats.authError });
          }
        },
        () => {
          stats.failed++;
          stats.lastStatus = 0;
          safe(onStatus, { ok: false, status: 0, network: true });
        }
      ).then(() => {
        inFlight = false;
        pump();
      });
    }

    function close() {
      closed = true;
      queue.length = 0;
      interim = null;
      if (timer) t.clearTimeout(timer);
      timer = null;
    }

    return {
      push,
      close,
      get pending() {
        return queue.length + (interim ? 1 : 0) + (inFlight ? 1 : 0);
      },
      get busy() {
        return inFlight;
      },
      stats,
    };
  }

  // ---------- router: who fires – the PC panel or the phone? ----------

  function createRouter(opts = {}) {
    const t = timersOf(opts);
    const prefix = `${String(opts.source || SOURCE)}:`;
    const holdMs = Number.isFinite(opts.holdMs) ? opts.holdMs : HOLD_MS;
    const verifyMs = Number.isFinite(opts.verifyMs) ? opts.verifyMs : VERIFY_MS;
    const missLimit = Number.isFinite(opts.missLimit) ? opts.missLimit : MISS_LIMIT;
    const onChange = opts.onChange || noop;
    let state = 'unknown'; // 'unknown' | 'pc' | 'phone'
    let pending = []; // [{ hit, fire }] held while unknown
    let holdTimer = null;
    let verifyTimer = null;
    let misses = 0;
    let pcSeen = false;
    const stats = { phoneFires: 0, held: 0, droppedForPc: 0, pcFires: 0 };

    function set(next) {
      if (next === state) return;
      state = next;
      safe(onChange, state);
    }

    function flush() {
      if (holdTimer) t.clearTimeout(holdTimer);
      holdTimer = null;
      const list = pending;
      pending = [];
      for (const p of list) {
        stats.phoneFires++;
        safe(p.fire, p.hit);
      }
    }

    function expectPc() {
      if (verifyTimer) return; // one verification window at a time
      pcSeen = false;
      verifyTimer = t.setTimeout(() => {
        verifyTimer = null;
        if (pcSeen) return;
        misses++;
        if (misses >= missLimit) {
          misses = 0;
          set('unknown');
        }
      }, verifyMs);
    }

    /** Hits of one recognized line; `fire(hit)` fires on the phone. Returns how many fired right away. */
    function hits(list, fire) {
      const arr = Array.isArray(list) ? list.filter(Boolean) : [];
      if (!arr.length) return 0;
      if (state === 'pc') {
        stats.droppedForPc += arr.length;
        expectPc();
        return 0;
      }
      if (state === 'phone') {
        for (const h of arr) {
          stats.phoneFires++;
          safe(fire, h);
        }
        return arr.length;
      }
      for (const h of arr) pending.push({ hit: h, fire });
      stats.held += arr.length;
      if (!holdTimer) {
        holdTimer = t.setTimeout(() => {
          holdTimer = null;
          set('phone');
          flush();
        }, holdMs);
      }
      return 0;
    }

    /** Bus messages: a fire „Handy-Mikro: …“ from the panel means the PC matches the phone's lines. */
    function observe(msg) {
      if (!msg || msg.type !== 'fire' || typeof msg.source !== 'string' || !msg.source.startsWith(prefix)) return false;
      stats.pcFires++;
      pcSeen = true;
      misses = 0;
      if (holdTimer) t.clearTimeout(holdTimer);
      holdTimer = null;
      stats.droppedForPc += pending.length;
      pending = [];
      set('pc');
      return true;
    }

    function reset() {
      if (holdTimer) t.clearTimeout(holdTimer);
      if (verifyTimer) t.clearTimeout(verifyTimer);
      holdTimer = null;
      verifyTimer = null;
      pending = [];
      misses = 0;
      set('unknown');
    }

    return {
      hits,
      observe,
      reset,
      flush,
      get state() {
        return state;
      },
      get pending() {
        return pending.length;
      },
      stats,
    };
  }

  // ---------- level: analyser RMS or speech-event pulses ----------

  function createLevel(opts = {}) {
    const t = timersOf(opts);
    const onLevel = opts.onLevel || noop;
    const getUserMedia = opts.getUserMedia || null;
    const AudioCtx = opts.AudioContext || null;
    let level = 0;
    let tick = null;
    let stream = null;
    let ctx = null;
    let analyser = null;
    let buf = null;
    let analyserOn = false;
    let starting = null;
    let disabled = !getUserMedia || !AudioCtx;

    function emit(v) {
      const n = Math.round(Math.min(1, Math.max(0, v)) * 100) / 100;
      if (n === level) return;
      level = n;
      safe(onLevel, level);
    }

    function loop() {
      if (tick) return;
      tick = t.setInterval(() => {
        if (analyserOn && analyser && buf) {
          analyser.getFloatTimeDomainData(buf);
          const v = levelFromSamples(buf);
          emit(v > level ? v : level * 0.6 + v * 0.4); // fast attack, slower release
          return;
        }
        if (level <= 0.02) {
          emit(0);
          t.clearInterval(tick);
          tick = null;
          return;
        }
        emit(level * 0.78);
      }, LEVEL_TICK_MS);
    }

    /** Speech-event fallback: lifts the bar, then it decays. Ignored while the analyser runs. */
    function pulse(v) {
      if (analyserOn) return;
      if (v > level) emit(v);
      loop();
    }

    function startAnalyser() {
      if (disabled || analyserOn || starting) return starting || Promise.resolve(false);
      starting = Promise.resolve()
        .then(() => getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }))
        .then((s) => {
          if (disabled) {
            for (const tr of s.getTracks ? s.getTracks() : []) tr.stop();
            return false;
          }
          stream = s;
          ctx = new AudioCtx();
          const src = ctx.createMediaStreamSource(s);
          analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          buf = new Float32Array(analyser.fftSize);
          src.connect(analyser);
          analyserOn = true;
          loop();
          return true;
        })
        .catch(() => {
          disabled = true; // no permission / busy: pulses only
          release();
          return false;
        })
        .then((ok) => {
          starting = null;
          return ok;
        });
      return starting;
    }

    function release() {
      analyserOn = false;
      analyser = null;
      buf = null;
      if (stream) {
        try {
          for (const tr of stream.getTracks ? stream.getTracks() : []) tr.stop();
        } catch (_) {
          /* gone */
        }
      }
      stream = null;
      if (ctx) {
        try {
          const p = ctx.close();
          if (p && typeof p.catch === 'function') p.catch(noop);
        } catch (_) {
          /* closed */
        }
      }
      ctx = null;
    }

    /** Releases the analyser for good (the recognizer could not get the microphone next to it). */
    function disable() {
      const had = analyserOn || !!starting;
      disabled = true;
      release();
      return had;
    }

    function stop() {
      release();
      if (tick) t.clearInterval(tick);
      tick = null;
      emit(0);
    }

    return {
      pulse,
      startAnalyser,
      disable,
      stop,
      get level() {
        return level;
      },
      get analyser() {
        return analyserOn;
      },
      get disabled() {
        return disabled;
      },
    };
  }

  // ---------- recognizer: Web Speech with automatic restarts ----------

  const MESSAGES = {
    unsupported: 'Dieser Browser kann keine Spracherkennung – Chrome (Android) oder Safari (iOS) nutzen.',
    insecure: 'Das Handy-Mikro braucht eine sichere Verbindung (https) – den Internet-Link nutzen.',
    'not-allowed': 'Mikrofon-Zugriff verweigert – im Browser für diese Seite erlauben (Schloss-Symbol → Mikrofon).',
    'service-not-allowed': 'Spracherkennung ist in diesem Browser gesperrt – Chrome (Android) oder Safari (iOS) nutzen.',
    'audio-capture': 'Kein Mikrofon gefunden – oder eine andere App (Kamera, Anruf) benutzt es gerade.',
    network: 'Spracherkennung braucht Internet am Handy (WLAN oder mobile Daten).',
    'language-not-supported': 'Diese Sprache kann der Browser nicht erkennen – andere Sprache wählen.',
    start: 'Mikro konnte nicht starten.',
  };

  function createRecognizer(opts = {}) {
    const t = timersOf(opts);
    const SR = typeof opts.SpeechRecognition === 'function' ? opts.SpeechRecognition : null;
    const onText = opts.onText || noop;
    const onState = opts.onState || noop;
    const onError = opts.onError || noop;
    const onEvent = opts.onEvent || noop;
    const onAudioCapture = opts.onAudioCapture || (() => false);
    let lang = opts.lang || 'de-DE';
    let state = SR ? 'idle' : 'unsupported';
    let rec = null;
    let wanted = false;
    let timer = null;
    let stopTimer = null;
    let gen = 0;
    let errors = 0;
    let netErrors = 0;
    let quickEnds = 0;
    let switching = false; // setLang() aborted the recognizer on purpose: restart at once
    const stats = { starts: 0, restarts: 0, finals: 0, interims: 0, lastError: null };

    function setState(s) {
      if (s === state) return;
      state = s;
      safe(onState, s);
    }

    function fatal(code) {
      wanted = false;
      if (timer) t.clearTimeout(timer);
      timer = null;
      stats.lastError = code;
      const r = rec;
      rec = null;
      gen++;
      if (r) {
        try {
          r.abort();
        } catch (_) {
          /* gone */
        }
      }
      setState('error');
      safe(onError, { code, message: MESSAGES[code] || `${MESSAGES.start} (${code})`, fatal: true });
    }

    function schedule(delay) {
      if (timer) t.clearTimeout(timer);
      setState('restarting');
      timer = t.setTimeout(() => {
        timer = null;
        if (wanted && !rec) spawn();
      }, delay);
    }

    function spawn() {
      const my = ++gen;
      let r;
      try {
        r = new SR();
      } catch (e) {
        fatal('start');
        return;
      }
      const startedAt = t.now();
      let gotResult = false;
      let lastError = null;
      r.lang = lang;
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;
      r.onstart = () => {
        if (my !== gen) return;
        setState('listening');
      };
      r.onaudiostart = () => {
        if (my !== gen) return;
        safe(onEvent, 'audiostart');
      };
      r.onsoundstart = () => my === gen && safe(onEvent, 'sound');
      r.onspeechstart = () => my === gen && safe(onEvent, 'speech');
      r.onresult = (e) => {
        if (my !== gen) return;
        gotResult = true;
        errors = 0;
        netErrors = 0;
        quickEnds = 0;
        const results = (e && e.results) || [];
        let interim = '';
        for (let i = Number(e && e.resultIndex) || 0; i < results.length; i++) {
          const res = results[i];
          const alt = res && res[0];
          const text = String((alt && alt.transcript) || '').trim();
          if (!text) continue;
          if (res.isFinal) {
            stats.finals++;
            safe(onText, text, true, { lang, confidence: alt && Number.isFinite(alt.confidence) ? alt.confidence : null });
          } else {
            interim += (interim ? ' ' : '') + text;
          }
        }
        if (interim) {
          stats.interims++;
          safe(onText, interim, false, { lang });
        }
        safe(onEvent, 'result');
      };
      r.onerror = (e) => {
        if (my !== gen) return;
        const code = String((e && e.error) || 'unknown');
        if (code === 'no-speech' || code === 'aborted') return; // silence / our own stop: onend restarts
        lastError = code;
        stats.lastError = code;
        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'language-not-supported') {
          fatal(code);
          return;
        }
        if (code === 'audio-capture') {
          // The level meter may hold the microphone: release it and let onend retry; otherwise give up.
          if (safe(onAudioCapture) === true) return;
          fatal(code);
          return;
        }
        if (code === 'network') {
          netErrors++;
          if (netErrors >= NETWORK_FATAL_AFTER) {
            fatal(code);
            return;
          }
        }
        safe(onError, { code, message: MESSAGES[code] || `Spracherkennung: ${code}`, fatal: false });
      };
      r.onend = () => {
        if (my !== gen) return;
        rec = null;
        if (stopTimer) t.clearTimeout(stopTimer);
        stopTimer = null;
        if (!wanted) {
          setState('idle');
          return;
        }
        stats.restarts++;
        if (switching) {
          switching = false;
          schedule(SILENCE_RESTART_MS);
          return;
        }
        if (lastError) {
          const d = ERROR_BACKOFF_MS[Math.min(errors, ERROR_BACKOFF_MS.length - 1)];
          errors++;
          schedule(d);
          return;
        }
        if (!gotResult && t.now() - startedAt < QUICK_END_MS) quickEnds++;
        else quickEnds = 0;
        schedule(quickEnds >= 3 ? 1000 : SILENCE_RESTART_MS);
      };
      rec = r;
      stats.starts++;
      try {
        r.start();
      } catch (e) {
        rec = null;
        if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) {
          fatal('not-allowed');
          return;
        }
        errors++;
        if (errors > ERROR_BACKOFF_MS.length + 2) {
          fatal('start');
          return;
        }
        schedule(ERROR_BACKOFF_MS[Math.min(errors - 1, ERROR_BACKOFF_MS.length - 1)]); // InvalidStateError while winding down
      }
    }

    function start() {
      if (!SR) {
        setState('unsupported');
        safe(onError, { code: 'unsupported', message: MESSAGES.unsupported, fatal: true });
        return false;
      }
      if (wanted) return true;
      wanted = true;
      errors = 0;
      netErrors = 0;
      quickEnds = 0;
      if (rec) return true; // still winding down from stop(): onend respawns
      setState('starting');
      spawn();
      return true;
    }

    function stop() {
      wanted = false;
      if (timer) t.clearTimeout(timer);
      timer = null;
      const r = rec;
      if (!r) {
        if (state !== 'unsupported') setState('idle');
        return;
      }
      try {
        r.stop(); // pending finals are still delivered, then onend → idle
      } catch (_) {
        /* not started */
      }
      if (stopTimer) t.clearTimeout(stopTimer);
      stopTimer = t.setTimeout(() => {
        stopTimer = null;
        if (rec !== r || wanted) return;
        gen++; // never fired onend: abort and forget it
        rec = null;
        try {
          r.abort();
        } catch (_) {
          /* gone */
        }
        setState('idle');
      }, STOP_GRACE_MS);
    }

    /** New language; a running recognizer is restarted at once (abort → onend → spawn with the new tag). */
    function setLang(tag) {
      if (!tag || tag === lang) return lang;
      lang = tag;
      if (rec && wanted) {
        switching = true;
        try {
          rec.abort();
        } catch (_) {
          /* ended */
        }
      }
      return lang;
    }

    return {
      start,
      stop,
      setLang,
      get state() {
        return state;
      },
      get lang() {
        return lang;
      },
      get wanted() {
        return wanted;
      },
      stats,
    };
  }

  // ---------- wired: recognizer + sender + router + level ----------

  function isAppleMobile(win) {
    const n = (win && win.navigator) || {};
    const ua = String(n.userAgent || '');
    return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && Number(n.maxTouchPoints) > 1);
  }

  function create(opts = {}) {
    const win = opts.win || (typeof window !== 'undefined' ? window : {});
    const nav = (win && win.navigator) || {};
    const avail = availability(win);
    const SR = opts.SpeechRecognition !== undefined ? opts.SpeechRecognition : avail.ok ? avail.SpeechRecognition : null;
    const source = String(opts.source || SOURCE);
    const match = opts.match || (() => []);
    const fire = opts.fire || noop;
    const onText = opts.onText || noop;
    const onState = opts.onState || noop;
    const onError = opts.onError || noop;
    const onRoute = opts.onRoute || noop;
    let choice = opts.lang || 'auto';
    const timers = { setTimeout: opts.setTimeout, clearTimeout: opts.clearTimeout, setInterval: opts.setInterval, clearInterval: opts.clearInterval, now: opts.now };

    const md = nav.mediaDevices;
    const wantMeter = opts.meter !== false && !isAppleMobile(win);
    const level = createLevel({
      ...timers,
      onLevel: opts.onLevel,
      getUserMedia: wantMeter ? opts.getUserMedia || (md && typeof md.getUserMedia === 'function' ? (c) => md.getUserMedia(c) : null) : null,
      AudioContext: wantMeter ? opts.AudioContext || win.AudioContext || win.webkitAudioContext || null : null,
    });
    const sender = createSender({ ...timers, fetch: opts.fetch || (typeof win.fetch === 'function' ? (...a) => win.fetch(...a) : undefined), source, onStatus: opts.onSend });
    const router = createRouter({ ...timers, source, holdMs: opts.holdMs, verifyMs: opts.verifyMs, onChange: (s) => safe(onRoute, s) });

    const rec = createRecognizer({
      ...timers,
      SpeechRecognition: SR,
      lang: resolveLang(choice, nav.language),
      onState: (s) => {
        if (s === 'idle' || s === 'error' || s === 'unsupported') level.stop();
        safe(onState, s);
      },
      onError,
      onAudioCapture: () => level.disable(),
      onEvent: (ev) => {
        if (ev === 'audiostart') level.startAnalyser();
        else if (ev === 'sound') level.pulse(0.25);
        else if (ev === 'speech') level.pulse(0.45);
        else if (ev === 'result') level.pulse(0.7);
      },
      onText: (text, isFinal, meta) => {
        sender.push(text, isFinal, meta.lang);
        let hits = [];
        try {
          hits = match(text, isFinal, meta) || [];
        } catch (e) {
          hits = [];
        }
        router.hits(hits, fire);
        safe(onText, text, isFinal, hits, meta);
      },
    });

    return {
      start() {
        router.reset();
        return rec.start();
      },
      stop() {
        rec.stop();
      },
      /** 'auto' | 'de-DE' | 'tr-TR' | 'en-US' – returns the resolved tag. */
      setLang(next) {
        choice = next || 'auto';
        return rec.setLang(resolveLang(choice, nav.language));
      },
      observe: (msg) => router.observe(msg),
      get state() {
        return rec.state;
      },
      get lang() {
        return rec.lang;
      },
      get choice() {
        return choice;
      },
      get route() {
        return router.state;
      },
      get level() {
        return level.level;
      },
      get meter() {
        return level.analyser ? 'analyser' : 'pulse';
      },
      availability: avail,
      sender,
      router,
      recognizer: rec,
    };
  }

  return {
    SOURCE,
    LANGS,
    MESSAGES,
    HOLD_MS,
    INTERIM_MS,
    availability,
    resolveLang,
    langLabel,
    levelFromSamples,
    createSender,
    createRouter,
    createLevel,
    createRecognizer,
    create,
  };
});
