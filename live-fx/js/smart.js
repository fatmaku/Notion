// LiveFX – smart mode gate for the control panel. See docs/CONTRACTS.md §7.
//
// The keyword matcher handles the obvious cases for free. Smart mode asks the server (which asks
// the Anthropic API) only for FINAL utterances that produced no keyword hit, have at least
// `minWords` words and differ from the last classified text. The panel then fires the returned
// trigger via `matcher.fireById(id)` when `confidence >= threshold`.
//
//   const smart = LiveFXSmart.create({ minWords: 3, threshold: 0.6, onStatus, serverBase: bus.serverBase });
//   if (smart.shouldClassify(text, hits.length, isFinal)) {
//     const r = await smart.classify(text, lang);
//     if (r.triggerId && r.confidence >= smart.threshold) { const {trigger, blocked} = matcher.fireById(r.triggerId); if (!blocked) fire(trigger, 'KI'); }
//   }
(function (global) {
  'use strict';

  const STORAGE_KEY = 'livefx.smart';

  function readToggle() {
    try {
      return global.localStorage && global.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function writeToggle(on) {
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch (_) {
      /* private mode / quota – the toggle just does not persist */
    }
  }

  function wordCount(text) {
    return String(text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function create({ minWords = 3, threshold = 0.6, onStatus = null, serverBase = '', bus = null } = {}) {
    // `serverBase === null` means file:// mode: there is no server to ask.
    const base = serverBase === null ? null : bus && bus.serverBase === null ? null : String(serverBase || '');
    let enabled = readToggle();
    let lastClassifiedText = null;
    let status = { available: false, reason: base === null ? 'offline' : null, model: null, mock: false };

    function emit(extra) {
      status = { ...status, ...extra };
      if (typeof onStatus === 'function') {
        try {
          onStatus(status);
        } catch (_) {
          /* listener errors never break the panel */
        }
      }
      return status;
    }

    async function request(method, path, body) {
      if (base === null) return { status: 0, json: null };
      const opts = { method, headers: {} };
      if (body !== undefined) {
        opts.headers['content-type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      let res;
      try {
        res = await fetch(`${base}${path}`, opts);
      } catch (e) {
        return { status: 0, json: null, error: 'network' };
      }
      let parsed = null;
      try {
        parsed = await res.json();
      } catch (_) {
        /* not JSON */
      }
      return { status: res.status, json: parsed };
    }

    const api = {
      threshold,
      minWords,
      get enabled() {
        return enabled;
      },
      get status() {
        return status;
      },
      get lastClassifiedText() {
        return lastClassifiedText;
      },

      setEnabled(on) {
        enabled = !!on;
        writeToggle(enabled);
        emit({ enabled });
        return enabled;
      },

      /** True when this utterance is worth an LLM call. Pure – no side effects. */
      shouldClassify(text, utteranceHits, isFinal) {
        if (!enabled || base === null) return false;
        if (!isFinal) return false;
        if ((utteranceHits || 0) > 0) return false;
        const t = String(text || '').trim();
        if (!t || wordCount(t) < minWords) return false;
        if (t === lastClassifiedText) return false;
        return true;
      },

      /** Asks the server. Never rejects: on any error resolves {triggerId: null, confidence: 0, error}. */
      async classify(text, lang) {
        const t = String(text || '').trim();
        lastClassifiedText = t;
        if (base === null) return { triggerId: null, confidence: 0, ms: 0, cached: false, error: 'offline' };
        const started = Date.now();
        const r = await request('POST', '/api/smart/classify', lang ? { text: t, lang } : { text: t });
        const j = r.json;
        if (r.status >= 200 && r.status < 300 && j && j.ok) {
          emit({ available: true, reason: null, model: j.model || status.model, lastError: null });
          return { triggerId: j.triggerId || null, confidence: Number(j.confidence) || 0, ms: j.ms, cached: j.cached === true, model: j.model };
        }
        const code = (j && j.error) || r.error || `http_${r.status}`;
        const extra = { lastError: code };
        // A 503 means the server-side classifier is gone (no key / bad key / disabled).
        if (r.status === 503) Object.assign(extra, { available: false, reason: (j && j.message) || code });
        emit(extra);
        return { triggerId: null, confidence: 0, ms: Date.now() - started, cached: false, error: code };
      },

      async refreshStatus() {
        if (base === null) return emit({ available: false, reason: 'offline' });
        const r = await request('GET', '/api/smart/status');
        const j = r.json;
        if (r.status === 200 && j && j.ok) {
          return emit({
            available: j.available === true,
            reason: j.reason || null,
            model: j.model || null,
            mock: j.mock === true,
            calls: j.calls,
            errors: j.errors,
            timeouts: j.timeouts,
            lastError: j.lastError || null,
          });
        }
        return emit({ available: false, reason: (j && j.error) || r.error || `http_${r.status}` });
      },
    };

    return api;
  }

  global.LiveFXSmart = { create, STORAGE_KEY, wordCount };
})(typeof window !== 'undefined' ? window : globalThis);
