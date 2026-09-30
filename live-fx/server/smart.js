// LiveFX – smart mode: semantic classification of a spoken utterance into one trigger id via the
// Anthropic API. See docs/CONTRACTS.md §5 and §7.
//
// The Anthropic SDK and zod are OPTIONAL dependencies. They are imported lazily in `init()`; when
// they are missing, smart mode reports `available: false, reason: 'no_sdk'` and the rest of LiveFX
// works as before. Never required at module load time.
//
// Availability reasons: null (ok) | 'disabled' (LIVEFX_SMART=0) | 'no_sdk' | 'no_key' | 'bad_key'
//
// Injection points (tests):
//   classifyFn(text, triggers, {lang, signal}) -> {triggerId, confidence}  replaces the whole classifier
//   parse(request, options) -> {parsed_output, stop_reason}                replaces client.messages.parse
//   LIVEFX_SMART_MOCK=1 installs a deterministic classifier ("trigger:<id>" in the text -> that id).
'use strict';

const { HttpError } = require('./router');
require('../js/matcher.js');

const DEFAULT_MODEL = 'claude-opus-5-5';
const MAX_TEXT = 2000;
const UTTERANCE_MAX = 300;
const CATALOG_KEYWORDS = 8;

const STATIC_RULES = [
  'You classify short live-stream utterances (German, English or Turkish) spoken by a streamer.',
  'The catalog below lists the available effect triggers, one per line:',
  'id | label | hint | keywords',
  'Return at most one trigger id from the catalog. Pick an id only when the meaning of the utterance',
  "clearly matches that trigger's intent (its label, hint or keywords). Prefer null when unsure, when",
  'the utterance is neutral small talk, or when it talks about this tool itself (triggers, effects,',
  'the overlay, the panel, sound settings). Never invent ids that are not in the catalog.',
  'confidence is a number from 0 (no match) to 1 (certain).',
].join('\n');

// Same shape as zodOutputFormat(z.object({triggerId: z.string().nullable(), confidence: z.number()}))
// minus the zod-specific `parse` function and description. Used when zod is not loaded (parse mode).
const PLAIN_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      triggerId: { type: ['string', 'null'] },
      confidence: { type: 'number' },
    },
    additionalProperties: false,
    required: ['triggerId', 'confidence'],
  },
};

const TIMEOUT_NAMES = ['APIConnectionTimeoutError', 'TimeoutError', 'AbortError'];

/**
 * True when `e` is (an instance of) the SDK error class `name`. Works with the loaded SDK
 * (`instanceof`) and with plain objects carrying a `name` property (tests without the SDK).
 */
function isSdkErrorLike(e, name, Anthropic) {
  if (!e) return false;
  if (Anthropic && typeof Anthropic[name] === 'function' && e instanceof Anthropic[name]) return true;
  return e.name === name || (e.constructor && e.constructor.name === name);
}

function catalogLine(t) {
  const clean = (s) => String(s || '').replace(/[\r\n|]+/g, ' ').trim();
  const kws = (Array.isArray(t.keywords) ? t.keywords : []).slice(0, CATALOG_KEYWORDS).map(clean).filter(Boolean);
  return `${t.id} | ${clean(t.label) || t.id} | ${clean(t.hint)} | ${kws.join(', ')}`;
}

function buildCatalog(triggers) {
  return (Array.isArray(triggers) ? triggers : [])
    .filter((t) => t && typeof t.id === 'string' && t.enabled !== false)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(catalogLine)
    .join('\n');
}

function enabledIds(triggers) {
  const s = new Set();
  for (const t of Array.isArray(triggers) ? triggers : []) if (t && typeof t.id === 'string' && t.enabled !== false) s.add(t.id);
  return s;
}

function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/** Deterministic classifier for tests / demos: "trigger:<id>" in the text selects that enabled id. */
function mockClassify(text, triggers) {
  const m = /trigger:([a-z0-9_-]+)/i.exec(text || '');
  if (m && enabledIds(triggers).has(m[1])) return { triggerId: m[1], confidence: 0.9 };
  const lower = m ? m[1].toLowerCase() : null;
  if (lower && enabledIds(triggers).has(lower)) return { triggerId: lower, confidence: 0.9 };
  return { triggerId: null, confidence: 0 };
}

function createSmart({
  log = () => {},
  model,
  getTriggers = () => [],
  classifyFn = null,
  parse = null,
  timeoutMs,
  maxPerMinute = 30,
  cacheTtlMs = 60000,
} = {}) {
  const { normalize } = globalThis.LiveFXMatcher;
  const envTimeout = Number(process.env.LIVEFX_SMART_TIMEOUT_MS);
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 1500;
  const modelId = model || process.env.LIVEFX_MODEL || DEFAULT_MODEL;

  let Anthropic = null;
  let client = null;
  let format = PLAIN_FORMAT;
  let classifier = null; // (text, triggers, {lang, signal}) -> {triggerId, confidence}
  let inFlight = false;
  const cache = new Map(); // normalized text -> {value, expires}
  const bucket = { tokens: maxPerMinute, refilledAt: Date.now() };

  const smart = {
    available: false,
    reason: null,
    model: modelId,
    mock: false,
    stats: { calls: 0, errors: 0, timeouts: 0, lastError: null },
    timeoutMs: timeout,

    buildRequest(text, triggers, lang) {
      const utterance = String(text || '').slice(0, UTTERANCE_MAX);
      return {
        model: modelId,
        max_tokens: 400,
        system: [
          { type: 'text', text: STATIC_RULES },
          { type: 'text', text: buildCatalog(triggers), cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: `Utterance (${lang || 'auto'}): "${utterance}"` }],
        output_config: { format, effort: 'low' },
      };
    },

    async init() {
      if (process.env.LIVEFX_SMART === '0') {
        setUnavailable('disabled');
        log('smart: deaktiviert (LIVEFX_SMART=0)');
        return;
      }
      if (process.env.LIVEFX_SMART_MOCK === '1' && !classifyFn && !parse) {
        smart.mock = true;
        classifier = mockClassify;
        setAvailable();
        log('smart: Mock-Modus (LIVEFX_SMART_MOCK=1)');
        return;
      }
      if (classifyFn) {
        classifier = classifyFn;
        setAvailable();
        return;
      }
      if (parse) {
        classifier = sdkClassifier(parse);
        setAvailable();
        return;
      }
      let mods;
      try {
        const [sdk, zodHelper, zod] = await Promise.all([import('@anthropic-ai/sdk'), import('@anthropic-ai/sdk/helpers/zod'), import('zod')]);
        mods = { Anthropic: sdk.default, zodOutputFormat: zodHelper.zodOutputFormat, z: zod.z };
      } catch (e) {
        setUnavailable('no_sdk');
        log('smart: Anthropic SDK nicht installiert – Smart-Modus aus (npm install @anthropic-ai/sdk zod)');
        return;
      }
      Anthropic = mods.Anthropic;
      const Schema = mods.z.object({ triggerId: mods.z.string().nullable(), confidence: mods.z.number() });
      format = mods.zodOutputFormat(Schema);
      client = new Anthropic();
      const hasEnv = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
      if (!hasEnv && client.apiKey == null && client.authToken == null) {
        setUnavailable('no_key');
        log('smart: kein API-Key (ANTHROPIC_API_KEY setzen) – Smart-Modus aus');
        return;
      }
      classifier = sdkClassifier((request, options) => client.messages.parse(request, options));
      setAvailable();
      log(`smart: bereit (Modell ${modelId})`);
    },

    async classify(text, { lang } = {}) {
      if (typeof text !== 'string') throw new HttpError(400, 'invalid_text', 'text muss ein String sein');
      const trimmed = text.trim();
      if (!trimmed) throw new HttpError(400, 'invalid_text', 'text darf nicht leer sein');
      if (trimmed.length > MAX_TEXT) throw new HttpError(400, 'invalid_text', `text darf höchstens ${MAX_TEXT} Zeichen haben`);
      if (!smart.available) throw new HttpError(503, 'smart_unavailable', smart.reason || 'smart_unavailable');

      const key = normalize(trimmed);
      const now = Date.now();
      const hit = cache.get(key);
      if (hit && hit.expires > now) return { ...hit.value, cached: true };
      if (hit) cache.delete(key);

      if (inFlight) throw new HttpError(429, 'busy', 'eine Klassifikation läuft bereits');
      if (!takeToken(now)) throw new HttpError(429, 'rate_limited', `höchstens ${maxPerMinute} Anfragen pro Minute`);

      inFlight = true;
      const started = Date.now();
      const langStr = typeof lang === 'string' ? lang.slice(0, 10) : undefined;
      try {
        const triggers = getTriggers() || [];
        const raw = await withTimeout((signal) => classifier(trimmed, triggers, { lang: langStr, signal }), timeout);
        smart.stats.calls++;
        const ids = enabledIds(triggers);
        let triggerId = raw && typeof raw.triggerId === 'string' ? raw.triggerId : null;
        let confidence = clamp01(raw && raw.confidence);
        if (triggerId !== null && !ids.has(triggerId)) {
          // Unknown or disabled id: the model must never make the panel fire something it cannot see.
          triggerId = null;
          confidence = 0;
        }
        const value = { triggerId, confidence, ms: Date.now() - started, model: modelId };
        pruneCache(now);
        cache.set(key, { value, expires: Date.now() + cacheTtlMs });
        return { ...value, cached: false };
      } catch (e) {
        throw mapError(e);
      } finally {
        inFlight = false;
      }
    },

    /** Drops cached results (called when triggers change). */
    clearCache() {
      cache.clear();
    },
  };

  function setAvailable() {
    smart.available = true;
    smart.reason = null;
  }

  function setUnavailable(reason) {
    smart.available = false;
    smart.reason = reason;
  }

  function takeToken(now) {
    const elapsed = now - bucket.refilledAt;
    if (elapsed > 0) {
      bucket.tokens = Math.min(maxPerMinute, bucket.tokens + (elapsed / 60000) * maxPerMinute);
      bucket.refilledAt = now;
    }
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  function pruneCache(now) {
    if (cache.size < 200) return;
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
    while (cache.size >= 200) cache.delete(cache.keys().next().value);
  }

  /** Runs fn(signal) and rejects with a TimeoutError after `ms` milliseconds. */
  function withTimeout(fn, ms) {
    const ac = new AbortController();
    let timer;
    const timeoutP = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`classification exceeded ${ms} ms`);
        err.name = 'TimeoutError';
        ac.abort(err);
        reject(err);
      }, ms);
    });
    return Promise.race([Promise.resolve().then(() => fn(ac.signal)), timeoutP]).finally(() => clearTimeout(timer));
  }

  /** Wraps a `parse(request, options)` function into a classifier. */
  function sdkClassifier(parseFn) {
    return async (text, triggers, { lang, signal }) => {
      const request = smart.buildRequest(text, triggers, lang);
      const result = await parseFn(request, { timeout, maxRetries: 0, signal });
      if (!result || result.stop_reason === 'refusal' || result.parsed_output == null) return { triggerId: null, confidence: 0 };
      const out = result.parsed_output;
      return { triggerId: typeof out.triggerId === 'string' ? out.triggerId : null, confidence: out.confidence };
    };
  }

  function mapError(e) {
    if (e instanceof HttpError) return e;
    smart.stats.errors++;
    const msg = e && e.message ? String(e.message).slice(0, 200) : String(e);
    smart.stats.lastError = msg;
    if (TIMEOUT_NAMES.some((n) => isSdkErrorLike(e, n, Anthropic))) {
      smart.stats.timeouts++;
      return new HttpError(504, 'timeout', 'KI-Antwort dauerte zu lange');
    }
    if (isSdkErrorLike(e, 'AuthenticationError', Anthropic)) {
      setUnavailable('bad_key');
      log('smart: API-Key abgelehnt – Smart-Modus aus');
      return new HttpError(503, 'smart_unavailable', 'bad_key');
    }
    if (isSdkErrorLike(e, 'RateLimitError', Anthropic)) return new HttpError(429, 'rate_limited', 'API-Rate-Limit erreicht');
    if (isSdkErrorLike(e, 'APIError', Anthropic) || (e && typeof e.status === 'number')) {
      return new HttpError(502, 'upstream', `API-Fehler: ${msg}`);
    }
    log('smart: classify failed:', e && e.stack ? e.stack : e);
    return new HttpError(502, 'upstream', `Klassifikation fehlgeschlagen: ${msg}`);
  }

  return smart;
}

module.exports = { createSmart, isSdkErrorLike, STATIC_RULES, buildCatalog, mockClassify, PLAIN_FORMAT };
