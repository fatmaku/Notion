# LiveFX v1.0 – Module contracts

This file is the single source of truth for every interface between LiveFX modules. Implementation
packages (P1–P7) own disjoint files and MUST NOT edit files owned by another package. If a contract
turns out to be wrong or insufficient, report it (`contractIssues`) instead of changing a foreign file.

Rules for every package:
- Code comments in English, UI strings in German.
- Zero runtime dependencies for the server and the browser (the Anthropic SDK + zod are *optional* and
  loaded lazily by `server/smart.js` only).
- No CORS headers anywhere. Never put untrusted strings into `innerHTML` without `LiveFXSchema.escapeHtml`.
- Every mutating HTTP route (POST/PUT/DELETE) goes through `auth.requireAuth`.
- Unit tests use `node:test` (`node --test "test/*.test.js"`), start the server through
  `test/helpers/server.js`, and never need a browser. e2e scenarios live in `test/e2e/NN-name.js` and
  export `async function run(ctx)`; see "Test harness" below.

---

## 1. Trigger schema v2 (`js/schema.js`, global `LiveFXSchema`, UMD – loads in Node and browser)

```js
{
  id: string,            // /^[a-z0-9][a-z0-9_-]{0,39}$/i, unique; missing/invalid/duplicate -> "custom-<n>"
  label: string,         // <= 40 chars, default = id
  keywords: string[],    // <= 50 entries, each <= 60 chars, trimmed, case-insensitively deduped
  enabled: boolean,      // default true (only `false` disables)
  cooldown: number,      // seconds 0..3600, default 4
  hint?: string,         // <= 120 chars, free-text description for smart mode ("streamer is stunned")
  sound: string | null,  // "airhorn" (builtin, LiveFXSounds.names) | "file:assets/boom.mp3" | null
  visual: {
    kind: 'card'|'image'|'banner'|'rain'|'confetti',   // default 'card'
    position: 'center'|'top'|'safe',                    // default 'center'
    emoji?: string,      // <= 16 chars
    text?: string,       // <= 80 chars
    bg?: string,         // /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i
    color?: string,      // same as bg
    src?: string,        // /^assets\/[a-z0-9][a-z0-9._-]{0,99}\.(png|jpe?g|gif|webp)$/i  or  /^https?:\/\/[^\s"'<>]{1,500}$/i
    count?: integer,     // 1..60 (rain)
    shake?: boolean
  }
}
```

Sound encoding is the **string form** `"file:assets/x.mp3"` – keeps `<select value>` binding, JSON
export/import and old data valid; one regex validates it.

Exports of `LiveFXSchema`:

| Export | Meaning |
|---|---|
| `VERSION` (=2), `KINDS`, `POSITIONS`, `LIMITS` | `LIMITS = {triggers:200, keywords:50, keywordLen:60, label:40, text:80, emoji:16, hint:120, rainCount:60, cooldown:3600, transcriptChars:2000, assetBytes:8*1024*1024, sourceLen:80, idLen:64}` |
| `ID_RE`, `SAFE_NAME`, `IMAGE_EXT`, `SOUND_EXT`, `ASSET_IMAGE_RE`, `ASSET_SOUND_RE`, `COLOR_RE` | regexes / lists above; `SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,99}$/i` |
| `isSafeName(name)` | `SAFE_NAME` **and** no `..` |
| `newId(prefix='m')` | `"<prefix>-<12 hex>"` via `crypto.randomUUID` (fallback time+random) |
| `parseSound(s)` | `{kind:'builtin', name}` \| `{kind:'file', url:'assets/x.mp3'}` \| `null` |
| `normalizeTrigger(raw, {usedIds?: Set})` | `{trigger, warnings: string[]}` or `null` when `raw` is not an object. Never throws. Adds the final id to `usedIds`. |
| `normalizeTriggers(any)` | `{triggers, warnings}`; non-array -> `{triggers: [], warnings: [...]}`; caps at `LIMITS.triggers` |
| `mergeWithDefaults({triggers, removed}, defaults)` | appends deep copies of defaults whose id is neither present nor listed in `removed` |
| `deriveRemoved(triggers, defaults)` | ids of defaults missing from `triggers` |
| `validateEnvelope(msg)` | for `/fire`: `{ok:true, msg}` with `type` in `fire\|volume`, `id` (kept if `/^[\w.-]{1,64}$/`, else new), `ts`, normalized `trigger` + `source` (<= 80, default "API") or clamped `volume`; unknown keys (e.g. `_keywords`) stripped. `{ok:false, error}` otherwise. |
| `escapeHtml(s)` | `& < > " '` |

## 2. Bus message envelope (BroadcastChannel and SSE carry identical JSON)

```
{ id: string, type: string, ts: number, ...payload }
fire:              { trigger, source }                    panel/API -> overlays (panel logs foreign ones)
volume:            { volume: 0..1 }                       panel -> overlays; server remembers in state.volume
transcript:        { text, final: boolean, lang?, source } server -> panels (external ASR push)
state:             { volume: number|null, overlays, panels, version }   server -> each new SSE subscriber
triggers-updated:  { updatedAt }                          server -> all after PUT /api/triggers
```
- `id` is created by the **sender** (`LiveFXSchema.newId()`); the server assigns one only if missing.
- Receivers keep an LRU of the last 300 ids in `Bus._emit` and drop repeats. A sender adds its own ids to that set, so it never processes its own echo (fixes double-fire through BroadcastChannel + SSE).
- SSE wire format: `retry: 2000\n\n` once at connect; every event is `id: <seq>\ndata: <json>\n\n` (unnamed -> `onmessage`); `seq` = per-process counter (`state.nextSeq()`); ring of the last 64 events is replayed for `Last-Event-ID` when younger than 5 s; heartbeat `: ping\n\n` every 15 s. Both roles subscribe to `/events?role=panel|overlay`.
- A `state` message is the first event every subscriber receives. `state.volume` applies in the overlay only when the URL has no `?volume=`; explicit `volume` messages always apply.

## 3. `js/bus.js` client contract (`LiveFXBus.Bus`) – owned by P1

```js
const bus = new LiveFXBus.Bus({ role: 'panel' | 'overlay' })
bus.send(msg) -> id            // adds id+ts, BroadcastChannel immediately, HTTP via queue (see below)
bus.onMessage(fn) -> unsubscribe   // deduplicated; own messages are never delivered back
bus.onStatus(fn)               // fn({ serverOk, sse: 'open'|'closed'|'connecting'|'off', authError })
bus.serverOk                   // boolean
bus.serverBase                 // '' over http(s), null under file://
bus.close()
```
- HTTP send queue: <= 20 entries, sequential, retries after 300/1000/3000 ms; `fire` messages older than 5 s are dropped; consecutive `volume` messages are coalesced to the latest; HTTP 401 sets `authError=true` and is not retried.
- SSE reconnect: when `EventSource.readyState === CLOSED`, recreate with backoff 1, 2, 4, 8, 15 s (reset on open).
- Panel and overlay both create the bus; the overlay's `window.livefx = {renderer, bus}`, the panel's `window.livefx = {bus, matcher, fire, handleText, triggers, asr, smart, store}`.

## 4. HTTP API (JSON everywhere; errors are `{ok:false, error:'<code>', message}`; **no CORS headers**)

| Route | Auth | Request | Response |
|---|---|---|---|
| `GET /health` | none | | `{ok, version, overlays, panels, uptime}` |
| `GET /events?role=panel\|overlay` | none | | SSE (section 2) |
| `GET /api/config` | same-origin | | `{ok, version, token, smart:{available, reason, model, mock}, limits:{assetBytes}}` |
| `POST /fire` | auth | envelope (`fire` or `volume`) | `{ok, id, overlays}`; 400 `invalid_envelope` |
| `POST /api/fire` | auth | `{id}` or `{trigger}`, `source?`, `force?` | `{ok, fired, reason?: 'cooldown'\|'gap'\|'disabled'\|'unknown', id}`; 404 `unknown_trigger` |
| `GET /api/triggers` | none | | `{ok, version:2, triggers, removed, updatedAt}` (already merged with defaults) |
| `PUT /api/triggers` | auth | `{triggers, removed?}` | `{ok, count, warnings}`; 400 `invalid_triggers` |
| `GET /api/assets` | none | | `{ok, assets:[{name, url:'assets/x.png', size, type:'image'\|'sound', mtime}]}` |
| `POST /api/assets` | auth | raw body; headers `x-filename`, `content-type`; <= `LIMITS.assetBytes` | `{ok, asset}`; 413 `payload_too_large`, 415 `unsupported_type`, 400 `bad_filename` |
| `DELETE /api/assets/:name` | auth | | `{ok}`; 404 `not_found` |
| `GET /assets/:name` | none | | file, `cache-control: public, max-age=3600` (served by `server/static.js`) |
| `POST /api/transcript` | auth | `{text (<= 2000), final?=true, lang?, source?}` | `{ok, panels}` |
| `POST /api/smart/classify` | auth | `{text, lang?}` | `{ok, triggerId\|null, confidence, model, ms, cached}`; 503 `smart_unavailable`, 429 `busy`\|`rate_limited`, 504 `timeout`, 502 `upstream` |
| `GET /api/smart/status` | none | | `{ok, available, reason, model, mock, calls, errors, timeouts, lastError}` |
| other `/api/*` | | | 404 `not_found` (registered by server.js) |

Upload contract: the browser sends `fetch('/api/assets', {method:'POST', body: file, headers: {'x-filename': file.name, 'content-type': file.type}})`; curl uses `--data-binary @file`. The server lower-cases and sanitizes the basename to `SAFE_NAME`, resolves collisions with `-2`, `-3`, …, verifies magic bytes (PNG `89 50 4E 47`, JPEG `FF D8 FF`, GIF `GIF8`, WEBP `RIFF….WEBP`, MP3 `ID3` or `FF Ex`/`FF Fx`, WAV `RIFF….WAVE`, OGG `OggS`) and writes to `data/assets/` via tmp file + rename.

### Auth (`server/auth.js`) – owned by P5

```js
loadOrCreateToken({dataDir, log}) -> string   // LIVEFX_TOKEN env, else data/token.txt (32 hex, mode 0600), created on first start
hostAllowed(req) -> boolean                    // Host is localhost / an IP literal / listed in LIVEFX_ALLOWED_HOSTS (comma separated)
isAuthorized(req, token) -> boolean            // Bearer token (constant-time compare) OR (hostAllowed AND same-origin signal (sec-fetch-site / Origin) AND (loopback socket OR panel cookie `livefx=<token>`, HttpOnly, set when index.html is served))
requireAuth(handler) -> handler                // wraps a route handler: 403 bad_host when !hostAllowed and no valid Bearer, 401 unauthorized otherwise
register(router, ctx)                          // no routes of its own
```
Browser modules never send the token (same-origin passes); external tools send `Authorization: Bearer <token>`.
The panel reads the token from `GET /api/config` and shows it.

### Environment variables

`PORT` (8787; `0` = random, printed), `HOST` (`127.0.0.1`; `0.0.0.0` opt-in), `LIVEFX_DATA_DIR` (`<root>/data`),
`LIVEFX_TOKEN`, `LIVEFX_ALLOWED_HOSTS`, `LIVEFX_MODEL` (`claude-opus-5-5`), `LIVEFX_SMART=0` (disable),
`LIVEFX_SMART_MOCK=1`, `LIVEFX_SMART_TIMEOUT_MS` (1500).

## 5. Server core (`server/router.js`, `server.js`) – owned by P0 (done)

```js
const { Router, HttpError, json, error, safeUrl, readBody, readJson } = require('./server/router');
class HttpError extends Error { constructor(status, code, message) }
json(res, status, obj, headers = {})
error(res, status, code, message)             // json(res, status, {ok:false, error:code, message})
safeUrl(req) -> URL | null                    // validates Host, url <= 2048 chars, never throws
readBody(req, {limit = 1e6, timeoutMs = 30000}) -> Promise<Buffer>   // rejects HttpError 413/408/400
readJson(req, limit) -> Promise<object>       // requires content-type application/json (415), valid JSON object (400 bad_json)
router.route(method /* 'GET'|'POST'|'PUT'|'DELETE'|'HEAD'|'*' */, pattern /* '/api/assets/:name' | RegExp */, handler)
router.dispatch(req, res, appCtx) -> Promise<boolean>   // first match wins; handler(req, res, ctx)
// ctx = { ...appCtx, url: URL, params: {name: 'decoded'} }
// appCtx = { bus, state, token, dataDir, rootDir, config: {version, host, port, model}, smart, log }
```
- `server.js` registers modules in this order: `api-fire`, `api-triggers`, `api-assets`, `api-transcript`, `api-smart`, `sse`, `/health`, `/api/*` 404, `static` (last). Every module exports `register(router, ctx)`; handler exceptions become JSON errors (HttpError -> its status, else 500) – the process never crashes on a request.
- `server.js` prints `LiveFX läuft auf http://127.0.0.1:<port>/` once listening (the test helper parses it).

### Module factories used by `server.js` (signatures are fixed; stubs exist)

```js
// server/state.js  (P2)
createState({dataDir, defaults, log}) -> {
  getTriggers() -> trigger[] (merged with defaults),  getRemoved() -> string[],
  setTriggers({triggers, removed}) -> {count, warnings},   // normalizes, persists data/triggers.json atomically, refreshes matcher
  matcher,           // LiveFXMatcher.Matcher over the enabled triggers (shared by /api/fire and smart mode)
  volume,            // number|null – last volume seen (set by api-fire)
  seq, nextSeq(),    // SSE sequence counter
  updatedAt, version: 2 }
// server/sse.js  (P0, done)
createSse({state, log, version}) -> { attach(req, res, {role}), broadcast(msg, {audience:'all'|'overlay'|'panel'}) -> number, counts() -> {overlays, panels}, close() }
// server/smart.js  (P4)
createSmart({log, model, getTriggers, classifyFn?, parse?, timeoutMs?, maxPerMinute?, cacheTtlMs?}) -> {
  init() -> Promise<void>, available, reason, model, mock, stats: {calls, errors, timeouts, lastError},
  classify(text, {lang}) -> Promise<{triggerId, confidence, ms, cached}>,   // throws HttpError 503/429/504/502
  buildRequest(text, triggers) -> request object (exported for tests) }
```

## 6. ASR abstraction (`js/asr.js`, global `LiveFXASR`) – owned by P5

```js
LiveFXASR.backends -> [{name:'webspeech', label:'Browser (Chrome/Edge)', supported}, {name:'external', label:'Extern (POST /api/transcript)', supported}]
LiveFXASR.create(name, { lang, bus, onText(text, isFinal, {source, lang}), onState(state), onError({code, message, fatal}) })
  -> { name, start(), stop(), setLang(lang), get state, get lang }
state ∈ 'idle' | 'starting' | 'listening' | 'restarting' | 'error' | 'unsupported'
```
- webspeech: one recognizer per generation, every handler starts with `if (rec !== this._rec) return;`; restart backoff `[0, 250, 1000, 2000, 5000, 10000]` ms indexed by consecutive restarts without a result (reset on `onresult`); `not-allowed`/`service-not-allowed`/`audio-capture` -> fatal; `network` -> backoff, fatal after 5; `no-speech`/`aborted` ignored. Interim + final mapping as in the old `panel.js` (`onresult` loop over `ev.results` from `ev.resultIndex`).
- external: `start()` subscribes to `transcript` messages on the bus and calls `onText(m.text, m.final !== false, {source: 'Extern', lang: m.lang})`; `unsupported` when `bus.serverBase === null`.

## 7. Smart mode (`server/smart.js`, `server/api-smart.js`, `js/smart.js`) – owned by P4

- SDK is loaded lazily: `const {default: Anthropic} = await import('@anthropic-ai/sdk'); const {zodOutputFormat} = await import('@anthropic-ai/sdk/helpers/zod'); const {z} = await import('zod');` (verified with sdk 0.129.0 + zod 4.6.5). Import failure -> `available=false, reason='no_sdk'`.
- **`new Anthropic()` does NOT throw without credentials.** Detect a missing key as: no `ANTHROPIC_API_KEY` and no `ANTHROPIC_AUTH_TOKEN` env and `client.apiKey == null && client.authToken == null` -> `reason='no_key'`. An `Anthropic.AuthenticationError` at call time -> `available=false, reason='bad_key'`.
- Request built by `buildRequest(text, triggers)`:
  ```js
  { model, max_tokens: 400,
    system: [ { type: 'text', text: STATIC_RULES },
              { type: 'text', text: catalog, cache_control: { type: 'ephemeral' } } ],
    messages: [{ role: 'user', content: `Utterance (${lang || 'auto'}): "${text.slice(0, 300)}"` }],
    output_config: { format: zodOutputFormat(Schema), effort: 'low' } }
  ```
  `Schema = z.object({ triggerId: z.string().nullable(), confidence: z.number() })` (no min/max – clamp server-side).
  `catalog` = one line per enabled trigger, sorted by id: `id | label | hint | keywords (<= 8)` -> byte-identical across calls until triggers change.
  Call: `client.messages.parse(request, { timeout: timeoutMs, maxRetries: 0 })`; `stop_reason === 'refusal'`, `parsed_output == null`, or an id not in the enabled set -> `{triggerId: null, confidence: 0}`.
- Server limits: one in-flight call (second -> 429 `busy`), token bucket `maxPerMinute` (429 `rate_limited`), 60 s result cache keyed by `LiveFXMatcher.normalize(text)` (`cached: true`), timeout -> 504 `timeout`, `RateLimitError` -> 429, other `APIError` -> 502 `upstream`.
- Injection points for tests: `classifyFn(text, triggers)` replaces the whole classifier (used by `LIVEFX_SMART_MOCK=1`: `/trigger:([a-z0-9_-]+)/i` -> that enabled id with confidence 0.9, else `null`); `parse(request, options)` replaces the SDK call.
- Panel gate (`js/smart.js`): `LiveFXSmart.create({bus?, minWords: 3, threshold: 0.6, onStatus}) -> {enabled, setEnabled(bool), shouldClassify(text, utteranceHits, isFinal), classify(text, lang) -> Promise<{triggerId, confidence}>, refreshStatus() -> Promise<status>}`; only final utterances, only when the keyword matcher had 0 hits in the utterance, >= 3 words, text !== last classified; fires only when `confidence >= threshold` via `matcher.fireById`. Toggle persisted in `localStorage['livefx.smart']`.

## 8. Matcher additions (`js/matcher.js`) – owned by P4

```js
matcher.fireById(id, now = Date.now()/1000) -> { trigger, blocked: null | 'cooldown' | 'gap' | 'disabled' | 'unknown' }
```
Updates `lastFireAt`/`lastGlobalFire` exactly like `process()`. Internal maps keyed by `t.id || 'idx-' + i`.

## 9. Renderer additions (`js/fx.js`) – owned by P3

- `renderer.fire(trigger)`: `sound` via `LiveFXSchema.parseSound`: builtin -> `LiveFXSounds.play`; file -> `<audio src=url>` appended to `#stage` (removed on `ended`/`error`), routed through `ctx.createMediaElementSource(audio) -> GainNode(volume) -> destination`, fallback `audio.volume` without AudioContext.
- `emoji`/`text` through `escapeHtml`; `img.setAttribute('src', v.src)` only after `ASSET_IMAGE_RE`/http regex check; `count` clamped to `LIMITS.rainCount`; drops/confetti set `--x` (0..1) instead of inline `left`; cards/images/banners get class `fx-pos-<position>`.
- `renderer.stats = { fires, sounds, fileSounds }`.

## 10. Overlay layout (`overlay.html`, `css/overlay.css`) – owned by P2

- `?layout=portrait` adds `body.layout-portrait`. Rain/confetti use `left: calc(var(--fx-x0, 0vw) + var(--x) * var(--fx-xspan, 100vw))` and fall `translateY(var(--fx-fall, 115vh))`; portrait sets `--fx-fall: 62vh` (drops fade before the bottom 35 %, where TikTok/IG chat sits).
- `.fx-pos-top { top: 18% }`; `.fx-pos-safe` = center in landscape, `top: 32%` in portrait; portrait image cards `max-width: 80vw; max-height: 40vh`.
- Overlay handles `state` (volume when no `?volume=` param) and `volume` messages; includes `js/schema.js`.

## 11. Panel DOM ids (fixed for tests) – owned by P6

`#asr` (select webspeech|external), `#smart` (checkbox), `#dot-smart`, `#dot-mic`, `#dot-server`, `#token`, `#btn-copy-token`,
`#asset-library`, `#pad button` (with `img.thumb` for image triggers), trigger rows `#trigger-rows tr` with buttons
`[data-act="edit"|"test"|"del"]`, `#lang`, `#btn-listen`, `#btn-mute`, `#sim`, `#btn-sim`, `#log`, `#volume`, `#gap`,
`#preview` (iframe `overlay.html?volume=0.5`), `#btn-add`, `#btn-export`, `#btn-import`, `#btn-reset`, `#transcript` (uses `<mark>`).
Script order in `index.html`: `sounds, triggers, packs, schema, matcher, bus, store, assets, editor, asr, smart, panel`.

Client helpers the panel consumes:
```js
LiveFXStore.load() -> Promise<{triggers, source: 'server'|'local'|'defaults'}>   // P2 – server first, then localStorage 'livefx.triggers.v2' (migrates v1), then defaults; always normalized + merged
LiveFXStore.save(triggers) -> Promise<void>       // debounced 300 ms PUT /api/triggers + localStorage mirror
LiveFXStore.reset() -> Promise<{triggers}>        // defaults, clears removed
LiveFXStore.onRemoteChange(fn)                    // triggers-updated from another client
LiveFXAssets.list() / upload(file) / remove(name) / thumbnailFor(trigger) -> {img?: url, emoji?: string} / mountLibrary(el, {onChange})   // P3
LiveFXEditor.open(trigger, {assets, sounds, onSave, onDelete}) -> Promise<trigger|null>   // P3, <dialog>
```

## 12. Test harness (P0, done)

```js
// test/helpers/server.js
startServer({env} = {}) -> Promise<{base, dataDir, token, stop(), proc}>   // temp LIVEFX_DATA_DIR, LIVEFX_TOKEN='test-token', LIVEFX_SMART_MOCK='1', PORT=0
api(base, method, path, {json, body, headers, token} = {}) -> Promise<{status, headers, json, text}>
sseClient(base, {role, lastEventId} = {}) -> Promise<{next(type?, ms = 3000) -> Promise<msg>, events: [{id, msg}], retry, close()}>
// test/resolve-playwright.js  -> module.exports = require('playwright') resolved locally or from the global npm root
// test/e2e.js                 -> runs test/e2e/*.js in name order; each exports async run({browser, startServer, api, sseClient, shotDir, log})
//                                `node test/e2e.js 30` runs only files starting with "30"
```
