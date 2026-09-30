// LiveFX – microphone level meter (global `LiveFXMeter`).
//
// getUserMedia({audio:true}) -> AudioContext -> MediaStreamSource -> AnalyserNode(fftSize 1024),
// RMS over getFloatTimeDomainData() on a setInterval(1000 / fps). Used by the panel for the
// "Mikro" bar, the ASR stall watchdog / planned restart (`voiceActivity`) and the latency estimate.
//
//   const meter = LiveFXMeter.create({ fps: 10, threshold: 0.02, onLevel(rms, peak) {} });
//   await meter.start();   // true = running, false = no mic / no WebAudio (never throws)
//   meter.level; meter.peak; meter.isVoiceActive(); meter.lastVoiceAt; meter.error
//   meter.stop();          // releases the tracks and closes the AudioContext; safe to call twice
(function (global) {
  'use strict';

  const FFT_SIZE = 1024;
  const PEAK_DECAY = 0.85; // per tick
  const DEFAULT_HOLD_MS = 200; // isVoiceActive() stays true this long after the last loud tick

  function now() {
    const p = global.performance;
    return p && typeof p.now === 'function' ? p.now() : Date.now();
  }

  function audioCtor() {
    return global.AudioContext || global.webkitAudioContext || null;
  }

  class Meter {
    constructor(opts) {
      const o = opts && typeof opts === 'object' ? opts : {};
      this.fps = Math.min(60, Math.max(1, Number(o.fps) || 10));
      this.threshold = Number.isFinite(Number(o.threshold)) ? Math.max(0, Number(o.threshold)) : 0.02;
      this.holdMs = Number.isFinite(Number(o.holdMs)) ? Math.max(0, Number(o.holdMs)) : DEFAULT_HOLD_MS;
      this._onLevel = typeof o.onLevel === 'function' ? o.onLevel : null;
      this.level = 0; // RMS of the last tick, 0..1
      this.peak = 0; // decaying peak
      this.lastVoiceAt = null; // performance.now() of the last tick above threshold
      this.error = null; // message of the last start() failure
      this.running = false;
      this._stream = null;
      this._ctx = null;
      this._source = null;
      this._analyser = null;
      this._buf = null;
      this._interval = null;
      this._starting = null;
      this._warned = false;
    }

    /** Resolves true when the meter runs. Never throws: false means no mic / no permission / no WebAudio. */
    start() {
      if (this.running) return Promise.resolve(true);
      if (this._starting) return this._starting;
      this._starting = this._start()
        .catch((e) => {
          this._fail(e && e.message ? e.message : String(e));
          return false;
        })
        .then((ok) => {
          this._starting = null;
          return ok;
        });
      return this._starting;
    }

    async _start() {
      const md = global.navigator && global.navigator.mediaDevices;
      const AC = audioCtor();
      if (!md || typeof md.getUserMedia !== 'function') return this._fail('getUserMedia nicht verfügbar');
      if (!AC) return this._fail('WebAudio nicht verfügbar');
      const stream = await md.getUserMedia({ audio: true });
      if (!this._starting) {
        // stop() was called while we waited for the permission prompt
        stopTracks(stream);
        return false;
      }
      const ctx = new AC();
      let analyser;
      try {
        analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        this._source = source;
      } catch (e) {
        stopTracks(stream);
        closeContext(ctx);
        return this._fail(e && e.message ? e.message : String(e));
      }
      this._stream = stream;
      this._ctx = ctx;
      this._analyser = analyser;
      this._buf = new Float32Array(typeof analyser.fftSize === 'number' ? analyser.fftSize : FFT_SIZE);
      this.error = null;
      this.running = true;
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        try {
          const p = ctx.resume();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (_) {
          /* ignore */
        }
      }
      this._interval = setInterval(() => this._tick(), Math.round(1000 / this.fps));
      return true;
    }

    _fail(message) {
      this.error = message;
      if (!this._warned && global.console) {
        this._warned = true;
        console.warn('LiveFXMeter: Mikrofon-Pegel nicht verfügbar –', message);
      }
      return false;
    }

    _tick() {
      const a = this._analyser;
      const buf = this._buf;
      if (!a || !buf) return;
      try {
        a.getFloatTimeDomainData(buf);
      } catch (_) {
        return;
      }
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = buf.length ? Math.sqrt(sum / buf.length) : 0;
      this.level = rms;
      this.peak = Math.max(rms, this.peak * PEAK_DECAY);
      if (rms >= this.threshold) this.lastVoiceAt = now();
      if (this._onLevel) {
        try {
          this._onLevel(rms, this.peak);
        } catch (e) {
          if (global.console) console.error('LiveFXMeter onLevel failed', e);
        }
      }
    }

    /** True while the last tick was above `threshold` (with a short hold so word gaps do not flicker). */
    isVoiceActive() {
      if (!this.running) return false;
      if (this.level >= this.threshold) return true;
      return this.lastVoiceAt != null && now() - this.lastVoiceAt < this.holdMs;
    }

    stop() {
      this._starting = null; // a pending start() resolves false and releases its stream
      if (this._interval) clearInterval(this._interval);
      this._interval = null;
      if (this._source) {
        try {
          this._source.disconnect();
        } catch (_) {
          /* ignore */
        }
      }
      stopTracks(this._stream);
      closeContext(this._ctx);
      this._source = null;
      this._analyser = null;
      this._buf = null;
      this._stream = null;
      this._ctx = null;
      this.running = false;
      this.level = 0;
      this.peak = 0;
    }
  }

  function stopTracks(stream) {
    if (!stream || typeof stream.getTracks !== 'function') return;
    for (const t of stream.getTracks()) {
      try {
        t.stop();
      } catch (_) {
        /* ignore */
      }
    }
  }

  function closeContext(ctx) {
    if (!ctx || typeof ctx.close !== 'function') return;
    try {
      const p = ctx.close();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {
      /* already closed */
    }
  }

  global.LiveFXMeter = {
    FFT_SIZE,
    create: (opts) => new Meter(opts),
  };
})(typeof window !== 'undefined' ? window : globalThis);
