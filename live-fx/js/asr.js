// LiveFX – speech-recognition backends behind one tiny interface (docs/CONTRACTS.md §6).
//
//   webspeech  Chrome/Edge Web Speech API. One live recognizer per "generation"; Chrome stops after
//              silence / ~60 s, so we restart with a backoff that grows while no result arrives.
//   external   Anything that can POST /api/transcript (Whisper, a phone app, …). The server relays
//              the text to every panel over the bus; this backend just subscribes to it.
//
//   const asr = LiveFXASR.create('webspeech', { lang, bus, onText, onState, onError });
//   asr.start(); asr.setLang('en-US'); asr.stop();
(function (global) {
  'use strict';

  const BACKOFF_MS = [0, 250, 1000, 2000, 5000, 10000];
  const NETWORK_FATAL_AFTER = 5;
  const FATAL_ERRORS = ['not-allowed', 'service-not-allowed', 'audio-capture'];
  const IGNORED_ERRORS = ['no-speech', 'aborted'];

  function speechCtor() {
    if (typeof global === 'undefined') return null;
    return global.SpeechRecognition || global.webkitSpeechRecognition || null;
  }

  function noop() {}

  function safe(fn, ...args) {
    try {
      fn(...args);
    } catch (e) {
      if (global.console) console.error('LiveFXASR callback failed', e);
    }
  }

  class Base {
    constructor(name, opts) {
      this.name = name;
      this._lang = opts.lang || 'de-DE';
      this._onText = typeof opts.onText === 'function' ? opts.onText : noop;
      this._onState = typeof opts.onState === 'function' ? opts.onState : noop;
      this._onError = typeof opts.onError === 'function' ? opts.onError : noop;
      this._state = 'idle';
    }

    get state() {
      return this._state;
    }

    get lang() {
      return this._lang;
    }

    _setState(s) {
      if (this._state === s) return;
      this._state = s;
      safe(this._onState, s);
    }

    _error(code, message, fatal) {
      safe(this._onError, { code, message: message || code, fatal: !!fatal });
    }
  }

  // ---------------------------------------------------------------- webspeech
  class WebSpeech extends Base {
    constructor(opts) {
      super('webspeech', opts);
      this._rec = null; // the current generation; stale recognizers are ignored via `rec !== this._rec`
      this._active = false;
      this._restarts = 0; // consecutive restarts without a result
      this._netErrors = 0; // consecutive network errors
      this._timer = null;
      if (!speechCtor()) this._state = 'unsupported';
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

    /** Aborts and forgets the current recognizer. Never leaves two live ones behind. */
    _kill() {
      const rec = this._rec;
      this._rec = null;
      if (!rec) return;
      try {
        rec.abort();
      } catch (_) {
        /* already stopped */
      }
    }

    _spawn() {
      const SR = speechCtor();
      if (!SR || !this._active) return;
      this._kill();
      const rec = new SR();
      rec.lang = this._lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      this._rec = rec;
      this._setState(this._restarts > 0 ? 'restarting' : 'starting');

      rec.onstart = () => {
        if (rec !== this._rec) return;
        this._setState('listening');
      };
      rec.onresult = (ev) => {
        if (rec !== this._rec) return;
        this._restarts = 0;
        this._netErrors = 0;
        let finalText = '';
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) finalText += r[0].transcript + ' ';
          else interim += r[0].transcript;
        }
        const current = (finalText || interim).trim();
        if (!current) return;
        safe(this._onText, current, !!finalText, { source: 'Mikro', lang: this._lang });
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
        this._rec = null;
        if (!this._active) return;
        // Chrome ends the session after silence / ~60 s: restart, slower while nothing is heard.
        const delay = BACKOFF_MS[Math.min(this._restarts, BACKOFF_MS.length - 1)];
        this._restarts++;
        this._setState('restarting');
        this._clearTimer();
        this._timer = setTimeout(() => {
          this._timer = null;
          if (this._active && !this._rec) this._spawn();
        }, delay);
      };

      try {
        rec.start();
      } catch (e) {
        // InvalidStateError when a previous instance is still winding down: retry via onend path.
        if (rec !== this._rec) return;
        this._rec = null;
        const delay = BACKOFF_MS[Math.min(this._restarts + 1, BACKOFF_MS.length - 1)];
        this._restarts++;
        this._setState('restarting');
        this._clearTimer();
        this._timer = setTimeout(() => {
          this._timer = null;
          if (this._active && !this._rec) this._spawn();
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
      this._unsub = this._bus.onMessage((m) => {
        if (!m || m.type !== 'transcript' || typeof m.text !== 'string') return;
        safe(this._onText, m.text, m.final !== false, { source: m.source || 'Extern', lang: m.lang });
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
