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

## 1. Trigger schema v3 (`js/schema.js`, global `LiveFXSchema`, UMD – loads in Node and browser)

```js
{
  id: string,            // /^[a-z0-9][a-z0-9_-]{0,39}$/i, unique; missing/invalid/duplicate -> "custom-<n>"
  label: string,         // <= 40 chars, default = id
  keywords: string[],    // <= 50 entries, each <= 60 chars, trimmed, case-insensitively deduped
  enabled: boolean,      // default true (only `false` disables)
  cooldown: number,      // seconds 0..3600, default 4
  hint?: string,         // <= 120 chars, free-text description for smart mode ("streamer is stunned")
  sound: string | null,  // "airhorn" (builtin, LiveFXSounds.names) | "file:assets/boom.mp3" | "loop:rain" | null
  gain?: number,         // v3: 0..1 per-trigger volume multiplier (effective = master × gain); absent = 1
  visual: {
    kind: 'card'|'image'|'banner'|'rain'|'confetti'|'scene'|'sticker'|'text'|'lower-third'|'combo',   // default 'card'
    position: 'center'|'top'|'safe',                    // default 'center'
    emoji?: string,      // <= 16 chars (<= 32 for sticker)
    text?: string,       // <= 80 chars
    bg?: string,         // /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i
    color?: string,      // same as bg
    color2?: string,     // v3, same as bg (second colour of `text` gradients / glitch layers / 2.1 sticker burst)
    src?: string,        // kind 'image' (2.1): one of
                         //   upload   /^assets\/[a-z0-9][a-z0-9._-]{0,99}\.(png|jpe?g|gif|webp)$/i          (UPLOAD_IMAGE_RE)
                         //   sticker  /^memes\/[a-z0-9_-]{1,40}\/[a-z0-9_-]{1,80}\.(webp|png)$/            (MEMES_IMAGE_RE)
                         //   hotlink  /^https:\/\/(?:(?:[a-z0-9-]{1,63}\.)?klipy\.com|(?:media[0-9]?|i)\.giphy\.com)\/[^\s"'<>\\]{1,480}$/i   (HOTLINK_SRC_RE)
                         //   never `..`; any other http(s) URL (incl. http://, userinfo, ports, look-alike hosts) -> card + warning
                         //   `emoji` on an image visual is the fallback the overlay shows when the image fails to load
    count?: integer,     // 1..60 (rain)
    shake?: boolean,
    // v3 – on every kind (only `true` / explicit values are stored, so v2 records never gain keys):
    glow?: true,         // glow layers (box/text shadow, drop-shadow on emoji)
    tilt?: true,         // 3D card tilt (card / image / confetti card)
    impact?: true,       // stage zoom bump (#stage.fx-impact, 250 ms) + mixer.duck(250)
    intensity?: 1|2|3,   // default 1: particle cap 400/800/1200, light rays + ring behind cards at >= 2, spark burst at 3
    // kind 'scene' (1.3): scene (SCENES), intensity (default 2), duration (s, 0..3600), caption (bool)
    // kind 'text' (v3):
    style?: 'neon'|'gradient'|'bounce'|'glitch'|'sticker',   // default 'neon'; `text` is required (else -> card); 'sticker' = 2.1 comic sticker (color = fill, default #ffd166; color2 = burst, default #ff2d75)
    // kind 'lower-third' (v3): landscape only – the overlay renders a banner in portrait
    title?: string,      // <= 60 chars, falls back to `text`; missing -> kind 'banner'
    subtitle?: string,   // <= 80 chars
    // kind 'combo' (v3):
    steps?: [{ delay: ms (0..10000), visual: {…normalized recursively…}, sound?: string }]   // 1..6 steps; a step may not be a combo (-> card + warning)
  }
}
```

v2 compatibility: `normalizeTrigger` accepts every v2 record unchanged (byte-for-byte equal output). A non-scene
visual that still carries a `scene` id (v2 editor kind switch) drops the whole scene bundle incl. `intensity`,
exactly like v2 did.

Sound encoding is the **string form** `"file:assets/x.mp3"` – keeps `<select value>` binding, JSON
export/import and old data valid; one regex validates it.

Exports of `LiveFXSchema`:

| Export | Meaning |
|---|---|
| `VERSION` (=3), `SCHEMA_VERSION` (=3), `KINDS`, `POSITIONS`, `SCENES`, `LOOPS`, `TEXT_STYLES`, `THEMES`, `LIMITS` | `LIMITS = {triggers:1000 (2.2, was 200), keywords:50, keywordLen:60, label:40, text:80, emoji:16, hint:120, rainCount:60, stickerEmoji:32, sceneDuration:3600, cooldown:3600, transcriptChars:2000, assetBytes:8*1024*1024, sourceLen:80, idLen:64, comboSteps:6, comboDelay:10000, title:60, subtitle:80}`; `TEXT_STYLES = ['neon','gradient','bounce','glitch','sticker']` (2.1); `THEMES = ['neon','pastel','minimal','kinderbuch']` |
| `ID_RE`, `SAFE_NAME`, `IMAGE_EXT`, `SOUND_EXT`, `ASSET_IMAGE_RE`, `ASSET_SOUND_RE`, `COLOR_RE` | regexes / lists above; `SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,99}$/i` |
| `UPLOAD_IMAGE_RE`, `MEMES_IMAGE_RE`, `HOTLINK_SRC_RE` (2.1) | the three allowed `visual.src` forms above; `ASSET_IMAGE_RE` = upload or sticker (same-origin); `HTTP_SRC_RE` is a deprecated alias of `HOTLINK_SRC_RE` (it used to accept any http(s) URL) |
| `PERF_MODES` (2.1) | `['auto','eco','high']` – overlay performance modes (docs/PERFORMANCE.md) |
| `isImageSrc(src)` | upload or sticker (no `..`) or KLIPY/GIPHY hotlink |
| `isSafeName(name)` | `SAFE_NAME` **and** no `..` |
| `newId(prefix='m')` | `"<prefix>-<12 hex>"` via `crypto.randomUUID` (fallback time+random) |
| `parseSound(s)` | `{kind:'builtin', name}` \| `{kind:'file', url:'assets/x.mp3'}` \| `null` |
| `normalizeTrigger(raw, {usedIds?: Set})` | `{trigger, warnings: string[]}` or `null` when `raw` is not an object. Never throws. Adds the final id to `usedIds`. |
| `normalizeTriggers(any)` | `{triggers, warnings}`; non-array -> `{triggers: [], warnings: [...]}`; caps at `LIMITS.triggers` |
| `mergeWithDefaults({triggers, removed}, defaults)` | appends deep copies of defaults whose id is neither present nor listed in `removed` |
| `deriveRemoved(triggers, defaults)` | ids of defaults missing from `triggers` |
| `validateEnvelope(msg)` | for `/fire`: `{ok:true, msg}` with `type` in `fire\|volume\|theme\|perf\|layout\|story\|story-state` (2.2), `id` (kept if `/^[\w.-]{1,64}$/`, else new), `ts`, normalized `trigger` + `source` (<= 80, default "API"), clamped `volume` + optional `bus` (`sfx`\|`ambient`; `master`/omitted = no `bus` key, 2.2), partial `layout` (`storyLayout`/`band` 15..35/`zone`/`bandPosition`/`storyStyle` (2.2.1), >= 1 key), `story` (`text` <= 500, `final` default true, `lang` de\|tr\|en?, `source`?), `story-state` (`state` via `normalizeStoryState`), `theme` (one of `THEMES`) or `perf` (one of `PERF_MODES`, 2.1); unknown keys (e.g. `_keywords`) stripped. `{ok:false, error}` otherwise. |
| `escapeHtml(s)` | `& < > " '` |
| `STORY_LAYOUTS` / `ZONES` / `LAYOUT_DEFAULTS` (2.2) | `['band','full','frame']` / `['full','edges','bottom','top']` / `{storyLayout:'band', band:22, zone:'edges'}` (frozen; stays the 2.2 triple – panels spread it); `LIMITS.bandMin` 15, `LIMITS.bandMax` 35 |
| `BAND_POSITIONS` / `STORY_STYLES` / `BAND_POSITION_DEFAULT` / `STORY_STYLE_DEFAULT` (2.2.1) | `['bottom','chat']` (portrait band flush with the frame bottom / above the 35 % chat zone; landscape ignores it) / `['emoji','sketch','mixed']` (live-story drawing style; without `LiveFXSketch` every style renders as emoji) / `'bottom'` / `'mixed'` |
| `normalizeBand(v)` (2.2) | percent clamped 15..35 and rounded, `undefined` for non-numeric |
| `normalizeLayout(raw, base = LAYOUT_DEFAULTS)` (2.2) | `{storyLayout, band, zone, bandPosition, storyStyle}` – keys missing / invalid in `raw` come from `base`, then from `LAYOUT_DEFAULTS` (partial merge; a 2.2 base without the new keys gets their defaults), never throws |
| `VOLUME_BUSES` / `VOLUME_DEFAULTS` (2.2) | `['master','sfx','ambient']` / `{master:0.5, sfx:0.8, ambient:0.5}` (frozen) |
| `STORY_MOODS` / `normalizeStoryState(raw)` (2.2) | `['calm','happy','tense','sad','scary']`; state `{scene: SCENES minus clear \| null, weather, time, place, landmark?, mood, actors[<=6]{emoji, role, action?}, props[<=5]{emoji, role}, loop?, caption?, end?, shake?}` – words trimmed to 24 letters/digits, unknown mood -> calm, `null` for a non-object |
| `LIMITS.triggers` | **1000** since 2.2 (was 200); `LIMITS.storyText` 500, `LIMITS.storyWord` 24 |

## 2. Bus message envelope (BroadcastChannel and SSE carry identical JSON)

```
{ id: string, type: string, ts: number, ...payload }
fire:              { trigger, source }                    panel/API -> overlays (panel logs foreign ones)
volume:            { volume: 0..1, bus?: 'sfx'|'ambient' }   panel -> overlays; no `bus` = master (1.x compatible). Server remembers state.volumes[bus] (+ state.volume for master)
theme:             { theme: 'neon'|'pastel'|'minimal'|'kinderbuch' }   panel -> overlays (v3); overlay ignores it when the URL has ?theme=
perf:              { perf: 'auto'|'eco'|'high' }          panel -> overlays (2.1); server remembers in state.perf; overlay ignores it when the URL has ?perf=
transcript:        { text, final: boolean, lang?, source } server -> panels (external ASR push)
layout:            { storyLayout?: 'band'|'full'|'frame', band?: 15..35, zone?: 'full'|'edges'|'bottom'|'top', bandPosition?: 'bottom'|'chat', storyStyle?: 'emoji'|'sketch'|'mixed' }   panel -> overlays (2.2, partial: only the keys sent change; bandPosition / storyStyle 2.2.1); server merges into state.layout; overlay ignores keys pinned by ?story= ?band= ?zone= ?bandpos= ?storystyle=
story:             { text, final: boolean, lang?: 'de'|'tr'|'en', source? }   panel/API -> overlays (2.2): one transcript sentence; every overlay feeds it into its own LiveFXStoryDirector -> renderer.story(state)
story-state:       { state: {scene, weather, time, place, landmark?, mood, actors, props, loop?, caption?, end?, shake?} }   anyone -> overlays (2.2): a ready-made scene state (normalizeStoryState), renderer.story(state)
state:             { volume: number|null, theme: string|null, perf: string|null, layout: {storyLayout?, band?, zone?, bandPosition?, storyStyle?}|null, volumes: {master?, sfx?, ambient?}|null, overlays, panels, version }   server -> each new SSE subscriber (theme = last `theme` message, 1.6; perf = last `perf` message, 2.1; layout = merged `layout` messages, volumes = last level per bus, 2.2)
triggers-updated:  { updatedAt }                          server -> all after PUT /api/triggers
```
- `id` is created by the **sender** (`LiveFXSchema.newId()`); the server assigns one only if missing.
- Receivers keep an LRU of the last 300 ids in `Bus._emit` and drop repeats. A sender adds its own ids to that set, so it never processes its own echo (fixes double-fire through BroadcastChannel + SSE).
- SSE wire format: `retry: 2000\n\n` once at connect; every event is `id: <seq>\ndata: <json>\n\n` (unnamed -> `onmessage`); `seq` = per-process counter (`state.nextSeq()`); ring of the last 64 events is replayed for `Last-Event-ID` when younger than 5 s; heartbeat `: ping\n\n` every 15 s. Both roles subscribe to `/events?role=panel|overlay`.
- A `state` message is the first event every subscriber receives. `state.volume` / `state.volumes.master` apply in the overlay only when the URL has no `?volume=` (`sfx` / `ambient` always), `state.layout` keys only when not pinned by `?story=` / `?band=` / `?zone=` / `?bandpos=` / `?storystyle=` (2.2.1); explicit `volume` / `layout` messages always apply (minus pinned layout keys).

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
- Panel and overlay both create the bus (2.1: the panel also exposes `window.livefx.perf {get(), set(mode)}`); the overlay's `window.livefx = {renderer, bus}`, the panel's `window.livefx = {bus, matcher, fire, handleText, triggers, asr, smart, store}`.

## 4. HTTP API (JSON everywhere; errors are `{ok:false, error:'<code>', message}`; **no CORS headers**)

| Route | Auth | Request | Response |
|---|---|---|---|
| `GET /health` | none | | `{ok, version, overlays, panels, uptime}` |
| `GET /events?role=panel\|overlay` | none | | SSE (section 2) |
| `GET /api/config` | same-origin | | `{ok, version, token, smart:{available, reason, model, mock}, limits:{assetBytes}, lanIps:string[] (IPv4, non-internal, from os.networkInterfaces()), secure:boolean (TLS on), port:number (actually bound port)}` |
| `GET /m?token=<token>` | none (the token IS the credential) | query `token` | constant-time compare with the server token: 302 `location: /mobile.html` + `set-cookie: livefx=<token>; HttpOnly; SameSite=Strict; Path=/` (+ `; Secure` over TLS); wrong → 401 `unauthorized` (German message); > 10 wrong attempts per minute per `req.socket.remoteAddress` → 429 `rate_limited`; no `token` param → 302 to `/mobile.html` without a cookie (`server/api-mobile.js`, registered before static) |
| `POST /fire` | auth | envelope (`fire`, `volume`, `theme`, `perf`, 2.2: `layout`, `story`, `story-state`; `theme`/`perf`/`volume` (per bus) /`layout` are remembered in `ctx.state`) | `{ok, id, overlays}`; 400 `invalid_envelope` |
| `POST /api/fire` | auth | `{id}` or `{trigger}`, `source?`, `force?` | `{ok, fired, reason?: 'cooldown'\|'gap'\|'disabled'\|'unknown', id}`; 404 `unknown_trigger` |
| `GET /api/triggers` | none | | `{ok, version:2, triggers, removed, updatedAt}` (already merged with defaults) |
| `PUT /api/triggers` | auth | `{triggers, removed?}` (body <= 6 MB since 2.2, was 2 MB) | `{ok, count, warnings}`; 400 `invalid_triggers` |
| `GET /api/assets` | none | | `{ok, assets:[{name, url:'assets/x.png', size, type:'image'\|'sound', mtime}]}` |
| `POST /api/assets` | auth | raw body; headers `x-filename`, `content-type`; <= `LIMITS.assetBytes` | `{ok, asset}`; 413 `payload_too_large`, 415 `unsupported_type`, 400 `bad_filename` |
| `DELETE /api/assets/:name` | auth | | `{ok}`; 404 `not_found` |
| `GET /assets/:name` | none | | file, `cache-control: public, max-age=3600` (served by `server/static.js`) |
| `POST /api/transcript` | auth | `{text (<= 2000), final?=true, lang?, source?}` | `{ok, panels}` |
| `POST /api/smart/classify` | auth | `{text, lang?}` | `{ok, triggerId\|null, confidence, model, ms, cached}`; 503 `smart_unavailable`, 429 `busy`\|`rate_limited`, 504 `timeout`, 502 `upstream` |
| `GET /api/smart/status` | none | | `{ok, available, reason, model, mock, calls, errors, timeouts, lastError}` |
| `GET /api/tunnel` (2.2) | auth | | `{ok, status:'idle'\|'starting'\|'online'\|'error', url, hostname, phoneUrl (https://<x>.trycloudflare.com/m?token=…), since, error, manualUrl, binary}` (`server/api-tunnel.js`, `server/tunnel.js`) |
| `POST /api/tunnel/start` (2.2) | auth | | same shape; resolves when the tunnel is `online` or `error` (binary from `LIVEFX_CLOUDFLARED` / PATH / one-time SHA-256-verified download to `<dataDir>/bin/`) |
| `POST /api/tunnel/stop` (2.2) | auth | | same shape, `status:'idle'`; the child also dies with the server |

Tunnel guard (2.2, `server/api-tunnel.js guard(req)`, run by server.js before routing): requests arriving through the tunnel (Host `*.trycloudflare.com` or a `cf-connecting-ip` header) need the panel cookie or a Bearer – only `GET /m`, `/health`, `/favicon.ico` are open; the tunnel hostname is appended to `LIVEFX_ALLOWED_HOSTS` only while the tunnel is online.
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
`LIVEFX_SMART_MOCK=1`, `LIVEFX_SMART_TIMEOUT_MS` (1500), `LIVEFX_TLS_CERT` + `LIVEFX_TLS_KEY` (PEM paths; both or
neither – `https.createServer`, printed URLs `https://`, `config.secure = true`; one missing/unreadable → German
error on stderr + exit 1; see docs/HANDY-HTTPS.md).

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
  volume,            // number|null – last master volume seen (set by api-fire)
  layout, volumes,   // 2.2: {storyLayout?, band?, zone?}|null (merged `layout` messages), {master?, sfx?, ambient?}|null (last `volume` per bus)
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

## 6. ASR abstraction (`js/asr.js`, global `LiveFXASR`; mic meter `js/meter.js`, global `LiveFXMeter`) – owned by P5

```js
LiveFXASR.backends -> [{name:'webspeech', label:'Browser (Chrome/Edge)', supported}, {name:'external', label:'Extern (POST /api/transcript)', supported},
                      {name:'whisper', label:'Offline (Whisper, experimentell)', supported}]
LiveFXASR.create(name, {
  lang, bus,
  onText(text, isFinal, { source, lang, at, alternatives?: string[], confidence?: number }),
  onState(state), onError({ code, message, fatal }),
  alternatives: false,   // true -> rec.maxAlternatives = 3; meta.alternatives on FINAL results (deduped, primary dropped; [] when Chrome sent none)
  restartEveryMs: 0,     // 0 = off; e.g. 60000 -> planned restart, only in a speech gap
  stallMs: 20000,        // 0 = off; no result for this long while 'listening' -> stalled restart
  voiceActivity: null,   // optional () => boolean (LiveFXMeter.isVoiceActive); gates the stall watchdog + the planned restart
  onEvent: null,         // ({ type, at, ...}) – see below
})
  -> { name, start(), stop(), setLang(lang), setOptions({ alternatives?, restartEveryMs?, stallMs? }), get state, get lang, get stats, get options }
state ∈ 'idle' | 'starting' | 'listening' | 'restarting' | 'error' | 'unsupported'
stats  = { results, finals, restarts, plannedRestarts, stalls, lastResultAt, lastFinalAt, startedAt }   // *At = performance.now() or null; reset on start()
LiveFXASR.BACKOFF_MS, LiveFXASR.ALTERNATIVES_N (3), LiveFXASR.DEFAULT_STALL_MS (20000)
```
- `meta.at` is `performance.now()` at the moment the result arrived (latency = `meta.at − meter.lastVoiceAt`). `meta.confidence` only on finals when the engine reports one (min over the finals of the event). `meta.alternatives` only when `alternatives` is on and the result is final.
- `onEvent` types: `result` (interim, `{text, isFinal:false}`), `final` (`{text, isFinal:true}`), `restart` (unplanned `onend`/start failure, `{delay, restarts}`), `planned-restart` (`{restarts}`), `stall` (`{idleMs, stalls}`). Every event carries `at`.
- `stats.restarts` counts every respawn after the first recognizer (backoff + planned + stalled); `plannedRestarts` and `stalls` are the sub-counts, so the panel can show „Neustarts 3 (geplant 2, hängend 1)“. The backoff index (consecutive restarts without a result) is separate and untouched by planned restarts.
- webspeech: one recognizer per generation, every handler starts with `if (rec !== this._rec) return;`; restart backoff `[0, 250, 1000, 2000, 5000, 10000]` ms indexed by consecutive restarts without a result (reset on `onresult`); `not-allowed`/`service-not-allowed`/`audio-capture` -> fatal; `network` -> backoff, fatal after 5; `no-speech`/`aborted` ignored. `onresult` loops over `ev.results` from `ev.resultIndex`; finals are joined with a space, interim chunks likewise (Chrome delivers them without a leading space).
- Planned restart: timer armed in `onstart`; when it fires and the last result is < 1.5 s old or `voiceActivity()` is true, it is deferred in 1 s steps (max 10 s), then `rec.stop()` (graceful: pending finals still arrive) -> `onend` respawns with delay 0 (no `onend` within 3 s -> abort + respawn). Not an error restart: no `onError`, backoff index unchanged.
- Stall watchdog: re-armed on every `onstart`/`onresult`; fires only in state `listening` when `stallMs` passed without a result and (`voiceActivity` unset, or voice was seen since the last result – sampled once per second) -> `onError({code:'stalled', message:'Erkennung hängt – Neustart', fatal:false})`, `stats.stalls++`, abort + respawn (state `restarting`).
- `setOptions()` works live: `alternatives` respawns the recognizer (`maxAlternatives` is read at `start()`), `restartEveryMs`/`stallMs` re-arm their timers. All timers are cleared by `stop()`, on fatal errors and whenever a generation is killed.
- external: `start()` subscribes to `transcript` messages on the bus and calls `onText(m.text, m.final !== false, {source: 'Extern', lang: m.lang, at})`; `unsupported` when `bus.serverBase === null`. `alternatives`/`restartEveryMs`/`stallMs`/`voiceActivity` are ignored and `setOptions()` is a no-op; `stats` counts results/finals, `onEvent` gets `result`/`final`.

### Backend `auto` and on-device recognition (LiveFX 2.2)

```js
LiveFXASR.create('auto', { langs: ['de-DE','tr-TR','en-US'], primaryLang: 'tr-TR', parallel: 'try'|'on'|'off', window: 3, switchAfter: 2,
                           onDevice: 'auto'|'off', alternatives, restartEveryMs, stallMs, voiceActivity, onText, onState, onError, onEvent })
  -> + get family, get langs, get primary (tag), get pinned, get parallel, get onDevice ('on'|'fallback'|'unsupported'|'off'|null)
options += { langs, primaryLang, window, switchAfter, parallel, onDevice }; stats += { switches, parallel, detected: {de, tr, en} }
LiveFXASR.AUTO_QUICK_SCORE 0.6, AUTO_SWITCH_SCORE 0.45, AUTO_GAP_MAX_MS 2000, AUTO_RETURN_FINALS 2, AUTO_RETURN_MS 8000, AUTO_CONFIDENT 0.75, AUTO_INTERIM_TOKENS 3
LiveFXASR.onDeviceSupported() -> boolean   // SpeechRecognition.available or `processLocally` exists (Chrome 139+)
```
- Start language = `primaryLang` (a variant of a listed family replaces its tag, a new family is appended), else `opts.lang`, else `langs[0]`; every `start()` begins in the primary language unless pinned by `setLang(tag)`. `setOptions({primaryLang})` applies at once (idle: start language; listening + unpinned: switch, reason `primary`).
- Switching mode: every final is scored by `LiveFXLangDetect.detect`; one final of another family with `score >= 0.6` switches at once, else `switchAfter` (2) agreeing finals with `>= 0.45` each (event `score` = their mean). With `voiceActivity` the swap waits for a speech gap in 500 ms steps, at most 2 s. Back to the primary after `AUTO_RETURN_FINALS` (2) primary finals of any score, one primary final `>= 0.6`, or 8 s without a final (`reason:'silence'`, timer cleared by `stop()`, never while pinned). `onEvent({type:'lang', lang, family, score, mode, reason:'start'|'detected'|'primary'|'silence'|'pinned'|'unpinned'|'interim'|'parallel-unsupported', primary})`.
- Parallel mode: interims come from the leader only; the first interim of another recognizer that scores `>= AUTO_CONFIDENT` in its own language with `>= AUTO_INTERIM_TOKENS` tokens makes it the leader (`reason:'interim'`, nothing restarted); the 8 s silence return changes the leader only.
- On-device (`webspeech` + `auto`): with `onDevice:'auto'` (default) every fresh recognizer gets `rec.processLocally = true` when the instance exposes the property; `onEvent({type:'ondevice', state:'on'|'fallback', lang, error?, recognizer?})`. Any engine error other than `not-allowed`/`audio-capture` while on-device (e.g. `language-not-supported`) → `onError({code, fatal:false})`, `state:'fallback'`, immediate cloud respawn (`restart` event with `reason:'ondevice'`) for the rest of the session; `setOptions({onDevice:'auto'})` retries. Not supported → `onDevice === 'unsupported'` silently.

### Backend `whisper` (LiveFX 1.4, offline, experimental – `js/asr.js` + `js/whisper-worker.js`, owned by package C)

```js
LiveFXASR.create('whisper', {
  lang, onText, onState, onError, onEvent,
  model: 'onnx-community/whisper-tiny',   // repo under /models/ (setup-offline: tiny | base)
  device: null,                           // 'webgpu' | 'wasm'; default: worker picks webgpu when navigator.gpu exists
  workerFactory: null,                    // () => Worker-like {postMessage, terminate, onmessage, onerror} – tests
  mediaFactory: null,                     // () => Promise<MediaStream> – tests; default getUserMedia({audio:true})
})
  -> { name:'whisper', start() -> Promise<boolean>, stop(), setLang(lang), setOptions() /* no-op */, get state, get lang, get stats, get options: {model} }
stats = makeStats() + { chunks }          // chunks = audio segments sent to the worker; results/finals = non-empty texts
LiveFXASR.probeWhisper() -> Promise<boolean>   // HEAD /vendor/transformers.min.js === 200; cached; false under file://
LiveFXASR.WHISPER_DEFAULT_MODEL                 // 'onnx-community/whisper-tiny'
```
- `backends[].supported` for `whisper` = `window.Worker` && http(s) && (`isSecureContext` or localhost) && the **last** probe answered 200. The first read of `backends` kicks off the probe asynchronously (reads before it finishes say `false`); `probeWhisper()` re-checks, e.g. after `npm run setup-offline`. `create()` only needs a Worker (or `workerFactory`); a missing library surfaces as a fatal `whisper` error from the worker.
- `start()`: state `starting` → worker spawned (`js/whisper-worker.js`) and sent `{type:'load', model, modelBase:'/models/', vendorUrl:'/vendor/transformers.min.js', device?}` → `getUserMedia` (or `mediaFactory`) → `AudioContext` + `ScriptProcessorNode(4096)` (AudioWorklet fallback when `createScriptProcessor` is missing) → box-filter downsampling to 16 kHz mono Float32 → energy VAD: a chunk starts when frame RMS > 0.01, ends after 600 ms below the threshold (trailing silence trimmed to the hangover) or at 6 s (cut exactly at 96 000 samples, the rest starts the next chunk); chunks with < 0.4 s of speech are dropped; audio before `ready` is ignored. Each chunk → `worker.postMessage({type:'transcribe', audio: Float32Array, lang}, [audio.buffer])` with `lang` = ISO-639-1 of `lang` (`'de-DE'` → `'de'`); at most 3 chunks in flight, further ones are dropped (`onEvent({type:'dropped', seconds, pending})`).
- Worker → backend: `progress {pct, file?}` → state `starting` + `onEvent({type:'progress', pct, file?})`; `ready` → `onEvent({type:'ready', model})` + state `listening`; `result {text}` → when `text.trim()` is non-empty: `onEvent({type:'final', text, isFinal:true})` + `onText(text, true, {source:'Whisper', lang, at})` (`lang` is the full tag, e.g. `de-DE`); `error {message}` → `onError({code:'whisper', message, fatal:true})`, everything torn down, state `error`. `worker.onerror` (script failed to load) is treated the same. Mic/permission failure → `onError({code:'whisper', message:'Mikrofon-Zugriff verweigert.' | 'Mikrofon nicht verfügbar: …', fatal:true})` + state `error`.
- `stop()`: terminates the worker, stops the tracks, closes the context, state `idle` (safe twice; a `stop()` during the permission prompt releases the stream once it arrives). `setLang()` is stored and used for the next chunk – no restart (the model is multilingual). `onEvent` also gets `chunk {seconds, lang}` per sent chunk. No interim results, no restarts/stall watchdog (`restarts`/`stalls` stay 0).
- Worker protocol (`js/whisper-worker.js`): `load` → `import(vendorUrl)` → `env.allowRemoteModels=false; env.allowLocalModels=true; env.localModelPath=modelBase; env.backends.onnx.wasm.wasmPaths=<vendor dir>` → `pipeline('automatic-speech-recognition', model, {dtype:'q8', device, progress_callback})` (`pct` = mean per-file progress) → `ready`; `transcribe` → `asr(audio, {language: lang, task:'transcribe', chunk_length_s: 30})` → `result {text}` (strictly sequential); every failure → `error {message}`.
- Static routes (package A): `/vendor/<name>.(js|wasm|mjs)` → `<root>/vendor`, `/models/<path>.(json|onnx|bin|txt)` → `<dataDir>/models`. `scripts/setup-offline.js` fills both (`npm run setup-offline [-- --model tiny|base] [--data <dir>] [--force]`); it exports `{ modelFiles(repo), fileUrl(repo, file), REPOS, MODEL_FILES, parseArgs(argv), REGISTRY_URL }` for tests and only runs `main()` when executed directly.

Web Speech facts (Chrome/Edge, measured): interim results every ~100–300 ms while speaking; the final result arrives ~0.5–1.5 s after the end of speech; `maxAlternatives` is only populated for final results (interims carry one alternative); Chrome ends a session after ~5–8 s of silence (`onend` -> backoff restart handles it) and recognition quality degrades on very long sessions (the planned restart every 60 s is the workaround); valid language tags: `de-DE`, `de-AT`, `de-CH`, `tr-TR`, `en-US`, `en-GB`, `en-IN`.

```js
LiveFXMeter.create({ fps: 10, threshold: 0.02, holdMs: 200, onLevel(rms, peak) })
  -> { start() -> Promise<boolean>, stop(), level, peak, isVoiceActive(), lastVoiceAt, error, running }
```
- `getUserMedia({audio:true})` -> `AudioContext` -> `MediaStreamSource` -> `AnalyserNode(fftSize 1024)`; RMS via `getFloatTimeDomainData` on `setInterval(1000 / fps)`. Call `start()` from a user gesture; it resolves `false` (never throws) when the mic, the permission or WebAudio is missing – `error` holds the message, the console gets one warning, the panel shows „–“.
- `isVoiceActive()` = last RMS ≥ `threshold` or a loud tick within `holdMs`; `lastVoiceAt` = `performance.now()` of the last loud tick; `peak` decays by 0.85 per tick. `stop()` stops the tracks, closes the context and is safe to call twice (also while `start()` is pending).

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

## 8. Matcher (`js/matcher.js`, global `LiveFXMatcher`, UMD) – LiveFX 1.2 fuzzy API

```js
new LiveFXMatcher.Matcher(triggers, {
  globalMinGap: 1.2,                       // seconds between any two effects
  tolerance: 'off' | 'medium' | 'high',    // default 'off' (server keeps 'off')
  lang: 'de' | 'tr' | 'en' | 'auto' | null // stop-word list; 'de-AT' -> 'de'; 'auto' / null -> all lists
})
matcher.tolerance                 // getter
matcher.lang                      // getter ('de' | 'tr' | 'en' | null)
matcher.setTolerance(level)       // -> effective level; invalid -> 'off'; no index rebuild
matcher.setLang(lang)             // -> normalized lang; rebuilds the index (the high fold is language dependent)
matcher.setTriggers(triggers)     // rebuilds the index; disabled triggers are kept for fireById only
matcher.process(text, now)        // -> [{ trigger, keyword, fuzzy: boolean, spoken: string }]
matcher.explain(text)             // pure scan (no cooldown / utterance side effects)
                                  // -> [{ trigger, keyword, fuzzy, spoken, start, end }] one entry per occurrence,
                                  //    token indices into normalize(text).split(' '), end exclusive, sorted by start
matcher.fireById(id, now = Date.now()/1000) -> { trigger, blocked: null | 'cooldown' | 'gap' | 'disabled' | 'unknown' }
matcher.endUtterance()            // resets the per-utterance counters
LiveFXMatcher.normalize(text)     // unchanged (server/smart.js uses it as cache key)
LiveFXMatcher.fold(token, level, lang)   // folding of an already normalized token; 'off' -> unchanged
LiveFXMatcher.damerau(a, b, max)         // optimal-string-alignment distance, returns max + 1 once it exceeds max
LiveFXMatcher.TOLERANCES                  // ['off', 'medium', 'high'] (frozen)
LiveFXMatcher.STOPWORDS                   // { de, tr, en } frozen arrays, >= 5 chars, never a default / pack keyword token
```

Exact hits: `fuzzy: false, spoken === keyword`. Fuzzy hits: `spoken` = the tokens actually heard (e.g. `„grass“ (≈ krass)`);
when a keyword occurs both exactly and fuzzily in one utterance the exact occurrence provides `spoken`.
`fireById`, cooldown, global gap and `firedInUtterance` semantics are unchanged. With `tolerance: 'off'` results are
byte-identical to the pre-1.2 substring counter (token windows over `normalize(text).split(' ')`, overlapping occurrences count).

Fold (`docs/DESIGN-RECOGNITION.md` A): `medium` = NFD + strip marks, `ı→i`, `ß→ss`, drop apostrophes; `high` = medium +
confusion table (`ph→f ck→k th→t tz→z dt→t y→i`; de `ae→a oe→o ue→u w→v`; tr `w→v x→ks`) + collapse repeated letters.
Match rule per keyword token, gated on its normalized length: ≤ 4 exact only; 5–8 fold-equal or DL ≤ 1; ≥ 9 fold-equal or
DL ≤ 1 (medium) / ≤ 2 (high). Multi-word keywords match token-wise, each token with its own gate.

Precision guards: (1) `|len(spoken) − len(keyword)|` (normalized lengths) must not exceed the allowed distance on the
edit-distance path; (2) a spoken token that equals an exact keyword token of any enabled trigger, or is in the active
stop-word list, is only ever matched exactly – **neither** edit-distance **nor** fold-equality (deviation from the design
note: allowing fold-equality would make `schon` fire a `schön` trigger); (3) one hit per (keyword, position, token).

Index (rebuilt in `setTriggers` / `setLang`): `exactIndex`, per level `foldIndex` + `first`/`last` buckets on the folded
form (DL ≤ 1), and for high DL ≤ 2 a pigeonhole piece index (three 2-char pieces at offsets 0/3/6 of the folded form,
tokens with a shorter fold in a `rest` list). Performance (test/matcher-fuzzy.test.js): 200 triggers × 8 keywords,
20-word utterance, high – median ≈ 0.5 ms, max ≈ 1.3 ms (Node 22).

**2.2 (latency, Turkish, phonetic aliases)** – `test/matcher-22.test.js`:
```js
new LiveFXMatcher.Matcher(triggers, { globalMinGap: 0.5 /* 2.2 default, was 1.2 */, prefixFire: false, phonetic: 'tr-TR'|'de'|'en'|null })
matcher.prefixFire                // boolean, settable
matcher.phonetic                  // getter: 'de'|'tr'|'en'|null
matcher.setPhonetic(lang)         // -> normalized family or null ('auto'/'off'/null disable); rebuilds the index
matcher.process(text, now, { final })   // `final` gates prefix firing (interims only)
matcher.stats                     // { prefixFires, aliasHits }
LiveFXMatcher.DEFAULT_GLOBAL_MIN_GAP (0.5), PREFIX_MIN (4), PREFIX_KEYWORD_MIN (6)
```
- A keyword occurrence that is blocked by a cooldown or the global gap is **not consumed**: it is re-evaluated on the next interim/final of the same utterance and fires once the block has passed (`endUtterance()` forgets it).
- Prefix firing (off by default; the panel turns it on with reaction `fast`): a spoken token of ≥ 4 chars that is the unique prefix of exactly one single-word keyword of ≥ 6 chars (and no exact keyword token / stop-word itself) fires on an interim (`prefix: true` in `explain()`); the completed word does not fire again, a prefix that turns into another word is forgotten. Cooldown / gap apply; aliases never prefix-fire.
- Turkish: `normalize` uses the Turkish case mapping when the text carries ı/İ/ş/ğ; at `medium` the fold treats ı≡i, ş≡s, ç≡c, ğ≡g.
- Phonetic aliases: `setPhonetic(primaryLang)` expands every keyword of another language through `LiveFXPhonetic.expand` (js/phonetic.js) and indexes the respellings as **exact-only** aliases (`alias: true, fuzzy: true, spoken = heard text`, `stats.aliasHits`); an alias that equals a real keyword token of any trigger is dropped, alias + keyword at one position count once; keywords in the primary language get none. Without js/phonetic.js the matcher simply has no aliases. Performance: 1000 triggers × 8 keywords + aliases, medium – median < 3 ms.

## 9. Renderer (`js/fx.js`, global `LiveFXRenderer`) – owned by P3 / fx-engine (v2 in LiveFX 2.0)

- `renderer.fire(trigger)`: `sound` via `LiveFXSchema.parseSound`: builtin -> `LiveFXSounds.play`; file -> `<audio src=url>` appended to `#stage` (removed on `ended`/`error`), routed through `ctx.createMediaElementSource(audio) -> GainNode(volume × gain) -> destination`, fallback `audio.volume` without AudioContext; `loop:<name>` -> `renderer.playLoop`.
- `emoji`/`text` through `escapeHtml` (or text nodes); `img.setAttribute('src', v.src)` only after `ASSET_IMAGE_RE`/`HOTLINK_SRC_RE` check; `count` clamped to `LIMITS.rainCount`; DOM drops set `--x` (0..1) instead of inline `left`; cards/images/banners/text get class `fx-pos-<position>`.
- Exports: `LiveFXRenderer = { Renderer, ParticleLayer, escapeHtml, THEMES, TEXT_STYLES }` (`TEXT_STYLES` = fallback list incl. `sticker`; the renderer reads `LiveFXSchema.TEXT_STYLES` when loaded).
- **2.1 image rules**: `safeSrc` accepts `ASSET_IMAGE_RE` (upload or `memes/…`, no `..`) or `HOTLINK_SRC_RE` (fallback copies of both regexes live in `FALLBACK` and must equal the schema's – `test/schema.test.js` checks it). `img.onerror` replaces the image card with the emoji card (`v.emoji || '🖼️'` + text). Sources under `memes/` render as `.fx-card.fx-card-image.fx-sticker-img` (free-floating: transparent, no box-shadow/padding, `drop-shadow` filter – off in eco).
- **2.1 text style `sticker`**: `.fx-bigtext.fx-text-sticker` (`--c1` = `color`, default #ffd166; `--c2` = `color2`, default #ff2d75) – letters with dark `-webkit-text-stroke` (paint-order stroke fill) + one hard shadow, comic burst `clip-path: polygon(…)` on `.fx-word::before` (`--c2`) and `::after` (dark rim), pop-in + wobble (eco: pop-in only, no rotation animation). `js/demo.js` CanvasFX draws the same polygon + outlined letters.
- **2.1 performance mode**: `renderer.setPerf('auto'|'eco'|'high')` (unknown -> auto) → `renderer.perf` (requested), `renderer.perfActive` (`'high'|'eco'`, auto starts high and switches to eco for good after 30 slow frames), `renderer.eco` (getter), `stats.perfSwitches`; `body[data-perf]` = perfActive, `body[data-perf-mode]` = perf. Details: docs/PERFORMANCE.md.
- `renderer.stats = { fires, sounds, fileSounds, scenes, combos, particles, fps, frameMs, reduced, canvas, perfSwitches, stories }` – `fps`/`particles` are refreshed by the particle loop (`fps` starts at 60 and is always numeric), `reduced` counts auto-reductions of the particle cap, `canvas` says whether the canvas layer is available.
- **Canvas particle layer** (`renderer.particles`, class `ParticleLayer`): one `<canvas class="fx-canvas">` right above the scene layers in `#stage`, one `requestAnimationFrame` loop that only runs while particles or a scene parallax are alive (2.2.1: exactly one – `start()` is a no-op while a frame is pending or `_tick` runs (`particles._ticking`); `_tick(now)` runs `_frame(now)` and reschedules itself; a callback with the previous timestamp moves nothing; `stats.fps` / `frameMs` are per frame. Rain / confetti velocities, gravity and wind scale with the fall height: `k = clamp(effectBox().fall / 1100, 0.45, 1)` (`particles._fallScale(box)`).) Cap 400 / 800 / 1200 at intensity 1 / 2 / 3 (`particles.setCap(i)`, `particles.cap`); when a frame takes > 20 ms for 30 consecutive frames the cap drops to 60 % (min 120) and stays there (`particles.reducedTo`). `confetti` renders on the canvas (90 × intensity rotating rects, gravity / wind / drift / 3D wobble) with the old `.fx-confetti` DOM path as fallback when `getContext('2d')` is unavailable; `rain` keeps its `count` DOM `.fx-drop` nodes **and** adds `count × intensity × 2` canvas emoji (sprite-cached `fillText`). Scenes add three parallax emoji layers (far / mid / near) on the canvas while keeping the DOM particles (<= 40), crossfade, caption and loop behaviour intact.
- **v3 kinds**: `text` -> `.fx-bigtext.fx-text-<style>` with `.fx-word[data-text] > .fx-w > span.fx-letter[--i]` (3 s; style `gradient` clips the gradient per `.fx-letter`, style `glitch` adds two `aria-hidden` clones `span.fx-glitch-layer.fx-glitch-a|b` of the letter structure inside `.fx-word`); `lower-third` -> `.fx-lower-third > .fx-lt-bar > .fx-lt-emoji? + .fx-lt-text > .fx-lt-title + .fx-lt-subtitle?` (4 s, landscape only – `body.layout-portrait` renders a banner "title · subtitle" instead); `combo` -> each step is scheduled with `setTimeout` and fired through `renderer.fire({visual, sound, gain})`, so it counts in `stats.fires`; `stats.combos++` per combo; nested combos are skipped.
- **Decoration** (every card-like kind): `.fx-blur-in` (entry motion blur), `.fx-glow` (`glow: true`), `.fx-tilt` (`tilt: true`, animation `fx-pop-tilt`), `--fx-i` = intensity; at intensity >= 2 `.fx-rays` + `.fx-ring` are prepended (`.fx-has-rays`), at 3 a spark burst is added on the canvas. `impact: true` -> `#stage.fx-impact` for 250 ms (CSS zoom 1 -> 1.04 -> 1). `shake` unchanged.
- `renderer.clear()`: cancels pending combo steps, clears canvas particles and removes every transient effect node (the band, scene layers, the canvas, story actors and `<audio>` elements stay). `renderer._timers` holds the pending combo timers.
- **Themes**: `renderer.setTheme(name)` -> `body[data-theme=name]` (neon removes the attribute) and `renderer.theme`; unknown names fall back to `neon`. Returns the active name.
- **2.2 story band** (`docs/STORY.md`): `renderer.setLayout({storyLayout?, band?, zone?, bandPosition?, storyStyle?})` (partial merge via `normalizeLayout`, returns the layout; `renderer.layout` (5 keys since 2.2.1), `renderer.refreshLayout()`; 2.2.1: `body[data-band-pos]` = layout.bandPosition, getter `renderer.bandPosition` = position in use (`bottom`|`chat` in portrait, `bottom` in landscape, `full` in layout full)). Scenes live in `#stage > .fx-band[data-layout=band|full|frame]` (always the first child; `data-mood` = story mood, `.fx-band-idle` after `renderer.storyIdleMs` = 60 s without `storyTouch()`); `body[data-story-layout]`, `body[data-zone]`, `--fx-band` (unitless percent; `renderer.bandPct` = 20 in `body.layout-portrait` unless a layout carried an explicit `band`). `ParticleLayer.setBand(el, layout, zone)` / `.rect` clip the scene parallax + actors to the band box (`sceneRect()`; `null` rect = whole-frame semantics in layout `full`); `effectBox()` places rain / confetti by zone (`edges` = the two `--fx-edge` columns, `bottom` = the band, `top` = top 30 %, `full` = `--fx-x0`/`--fx-xspan`). Card-like kinds get `.fx-col-left|right` (zone `edges`, alternating; `_pan` leans ±0.5), `.fx-in-band` (`bottom`) or `.fx-zone-top` (`top`); the rays / ring flare follows the column. `shake` keeps the stage shake but the white flash and `impact`'s zoom only run in zone `full` (`mixer.duck` still runs).
- **2.2 live story**: `renderer.story(state)` (state from `LiveFXStoryDirector` or a `story-state` message, normalized by `normalizeStoryState` when schema.js is present) -> scene by `state.scene` (same scene = caption update), ambient loop `state.loop || LOOP_BY_SCENE[scene]`, `particles.setActors(actors, props)` (emoji sprites walking in / out inside the band: `fly` / `swim` hover, `jump`, `dance`, `sleep`, `run`; props fade in place), band `data-mood`, `shake`; `end` / no scene clears scene + loop + actors. `renderer.storyState`, `stats.stories`, `renderer.storyTouch()`. `story()` never calls `clear()` / never touches transient effects; a scene crossfade removes only the old `.fx-scene`.
- **2.2.1 live-story lifecycle**: `renderer.story(state, {touch = true})` – `touch: false` (lifetime expiry) neither restarts the idle timer nor wakes an idle band (the state is stored in `renderer.storyState` and drawn on the next touch). The idle timer (`storyIdleMs`, 60 s) adds `.fx-band-idle` **and** fades actors / props in place (`particles.dismissActors(0.8)`), clears the scene + ambient particles and stops the loop; `renderer.storyIdle` (getter) is true until the next `storyTouch()`, which redraws `storyState` (overlay.html calls `storyTouch()` for every `story` message, so a sentence that changes nothing still wakes the band). `renderer.attachDirector(director) -> detach()` subscribes `director.onChange((state, {reason}) => renderer.story(state, {touch: reason !== 'tick'}))` and calls `director.tick(Date.now())` every 1000 ms. `scene(v)` accepts `ambient: false` (no canvas parallax; same-scene calls toggle it). Zone `edges`: column effects are `width: max-content` up to `--fx-col-w`; a word still wider sets `--fx-fit` (0.25..1) on the element (`renderer._fitColumn(el)`, called by `_spawn`), which the column font sizes multiply.
- **2.2.1 sketch hook** (implemented by `js/sketch.js`, global `LiveFXSketch`; the renderer only calls it):
  - `LiveFXSketch.attach(renderer, getSurface) -> sketch` – called **once**, on the first `renderer.story()` after `window.LiveFXSketch` exists (a script loaded later still attaches). Returns the sketch object; if it returns nothing, `LiveFXSketch` itself is used when it has `update`. Errors are caught (one `console.warn`).
  - `getSurface() -> {canvas, ctx, width, height, dpr, layout, style, portrait, idle} | null` (= `renderer.sketchSurface()`): `canvas` is `<canvas class="fx-sketch">`, the last child of `#stage > .fx-band` (above the scene layer, below the canvas actors; masked, mood-tinted and faded with the band), `ctx` its 2D context (the caller sets its own transform, e.g. `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`), `width` / `height` = band size in CSS px, canvas pixels = size × `dpr` (devicePixelRatio, max 2). The size is re-measured at most every 500 ms and after every `setLayout` – a changed size resets the canvas (clears it), so draw from state each frame or redraw after a size change. `layout` = copy of `renderer.layout`, `style` = `layout.storyStyle`, `idle` = band idle. Cheap enough to call every animation frame.
  - `sketch.update(state)` – **required**; called on every rendered story state with the normalized state (`normalizeStoryState` shape, §1) plus `style` (`'emoji'|'sketch'|'mixed'`, the layout's storyStyle) and `idle` (boolean). `scene: null` / `end: true` = clear the drawing. When the band goes idle it gets the last state with `idle: true` (pause / stop animating); the next sentence sends a fresh state with `idle: false`. Not called while the band stays idle.
  - `sketch.setStyle(style)` – optional; called on attach and whenever `layout.storyStyle` changes (followed by an `update` with the new style).
  - Styles in the renderer (`renderer.storyStyle` getter = layout.storyStyle when a sketch is attached, else `'emoji'`; mirrored to `.fx-band[data-style]` and `body[data-story-style]`): `emoji` hides `.fx-sketch` (CSS); `sketch` switches the canvas emoji actors / props and the scene parallax off and hides `.fx-scene-decor` / `.fx-scene-ground` (scene background, mood tint and loop stay); `mixed` shows both.
- **2.2 volumes**: `renderer.volumes = {master, sfx, ambient}` (defaults 0.5 / 0.8 / 0.5), `renderer.setVolume(bus, v)` (unknown bus = master, non-numeric keeps the level, returns it); `renderer.volume` getter/setter = master (unchanged API). master -> `mixer.setMaster`, sfx / ambient -> `mixer.setBus`; all three are pushed once per mixer instance (`_mixerReady()`), file sounds use master × sfx × gain. `playLoop` runs loops through `mixer.startLoop(name)` on the ambient bus (ducking + limiter) when the mixer shares the renderer context; the old GainNode(master × ambient) -> destination path stays as fallback.
- **Audio**: on the first builtin sound the renderer hands its own AudioContext to `LiveFXSounds.mixer.init(ctx)` when the mixer has none (one shared context); `stats.sounds` counts only when `mixer.play` returned non-null. Canvas particles age by wall-clock time (physics step clamped to 50 ms), so bursts end on time even at low fps. `renderer.playSound(spec, {gain, pan, intensity})`; `gain` defaults to 1 (trigger-level `gain`), `pan` is derived from the visual (`-0.6` lower-third, rain / confetti / sticker from the `--fx-x0`/`--fx-xspan` band centre, else 0). When `LiveFXSounds.mixer` exists (audio engine v2) builtin sounds go through `mixer.play(name, {gain, pan, intensity})`, the volume setter calls `mixer.setMaster(volume)` and `impact` calls `mixer.duck(250)`; otherwise the old `LiveFXSounds.play(name, ctx, destination, volume × gain)` is used. Everything is guarded, the old sounds.js keeps working.

## 10. Overlay layout (`overlay.html`, `css/overlay.css`) – owned by P2 / fx-engine

- `?layout=portrait` adds `body.layout-portrait`. Rain/confetti use `left: calc(var(--fx-x0, 0vw) + var(--x) * var(--fx-xspan, 100vw))` and fall `translateY(var(--fx-fall, 115vh))`; portrait sets `--fx-fall: 62vh` (drops fade before the bottom 35 %, where TikTok/IG chat sits). The canvas layer reads the same variables (vw/vh/px/%) for its band and fall distance.
- `.fx-pos-top { top: 18% }`; `.fx-pos-safe` = center in landscape, `top: 32%` in portrait; portrait image cards `max-width: 80vw; max-height: 40vh`.
- Overlay handles `state` (volume when no `?volume=`, theme when no `?theme=`, perf when no `?perf=`, 2.2: `volumes` per bus, `layout` minus pinned keys), `volume` (2.2: `bus`), `theme`, `perf`, `layout`, `story` (-> its own `LiveFXStoryDirector`, `window.livefx.director`) and `story-state` messages; includes `js/schema.js` + `js/story-director.js`. `?theme=neon|pastel|minimal|kinderbuch` pins the theme (bus `theme` messages are then ignored).
- **2.2 URL params**: `?story=band|full|frame`, `?band=15..35`, `?zone=full|edges|bottom|top` pin that layout key each (defaults band / 22 / edges; portrait 20 %), 2.2.1 `?bandpos=bottom|chat` and `?storystyle=emoji|sketch|mixed` (defaults bottom / mixed), `?volume=` pins the master level only. CSS variables: `--fx-band` (percent, unitless), `--fx-band-h` (length; 100vh in `full`, the box height in `frame`), `--fx-band-bottom` (0; 35vh in portrait with `body[data-band-pos="chat"]` – 2.2.1, the portrait default `bottom` puts the band flush with the frame bottom), `--fx-edge` (22vw / 30vw portrait), `--fx-fit` (2.2.1, column effects). Zone classes `.fx-col-left|right`, `.fx-in-band`, `.fx-zone-top`; band `.fx-band[data-layout][data-mood][data-style].fx-band-idle`, sketch surface `.fx-band > canvas.fx-sketch`. Transient effects in portrait still stop above the chat zone (`--fx-fall: 62vh`).
- **2.2.1 live story wiring**: `renderer.attachDirector(director)` (director ticks every second); every `story` message: `director.feed(text, {final, lang})` then `renderer.storyTouch()`.
- **Theme variables** on `:root`, overridden by `body[data-theme="…"]`: `--fx-font`, `--fx-card-bg`, `--fx-card-border`, `--fx-accent`, `--fx-accent-2`, `--fx-text`, `--fx-radius`, `--fx-glow`, `--fx-shadow`. `neon` (no attribute) is the classic look; `pastel` (light pink card, soft border), `minimal` (dark translucent, 10 px radius, no uppercase glow), `kinderbuch` (warm cream card, dashed orange border, 48 px radius, playful font fallback).
- Layers in `#stage` (bottom to top): `.fx-band > .fx-scene` (0..n, incl. fading ones; 2.2 – the band is always the first child) + `.fx-band > canvas.fx-sketch` (2.2.1, only with LiveFXSketch) -> `canvas.fx-canvas` (scene parallax clipped to the band, story actors, bursts) -> transient effects. Animated layers carry `will-change`; nodes are removed on their main `animationend` (timeout fallback).

## 11. Panel DOM ids (fixed for tests) – owned by P6

`#asr` (select, options in `LiveFXASR.backends` order: webspeech|auto|external|whisper), `#smart` (checkbox), `#dot-smart`, `#dot-mic`, `#dot-server`, `#token`, `#btn-copy-token`,
`#asset-library`, `#pad button` (with `img.thumb` for image triggers), trigger rows `#trigger-rows tr` with buttons
`[data-act="edit"|"test"|"del"]`, `#lang`, `#btn-listen`, `#btn-mute`, `#sim`, `#btn-sim`, `#log`, `#volume`, `#gap`,
`#preview` (iframe `overlay.html?volume=0`, see Audio 1.5 below), `#btn-add`, `#btn-export`, `#btn-import`, `#btn-reset`, `#transcript` (uses `<mark>`).

Recognition (1.2, see `docs/DESIGN-RECOGNITION.md` §C): header pill `#pill-lang` (button, `#pill-lang-value` shows the language,
click scrolls to the card); card `#asr-settings` with `#lang` (optgroups Deutsch de-DE/de-AT/de-CH, Türkçe tr-TR, English en-US/en-GB/en-IN),
`#asr-tolerance` (off|medium|high), `#asr-reaction` (fast|safe), `#asr-alternatives` + `#asr-restart` (checkboxes), `#mic-meter` > `#mic-level`
(bar via `--level`), `#mic-db`, `#diag-state`, `#diag-latency`, `#btn-selfcheck` + `#selfcheck-status`. Learning card under the transcript:
`#recog-learn` (hidden when empty), `#fuzzy-suggest button[data-act="learn"][data-trigger][data-spoken]`, `#misses li[data-miss]` with
`button.chip[data-word]` (`.sel` when selected), `select[data-act="assign"]`, `button[data-act="ignore"]`.
localStorage: `livefx.asr` (backend, unchanged), `livefx.asr.lang`, `livefx.asr.tolerance` (default `medium`), `livefx.asr.reaction`
(`fast`|`safe`, default `fast`), `livefx.asr.alternatives` ('1'/'0', default '1'), `livefx.asr.restart` ('1'/'0', default '0'),
`livefx.asr.ignored` (JSON array of normalized sentences, cap 50).
`window.livefx` additionally exposes `learnKeyword(triggerId, phrase) -> boolean`, `asrSettings` (getter, copy), `meter` (LiveFXMeter or null)
and `selfCheck {start(), timeout(), active}`.
Story mode (1.3, see `docs/DESIGN-STORY.md`): card `#story-card` above `#packs-card` with checkbox `#story-mode` (on: remembers
tolerance/reaction/gap, sets `#asr-tolerance` medium, `#asr-reaction` safe, `#gap` 2, loads `LiveFXPacks.storyPackFor(lang)`,
shows `#scene-pad`; off: restores the remembered values, hides the pad, keeps the pack) and `#scene-pad button[data-scene]`
(one per `LiveFXSchema.SCENES` entry, emoji + German name, `clear` = „Szene beenden“; click fires the ad-hoc trigger
`{id:'scene-<x>', visual:{kind:'scene', scene}, sound:'loop:<name>'|null}` via `fire()`, source „Szenen-Pad“; `.active` marks the last scene).
Pack rows: `.pack[data-pack]`, story packs additionally `.pack.story` (`LiveFXPacks.list()` entries carry `story: true`).
localStorage: `livefx.story` ('1'/'0'), `livefx.story.prev` (JSON `{tolerance, reaction, gap}`).
`window.livefx` additionally exposes `setStoryMode(on)`, `storyMode` (getter) and `sceneTrigger(sceneId)`.
Editor: kind options „Szene“ (`[data-field="scene"]` select with German labels, `[data-field="intensity"]` 1–3, text = caption) and
„Sticker“ (emoji up to 4 emojis); sound select gets `optgroup[label="Atmosphäre (Loop)"]` with `loop:<name>` values from `LiveFXSounds.loops`
(guarded – absent when the sounds package has no loops). `LiveFXAssets.thumbnailFor`: scene → scene emoji, sticker → first emoji.
`LiveFXPacks` additionally exports `storyPackFor(lang) -> 'story-de'|'story-tr'|'story-en'`, `SCENE_INFO {id: {emoji, label, loop}}`, `SCENE_IDS`.
Script order in `index.html`: `sounds, triggers, packs, schema, matcher, bus, store, assets, editor, meter, asr, smart, panel`.

Client helpers the panel consumes:
```js
LiveFXStore.load() -> Promise<{triggers, source: 'server'|'local'|'defaults'}>   // P2 – server first, then localStorage 'livefx.triggers.v2' (migrates v1), then defaults; always normalized + merged
LiveFXStore.save(triggers) -> Promise<void>       // debounced 300 ms PUT /api/triggers + localStorage mirror
LiveFXStore.reset() -> Promise<{triggers}>        // defaults, clears removed
LiveFXStore.onRemoteChange(fn)                    // triggers-updated from another client
LiveFXAssets.list() / upload(file) / remove(name) / thumbnailFor(trigger) -> {img?: url, emoji?: string} / mountLibrary(el, {onChange})   // P3
LiveFXEditor.open(trigger, {assets, sounds, onSave, onDelete}) -> Promise<trigger|null>   // P3, <dialog>
```

Mobile (1.4, `mobile.html` + `js/mobile.js` + `css/mobile.css`, see `docs/DESIGN-MOBILE.md` §A): bus role `panel`, served like the panel
(cookie via `GET /m?token=…`, never by the page). Ids: `#dot-server` (`.on|.warn|.err`), `#status` (connection / mic text), `#btn-mute`
(„⏸ Pause“ ↔ „▶ Weiter“, `.paused`; a paused page fires nothing), `#volume` (range → bus `volume`), `#search` (filters `#pad button`
by label/id/keyword, hidden tiles get `[hidden]`; `#count`, `#empty`), `#btn-mic` (+ `#mic-hint`: disabled with the HTTPS hint when
`!isSecureContext`, disabled with a browser hint when WebSpeech is missing; otherwise runs `LiveFXASR.create('webspeech')` + `LiveFXMatcher`
on the phone, source „Handy-Mikro“), `#transcript` (one line: bus `transcript` texts, `fire` messages as „🔥 label ← source“, own
actions; uses `<mark>`), `#scenes-card` > `#scenes button[data-scene]` (one per `LiveFXSchema.SCENES`, `.active` on the last scene;
fires the same ad-hoc trigger as the panel's `sceneTrigger(id)` – the scene table is copied into mobile.js – source „Handy-Szenen“),
`#pad button[data-id]` (`img.thumb` or `.emoji` + `.lbl`, `.off` when disabled, `.fired` flash; tap fires with source „Handy“).
`window.livefx` exposes `bus`, `fire`, `handleText`, `sceneTrigger`, `triggers`, `paused`, `asr`, `matcher`, `store`, `ready`.
Script order: `triggers, packs, schema, matcher, bus, store, assets, asr, mobile` (no sounds.js/fx.js – the phone renders nothing).
Panel card `#mobile-card` (`js/mobile-link.js`, loaded after panel.js): `#mobile-url` = `http(s)://<lanIps[0]|location.host>:<port>/m?token=<token>`
from `/api/config` (`lanIps`/`port`/`secure` optional → `location.host`), `#mobile-url-alt` (further IPs), `#btn-copy-mobile`, `#mobile-offline-hint`.
PWA: `manifest.webmanifest` (linked from index.html and mobile.html), `sw.js` (`SHELL_VERSION` constant → cache `livefx-shell-v<version>`;
precaches the shell listed in `SHELL`; navigations network-first with cache fallback, other shell files cache-first with background refresh;
network-only for `/api/*`, `/fire`, `/events`, `/assets/*`, `/docs/*`, `/m`, `/models/*`, `/health`), registered from index/overlay/demo/mobile
with `if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/sw.js')`. Icons in `icons/`.
Static allow-list additions (`server/static.js`): `/mobile.html`, `/manifest.webmanifest` (`application/manifest+json`), `/sw.js`
(`service-worker-allowed: /`, `cache-control: no-cache`), `/icons/<safe>.(svg|png)` → `<root>/icons`, `/vendor/<safe>.(js|mjs|wasm)` →
`<root>/vendor`, `/models/<safe path, subdirs allowed, no ..>.(json|onnx|bin|txt)` → `<dataDir>/models` (`.onnx`/`.bin` → `application/octet-stream`,
`.wasm` → `application/wasm`); absent files are 404, never 500. Tests: `test/mobile.test.js`, `test/e2e/35-mobile.js`.

Audio (1.5, package audio-ui): `#preview` src is `overlay.html?volume=0` by default; checkbox `#preview-sound` (localStorage
`livefx.previewSound` '1'/'0', default off) switches the src to `overlay.html?volume=<#volume>`; while off, the panel pins the
iframe renderer's volume back to 0 once a second and after every slider move (bus `volume` messages reach the preview like any
overlay). `#echo-warning` (`.warning`, hidden by default, text „Echo-Gefahr …“) with `#echo-off` (turns the preview sound off)
is shown when the preview sound is on AND `GET /health` reports `overlays >= 2` (the preview iframe is one of them; polled every 5 s
plus immediately after toggling; never under file://). Card `#audio-card` („🔊 Ton-Check“, above the OBS card):
`#audiocheck input[data-key]` with keys `mic-source`, `browser-audio`, `desktop-audio`, `monitoring` (localStorage
`livefx.audiocheck.<key>` '1'/'0') and `preview-off` (disabled, mirrors `!previewSound`); `#btn-mic-test` + `#mic-test-status`
(`.ok`/`.err`; runs the meter 5 s, „Mikro liefert Pegel ✔“ / „kein Pegel – Mikro prüfen“); `#btn-obs-sound` fires the ad-hoc trigger
`{id:'audio-test', label:'TON-TEST', sound:'pop', visual:{kind:'card', emoji:'🔊', text:'TON-TEST', position:'center'}}`
(normalized via `LiveFXSchema.normalizeTrigger`) with source „Ton-Check“ through `fire()`. Docs: `docs/AUDIO.md`.
Auto language (1.5): `#lang` gets the first option `value="auto"` („Automatisch (DE/TR/EN)“, outside the optgroups) – default when
`livefx.asr.lang` is unset; a stored value wins. With `auto`, `createAsr` picks backend `auto` (when `LiveFXASR.backends` lists it)
for the webspeech/auto choice, passing `langs: ['de-DE','tr-TR','en-US']` and `lang:'auto'`; whisper/external get `lang:'auto'`;
without an `auto` backend it falls back to webspeech with `de-DE`. Switching between `auto` and a fixed language rebuilds the
recognizer (listening state is kept). `onEvent({type:'lang', lang, family, mode, reason})` updates `#diag-lang`
(„Erkannte Sprache: Türkçe (tr-TR) · Modus: parallel“), `#pill-lang-value` („Auto“ → „Auto · TR“; fixed languages still show the tag),
`matcher.setLang(lang)` and, in story mode, reloads the story pack of the detected family (`effectiveLang()`: fixed language, else last
detected, else `de-DE`; also used for smart classify and `#sim`). `js/langdetect.js` is loaded before `js/asr.js`.
Theme (1.6): select `#theme` (neon|pastel|minimal|kinderbuch, localStorage `livefx.theme`, default neon) sends the `theme` bus message; `window.livefx.theme {get(), set(name)}` (set returns the applied name, unknown → 'neon'); `window.livefx.setTriggers(list)` and `window.livefx.ready` (Promise from `boot()`, tests await it) exist as well. Health and chat-status polling pause while `document.hidden`.
`window.livefx` additionally exposes `previewSound {get(), set(bool)}`, `audioCheck {get(key), set(key, bool), keys, micTest(),
testTrigger(), fireTest()}`, `echo` (getter `{overlays, risk}`), `pollHealth()`, `detectedLang` (getter, copy or null), `effectiveLang()`
and `asrEvent(ev)` (the panel's `onEvent` handler – tests feed `lang` events through it). Test: `test/e2e/62-audio.js`.

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

## 13. Sounds (`js/sounds.js`, global `LiveFXSounds`, UMD) – LiveFX 2.0 audio-engine

Everything is synthesized (no files). Full list with descriptions: `docs/SOUNDS.md`.

```js
LiveFXSounds.names   // 38 one-shot names in grouped order (impact, funny, magic) – stable identifiers, used by `sound: "<name>"`
LiveFXSounds.GROUPS  // {impact:[17], funny:[12], magic:[9], 'ambient-loops':[12]} – every one-shot in exactly one of the first three
LiveFXSounds.loops   // 12 ambient loop names (`sound: "loop:<name>"`): rain, wind, fireplace, birds, sea, thunder, nightCrickets, heartbeatSlow, churchBells, cityHum, spaceDrone, storm
LiveFXSounds.play(name, ctx, out, volume = 1) -> boolean            // legacy one-shot (unchanged): GainNode(volume) -> out, false for unknown names
LiveFXSounds.loop(name, ctx, out, volume = 1) -> {name, gain, stop(fadeSec = 1.5)} | null   // legacy loop (unchanged); `startLoop` is an alias
LiveFXSounds.mixer   // singleton, see below
```

New 2.0 one-shots: `bleat, duck, fanfare, kidlaugh, scream, glass, camera, door, tick, sparkle, punch, whoosh2`.
Level budget (2.2 loudness normalisation): **every** builtin one-shot keeps its audio-path gains <= `LiveFXSounds.PEAK_BUDGET` = 0.6 per voice (legacy `heartbeat` / `ooh` were brought down), loops keep every layer gain <= 1; `LiveFXSounds.LIMITER_DB` = -9.

Mixer graph: `voice -> [StereoPannerNode] -> sfxBus(Gain)`, `loop -> ambientBus(Gain) -> duckGain(Gain) -> {dry, ConvolverNode -> wetGain}`,
both into `master(Gain) -> DynamicsCompressorNode(threshold -9 dB (2.2, was -6), ratio 12, attack 3 ms, release 250 ms) -> out`.
All timing is AudioParam automation (no timers) so it also renders in an OfflineAudioContext.

```js
mixer.init(ctx, out = ctx.destination) -> mixer     // builds the graph; idempotent for the same ctx/out, a new ctx rebuilds (levels/reverb kept)
mixer.play(name, {gain = 1, pan = 0, intensity = 1, when = 0} = {}) -> {stop(), name, end} | null
    // null for unknown names or without WebAudio; auto-creates an AudioContext when init() was never called (guarded `typeof AudioContext`)
    // gain clamped 0..1, pan clamped -1..1 (panner only when `pan` is given), when clamped 0..60 s, intensity rounded 1..3
    // intensity 2/3 add layered voices: dedicated layers for boom/punch/airhorn/glass/applause, else a detuned (+9/-14 ct), 14 ms-delayed replay at 0.5/0.4
    // auto-ducks (duckMs/duckDb) while a loop runs when `mixer.autoDuck` (default true)
mixer.startLoop(name, {gain = 1, fade} = {}) -> loop handle | null  // one loop at a time on the ambient bus, same name = no-op, other name cross-fades (1.5 s)
mixer.stopLoop(fadeSec = 1.5) -> boolean
mixer.duck(ms = 300, db = -8) -> boolean          // duckGain -> 10^(db/20) now (tc 15 ms), back to 1 via setTargetAtTime(1, lastSfxEnd, ms/4000); false before init
mixer.setMaster(v) -> number                      // clamped 0..1, 20 ms ramp; non-numeric keeps and returns the current level (same for setBus)
// Non-finite option values mean default (gain 1, pan 0, intensity 1, when 0); duck(NaN, NaN) uses 300 ms / -8 dB; init() on a new ctx/out disconnects the old graph.
mixer.setBus('sfx' | 'ambient', v) -> number | null
mixer.reverb(on, {seconds = 1.8, mix = 0.25} = {}) -> boolean   // synthetic stereo noise IR (exp. decay, -60 dB at `seconds`) on the ambient path, wet = mix
mixer.stats -> {voices, ducked, master, sfx, ambient, reverb, loop: name | null, limiter: boolean}
mixer.autoDuck = true; mixer.duckMs = 300; mixer.duckDb = -8   // defaults used by play()
```

Renderer integration (fx.js): `LiveFXSounds.mixer.init(ctx)` once, then `mixer.play(name, {gain, pan, intensity})`
instead of `LiveFXSounds.play(name, ctx, ctx.destination, volume)`; scenes via `mixer.startLoop(name)` / `mixer.stopLoop()` (2.2: the renderer does exactly this; the three overlay levels map to `setMaster` / `setBus('sfx')` / `setBus('ambient')`).
Guard with `typeof LiveFXSounds.mixer === 'object'` to stay compatible with older sounds.js.

## 14. Zuschauer-Trigger (`server/api-chat.js`, `server/api-gift.js`, `server/chat-twitch.js`, `server/chat-youtube.js`) – LiveFX 2.0 viewer-triggers

Chat commands from Twitch / YouTube (and anything that posts to the API) fire stored triggers; gifts hit
tiers. User guide: `docs/VIEWER.md`.

### Routes (all `requireAuth`)

| Route | Request | Response |
|---|---|---|
| `GET /api/chat` | | `{ok, settings, status, recent}` – `settings` is the public shape below (`youtube.apiKey` is never returned, only `youtube.hasKey`), `status = {twitch, youtube: 'off'\|'connecting'\|'connected'\|'disconnected'\|'error'\|'ended', twitchError, youtubeError, messages, twitchMessages, youtubeMessages}`, `recent` = last 20 chat/gift events |
| `PUT /api/chat` | partial settings (any subset of the keys below; `youtube.apiKey` only when sent as a string – `''` clears it) | `{ok, settings, status, warnings:string[]}`; invalid values are dropped with a warning, never a 4xx. Persists `data/chat.json` (mode 0600) and restarts the connector whose block changed |
| `POST /api/chat/test` | `{text (<= 500), platform?: 'twitch'\|'youtube'\|'tiktok'\|'test'\|'other' (default test), user? (default Tester)}` | `{ok, fired, trigger, command, reason}` – the message takes the real ingest path; 400 `invalid_text` |
| `POST /api/gift` | `{amount (number >= 0), platform?, user?, currency?, gift?, text?}` | `{ok, fired, tier (min of the tier or null), trigger, reason: null\|'no_tier'\|'disabled'\|'unknown', amount}`; 400 `invalid_amount` |

### Settings (`data/chat.json`, defaults = `apiChat.DEFAULTS`)

```js
{ twitch: { channel: '', enabled: false },                 // channel normalized: lower-case, URL/#/@ stripped, /^[a-z0-9_]{1,25}$/
  youtube: { apiKey: '', videoId: '', enabled: false },    // videoId: bare id or youtube.com / youtu.be URL -> id; apiKey server-side only
  prefix: '!',                                             // 1–3 chars, no whitespace
  cooldownPerUserMs: 15000, cooldownGlobalMs: 3000,        // 0 .. 3600000
  commands: { '!airhorn': 'trigger-id' },                  // keys lower-cased + prefixed, <= 40 chars, <= 100 entries; value must match LiveFXSchema.ID_RE; '' removes
  allowAll: false,                                         // also accept !<trigger id> and !<slug(label)> (slug: lower, ı->i, ß->ss, NFKD, [^a-z0-9]+ -> '-')
  gifts: { tiers: [ { min: 1, trigger: '' }, { min: 10, trigger: '' }, { min: 100, trigger: '' } ] } } // <= 10, sorted by min
```

### Ingest + fire path

`chat.ingest({platform, user, text, login?, bits?, ts?})`: the first whitespace-separated word, lower-cased, is the
command when it starts with `prefix`. Resolution: `commands[word]` → (allowAll) trigger id → label slug. Order of
checks: per-user cooldown (`platform:login|user`) → global cooldown → `fireTrigger(ctx, id, {source})`, which mirrors
`POST /api/fire {id}`: `state.matcher.fireById(id)` (cooldown / gap / disabled / unknown) and a `type:'fire'` envelope
with `source: 'chat:<platform>:<user>'` to `audience:'all'`. Blocked reasons: `'cooldown:user' | 'cooldown:global' |
'cooldown' | 'gap' | 'disabled' | 'unknown'`. Twitch `bits=<n>` → `chat.gift({amount: n/100, currency:'USD', gift:'bits'})`
in addition to the command check. Gifts fire the highest tier with `min <= amount` with `force:true` (no cooldown; the
enabled flag still counts) and `source: 'gift:<platform>:<user>'`.

Every chat message is broadcast to **panels only**: `{type:'chat', id, ts, platform, user, text, command?, fired?: triggerId,
blocked?: reason}`; every gift as `{type:'gift', id, ts, platform, user, amount, currency, gift, text, tier, fired, trigger,
reason}`. The last 50 are kept in memory (`chat.recent(n)`), `status.messages` counts every ingested message.

### Connectors

```js
// server/chat-twitch.js – anonymous IRC over WebSocket (global WebSocket, Node >= 22), zero deps
createTwitchChat({channel, onMessage, onState, url?, WebSocketImpl?, log?, backoffMinMs?, backoffMaxMs?}) -> { start(), stop(), state, channel, messages, lastError, inject(line) }
//   sends CAP REQ :twitch.tv/tags twitch.tv/commands, NICK justinfan<5 digits>, JOIN #<channel>; answers PING with PONG;
//   001/366 -> 'connected'; RECONNECT / close -> 'disconnected' + exponential backoff (1 s .. 30 s) while started
//   onMessage({platform:'twitch', user: display-name|nick, login, text, ts, bits?, id?})
parseLine(line) -> {command, tags, prefix, params, trailing, user?, login?, channel?, text?, bits?} | null
normalizeChannel(raw) -> string ('' when invalid)
// server/chat-youtube.js – YouTube Data API v3 polling
createYouTubeChat({apiKey, videoId, onMessage, onGift, onState, fetchImpl?, apiBase?, log?}) -> { start(), stop(), state, videoId, liveChatId, messages, polls, lastError }
//   videos?part=liveStreamingDetails&id=<videoId> -> activeLiveChatId, then liveChat/messages?part=snippet,authorDetails&pageToken=…
//   next poll after max(pollingIntervalMillis, 2000); errors retry after 15 s; 403 (quota / bad key) stops; offlineAt -> 'ended'
//   items published > 15 s before start() are skipped (chat backlog); superChatEvent/superStickerEvent -> onGift({platform:'youtube', user, amount: amountMicros/1e6, currency, gift:'superchat'|'supersticker', text, ts})
normalizeVideoId(raw) -> string
```
Env overrides for tests: `LIVEFX_TWITCH_WS_URL` (fake IRC server, see `test/helpers/ws-server.js`), `LIVEFX_YOUTUBE_API_BASE`.
`server.js` creates `appCtx.chat = apiChat.createChat(appCtx)` before registering routes and calls `chat.stop()` on SIGINT.

### Panel (`js/panel.js`, `index.html`) – ids fixed for tests

Card `#viewer-card`: `#chat-twitch-channel`, `#chat-twitch-enabled`, `#chat-yt-video`, `#chat-yt-key` (password; sent only when
non-empty), `#chat-yt-haskey` („gespeichert ✔“, hidden without key), `#chat-yt-enabled`, `#chat-prefix`, `#chat-cd-user` /
`#chat-cd-global` (seconds), `#chat-allowall`, command rows `#chat-commands tr` with `[data-f="cmd"]` input + `[data-f="trigger"]`
select, `#btn-chat-cmd-add`, gift rows `#gift-tiers tr` (`[data-f="min"]`, `[data-f="trigger"]`, always 3 rows), `#btn-chat-save` +
`#chat-save-status`, status pills `#dot-twitch` / `#chat-status-twitch`, `#dot-youtube` / `#chat-status-youtube`, `#chat-count`,
feed `#chat-feed .chat-line[.fired data-fired=<id>][.blocked][.gift]` (last 20), `#chat-test-text`, `#chat-test-user`, `#btn-chat-test`.
Status is polled every 10 s (`GET /api/chat`, status only – the form is never overwritten while editing).
Card `#combos-card`: rows `#combo-rows tr` (`[data-f="keyword"|"times"|"within"|"fire"]`), `#btn-combo-add`. Rules
`{keywordTriggerId, times (2..20), withinMs (500..600000), fireTriggerId}` in localStorage `livefx.combos` (default:
`[{wow, 3, 10000, win}]` = 3× „krass“ in 10 s → Konfetti); evaluated in `fire()` for every non-combo fire; a combo resets the
counter of its keyword trigger and fires with source `Kombi <n>× <label>` (never counted again).
Settings card: `#intensity-voice` (localStorage `livefx.intensityFromVoice` '1'/'0'); when on, `fire()` reads
`max(meter.level, meter.peak)` and attaches `visual.intensity` 1 (< 0.3) / 2 (< 0.6) / 3 to the sent trigger (only when the
meter runs or a level is set) and logs „· Intensität n“.
`window.livefx` additions: `chat {load(), save(patch?), test(text?, user?), settings, status, feed}`, `combos {rules, set(rules),
record(trigger, source)}`, `intensityFromVoice` (get/set), `voiceIntensity()`. Tests: `test/chat.test.js`, `test/gift.test.js`,
`test/e2e/72-viewer.js`.

### Packs 2.0 (`js/packs.js`)

`tr` 85 / `de` 49 / `en` 50 triggers (defaults + all three = 199 ≤ `LIMITS.triggers`), plus theme packs `family`
(„👨‍👩‍👧 Familie & Kinder“, 27, soft sounds only) and `gaming` („🎮 Gaming“, 27). Theme packs are listed like meme packs
(`story: false`); keyword rules as before (unique within a pack, never a default keyword, no fuzzy stop-word tokens).

## 15. Release 2.1 – performance select, sticker library, safe image sources

**Panel settings card** (`index.html`, `js/panel.js`): select `#perf` („Leistung“, options `auto` „Automatisch (empfohlen)“,
`eco` „Eco (schwacher PC)“, `high` „Hoch (beste Grafik)“) next to `#theme`; persisted in localStorage `livefx.perf` (try/catch,
default `auto`); a change sends `{type:'perf', perf}`; a stored non-auto mode is re-sent 1.5 s after boot (like the theme).
`window.livefx.perf {get(), set(mode)}` (set returns the applied mode, unknown → 'auto'). Server: `ctx.state.perf`
(`server/state.js`, set in `server/api-fire.js`), repeated in the SSE `state` message (`server/sse.js`).

**Media library tabs** (`js/assets.js` → `LiveFXAssets.mountLibrary(el, {onChange, onCreateTrigger})`): `.lib-tabs` with
`.lib-tab[data-tab="files"]` („📁 Dateien & GIFs“, default: uploads + GIF search as before) and
`.lib-tab[data-tab="stickers"]` („😀 Sticker (kostenlos)“); panes `.lib-pane[data-pane="files"|"stickers"]`. The returned
object adds `stickers` (`{open(), search(q), items}`) and `showTab(name)`.
Sticker pane (`.sticker-lib`, loads `memes/index.json` on first open): `.sticker-q` (search over keywords de/tr/en, name, id –
lower-case, Turkish ı/İ and diacritics folded, every word must match), `.sticker-chips > .sticker-chip[data-cat]` (`''` = Alle,
`.active`), `.sticker-status`, `.sticker-grid > .sticker-item[data-id][data-category]` with `img.sticker-thumb` (64 px,
`loading="lazy"`), `.sticker-badge` (animated only), `.sticker-name`, `button.sticker-trigger[data-index]` („⚡ Als Trigger“),
and `.sticker-credit` („Fluent Emoji © Microsoft, MIT – siehe THIRD-PARTY-NOTICES.md“).
„Als Trigger“ calls `onCreateTrigger(asset, {title, sticker})` with
`asset = {name: '<emoji> <Keyword>', url: 'memes/fluent/<id>.webp', type: 'image', emoji, sticker: true, keywords: [≤ 3 of the panel language], animated}`;
the panel opens the editor with `{label, keywords, sound: 'pop', cooldown: 5, visual: {kind: 'image', src: url, emoji, position: 'safe'}}`
(GIF results arrive the same way without `emoji` / `keywords`). Pure helpers: `LiveFXAssets.stickers = {load(), clean(index),
search(items, q, category), toAsset(item, lang), fold(s), CREDIT, CATEGORIES}`. The editor shows the `emoji` field for image
triggers (fallback emoji). `index.html` and `mobile.html` load `js/safety.js` before `js/assets.js`.

**Safe image sources**: see §1 `src`. `js/fx.js`, `js/demo.js` and `js/editor.js` use `HOTLINK_SRC_RE` (fx.js has an identical
fallback copy). Tests: `test/schema.test.js` (accepted hosts; http, look-alike hosts, userinfo, ports rejected; perf envelope),
`test/review-2.0.test.js` (perf relayed + remembered), `test/e2e/82-sticker.js` (perf select → overlay, late overlay, URL pin;
sticker tab → trigger → free-floating sticker; broken image → emoji card; screenshots `sticker-overlay.png`, `sticker-panel.png`).

## 16. Release 2.2 – start wizard, story band, live story, volumes, phone remote, internet link

**Panel** (`index.html`, `js/panel.js`, `css/panel.css`; e2e `test/e2e/36-wizard.js`):
- Start wizard card `#wizard-card` on top, three `.wizard-step`s: `#wiz-mic` (`#wiz-mic-test` runs the meter 5 s → `#wiz-mic-status.ok|.err`),
  `#wiz-obs` (`#wiz-format` landscape|portrait → `#wiz-overlay-url` = `<base>/overlay.html[?layout=portrait]` + `#wiz-size` „1920 × 1080“ / „1080 × 1920“,
  `#wiz-copy-url` writes the clipboard, `ol.wiz-guide` with 6 steps, `#wiz-obs-dot` + `#wiz-obs-state` „Overlay verbunden ✔“ once `/health` reports
  `overlays >= 2` (preview iframe + OBS), `#wiz-test-fx` fires `{id:'wizard-test', label:'TEST', sound:'pop', visual:{kind:'card', emoji:'🎉', text:'LiveFX läuft!'}}`
  with source „Start-Assistent“), `#wiz-packs` (`#wiz-pack-tiles button[data-pack]` toggle packs through `LiveFXPacksStore`, `#wiz-pack-count`
  „x / LIMITS.triggers Trigger · y / n Pakete“, `#wiz-collisions` lists keywords shared by two loaded packs). localStorage `livefx.wizard.format`.
- `#btn-advanced` („⚙️ Erweitert anzeigen“ ↔ „… ausblenden“) toggles every `.card[data-advanced]` (API, combos, demo clip, OBS text, log …);
  localStorage `livefx.panel.advanced` ('1'/'0', default collapsed). **Tests that need one of those cards call `window.livefx.advanced.set(true)` first.**
- Settings: `#volume` (master), `#volume-sfx`, `#volume-ambient` (ranges 0..1, defaults 0.5 / 0.8 / 0.5, localStorage `livefx.volumes` JSON) → `{type:'volume', volume, bus?}`
  (master without `bus`); `#story-layout` band|full|frame, `#band-height` 15..35, `#effect-zone` full|edges|bottom|top → `{type:'layout', storyLayout, band, zone}`
  (always the full triple; localStorage `livefx.layout`); `#primary-lang` tr-TR|de-DE|en-US (localStorage `livefx.asr.primary`, default de-DE) → `primaryLang` of the
  `auto` backend + `matcher.setPhonetic(primaryLang)`; `#live-story` checkbox (localStorage `livefx.liveStory`) → every transcript line as
  `{type:'story', text, final, lang}`; `#gap` default **0.5**. Story mode (`#story-mode`) sets tolerance medium + gap 2 and switches the live story on; it
  **no longer** forces reaction `safe`. Non-default volumes / layout are re-sent 1.5 s after boot (like theme / perf).
- `window.livefx` additionally: `wizard {format, setFormat(f), overlayUrl(), testTrigger(), fireTest(), render()}`, `advanced {get(), set(on)}`,
  `volumes {get(), set(bus, v), defaults}`, `layout {get(), set(patch)}`, `primaryLang` (get/set), `liveStory {get(), set(on)}`,
  `packs {load(id), unload(id), toggle(id), present(id)}`.
- Phone card `#mobile-card` (`js/mobile-link.js`): `#mobile-qr` canvas (`LiveFXQR.toCanvas`, LAN link), `#tunnel-box` with `#btn-tunnel`
  (start ↔ stop, `POST /api/tunnel/start|stop`, polls `GET /api/tunnel` while `starting`), `#tunnel-dot` + `#tunnel-state` (aus | startet … | online | Fehler),
  `#tunnel-url`, `#tunnel-qr` (hidden until online), `#btn-copy-tunnel`, `#tunnel-hint` + `#tunnel-manual` (release link). Script order adds `js/qr.js`,
  `js/packs-store.js`, `js/phonetic.js` (before `js/matcher.js` consumers) – see `index.html`.

**Phone page** (`mobile.html`, `js/mobile.js`, `css/mobile.css`; e2e `test/e2e/35-mobile.js`): `#btn-vol-down` / `#btn-vol-up` (±6 dB on the master,
`#vol-label` „x %“, `#volume` range kept in sync), `#btn-band` („📖 Band an/aus“ → `{type:'layout', storyLayout:'band'|'full'}`), `#btn-zone` (cycles
`{type:'layout', zone}`), `#favs-card` > `#favs button[data-id]` + `#favs-count` (long-press or `.star[data-act="fav"]` on a `#pad` tile toggles,
localStorage `livefx.mobile.favs`, max 60), `#packs-card` > `#packs button.pack-tile[data-pack]` (`.loaded` / `.partial`; tap loads / unloads through
`LiveFXPacksStore` + `LiveFXStore.save`) + `#packs-count` „loaded/n · triggers/limit Trigger“. Script order adds `packs-store.js`.

**Shared modules** (UMD, in `sw.js` FULL_SHELL; `story-director.js` also in OVERLAY_SHELL):
- `LiveFXQR` (`js/qr.js`): `encode(text) -> {version, size, modules, mask}` (byte mode, level M, versions 1–10, ≤ 213 bytes, else throws a German error),
  `toCanvas(canvas, text, {scale=4, margin=2, dark, light})`, `toSvg(text, opts) -> string`, `toText(text)`, `isDark(code, x, y)`, `dataCapacityBytes(version)`,
  `MAX_VERSION`. Test `test/qr.test.js` decodes with an independent reader.
- `LiveFXPacksStore` (`js/packs-store.js`): `present(triggers, packId)`, `isLoaded(triggers, packId)` (≥ 80 % present), `add(triggers, packId) -> {triggers, added, skipped, warnings, label}`
  (normalized, capped at `LIMITS.triggers`), `remove(triggers, packId) -> {triggers, removed, label}`, `summary(triggers) -> [{id, label, emoji, total, present, loaded, partial}]`,
  `collisions(triggers) -> [{keyword, packs:[…]}]`, `limit()`.
- `LiveFXStoryDirector` (`js/story-director.js`, docs/STORY.md): `create({lang:'auto'|'de'|'tr'|'en', caption, ttl?, now?}) -> {feed(text, {final, lang, now?}) -> {lang, hits, decisions, changed, state}, tick(now?) -> {changed, expired:[{kind:'prop'|'actor'|'landmark', role}], state}, onChange(fn(state, {reason:'feed'|'tick'|'reset'})) -> unsubscribe, state, lines, reset(), lang, setLang(l)}`;
  `matchLang(text, L) -> {lang, hits, tokens, score}`, `SPRITE`, `LEX`, `LANGS`, `TTL` (`{propLines:3, propMs:45000, actorLines:4, actorMs:60000}`), `SCENE_BY_PLACE`, `SCENE_BY_WEATHER`, `SCENE_BY_TIME`, `LOOP_BY_SCENE`. State shape = `normalizeStoryState` (§1).
  2.2.1 lifecycle: every final line is a sentence (`lines`); a mention / bound verb / person pronoun refreshes a prop or actor; props (incl. the landmark) leave after `TTL.propLines` later sentences or `TTL.propMs`, actors after `TTL.actorLines` / `TTL.actorMs` (whichever first; `tick(now)` applies the time limit between lines, `feed` applies both); a new place or weather drops props not mentioned in the same or previous sentence (actors stay); action `leave` (`ging weg`, `gitti`, `left` …) and `vanish` remove the nearest named figure **or object** (a landmark named alone leaves; `leave` with a place in the line = `go`); `end` words count only at the end of a line (`son` ≤ 2 words, not after `en`; `ende` ≤ 6 words). `decisions` may contain `{role:'expire', kind, id}`. `create({ttl, now})` overrides lifetimes / the clock.
  Test `test/story-director.test.js` (DE/TR/EN sentence → rain + night + forest + dragon (fly) + castle; 2.2.1 rain → car → sun → forest in TR/DE/EN, lifetimes, tick, removal words, end words).
- `LiveFXPhonetic` (`js/phonetic.js`): `variants(keyword, {from, to}) -> string[]` (≤ `MAX_VARIANTS` 8, never the keyword), `expand(keywords, primaryLang) -> {keyword: variants}`
  (only keywords whose guessed family differs from the primary), `guess(text) -> 'de'|'tr'|'en'|null`, `family(tag)`, `FAMILIES`, `DICT`, `RULES`. Test `test/phonetic.test.js` (≥ 40 cases).
- `LiveFXLangDetect` 2.2: Turkish letters ı ş ğ İ decide for `tr` at once (`signal:'letters'`, score ≥ `TR_LETTER_SCORE` 0.75); `TR_SHORT` stream words score 0.5 (`signal:'words'`);
  Turkish lower-casing (`I → ı`, `İ → i`) whenever a Turkish signal is present.

**Overlay / server**: see §2 (`layout`, `story`, `story-state`, `volume.bus`, `state.layout` / `state.volumes`), §4 (`/api/tunnel`), §9 (band, zones, `renderer.story`, three busses),
§10 (URL pins `?story= ?band= ?zone=`), §13 / docs/SOUNDS.md (`PEAK_BUDGET` 0.6 per voice, limiter −9 dB, loops on the ambient bus).
Versions: `package.json` + `sw.js` `SHELL_VERSION` 2.2.0. e2e: `29-story-band` (screenshots `story-band.png`, `story-band-portrait.png`), `36-wizard` (`wizard.png`).
