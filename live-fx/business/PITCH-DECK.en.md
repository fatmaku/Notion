# LiveFX – Pitch Deck (19 slides, version 2.1 + Vision 2027–2029)

> Text, structure and speaker-notes template. The PowerPoint version `LiveFX_Pitch_EN.pptx` (16:9, dark theme,
> English trailer stills from `video/stills/en-…` plus screenshots from `landing-assets/`) follows exactly this
> structure; the *speaker notes* are stored in it.
> **Also available in German and Turkish: `LiveFX_Pitch.pptx` (German master version), `LiveFX_Pitch_TR.pptx`.**
> All three versions come from the same generator – all text lives only in the JSON file:
> `node tools/build-pptx.js tools/deck-content.en.json LiveFX_Pitch_EN.pptx` (DE: `deck-content.de.json` →
> `LiveFX_Pitch.pptx`, TR: `deck-content.tr.json` → `LiveFX_Pitch_TR.pptx`; run inside the `business/` folder).
> Slides 12–15 are **Vision** (“Vision” badge on the slide); the binding basis is the vision specification
> (Story Film, WortBild, Spaces, Studio). Sources from [Source 19] onward are listed in `QUELLEN.md`.
> Date: October 2026 · Confidential (footer on every slide: “Confidential · October 2026”).
> Placeholders in square brackets (`[Number]`, `[Email]`) are deliberately left blank – no invented figures.
> Market figures: sources in `QUELLEN.md` [Source n], same numbers in all three languages; estimates are marked as such.
> Financial figures (slides 17–19) come from the financial model `LiveFX_Finanzmodell.xlsx` (key figures in `tools/finance-250k.json`).
> Version October 2026: ask €250k.

---

## Slide 1 – Title

**LiveFX**
*Your voice becomes the effect.*
Memes, sounds and scenes in real time – triggered by what the creator says.
*And tomorrow: You talk. It becomes a scene.*
Tuncay Sancak · Founder & Inventor, Managing Director · Investor Relations: Gönül Demet · [Email] · October 2026 · Confidential

> **Notes:** Quick intro: I stream myself, I write books, and I built LiveFX because my live streams were missing
> exactly what every short video has. What you see today runs in my own streams. At the end I'll show where this is
> going: from a meme overlay to a visual language for everything spoken. Thirty seconds, then straight to the problem.

## Slide 2 – The problem: live is raw

- Short videos live on memes, sounds, zooms, stickers – all added **after** recording, in the edit.
- Live, you get none of it. The creator is host, director and editor **at once** – with two hands.
- Existing tools react to **viewers** (alerts for donations/follows) or to **key presses** (soundboards).
- **Nobody reacts to the spoken word.** The edit always comes too late.

> **Notes:** Auto-captions proved that real-time text from speech works – and that platforms build it in natively.
> Real-time *effects* from speech don't exist. That's exactly the gap we fill. An example from my stream: I say
> “wild” – and nothing happens, except me reaching for the keyboard.

## Slide 3 – The solution: voice → effect in under a second

LiveFX listens and reacts while you talk:
- “Wild” → 🤯 neon text + airhorn
- “Yok artık” → meme card + vine boom
- “It was raining…” → rain scene with ambience loop (story mode)

Mic → speech recognition (DE/TR/EN, automatic) → dialect-tolerant matcher → overlay in OBS → stream.
**< 1 s. Hands-free. Runs locally.** TikTok LIVE, Instagram Live, YouTube, Twitch – anywhere OBS/Streamlabs streams.

> **Notes:** Key point: keyword matching is instant (it works on interim recognition results) and needs no cloud.
> The optional AI mode catches sentences without a keyword (“that was so embarrassing for him” → Awkward). Everything
> runs on the creator's own computer – privacy is built in, not bolted on.

## Slide 4 – Demo

Screenshots (or the 30-second trailer `video/LiveFX_Trailer_en_16x9.mp4`):
1. Overlay 16:9 – neon text “WILD!” + confetti (`video/stills/en-16x9-6_9s.jpg`)
2. Overlay 9:16 – night scene with the caption “It was raining at night…” (`video/stills/en-9x16-29_6s.jpg`)
3. Control panel (`panel.jpg`) · phone remote (`mobile.jpg`) · demo page without OBS (`demo.jpg`)

> **Notes:** If possible, show it live: start the mic, say “that's wild”, the effect appears. Second take: switch on
> story mode and read a paragraph aloud – “it was raining”, “at night”, “the dragon” – and the scenes change. The
> trailer is the fallback. The line that sticks: the first video in which memes reacted to my voice convinced me more
> than any slide.

## Slide 5 – The product today (version 2.1)

- **Recognition**: browser ASR (Chrome/Edge), automatic language DE/TR/EN, dialect tolerance, learning mode,
  self-test & diagnostics; external via Whisper/Deepgram through the API; offline Whisper (experimental)
- **Effects & performance**: canvas particles with physics (60 fps), neon/glitch/sticker text, lower thirds, combos,
  4 themes; **performance mode** (auto/eco/high): average frame time −63 to −69%
- **Story mode**: 13 full-screen scenes + 12 ambience loops, story packs DE/TR/EN
- **Packs**: Türkçe 85 · Deutsch 49 · English 50 · Family & Kids 27 · Gaming 27 triggers, plus **text sticker packs** TR/DE/EN
- **Stickers & GIFs**: **143 free stickers** (Microsoft Fluent Emoji, MIT licence, 119 animated); **safe GIF search**
  via KLIPY/GIPHY with a youth-protection content filter – GIFs are linked, not stored
- **Sound**: 38 synthesized sounds (no license fees), mixer with limiter, ducking, stereo, reverb
- **Phone remote** (PWA), OBS/Streamlabs, TikTok LIVE Studio, Instagram Live Producer, demo recording without OBS
- **Viewers & open API**: Twitch chat, YouTube chat, gift webhook (TikTok via TikFinity/Streamer.bot), token-secured
  HTTP API (Stream Deck, chat bots, external ASR), 575+ automated tests

> **Notes:** This is no longer a prototype: releases from 0.1 to 2.1, unit and end-to-end tests, guides in German and
> Turkish. Version 2.1 made it lighter and safer: performance mode with 63–69% less frame time on average, 143 free
> stickers under the MIT licence, text sticker packs in three languages, and a safe GIF search via KLIPY and GIPHY with
> a youth-protection filter (Google shut down the Tenor API in June 2026). Stress two things: (1) our own sounds, free
> stickers and linked GIFs mean no copyright strikes, (2) viewer triggers are the bridge to monetization.

## Slide 6 – Why now

- **Live commerce & gifting**: gifts make up roughly half of live streamers' income; creators with 20–100K followers
  earn $500–3,000/month from gifts [Source 5, 6].
- **TikTok LIVE is growing fastest**: > 100M creators went live in 2025 in Southeast Asia, the Caucasus and
  Central Asia alone, +77% year on year [Source 2].
- **Creator economy ~$216–260B in 2026**, of which live ≈ 14% [Source 3, 4].
- **The tech is ready**: streaming ASR < 300 ms, offline models in the browser, WebGPU in all major browsers
  [Source 27], prompt caching makes AI classification possible for < $1/hour.
- **Platforms compete on creator tools** (CapCut ↔ TikTok, Edits ↔ Instagram) – live tools are the next step.

Sources: see `QUELLEN.md` (research of 30 Sep and 3 Oct 2026).

> **Notes:** Live is no longer a side channel – it's a revenue channel. And Turkey is a young, meme-loving TikTok
> market with hardly any localized tools – our biggest pack is the Turkish one, and that's no accident.
> Tech: what needed a server three years ago now runs in the browser – the foundation of the vision from slide 12 on.

## Slide 7 – Market (ranges; SAM/SOM = our own estimate)

| | Range | Basis |
|---|---|---|
| **TAM** – live streaming market | $97–157B (2026) → $250–345B (2030), CAGR ~27% | [Source 1, 2] |
| **Live share of the creator economy** | ≈ $30–36B (14% of ~$216–260B) | [Source 3, 4] |
| **SAM** – creator tools for live (software spend) *(estimate)* | $1–3B | derived from Streamlabs/StreamYard/Voicemod prices × active live creators |
| **SOM** – year 3 *(estimate)* | 5,000–15,000 paying Pro users × €9.99/month ≈ €0.6–1.8M ARR | as in business plan section 6 (0.3–0.5% of SAM creators); DACH + Turkey + EN niche, focus on TikTok/IG |

**Adjacent markets of the vision (slides 12–15, not included in the SOM):**

| Segment | Size |
|---|---|
| AI video generation and editing 2026 | $3.67B [Source 23] |
| Language-learning apps, in-app revenue 2025 | $1.54B [Source 33] |
| Video editing software 2026 | $2.68B [Source 51] |
| German audiobook market 2025 | €374M, +13% [Source 19] |

> **Notes:** Be upfront: the TAM comes from secondary sources with a wide range; SAM and SOM are our estimates, not a
> study. The point isn't the exact number – it's that even a small share of paying live creators sustains a team, and
> the real lever is platform integration, not the subscription. New at the bottom: the vision opens adjacent markets
> (AI video, language learning, video editing, audiobooks) – which we deliberately don't count in the SOM.
> The SOM matches the business plan; the base scenario assumes an average of 7,500 Pro users in year 3.

## Slide 8 – Business model

1. **Free** – core features, standard packs, OBS overlay (reach, community)
2. **Pro – €9.99/month** – AI mode, all scenes & themes, phone remote, cloud sync, priority support
3. **Creator packs / marketplace** – meme & story packs made by creators for creators, 70/30 split
4. **B2B license & platform integration** – SDK/white label for streaming software, agencies, platforms

Comparison: Streamlabs Ultra $27/month, StreamYard $35/month, Restream $16/month, Voicemod Pro $10/month
[Source 11, 12, 13]. Vision (estimate): Pro+ “Studio & Scenes” €14.99, WortBild Family €4.99/month,
school, course, event and publisher licenses – details on slides 13–15.

> **Notes:** €9.99 is deliberately below Streamlabs Ultra and on par with Voicemod – creators know this price point.
> The marketplace turns users into suppliers: whoever builds a Turkish meme pack sells it. B2B is the path to the
> platform: the same engine runs as a browser source in TikTok LIVE Studio.

## Slide 9 – Traction

- **In use in the founder's own live streams** since [month/year] – [Number] streams, [Number] hours
- **Product**: current version 2.1 (releases 0.1 → 2.1), 575+ automated tests, guides in DE/TR, demo clips
- **Content**: 5 trigger packs (238 triggers) + text sticker packs, 143 free stickers, 3 story packs, 38 sounds, 13 scenes – in 3 languages
- **Community**: [Number] followers · [Number] creators on the waitlist · [Number] downloads
- **Next 60 days**: 10 creator tests TR/DE, landing page + trailer, community launch, first Pro subscriptions

> **Notes:** Fill in the numbers before the meeting – real ones only. The story: the product matured in real streams
> (the echo problem, dialects and portrait safe zones all came from practice). Now it's about the first 10 external
> creators and measurable watch-time effects.

## Slide 10 – Competition (2×2)

Axes: **trigger** (viewer-driven ↔ voice-driven) × **operation** (manual ↔ automatic)

| | manual | automatic |
|---|---|---|
| **Viewer-driven** | Native platform effects, sticker gifting | Streamlabs / StreamElements alerts |
| **Voice-driven** | Voicemod, soundboards, Stream Deck (hotkey) | **LiveFX** (the only player) |

Plus: Turkish packs ✓, story scenes ✓, open API ✓, runs locally ✓ – no competitor has these.

> **Notes:** The bottom-right quadrant is empty – for now. The ones who could fill it are the platforms themselves,
> which is why we're talking to them. Streamlabs and co. aren't rivals but hosts: LiveFX runs as a browser source in
> every one of them.

## Slide 11 – Roadmap: lean to Gate 2, then the seed round

- **Q1 2027 (months 1–3)** – Pro subscription live; pre-seed closed; mobile/web developer on board (month 3); TR launch – Gate G0
- **Q2 2027 (months 4–6)** – mobile app/PWA; WortBild with 300 words and reading aid; 20 beta creators TR/DE – Gate G1
- **Q3–Q4 2027 (months 7–12)** – DE/EN launch, marketplaces, agency licence, platform or education pilot – Gate G2a
- **H1 2028 (months 13–18)** – WortBild pilot evaluated; seed round of about €350k after Gate 2; from month 19 the
  story engine (Story Film), Studio (auto-edit), Spaces (VR/AR) and the build-out team

*Lean until month 18: one developer, Pro subscription, mobile app/PWA, WortBild. Story engine, auto-edit and VR/AR
are financed from the follow-on round.*

> **Notes:** Ordered by money and proof: the €250k carry us for 18 months with one developer. First the Pro
> subscription and the mobile app/PWA, in parallel WortBild as the first vision line, then DE/EN and one platform or
> education pilot. Each step has a gate (slide 18). At month 18 we raise the seed round of about €350k – only then do
> the story engine, auto-edit and VR/AR start. The scenes are drawn procedurally, not generated by a video AI – that's
> the bridge to slides 12–15.

## Slide 12 – The vision: live video from words *(“Vision” badge)*

**“You talk. It becomes a scene.”**

Diagram (built from shapes): **Voice → Understand → Scene → Video**
- 🎙 *Voice* – mic, reading aloud or a finished video file
- 🧠 *Understand* – lexicon DE/TR/EN, dialect-tolerant, AI optional
- 🎬 *Scene* – world state ≤ 1 KB, one shared timeline
- 📺 *Video* – drawn in the browser, 60 fps, on your own device

Four lines (line colors): 🌳 **Story Film** (green) · 🍎 **WortBild** (gold) · 🥽 **Spaces** (light blue) · ✂ **Studio** (pink)

- **Today:** voice becomes a meme, sound or scene in under a second – in use in the founder's own streams.
- **Tomorrow:** voice becomes a film, a word picture with pronunciation or a finished clip – on stream, in school,
  on stage, in your glasses.
- *Draw, don't generate – on the compute budget of a caption, not a data center.*

> **Notes:** Live captions showed that platforms want to process speech in real time – for free, on billions of
> devices. We're the next step: pictures instead of text. One engine, one timeline, four lines. A sentence becomes a
> state delta of a few hundred bytes, drawn in a single canvas – no video diffusion model, no GPU server. To be
> honest: this is the vision for 2027–2029, hence the badge. It builds on code that already runs today (story mode,
> effect engine, offline recognition). WebGPU is now available in all major browsers [Source 27] – we only use it
> optionally.

## Slide 13 – Generative Scene Engine: live video from words (HTML/JS, lightweight) *(Vision · Line A “Story Film”)*

Diagram: a scene built from shapes – transcript bar “It was night … a girl walked into the forest … it started to rain
… suddenly, a dragon!”, below it a night sky, moon, stars, trees, rain, 👧 and 🐉, badge “Ambience: rain”, the world
state as JSON. Next to it, cost bars (log scale).

- Every sentence changes the world state: **place · time · weather · character · object · action · mood**.
- The streamer reads aloud or tells a story – below, an animated film builds sentence by sentence.
- Runs at 60 fps in the browser next to OBS, offline and deterministic: same timeline, same picture – every story
  instantly becomes a clip.
- Cost per hour: video AI $180–2,700 [Source 24, 25] · LiveFX with text AI $0.25–0.75 · without AI €0
  → 240 to over 10,000 times cheaper, and the only way to do it live.
- For read-aloud, audiobook and podcast formats: German audiobooks €374M, +13% [Source 19]; YouTube > 1B
  podcast viewers a month [Source 21].
- *Picture book on purpose, not photorealism:* a stylized world of emoji/SVG and particles; optional AI only picks
  the scene, it never generates images.

> **Notes:** The streamer does nothing but talk. “It was night” – the sky goes dark. “A girl walked into the forest”
> – trees grow, the character walks in. “It started to rain” – rain, the ambience loop switches. “Suddenly, a dragon”
> – lightning, a camera jolt, the dragon. Technically: 200–500 bytes per sentence, scene changes 1 to 3 times a
> minute, one canvas with at most 1,200 particles – a budget our effect engine already handles next to OBS today.
> At list price, video AI costs $0.05 (Veo 3.1 Lite, 720p) to $0.75 per second [Source 24, 25]. Market: 23.8M people
> in Germany listen to podcasts weekly [Source 20]; AI video grows from $3.67B to $24.89B by 2036 [Source 23].
> Financed from the follow-on round after Gate 2: German MVP from month 19 (H2 2028), TR/EN and world packs after that.
> First publisher case: the founder's own children's book series.

## Slide 14 – Language learning & education: every word a picture *(Vision · Line B “WortBild”)*

Diagram: language-learning card **“🍎 elma · apple · Apfel 🔊”** – large 🍎, “elma”, syllables “el · ma”,
“apple · der Apfel” (article color-coded), speaker icon “elma – tr-TR”, pills DE · TR · EN; modes
**Translate · Reading aid · Repeat after me**.

- A child says “apple” – instantly: 🍎, “elma” in the target language, “der Apfel” with a color-coded article, and
  the pronunciation. No click.
- Reading aid in your own language: for pre-readers, German as a second language, integration courses and
  neurodivergent learners.
- Local, no account, offline – school-grade privacy as a selling point; pronunciation via the system voices [Source 29].
- **12.7M** paying Duolingo subscribers [Source 32] · **307,000** new integration-course participants in Germany
  in 2025 [Source 36] · **€5B** DigitalPakt 2.0 [Source 40].
- Revenue (estimate): WortBild Family €4.99/month · school license €300–800/year · course license €49 per teacher
  per year · publisher edition.

> **Notes:** The most personal part: I write children's books about neurodiversity, and I'm German-Turkish. The
> teacher sets “I speak”, “Show” and the mode, and reads aloud. Repeat-after-me is deliberately not pronunciation
> scoring, just a green check mark. Tech: word → picture is a table lookup, the operating system provides the
> pronunciation, a school tablet is enough, server cost per child: zero. Market: language-learning apps make $1.54B
> in-app [Source 33]; 20.4% of pupils under 16 in Germany mainly speak another language at home [Source 37]; 2.65M
> people in Germany have a migration background from Turkey [Source 38]; 25% of fourth-graders fall below the minimum
> reading standard [Source 39]. Price anchor: ANTON €250–700 per school [Source 41]. Honestly: integration is small in
> euro terms, but it brings credibility and funding; the volume lies with families, publishers and platforms. We say
> “supports vocabulary learning”, not “twice as fast”.

## Slide 15 – Auto-edit, editor, VR/AR – and a bigger market *(Vision · Lines D “Studio” + C “Spaces”)*

**LiveFX Studio: live editing and auto-edit**
- **Live → highlights:** after the stream, 3–5 clips in 9:16, where memes, gifts and chat were densest – no upload.
- **File in → finished out:** drop a video → local transcript → effects, scenes, cuts as chips → MP4 via the
  hardware encoder [Source 57, 59]. Diagram: timeline with chips (meme pink, scene green, zoom gold, cut gray).

**LiveFX Spaces: one state, many screens** – 🎤 stage & events (works today) · 🏫 classroom (works today) ·
🎧 audiobook with pictures (follow-on round) · 📱 AR on the phone (follow-on round) · 🥽 WebXR/VR (Vision 2029) · 👓 display glasses (Vision 2029)

*Expanded market:*

| Segment | Size |
|---|---|
| Video editing software 2026 | $2.68B [Source 51] |
| AI video (generation + editing) 2026 | $3.67B [Source 23] |
| Language-learning apps (in-app) 2025 | $1.54B [Source 33] |
| German audiobooks 2025 | €374M [Source 19] |
| Smart glasses 2026 | 13.6M units / $5.1B [Source 45] |
| Live streaming (core) 2026 | $97–157B [Source 1, 2] |

Price anchors: OpusClip $15–29, Descript $16–65 per month [Source 54, 55]. LiveFX Pro+ €14.99 (estimate) – no cloud
costs, no minute caps. XR and glasses: a showcase, not a revenue line.

> **Notes:** Two doors into the same tool. Live → highlights: the server already knows every trigger, every gift and
> every chat message with a timestamp. Auto-edit: drag a 20-minute MP4 into the window, Whisper transcribes it
> locally in the browser [Source 60], and export runs through WebCodecs and the hardware encoder [Source 57, 58, 59].
> The file never leaves the computer. Spaces: stage and classroom work today; audiobook with pictures and AR on the
> phone come with the follow-on round; WebXR [Source 47, 48] and display glasses like Meta Ray-Ban Display [Source 46] are vision.
> Competition, honestly: CapCut has 736M MAU [Source 52] – we're not competing as a universal editor but through
> voice → effect, scenes, TR/DE and local processing. Buyer signal: in 2026 Canva acquired Cavalry and MangoAI [Source 56].

## Slide 16 – Team

- **Tuncay Sancak** – Founder & Inventor, Managing Director · German-Turkish author & live streamer · product, content, community, his own streams as the
  test lab · packs in TR/DE/EN, first-hand · children's book series on neurodiversity (the bridge to WortBild and
  Story Film)
- **[Open position]** – mobile/web developer: first hire from the pre-seed (month 3) – iOS/Android, PWA, later SDK
- **[Open position]** – creator partnerships / growth (TR + DACH), education sales – with the seed round
- **Gönül Demet** – Investor Relations · contact for investors and the pre-seed round
- Advisory board / partners (wanted): creator management TR · former platform “Live” product lead · EdTech/didactics

> **Notes:** The founder is user, content supplier and product owner in one person – that's why the product works
> with dialects, in portrait and in Turkish. As a children's book author, he brings the first publishing and
> education case himself. Gönül Demet leads investor relations. The pre-seed round (€250,000) funds one hire – a mobile/web developer from month 3; further hires follow with the seed round after Gate 2. An EdTech advisory board reviews WortBild.

## Slide 17 – Financials & valuation *(new)*

**“€250k for 18 months – then the seed round”** (estimates; source `LiveFX_Finanzmodell.xlsx`)

5-year P&L, base scenario (€k):

| €k | 2027 | 2028 | 2029 | 2030 | 2031 |
|---|---|---|---|---|---|
| Revenue | 51 | 336 | 1,038 | 1,984 | 3,152 |
| Costs | 166 | 295 | 710 | 1,065 | 1,491 |
| **EBITDA** | **−116** | **+41** | **+328** | **+919** | **+1,661** |
| Cash, year end | 134 | 175 | 503 | 1,422 | 3,083 |

Revenue 2031: conservative €602k · optimistic €7.44M; years 4–5 extrapolated; no revenue yet.

- **18 months runway with no revenue at all** (average burn €13,444 per month)
- **Cash at month 18:** €49k (conservative) · €146k (base) · €369k (optimistic)
- **Seed round ~€350k** after Gate 2 (months 15–18)

**Valuation – founder offer: €2.25M pre-money** (€250k for 10.0%, post-money €2.5M) – below all four reference
methods: Berkus €2.35M · Scorecard €2.95M · VC method €2.43M · Risk Factor Summation €3.0M (weighted €2.71M).
Alternative: SAFE/convertible loan with a €2.25M cap, 20% discount, no interest – max. 10%.
*Negotiation basis – review with tax/legal advisor.*

> **Notes:** Base scenario: revenue grows from €51k in 2027 to €3.15M in 2031; EBITDA turns positive in 2028 and is
> sustained from month 22. With no revenue at all, the €250k last 18 months; at month 18 we expect €49k–369k in cash,
> then a seed round of about €350k after Gate 2. Valuation: our offer of €2.25M pre-money for 10% is a fair,
> investor-friendly entry price below every reference method. Why: a working product (v2.1) with 575+ automated tests,
> own IP and content, three languages incl. the Turkish niche, vision options A–D on one engine, and capital efficiency –
> built to v2.1 without outside money. Honestly against it: solo founder, no revenue and no signed partners yet.

## Slide 18 – Gates: what the €250k must prove *(new)*

All values are targets (not yet achieved): target = base scenario, threshold = conservative scenario.

| Gate | KPIs (target, threshold in brackets) | Releases |
|---|---|---|
| **G0 · month 3** – start | Pro subscription live (payment); mobile/web developer on board | Go-to-market budget phase 2 |
| **G1 · month 6** – activation | 10,000 registered users (4,000); 400 paying Pro (120); 20 beta creators TR/DE, 10–20 ambassadors; WortBild with 300 words; week-4 retention ≥ 30% | Mobile app/PWA release |
| **G2a · month 12** – traction | 20,000 users (8,000); 800 paying Pro (240); MRR €8,073 (€2,500); 1 platform or education pilot; WortBild in ≥ 3 courses/classes | DE/EN expansion, platform talks |
| **G2 · month 18** – follow-on round | 50,000 users (19,000); 2,000 paying Pro (570); MRR €22,586 (€6,495); Pro month-3 retention ≥ 75%; conversion ≥ 3% / 4%; ≥ 5 paying schools or courses | Seed round, build-out team from month 19, story engine/Studio |

> **Notes:** Four gates over 18 months – each one releases the next budget. Gate 2 at month 18 is the basis for the
> seed round. All of these are targets – nothing here is achieved yet.

## Slide 19 – Ask

**“Let's make live streams listen.”**

- **Platform pilot**: LiveFX as a feature in *TikTok LIVE Studio*, *Instagram Live Producer* or *YouTube Live* –
  the browser source works today; 8 weeks, 20 creators, measured watch time, gifts and clips
- **Education & language pilot**: education providers, integration courses, schools, language-learning
  platforms and publishers – test WortBild and Story Film in [Number] courses/classes or with [Number] titles
- **Partners**: streaming software (OBS plug-in, Streamlabs), creator agencies TR/DACH, audio/ASR vendors,
  editor vendors (Studio SDK)
- **Pre-seed: €250,000 for 10%** (pre-money €2.25M, post-money €2.5M) or a SAFE with a €2.25M cap; 18 months, lean:
  Pro subscription, mobile app/PWA, TR → DE/EN launch, WortBild; in parallel, open to acquisition talks

**Use of funds over 18 months – Proposal – review with tax/legal advisor** (bar on the slide; details in business plan 11.6):

| Area | Share | Amount |
|---|---|---|
| Team/product: mobile/web developer, partial founder salary, test devices | 50% | €125,000 |
| Go-to-market: creator programme, community, platform and education pilots | 20% | €50,000 |
| First vision line WortBild (language learning) | 15% | €37,500 |
| Legal, trademark, data protection | 10% | €25,000 |
| Reserve | 5% | €12,500 |
| **Total** | **100%** | **€250,000** |

Contact: Tuncay Sancak, Founder & Managing Director · Investor Relations: Gönül Demet · [Email] · Demo: [Link] · Code & docs: live-fx/
*This deck is also available in German and Turkish: `LiveFX_Pitch.pptx` · `LiveFX_Pitch_TR.pptx`*

> **Notes:** End concretely: what we need is a contact on the live team and an 8-week pilot with 20 creators. We
> deliver the overlay, packs, support and the measurement (watch time, gifts, clips from lives). New: for WortBild and
> Story Film we're looking for a second pilot with education providers, language-learning platforms or publishers –
> the first publisher case is the founder's own children's book series. On the round: €250,000 for 10% at €2.25M
> pre-money – with no revenue at all it lasts 18 months; the story engine, auto-edit and VR/AR follow with a seed round
> of about €350k after Gate 2 (business plan 11.6). Investor contact: Gönül Demet.
