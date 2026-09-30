# Design: robust recognition (LiveFX 1.2)

Binding spec for the three parallel work packages (matcher, asr+meter, panel). Backward compatible:
defaults reproduce today's behaviour byte-for-byte; the server keeps `tolerance: 'off'`.

## Ground truths
- `js/matcher.js` is UMD and also used by Node (`server/state.js`, `server/smart.js` uses `normalize()` as cache key). `normalize()` stays untouched.
- Today's `countOccurrences` on the padded string equals a token-window comparison over `normalize(text).split(' ')`, so a token engine with exact equality reproduces today's results 1:1 (incl. overlapping occurrences: "aynen aynen aynen" → 2).
- Per-utterance semantics: `firedInUtterance` (consumed count) + `endUtterance()`; the same counting makes matching alternatives free.
- `asr.js` `onresult` glues interim results without a space (`interim += r[0].transcript`) – fix while there.

## A. Matcher (`js/matcher.js`) – package "matcher"

```js
new LiveFXMatcher.Matcher(triggers, {
  globalMinGap: 1.2,                      // unchanged
  tolerance: 'off' | 'medium' | 'high',   // default 'off'
  lang: 'de' | 'tr' | 'en' | 'auto' | null // stop-word list; 'de-AT' -> 'de'
})
matcher.tolerance                 // getter
matcher.setTolerance(level)       // invalid -> 'off'; no index rebuild needed
matcher.setLang(lang)
matcher.setTriggers(triggers)     // rebuilds the index
matcher.process(text, now)        // -> [{ trigger, keyword, fuzzy: boolean, spoken: string }]
matcher.explain(text)             // pure scan, no cooldown/utterance side effects -> [{ trigger, keyword, fuzzy, spoken, start, end }]
matcher.fireById(id, now)         // unchanged
LiveFXMatcher.normalize           // unchanged
LiveFXMatcher.fold(token, level, lang), LiveFXMatcher.damerau(a, b, max), LiveFXMatcher.TOLERANCES, LiveFXMatcher.STOPWORDS = { de, tr, en }
```
Exact hits: `fuzzy:false, spoken === keyword`.

### fold(token, level, lang) – after normalize()
| level | transformation |
|---|---|
| `medium` | NFD + strip `\p{M}` (ä→a, ö→o, ü→u, ç→c, ğ→g, ş→s), explicit `ı→i`, `ß→ss`, drop apostrophes |
| `high` | medium + collapse doubled letters + confusion table: all langs `ph→f, ck→k, th→t, tz→z, dt→t, y→i`; `de`: `ae→a, oe→o, ue→u, w→v`; `tr`: `w→v, x→ks`; `en`: none |

### Match rule per keyword token (gate on keyword-token length after normalize)
| keyword token length | off | medium | high |
|---|---|---|---|
| ≤ 4 | exact | exact only | exact only |
| 5–8 | exact | fold-equal or DL ≤ 1 (folded) | same (high-fold) |
| ≥ 9 | exact | fold-equal or DL ≤ 1 | fold-equal or DL ≤ 2 |

Precision guards: (1) `|len(spoken) − len(keyword)| ≤ allowed distance`; (2) a spoken token that is an exact keyword token of ANY trigger, or in the active stop-word list, is never edit-distance-matched ("schön"≠"schon"); fold-equality still allowed; (3) multi-word keywords match token-wise, each token passes its own gate ("helal olsn" → `helal` exact, `olsn` DL1 vs `olsun`).

### Index (rebuilt in setTriggers)
Per keyword `kwRef = {idx, trig, keyword, tokens: [tokenRef], n}`; per token `{kw, pos, exact, foldM, foldH, len}`. Maps: `exactIndex`, `foldMIndex`, `foldHIndex` (len ≥ 5 only), `firstBucket`/`lastBucket` on the folded form (len ≥ 5; for DL ≤ 1 at most one of first/last char changes → first[s[0]] ∪ last[s.at(-1)] is complete), `lenBucket` (len ≥ 9, for DL ≤ 2 at high), `exactTokens` Set for guard 2.

### Scan
```
tokens = normalize(text).split(' ')
for i, s of tokens:
  cands = exactIndex.get(s) (fuzzy=false)
  if tolerance != off and not guarded(s): cands += foldIndex.get(fold(s)) not already exact; cands += bucket candidates with damerau(fold(s), t.fold, max) <= max  (fuzzy=true)
  for each (tokenRef, fuzzy): start = i - tokenRef.pos; record in hits[kw.idx][start]
occurrences(kw) = starts with n === kw.n (a token counts once per (kw,pos,i))
```
Then today's logic: sum per trigger, compare with `firedInUtterance`, `matchedKeyword` = longest (tie → exact before fuzzy), sort candidates by keyword length desc, cooldown/gap, push `{trigger, keyword, fuzzy, spoken}` with `spoken = tokens.slice(start, start+n).join(' ')` (prefer an exact occurrence).
Performance target: 200 triggers × 8 keywords, 20-word utterance, `high`: median < 1 ms, max < 5 ms.

## B. ASR (`js/asr.js`) + meter (`js/meter.js`) – package "asr"

```js
LiveFXASR.create(name, {
  lang, bus, onText, onState, onError,     // unchanged
  alternatives: false,   // true -> rec.maxAlternatives = 3; meta.alternatives (deduped, primary dropped) on FINAL results
  restartEveryMs: 0,     // 0 = off; e.g. 60000 = planned restart, only in a speech gap
  stallMs: 20000,        // 0 = off; no result for this long while 'listening' -> stalled restart
  voiceActivity: null,   // optional () => boolean (mic meter); gates stall watchdog + planned restart
  onEvent: null,         // ({type:'result'|'final'|'restart'|'planned-restart'|'stall', at, ...})
})
asr.setOptions({ alternatives?, restartEveryMs?, stallMs? })   // live; alternatives change respawns the recognizer
asr.stats  // { results, finals, restarts, plannedRestarts, stalls, lastResultAt, lastFinalAt, startedAt }
onText(text, isFinal, { source, lang, alternatives?: string[], confidence?: number, at })   // at = performance.now()
```
- Planned restart: timer armed in `onstart`; on fire, if `now − lastResultAt < 1500` or `voiceActivity()` → defer 1 s (max 10 s), else `_planned = true`, `rec.stop()` (graceful) → `onend` respawns with delay 0 and does NOT count as an error restart; `stats.plannedRestarts++`, `onEvent({type:'planned-restart'})`.
- Stall watchdog: re-armed on every result/start; fires in state `listening` when (`voiceActivity` unset or voice seen since `lastResultAt`) → `onError({code:'stalled', message:'Erkennung hängt – Neustart', fatal:false})`, `stats.stalls++`, kill + respawn.
- Timers cleared in shutdown/kill; generation guard `rec !== this._rec` in every handler. `external` backend: options ignored, `setOptions` no-op.
- Web Speech facts (document in CONTRACTS §6): interim every ~100–300 ms, final ~0.5–1.5 s after end of speech; `maxAlternatives` populated for final results only; Chrome ends sessions after ~5–8 s silence (handled) and degrades on long sessions (planned restart is the workaround); valid tags de-DE/de-AT/de-CH, tr-TR, en-US/en-GB/en-IN.

`js/meter.js` (global `LiveFXMeter`):
```js
LiveFXMeter.create({ fps: 10, threshold: 0.02, onLevel(rms, peak) }) -> { start() -> Promise<boolean>, stop(), level, isVoiceActive(), lastVoiceAt, error }
```
getUserMedia({audio:true}) → AudioContext → MediaStreamSource → AnalyserNode(fftSize 1024) → RMS via getFloatTimeDomainData on setInterval(1000/fps). Started on a user gesture; failure logged once, level shows "–".

## C. Panel (`js/panel.js`, `index.html`, `css/panel.css`) – package "panel"

Settings (localStorage `livefx.asr.lang`, `livefx.asr.tolerance` (default `medium`), `livefx.asr.reaction` (`fast`|`safe`, default `fast`), `livefx.asr.alternatives` ('1'/'0', default '1'), `livefx.asr.restart` ('1'/'0', default '0'), `livefx.asr.ignored` (JSON array, cap 50)). Existing `livefx.asr` (backend) untouched. `loadAsrSettings()` at boot, `applyAsrSettings()` on change without reload: tolerance → `matcher.setTolerance`; lang → `asr.setLang` + `matcher.setLang`; alternatives/restart → `asr.setOptions`; reaction → panel variable. `createAsr` passes settings + `voiceActivity: () => meter.isVoiceActive()` + `onEvent` (log restarts/stalls, update `#diag-state`).

Card „Erkennung“ (settings column, above „Einstellungen“), ids: `#asr-settings` (section), `#lang` (moved here; optgroups Deutsch: de-DE/de-AT/de-CH, Türkçe: tr-TR, English: en-US/en-GB/en-IN; header pill shows value and scrolls here), `#asr-tolerance` (off|medium|high – „Dialekt-Toleranz: aus / mittel / hoch“), `#asr-reaction` (fast|safe – „Reaktion: schnell (Zwischenergebnisse) / sicher (nur finale Sätze)“), `#asr-alternatives` (checkbox „Alternativen prüfen (3 Lesarten)“), `#asr-restart` (checkbox „Erkenner alle 60 s neu starten“), `#mic-meter` + `#mic-level` (bar via `--level`) + `#mic-db`, `#diag-state` („Zustand: listening · letztes Ergebnis vor 2 s · Neustarts 1 (geplant 1, hängend 0)“), `#diag-latency` („Erkennung: ~640 ms nach Sprachende · Matcher 0,3 ms“), `#btn-selfcheck` + `#selfcheck-status` („Test: sag ‚krass‘“).

handleText: `reaction === 'safe'` → interim results only render the transcript (no matching); alternatives processed after the primary final text only if the utterance has 0 hits, before `endUtterance()` (source `Mikro (Alt.): „…“`); highlight uses `h.spoken || h.keyword`; fire log shows `„grass“ (≈ krass)` for fuzzy hits.

Learning card under `#transcript` (`#recog-learn`, hidden when empty):
- `#fuzzy-suggest`: buttons `[data-act="learn"][data-trigger][data-spoken]` „„grass“ als Stichwort für Mind blown speichern“ (from fuzzy hits, dedupe by (trigger, spoken), max 3).
- `#misses` (ul): last 8 final utterances with 0 hits (any source incl. Text; not duplicates of the previous miss; not in ignored; dropped if smart mode later fires for it): `li[data-miss]` with word chips `button.chip[data-word]` (click toggles `.sel`; selection = keyword, none = whole phrase; > 8 words require a selection), `select[data-act="assign"]` (first option „→ Trigger zuweisen…“, then all triggers), `button[data-act="ignore"]` „Ignorieren“.
- `learnKeyword(triggerId, phrase)`: trim, ≤ LIMITS.keywordLen, skip duplicates/cap (log), push to `trigger.keywords`, `commit()` (→ setTriggers, re-render, store.save), log `📚 „grass“ → Mind blown gelernt`, remove entry.
- Self-check: word = first keyword of `wow` if present else first enabled trigger's first keyword; start ASR if needed; 8 s window; next final → `matcher.explain(text)` → ✅/❌ messages; timeout: meter never saw voice → „❌ Mikro liefert kein Signal“, else „❌ nichts erkannt – Sprache/Toleranz prüfen“.
- Latency: `meta.at − meter.lastVoiceAt` (rolling avg of 5) + `performance.now()` around `matcher.process`.
- `js/demo.js`: read `livefx.asr.tolerance` for its matcher (one line).
- Script order: `sounds, triggers, packs, schema, matcher, bus, store, assets, editor, meter, asr, smart, panel`.
- e2e harness: add `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` to the Chromium launch args in `test/e2e.js` (panel package owns this edit).
