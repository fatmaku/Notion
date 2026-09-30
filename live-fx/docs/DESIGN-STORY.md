# Design: Story mode (LiveFX 1.3) – reading aloud → live animated scenes

Goal: an author/streamer reads a story; LiveFX turns key phrases into full-screen animated scenes with
ambient sound that STAY until the next scene, plus character/object stickers on top. Works in OBS
(overlay), on the demo page (recorded), landscape and portrait.

## Schema additions (`js/schema.js`)
- `visual.kind: 'scene'` (new, added to KINDS). Fields: `scene` (id from SCENES list), `text?` (caption, ≤ 80), `emoji?` (particle override, ≤ 16), `intensity?` 1..3 (particle density), `duration?` seconds 0 = until next scene (default 0), `caption?` boolean.
- `SCENES = ['rain','night','forest','sea','fire','castle','snow','desert','city','space','sunrise','storm','clear']` (`clear` = fade out the current scene).
- `sound` gets a third form `"loop:<name>"` (ambient loop, name ∈ `LiveFXSounds.loops`): `parseSound` → `{kind:'loop', name}`. Validation regex `/^[a-z][a-zA-Z0-9]{0,30}$/`.
- `visual.kind: 'sticker'` (2–4 emojis in formation with bounce; fields `emoji` = up to 4 emojis, `text?`) – small, reused by packs.

## Renderer (`js/fx.js`, `css/overlay.css`)
- `renderer.scene(v)`: one persistent layer `#stage .fx-scene` (below effects, above transparent background): background gradient per scene + CSS-animated particles (emoji or CSS shapes): rain (falling drops/💧 streaks, blue-grey), night (stars twinkle + moon 🌙), forest (green gradient, 🍃 drifting, fireflies), sea (blue waves animated, 🌊 🐟), fire (orange glow flicker, ✨ sparks rising), castle (purple dusk, 🏰 silhouette, 🦇), snow (❄️ falling, white-blue), desert (sand gradient, 🌵 ☀️ heat shimmer), city (night skyline blocks, 🚕 lights), space (stars, 🪐 drifting, comet), sunrise (warm gradient sweep), storm (dark, lightning flashes ⚡ + rain), clear (fade out). Scene swap = crossfade 800 ms; same scene again = no-op. `duration` > 0 → auto-clear.
- Caption: `.fx-scene-caption` bottom-center (landscape) / top-third (portrait), Escaped text.
- Ambient loop: `renderer.playLoop(name)` via `LiveFXSounds.loop(name, ctx, out)` returning `{stop()}`; only one loop at a time, 1.5 s fade in/out (GainNode ramps); `renderer.stopLoop()`; a `fire` with `sound:'loop:x'` swaps the loop; a scene with no sound keeps the current loop; `clear` stops it. `volume` slider applies.
- `renderer.stats.scenes`, `renderer.currentScene`.
- Sticker kind: formation row with staggered bounce, 2.8 s.
- Portrait: scene fills the whole frame (background), particles use `--fx-fall`.

## Sounds (`js/sounds.js`)
- `LiveFXSounds.loops = ['rain','wind','fireplace','birds','sea','thunder','nightCrickets','heartbeatSlow','churchBells','cityHum','spaceDrone','storm']`, `LiveFXSounds.loop(name, ctx, out) -> {stop(fadeSec=1.5)}` – built from looping noise buffers + LFO-modulated filters (rain = filtered noise with random drips; wind = slow bandpass sweep noise; fireplace = crackles (random short noise bursts) + low rumble; birds = random chirps (sine glides); sea = 8-s swell LFO on lowpass noise; thunder = occasional low rumbles + rain; storm = wind + rain + thunder; nightCrickets = periodic 4 kHz chirps; heartbeatSlow; churchBells = bell hits every 3 s; cityHum = low drone + occasional horn; spaceDrone = detuned sines + slow filter). All schedule themselves with `setTimeout`-free WebAudio scheduling (use `AudioBufferSourceNode.loop = true` + LFO nodes; random events pre-scheduled 30 s ahead and re-armed via `onended` of a silent scheduler source).
- Peak check as before.

## Packs (`js/packs.js`)
- `story-de`, `story-tr`, `story-en` (≥ 25 each): phrases → scenes with loops ("es regnete"/"regen" → rain+loop:rain; "in der nacht"/"nachts"/"dunkel" → night+nightCrickets; "im wald" → forest+birds; "am meer"/"das schiff" → sea+sea; "am feuer"/"kamin" → fire+fireplace; "schloss"/"könig" → castle+churchBells; "schnee"/"winter" → snow+wind; "wüste" → desert+wind; "stadt" → city+cityHum; "sterne"/"weltraum" → space+spaceDrone; "morgen"/"sonnenaufgang" → sunrise+birds; "gewitter"/"donner" → storm+storm; "ende"/"und wenn sie nicht gestorben sind" → clear + tada). Stickers: drache 🐉, prinzessin 👸, ritter 🛡️⚔️, schatz 💎, hexe 🧙, zauber ✨, herz 💖, schiff ⛵, pferd 🐎, hund/katze. Turkish: "bir varmış bir yokmuş" (opening → sunrise + banner), "yağmur yağıyordu" → rain, "gece" → night, "ormanda" → forest, "deniz", "ateş", "saray/kral" → castle, "kar", "çöl", "şehir", "yıldızlar", "sabah", "fırtına", "ejderha", "prenses", "şövalye", "hazine", "cadı", "büyü", "gökkuşağı"… English similarly.
- Long cooldowns (scene 8 s, sticker 6 s), `hint`s for smart mode, `position: top` for stickers.

## Panel (`js/panel.js`, `index.html`)
- Card „Story-Modus“ (above Meme-Pakete): toggle `#story-mode` (on: sets tolerance medium, reaction safe, `#gap` 2 s, loads `story-<lang>` pack for the current language family, shows scene soundboard `#scene-pad` with one button per SCENES entry + „Szene beenden“; off: restores previous settings, keeps the pack). Persist `livefx.story`.
- Editor: kind select gets „Szene“ + scene select + intensity + caption; sound select gets an „Atmosphäre (Loop)“ optgroup.
- Thumbnail for scene triggers = scene emoji.

## Demo page (`js/demo.js` CanvasFX)
- CanvasFX gains `scene(v)` (gradient + simple particles) persistent layer drawn first; loops routed through mixNode via `LiveFXSounds.loop`.

## Tests
- schema: scene/sticker kinds, `loop:` parse, clear.
- fx e2e (`test/e2e/25-story.js`): fire rain scene → `.fx-scene[data-scene=rain]` present after 1 s and still present after 4 s; fire night → old fades (class `fx-scene-out`), new present; `clear` removes; `renderer.currentScene`; loop: `#stage` audio graph → `renderer.loopName === 'rain'`, swapped on night; caption escaped; portrait screenshot `story-portrait.png`, landscape `story.png`; demo page CanvasFX scene active.
- sounds test: loops list, `loop()` returns stop, stop fades (fake ctx), peaks in browser render for 4 s each within [0.03, 1.0].
- packs test: story packs normalize, ≥ 25 each, phrases fire the intended scene via matcher (medium tolerance).
