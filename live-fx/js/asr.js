// LiveFX – speech-recognition backends behind one tiny interface (docs/CONTRACTS.md §6).
//
//   webspeech  Chrome/Edge Web Speech API. One live recognizer per "generation"; Chrome stops after
//              silence / ~60 s, so we restart with a backoff that grows while no result arrives.
//              Optional robustness helpers: N-best alternatives on final results, a planned restart
//              every `restartEveryMs` (only in a speech gap – long sessions degrade in Chrome) and a
//              stall watchdog (`stallMs` without any result while listening -> kill + respawn).
//   external   Anything that can POST /api/transcript (Whisper, a phone app, …). The server relays
//              the text to every panel over the bus; this backend just subscribes to it.
//   whisper    Offline, experimental: mic -> 16 kHz PCM -> energy VAD -> js/whisper-worker.js
//              (transformers.js from /vendor, ONNX model from /models – see docs/OFFLINE.md).
//   auto       DE/TR/EN without a fixed language: composes webspeech recognizers and switches the
//              language from what js/langdetect.js hears (one recognizer, swapped in a speech gap) or
//              runs one recognizer per language in parallel where the browser allows it (LiveFX 1.5).
//
//   const asr = LiveFXASR.create('webspeech', { lang, bus, onText, onState, onError,
//                                               alternatives, restartEveryMs, stallMs, voiceActivity, onEvent });
//   asr.start(); asr.setLang('en-US'); asr.setOptions({ alternatives: true }); asr.stats; asr.stop();
//   LiveFXASR.create('auto', { langs: ['de-DE', 'tr-TR', 'en-US'], window: 3, switchAfter: 2, parallel: 'try', ... });
(function (global) {
  'use strict';

  const BACKOFF_MS = [0, 250, 1000, 2000, 5000, 10000];
  const NETWORK_FATAL_AFTER = 5;
  const FATAL_ERRORS = ['not-allowed', 'service-not-allowed', 'audio-capture'];
  const IGNORED_ERRORS = ['no-speech', 'aborted'];

  const ALTERNATIVES_N = 3; // rec.maxAlternatives when `alternatives` is on
  const DEFAULT_STALL_MS = 20000;
  const RESTART_GAP_MS = 1500; // a result younger than this means "still speaking" -> defer the planned restart
  const RESTART_DEFER_STEP_MS = 1000;
  const RESTART_DEFER_MAX_MS = 10000; // after this much deferring the planned restart happens anyway
  const PLANNED_STOP_GRACE_MS = 3000; // rec.stop() without onend within this -> abort + respawn
  const STALL_TICK_MS = 1000; // sampling interval for `voiceActivity` while the watchdog runs

  function speechCtor() {
    if (typeof global === 'undefined') return null;
    return global.SpeechRecognition || global.webkitSpeechRecognition || null;
  }

  function noop() {}

  function now() {
    const p = global.performance;
    return p && typeof p.now === 'function' ? p.now() : Date.now();
  }

  function safe(fn, ...args) {
    try {
      fn(...args);
    } catch (e) {
      if (global.console) console.error('LiveFXASR callback failed', e);
    }
  }

  function makeStats() {
    return { results: 0, finals: 0, restarts: 0, plannedRestarts: 0, stalls: 0, lastResultAt: null, lastFinalAt: null, startedAt: null };
  }

  class Base {
    constructor(name, opts) {
      this.name = name;
      this._lang = opts.lang || 'de-DE';
      this._onText = typeof opts.onText === 'function' ? opts.onText : noop;
      this._onState = typeof opts.onState === 'function' ? opts.onState : noop;
      this._onError = typeof opts.onError === 'function' ? opts.onError : noop;
      this._onEvent = typeof opts.onEvent === 'function' ? opts.onEvent : null;
      this._stats = makeStats();
      this._state = 'idle';
    }

    get state() {
      return this._state;
    }

    get lang() {
      return this._lang;
    }

    /** Live counters (the object is stable; read fields when needed). */
    get stats() {
      return this._stats;
    }

    /** Backends without tunables ignore this. */
    setOptions() {}

    _setState(s) {
      if (this._state === s) return;
      this._state = s;
      safe(this._onState, s);
    }

    _error(code, message, fatal) {
      safe(this._onError, { code, message: message || code, fatal: !!fatal });
    }

    _event(type, extra) {
      if (!this._onEvent) return;
      safe(this._onEvent, Object.assign({ type, at: now() }, extra || {}));
    }

    _countResult(isFinal, at) {
      const s = this._stats;
      s.results++;
      s.lastResultAt = at;
      if (isFinal) {
        s.finals++;
        s.lastFinalAt = at;
      }
    }
  }

  // ---------------------------------------------------------------- webspeech
  class WebSpeech extends Base {
    constructor(opts) {
      super('webspeech', opts);
      this._rec = null; // the current generation; stale recognizers are ignored via `rec !== this._rec`
      this._active = false;
      this._restarts = 0; // consecutive restarts without a result (backoff index)
      this._netErrors = 0; // consecutive network errors
      this._timer = null; // backoff / respawn timer
      this._restartTimer = null; // planned-restart timer (armed in onstart)
      this._stallTimer = null; // stall watchdog
      this._planned = false; // the current generation was stopped on purpose (planned restart)
      this._deferredMs = 0; // how long the pending planned restart has been deferred
      this._voiceAt = null; // last time `voiceActivity()` returned true (sampled by the watchdog)
      this._alternatives = false;
      this._restartEveryMs = 0;
      this._stallMs = DEFAULT_STALL_MS;
      this._voiceActivity = typeof opts.voiceActivity === 'function' ? opts.voiceActivity : null;
      // Internal (backend `auto`): every engine error code before the ignore/fatal filtering.
      this._onRawError = typeof opts.onRawError === 'function' ? opts.onRawError : null;
      this._applyOptions(opts);
      if (!speechCtor()) this._state = 'unsupported';
    }

    _applyOptions(o) {
      if (!o || typeof o !== 'object') return {};
      const changed = {};
      if ('alternatives' in o) {
        const v = !!o.alternatives;
        if (v !== this._alternatives) changed.alternatives = true;
        this._alternatives = v;
      }
      if ('restartEveryMs' in o) {
        const v = Math.max(0, Number(o.restartEveryMs) || 0);
        if (v !== this._restartEveryMs) changed.restartEveryMs = true;
        this._restartEveryMs = v;
      }
      if ('stallMs' in o) {
        const v = Math.max(0, Number(o.stallMs) || 0);
        if (v !== this._stallMs) changed.stallMs = true;
        this._stallMs = v;
      }
      return changed;
    }

    get options() {
      return { alternatives: this._alternatives, restartEveryMs: this._restartEveryMs, stallMs: this._stallMs };
    }

    /** Live option change. `alternatives` needs a fresh recognizer (maxAlternatives is read at start()). */
    setOptions(o) {
      const changed = this._applyOptions(o);
      if (!this._active || !this._rec) return;
      if (changed.alternatives) {
        this._clearTimer();
        this._kill();
        this._spawn();
        return;
      }
      if (this._state === 'listening') {
        if (changed.restartEveryMs) this._armRestart();
        if (changed.stallMs) this._armStall();
      }
    }

    start() {
      if (this._state === 'unsupported' || !speechCtor()) {
        this._setState('unsupported');
        this._error('unsupported', 'Dieser Browser kann keine Spracherkennung. Bitte Chrome oder Edge nutzen.', true);
        return;
      }
      if (this._active) return;
      this._active = true;
      this._restarts = 0;
      this._netErrors = 0;
      this._stats = makeStats();
      this._spawn();
    }

    stop() {
      this._shutdown();
      this._setState('idle');
    }

    _shutdown() {
      this._active = false;
      this._clearTimer();
      this._kill();
    }

    setLang(lang) {
      if (!lang || lang === this._lang) return;
      this._lang = lang;
      if (!this._active) return;
      // Swap the recognizer: abort the old generation (its handlers become no-ops), start a new one.
      this._clearTimer();
      this._kill();
      this._restarts = 0;
      this._spawn();
    }

    _clearTimer() {
      if (this._timer) clearTimeout(this._timer);
      this._timer = null;
    }

    _clearWatchdogs() {
      if (this._restartTimer) clearTimeout(this._restartTimer);
      if (this._stallTimer) clearTimeout(this._stallTimer);
      this._restartTimer = null;
      this._stallTimer = null;
      this._planned = false;
      this._deferredMs = 0;
    }

    /** Aborts and forgets the current recognizer. Never leaves two live ones behind. */
    _kill() {
      this._clearWatchdogs();
      const rec = this._rec;
      this._rec = null;
      if (!rec) return;
      try {
        rec.abort();
      } catch (_) {
        /* already stopped */
      }
    }

    // ---- planned restart -------------------------------------------------------------------
    _armRestart() {
      if (this._restartTimer) clearTimeout(this._restartTimer);
      this._restartTimer = null;
      this._deferredMs = 0;
      if (!(this._restartEveryMs > 0)) return;
      this._restartTimer = setTimeout(() => this._plannedRestart(), this._restartEveryMs);
    }

    _plannedRestart() {
      this._restartTimer = null;
      const rec = this._rec;
      if (!this._active || !rec || this._planned) return;
      const t = now();
      const speaking = (this._stats.lastResultAt != null && t - this._stats.lastResultAt < RESTART_GAP_MS) || this._voiceNow();
      if (speaking && this._deferredMs < RESTART_DEFER_MAX_MS) {
        // Do not cut a sentence: try again in a moment (bounded, so a noisy room cannot block forever).
        this._deferredMs += RESTART_DEFER_STEP_MS;
        this._restartTimer = setTimeout(() => this._plannedRestart(), RESTART_DEFER_STEP_MS);
        return;
      }
      this._planned = true;
      try {
        rec.stop(); // graceful: pending finals are still delivered, then onend respawns with delay 0
      } catch (_) {
        this._kill();
        this._respawnPlanned();
        return;
      }
      // Chrome occasionally never fires onend after stop(); abort in that case.
      this._restartTimer = setTimeout(() => {
        this._restartTimer = null;
        if (rec !== this._rec || !this._active) return;
        this._kill();
        this._respawnPlanned();
      }, PLANNED_STOP_GRACE_MS);
    }

    _respawnPlanned() {
      this._stats.restarts++;
      this._stats.plannedRestarts++;
      this._event('planned-restart', { restarts: this._stats.restarts });
      this._setState('restarting');
      this._clearTimer();
      this._timer = setTimeout(() => {
        this._timer = null;
        if (this._active && !this._rec) this._spawn(true);
      }, 0);
    }

    // ---- stall watchdog --------------------------------------------------------------------
    _voiceNow() {
      if (!this._voiceActivity) return false;
      let v = false;
      try {
        v = !!this._voiceActivity();
      } catch (_) {
        v = false;
      }
      if (v) this._voiceAt = now();
      return v;
    }

    _armStall() {
      if (this._stallTimer) clearTimeout(this._stallTimer);
      this._stallTimer = null;
      if (!(this._stallMs > 0)) return;
      // With a meter we sample voice activity every second; without one a single shot is enough.
      const delay = this._voiceActivity ? Math.min(STALL_TICK_MS, this._stallMs) : this._stallMs;
      this._stallTimer = setTimeout(() => this._stallTick(), delay);
    }

    _stallTick() {
      this._stallTimer = null;
      if (!this._active || !this._rec || this._state !== 'listening' || this._planned) return;
      this._voiceNow();
      const s = this._stats;
      const since = s.lastResultAt != null ? s.lastResultAt : s.startedAt != null ? s.startedAt : now();
      const idleMs = now() - since;
      const voiceSeen = !this._voiceActivity || (this._voiceAt != null && this._voiceAt > since);
      if (idleMs >= this._stallMs && voiceSeen) {
        s.stalls++;
        s.restarts++;
        this._error('stalled', 'Erkennung hängt – Neustart', false);
        this._event('stall', { idleMs, stalls: s.stalls });
        this._kill();
        this._spawn(true);
        return;
      }
      const remaining = Math.max(0, this._stallMs - idleMs);
      // Overdue but no voice seen yet (meter present): keep sampling every second.
      const delay = this._voiceActivity ? (remaining > 0 ? Math.min(STALL_TICK_MS, remaining) : STALL_TICK_MS) : Math.max(remaining, 1);
      this._stallTimer = setTimeout(() => this._stallTick(), delay);
    }

    // ---- recognizer generation -------------------------------------------------------------
    /** Creates the next recognizer generation; `restart` marks a respawn (planned, stalled, backoff). */
    _spawn(restart) {
      const SR = speechCtor();
      if (!SR || !this._active) return;
      this._kill();
      const rec = new SR();
      rec.lang = this._lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = this._alternatives ? ALTERNATIVES_N : 1;
      this._rec = rec;
      this._stats.startedAt = now();
      this._setState(restart || this._restarts > 0 ? 'restarting' : 'starting');

      rec.onstart = () => {
        if (rec !== this._rec) return;
        this._stats.startedAt = now();
        this._setState('listening');
        this._armRestart();
        this._armStall();
      };
      rec.onresult = (ev) => {
        if (rec !== this._rec) return;
        this._restarts = 0;
        this._netErrors = 0;
        const at = now();
        const finals = []; // primary transcript per final result in this event
        const altsPer = []; // alternatives per final result (same index as `finals`)
        let confidence = null;
        let interim = '';
        const results = ev && ev.results ? ev.results : [];
        for (let i = (ev && ev.resultIndex) || 0; i < results.length; i++) {
          const r = results[i];
          if (!r || !r[0]) continue;
          if (r.isFinal) {
            finals.push(r[0].transcript);
            if (typeof r[0].confidence === 'number') confidence = confidence == null ? r[0].confidence : Math.min(confidence, r[0].confidence);
            const alts = [];
            for (let k = 1; k < (r.length || 0); k++) if (r[k] && typeof r[k].transcript === 'string') alts.push(r[k].transcript);
            altsPer.push(alts);
          } else {
            interim += r[0].transcript + ' '; // Chrome delivers interim chunks without a leading space
          }
        }
        const isFinal = finals.length > 0;
        const current = (isFinal ? finals.join(' ') : interim).replace(/\s+/g, ' ').trim();
        if (!current) return;
        this._countResult(isFinal, at);
        this._armStall();
        const meta = { source: 'Mikro', lang: this._lang, at };
        if (isFinal && confidence != null) meta.confidence = confidence;
        if (isFinal && this._alternatives) {
          // N-best: substitute each result's alternative into the sentence; dedupe, drop the primary.
          const seen = new Set([current]);
          const alternatives = [];
          finals.forEach((_, j) => {
            for (const alt of altsPer[j]) {
              const parts = finals.slice();
              parts[j] = alt;
              const text = parts.join(' ').replace(/\s+/g, ' ').trim();
              if (!text || seen.has(text)) continue;
              seen.add(text);
              alternatives.push(text);
            }
          });
          meta.alternatives = alternatives;
        }
        this._event(isFinal ? 'final' : 'result', { text: current, isFinal });
        safe(this._onText, current, isFinal, meta);
      };
      rec.onerror = (e) => {
        if (rec !== this._rec) return;
        const code = (e && e.error) || 'unknown';
        if (this._onRawError) safe(this._onRawError, code);
        if (IGNORED_ERRORS.includes(code)) return;
        if (FATAL_ERRORS.includes(code)) {
          this._error(code, code === 'audio-capture' ? 'Kein Mikrofon gefunden.' : 'Mikrofon-Zugriff verweigert.', true);
          this._shutdown();
          this._setState('error');
          return;
        }
        if (code === 'network') {
          this._netErrors++;
          if (this._netErrors >= NETWORK_FATAL_AFTER) {
            this._error(code, 'Spracherkennung: Netzwerkfehler (Google-Dienst nicht erreichbar).', true);
            this._shutdown();
            this._setState('error');
            return;
          }
          this._error(code, 'Spracherkennung: Netzwerkfehler, neuer Versuch …', false);
          return; // onend follows and schedules the backoff restart
        }
        this._error(code, `Spracherkennung: ${code}`, false);
      };
      rec.onend = () => {
        if (rec !== this._rec) return;
        const planned = this._planned;
        this._rec = null;
        this._clearWatchdogs();
        if (!this._active) return;
        if (planned) {
          this._respawnPlanned();
          return;
        }
        // Chrome ends the session after silence / ~60 s: restart, slower while nothing is heard.
        const delay = BACKOFF_MS[Math.min(this._restarts, BACKOFF_MS.length - 1)];
        this._restarts++;
        this._stats.restarts++;
        this._event('restart', { delay, restarts: this._stats.restarts });
        this._setState('restarting');
        this._clearTimer();
        this._timer = setTimeout(() => {
          this._timer = null;
          if (this._active && !this._rec) this._spawn(true);
        }, delay);
      };

      try {
        rec.start();
      } catch (e) {
        // InvalidStateError when a previous instance is still winding down: retry via onend path.
        if (rec !== this._rec) return;
        this._rec = null;
        this._clearWatchdogs();
        const delay = BACKOFF_MS[Math.min(this._restarts + 1, BACKOFF_MS.length - 1)];
        this._restarts++;
        this._stats.restarts++;
        this._event('restart', { delay, restarts: this._stats.restarts });
        this._setState('restarting');
        this._clearTimer();
        this._timer = setTimeout(() => {
          this._timer = null;
          if (this._active && !this._rec) this._spawn(true);
        }, delay);
      }
    }
  }

  // ---------------------------------------------------------------- external
  class External extends Base {
    constructor(opts) {
      super('external', opts);
      this._bus = opts.bus || null;
      this._unsub = null;
      if (!External.supported(this._bus)) this._state = 'unsupported';
    }

    static supported(bus) {
      return !!bus && bus.serverBase !== null && bus.serverBase !== undefined && typeof bus.onMessage === 'function';
    }

    start() {
      if (!External.supported(this._bus)) {
        this._setState('unsupported');
        this._error('unsupported', 'Externe Spracherkennung braucht server.js (nicht über file:// nutzbar).', true);
        return;
      }
      if (this._unsub) return;
      this._stats = makeStats();
      this._stats.startedAt = now();
      this._unsub = this._bus.onMessage((m) => {
        if (!m || m.type !== 'transcript' || typeof m.text !== 'string') return;
        const isFinal = m.final !== false;
        const at = now();
        this._countResult(isFinal, at);
        this._event(isFinal ? 'final' : 'result', { text: m.text, isFinal });
        safe(this._onText, m.text, isFinal, { source: m.source || 'Extern', lang: m.lang, at });
      });
      this._setState('listening');
    }

    stop() {
      if (this._unsub) {
        try {
          this._unsub();
        } catch (_) {
          /* ignore */
        }
      }
      this._unsub = null;
      if (this._state !== 'unsupported') this._setState('idle');
    }

    setLang(lang) {
      // External engines choose their own language; we only remember it for display.
      if (lang) this._lang = lang;
    }
  }

  // ---------------------------------------------------------------- whisper (offline, experimental)
  // Mic -> AudioContext -> ScriptProcessor (AudioWorklet fallback) -> 16 kHz mono Float32 -> energy VAD
  // -> chunks to js/whisper-worker.js (transformers.js, vendored under /vendor, models under /models).
  const WHISPER_DEFAULT_MODEL = 'onnx-community/whisper-tiny';
  const WHISPER_WORKER_URL = 'js/whisper-worker.js';
  const WHISPER_VENDOR_URL = '/vendor/transformers.min.js';
  const WHISPER_MODEL_BASE = '/models/';
  const WHISPER_RATE = 16000; // sample rate the model expects
  const WHISPER_FRAME = 4096; // ScriptProcessor buffer size
  const VAD_THRESHOLD = 0.01; // RMS above this = speech
  const VAD_HANGOVER_MS = 600; // trailing silence kept before a chunk is cut
  const VAD_MAX_CHUNK_S = 6; // cut while still speaking
  const VAD_MIN_CHUNK_S = 0.4; // shorter chunks are dropped (clicks, breaths)
  const WHISPER_MAX_PENDING = 3; // chunks in flight before we drop new ones (worker too slow)

  let whisperProbe = null; // last result of probeWhisper(): null = never checked, true/false
  let whisperProbing = null; // in-flight probe promise

  function isHttp() {
    return !!(global.location && /^https?:/.test(global.location.protocol));
  }

  function isSecureOrLocal() {
    if (global.isSecureContext === true) return true;
    const h = global.location && global.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  }

  function hasWorker() {
    return typeof global.Worker === 'function';
  }

  /** HEAD /vendor/transformers.min.js -> 200 means `npm run setup-offline` was run. Cached; false under file://. */
  function probeWhisper() {
    if (!isHttp() || typeof global.fetch !== 'function') {
      whisperProbe = false;
      return Promise.resolve(false);
    }
    if (whisperProbing) return whisperProbing;
    whisperProbing = global
      .fetch(WHISPER_VENDOR_URL, { method: 'HEAD', cache: 'no-store' })
      .then((r) => !!(r && r.ok))
      .catch(() => false)
      .then((ok) => {
        whisperProbe = ok;
        whisperProbing = null;
        return ok;
      });
    return whisperProbing;
  }

  function whisperSupported() {
    if (!hasWorker() || !isHttp() || !isSecureOrLocal()) return false;
    if (whisperProbe === null) probeWhisper(); // async; the next read of `backends` reflects it
    return whisperProbe === true;
  }

  /** 'de-DE' -> 'de' (Whisper wants ISO-639-1 codes); 'auto' / null -> null (the worker lets Whisper detect). */
  function whisperLang(tag) {
    if (tag == null || tag === '' || String(tag).toLowerCase() === 'auto') return null;
    const m = String(tag).toLowerCase().match(/^[a-z]{2,3}/);
    return m ? m[0] : 'de';
  }

  function rms(frame) {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    return frame.length ? Math.sqrt(sum / frame.length) : 0;
  }

  class Whisper extends Base {
    constructor(opts) {
      super('whisper', opts);
      this._model = typeof opts.model === 'string' && opts.model ? opts.model : WHISPER_DEFAULT_MODEL;
      this._device = opts.device || null;
      this._workerFactory = typeof opts.workerFactory === 'function' ? opts.workerFactory : null;
      this._mediaFactory = typeof opts.mediaFactory === 'function' ? opts.mediaFactory : null;
      this._active = false;
      this._gen = 0; // start() generation; async steps of an older generation are ignored
      this._ready = false; // worker reported `ready`
      this._worker = null;
      this._stream = null;
      this._ctx = null;
      this._source = null;
      this._node = null;
      this._pending = 0; // chunks sent, results not yet received
      this._resetVad();
      if (!this._hasWorker()) this._state = 'unsupported';
    }

    _hasWorker() {
      return !!this._workerFactory || hasWorker();
    }

    _resetVad() {
      this._carry = null; // input samples not yet resampled (fractional frame rest)
      this._parts = []; // Float32Array pieces of the current chunk (16 kHz)
      this._len = 0; // samples in `_parts`
      this._speaking = false;
      this._silence = 0; // trailing silent samples in the current chunk
    }

    get options() {
      return { model: this._model };
    }

    /** Async: resolves when the mic and the worker are wired up (the model may still be loading). */
    start() {
      if (!this._hasWorker()) {
        this._setState('unsupported');
        this._error('unsupported', 'Offline-Erkennung braucht Web Worker (Chrome, Edge, Firefox, Safari).', true);
        return Promise.resolve(false);
      }
      if (this._active) return Promise.resolve(true);
      this._active = true;
      this._ready = false;
      this._pending = 0;
      const gen = ++this._gen;
      this._stats = Object.assign(makeStats(), { chunks: 0 });
      this._stats.startedAt = now();
      this._resetVad();
      this._setState('starting');
      try {
        this._spawnWorker();
      } catch (e) {
        return Promise.resolve(this._fatal(`Whisper-Worker konnte nicht starten: ${e && e.message ? e.message : e}`));
      }
      return this._openMic(gen).then(
        () => this._active && gen === this._gen,
        (e) => {
          if (gen !== this._gen) return false;
          const msg = e && e.message ? e.message : String(e);
          return this._fatal(/NotAllowed|Permission|denied|verweigert/i.test(msg) ? 'Mikrofon-Zugriff verweigert.' : `Mikrofon nicht verfügbar: ${msg}`);
        },
      );
    }

    stop() {
      this._gen++;
      this._shutdown();
      if (this._state !== 'unsupported') this._setState('idle');
    }

    setLang(lang) {
      // Sent with the next chunk; no restart needed (the model is multilingual).
      if (lang) this._lang = lang;
    }

    _fatal(message) {
      this._error('whisper', message, true);
      this._shutdown();
      this._setState('error');
      return false;
    }

    _shutdown() {
      this._active = false;
      this._ready = false;
      const w = this._worker;
      this._worker = null;
      if (w) {
        try {
          w.terminate();
        } catch (_) {
          /* ignore */
        }
      }
      this._closeMic();
      this._resetVad();
    }

    _closeMic() {
      const { _node: node, _source: source, _ctx: ctx, _stream: stream } = this;
      this._node = null;
      this._source = null;
      this._ctx = null;
      this._stream = null;
      if (node) {
        try {
          node.onaudioprocess = null;
          if (node.port) node.port.onmessage = null;
          node.disconnect();
        } catch (_) {
          /* ignore */
        }
      }
      if (source) {
        try {
          source.disconnect();
        } catch (_) {
          /* ignore */
        }
      }
      if (stream && typeof stream.getTracks === 'function') {
        for (const t of stream.getTracks()) {
          try {
            t.stop();
          } catch (_) {
            /* ignore */
          }
        }
      }
      if (ctx && typeof ctx.close === 'function') {
        try {
          const p = ctx.close();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (_) {
          /* ignore */
        }
      }
    }

    // ---- worker --------------------------------------------------------------------------
    _spawnWorker() {
      const worker = this._workerFactory ? this._workerFactory() : new global.Worker(WHISPER_WORKER_URL);
      if (!worker || typeof worker.postMessage !== 'function') throw new Error('workerFactory lieferte keinen Worker');
      this._worker = worker;
      worker.onmessage = (ev) => {
        if (worker !== this._worker) return;
        this._onWorkerMessage(ev && ev.data ? ev.data : {});
      };
      worker.onerror = (ev) => {
        if (worker !== this._worker) return;
        const msg = ev && ev.message ? ev.message : 'Worker-Fehler';
        this._fatal(`Whisper-Worker: ${msg}`);
      };
      const load = { type: 'load', model: this._model, modelBase: WHISPER_MODEL_BASE, vendorUrl: WHISPER_VENDOR_URL };
      if (this._device) load.device = this._device;
      worker.postMessage(load);
    }

    _onWorkerMessage(m) {
      switch (m.type) {
        case 'progress': {
          const pct = Math.max(0, Math.min(100, Math.round(Number(m.pct) || 0)));
          this._setState('starting');
          this._event('progress', m.file ? { pct, file: String(m.file) } : { pct });
          return;
        }
        case 'ready':
          this._ready = true;
          this._event('ready', { model: this._model });
          this._setState('listening');
          return;
        case 'result': {
          if (this._pending > 0) this._pending--;
          const text = typeof m.text === 'string' ? m.text.replace(/\s+/g, ' ').trim() : '';
          if (!text) return;
          const at = now();
          this._countResult(true, at);
          this._event('final', { text, isFinal: true });
          safe(this._onText, text, true, { source: 'Whisper', lang: this._lang, at });
          return;
        }
        case 'error':
          this._fatal(m.message ? String(m.message) : 'Whisper-Fehler');
          return;
        default:
      }
    }

    // ---- microphone ----------------------------------------------------------------------
    async _openMic(gen) {
      const AC = global.AudioContext || global.webkitAudioContext || null;
      const md = global.navigator && global.navigator.mediaDevices;
      if (!this._mediaFactory && (!md || typeof md.getUserMedia !== 'function')) throw new Error('getUserMedia nicht verfügbar');
      if (!AC) throw new Error('WebAudio nicht verfügbar');
      const stream = await (this._mediaFactory ? this._mediaFactory() : md.getUserMedia({ audio: true }));
      if (gen !== this._gen || !this._active) {
        // stop() while the permission prompt was open
        if (stream && typeof stream.getTracks === 'function') stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this._stream = stream;
      const ctx = new AC();
      this._ctx = ctx;
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        try {
          const p = ctx.resume();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (_) {
          /* ignore */
        }
      }
      const source = ctx.createMediaStreamSource(stream);
      this._source = source;
      if (typeof ctx.createScriptProcessor === 'function') {
        const node = ctx.createScriptProcessor(WHISPER_FRAME, 1, 1);
        node.onaudioprocess = (ev) => {
          if (gen !== this._gen) return;
          const buf = ev && ev.inputBuffer;
          if (!buf || typeof buf.getChannelData !== 'function') return;
          this._onFrame(buf.getChannelData(0), ctx.sampleRate);
        };
        source.connect(node);
        node.connect(ctx.destination); // Chrome only pulls a ScriptProcessor that is connected
        this._node = node;
      } else if (ctx.audioWorklet && typeof ctx.audioWorklet.addModule === 'function' && typeof global.AudioWorkletNode === 'function') {
        await this._openWorklet(ctx, source, gen);
      } else {
        throw new Error('ScriptProcessor/AudioWorklet nicht verfügbar');
      }
    }

    /** AudioWorklet fallback: a tiny inline processor forwards every 128-sample render quantum. */
    async _openWorklet(ctx, source, gen) {
      const src = `class P extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice());return true}}registerProcessor('livefx-pcm',P);`;
      const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
      try {
        await ctx.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      if (gen !== this._gen) return;
      const node = new global.AudioWorkletNode(ctx, 'livefx-pcm');
      node.port.onmessage = (ev) => {
        if (gen !== this._gen) return;
        if (ev && ev.data && ev.data.length) this._onFrame(ev.data, ctx.sampleRate);
      };
      source.connect(node);
      this._node = node;
    }

    // ---- resampling + VAD ----------------------------------------------------------------
    /** One input frame at `rate` Hz -> 16 kHz (box-filter decimation) -> VAD. */
    _onFrame(frame, rate) {
      if (!this._ready || !this._active) return; // nothing to do while the model loads
      let input = frame;
      if (this._carry && this._carry.length) {
        input = new Float32Array(this._carry.length + frame.length);
        input.set(this._carry, 0);
        input.set(frame, this._carry.length);
        this._carry = null;
      }
      let out;
      const ratio = (Number(rate) || WHISPER_RATE) / WHISPER_RATE;
      if (ratio <= 1) {
        out = input instanceof Float32Array ? input : Float32Array.from(input);
      } else {
        const n = Math.floor(input.length / ratio);
        out = new Float32Array(n);
        for (let k = 0; k < n; k++) {
          const a = Math.floor(k * ratio);
          const b = Math.min(input.length, Math.floor((k + 1) * ratio));
          let sum = 0;
          for (let i = a; i < b; i++) sum += input[i];
          out[k] = b > a ? sum / (b - a) : 0;
        }
        const used = Math.floor(n * ratio);
        if (used < input.length) this._carry = input.slice(used);
      }
      if (out.length) this._vad(out);
    }

    _vad(frame) {
      const loud = rms(frame) > VAD_THRESHOLD;
      if (!this._speaking) {
        if (!loud) return;
        this._speaking = true;
        this._silence = 0;
      }
      this._parts.push(frame);
      this._len += frame.length;
      if (loud) this._silence = 0;
      else this._silence += frame.length;
      const hangover = (VAD_HANGOVER_MS / 1000) * WHISPER_RATE;
      if (this._silence >= hangover) {
        // Trim the silence past the hangover so the chunk ends ~600 ms after the last word.
        this._flush(this._len - (this._silence - hangover), this._len - this._silence);
        this._resetChunk();
        return;
      }
      const max = VAD_MAX_CHUNK_S * WHISPER_RATE;
      if (this._len >= max) {
        // Still speaking: cut at exactly 6 s and carry the rest into the next chunk.
        const rest = this._flush(max, max);
        this._resetChunk();
        this._speaking = true;
        if (rest && rest.length) {
          this._parts.push(rest);
          this._len = rest.length;
          this._silence = Math.min(this._silence, rest.length);
        }
      }
    }

    _resetChunk() {
      this._parts = [];
      this._len = 0;
      this._speaking = false;
      this._silence = 0;
    }

    /**
     * Joins the first `count` buffered samples into one chunk and sends it (unless the speech part
     * `speech` is shorter than the minimum); returns the leftover samples.
     */
    _flush(count, speech) {
      const total = this._len;
      count = Math.max(0, Math.min(total, Math.floor(count)));
      const all = new Float32Array(total);
      let off = 0;
      for (const p of this._parts) {
        all.set(p, off);
        off += p.length;
      }
      const rest = count < total ? all.slice(count) : null;
      const audio = count < total ? all.slice(0, count) : all;
      if (speech >= VAD_MIN_CHUNK_S * WHISPER_RATE) this._send(audio);
      return rest;
    }

    _send(audio) {
      const w = this._worker;
      if (!w || !this._ready) return;
      if (this._pending >= WHISPER_MAX_PENDING) {
        this._event('dropped', { seconds: audio.length / WHISPER_RATE, pending: this._pending });
        return;
      }
      this._stats.chunks++;
      this._pending++;
      const lang = whisperLang(this._lang);
      this._event('chunk', { seconds: audio.length / WHISPER_RATE, lang });
      try {
        w.postMessage({ type: 'transcribe', audio, lang }, [audio.buffer]);
      } catch (_) {
        w.postMessage({ type: 'transcribe', audio, lang }); // environments without transferables
      }
    }
  }

  // ---------------------------------------------------------------- auto (DE/TR/EN, LiveFX 1.5)
  // Composes WebSpeech recognizers. Switching mode: one recognizer; every final result is scored by
  // js/langdetect.js, and when the last `switchAfter` finals agree on another family the recognizer
  // is restarted in that language in the next speech gap. Parallel mode (`parallel: 'try'|'on'`):
  // one recognizer per family runs at the same time; interims come from the leading language only,
  // finals are deduped per utterance and the best-scoring one is forwarded. Chrome aborts the first
  // recognizer when a second one starts – that `aborted` within AUTO_PARALLEL_PROBE_MS of start()
  // makes 'try' fall back to switching mode.
  const AUTO_LANGS = Object.freeze(['de-DE', 'tr-TR', 'en-US']);
  const AUTO_WINDOW = 3;
  const AUTO_SWITCH_AFTER = 2;
  const AUTO_PARALLEL_MODES = Object.freeze(['try', 'on', 'off']);
  const AUTO_PARALLEL_PROBE_MS = 1500; // aborted/not-allowed within this after start() -> parallel unsupported
  const AUTO_DEDUPE_MS = 800; // finals from different recognizers closer than this are one utterance
  const AUTO_DEDUPE_TEXT_MS = 3000; // near-identical text within this is a duplicate too
  const AUTO_CONFIDENT = 0.75; // a final whose own language scores this high is forwarded without waiting

  function langDetect() {
    if (global.LiveFXLangDetect) return global.LiveFXLangDetect;
    if (typeof require === 'function') {
      try {
        return require('./langdetect.js');
      } catch (_) {
        /* not available */
      }
    }
    return null;
  }

  function autoFamily(tag) {
    const m = String(tag || '')
      .toLowerCase()
      .match(/^(de|tr|en)(?=$|[-_])/);
    return m ? m[1] : null;
  }

  function autoStats() {
    return Object.assign(makeStats(), { switches: 0, parallel: false, detected: { de: 0, tr: 0, en: 0 } });
  }

  function plainText(t) {
    return String(t || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  /** Same utterance heard twice: equal after normalisation, or one contains the other and is >= 80 % as long. */
  function sameText(a, b) {
    const x = plainText(a);
    const y = plainText(b);
    if (!x || !y) return false;
    if (x === y) return true;
    const [s, l] = x.length <= y.length ? [x, y] : [y, x];
    return s.length / l.length >= 0.8 && l.includes(s);
  }

  class Auto extends Base {
    constructor(opts) {
      super('auto', opts);
      this._ld = langDetect();
      this._inners = []; // live WebSpeech instances (1 in switching mode, one per family in parallel mode)
      this._innerOpts = {};
      for (const k of ['alternatives', 'restartEveryMs', 'stallMs']) if (k in opts) this._innerOpts[k] = opts[k];
      this._voiceActivity = typeof opts.voiceActivity === 'function' ? opts.voiceActivity : null;
      this._window = Math.max(1, Math.floor(Number(opts.window)) || AUTO_WINDOW);
      this._switchAfter = Math.min(this._window, Math.max(1, Math.floor(Number(opts.switchAfter)) || AUTO_SWITCH_AFTER));
      this._parallelMode = Auto.parallelMode(opts.parallel);
      this._tags = {}; // family -> tag
      this._families = []; // in `langs` order
      const list = Array.isArray(opts.langs) && opts.langs.length ? opts.langs : AUTO_LANGS;
      for (const t of list) this._addLang(t);
      if (!this._families.length) for (const t of AUTO_LANGS) this._addLang(t);
      const f0 = autoFamily(opts.lang);
      if (f0 && this._tags[f0]) this._tags[f0] = opts.lang;
      this._family = f0 && this._tags[f0] ? f0 : this._families[0];
      this._lang = this._tags[this._family];
      this._active = false;
      this._pinned = false;
      this._history = []; // last `window` detections of finals (switching mode)
      this._switchTo = null; // pending { family, score } waiting for a speech gap
      this._switchTimer = null;
      this._switchDeferred = 0;
      this._parallel = false; // parallel mode currently running
      this._probeUntil = 0; // parallel 'try': fall back to switching on aborted/not-allowed before this
      this._hold = null; // parallel: best final of the current utterance, waiting for competitors
      this._lastForwarded = null; // parallel: { text, at } of the last forwarded final (dedupe)
      this._stats = autoStats();
      if (!speechCtor()) this._state = 'unsupported';
    }

    static parallelMode(v) {
      if (v === true) return 'on';
      if (v === false) return 'off';
      return AUTO_PARALLEL_MODES.includes(v) ? v : 'try';
    }

    _addLang(tag) {
      const f = autoFamily(tag);
      if (!f) return;
      if (!this._tags[f]) this._families.push(f);
      this._tags[f] = tag;
    }

    get family() {
      return this._family;
    }

    get langs() {
      return this._families.map((f) => this._tags[f]);
    }

    get pinned() {
      return this._pinned;
    }

    get parallel() {
      return this._parallel;
    }

    get options() {
      const p = this._inners[0];
      const base = p
        ? p.options
        : {
            alternatives: !!this._innerOpts.alternatives,
            restartEveryMs: Math.max(0, Number(this._innerOpts.restartEveryMs) || 0),
            stallMs: 'stallMs' in this._innerOpts ? Math.max(0, Number(this._innerOpts.stallMs) || 0) : DEFAULT_STALL_MS,
          };
      return Object.assign(base, { langs: this.langs, window: this._window, switchAfter: this._switchAfter, parallel: this._parallelMode });
    }

    /** Live: alternatives/restartEveryMs/stallMs go to every recognizer; window/switchAfter apply at once; parallel at the next start(). */
    setOptions(o) {
      if (!o || typeof o !== 'object') return;
      if ('window' in o) this._window = Math.max(1, Math.floor(Number(o.window)) || AUTO_WINDOW);
      if ('switchAfter' in o) this._switchAfter = Math.max(1, Math.floor(Number(o.switchAfter)) || AUTO_SWITCH_AFTER);
      this._switchAfter = Math.min(this._window, this._switchAfter);
      if ('parallel' in o) this._parallelMode = Auto.parallelMode(o.parallel);
      for (const k of ['alternatives', 'restartEveryMs', 'stallMs']) if (k in o) this._innerOpts[k] = o[k];
      for (const r of this._inners) r.setOptions(o);
    }

    start() {
      if (this._state === 'unsupported' || !speechCtor()) {
        this._setState('unsupported');
        this._error('unsupported', 'Dieser Browser kann keine Spracherkennung. Bitte Chrome oder Edge nutzen.', true);
        return;
      }
      if (this._active) return;
      this._active = true;
      this._stats = autoStats();
      this._stats.startedAt = now();
      this._history = [];
      this._hold = null;
      this._lastForwarded = null;
      this._switchTo = null;
      this._parallel = this._parallelMode !== 'off' && this._families.length > 1;
      this._stats.parallel = this._parallel;
      this._probeUntil = this._parallel && this._parallelMode === 'try' ? now() + AUTO_PARALLEL_PROBE_MS : 0;
      this._spawnInner(this._family);
      if (this._parallel) for (const f of this._families) if (f !== this._family) this._spawnInner(f);
      this._event('lang', { lang: this._lang, family: this._family, score: null, mode: this._mode(), reason: 'start' });
      this._emitState();
    }

    stop() {
      this._shutdown();
      if (this._state !== 'unsupported') this._setState('idle');
    }

    _shutdown() {
      this._active = false;
      this._cancelSwitch();
      if (this._hold && this._hold.timer) clearTimeout(this._hold.timer);
      this._hold = null;
      const inners = this._inners;
      this._inners = [];
      for (const r of inners) r.stop();
    }

    /** 'auto' | null -> follow the detector again; a tag -> pin that family (no automatic switching). */
    setLang(tag) {
      if (tag == null || tag === '' || String(tag).toLowerCase() === 'auto') {
        if (!this._pinned) return;
        this._pinned = false;
        this._history = [];
        this._event('lang', { lang: this._lang, family: this._family, score: null, mode: this._mode(), reason: 'unpinned' });
        return;
      }
      const f = autoFamily(tag);
      if (!f) return;
      this._pinned = true;
      this._addLang(tag);
      this._applyLang(f, null, 'pinned');
    }

    _mode() {
      return this._parallel ? 'parallel' : 'switch';
    }

    _primary() {
      for (const r of this._inners) if (autoFamily(r.lang) === this._family) return r;
      return this._inners[0] || null;
    }

    _spawnInner(f) {
      let rec = null;
      const o = Object.assign({}, this._innerOpts, {
        lang: this._tags[f],
        voiceActivity: this._voiceActivity,
        onText: (text, isFinal, meta) => this._innerText(rec, text, isFinal, meta),
        onState: () => this._innerState(rec),
        onError: (e) => this._innerError(rec, e),
        onEvent: (e) => this._innerEvent(rec, e),
        onRawError: (code) => this._innerRawError(rec, code),
      });
      rec = new WebSpeech(o);
      this._inners.push(rec);
      rec.start();
      return rec;
    }

    _has(rec) {
      return !!rec && this._inners.includes(rec);
    }

    // ---- language switching ------------------------------------------------------------------
    /** Makes `f` the current family (switching mode: swap the recognizer; parallel: new leader). */
    _applyLang(f, score, reason) {
      this._cancelSwitch();
      const tag = this._tags[f];
      if (!tag) return;
      const changed = f !== this._family || tag !== this._lang;
      this._family = f;
      this._lang = tag;
      this._history = [];
      if (!changed) return;
      if (this._active) {
        if (this._parallel) {
          if (!this._inners.some((r) => autoFamily(r.lang) === f)) this._spawnInner(f);
        } else {
          const p = this._inners[0];
          if (p) p.setLang(tag);
        }
      }
      this._stats.switches++;
      this._event('lang', { lang: tag, family: f, score: score == null ? null : score, mode: this._mode(), reason });
      this._emitState();
    }

    _cancelSwitch() {
      if (this._switchTimer) clearTimeout(this._switchTimer);
      this._switchTimer = null;
      this._switchTo = null;
      this._switchDeferred = 0;
    }

    /** Switching mode: remember the detection and switch when the last `switchAfter` finals agree. */
    _observe(det) {
      if (!det || !det.lang) return;
      this._history.push(det);
      if (this._history.length > this._window) this._history.splice(0, this._history.length - this._window);
      if (this._pinned) return;
      const n = this._switchAfter;
      if (this._history.length < n) return;
      const lastN = this._history.slice(-n);
      const f = lastN[0].lang;
      if (f === this._family || !this._tags[f]) return;
      if (!lastN.every((d) => d.lang === f)) return;
      const score = Math.round((lastN.reduce((s, d) => s + d.score, 0) / n) * 1000) / 1000;
      this._requestSwitch(f, score);
    }

    /** Without a meter the switch happens right after the final; with one it waits for a gap (max 10 s). */
    _requestSwitch(f, score) {
      if (this._switchTo && this._switchTo.family === f) return;
      this._cancelSwitch();
      this._switchTo = { family: f, score };
      if (!this._voiceActivity) {
        this._applyLang(f, score, 'detected');
        return;
      }
      this._switchTick();
    }

    _switchTick() {
      this._switchTimer = null;
      const req = this._switchTo;
      if (!req || !this._active) return;
      let voice = false;
      try {
        voice = !!this._voiceActivity();
      } catch (_) {
        voice = false;
      }
      if (!voice || this._switchDeferred >= RESTART_DEFER_MAX_MS) {
        this._applyLang(req.family, req.score, 'detected');
        return;
      }
      this._switchDeferred += RESTART_DEFER_STEP_MS;
      this._switchTimer = setTimeout(() => this._switchTick(), RESTART_DEFER_STEP_MS);
    }

    // ---- results -----------------------------------------------------------------------------
    _innerText(rec, text, isFinal, meta) {
      if (!this._active || !this._has(rec)) return;
      const tag = rec.lang;
      const fam = autoFamily(tag);
      const m = Object.assign({}, meta, { source: 'auto', lang: tag, recognizer: tag });
      if (!isFinal) {
        if (this._parallel && fam !== this._family) return; // interims only from the leading language
        this._forward(text, false, m);
        return;
      }
      const det = this._ld ? this._ld.detect(text) : { lang: null, score: 0, scores: { de: 0, tr: 0, en: 0 } };
      if (det.lang && this._stats.detected[det.lang] != null) this._stats.detected[det.lang]++;
      if (!this._parallel) {
        this._forward(text, true, m);
        this._observe(det);
        return;
      }
      this._offer({ text, meta: m, at: m.at, fam, det, score: this._finalScore(det, fam, m), timer: null });
    }

    _forward(text, isFinal, meta) {
      this._countResult(isFinal, meta.at);
      this._event(isFinal ? 'final' : 'result', { text, isFinal, recognizer: meta.recognizer });
      safe(this._onText, text, isFinal, meta);
    }

    /** How plausible a final from recognizer `fam` is: its own language detected -> high, another one -> low. */
    _finalScore(det, fam, meta) {
      let s;
      if (det.lang === fam) s = 0.5 + det.score / 2;
      else if (det.lang) s = (1 - det.score) * 0.5;
      else s = 0.3;
      if (typeof meta.confidence === 'number') s += Math.max(0, Math.min(1, meta.confidence)) * 0.1;
      return s;
    }

    static confident(c) {
      return c.det.lang === c.fam && c.det.score >= AUTO_CONFIDENT;
    }

    /** Parallel mode: collect the finals of one utterance (<= AUTO_DEDUPE_MS apart or same text), forward the best. */
    _offer(c) {
      const lf = this._lastForwarded;
      if (lf && (c.at - lf.at < AUTO_DEDUPE_MS || (c.at - lf.at < AUTO_DEDUPE_TEXT_MS && sameText(lf.text, c.text)))) {
        this._event('duplicate', { text: c.text, recognizer: c.meta.recognizer });
        return;
      }
      const h = this._hold;
      if (h) {
        if (c.at - h.at < AUTO_DEDUPE_MS || sameText(h.text, c.text)) {
          if (c.score > h.score) {
            this._event('duplicate', { text: h.text, recognizer: h.meta.recognizer });
            Object.assign(h, { text: c.text, meta: c.meta, fam: c.fam, det: c.det, score: c.score });
          } else {
            this._event('duplicate', { text: c.text, recognizer: c.meta.recognizer });
          }
          if (Auto.confident(h)) this._flushHold();
          return;
        }
        this._flushHold(); // a new utterance: release the previous one first
      }
      this._hold = c;
      if (Auto.confident(c)) {
        this._flushHold();
        return;
      }
      c.timer = setTimeout(() => this._flushHold(), AUTO_DEDUPE_MS);
    }

    _flushHold() {
      const h = this._hold;
      if (!h) return;
      if (h.timer) clearTimeout(h.timer);
      this._hold = null;
      this._lastForwarded = { text: h.text, at: h.at };
      this._forward(h.text, true, h.meta);
      const f = h.det.lang && this._tags[h.det.lang] ? h.det.lang : null;
      if (f && !this._pinned && f !== this._family) this._applyLang(f, h.det.score, 'detected');
    }

    // ---- inner recognizer plumbing -------------------------------------------------------------
    _innerRawError(rec, code) {
      if (!this._parallel || !this._probeUntil || !this._has(rec)) return;
      if (now() > this._probeUntil) {
        this._probeUntil = 0;
        return;
      }
      if (code === 'aborted' || (code === 'not-allowed' && rec !== this._primary())) this._fallbackToSwitch();
    }

    /** Parallel recognizers are not supported here: keep the primary, stop the rest, switch mode from now on. */
    _fallbackToSwitch() {
      this._parallel = false;
      this._stats.parallel = false;
      this._probeUntil = 0;
      this._flushHold();
      const keep = this._primary();
      const rest = this._inners.filter((r) => r !== keep);
      this._inners = keep ? [keep] : [];
      for (const r of rest) r.stop();
      if (!keep && this._active) this._spawnInner(this._family);
      this._event('lang', { lang: this._lang, family: this._family, score: null, mode: 'switch', reason: 'parallel-unsupported' });
      this._emitState();
    }

    _innerError(rec, e) {
      if (!this._has(rec)) return;
      const err = Object.assign({}, e, { recognizer: rec.lang });
      if (e && e.fatal) {
        safe(this._onError, err);
        this._shutdown();
        this._setState('error');
        return;
      }
      safe(this._onError, err);
    }

    _innerEvent(rec, e) {
      if (!this._has(rec) || !e) return;
      if (e.type === 'result' || e.type === 'final') return; // emitted by _forward for forwarded text only
      const s = this._stats;
      if (e.type === 'restart') s.restarts++;
      else if (e.type === 'planned-restart') {
        s.restarts++;
        s.plannedRestarts++;
      } else if (e.type === 'stall') {
        s.restarts++;
        s.stalls++;
      }
      this._event(e.type, Object.assign({}, e, { recognizer: rec.lang }));
    }

    _innerState(rec) {
      if (!this._has(rec)) return;
      this._emitState();
    }

    /** Aggregate state: any recognizer listening wins, then starting, restarting, error. */
    _emitState() {
      if (!this._active) return;
      const states = this._inners.map((r) => r.state);
      for (const s of ['listening', 'starting', 'restarting', 'error']) {
        if (states.includes(s)) {
          this._setState(s);
          return;
        }
      }
      if (states.length) this._setState(states[0]);
    }
  }

  // ---------------------------------------------------------------- public API
  const BACKENDS = {
    webspeech: { label: 'Browser (Chrome/Edge)', supported: () => !!speechCtor(), make: (o) => new WebSpeech(o) },
    external: { label: 'Extern (POST /api/transcript)', supported: (o) => External.supported(o && o.bus), make: (o) => new External(o) },
    whisper: { label: 'Offline (Whisper, experimentell)', supported: () => whisperSupported(), make: (o) => new Whisper(o) },
    auto: { label: 'Automatisch (DE/TR/EN)', supported: () => !!speechCtor(), make: (o) => new Auto(o) },
  };

  function create(name, opts = {}) {
    const b = BACKENDS[name];
    if (!b) throw new Error(`LiveFXASR: unbekanntes Backend "${String(name).slice(0, 20)}"`);
    return b.make(opts);
  }

  global.LiveFXASR = {
    BACKOFF_MS,
    ALTERNATIVES_N,
    DEFAULT_STALL_MS,
    // `supported` for 'external' assumes a bus exists when running over http(s); pass a bus to
    // `create` for the authoritative check (state becomes 'unsupported' under file://).
    get backends() {
      const isHttp = !!(global.location && /^https?:/.test(global.location.protocol));
      return [
        { name: 'webspeech', label: BACKENDS.webspeech.label, supported: BACKENDS.webspeech.supported() },
        { name: 'auto', label: BACKENDS.auto.label, supported: BACKENDS.auto.supported() },
        { name: 'external', label: BACKENDS.external.label, supported: isHttp },
        { name: 'whisper', label: BACKENDS.whisper.label, supported: BACKENDS.whisper.supported() },
      ];
    },
    create,
    // Offline backend: re-checks whether /vendor/transformers.min.js is served (after `npm run setup-offline`).
    probeWhisper,
    WHISPER_DEFAULT_MODEL,
    AUTO_LANGS,
    AUTO_PARALLEL_PROBE_MS,
    AUTO_DEDUPE_MS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
