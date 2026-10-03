# LiveFX – The Next Steps

**You talk. It becomes a scene.** Vision 2027–2029: live video from words, language learning, new spaces and an editor that cuts by itself.

Date: October 2026 · Product version: 2.0 · Confidential
Founder & Inventor, Managing Director: Tuncay Sancak · Investor Relations: Gönül Demet · Contact: [Email]

> Deutsch: VISION.md · Türkçe: VISION.tr.md

> Market figures come from public secondary sources and are tagged [Source n] (list in `QUELLEN.en.md`, numbers 1–60). Our own prices, volumes and revenues are marked as "estimate". Features that do not exist yet are marked **Vision**. Information in [square brackets] will be filled in by the founder.

---

## 1. What this is about

Today LiveFX listens to the streamer and, in under a second, drops memes, GIFs, sounds and animated scenes into the live stream: live captions, only with pictures, memes and sound effects. Version 2.0 understands German, Turkish and English automatically, tolerates dialect, ships 238 triggers in five packs and a story mode with 13 scenes and 12 ambience loops, and runs in the browser, offline if you want.

The next stage turns LiveFX into a **visual language for everything spoken**. Whatever someone tells, reads aloud or teaches appears in the same second as a continuous scene, as a word picture with pronunciation or as a ready-cut clip: in the stream, in the classroom, on stage, in smart glasses and in the editing suite. Rendering happens in the browser on the user's own device, with the **compute budget of a caption, not a data center**.

**Claim:** "You talk. It becomes a scene." (Turkish suggestion, to be reviewed by the founder: "Sen anlat – sahne oluşsun.")

**The four lines**

| Line | Name | Colour | What it creates | Status |
|---|---|---|---|---|
| **A** | Story Film – Generative Scene Engine | Neon green | A continuous animated film made from words, sentences and context, below or beside the live picture | Vision, prototype available |
| **B** | WordPicture – language learning and reading support | Gold | Spoken word → picture + word in the target language + pronunciation, or as a reading aid in your own language | Vision, prototype available |
| **C** | LiveFX Spaces – stage, classroom, audiobook, AR/VR, glasses | Light blue | The same engine on new screens | Stage usable today, the rest is Vision |
| **D** | LiveFX Studio – live editing and auto-edit | Neon pink | Highlights from the stream and automatic editing of finished videos, exported locally | Vision |

**Supporting material**

- Language-learning prototype: `prototypes/sprachlernen.html` (WordPicture, line B, a single HTML file, offline)
- Live-story prototype: `prototypes/live-story.html` (Story Film, line A, a single HTML file, offline)
- Vision trailer (35 s): English version `video/LiveFX_Vision_en_16x9.mp4` and `video/LiveFX_Vision_en_9x16.mp4`, plus the German and Turkish versions `video/LiveFX_Vision_de_16x9.mp4`, `video/LiveFX_Vision_de_9x16.mp4`, `video/LiveFX_Vision_tr_16x9.mp4`, `video/LiveFX_Vision_tr_9x16.mp4`
- Pitch slides 12–15 in `LiveFX_Pitch_EN.pptx` (German `LiveFX_Pitch.pptx`, Turkish `LiveFX_Pitch_TR.pptx`)
- Financial view: `BUSINESSPLAN.en.md`, chapter "Future"; markets: `MARKTANALYSE.en.md`, "Adjacent markets"

---

## 2. Guiding principle: draw, don't generate

Generative video AI computes every frame from scratch, on expensive GPUs, with seconds to minutes of waiting time. For live use that is too slow and too expensive. LiveFX goes the opposite way: a sentence is translated into a **small state change** (a few hundred bytes), and the browser **draws** the scene from it, deterministically and at 60 frames per second.

| | Generative video AI | LiveFX |
|---|---|---|
| What gets computed | every pixel of every frame | one state delta per sentence (200–500 bytes) |
| Where | data center (GPU) | browser on the user's own device |
| Latency | seconds to minutes | under one second |
| Live possible | no | yes |
| Cost per hour of companion video | USD 180–2,700 at list price [Source 24, 25] | €0 without AI, USD 0.25–0.75 with optional text AI (project measurement) |
| Reproducible | no (randomness in the model) | yes: same text + same seed = same picture |
| Privacy | upload required | data stays on the device |

The maths: at list price, video AI costs USD 0.05 (Veo 3.1 Lite, 720p) to USD 0.75 per second [Source 24, 25]. One hour is 3,600 seconds, so USD 180–2,700. That makes LiveFX **240 to more than 10,000 times cheaper**, and unlike video AI it runs live. **Honest positioning:** the result is a stylised picture-book world, not photorealistic AI video. That is exactly why it is fast, cheap and child-friendly.

---

## 3. Architecture: one pipeline, one data format, many screens

```
Voice/file ─► Transcript ─────────────► Understanding ─────────────► Timeline (LTF) ───► Render targets
              asr.js · whisper-worker    matcher.js · langdetect.js    timeline.js           fx.js overlay · band/split · WordPicture
              /api/transcript            scene-director.js · smart.js  (one JSON format)     stage · companion · AR/XR · Studio export
```

**Shared backbone: the LiveFX Timeline (LTF v1).** One JSON format for all four lines, to be fixed in `docs/CONTRACTS.md` (Vision, Q4 2026):

```
{ v:1, lang, seed, start, events:[ {t, kind, …} ] }
kinds: state (world state, A) · fire (trigger, as today) · word (WordPicture, B)
       caption (word with timestamp) · cut / zoom (editing, D) · gift / chat (signals)
```

- **A** writes the timeline live, **B** adds words, **C** plays it back on other screens, **D** edits and exports it.
- Every frame is `render(state, t, seed)`, following the pattern of the trailer engine `video/engine.js`. That makes every frame deterministic, reproducible and exportable.
- What gets reused: speech recognition (`asr.js`, "fast" and "safe" reaction), offline Whisper (`whisper-worker.js`), fuzzy/dialect matcher (`matcher.js`), language detection (`langdetect.js`), effect engine (`fx.js`, ParticleLayer with auto-reduction), audio mixer (`sounds.js`, ducking, reverb), bridge (`bus.js`, SSE), phone remote (`mobile.html`), optional AI (`smart.js`).
- At the core, only three building blocks are **new**: `scene-director.js` (sentence → state delta), the effect kinds `actor`, `camera` and `word` in `schema.js` v4, and `timeline.js` (timeline log and playback).

**Performance budget (binding):** one canvas, one `requestAnimationFrame` loop, at most 1,200 particles and 8–12 cached sprites, world state ≤ 1 KB, target 60 fps on integrated graphics at < 4 ms script time per frame. Canvas2D is the default. WebGPU has been available in all major browsers since 2026 [Source 27] and is used only optionally for light and depth.

---

## 4. Line A – Story Film: the Generative Scene Engine

### 4.1 User experience

The streamer reads aloud or tells a story freely. Below her camera image a continuous picture-book film runs and evolves with every sentence. In portrait (9:16) it sits as a band between the face and the chat zone; in landscape (16:9) as a split screen or background.

| Said | What happens on screen |
|---|---|
| "It was night." | The sky darkens, stars appear. |
| "A girl walked into the forest." | Trees grow from the bottom, a figure walks in and stays. |
| "It started to rain." | Rain falls over the forest, the ambience loop switches to rain. |
| "Suddenly a dragon stood there." | Lightning, a short camera shake, the dragon enters. |
| "It flew off." | The dragon takes off ("it" refers to the most recently named figure). |
| "The rain stopped." | The weather clears (negation detected). |

The streamer does nothing but talk. In the panel the timeline fills up with the scene changes; on the phone there are two buttons: "Hold scene" and "Back". After the stream the story exists as a timeline and becomes raw material for clips (line D) and for "audiobook with pictures" (line C).

### 4.2 How it works

- **World state** (≤ 1 KB) with seven roles: PLACE, TIME, WEATHER, CHARACTER, OBJECT, ACTION, MOOD. Example: `{ort:'wald', zeit:'nacht', wetter:'regen', figuren:[…], objekte:[…], stimmung:'spannend', kamera:{zoom, pan}}` (field names as in the code).
- **Lexicon:** the existing story packs (`STORY_DE/TR/EN`) get a `role` field. The 13 scenes already cover PLACE, TIME and WEATHER, the stickers cover CHARACTER and OBJECT. Target: 300–500 entries per language.
- **Scene grammar**, deterministic, sentence by sentence: PLACE swaps the backdrop (800 ms crossfade), TIME recolours the sky, WEATHER swaps the particle system, a new CHARACTER walks in from the edge, ACTION moves the named or most recently named character, MOOD sets hue and vignette, and "suddenly" triggers a camera shake and a flash of light. A sentence without a match changes nothing.
- **Two-stage timing:** backdrop and weather already react to interim results ("fast" reaction), characters only to finished sentences ("safe" reaction). A scene change needs at least 8 s of spacing.
- **Optional AI:** for sentences without a lexicon match, the text AI returns a state delta as JSON (timeout 1.5 s). In children's and school profiles the AI is off by default.
- **Output:** `overlay.html?layout=band|split|full` as an OBS browser source, sound via the existing mixer.
- **Images:** base vocabulary Noto Color Emoji (Apache 2.0) [Source 30], OpenMoji (CC BY-SA 4.0) only in free and education packs with attribution [Source 31], our own SVG illustrations in children's-book style as the brand pack. No image is generated at runtime.

### 4.3 Why it needs so little computing power

A sentence produces a delta of 200–500 bytes, and scenes change one to three times per minute. A frame consists of a colour gradient, silhouettes, at most 1,200 particles and a few cached characters in *one* canvas. Today's effect engine already holds this budget alongside the OBS encoder on a laptop with integrated graphics.

### 4.4 Feasibility, market, revenue

- **Feasibility:** prototype available (`prototypes/live-story.html`). MVP in the real data flow (DE, 4 places, 20 characters) in 8–12 weeks, TR/EN and AI delta another 8 weeks, world packs in our own style 6–9 months.
- **Market:** read-aloud, audiobook, podcast and talk formats that today have only sound or a still image. German audiobook market 2025: €374m, +13% [Source 19]. 23.8m people in Germany listen to podcasts weekly [Source 20], and YouTube has more than 1bn monthly podcast viewers [Source 21]. 32.3% of 1- to 8-year-olds are rarely or never read to [Source 22]. AI video generation and editing: USD 3.67bn in 2026, USD 24.89bn in 2036 [Source 23]. Synthesia, at around USD 150m ARR, shows the willingness to pay for "video without a camera" [Source 26].
- **Revenue (estimate):** Story Film with lexicon in Pro (€9.99), AI scene planning in Pro+ (€14.99), world packs €2.99–4.99 (fairy tales/Masal, sea, space, city, school), publisher licence [€2,000] per title per year (estimate, to be reviewed by the founder; first case: the founder's own children's book series), later a Scene SDK as a B2B licence.

### 4.5 Risks

| Risk | Response |
|---|---|
| Expectation of "AI video like in a commercial" | Position it as an animated picture book and make the style a strength |
| Metaphors ("exploded with rage") and ambiguity (German "Schloss" = castle/lock, "Meer/mehr" = sea/more) | Negative list, context rules, "safe" reaction, "Back" button |
| Maintaining the lexicon in three languages | Marketplace and learning function |
| Distraction from the face | Calm band, minimum spacing between changes |
| Platform copies the feature | Moat built from packs, multilingualism, proof in practice and speed |

---

## 5. Line B – WordPicture: language learning and reading support

### 5.1 User experience

A child says "Apfel". Instantly a large 🍎 appears, below it "elma" in the target language, in small type "der Apfel" with a colour-coded article and syllable arcs, and a voice says "elma". The teacher sets only three things: "I speak: Deutsch", "Show: Türkçe" and the mode. Then she reads aloud, and every word from the learning list turns into picture, word and pronunciation, without a click. The Turkish product name is "Kelime-Resim".

| Mode | What happens | For whom |
|---|---|---|
| **Translate** | Word in the target language, with pronunciation | Families, schools, integration courses, Turkish as a heritage language |
| **Reading aid** | Same language, large word with syllables and picture | Children who cannot read yet, children with reading or attention difficulties, German as a second language (DaZ); connects to the founder's books on neurodiversity |
| **Repeat after me** | The card says the word, the child repeats it, a green tick shows "recognised" | Practice without grades; deliberately **no** pronunciation scoring |

On a tablet, tapping repeats the pronunciation. After the lesson the word list can be printed as flashcards.

### 5.2 How it works

- **New effect kind `word`** with picture, base form, source and target language, article, syllables, example sentence and pronunciation.
- **Concept-based vocabulary packs:** one concept, three languages, with forms (e.g. `elma`, `elmalar`, `elmayı`). 500 concepts × 3 languages ≈ 100 KB of JSON. There is no translation API at runtime.
- **Recognition:** Turkish suffix stripping (`elmalar`, `elmayı` → `elma`), "high" tolerance for children's voices, automatic language selection. No match means no card, so never a wrong one.
- **Pronunciation:** `speechSynthesis` uses the operating system's voices, free of charge and offline depending on the device [Source 29]. Fallbacks: recorded audio for the core vocabulary, then Piper TTS as WebAssembly in a worker [Source 44].
- **Classroom preset:** children's-book theme, large type, only words from the selected list; the teacher's phone acts as the remote control.
- **Privacy:** browser speech recognition in Chrome runs via servers by default. The school profile therefore enforces on-device recognition (`processLocally`, Chrome 139+) [Source 28] or offline Whisper. The app runs offline and without accounts.

### 5.3 Why it needs so little computing power

Word → picture is a table lookup taking microseconds. The operating system supplies the pronunciation, the pictures are emoji or SVG (kilobytes), and only one card is ever visible. A school tablet or Chromebook is enough, and there are no server costs per pupil. The real effort is content work: pictures, checked translations, audio recordings.

### 5.4 Feasibility, market, revenue

- **Feasibility:** prototype available (`prototypes/sprachlernen.html`). MVP with 300 words DE↔TR↔EN, reading aid and worksheet in 4–6 weeks; school-ready (offline profile, documentation, pilot) in 3–6 months.
- **Consumers:** in Q2 2026 Duolingo had 58.7m daily active users and 12.7m paying subscribers [Source 32]. Language-learning apps generated USD 1.54bn in in-app revenue in 2025, +18.8% [Source 33]; the total language-learning market including classroom teaching was ≈ USD 84bn in 2025 [Source 34]. Lingokids raised USD 120m in 2025 [Source 35].
- **Integration and schools:** in 2025, 307,000 people started an integration course, in 17,204 courses with 18,920 teachers [Source 36]. 20.4% of pupils under 16 mainly speak a language other than German at home [Source 37]. 2.65m people in Germany have a migration background from Turkey [Source 38]. 25% of fourth-graders fall below the minimum reading standard [Source 39]. The DigitalPakt 2.0 provides €5bn over five years [Source 40].
- **Price anchors and free competition:** ANTON school licence €250–700 per school per year [Source 41]; Microsoft Reading Coach [Source 42] and Google Read Along [Source 43] are free, but monolingual and not designed for streams, reading aloud or Turkish.
- **Revenue (estimate):** Free with 200 basic words; Pro (€9.99) with all lists and WordPicture in the stream; **WordPicture Family** €4.99/month; vocabulary packs €4.99 (German as a second language core vocabulary, Turkish as a heritage language, primary-school English, later Ukrainian and Arabic); school licence €300–800 per school per year; course licence €49 per teacher per year; publisher edition of bilingual books.
- **Honestly:** in euro terms the integration segment is small (even at full coverage 18,920 × €49 ≈ €0.9m/year, estimate). It brings credibility and access to funding; the volume lies with families, publishers and platforms.

### 5.5 Risks

| Risk | Response |
|---|---|
| System voices are missing or sound weak (e.g. Turkish on older devices) | Self-test, recorded audio, Piper as fallback |
| Children's voices and dialects are recognised less well | "High" tolerance, several attempts, no grades |
| Overstating the effect | "Supports vocabulary learning" instead of promises; review by an edtech advisory board |
| Homonyms and abstract words | Topic lists instead of a full dictionary, SVG instead of emoji |
| Long procurement cycles in the public sector | Families and publishers carry the first year |

---

## 6. Line C – LiveFX Spaces: stage, classroom, audiobook, AR/VR, glasses

### 6.1 User experience

- **Stage and events:** the host says "Applause!" and confetti explodes on the LED wall. At "and now: the winner" a lower third slides in. The director holds nothing but a phone.
- **Classroom:** the Story Film runs on the projector, WordPicture tiles appear on the tablets.
- **Audiobook and podcast with pictures:** the audiobook plays while the phone display shows calm scenes matching what is said. Tilt the phone and the layers shift like a window into the story.
- **AR on the phone:** the mother reads aloud, the child holds the phone over the book, and the dragon stands on the kitchen table.
- **VR and glasses:** in VR the scene sky becomes a dome above the audience. In display glasses the card "çay · tea" floats next to the cup.

### 6.2 How it works: one state, many screens

| Target | Device | Technology | Maturity |
|---|---|---|---|
| `stage` | LED wall, projector | Full screen without safe zones, phone as director's console, `/api/fire` for VJ software and lighting desks | usable today |
| `classroom` | Projector + tablets | Story Film and WordPicture, tablets with live transcript | 1–2 weeks |
| `companion` | Phone, tablet | Plays a finished timeline in sync with the audio player, **with no speech recognition at all**; tilt controls the parallax layers | 4–8 weeks |
| `ar-light` | All phones, including iPhone | Rear camera + effect canvas on top, recording as a clip | 4–8 weeks |
| `xr` | Android/Chrome, Quest, visionOS | WebXR `immersive-ar` with DOM overlay [Source 47, 48], in VR a canvas texture on a curved surface | months, showcase |
| `glasses` | Meta Ray-Ban Display | Web app (HTML/CSS/JS, developer preview since May 2026) [Source 46], recognition on the phone | months, showcase |

### 6.3 Why it needs so little computing power

There is no new model and no cloud rendering, only new output targets for the same JSON. Companion mode only computes clock time → state → drawing and creates less load than a YouTube video. In XR *one* canvas texture is enough, and the glasses only ever show a card, an icon and a word. On stage, a laptop with a browser replaces a media server.

### 6.4 Market, revenue, risks

- **Market:** IDC expects 13.6m smart glasses and USD 5.1bn in revenue in 2026 [Source 45]; display glasses are still a small subset of that, and the phone remains the mass market. Stage price anchor: VJ software Resolume Avenue €299, Arena €799 [Source 49]. Children's audio pays: tonies generated €630m in revenue in 2025, +31% [Source 50]. There is no reliable overall figure for stage, events and classrooms.
- **Revenue (estimate):** event and stage licence €19–49 per day or €299/year (education −50%); publisher licence "audiobook with pictures" per title or as a revenue share; school licence bundled with B; AR-light free as a reach engine; XR and glasses as a freemium showcase, revenue set at €0.
- **Risks:** small hardware base and SDKs in preview (iOS Safari without WebXR); speech recognition on stage disrupted by the PA system (close-talk mic, scene pad as manual fallback); privacy with listening glasses, age limits and motion sickness in VR (for children only phone and projector); support-heavy events (licence and instructions only).

**Assessment:** in 2027–2028 WebXR and glasses are a **showcase, not a revenue line**.

---

## 7. Line D – LiveFX Studio: live editing and auto-edit

### 7.1 User experience: two doors into the same tool

- **Live → Highlights:** after the stream, LiveFX suggests 3–5 short clips at the moments where memes, gifts and chat were densest. 9:16 format, the same effects, ready to post.
- **Drop a file:** a 20-minute MP4 is dragged into the window (an old stream, a podcast, a read-aloud video). LiveFX shows "Listening … (local)", then the timeline is ready: transcript, triggers, scenes, loud moments, pauses and filler words. The creator picks a look and either "Highlights only, 60 s, 9:16" or "Full video with effects". Every suggestion is a chip that can be moved, swapped or deleted. The preview draws the effects live, without rendering. Then comes the export. **The file never leaves the computer.**

### 7.2 How it works

| Step | Technology |
|---|---|
| Collect signals (live) | Timeline log on the server from existing sources: triggers, transcript, chat, gifts; highlight score over sliding 30-s windows |
| Transcript (file) | WebAudio decodes the audio track, Whisper in the browser transcribes with word timestamps (WebGPU/WASM) [Source 60] |
| Analysis | Matcher and scene director read the whole sentence ahead; level and pause detection supplies cuts and zoom punches |
| Editing | Timeline (LTF) with `cut`, `zoom`, `caption`, `fire`, `state` as chips |
| Preview | `<video>` + effect canvas, synchronised via `requestVideoFrameCallback` |
| Export | WebCodecs with hardware encoder, Mediabunny muxes to MP4/WebM [Source 57, 58, 59]; fallback MediaRecorder; word-by-word captions; vertical via cropping |

### 7.3 Why it needs so little computing power

No upload, no cloud transcoding. The Whisper model (≈ 40–150 MB) is loaded once. The "edit" is a JSON file of a few kilobytes, the preview draws the same canvas as live, and only the export does real computing, once and with the hardware encoder. The marginal cost per video is zero, and there are no minute quotas.

### 7.4 Feasibility, market, revenue, risks

- **Feasibility:** highlights with MediaRecorder export 4–6 weeks; file import with auto-effects 3–4 months; robust MP4 export for all browsers 6–9 months. WebCodecs is available in Chrome and Edge from 94, Firefox from 130 (desktop), and with audio in Safari from 26 [Source 57, 58].
- **Market:** video editing software USD 2.52bn in 2025 → USD 2.68bn in 2026 [Source 51]; AI video generation and editing USD 3.67bn in 2026 [Source 23]. CapCut: 736m mobile MAU and more than USD 1bn in in-app revenue in 2025 [Source 52]. OpusClip: more than 10m users, ARR estimated at USD 10–20m [Source 53]. Price anchors: OpusClip USD 15–29, Submagic USD 19–69 [Source 54], Descript USD 16–65 per month [Source 55]. Buyer signal: in February 2026 Canva acquired Cavalry and MangoAI [Source 56].
- **Revenue (estimate):** Free with 3 highlight clips per stream and a watermark (conversion lever); Pro without watermark, with live editor; **Pro+ "Studio & Scenes" €14.99/month** with file import, auto-edit, MP4 export, no minute limit; style packs €2.99–4.99; agency licence with batch processing; white label/SDK for editor and streaming providers.
- **Risks:** strong, partly free competition (do not compete as a general-purpose editor, but via speech → effect, story scenes, TR/DE and local processing); browser limits with long or 4K videos (length limit, desktop first); copyright on export (only our own sounds, licensed GIFs); Whisper weaker on Turkish and dialect (larger models, correction in the transcript); low conversion to paid (Studio as an add-on to Pro, not a separate product).

---

## 8. Market overview

| Segment | Size | Source | Relevance |
|---|---|---|---|
| Live streaming worldwide (core) | USD 97–157bn in 2026 | [Source 1, 2] | today |
| AI video generation and editing | USD 3.67bn in 2026 → USD 24.89bn in 2036 | [Source 23] | A, D |
| Video editing software | USD 2.52 → 2.68bn (2025 → 2026) | [Source 51] | D |
| Language-learning apps (in-app) | USD 1.54bn in 2025, +18.8% | [Source 33] | B |
| Language learning overall | ≈ USD 84bn in 2025 | [Source 34] | B |
| Audiobooks Germany | €374m in 2025, +13% | [Source 19] | A, C |
| Smart glasses | 13.6m devices / USD 5.1bn in 2026 | [Source 45] | C |
| Children's audio (tonies) | €630m in 2025, +31% | [Source 50] | C |
| Integration courses Germany | 307,000 new participants, 18,920 teachers (2025) | [Source 36] | B |
| DigitalPakt 2.0 | €5bn over five years | [Source 40] | B, C |

**The killer argument for platforms.** Today platforms turn speech into captions: in real time, free of charge, on billions of devices. LiveFX turns speech into **pictures, scenes, flashcards and cuts**, with the same compute load. That lets a platform give every live creator a "produced" stream without an extra GPU server. In Southeast Asia, the Caucasus and Central Asia alone, more than 100m creators went live on TikTok in 2025 [Source 2]. Every minute of watch time feeds into gifts, which make up around half of streamer income; the platform keeps about 50% [Source 5, 8]. On top of that, every stream leaves behind a timeline from which Shorts emerge by themselves: live becomes a source for short-form video instead of its competitor.

---

## 9. Business model and pricing architecture

All prices are **estimates** and to be reviewed by the founder.

| Tier | Price | Contents |
|---|---|---|
| **Free** | €0 | Story Film with one world, WordPicture with 200 words, 3 highlights per stream with watermark |
| **Pro** | €9.99/month | All basic worlds, band and split, all WordPicture lists, highlights without watermark, live editor |
| **Pro+ "Studio & Scenes"** | €14.99/month | AI scenes, auto-edit from file, MP4 export, batch, audiobook visualiser |
| **WordPicture Family** | €4.99/month | Language learning and reading aid without streaming features |
| **Packs** | €2.99–4.99 | World, vocabulary and style packs, later a marketplace with a 70/30 split |
| **School licence** | €300–800/year | WordPicture + Story Film, offline profile |
| **Course licence** | €49 per teacher per year | Integration and German-as-a-second-language courses |
| **Event/stage licence** | €19–49/day or €299/year | Stage mode, event packs |
| **Publisher licence** | [€2,000] per title per year (estimate, to be reviewed by the founder) | Audiobook with pictures, bilingual books |
| **Scene SDK / platform** | by agreement | LTF, renderer, packs as a licence or white label |

**Additional revenue from the vision, base scenario (estimate, €k):** ≈ 27 (2027), ≈ 192 (2028), ≈ 617 (2029); after additional costs, a contribution margin of ≈ −3, +77 and +407 €k. The derivation is in the business plan, chapter "Future". SDK and platform revenues are not double-counted there; XR and glasses are included at €0.

---

## 10. Roadmap 2027–2029

The order follows proximity to revenue: **D highlights and B first, A as the core, C via the stage, XR later.**

| Quarter | Product | Market / sales | Metric |
|---|---|---|---|
| Q4 2026 (lead-in) | Prototypes `sprachlernen.html` and `live-story.html`, LTF v1, vision trailer DE/TR/EN | Pitch slides 12–15, LinkedIn post "Vision" | Prototypes run offline at 60 fps |
| Q1 2027 | D1 timeline log and highlights · B1 WordPicture with 300 words, reading aid | Pro subscription live, 20 beta creators TR/DE | Share of streams with a shared highlight |
| Q2 2027 | A1 scene director, characters, camera, band/split (DE) · C1 stage and classroom preset | Event licence, WordPicture pilot in [Number] courses/classes | Watch time with and without Story Film |
| Q3 2027 | A2 TR/EN, AI delta, 3 world packs · D2 file import and auto-effects | **Pro+ live**, publisher pilot (own series), SDK prototype | Upgrade rate Pro → Pro+ |
| Q4 2027 | D3 timeline editor and MP4 export · C2 companion and AR-light · B2 repeat-after-me | School licence, listing with media centres | [Number] paying schools |
| Q1 2028 | C3 WebXR prototype · B3 Ukrainian/Arabic as community packs | WordPicture family subscription | Family subscriptions, pack purchases |
| Q2 2028 | Glasses web-app prototype · D4 batch and agency CLI | Platform pitch "Live → Clip" | Meetings with a follow-up |
| Q3 2028 | World-pack editor for publishers, marketplace for world and vocabulary packs | Broad pilot with education providers | Third-party packs, publisher titles |
| Q4 2028 | **Scene SDK v1**, AI delta standard in Pro+ | WordPicture pilot evaluation (before/after) | One SDK pilot partner |
| Q1 2029 | Story Film 2.0 (characters interact, optional WebGPU depth) | Publisher programme with 10+ titles | Publisher licence revenue |
| Q2 2029 | Decision on native apps or a glasses partnership | Partner talks XR/glasses | Hardware base, demand |
| Q3 2029 | More languages via the community, education edition as a bundle | Edtech internationalisation | Active schools and courses |
| Q4 2029 | Platform integration of Scene SDK or "Live → Clip" | Platform pilot or exit talks | Signed pilot |

---

## 11. Prototypes and vision trailer

**Prototypes** (each a single HTML file, vanilla JS, no external requests, runs offline, light/dark, respects reduced motion):

- `prototypes/sprachlernen.html` – WordPicture: "I speak" / "Show" selection, Translate, Reading aid and Repeat-after-me modes, microphone or text input, one large card with picture, word, article colour, syllables, example sentence and pronunciation, history of six tiles, printable flashcards. At least 60 concepts in 10 categories, DE/TR/EN, with Turkish suffix stripping. Test sentences: "Der Apfel ist rot" (DE→TR) → 🍎 elma; "kediler uyuyor" (TR→DE) → 🐈 die Katze.
- `prototypes/live-story.html` – Story Film: text input or microphone, "Play story", 16:9 or 9:16 band, seed field, export and import the timeline as JSON, recording as WebM, display of frame rate, script time per frame and "Cloud cost: €0.00". German test story: "Es war einmal ein kleines Dorf. Es war Nacht. Ein Mädchen ging in den Wald. Es begann zu regnen. Plötzlich stand da ein Drache. Er flog los. Der Regen hörte auf. Am Morgen schlief das Mädchen. Ende." Turkish: "Bir varmış bir yokmuş. Gece ormanda küçük bir ejderha vardı. Yağmur yağıyordu. Ejderha uçtu."

Note in both prototypes: depending on the browser, in-browser speech recognition runs via servers; the offline mode of the full version works locally.

**Vision trailer (35 s, 9:16 and 16:9, each in DE/TR/EN):** `video/LiveFX_Vision_<de|tr|en>_<16x9|9x16>.mp4`, rendered from HTML/JS like the existing trailer. English version: `video/LiveFX_Vision_en_16x9.mp4` and `video/LiveFX_Vision_en_9x16.mp4`.

| Time | Line | Content | Text (EN) |
|---|---|---|---|
| 0–3 s | Hook | Pink voice waveform | "You talk." → "It becomes a scene." |
| 3–11 s | A · Green | The story types along, the world builds up below: night, forest, girl, rain, dragon | "Live from words. No editing. No data center." |
| 11–18 s | B · Gold | "Apfel" → 🍎 der Apfel → elma → apple, pronunciation; "kedi" → 🐈 die Katze | "Every word a picture. Every language a voice." |
| 18–25 s | C · Light blue | Stage with confetti, dragon on the table (AR), glasses with "☔ yağmur · rain" | "Stage · Classroom · Audiobook · Glasses" |
| 25–32 s | D · Pink | A file flies into the window, the timeline fills up, three 9:16 clips pop out | "Video in. Edited clips out. No upload." |
| 32–35 s | CTA | Four colour tiles, logo | "LiveFX – Your voice becomes video." |

No platform logos, no real names or faces; future features carry the "Vision" badge.

---

## 12. What we are looking for

- **Platform pilot partners:** live teams at streaming and short-video platforms for "Live → Clip" or the Scene SDK.
- **Education pilot partners:** [Number] German-as-a-second-language and integration courses, [Number] primary-school classes, media centres, education providers.
- **Publisher and audiobook pilot partners:** children's book and audiobook publishers for "audiobook with pictures" and bilingual editions; the first case is the founder's own children's book series.
- **Team:** web/graphics development (Canvas, WebCodecs), children's-book-style illustration, voice talent DE/TR/EN, didactics (advisory board).
- **Financing:** €500,000 pre-seed for LiveFX and all its projects (2.0 product and lines A–D); ~20% (€100,000) takes the vision lines from prototype to product, WordPicture/language learning and the story engine (Story Film) first. Proposed use of funds over 24 months in `BUSINESSPLAN.en.md` section 11.6.
- **Grants:** EXIST, education and integration foundations (no revenue assumed in the plan).

Contact: Tuncay Sancak (Founder & Inventor, Managing Director) · Investor Relations: Gönül Demet · [Email] · [Website]
