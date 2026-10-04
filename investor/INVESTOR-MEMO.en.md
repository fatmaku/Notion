# LiveFX – Investment Memo (Pre-Seed)

**Live streams that listen. And tomorrow: You talk. It becomes a scene.**
A **€250,000** pre-seed round for 18 months: LiveFX to market, Pro subscription, mobile app and the first vision line, WordPicture.

Confidential · Pre-Seed · October 2026
Founder & Inventor, Managing Director: **Tuncay Sancak** · Investor Relations: **Gönül Demet**

> German: `INVESTOR-MEMO.de.md` · Turkish: `INVESTOR-MEMO.tr.md`
>
> **Basis:** every financial figure (use of funds, runway, cash, 5-year P&L, gates, valuation, sensitivity) comes from the finance model [`../live-fx/business/LiveFX_Finanzmodell.xlsx`](../live-fx/business/LiveFX_Finanzmodell.xlsx) (export `../live-fx/business/tools/finance-250k.json`, generated 4 Oct 2026). Market and product figures come from the LiveFX documents in `../live-fx/business/` – `BUSINESSPLAN.en.md` (BP), `PITCH-DECK.en.md`, `MARKTANALYSE.en.md`, `VISION.en.md`, `QUELLEN.en.md` – and from `../live-fx/CHANGELOG.md` (version 2.1). Market figures carry the number used there, **[Source n]**; our own assumptions are marked **estimate**. There is **no revenue yet**. Values that can only be measured later are left as **[number]**. Use of funds, gates and valuation are a **proposal – review with tax/legal advisor**.

---

## 1. At a glance

| | |
|---|---|
| **Thesis** | Live streaming is the fastest-growing revenue channel of the creator economy – but live is raw. LiveFX turns the creator's voice into memes, sounds and animated scenes in under a second. The same engine becomes a visual language for everything spoken: story film, language learning, new spaces, auto-editing. |
| **Product** | Version 2.1 works: German, Turkish and English with automatic detection, 238 triggers in five packs plus **143 free stickers** (MIT) and text-sticker packs, 13 scenes, 38 sounds, story mode, viewer triggers, phone remote, offline-capable; **performance mode** cuts frame time by 63–69%; **safe GIF search** (KLIPY/GIPHY) with a child-safety filter (BP §3, CHANGELOG 2.1.0). |
| **Vision** | Four lines: A Story Film (Generative Scene Engine), B WordPicture (language learning), C Spaces (stage, classroom, AR/VR, glasses), D Studio (live editing, auto-edit). Two clickable prototypes (A and B) exist (`VISION.en.md`). The pre-seed funds **WordPicture**; story engine, auto-edit and VR move to the follow-on round. |
| **Market** | Global live streaming 2026: USD 97–157bn [Source 1, 2]; creator economy ~USD 216–260bn [Source 3, 4]; gifts ≈ 50% of streamer income [Source 5, 6]. Adjacent: language-learning apps USD 1.54bn [Source 33], AI video USD 3.67bn [Source 23], video editing USD 2.68bn [Source 51]. |
| **Model** | Free + Pro at €9.99/month, creator packs €2.99–4.99, agency and B2B licences; with the vision, Pro+ at €14.99, WordPicture Family at €4.99/month, school, course, event and publisher licences (BP §9, §15.6, estimate). |
| **Ask** | **€250,000** pre-seed for **18 months**: team/product 50%, go-to-market 20%, WordPicture 15%, legal 10%, reserve 5%. Runway **18 months even without any revenue**. |
| **Valuation** | **Founder offer: €2.25M pre-money**, €2.5M post-money, **10%** for investors (founder 90%) – below all four reference methods (€2.35M–€3.0M, weighted €2.71M). Alternative: SAFE/convertible with a €2.25M cap, 20% discount, no interest. Negotiation range; review with tax/legal advisor. |
| **Follow-on** | Seed round of about **€350,000** by month 18 (after gate 2), talks from month 12. |
| **Status** | Product built, no revenue yet; launch in the Turkish-speaking community from Q4 2026 (BP §14.1); closing planned for January 2027 (= month 1). |

---

## 2. Investment thesis

1. **The gap is empty.** Alerts react to viewers, soundboards to keys, native effects to manual selection. No widely used tool reacts to what the creator *says* (BP §2, §7). On a 2×2 of trigger (viewer ↔ voice) and operation (manual ↔ automatic), LiveFX stands alone in "voice-driven, automatic" (`PITCH-DECK.en.md`, slide 10).
2. **The money is made inside the stream.** Gifts make up about half of live streamers' income [Source 5, 6]; creators with 20–100k followers earn USD 500–3,000 a month from gifts [Source 5]. Every minute of watch time counts – LiveFX makes streams more entertaining and makes gifts visible and audible.
3. **Built before funding.** Version 2.1 runs, with 575+ automated tests, a documented architecture and use in real streams; 2.1 added a performance mode (frame time −63 to −69%), 143 free stickers and a safe GIF search. The capital goes into execution, not into a prototype.
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

## 4. The product: LiveFX 2.1

**In one sentence:** the creator talks – LiveFX listens. When he says "krass", "oh no", "applause", "yok artık" or "bruh", the right meme appears in the stream in under a second and the right sound plays. When he reads aloud – "it was raining", "at night", "the dragon" – the overlay turns into an animated scene with ambient sound (BP §3.1).

| Area | Status 2.1 (BP §3.2, CHANGELOG 2.1.0) |
|---|---|
| Speech recognition | DE, TR, EN with **automatic language selection**; browser engine, external engines (Whisper, Deepgram) or offline Whisper in the browser |
| Dialect and learning | three-level fuzzy matching ("grass" → krass), learning from the stream with one click |
| Content | **238 triggers** in five packs: Turkish 85, German 49, English 50, Family & Kids 27, Gaming 27 |
| **New in 2.1: free stickers** | **143 free stickers** (Microsoft Fluent Emoji, MIT licence; 119 animated) with DE/TR/EN search; **text-sticker packs** TR/DE/EN (27–28 big comic words each, e.g. OHA, KRASS, SHEESH); packs cleaned of religious terms and flags |
| **New in 2.1: performance mode** | one render path on canvas; measured with 31 effects on 1920×1080: **frame time −63 to −69%** on average, p99 −74 to −80%, DOM nodes −56%; modes auto / eco (weak PCs) / high |
| **New in 2.1: safe GIF search** | **KLIPY and GIPHY** (Tenor API was shut down on 30 June 2026), always `rating=g`; **child-safety filter** for search terms and results in DE/TR/EN; provider GIFs are linked, never stored; image sources limited to own uploads, bundled stickers and KLIPY/GIPHY |
| Story mode | **13** animated scenes, **12** ambience loops, story packs DE/TR/EN, scene pad |
| Effects and sound | effects engine v2 (particles, glow, 3D cards, impact zoom), themes; **38** licence-free synthetic sounds; mixer with ducking and reverb |
| Viewer triggers | Twitch chat, YouTube live chat, chat commands; gift webhook (TikTok coins via TikFinity/Streamer.bot, Super Chat, Bits) |
| Phone and offline | PWA remote, phone as a second mic; panel, overlay and demo work offline |
| Integration | OBS/Streamlabs browser source → TikTok LIVE, Instagram Live, YouTube Live, Twitch; open, token-protected HTTP API |
| AI (optional) | understanding without keywords ("that was so embarrassing" → Awkward), 1.5 s timeout; ≈ USD 0.004 per classification, USD 0.25–0.75 per stream hour (project measurement, BP §9) |

**Technology and protection.** Plain HTML/JS/CSS and a Node.js server with zero external dependencies; local instead of cloud, so marginal cost is close to zero and GDPR-friendly (BP §4). Protectable building blocks: multilingual matcher, curated trigger, sticker and story packs, synthetic sound library, scene engine and mixer, learning loop. Registering the "LiveFX" trademark (DE/EU/TR) is budgeted in the round (legal line, §10.1).

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

**Order by closeness to revenue** (BP §14.2): highlights (D) and WordPicture (B) first, the Story Film (A) as the core, Spaces (C) via the stage, XR later and only as a showcase. The pre-seed round takes **WordPicture** from prototype to product (€37,500, months 4–15); the **story engine (Story Film), Studio/auto-edit and Spaces/VR move to the follow-on round** (finance model, sheet *Use of funds*).

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

Month 1 = closing, planned for January 2027 (finance model, timeline).

| Phase | Period | Measures (BP §10, finance model) |
|---|---|---|
| 1 · Turkish community | months 1–6 | own streams as a showcase, 10–20 creator ambassadors, Discord/Telegram, weekly pack and sticker drops; clips from real streams are the marketing (marketing phase 1: €2,000/month) |
| 2 · DE/EN | months 7–18 | German- and English-speaking creators; read-aloud and education streams; OBS, Streamlabs and Stream Deck directories (marketing phase 2: €3,000/month) |
| 3 · Platform or education pilot | from month 9 | one pilot: 8 weeks, 20 creators, measured watch time, gifts and clips – or a WordPicture pilot in ≥ 3 courses/classes |
| 4 · Partners, platforms, story engine | from month 19 (follow-on round) | creator partner programme with revenue share, agencies, pitch to the live teams at TikTok, Meta, YouTube; story engine, Studio and Spaces |

**Pilot offer to platforms** (`PITCH-DECK.en.md`, slide 17): 8 weeks, 20 creators, measured watch time, gifts and clips. **Education & languages pilot:** WordPicture in [number] courses/classes.

---

## 10. The offer: €250,000 pre-seed

Source of all figures: finance model [`../live-fx/business/LiveFX_Finanzmodell.xlsx`](../live-fx/business/LiveFX_Finanzmodell.xlsx), sheets *Use of funds*, *Monthly cash flow 24 months*, *5-year P&L*. **Proposal – review with tax/legal advisor.**

### 10.1 Use of funds over 18 months

| # | Area | Share | Amount | What for (monthly plan) |
|---|---|---|---|---|
| 1 | **Team/product** | 50% | **€125,000** | mobile/web developer from month 3 (16 × €5,500 = €88k), founder salary in part (18 × €2,000 = €36k), test devices €1k; goal: Pro subscription, mobile app/PWA, stability of v2.1 |
| 2 | **Go-to-market** | 20% | **€50,000** | TR launch, 10–20 ambassadors, pack drops, marketplace listings, DE/EN launch, one platform or education pilot |
| 3 | **First vision line: WordPicture** (language learning) | 15% | **€37,500** | 300 words, reading aid, voice recordings DE/TR/EN, didactic review, course/class pilot (months 4–15) |
| 4 | **Legal, trademark, data protection** | 10% | **€25,000** | "LiveFX" trademark DE/EU/TR, investment agreement, GDPR impact assessment for the school/family profile, child protection, tax advice |
| 5 | **Reserve** | 5% | **€12,500** | not scheduled: delays in hiring, store/platform approvals; covers fixed infrastructure costs in the no-revenue case |
| | **Total** | **100%** | **€250,000** | scheduled in months 1–18: €237,500 + reserve €12,500 |

**Moved to the follow-on round** (not funded from the €250,000): story engine / Story Film (line A), Studio / auto-edit (line D), Spaces / VR-AR (line C), and backend/ML, community/support and a second developer from month 19.

### 10.2 Runway and cash

Without **any** revenue, the €250,000 lasts **18 months** (average burn €13,444/month; cash runs out in month 19). With revenue, the runway extends:

| Scenario | Runway | Cash month 6 | Month 12 | Month 18 | Month 24 | Sustained break-even |
|---|---|---|---|---|---|---|
| No revenue | 18 months | €179.1k | €87.9k | €8.0k | −€62.5k | – |
| Conservative | 22 months (cash-out month 23) | €182.7k | €102.3k | €49.1k | −€11.5k | after month 24 |
| **Base** | **> 24 months** | **€190.8k** | **€134.4k** | **€145.8k** | **€175.2k** | **month 22** |
| Optimistic | > 24 months | €207.7k | €202.0k | €368.9k | €697.9k | month 10 |

Lowest cash: base €125.4k (month 15), optimistic €196.7k (month 9); in the conservative case cash falls below the safety buffer in month 19.

### 10.3 Follow-on round

The pre-seed is the first of two steps. **Seed round planning guide: about €350,000**, closed **by month 18** – after gate 2 (months 15–18), with talks from month 12. Minimum need per scenario (liquidity gap to the safety buffer plus €160.5k for the deferred lines): conservative €313.9k, base €212.6k, optimistic €238.8k. The follow-on round finances the expansion team from month 19 and the story engine, Studio and VR.

### 10.4 Instrument

Two options (finance model, sheet *Valuation*): **priced equity round** at the founder offer of €2.25M pre-money (§12) or **SAFE / convertible loan** with cap and discount (§12.3). Closing date, information and consent rights, founder commitment: **[open]**. Planning assumption: closing January 2027; if closing moves, the gates move with it.

---

## 11. Financials: 5-year P&L

All values in €k, **estimates** from the finance model (sheet *5-year P&L*); there is no revenue yet. Y1 = 2027 (start of the Pro subscription) … Y5 = 2031. Y1–Y3 revenue as in BP §11.1; Y4–Y5 projected (user growth, conversion, agencies, B2B). Vision revenue (BP §11.5) stays outside the result, as in the business plan.

| **Base case** | Y1 2027 | Y2 2028 | Y3 2029 | Y4 2030 | Y5 2031 |
|---|---|---|---|---|---|
| Revenue | 51 | 336 | 1,038 | 1,984 | 3,152 |
| Costs | 166 | 295 | 710 | 1,065 | 1,491 |
| **EBITDA** | **−116** | **+41** | **+328** | **+919** | **+1,661** |
| Cumulative result | −116 | −75 | +253 | +1,172 | +2,833 |
| Cash at year end | 134 | 175 | 503 | 1,422 | 3,083 |

| Scenario | Revenue Y1 / Y2 / Y3 / Y4 / Y5 | EBITDA Y1 / Y2 / Y3 / Y4 / Y5 | Cash end of Y5 |
|---|---|---|---|
| Conservative | 16 / 82 / 271 / 432 / 602 | −148 / −114 / −59 / +36 / +147 | 112 |
| **Base** | **51 / 336 / 1,038 / 1,984 / 3,152** | **−116 / +41 / +328 / +919 / +1,661** | **3,083** |
| Optimistic | 124 / 892 / 2,599 / 4,828 / 7,444 | −48 / +496 / +1,499 / +3,178 / +5,134 | 10,509 |

Cash figures **without** the follow-on round. In the conservative case cash would be negative in Y2–Y4 (low point −€70.9k at the end of Y3) – that is why the seed round is planned by month 18. Key assumptions (base): 20,000 / 80,000 / 250,000 registered users at year end Y1–Y3, 4% conversion, Pro ARPU €8.50 net (BP §11.1); costs Y1–Y2 from the monthly plan (pre-seed team until month 18, expansion team from month 19); infrastructure €250/month + 8% of revenue. Scenarios are not forecasts.

### 11.1 Sensitivity (base case)

| Case | Revenue Y3 | vs. base | Cash month 18 | Cash month 24 | Lowest cash | Runway |
|---|---|---|---|---|---|---|
| Base | €1,038k | – | €145.8k | €175.2k | €125.4k | > 24 months |
| Conversion −1 pt | €847k | −18.4% | €117.1k | €109.5k | €82.5k | > 24 months |
| ARPU −20% | €885k | −14.7% | €122.8k | €122.6k | €91.5k | > 24 months |
| Users −30% | €779k | −25.0% | €105.8k | €85.4k | €65.5k | > 24 months |
| Users +30% | €1,298k | +25.0% | €185.8k | €265.0k | €145.4k | > 24 months |

Even the weakest single sensitivity keeps the base case funded beyond month 24.

---

## 12. Valuation – founder offer (negotiation range; review with tax/legal advisor)

Source: finance model, sheet *Valuation* (founder view; every assumption is sourced and labelled).

### 12.1 The offer

| | |
|---|---|
| **Pre-money valuation** | **€2,250,000** |
| Investment | €250,000 |
| **Post-money valuation** | **€2,500,000** |
| **Investor stake** | **10.0%** (€250,000 ÷ €2.5M) |
| Founder after the round (before ESOP) | 90.0% |

### 12.2 Why €2.25M

1. **A working product, not a concept.** v2.1 delivers voice → effect in real time, a performance mode and a safe GIF search; 575+ automated tests and an end-to-end (Playwright) suite – technology risk is largely retired.
2. **Own IP and content.** 238 voice triggers, 143 free stickers, text-sticker content and the matcher logic are built in-house; the LiveFX trademark filing (DE/EU/TR) is budgeted.
3. **Three languages incl. a Turkish niche.** Hardly any specialised streaming tools exist in Turkish; our own Turkish community is the launch market.
4. **Vision options A–D on the same engine** – story engine, WordPicture, Spaces/VR-AR, Studio/auto-edit: option value beyond the creator tool.
5. **Market size.** Live streaming USD 97–157bn, SAM 1–3m creators (BP §6); education/language learning as a second market.
6. **Capital efficiency.** Built to v2.1 without external money; per the model the €250,000 lasts 18 months to gate 2.
7. **Tangible.** Runnable prototypes (Story Film, WordPicture) and trailers – investors see more than a slide.

Honestly against it: solo founder, no revenue and no partners yet. That is why the offer is a **fair, investor-friendly entry price below every reference method** (about 17% below their weighted average).

### 12.3 Reference methods (investor's view)

| Method | Pre-money | Weight | How |
|---|---|---|---|
| **Berkus** (moderate 2× variant) | **€2.35M** | 25% | five factors, up to €1M each (valu.vc / icanpitch 2026, $→€ 1:1): idea 0.7 (€700k), product 0.8 (€800k), team 0.5 (€0.5M), strategic relationships 0.25 (€250k), launch/revenue 0.1 (€100k) |
| **Scorecard** (Payne) | **€2.95M** | 30% | reference €2.5M (lower part of the DACH pre-seed range €1.5–5M, upxcale/Capvisory; below the European median ~€4.2M, Equidam) × factor 1.18 (team 1.0, market 1.4, product 1.4, competition 1.3, marketing 0.8, funding need 1.0, other 1.2) |
| **VC method** (upside scenario) | **€2.43M** | 20% | Y5 revenue optimistic €7.44M × exit multiple 6 = €44.7M exit; target return 10×, later dilution 40% → post-money €2.68M − €250k investment |
| **Risk factor summation** | **€3.0M** | 25% | base €2.5M + 2 × €250k: twelve risks scored (development stage, supply chain, competition, technology, international +1; management, sales/marketing, fundraising −1; the rest 0) |

Range €2.35M–€3.0M; weighted average **€2.71M**. The offer of €2.25M is below every method – a fair, investor-friendly entry price.

### 12.4 Alternative: SAFE / convertible loan

| | |
|---|---|
| Valuation cap (pre-money) | **€2,250,000** (= the offer's pre-money) |
| Discount on the seed price | **20%** (negotiable 15–20%) |
| Interest | none (0%); conversion at the seed round (planned by month 18) → conversion amount €250,000 |
| Example | seed pre-money €3M → conversion price = min(cap; €3M × 0.8) = €2.25M → stake 10.0% (before the seed money) |
| Maximum stake at the cap | 10.0% |

All valuation figures: **negotiation range; review with tax/legal advisor.** Not investment advice.

---

## 13. Milestones and KPI gates (18 months)

Scale only after the evidence clears the gate. Values are **targets** from the base case of the finance model (sheet *Gates 18M*); a gate is met when at least the **threshold** (conservative case) is reached. Status of every gate: **target (not yet achieved)**. Proposal – to be agreed with investors.

| Gate | Month | Theme | KPI | Target (base) | Threshold (cons.) | Optimistic | Unlocks |
|---|---|---|---|---|---|---|---|
| **G0** | 3 | Start | Pro subscription live (payments), mobile/web developer on board | – | – | – | go-to-market budget phase 2 |
| **G1** | 6 | Activation | registered users | 10,000 | 4,000 | 20,000 | mobile app/PWA release |
| | | | paying Pro users | 400 | 120 | 1,000 | |
| | | | 20 beta creators TR/DE active, 10–20 ambassadors; WordPicture with 300 words; week-4 retention of active streamers ≥ 30% | | | | |
| **G2a** | 12 | Traction | registered users | 20,000 | 8,000 | 40,000 | DE/EN expansion, platform talks |
| | | | paying Pro users (year end Y1, BP §11.1) | 800 | 240 | 2,000 | |
| | | | recurring revenue in month 12 (MRR) | €8,073 | €2,500 | €19,820 | |
| | | | 1 platform or education pilot started; WordPicture pilot in ≥ 3 courses/classes | | | | |
| **G2** | 18 | Follow-on | registered users | 50,000 | 19,000 | 110,000 | seed round, expansion team from month 19, story engine/Studio |
| | | | paying Pro users | 2,000 | 570 | 5,500 | |
| | | | recurring revenue in month 18 (MRR) | €22,586 | €6,495 | €62,473 | |
| | | | month-3 Pro retention ≥ 75%; free → Pro conversion ≥ 3% (threshold) / 4% (target); WordPicture pilot evaluated, ≥ 5 paying schools or courses (BP §11.5) | | | | |

### 13.1 Roadmap

| When | Milestone |
|---|---|
| Q4 2026 | v2.1 released (performance mode, 143 free stickers, safe GIF search); TR launch |
| Month 1 (Jan 2027) | closing €250,000; marketing phase 1 (TR), legal and trademark |
| Month 3 | **G0**: Pro subscription live, mobile/web developer on board |
| Months 4–15 | WordPicture: 300 words, voice recordings DE/TR/EN, course/class pilot |
| Month 6 | **G1**: activation; mobile app/PWA release |
| Month 7 | DE/EN launch, marketing phase 2 |
| Month 9 | platform or education pilot (8 weeks) |
| Month 12 | **G2a**: traction; seed talks start |
| Months 15–18 | **G2**: seed round (≈ €350,000) |
| From month 19 | expansion team (backend/ML, community, second developer); story engine, Studio/auto-edit, Spaces/VR from the follow-on round |

---

## 14. Risks and mitigations

| Risk | Mitigation (BP §13, §15.8) |
|---|---|
| Demand and willingness to pay unproven | gates with cohort measurement; free tier for reach, packs as a low-threshold purchase; budget released only after the gate |
| A platform builds the feature natively | early pilot/partner pitch; multilingual content and community packs as a moat; open API |
| Phone-only creators without OBS | mobile/web developer as the first hire (month 3), PWA, demo recording without OBS |
| Speech recognition with dialect, noise, music | tolerance levels, learning function, external engines, offline Whisper, scene pad |
| Dependence on browser speech recognition and platform policies | pluggable engine, several routes per platform, phone fallback |
| Copyright and child safety in memes, GIFs, sounds | own synthetic sounds; 143 MIT-licensed stickers; GIFs only from KLIPY/GIPHY with `rating=g`, linked not stored, child-safety filter (v2.1) |
| Data protection and child protection (family, school) | local processing without cloud obligation, no accounts required, on-device recognition in the school profile |
| The vision spreads the small team too thin | only WordPicture in the pre-seed (15% of the budget); story engine, Studio and XR move to the follow-on round |
| Follow-on round not raised by month 18 | gates at months 3/6/12/18, seed talks from month 12, reserve €12,500; 18 months of runway even without revenue, 22 months in the conservative case |
| Long procurement in education | family subscription and publishers carry the first year; school licences via media centres |
| Key person | documentation and tests, early hires, advisory board |

An investment in a company at this stage may result in total loss.

---

## 15. Team

| Person | Role | Background |
|---|---|---|
| **Tuncay Sancak** | Founder & Inventor, Managing Director | Invented LiveFX and built it to version 2.1 before any funding; leads product, technology and content. Product architect and Germany–Türkiye bridge; former project lead, AI expert and data scientist at Mercedes-Benz; native German and Turkish speaker, trilingual in business. Author of children's books, including the gift book "Good That You Exist" (DE/TR/EN) – experience with content and read-aloud formats. |
| **Gönül Demet** | Investor Relations & Fundraising | Leads investor outreach for the pre-seed round and prepared these materials. |

**Team build after financing** (BP §12, finance model):

| Role | Timing |
|---|---|
| Mobile/web developer (iOS/Android, PWA, later SDK) | from month 3 (pre-seed) |
| Illustration, voice talent DE/TR/EN, didactics for WordPicture (freelance) | months 4–15 (pre-seed) |
| Backend/ML developer (streaming ASR < 300 ms, offline models) | from month 19 (follow-on round) |
| Community and partner management TR/DE, second developer | from month 19 (follow-on round) |
| Graphics/web developer (Canvas, WebCodecs) for Story Film and Studio | follow-on round |
| Advisory board: creator management TR, former live product lead at a platform, edtech | year 1 |

Investor contact: **Gönül Demet** · [email] · [phone]

---

## 16. Materials

- **Finance model:** [`../live-fx/business/LiveFX_Finanzmodell.xlsx`](../live-fx/business/LiveFX_Finanzmodell.xlsx) – assumptions, 5-year P&L, use of funds, monthly cash flow 24 months, gates 18 months, valuation, sensitivity (sheet labels in German; translation sheet DE/TR/EN included)
- Investor deck: `LiveFX_Investor_Deck_EN.pptx` (DE, TR) · one-pager: `OnePager_EN.pdf` (DE, TR)
- Investor show: `LiveFX_Investor_Show.html`, video `LiveFX_Investor_Show_EN.mp4` (DE, TR)
- Business plan `../live-fx/business/BUSINESSPLAN.en.md` (DE, TR), market analysis, vision, pitch deck, sources
- Product changelog `../live-fx/CHANGELOG.md` (2.1.0)
- Prototypes `../live-fx/business/prototypes/live-story.html`, `sprachlernen.html`; trailers and vision trailers in `../live-fx/business/video/`

### Sources cited (numbers as in `QUELLEN.en.md`, with URLs there)

1 market.us – Live Streaming Market · 2 Gyre – Live Streaming Statistics · 3 datarefs – Creator Economy · 4 New Market Pitch – Creator Economy · 5 InfluencerFee – TikTok LIVE Gifting · 6 Muvi – TikTok LIVE · 8 Shopify TR – TikTok coins · 9 Juntire – TikTok live 2026 · 10 Milliyet – coin prices · 11 Capterra – Streamlabs · 12 CreatorStackClub – Streamlabs, StreamYard, Restream · 13 ToolChase – Voicemod · 19 Börsenverein – Buchmarkt kompakt · 20 ARD/ZDF media study 2025 · 23 Meticulous Research – AI video · 24 Google – Gemini API pricing · 25 Veo 3 API pricing 2026 · 27 web.dev – WebGPU · 28 Chrome 139 · 32 Duolingo Q2 2026 · 33 Business of Apps – language-learning apps · 34 Mordor Intelligence – language learning · 36 BAMF – integration courses · 37 bpb – home language · 40 Deutsches Schulportal – DigitalPakt 2.0 · 41 ANTON – school licence · 42 Microsoft Reading Coach · 43 Google Read Along · 45 IDC – smart glasses · 50 Musikwoche – tonies · 51 The Business Research Company – video editing · 52 Expanded Ramblings – CapCut · 56 CNBC – Canva/Cavalry

**Valuation references** (finance model, sheet *Valuation*; web research 4 Oct 2026 – check values before use): Equidam – Pre-Seed Valuations Q1 2025 (https://www.equidam.com/startup-valuation-delta-q1-2025/) · upxcale – Pre-Seed Funding 2026 (https://upxcale.de/blog/pre-seed-funding/) · Capvisory – Startup Funding Stages 2025 (https://capvisory.de/the-startup-funding-stages-from-pre-seed-to-series-c/) · SaaS Capital – 2025 Private SaaS Company Valuations (https://www.saas-capital.com/blog-posts/private-saas-company-valuations-multiples/) · Carta – State of Private Markets Q1 2025 (https://carta.com/data/state-of-private-markets-q1-2025/) · Lexr – convertible loan in practice (https://www.lexr.com/en-de/blog/convertible-loan-in-practice-conversion-interest-rate-discount-cap-valuation/) · Vektora – pre-seed financing in Germany (https://vektora.eu/de/fachbeitraege/pre-seed-finanzierung-in-deutschland-instrumente-und-prozess)

*Confidential. Scenarios and estimates, not forecasts. Valuation and terms are a proposal – review with tax/legal advisor. This memo is not an offer to sell securities.*
