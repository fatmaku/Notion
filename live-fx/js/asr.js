// LiveFX – speech-recognition backends behind one tiny interface (docs/CONTRACTS.md §6).
//
//   webspeech  Chrome/Edge Web Speech API. One live recognizer per "generation"; Chrome stops after
//              silence / ~60 s, so we restart with a backoff that grows while no result arrives.
//              Optional robustness helpers: N-best alternatives on final results, a planned restart
//              every `restartEveryMs` (only in a speech gap – long sessions degrade in Chrome) and a
//              stall watchdog (`stallMs` without any result while listening -> kill + respawn).
//   external   Anything that can POST /api/transcript (Whisper, a phone app, …). The server relays
//              the text to every panel over the bus; this backend just subscribes to it.
//
//   const asr = LiveFXASR.create('webspeech', { lang, bus, onText, onState, onError,
//                                               alternatives, restartEveryMs, stallMs, voiceActivity, onEvent });
//   asr.start(); asr.setLang('en-US'); asr.setOptions({ alternatives: true }); asr.stats; asr.stop();
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

  // ---------------------------------------------------------------- public API
  const BACKENDS = {
    webspeech: { label: 'Browser (Chrome/Edge)', supported: () => !!speechCtor(), make: (o) => new WebSpeech(o) },
    external: { label: 'Extern (POST /api/transcript)', supported: (o) => External.supported(o && o.bus), make: (o) => new External(o) },
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
        { name: 'external', label: BACKENDS.external.label, supported: isHttp },
      ];
    },
    create,
  };
})(typeof window !== 'undefined' ? window : globalThis);
