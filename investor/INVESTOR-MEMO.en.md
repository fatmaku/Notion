# LiveFX – Investment Memo (Pre-Seed)

**Live streams that listen. And tomorrow: You talk. It becomes a scene.**
A **€500,000** pre-seed round for LiveFX and every LiveFX line.

Confidential · Pre-Seed · October 2026
Founder & Inventor, Managing Director: **Tuncay Sancak** · Investor Relations: **Gönül Demet**

> German: `INVESTOR-MEMO.de.md` · Turkish: `INVESTOR-MEMO.tr.md`
>
> **Basis:** every figure comes from the LiveFX documents in `../live-fx/business/` – `BUSINESSPLAN.en.md` (BP), `PITCH-DECK.en.md`, `MARKTANALYSE.en.md`, `VISION.en.md`, `QUELLEN.en.md`. Market figures carry the number used there, **[Source n]**; our own assumptions are marked **estimate**. There is **no revenue yet**. User, revenue and retention values that can only be measured later are left as **[number]**. The split of the €500,000 and all gate values are a **proposal – please confirm**.

---

## 1. At a glance

| | |
|---|---|
| **Thesis** | Live streaming is the fastest-growing revenue channel of the creator economy – but live is raw. LiveFX turns the creator's voice into memes, sounds and animated scenes in under a second. The same engine becomes a visual language for everything spoken: story film, language learning, new spaces, auto-editing. |
| **Product** | Version 2.0 works: German, Turkish and English with automatic detection, 238 triggers in five packs, 13 scenes, 12 ambience loops, 38 sounds, story mode, viewer triggers, phone remote, offline-capable (BP §3). |
| **Vision** | Four lines: A Story Film (Generative Scene Engine), B WordPicture (language learning), C Spaces (stage, classroom, AR/VR, glasses), D Studio (live editing, auto-edit). Two clickable prototypes (A and B) exist (`VISION.en.md`). |
| **Market** | Global live streaming 2026: USD 97–157bn [Source 1, 2]; creator economy ~USD 216–260bn [Source 3, 4]; gifts ≈ 50% of streamer income [Source 5, 6]. Adjacent: language-learning apps USD 1.54bn [Source 33], AI video USD 3.67bn [Source 23], video editing USD 2.68bn [Source 51]. |
| **Model** | Free + Pro at €9.99/month, creator packs €2.99–4.99, agency and B2B licences; with the vision, Pro+ at €14.99, WordPicture Family at €4.99/month, school, course, event and publisher licences (BP §9, §15.6, estimate). |
| **Ask** | **€500,000** pre-seed for 24 months: team, vision lines from prototype to product, go-to-market and pilots, legal and platform approvals, reserve. Terms **[open]**. |
| **Status** | Product built, no revenue yet; launch in the Turkish-speaking community from Q4 2026 (BP §14.1). |

---

## 2. Investment thesis

1. **The gap is empty.** Alerts react to viewers, soundboards to keys, native effects to manual selection. No widely used tool reacts to what the creator *says* (BP §2, §7). On a 2×2 of trigger (viewer ↔ voice) and operation (manual ↔ automatic), LiveFX stands alone in "voice-driven, automatic" (`PITCH-DECK.en.md`, slide 10).
2. **The money is made inside the stream.** Gifts make up about half of live streamers' income [Source 5, 6]; creators with 20–100k followers earn USD 500–3,000 a month from gifts [Source 5]. Every minute of watch time counts – LiveFX makes streams more entertaining and makes gifts visible and audible.
3. **Built before funding.** Version 2.0 runs, with 240+ automated tests (`PITCH-DECK.en.md`, slide 9), a documented architecture and use in real streams. The capital goes into execution, not into a prototype.
4. **Draw, don't generate.** Generative video AI costs USD 0.05–0.75 per second at list price [Source 24, 25] – USD 180–2,700 per hour – and cannot run live. LiveFX turns a sentence into a 200–500-byte state delta and draws the scene in the browser: €0 without AI, USD 0.25–0.75 per hour with optional text AI (project measurement) – 240 to more than 10,000 times cheaper (BP §15.1, `VISION.en.md` §2).
5. **One engine, several markets.** The same pipeline (speech recognition → understanding → timeline → screen) serves the stream, the classroom, the stage, the audiobook and the editing suite. The vision widens the market without a second technology stack.
6. **Multilingual from day one.** The largest pack is Turkish (85 triggers), not English. Starting in the Turkish-speaking community (Türkiye and the diaspora) meets a strong meme culture and almost no localised tools (`MARKTANALYSE.en.md` §4).

---

## 3. The problem

Everything that makes short videos on TikTok, Reels and Shorts go viral – memes, sound effects, stickers, zoom punches – is added **after** recording, in the edit. Live streams are raw: the creator is host, director and editor at once, and the edit never comes (BP §2).

At the same time, revenue is moving *into* the stream: gifts, live commerce and community subscriptions happen during the broadcast. A monotonous stream loses viewers – and with them, gifts.

| Today's tool | Trigger | What is missing |
|---|---|---|
| Alerts (Streamlabs, StreamElements, Sound Alerts) | viewer events (follow, donation, bits) | the creator triggers nothing |
| Soundboards (Voicemod, Stream Deck) | hotkeys | needs hands – while talking, reading aloud, holding the camera |
| Native effects (TikTok, Instagram) | manual selection | do not react to content |
| Editors (CapCut etc.) | after recording | not live |

Multilingual creators face a further gap: there are practically no creator tools that understand Turkish meme culture ("yok artık", "helal olsun", "ohaa") (BP §2).

---

## 4. The product: LiveFX 2.0

**In one sentence:** the creator talks – LiveFX listens. When he says "krass", "oh no", "applause", "yok artık" or "bruh", the right meme appears in the stream in under a second and the right sound plays. When he reads aloud – "it was raining", "at night", "the dragon" – the overlay turns into an animated scene with ambient sound (BP §3.1).

| Area | Status 2.0 (BP §3.2) |
|---|---|
| Speech recognition | DE, TR, EN with **automatic language selection**; browser engine, external engines (Whisper, Deepgram) or offline Whisper in the browser |
| Dialect and learning | three-level fuzzy matching ("grass" → krass), learning from the stream with one click |
| Content | **238 triggers** in five packs: Turkish 85, German 49, English 50, Family & Kids 27, Gaming 27 |
| Story mode | **13** animated scenes, **12** ambience loops, story packs DE/TR/EN, scene pad |
| Effects and sound | effects engine v2 (particles, glow, 3D cards, impact zoom), themes; **38** licence-free synthetic sounds; mixer with ducking and reverb |
| Viewer triggers | Twitch chat, YouTube live chat, chat commands; gift webhook (TikTok coins via TikFinity/Streamer.bot, Super Chat, Bits) |
| Phone and offline | PWA remote, phone as a second mic; panel, overlay and demo work offline |
| Integration | OBS/Streamlabs browser source → TikTok LIVE, Instagram Live, YouTube Live, Twitch; open, token-protected HTTP API |
| AI (optional) | understanding without keywords ("that was so embarrassing" → Awkward), 1.5 s timeout; ≈ USD 0.004 per classification, USD 0.25–0.75 per stream hour (project measurement, BP §9) |

**Technology and protection.** Plain HTML/JS/CSS and a Node.js server with zero external dependencies; local instead of cloud, so marginal cost is close to zero and GDPR-friendly (BP §4). Protectable building blocks: multilingual matcher, curated trigger and story packs, synthetic sound library, scene engine and mixer, learning loop. Registering the "LiveFX" trademark (DE/EU/TR) is to be checked; a patent assessment costs €5–10k according to the BP (estimate).

**Traction.** In use in the company's own live streams since [month/year], [number] streams, [number] hours; [number] creators on the waiting list; [number] downloads (`PITCH-DECK.en.md`, slide 9 – enter real figures only).

---

## 5. The vision: four lines, one engine

Core idea: LiveFX grows from a meme overlay into a **visual language for everything spoken**. All lines share one JSON format (the LiveFX timeline, LTF v1) and the existing modules; performance budget one canvas, ≤ 1,200 particles, target 60 fps on integrated graphics (BP §15.1).

| Line | What it creates | Status | Market (extract) | Revenue (estimate) |
|---|---|---|---|---|
| **A · Story Film** (Generative Scene Engine) | While someone tells or reads a story, a continuous animated film emerges from place, time, weather, characters, action and mood – live video from words | **Prototype** `prototypes/live-story.html` | German audiobook market €374m [Source 19]; 23.8m weekly podcast listeners in Germany [Source 20]; AI video USD 3.67bn [Source 23] | Pro, Pro+ €14.99, world packs, publisher licence, Scene SDK |
| **B · WordPicture** (language learning, reading aid) | Spoken word → picture + word in the target language + pronunciation; reading aid, repeat-after-me, quiz | **Prototype** `prototypes/sprachlernen.html` (85 words, DE/TR/EN) | Language-learning apps USD 1.54bn [Source 33]; 307,000 new integration-course participants in Germany in 2025 [Source 36]; DigitalPakt 2.0: €5bn [Source 40] | Family €4.99/month, school €300–800/year, course €49 per teacher, vocabulary packs |
| **C · Spaces** (stage, classroom, audiobook, AR/VR, glasses) | The same timeline on LED walls, projectors, phone AR, VR headsets, display glasses | Stage usable today, the rest is vision | Smart glasses 13.6m units, USD 5.1bn in 2026 [Source 45]; tonies €630m [Source 50] | Events €19–49/day or €299/year; XR budgeted at €0 |
| **D · Studio** (live editing, auto-edit) | Highlights from the stream; finished video in → effects, memes, scenes, cuts automatically → local export | Vision | Video editing USD 2.68bn in 2026 [Source 51]; CapCut 736m MAU [Source 52] | Pro+ "Studio & Scenes", agency, white label |

**Prototypes.** Each is a single HTML file, offline, no account, trilingual. The Story Film prototype knows 22 characters, 16 objects, 10 places, time, weather and mood, runs at 60 fps with under 1 ms of script time per frame (test measurement) and shows "cloud cost: €0.00". WordPicture strips Turkish suffixes (`kitabı` → `kitap`), shows coloured articles and syllables and speaks through the system voice (`prototypes/README.md`). Vision trailers exist in DE/TR/EN (`video/LiveFX_Vision_*.mp4`).

**Order by closeness to revenue** (BP §14.2): highlights (D) and WordPicture (B) first, the Story Film (A) as the core, Spaces (C) via the stage, XR later and only as a showcase. This round takes **WordPicture and the story engine (Story Film)** from prototype to product.

---

## 6. Market

### 6.1 Core market: live streaming

| Metric | Range | Source |
|---|---|---|
| Global live-streaming market 2026 | USD 97–157bn; USD 250–345bn by 2030 (CAGR ~27%) | [Source 1, 2] |
| Creator economy 2026 | ~USD 216–260bn (CAGR ~22%) | [Source 3, 4] |
| Live share of the creator economy | ~14% ≈ USD 36bn | [Source 3] |
| TikTok LIVE creators 2025 | > 100m went live in South-East Asia, the Caucasus and Central Asia alone, +77% | [Source 2] |
| Gifts as share of streamer income | ~50% | [Source 5, 6] |
| Türkiye: price per TikTok coin | TRY 0.37–0.43; the platform keeps ~50% | [Source 8, 9, 10] |

**Bottom-up (BP §6, estimate):**

| Level | Assumption | Size |
|---|---|---|
| **TAM** | active, monetising live creators worldwide (TikTok, Instagram, YouTube, Twitch) | 10–20m creators |
| **SAM** | creators in the TR/DE/EN language area streaming with desktop software or a phone remote | 1–3m creators |
| **SOM (year 3)** | 0.3–0.5% of SAM as paying users | 5,000–15,000 paying users |

The pitch deck adds a spend-based view: SAM for live creator tools USD 1–3bn, SOM 20–40k Pro subscriptions (estimate, `PITCH-DECK.en.md` slide 7). The financial plan uses the more cautious BP calculation.

### 6.2 Adjacent markets of the vision (not in the SOM)

| Market | Size | Source | Line |
|---|---|---|---|
| AI video generation and editing | USD 3.67bn 2026 → USD 24.89bn 2036 | [Source 23] | A, D |
| Video-editing software | USD 2.52bn 2025 → USD 2.68bn 2026 | [Source 51] | D |
| Language-learning apps (in-app) | USD 1.54bn 2025, +18.8% | [Source 33] | B |
| Language learning overall | ≈ USD 84bn 2025 | [Source 34] | B |
| Duolingo (reference) | 58.7m daily users, 12.7m paying (Q2 2026) | [Source 32] | B |
| Pupils with another home language (Germany) | 20.4% of under-16s | [Source 37] | B |
| DigitalPakt 2.0 | €5bn over five years, from 1 Sep 2026 | [Source 40] | B, C |
| Audiobooks, Germany | €374m 2025, +13% | [Source 19] | A, C |
| Smart glasses worldwide | 13.6m units, USD 5.1bn 2026 | [Source 45] | C |

**Why now:** streaming ASR under 300 ms, offline models in the browser, WebGPU in all major browsers [Source 27], on-device speech recognition in Chrome 139+ [Source 28]; platforms compete on creator tools (`PITCH-DECK.en.md`, slide 6). In February 2026 Canva bought Cavalry and MangoAI [Source 56] – editor vendors are buying exactly these building blocks.

---

## 7. Business model

| Tier | Contents | Price (BP §9, §15.6) |
|---|---|---|
| Free | core function, standard packs, demo recording, phone remote | €0 |
| **Pro** | AI understanding, all scenes and themes, unlimited viewer triggers, optional cloud sync | **€9.99/month** or €79/year |
| Pro+ "Studio & Scenes" (vision) | AI scenes, auto-edit from file, MP4 export, audiobook visualiser | €14.99/month |
| WordPicture Family (vision) | language learning and reading aid without streaming features | €4.99/month |
| Creator, world and vocabulary packs | curated packs, later a marketplace with a 70/30 split | €2.99–4.99 |
| Agency licence | multi-seat, central pack management | [€49–149/month] (estimate) |
| Education, stage and publisher licences | school €300–800/year · course €49 per teacher/year · events €19–49/day or €299/year · publisher [€2,000] per title and year | estimate |
| B2B platform licence / SDK | licence or white label of the recognition, scene and pack technology | individual |

**Unit economics.** Marginal cost close to zero because the software runs locally; AI only costs money with Pro usage (see §4). Price anchors: Streamlabs Ultra USD 27/month [Source 11, 12], StreamYard ~USD 35, Restream ~USD 16 [Source 12], Voicemod ~USD 10/month [Source 13]; the ANTON school licence costs €250–700 per school and year [Source 41].

**Strategic option.** Acquisition of technology, content and team by a platform or tool vendor (ByteDance/TikTok, Meta, Google/YouTube, Logitech/Streamlabs, StreamElements – BP §9). This is an option, not part of the plan.

---

## 8. Competition

| | Alerts (Streamlabs/StreamElements) | Voicemod / Stream Deck | Native effects | CapCut / editors | **LiveFX** |
|---|---|---|---|---|---|
| Trigger | viewer events | hotkeys | manual | after recording | **voice** + viewers + phone + API |
| Voice-driven | no | no | no | no | **yes, 3 languages auto** |
| Turkish | no | no | partly | yes (editing) | yes, 85 triggers |
| Story/scene mode | no | no | no | no | yes, 13 scenes |
| Local / offline | cloud | local | app | app/cloud | **local, offline-capable** |
| Open API | limited | no | no | no | yes |

Source: BP §7. **Positioning:** LiveFX replaces neither OBS nor Streamlabs; it sits on top as a browser source – streaming software is a host, not an opponent. The biggest competitive risk is a platform rebuilding the feature; that is why an early pilot with platforms is part of the strategy. In language learning and video editing LiveFX does not compete as a universal app but through voice → picture, TR/DE/EN and local processing; free alternatives are Microsoft Reading Coach [Source 42] and Google Read Along [Source 43].

---

## 9. Go-to-market

| Phase | Period | Measures (BP §10) |
|---|---|---|
| 1 · Turkish community | months 1–4 | own streams as a showcase, 10–20 creator ambassadors, Discord/Telegram, weekly pack drops; clips from real streams are the marketing |
| 2 · DE/EN | months 4–9 | German- and English-speaking creators; read-aloud and education streams; OBS, Streamlabs and Stream Deck directories |
| 3 · Partners and platforms | months 6–12 | creator partner programme with revenue share, agencies, pitch to the live teams at TikTok, Meta, YouTube |
| 4 · Education and publishers (vision) | from 2027 | WordPicture pilot in [number] courses/classes, family subscription, school licences via media centres and DigitalPakt budgets, publisher pilot |

**Pilot offer to platforms** (`PITCH-DECK.en.md`, slide 17): 8 weeks, 20 creators, measured watch time, gifts and clips. **Education & languages pilot:** WordPicture and Story Film in [number] courses/classes or with [number] titles.

---

## 10. The offer: €500,000 pre-seed

### 10.1 Use of funds over 24 months – Proposal – please confirm

| # | Area | Share | Amount | What for | Derived from the business plan |
|---|---|---|---|---|---|
| 1 | **Product & engineering team** | 50% | **€250,000** | mobile/web developer, 24 months (€150,000); backend/ML developer from month 13 (€60,000); part of the founder's salary (€40,000) | Staff Y1 + Y2 per BP §11.3: mobile/web €75k + €160k, backend/ML/community €0 + €60k, founder €30k + €48k = €373k; the rest from revenue |
| 2 | **Vision lines from prototype to product** | 20% | **€100,000** | WordPicture (B): 300 words, reading aid, voice recordings DE/TR/EN, didactic review, course pilot (€40,000); story engine/Story Film (A): canvas development, illustration, world packs, TR/EN (€40,000); highlights (D) and stage/classroom preset (C) (€20,000) | Vision extra costs BP §11.5: €30k + €115k; freelance design/sound BP §11.3: €15k + €25k |
| 3 | **Go-to-market, creator programme, pilots** | 15% | **€75,000** | 10–20 TR/DE ambassadors, community and pack drops, platform pilot (8 weeks, 20 creators), education and publisher pilots, marketplace listings | Marketing BP §11.3: €25k + €60k |
| 4 | **Legal, trademark, data protection, platform certification** | 10% | **€50,000** | "LiveFX" trademark DE/EU/TR, patent assessment, GDPR impact assessment for the school and family profile, child protection, app-store and platform approvals, tax and administration | Legal/admin BP §11.3: €12k + €20k; patent assessment €5–10k (BP §4) |
| 5 | **Reserve** | 5% | **€25,000** | buffer for delays in platform approvals or hiring | – |
| | **Total** | **100%** | **€500,000** | | |

Infrastructure, AI API and store fees (BP §11.3: €8k + €25k) grow with usage and are paid from Pro revenue.

### 10.2 Why €500,000 instead of €250–350k

The business plan names a €250–350k seed for 18–24 months for the core product only and deliberately leaves the vision out (BP §11.4, §11.5). The €500,000 covers **every LiveFX line** and makes the plan more robust:

| Calculation (from BP §11.2–11.5) | €250–350k | €500,000 |
|---|---|---|
| Runway at **zero revenue** on the base cost plan (Y1 €165k, Y2 €398k ≈ €33k/month) | ≈ 15–18 months | ≈ 22 months |
| Cumulative loss, **conservative** case, after 3 years: −€316k | not covered with €250k, just covered with €350k (€34k left) | covered, ≈ €184k left |
| Cumulative loss, **base** case, after 2 years: −€176k (with vision ≈ −€102k) | covered | covered, remainder for vision lines and pilots |
| Vision lines A and B on the 2027 schedule | not funded | €100,000 earmarked |

**Reading:** the core spending of the 24 months is covered by capital, not by hoped-for revenue. If base-case revenue materialises, runway extends beyond month 24; if only the conservative case materialises, the company stays funded into year 3.

### 10.3 Terms

Instrument (equity or convertible loan), valuation or cap, stake, closing date, possible tranches tied to the gates (§11), information and consent rights, founder commitment: **[open]**. Planning assumption for the timeline: closing in early 2027; if closing moves, the gates move with it.

---

## 11. Milestones and KPI gates (half-yearly)

Scale only after the evidence clears the gate. Values are **targets** from the business plan's base case (estimate) or **[number]** where the value can only be set after the first cohorts. **Proposal – please confirm.**

| Gate | Period | Theme | KPI targets (targets, not achieved) | Unlocks |
|---|---|---|---|---|
| **01** | H1 2027 | **Activation** | Pro subscription live (Q1 2027) · mobile developer on board · 20 TR/DE beta creators and 10–20 ambassadors active · WordPicture with 300 words · week-4 retention of active streamers ≥ [number]% | mobile app release, Story Film budget |
| **02** | H2 2027 | **Traction** | 20,000 registered users and ≈ 800 paying Pro users at year end (BP §11.1: 4% conversion) · 1 platform pilot started (BP §14.1, Q3 2027) · Pro+ live · 5 paying schools (BP §11.5) | backend/ML hire |
| **03** | H1 2028 | **Retention** | free → Pro conversion stable at ≥ 4% · month-3 Pro retention ≥ [number]% · Pro → Pro+ upgrades on track to 20% (BP §11.5) · WordPicture pilot in [number] courses evaluated · [number] active streamers per week | expansion of education sales and packs |
| **04** | H2 2028 | **Scale** | 80,000 registered users and ≈ 3,200 Pro at year end (BP §11.1) · B2B pilot/licence €50k (BP §11.1) · 40 schools, 200 course licences (BP §11.5) · one SDK pilot partner (BP §14.2) | follow-on round or platform talks; break-even path in year 3 |

Tracked continuously: registered users, active streamers per week, free → Pro conversion, retention by cohort, pack revenue, partner creators, pilots with platforms and education providers (BP §14.1).

---

## 12. Financial scenario

All values in €k, **estimates** from BP §11; there is no revenue yet. Y1–Y3 = 2027–2029.

| Base case | Y1 | Y2 | Y3 |
|---|---|---|---|
| Core product revenue (Pro, packs, agency, B2B) | 51 | 336 | 1,039 |
| Costs | 165 | 398 | 710 |
| **Core product result** | **−114** | **−62** | **+329** |
| Vision extra revenue (BP §11.5) | ≈ 27 | ≈ 192 | ≈ 617 |
| Vision extra costs | 30 | 115 | 210 |
| **Result incl. vision** | **≈ −117** | **≈ +15** | **≈ +736** |

| Scenario | Result Y1 / Y2 / Y3 | Cumulative 3 years |
|---|---|---|
| Conservative | −105 / −149 / −62 | −316 |
| **Base** | **−114 / −62 / +329** | **+153** |
| Optimistic | −66 / +373 / +1,501 | +1,808 |

Key assumptions (base): 20,000 / 80,000 / 250,000 registered users at year end, 4% conversion, Pro ARPU €8.50 net, B2B €0 / 50k / 150k (BP §11.1). With the vision, base-case break-even moves from year 3 to year 2 (BP §11.5). XR and glasses are budgeted at €0. Scenarios are not forecasts.

---

## 13. Risks and mitigations

| Risk | Mitigation (BP §13, §15.8) |
|---|---|
| Demand and willingness to pay unproven | gates with cohort measurement; free tier for reach, packs as a low-threshold purchase; budget released only after the gate |
| A platform builds the feature natively | early pilot/partner pitch; multilingual content and community packs as a moat; open API |
| Phone-only creators without OBS | mobile developer as the first hire, PWA, demo recording without OBS |
| Speech recognition with dialect, noise, music | tolerance levels, learning function, external engines, offline Whisper, scene pad |
| Dependence on browser speech recognition and platform policies | pluggable engine, several routes per platform, phone fallback |
| Copyright in memes, GIFs, sounds | own synthetic sounds, licensed GIF providers, terms of use |
| Data protection and child protection (family, school) | local processing without cloud obligation, no accounts required, on-device recognition in the school profile |
| The vision spreads the small team too thin | order by closeness to revenue, 20% budget cap, XR only as a showcase |
| Long procurement in education | family subscription and publishers carry the first year; school licences via media centres |
| Key person | documentation and tests, early hires, advisory board |

An investment in a company at this stage may result in total loss.

---

## 14. Team

| Person | Role | Background |
|---|---|---|
| **Tuncay Sancak** | Founder & Inventor, Managing Director | Invented LiveFX and built it to version 2.0 before any funding; leads product, technology and content. Product architect and Germany–Türkiye bridge; former project lead, AI expert and data scientist at Mercedes-Benz; native German and Turkish speaker, trilingual in business. Author of children's books, including the gift book "Good That You Exist" (DE/TR/EN) – experience with content and read-aloud formats. |
| **Gönül Demet** | Investor Relations & Fundraising | Leads investor outreach for the pre-seed round and prepared these materials. |

**Team build after financing** (BP §12):

| Role | Timing |
|---|---|
| Mobile developer (iOS/Android, PWA, later SDK) | from the round |
| Community and partner management TR/DE | years 1–2, part-time → full-time |
| Graphics/web developer (Canvas, WebCodecs) for Story Film and Studio | years 1–2 |
| Backend/ML developer (streaming ASR < 300 ms, offline models) | from month 13 |
| Illustration, voice talent DE/TR/EN, didactics (freelance) | year 2 |
| Advisory board: creator management TR, former live product lead at a platform, edtech | year 1 |

Investor contact: **Gönül Demet** · [email] · [phone]

---

## 15. Materials

- Investor deck: `LiveFX_Investor_Deck_EN.pptx` (DE, TR) · one-pager: `OnePager_EN.pdf` (DE, TR)
- Investor show: `LiveFX_Investor_Show.html`, video `LiveFX_Investor_Show_EN.mp4` (DE, TR)
- Business plan `../live-fx/business/BUSINESSPLAN.en.md` (DE, TR), market analysis, vision, pitch deck, sources
- Prototypes `../live-fx/business/prototypes/live-story.html`, `sprachlernen.html`; trailers and vision trailers in `../live-fx/business/video/`

### Sources cited (numbers as in `QUELLEN.en.md`, with URLs there)

1 market.us – Live Streaming Market · 2 Gyre – Live Streaming Statistics · 3 datarefs – Creator Economy · 4 New Market Pitch – Creator Economy · 5 InfluencerFee – TikTok LIVE Gifting · 6 Muvi – TikTok LIVE · 8 Shopify TR – TikTok coins · 9 Juntire – TikTok live 2026 · 10 Milliyet – coin prices · 11 Capterra – Streamlabs · 12 CreatorStackClub – Streamlabs, StreamYard, Restream · 13 ToolChase – Voicemod · 19 Börsenverein – Buchmarkt kompakt · 20 ARD/ZDF media study 2025 · 23 Meticulous Research – AI video · 24 Google – Gemini API pricing · 25 Veo 3 API pricing 2026 · 27 web.dev – WebGPU · 28 Chrome 139 · 32 Duolingo Q2 2026 · 33 Business of Apps – language-learning apps · 34 Mordor Intelligence – language learning · 36 BAMF – integration courses · 37 bpb – home language · 40 Deutsches Schulportal – DigitalPakt 2.0 · 41 ANTON – school licence · 42 Microsoft Reading Coach · 43 Google Read Along · 45 IDC – smart glasses · 50 Musikwoche – tonies · 51 The Business Research Company – video editing · 52 Expanded Ramblings – CapCut · 56 CNBC – Canva/Cavalry

*Confidential. Scenarios and estimates, not forecasts. This memo is not an offer to sell securities.*
