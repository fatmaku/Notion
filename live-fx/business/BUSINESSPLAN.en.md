# LiveFX – Business Plan

**Live streams that listen.** Memes, sounds and animated scenes in real time – triggered by the creator's voice.

Date: October 2026 · Product version: 2.1 · Confidential
Founder & Inventor, Managing Director: Tuncay Sancak · Investor Relations: Gönül Demet · Contact: [Email] · [City]

> Deutsch: BUSINESSPLAN.md · Türkçe: BUSINESSPLAN.tr.md

> All market figures come from public secondary sources and are given as ranges; references appear as [Source n] in the text, with the list in the appendix. Our own assumptions are explicitly marked as "estimate". Figures in [square brackets] will be filled in by the founder.

---

## 1. Executive Summary

**LiveFX** makes live streams as lively as edited short-form videos. The software listens to the creator and, in under a second, drops matching memes, GIFs, sounds, text effects or entire animated scenes into the stream – hands-free, in three languages (Turkish, German, English, detected automatically), compatible with TikTok LIVE, Instagram Live, YouTube Live and Twitch via OBS/Streamlabs.

**Vision 2027–2029:** the same engine becomes a visual language for everything spoken – a continuous story film made from words, WordPicture cards for language learning with pronunciation, new spaces from the stage to smart glasses, and a studio that edits finished videos by itself. Because the browser draws instead of running a video AI, this costs a fraction of generative video AI and works live (chapter 15).

| | |
|---|---|
| **Problem** | Everything that makes short-form videos go viral is added *after* recording, in the edit. Live is raw. Existing tools react to viewer events or key presses – none reacts to the spoken word. |
| **Solution** | Speech → effect. Keyword matching with dialect tolerance and a learning function, optional AI understanding without keywords, story mode for reading aloud, viewer triggers via chat and gifts, phone remote control. |
| **Status** | Version 2.1, fully functional: 238 ready-made triggers in five packs plus text sticker packs, 143 free stickers (MIT licence), 13 scenes, 38 sounds, performance mode (frame time −63 to −69%), safe GIF search (KLIPY/GIPHY with content filter), automated tests, in use in the founder's own live streams. |
| **Market** | Global live streaming 2026: USD 97–157bn [Source 1, 2]; creator economy ~USD 216–260bn [Source 3, 4]; gifts ≈ 50% of TikTok LIVE streamers' income [Source 5, 6]. |
| **Business model** | Free + Pro subscription (€9.99/month), creator packs (€2.99–4.99), agency licence, B2B platform licence; strategic exit to TikTok/Meta/YouTube. |
| **Go-to-market** | Turkish-speaking creator community first, then DE/EN; the founder's own streams as a showcase; creator partner programme; LinkedIn and press. |
| **Needs** | **€250,000 pre-seed** for 18 months (closing January 2027): lean team with a mobile/web developer from month 3, go-to-market, the first vision line WordPicture, legal and trademark. Runway: 18 months even without any revenue. Story Film, Studio and Spaces follow with a seed round of about €350,000 after Gate 2 (month 18). Plus platform partnerships and pilot partners (section 11.6). |
| **Financials** | Base scenario: revenue €51k (2027) → €336k (2028) → €3.15M (2031); EBITDA positive from 2028 (€41k), €1.66M in 2031; cash never falls below €125k in the first 24 months (section 11, `LiveFX_Finanzmodell.xlsx`). |
| **Valuation** | Founder offer: €250,000 for 10.0% – pre-money €2.25M, post-money €2.5M; below all four reference methods (Berkus €2.35M, Scorecard €2.95M, VC method €2.43M, Risk Factor Summation €3.0M; weighted €2.71M). Alternatively a SAFE/convertible with a €2.25M cap and 20% discount. Negotiation basis; review with tax/legal advisor (section 11.6). |

Ask: €250,000 pre-seed for 10.0% (pre-money €2.25M, section 11.6) and a pilot partnership with a platform (TikTok LIVE Studio, Instagram Live Producer, YouTube Live) or a creator-tool provider – alternatively an acquisition of technology and team.

---

## 2. The problem

Short-form videos on TikTok, Instagram Reels and YouTube Shorts thrive on memes, sound effects, stickers and zoom punches. All of that is added **after** recording – in CapCut, in the TikTok editor, in Edits. Live streams, by contrast, are raw: the creator is host, director and editor at the same time, and the edit never comes.

At the same time, creator-economy revenue is shifting *into* the stream: gifts, live commerce and community subscriptions are generated during the broadcast. On TikTok LIVE, gifts account for around half of streamers' income [Source 5, 6]; according to industry sources, creators with 20k–100k followers earn USD 500–3,000 per month from gifts [Source 5]. Every minute of watch time counts – and a monotonous stream loses viewers.

Existing tools do not solve this:

- **Alerts** (Streamlabs, StreamElements, Sound Alerts) react to *viewers*: follows, donations, Bits. The creator triggers nothing.
- **Soundboards** (Voicemod, Stream Deck) need *hands*: hotkeys, buttons, clicks – while you are talking, holding the camera or reading aloud.
- **Native effects** (TikTok, Instagram) are filters and stickers that are chosen manually and do not react to content.
- **No tool reacts to what the creator says.** Auto-captions have proven that real-time text from speech works. Real-time *effects* from speech have not existed until now.

For multilingual creators – such as the large Turkish-speaking community in Turkey and Europe – there is an additional problem: there are practically no localised creator tools, let alone any that understand Turkish meme culture ("yok artık", "helal olsun", "ohaa").

---

## 3. The product (version 2.1)

### 3.1 In one sentence

The creator talks – LiveFX listens. If she says "krass", "oh nein", "Applaus", "yok artık" or "bruh", the matching meme appears in the stream in under a second and the matching sound plays. If she reads aloud – "it was raining", "in the night", "the dragon" – the overlay turns into an animated scene with ambient sound.

```
Mic ─► Speech recognition (auto DE/TR/EN) ─► Matcher (dialect tolerance) ─┐
                                          └► AI understanding (optional) ──┤
Viewer chat / gift / phone / Stream Deck ─► HTTP API (token) ──────────────┼─► Bridge ─► Overlay in OBS ─► Stream
Panel: meme packs, GIF search, uploads, trigger editor, themes ────────────┘
```

### 3.2 Features

| Area | Version 2.1 |
|---|---|
| **Speech recognition** | Three languages (German, Turkish, English) with **automatic language selection** while speaking; variants DE/AT/CH, US/GB/IN. Browser engine (Chrome/Edge), external engines (Whisper, Deepgram) via API, or **offline Whisper** directly in the browser. "Fast" reaction (interim results) or "safe" (complete sentences), 3 readings, self-test, level and latency display. |
| **Dialect and learning** | Fuzzy matching in three levels ("grass" → krass, "helal olsn" → helal olsun) with protection against false hits. Unrecognised sentences can be assigned to a trigger with one click – next time it lands. |
| **Meme packs** | Türkçe (85), Deutsch (49), English (50), Family & Kids (27), Gaming (27) = **238 triggers**, loadable and removable with one click. |
| **GIF search and media** | Safe GIF search with KLIPY and GIPHY directly in the panel (always rated G, youth-protection filter for search terms and results, GIFs are linked at the provider, not stored), "Use as trigger" in one step; your own PNG/JPG/GIF/WebP and MP3/WAV/OGG up to 8 MB; image sources restricted to own uploads, bundled stickers and KLIPY/GIPHY. |
| **Stickers** | 143 free stickers (Microsoft Fluent Emoji, MIT licence; 119 animated) with DE/TR/EN keywords in their own library tab; text sticker packs TR/DE/EN (27–28 each) with big comic words (OHA, KRASS, SHEESH …). |
| **Performance** | Performance mode auto/eco/high and a single render path: average frame time −63 to −69%, p99 −74 to −80%, DOM nodes −56% (measured with 31 effects in 3 s at 1920×1080); eco mode for weak PCs. |
| **Story mode** | 13 animated full-screen scenes (rain, night, forest, sea, fire, castle, snow, desert, city, space, sunrise, thunderstorm, end scene) with 12 ambience loops (rain, wind, fireplace, birds, sea, thunder, crickets, heartbeat, bells, city, space, storm); characters as stickers; story packs DE/TR/EN; scene pad for manual control. |
| **Effects v2 and themes** | Particles with physics (60 fps with automatic limit), glow, 3D flip cards, impact zoom, light rays; effect types card, image/GIF, emoji rain, banner, confetti, scene, sticker, text (neon/gradient/bounce/glitch), lower third, combo (sequence). Themes Neon, Pastel, Minimal, Children's book. Combos ("krass" 3× in 10 s → confetti) and intensity from the voice. |
| **Sound** | 38 synthetic, royalty-free sounds in groups (impact, funny, magic, ambience); mixer with limiter, ambience ducking, stereo by position, reverb for scenes; volume per trigger; sound-check card against echo. |
| **Viewer triggers** | Twitch chat without login, YouTube Live chat via API key, chat commands (`!airhorn`) with per-viewer and global cooldowns; **gift webhook** with tiers (TikTok coins via TikFinity/Streamer.bot, YouTube Super Chat, Twitch Bits). |
| **Phone** | Remote control as a web app (PWA): all triggers as tiles, scene bar, pause, volume, live transcript; with HTTPS the phone becomes a second microphone. |
| **Offline** | Panel, overlay, demo and phone run without internet (app shell cached); offline speech recognition with Whisper (experimental). |
| **Integration** | OBS/Streamlabs as a browser source → Instagram Live (Live Producer), TikTok LIVE (LIVE Studio or stream key), YouTube Live, Twitch; vertical layout with safe zones for the chat; demo recording without OBS; API for Stream Deck, Streamer.bot, chat bots. |
| **AI (optional)** | Semantic understanding without keywords ("that was so embarrassing" → Awkward) via a language model, with a 1.5 s timeout: better no meme than a late one. |

### 3.3 Version history

| Version | Contents |
|---|---|
| 1.0 | From prototype to program: media library, trigger editor, server-side storage, smart mode, external API, vertical layout, security hardening, tests |
| 1.1 | Meme packs TR/DE/EN, GIF search, demo page without OBS, 26 sounds |
| 1.2 | Dialect tolerance, learning from the stream, diagnostics and self-test |
| 1.3 | Story mode: 13 scenes, 12 ambience loops, story packs in three languages |
| 1.4 | Phone remote, PWA, HTTPS, offline recognition |
| 1.5 | Sound check against echo, automatic language detection DE/TR/EN |
| 1.6 | Effect engine v2, themes, audio mixer, 38 sounds, viewer triggers (chat + gifts), Family and Gaming packs |
| 2.0 | Review and hardening pass, regression tests, business documents (trailer, pitch deck, business plan, landing page DE/TR/EN) |
| 2.1 | Performance mode (frame time −63 to −69%), 143 free stickers (MIT), text sticker packs, packs cleaned up (no religious expressions or flags), safe GIF search KLIPY/GIPHY with content filter (Tenor API discontinued) |

---

## 4. Technology and intellectual property

**Architecture.** LiveFX consists of pure HTML/JavaScript/CSS and a Node.js server **with no external dependencies** (zero-dependency). The server is a composition root with separate modules (router, static, SSE bridge, auth, state, APIs, smart, chat); browser and server share a versioned **trigger schema** (v2) with migration. All interfaces are documented in `docs/CONTRACTS.md`.

**Local instead of cloud.** Speech recognition, matching, rendering and storage run on the creator's computer. Triggers, media and settings stay with the user. There is **no cloud requirement**: browser recognition uses the browser's service, offline mode uses a Whisper model in the browser, and the AI component can optionally be switched on. This reduces operating costs to almost zero, simplifies data protection (GDPR) and makes the product trustworthy for education and families.

**Open API.** Token-protected HTTP routes (`/api/fire`, `/api/transcript`, `/api/gift`, `/api/chat/test`, `/api/triggers`, `/api/assets`) give Stream Deck, Streamer.bot, chat bots, TikFinity and external speech recognition engines access. The same API is the basis for a later native platform integration or a mobile SDK.

**Security.** By default the server listens only locally; write routes require a token or same origin; a host allowlist protects against DNS rebinding; uploads are checked via magic bytes; overlay texts are escaped. Automated unit and end-to-end tests (Playwright) cover schema, matcher, server, APIs, chat, gifts and audio.

**Protectable building blocks (know-how, copyright in the code and content):**

1. Multilingual matcher with accent folding, Damerau-Levenshtein with length gates and stop-word protection ("schön" ≠ "schon"), specificity rules ("oh nein" before "nein"), occurrence counting against double firing on interim results.
2. Curated, language-specific trigger packs (238 triggers) and story packs with collision-free keywords – the content moat.
3. Synthetic sound library (38 sounds, 12 loops) without licence costs or copyright strikes.
4. Scene engine (particle physics, parallax, crossfade) and audio mixer (ducking, panning, reverb).
5. Learning loop from the stream (saving fuzzy hits, assigning sentences without a match).

Registration of the "LiveFX" trademark (DE/EU/TR) is to be examined; the patentability of individual methods (voice-controlled scene overlay with ambience loop) can be clarified with a patent attorney [cost: estimate €5–10k].

---

## 5. Target groups

| Segment | Need | What LiveFX delivers | Maturity |
|---|---|---|---|
| **Entertainment creators TR/DE/EN** (TikTok LIVE, Instagram Live, YouTube, Twitch) | Rhythm and laughs in the stream, hands-free; more watch time → more gifts | Meme packs TR/DE/EN, GIF search, combos, intensity from the voice, gift triggers | today |
| **Live commerce** (product presentations, drops, flash sales) | Product name, "offer", "today only" → sticker, banner, checkout sound; social proof on purchases | Trigger editor, lower third, text effects, gift/webhook tiers for orders | today with custom triggers; pack planned |
| **Read-aloud and family streams** (authors, parents, children's book creators) | Making stories visible; keeping children engaged | Story mode with 13 scenes and ambience, "Family & Kids" pack, "Children's book" theme | today |
| **Education** (teachers, language teaching, tutoring streams, pre-school) | Visualising vocabulary, moods, stories; reward effects | Story packs in three languages, custom triggers ("vocabulary → picture"), usable offline, no cloud | today as a niche; education pack planned |
| **Events and stage** (hosting, weddings, comedy, club evenings) | Effects on cue without a tech crew; phone as remote | PWA remote, soundboard, scene pad, combo sequences | today |
| **Agencies and networks** (creator management, MCNs) | One setup for many creators, brand-compliant packs | Trigger export/import, themes, API | agency licence planned |
| **Platforms (B2B)** | Longer watch time, sticker gifting 2.0, Shorts-ready live clips | Technology and packs as a native feature or SDK | pitch phase |
| **Edtech and language learning** (families, primary schools, German-as-a-second-language and integration courses, Turkish as a heritage language) | Making words visible and audible, reading aid, privacy-friendly without accounts | WordPicture: spoken word → picture + target language + pronunciation, reading aid, repeat-after-me, offline | Vision, prototype available (from 2027) |
| **Read-aloud, audiobook and podcast formats, publishers** | Pictures for pure audio, read-aloud streams with a "film" | Story Film (Generative Scene Engine), companion mode "audiobook with pictures", publisher licence | Vision, prototype available (from the follow-on round, H2 2028) |
| **Video editing** (creators, podcasters, agencies) | Clips and Shorts without hours of editing, without upload | Studio: highlights from the stream, auto-edit of finished videos, local MP4 export | Vision (from the follow-on round, H2 2028) |
| **VR/AR, stage and events** (organisers, libraries, hardware partners) | Effects on cue, immersive storytelling | Stage mode (today), AR on the phone, WebXR and display glasses as a showcase | stage today; AR/XR Vision (2027–2029) |

The launch segment is the **Turkish-speaking creator community** (Turkey and the diaspora in Germany/Europe): the largest pack, hardly any competition, a strong meme culture, and the founder is himself part of this community.

From 2027 the vision (chapter 15) adds three adjacent target groups: **education and language learning** (families, schools, courses), **publishers and audio** (audiobooks, podcasts, reading aloud) and **video editing** (creators and agencies who edit after the fact). Until 2029, VR/AR and glasses are a showcase, not a revenue line of their own.

---

## 6. Market analysis (summary)

The full analysis with all ranges, the Turkey assessment and the price comparison is in `MARKTANALYSE.en.md`. Key data:

| Metric | Range | Source |
|---|---|---|
| Global live streaming market 2026 | USD 97–157bn; forecast USD 250–345bn by 2030 (CAGR ~27%) | [Source 1, 2] |
| Creator economy 2026 | ~USD 216–260bn (CAGR ~22%) | [Source 3, 4] |
| Live streaming share of the creator economy | ~14% ≈ USD 36bn | [Source 3] |
| TikTok LIVE creator growth | > 100m creators went live in SEA/Caucasus/Central Asia in 2025, +77% | [Source 2] |
| Share of gifts in streamer income | ~50% | [Source 5, 6] |
| Gift income (20k–100k followers) | USD 500–3,000/month | [Source 5] |
| Turkey: price per TikTok coin | TRY 0.37–0.43; the platform keeps ~50% | [Source 8, 9, 10] |

**Addressable market (bottom-up, estimate):**

| Level | Assumption | Size (estimate) |
|---|---|---|
| TAM | Active, monetising live creators worldwide on TikTok/Instagram/YouTube/Twitch | 10–20m |
| SAM | Creators in the TR/DE/EN language area who stream via desktop software (OBS, LIVE Studio) or phone remote | 1–3m |
| SOM (year 3) | 0.3–0.5% of SAM as paying users | 5,000–15,000 paying users |

The TAM figure is derived from creator growth in individual regions [Source 2] and the access thresholds (1,000 followers for LIVE [Source 9, 14]) and is deliberately rough; the plan in section 11 is based on the SOM.

**Adjacent markets of the vision (2027–2029):**

| Market | Size | Source | Line |
|---|---|---|---|
| AI video generation and editing | USD 3.67bn in 2026 → USD 24.89bn in 2036 | [Source 23] | Story Film, Studio |
| Video editing software | USD 2.52bn in 2025 → USD 2.68bn in 2026 | [Source 51] | Studio |
| CapCut (reference) | 736m mobile MAU, > USD 1bn in-app revenue 2025 | [Source 52] | Studio |
| Language-learning apps (in-app) | USD 1.54bn in 2025, +18.8% | [Source 33] | WordPicture |
| Language learning overall (incl. classroom) | ≈ USD 84bn in 2025 | [Source 34] | WordPicture |
| Duolingo (reference) | 58.7m daily active users, 12.7m paying (Q2 2026) | [Source 32] | WordPicture |
| Integration courses Germany | 307,000 new participants, 17,204 courses, 18,920 teachers (2025) | [Source 36] | WordPicture |
| Pupils with a family language other than German | 20.4% of under-16s | [Source 37] | WordPicture |
| DigitalPakt 2.0 | €5bn over five years, starting 1 Sep 2026 | [Source 40] | WordPicture, Spaces |
| Audiobooks Germany | €374m in 2025, +13% | [Source 19] | Story Film, Spaces |
| Podcast listeners Germany | 23.8m weekly | [Source 20] | Story Film, Spaces |
| Smart glasses worldwide | 13.6m devices, USD 5.1bn (2026) | [Source 45] | Spaces |

These markets are not included in TAM/SAM/SOM. Their revenues are shown separately in section 11.5; the detailed assessment is in `MARKTANALYSE.en.md`, section "Adjacent markets".

---

## 7. Competition

| | Streamlabs / StreamElements alerts | Sound Alerts | Voicemod | TikTok/Instagram native effects | CapCut / editors | **LiveFX** |
|---|---|---|---|---|---|---|
| **Trigger** | Viewer events (follow, donation, Bits) | Viewers buy a sound (Bits) | Hotkeys, clicks | Manual, before/during live | After recording | **Creator's voice** + viewers + phone + API |
| **Voice-controlled** | no | no | no | no | no | **yes, 3 languages auto** |
| **Multilingual (TR)** | no | no | no | partly (filters) | yes (editing) | yes (85 TR triggers) |
| **Story/scene mode** | no | no | no | no | no | yes (13 scenes, 12 loops) |
| **Runs locally / offline** | cloud | cloud | local | app | app/cloud | **local, offline-capable** |
| **Open API** | limited | no | no | no | no | yes |
| **Gift → effect** | yes | yes | no | stickers | – | yes (webhook, tiers) |
| **Price** | 0 / USD 27/month Ultra / USD 79 Ultra+ [Source 11, 12] | 0 + revenue share | 0 / ~USD 10/month [Source 13] | 0 | 0 / subscription | 0 / €9.99/month |

Other providers in the space: StreamYard (~USD 35/month) and Restream (~USD 16/month) for browser streaming and multistreaming [Source 12] – they supply infrastructure, not live effects from speech.

**Positioning:** LiveFX replaces neither OBS nor Streamlabs; it sits as a layer on top (browser source) and adds the missing trigger to alerts: the voice. For platforms it is the feature a plug-in cannot deliver – native integration into the live camera.

---

## 8. USP

1. **The only trigger that is always there: the voice.** No click, no viewer needed – effects follow what is said in under a second.
2. **Understands dialect and style.** Tolerance levels, learning from the stream, three readings, optional AI understanding without keywords.
3. **Multilingual from day one.** Turkish, German, English with automatic detection – the largest pack is Turkish, not English.
4. **Story mode.** Reading aloud becomes an animated scene with ambience – an unoccupied niche market (authors, parents, teachers).
5. **Local, offline, no licensing risk.** Data stays with the creator, 38 in-house sounds, GIF providers with an API licence.
6. **Open.** Viewer triggers (chat, gifts), phone remote, Stream Deck, external speech recognition, webhooks.
7. **Built in practice.** Developed and tested in the founder's own live streams (sound check, echo warning and safe zones come from real problems).

---

## 9. Business model

| Tier | For whom | Contents | Price |
|---|---|---|---|
| **Free** | All creators | Core function, standard packs, demo recording, phone remote, community support | €0 |
| **Pro** | Active streamers | AI understanding included, all themes and scenes, unlimited viewer triggers, cloud sync of triggers (optional), priority support, no watermarks in demo clips | **€9.99/month** or €79/year |
| **Creator packs** | Free and Pro | Curated meme/story packs (gaming, family, comedy, education, live commerce, regional dialects), later a community marketplace with a 70/30 split | **€2.99–4.99** per pack |
| **Agency licence** | Creator management, networks, education providers | Multi-seat licence, central pack management, brand-compliant themes, onboarding | [€49–149/month] depending on seats (estimate) |
| **B2B platform licence** | Platforms, streaming software providers, broadcasters | Licence or white label of the recognition, scene and pack technology; pilot → licence; SDK | individual |
| **Exit** | ByteDance/TikTok, Meta, Google/YouTube, Logitech/Streamlabs, StreamElements | Acquisition of technology, content and team | – |

**Why this works:** marginal costs are close to zero (local software), and the AI component only costs money with Pro use (≈ $0.004 per classification, i.e. $0.25–0.75 per stream hour at 1–3 sentences per minute – project measurement). Packs are pure content work with high margins and bind the community. The agency licence scales without additional support, and the B2B licence is the route to the actual goal: native integration.

---

## 10. Go-to-market

**Phase 1 – Turkish community (months 1–4).** Launch in the Turkish-speaking market: the founder's own streams as a permanent showcase, 10–20 creator ambassadors with access and a feedback loop via the learning function, a Discord/Telegram group, weekly pack drops. Clips from real streams ("The meme came because I said 'yok artık'") are the marketing – the product is its own advertising medium.

**Phase 2 – DE/EN (months 4–9).** German-speaking creators (Twitch, YouTube, Instagram) and English-speaking early adopters; read-aloud and education streams as a second wing (book trade, libraries, teacher communities). Listings in OBS plug-in directories, the Streamlabs app store and the Stream Deck marketplace.

**Phase 3 – Partners and platforms (months 6–12).** Creator partner programme (revenue share on packs, optional "powered by LiveFX"), agencies, first B2B talks. Pitch deck and demo for the live teams at TikTok, Meta and YouTube.

**Channels**

| Channel | Activity | KPI |
|---|---|---|
| Own streams | LiveFX in every one of the founder's streams, clips as Shorts/Reels | Clips/week, views, downloads |
| Creator partner programme | 10–20 ambassadors TR/DE, revenue share on packs | Active partners, referral sign-ups |
| LinkedIn and press | Introduction articles (DE/TR), trade press on the creator economy/edtech, podcasts | Contacts with platform teams, pilot requests |
| Community | Discord/Telegram, pack drops, learning function as a feedback channel | Active members, submitted triggers |
| Marketplaces | OBS plug-ins, Streamlabs apps, Stream Deck | Installations |
| Education | Read-aloud demos with the children's book theme, teacher webinars | Pilot classes, education packs |

---

## 11. Financial plan (5 years) – estimate

All figures are the founder's **estimates** based on the assumptions below; there is no revenue yet. The basis is the financial model **`LiveFX_Finanzmodell.xlsx`** (sheets: assumptions, 5-year P&L, use of funds, monthly cash flow over 24 months, gates, valuation, sensitivity; generated by `tools/build-finance.py`, key figures in `tools/finance-250k.json`). Timeline: closing of the pre-seed round in January 2027 = month 1; Y1 = 2027 (launch of the Pro subscription) … Y5 = 2031.

### 11.1 Assumptions

| Assumption | Conservative | Base | Optimistic |
|---|---|---|---|
| Registered users (year end) Y1 / Y2 / Y3 | 8,000 / 30,000 / 80,000 | 20,000 / 80,000 / 250,000 | 40,000 / 180,000 / 500,000 |
| Conversion Free → Pro | 3% | 4% | 5% |
| ARPU Pro (net, monthly/annual mix) | €8.50/month | €8.50/month | €8.50/month |
| Pack purchases per year (share of users × 1 pack at avg. €3.99) | 7% | 10% | 12% |
| Agency licences (year end) Y1 / Y2 / Y3 at €49/month | 2 / 8 / 25 | 3 / 15 / 40 | 5 / 30 / 80 |
| B2B pilot/licence | 0 / 0 / €50k | 0 / €50k / €150k | 0 / €100k / €400k |
| Paying Pro users are calculated as an annual average (≈ 50% of the year-end value in Y1, 75% from Y2) | | | |

Years 4–5 are extrapolated in the model: user growth slows down, agency and B2B licences continue, costs grow with team and marketing (workbook, sheet "Annahmen", section B). Costs for Y1–Y2 come from the monthly plan of the €250k round (11.3, 11.6), Y3 from the previous plan.

### 11.2 Revenue (€k) – 5 years

| Scenario | Y1 2027 | Y2 2028 | Y3 2029 | Y4 2030 | Y5 2031 |
|---|---|---|---|---|---|
| Conservative | 16 | 82 | 271 | 432 | 602 |
| **Base** | **51** | **336** | **1,038** | **1,984** | **3,152** |
| Optimistic | 124 | 892 | 2,599 | 4,828 | 7,444 |

Base scenario by revenue stream:

| Base (€k) | Y1 2027 | Y2 2028 | Y3 2029 | Y4 2030 | Y5 2031 |
|---|---|---|---|---|---|
| Pro subscription | 41 | 245 | 765 | 1,463 | 2,324 |
| Creator packs | 8 | 32 | 100 | 180 | 269 |
| Agency licence | 2 | 9 | 24 | 41 | 59 |
| B2B / pilot | 0 | 50 | 150 | 300 | 500 |
| **Total** | **51** | **336** | **1,038** | **1,984** | **3,152** |

Y1–Y3 follow the assumptions in 11.1 unchanged; the conservative agency line is calculated consistently with the formula (Y2 €4.7k instead of €4k, Y3 €14.7k instead of €12k); other differences from earlier versions are rounding.

### 11.3 Costs (€k) – base scenario, lean plan

Up to month 18 the €250k round finances a lean team: one mobile/web developer from month 3, a partial founder salary of €2,000 per month, go-to-market, WordPicture and legal. The build-out team (second developer, backend/ML, community/support) only starts in month 19, after Gate 2 and the follow-on round.

| Item | Y1 2027 | Y2 2028 | Y3 2029 | Previous plan Y1 / Y2 |
|---|---|---|---|---|
| Staff: mobile/web development (1 developer from month 3; 2 people from month 19) | 56 | 113 | 240 | 75 / 160 |
| Staff: backend/ML, community/support (from month 19) | 0 | 30 | 160 | 0 / 60 |
| Founder (salary; €2,000/month until month 18) | 24 | 36 | 60 | 30 / 48 |
| Freelance design/sound → WordPicture line (€37.5k, months 4–15) | 28 | 22 | 40 | 15 / 25 |
| Marketing, creator programme, events, pilots | 32 | 48 | 120 | 25 / 60 |
| Infrastructure, AI API (Pro only), store fees (fixed + share of revenue) | 7 | 30 | 60 | 8 / 25 |
| Legal, trademark, tax, administration | 19 | 16 | 30 | 12 / 20 |
| **Total** | **166** | **295** | **710** | **165 / 398** |

Y4 and Y5 (extrapolated): €1,065k and €1,491k. Total costs in the other scenarios (Y1–Y5, €k): conservative 163 / 196 / 330 / 396 / 455, optimistic 172 / 396 / 1,100 / 1,650 / 2,310.

### 11.4 Result and cash (€k) – 5 years

**EBITDA (result)**

| Scenario | Y1 2027 | Y2 2028 | Y3 2029 | Y4 2030 | Y5 2031 | Cumulative after 5 years |
|---|---|---|---|---|---|---|
| Conservative | −148 | −114 | −59 | +36 | +147 | −138 |
| **Base** | **−116** | **+41** | **+328** | **+919** | **+1,661** | **+2,833** |
| Optimistic | −48 | +496 | +1,499 | +3,178 | +5,134 | +10,259 |

**Cash at year end** (start €250k, without a follow-on round)

| Scenario | Y1 2027 | Y2 2028 | Y3 2029 | Y4 2030 | Y5 2031 |
|---|---|---|---|---|---|
| Conservative | 102 | −11 | −71 | −34 | 112 |
| **Base** | **134** | **175** | **503** | **1,422** | **3,083** |
| Optimistic | 202 | 698 | 2,197 | 5,375 | 10,509 |

Y1/Y2 come from the monthly plan (month 12 and 24); from Y3 onwards, cash = previous year + EBITDA (simplified, without taxes or working capital). From month 19 all scenarios already include the build-out team, although it is only hired with the follow-on round – the conservative case therefore shows the gap that the seed round has to close. Base: operating break-even is sustained from month 22 (Y2); conservative: EBITDA positive from Y4.

**Funding requirement:** €250,000 pre-seed for 18 months (section 11.6); follow-on seed round of about €350,000 after Gate 2.

### 11.5 Additional revenue streams from year 2/3 (estimate)

The vision (chapter 15) is **not** included in tables 11.2–11.4. This table shows it separately, in the base scenario. Y1–Y3 correspond to 2027–2029; the Pro users come from the base case above (avg. 400 / 2,400 / 7,500). All values are estimates in €k.

| Revenue stream | Assumption | Y1 2027 | Y2 2028 | Y3 2029 |
|---|---|---|---|---|
| Pro+ upgrade "Studio & Scenes" (€14.99, net ≈ €4.25/month above Pro) | 10% (from Q3) / 20% / 25% of Pro users | 1 | 24 | 96 |
| Additional conversion from highlights and WordPicture | +0.5 percentage points on registered users, ARPU €8.50 | 5 | 31 | 96 |
| WordPicture Family (€4.99, net ≈ €4.25/month) | avg. 0 / 500 / 2,000 subscriptions | 0 | 26 | 102 |
| School licences (avg. €500/year) | 5 / 40 / 150 schools | 3 | 20 | 75 |
| Course licences (€49 per teacher per year) | 0 / 200 / 800 teachers | 0 | 10 | 39 |
| World and vocabulary packs | in addition to the creator packs | 5 | 25 | 60 |
| Event and stage licences | 20 / 80 / 200 × €299 + 100 / 400 / 1,000 day passes × €29 | 9 | 36 | 89 |
| Publisher licences | 2 / 10 / 30 titles at [€2,000] per title per year | 4 | 20 | 60 |
| **Total additional revenue** | | **≈ 27** | **≈ 192** | **≈ 617** |
| Additional costs (illustration, voice recordings, didactics, education sales, XR prototype) | | 30 | 115 | 210 |
| **Vision contribution margin** | | **≈ −3** | **≈ +77** | **≈ +407** |

**How the vision is funded:** the €250k round finances only the first vision line, **WordPicture** (€37,500, months 4–15, section 11.6); its revenue (family subscription, school and course licences: 2.5 / 55.8 / 216.2 €k in Y1–Y3, base) is carried in the model as a memo item only, i.e. as upside. **Story Film, Studio/auto-edit and Spaces/VR-AR move to the follow-on round**; the model plans €160.5k for them from month 19 to the end of Y3. SDK and platform revenues are **not** counted on top; they are already in the B2B line. XR and glasses are set at €0.

### 11.6 Funding: €250,000 pre-seed

**Requirement:** a **€250,000 pre-seed** round, planned over **18 months** (closing January 2027 = month 1, until June 2028). It finances a lean team, the market launch, the first vision line WordPicture and legal groundwork – up to Gate 2, at which the follow-on seed round is raised. All figures in this section: **Proposal – review with tax/legal advisor.**

**Use of funds over 18 months – Proposal – review with tax/legal advisor**

| Area | Share | Amount | Planned months 1–18 | Contents |
|---|---|---|---|---|
| Team/product: mobile/web developer, partial founder salary, test devices | 50% | €125,000 | €125,000 | Developer from month 3 (16 × €5,500 = €88k), founder 18 × €2,000 = €36k, test devices €1k; goal: Pro subscription, mobile app/PWA, stability of v2.1 |
| Go-to-market: creator programme, community, platform and education pilots | 20% | €50,000 | €50,000 | TR launch, 10–20 ambassadors, pack drops, marketplace listings, DE/EN launch, 1 platform or education pilot |
| First vision line WordPicture (language learning) | 15% | €37,500 | €37,500 | 300 words, reading aid, voice recordings DE/TR/EN, didactic review, course/class pilot (months 4–15) |
| Legal, trademark, data protection | 10% | €25,000 | €25,000 | LiveFX trademark DE/EU/TR, investment agreement, GDPR/DPIA for the school/family profile, youth protection, tax advice |
| Reserve | 5% | €12,500 | – | Not allocated: hiring delays, store/platform approvals; covers fixed infrastructure costs in the no-revenue case |
| **Total** | **100%** | **€250,000** | **€237,500** | |

**Cost lines, months 1–18** (identical in all scenarios)

| Cost line | €/month | Months | One-off | Total months 1–18 |
|---|---|---|---|---|
| Mobile/web developer (full-time) | €5,500 | 3–18 | – | €88,000 |
| Founder salary (partial) | €2,000 | 1–18 | – | €36,000 |
| Development tools, test devices (iOS/Android) | – | – | €1,000 (month 1) | €1,000 |
| Creator programme, community, marketing – phase 1 (TR launch) | €2,000 | 1–6 | – | €12,000 |
| Creator programme, marketing, marketplaces – phase 2 (DE/EN, partners) | €3,000 | 7–18 | – | €36,000 |
| Platform or education pilot (8 weeks, material, travel) | – | – | €2,000 (month 9) | €2,000 |
| WordPicture: illustration, voice recordings DE/TR/EN, didactics, course pilot | €3,125 | 4–15 | – | €37,500 |
| Legal, trademark (DE/EU/TR), data protection/DPIA, youth protection, tax advice | €1,000 | 1–18 | €7,000 (month 1) | €25,000 |
| **Total allocated** | | | | **€237,500** |

**Moved to the follow-on round** (not financed from the €250k): Story Film / story engine (line A), Studio / auto-edit (line D), Spaces / VR-AR (line C), and backend/ML, community/support and a second developer from month 19.

**Runway – monthly cash plan** (workbook, sheet "Liquidität 24M"):

- **With no revenue at all**, the €250k lasts **18 months**: average burn €13,444 per month (months 1–18, incl. fixed infrastructure), cash at the end of month 18 €8,000, first negative month 19.
- With revenue, the scenarios look like this (€k; from month 19 incl. the build-out team):

| Scenario | Cash month 6 | Month 12 | Month 18 | Month 24 | Lowest cash (month) | Runway | Sustained break-even |
|---|---|---|---|---|---|---|---|
| Conservative | 183 | 102 | 49 | −11 | −11 (24) | 22 months (cash-out month 23) | after month 24 |
| **Base** | **191** | **134** | **146** | **175** | **125 (15)** | **> 24 months** | **month 22** |
| Optimistic | 208 | 202 | 369 | 698 | 197 (9) | > 24 months | month 10 |
| No revenue | 179 | 88 | 8 | −62.5 | – | 18 months | – |

In the conservative case, cash falls below the safety buffer of three months' costs in month 19 – this is exactly where the follow-on round has to be in place.

**Follow-on round (seed):** planning guide value **about €350,000** (covers the conservative case, rounded to €50k). Talks start from month 12, closing after Gate 2 (months 15–18, by month 18 at the latest). Minimum need up to the end of Y3:

| €k | Conservative | Base | Optimistic |
|---|---|---|---|
| Safety buffer (3 months of Y3 costs) | 82.5 | 177.5 | 275 |
| Cash at the end of Y3 without a follow-on round | −71 | 503 | 2,197 |
| Liquidity gap (buffer minus lowest cash balance up to the end of Y3) | 153 | 52 | 78 |
| Deferred vision lines (Story Film, Studio, Spaces), month 19 to end of Y3 | 160.5 | 160.5 | 160.5 |
| **Minimum need follow-on round** | **314** | **213** | **239** |

**Valuation: founder offer €2.25M pre-money – negotiation basis; review with tax/legal advisor**

**Offer:** €250,000 for **10.0%** – pre-money **€2.25M**, post-money **€2.5M**, the founder keeps 90%. The offer lies **below all four common pre-revenue reference methods** (€2.35M–3.0M, weighted €2.71M): a fair, investor-friendly entry price below every reference method.

Reference methods (workbook, sheet "Bewertung"; every assumption is sourced and marked there):

| Method | Approach | Pre-money | Weight |
|---|---|---|---|
| Berkus | Modern "moderate 2×" variant: five factors of up to $1M each (valu.vc, icanpitch 2026; $ → € 1:1). Idea 0.7 · prototype/product 0.8 · team 0.5 · strategic relationships 0.25 · launch/revenue 0.1 | €2.35M | 25% |
| Scorecard (Payne) | Reference pre-money €2.5M – the lower part of the DACH pre-seed range (€1.5–5M, upxcale; Germany €1–5M, Capvisory), below the European median (≈ €4.2M, Equidam) – × factor 1.18 (team 1.0 · market 1.4 · product 1.4 · competition 1.3 · sales 0.8 · further funding 1.0 · other 1.2) | €2.95M | 30% |
| VC method | Optimistic (upside) scenario: revenue Y5 €7.44M × exit multiple 6 = exit value €44.7M; ÷ target return 10× × (1 − 40% later dilution) = post-money €2.68M; minus €250k | €2.43M | 20% |
| Risk Factor Summation | Base value €2.5M; twelve risk factors, each ±€250k; sum +2 (development stage, production, competition, technology, international positive; management, sales, fundraising negative) | €3.0M | 25% |
| **Weighted average** | | **€2.71M** | |

**Why €2.25M is justified:**

- **A working product (v2.1), not a concept:** real-time voice → effect, performance mode, safe GIF search; 575+ automated tests and an end-to-end (Playwright) suite – technology risk is largely retired.
- **Own IP and content:** 238 voice triggers, 143 free stickers, text/sticker content and the matcher logic are built in-house; the LiveFX trademark filing (DE/EU/TR) is budgeted.
- **Three languages (DE/TR/EN) incl. a Turkish niche:** hardly any specialised streaming tools in Turkish; the founder's own Turkish community is the launch market.
- **Vision options A–D on the same engine:** Story Film (A), WordPicture language learning (B), Spaces/VR-AR (C), Studio/auto-edit (D) – option value beyond the creator tool.
- **Market size:** live-streaming market USD 97–157bn, SAM 1–3m creators (chapter 6); education/language learning as a second market.
- **Capital efficiency:** product built to v2.1 without external capital; per the model, the €250,000 lasts 18 months to Gate 2.

Honestly against it: solo founder, no revenue and no signed partners yet – which is why the offer sits below every reference method.

**Instrument options – Proposal – review with tax/legal advisor**

- **A. Equity (priced round):** €250,000 at a pre-money valuation of €2.25M = 10.0% (post-money €2.5M).
- **B. Convertible loan / SAFE:** valuation cap €2.25M (pre-money, equal to the offer), 20% discount on the seed price (15–20% negotiable), no interest, conversion in the seed round after about 18 months. Example: seed pre-money €3M → conversion valuation = lower of cap and €3M × (1 − 20%) = €2.25M → stake 10.0%; at the cap the stake never exceeds 10%.

**Sensitivity (base scenario)** – revenue in Y3 and cash; the runway stays above 24 months in every case:

| Case | Revenue Y3 (€k) | Change vs. base | Cash month 18 (€k) | Lowest cash (€k) |
|---|---|---|---|---|
| Base | 1,038 | – | 146 | 125 |
| Conversion −1 point | 847 | −18.4% | 117 | 83 |
| Conversion +1 point | 1,230 | +18.4% | 174 | 140 |
| ARPU −20% | 885 | −14.7% | 123 | 91 |
| ARPU +20% | 1,191 | +14.7% | 169 | 137 |
| Users −30% | 779 | −25.0% | 106 | 65 |
| Users +30% | 1,298 | +25.0% | 186 | 145 |

Market references for the valuation (web research of 4 October 2026, values to be checked before use; the Berkus variant follows valu.vc and icanpitch 2026):

- upxcale (DACH pre-seed range €1.5–5M; Germany typically €0.5–1.5M): https://upxcale.de/blog/pre-seed-funding/
- Capvisory (Germany €1–5M): https://capvisory.de/the-startup-funding-stages-from-pre-seed-to-series-c/
- Equidam (European pre-seed median USD 4.57M): https://www.equidam.com/startup-valuation-delta-q1-2025/
- SaaS Capital (revenue multiples 4.8x / 5.3x): https://www.saas-capital.com/blog-posts/private-saas-company-valuations-multiples/
- Carta (dilution per round): https://carta.com/data/state-of-private-markets-q1-2025/
- Lexr (cap, discount, interest): https://www.lexr.com/en-de/blog/convertible-loan-in-practice-conversion-interest-rate-discount-cap-valuation/
- Vektora (15–25% discount common): https://vektora.eu/de/fachbeitraege/pre-seed-finanzierung-in-deutschland-instrumente-und-prozess

Alternative if the round does not close: bootstrapping – the Pro subscription and packs finance a part-time developer, and growth slows accordingly (roughly the conservative scenario). Funding programmes (EXIST, founder grants, media/edtech funding) are being examined in parallel.

*Version October 2026: ask €250k.*

---

## 12. Team and needs

**Tuncay Sancak – Founder & Inventor, Managing Director.** Invented and built LiveFX. Author and live streamer, German-Turkish; children's book series on neurodiversity (Turkish, with book trailers); product vision and community. Uses LiveFX in every one of his own streams – reading aloud with story mode grew out of his own practice.

**Gönül Demet – Investor Relations.** Contact for investors and the pre-seed round (contact: [Email] · [Phone]).

**Development so far.** Built with AI support, with documented architecture (schema, contracts, design documents), a changelog and automated tests – a state a development team can take over directly.

**Wanted**

| Role | Why | Timing |
|---|---|---|
| **Mobile/web developer** (iOS/Android, WebView/PWA, later SDK) | Reach phone-first creators without OBS; precursor to platform integration | from month 3 (pre-seed) |
| Backend/ML developer | Streaming ASR < 300 ms, offline models, AI understanding as standard | from month 19 (follow-on round) |
| Community and partner management (TR/DE) | Creator partner programme, packs, support | ambassadors from year 1; position from month 19 (follow-on round) |
| **Partnerships** | Platform pilot (TikTok LIVE Studio, Instagram Live Producer, YouTube), streaming software, education providers, publishers | ongoing |
| Advisory board | Creator manager TR, former "Live" product lead at a platform, edtech | year 1 |
| Graphics/web developer (Canvas, WebCodecs) | Story Film renderer, Studio export (Vision) | follow-on round (from month 19) |
| Illustration (children's book style), voice talent DE/TR/EN, didactics | Pronunciation audio and expert review of WordPicture (pre-seed, months 4–15); world packs (follow-on round) | freelance |

---

## 13. Risks and countermeasures

| Risk | Likelihood | Impact | Countermeasure |
|---|---|---|---|
| Platform rebuilds the feature natively | medium | high | Early pitch as pilot/acquisition partner; community packs and multilingualism as a moat; speed; open API as the standard for third-party tools |
| Speech recognition fails with dialect, noise, music | medium | medium | Tolerance levels, learning function, 3 readings, external engines, offline Whisper, phone as second mic, scene pad for manual control |
| Phone-only creators without OBS are left out | high | high | Demo recording without OBS, PWA remote, mobile developer as first hire, platform integration as the goal |
| Copyright in memes/GIFs/sounds | low–medium | medium | In-house synthetic sounds, free MIT-licensed stickers, GIF providers with API licence (KLIPY/GIPHY, linked rather than stored), attribution, community uploads with terms of use |
| Dependence on browser speech recognition (Google service) | medium | medium | Offline Whisper, external API, pluggable engine interface |
| Low willingness to pay among micro-creators | medium | medium | Free tier for reach, packs as a low-threshold purchase, agency and B2B revenue as a second pillar |
| Single-person risk | high | high | Documentation and tests, early hiring, advisory board, partner programme |
| Platform policies (stream key access, chat APIs, quotas) | medium | medium | Several routes per platform (LIVE Studio, stream key, webhook via third-party tools), YouTube quota management, phone fallback |
| Data protection / child protection (family and education segment) | low | high | Local processing without cloud requirement, no accounts needed, children's book theme without tracking |
| The vision spreads the small team too thin | medium | high | Pre-seed funds only WordPicture; Story Film, Studio and Spaces only after Gate 2 with the follow-on round; gates at months 3, 6, 12 and 18; XR only as a showcase |
| Strong competition among language-learning apps and video editors | high | medium | Do not compete as an all-purpose app, but via speech → picture, TR/DE/EN, reading aloud and local processing |
| Long procurement cycles in the education sector | high | medium | Family subscription and publishers carry the first year; school licence via DigitalPakt budgets and media centres |

---

## 14. Milestones

### 14.1 The next 18 months

Month 1 = closing of the pre-seed round in January 2027; month 18 = June 2028.

| Period | Product | Market | Organisation and funding |
|---|---|---|---|
| **Q4 2026** | Version 2.1 (performance mode, 143 free stickers, text sticker packs, safe GIF search), landing page and download package (Windows/Mac), onboarding wizard | Launch in the TR community, 10–20 creator ambassadors, LinkedIn articles DE/TR, marketing video | Pre-seed talks (€250k), register trademark, approach advisory board |
| **Q1 2027** (months 1–3) | Pro subscription live (payment), first creator packs | TR launch (go-to-market phase 1) | Pre-seed closed (month 1); mobile/web developer on board (month 3) – **Gate G0** |
| **Q2 2027** (months 4–6) | Mobile app/PWA, WordPicture with 300 words and reading aid | 20 beta creators TR/DE, community pack upload | **Gate G1** (month 6) |
| **Q3–Q4 2027** (months 7–12) | Marketplace listings (OBS, Streamlabs, Stream Deck), agency licence, education pack | DE/EN launch (phase 2), platform or education pilot (month 9), WordPicture pilot in courses/classes | **Gate G2a** (month 12); seed talks start |
| **H1 2028** (months 13–18) | Stability and AI understanding for Pro, evaluation of the WordPicture pilot | Partners, first paying schools or courses | **Gate G2** (month 18): seed round closed, build-out team from month 19 |

Metrics: registered users, active streamers per week, conversion Free → Pro, monthly recurring revenue, pack revenue, number of partner creators, platform meetings with a follow-up.

### 14.2 Gates for 18 months

All values are **targets (not yet achieved)**. A gate is met if at least the threshold (conservative scenario) is reached; the target is the base scenario. Proposal – to be agreed with investors.

| Gate | KPI | Target (base) | Threshold (conservative) | Optimistic | Releases |
|---|---|---|---|---|---|
| **G0** Start (month 3) | Pro subscription live (payment), mobile/web developer on board | – | – | – | Go-to-market budget phase 2 |
| **G1** Activation (month 6) | Registered users | 10,000 | 4,000 | 20,000 | Mobile app/PWA release |
| G1 (month 6) | Paying Pro users | 400 | 120 | 1,000 |  |
| G1 (month 6) | 20 beta creators TR/DE active, 10–20 ambassadors; WordPicture with 300 words | – | – | – |  |
| G1 (month 6) | Week-4 retention of active streamers ≥ 30% (target, first cohorts) | – | – | – |  |
| **G2a** Traction (month 12) | Registered users | 20,000 | 8,000 | 40,000 | DE/EN expansion, platform talks |
| G2a (month 12) | Paying Pro users (end of Y1) | 800 | 240 | 2,000 |  |
| G2a (month 12) | Monthly recurring revenue in month 12 | €8,073 | €2,500 | €19,820 |  |
| G2a (month 12) | 1 platform or education pilot started; WordPicture pilot in ≥ 3 courses/classes | – | – | – |  |
| **G2** Follow-on round (month 18) | Registered users | 50,000 | 19,000 | 110,000 | Seed round, build-out team from month 19, Story Film/Studio |
| G2 (month 18) | Paying Pro users | 2,000 | 570 | 5,500 |  |
| G2 (month 18) | Monthly recurring revenue in month 18 | €22,586 | €6,495 | €62,473 |  |
| G2 (month 18) | Month-3 retention Pro ≥ 75%; conversion Free → Pro ≥ 3% (threshold) / 4% (target) | – | – | – |  |
| G2 (month 18) | WordPicture pilot evaluated; ≥ 5 paying schools or courses | – | – | – |  |

### 14.3 Vision 2027–2029

The order follows proximity to revenue and funding: the pre-seed round finances only **WordPicture**; Story Film, Studio and Spaces start after Gate 2 with the **follow-on round** (from month 19 = July 2028). Stage and classroom use already works today.

| Period | Product | Market / sales | Gate (metric) |
|---|---|---|---|
| Q4 2026 | Language-learning and live-story prototypes, timeline format LTF v1, vision trailer DE/TR/EN | "Vision" pitch slides, LinkedIn post | Prototypes offline at 60 fps |
| 2027 (pre-seed, months 4–15) | WordPicture with 300 words, reading aid, voice recordings DE/TR/EN, didactic review, repeat-after-me | WordPicture pilot in courses/classes, stage and classroom preset | WordPicture pilot in ≥ 3 courses/classes (G2a) |
| H1 2028 (months 13–18) | Evaluation of the WordPicture pilot, school licence | Listing with media centres, seed round | ≥ 5 paying schools or courses (G2) |
| H2 2028 (follow-on round, from month 19) | Story Film DE (scene director, characters, camera) · timeline log and "Find highlights" · file import and auto-effects | **Pro+ live**, publisher pilot (own series), WordPicture family subscription | Upgrade rate Pro → Pro+ |
| 2029 | Story Film TR/EN and world packs · timeline editor and MP4 export · companion "audiobook with pictures" and AR on the phone · WebXR/glasses prototype · Scene SDK | Publisher programme, platform pitch "Live → Clip", XR/glasses decision, platform pilot or exit talks | Signed platform pilot |

The detailed quarterly plan in `VISION.en.md`, section 10, describes the full vision; where its dates differ, this section applies (lines A, C and D come from the follow-on round).

---

## 15. Future: Generative Scene Engine, language learning, auto-edit, VR/AR

> This chapter describes planned features (**Vision**). The detailed vision document is `VISION.en.md`, the prototypes are in `prototypes/`, and the vision trailer is `video/LiveFX_Vision_en_16x9.mp4` and `video/LiveFX_Vision_en_9x16.mp4` (other languages: `video/LiveFX_Vision_<de|tr|en>_<16x9|9x16>.mp4`).

### 15.1 Core idea: draw, don't generate

LiveFX evolves from a meme overlay into a **visual language for everything spoken**: whatever someone tells, reads aloud or teaches appears in the same second as a continuous scene, as a word picture with pronunciation or as a ready-cut clip. Generative video AI computes every pixel in a data center and, at list price, costs USD 0.05–0.75 per second [Source 24, 25], i.e. USD 180–2,700 per hour of companion video – and it cannot run live. LiveFX translates a sentence into a state delta of 200–500 bytes and **draws** the scene in the browser: €0 without AI, USD 0.25–0.75 per hour with optional text AI (project measurement), 240 to more than 10,000 times cheaper. The result is deliberately a stylised picture-book world, not photorealistic video.

```
Voice/file ─► Transcript ─► Understanding ─► Timeline (LTF) ─► Screens
              (local)       matcher,         one JSON format     stream · classroom · stage
                            scene            for all lines       phone/AR · glasses
                            director,                            Studio export (MP4)
                            opt. AI
```

All four lines share one JSON format, the **LiveFX Timeline (LTF v1)**, and the existing modules (speech recognition, matcher, effect engine, mixer, phone remote). Performance budget: one canvas, ≤ 1,200 particles, world state ≤ 1 KB, target 60 fps on integrated graphics. WebGPU has been available in all major browsers since 2026 [Source 27] and is used only optionally.

### 15.2 The four lines

| Line | What it creates | Technology | Market | Revenue (estimate) |
|---|---|---|---|---|
| **A · Story Film** (Generative Scene Engine) | While someone tells a story or reads aloud, a continuous animated film made of place, time, weather, characters, action and mood appears below or beside the live picture | Scene director translates sentences into state deltas; canvas draws deterministically; lexicon of 300–500 entries per language; AI only optional | Audiobooks DE €374m [Source 19]; 23.8m podcast listeners [Source 20]; AI video USD 3.67bn [Source 23] | Pro, Pro+ €14.99, world packs, publisher licence, Scene SDK |
| **B · WordPicture** (language learning, reading aid) | Spoken word → picture + word in the target language + pronunciation; or as a reading aid in your own language; repeat-after-me without grades | Table lookup, system voices via `speechSynthesis` [Source 29], fallback Piper TTS [Source 44]; offline, no account | Language-learning apps USD 1.54bn [Source 33]; 307,000 new integration-course participants [Source 36]; DigitalPakt 2.0 [Source 40] | Family €4.99/month, school €300–800/year, course €49/teacher, vocabulary packs |
| **C · Spaces** (stage, classroom, audiobook, AR/VR, glasses) | The same timeline on an LED wall, projector, phone (AR, "audiobook with pictures"), VR headset and display glasses | Only new output targets; companion mode without speech recognition; WebXR with DOM overlay [Source 47, 48] | Smart glasses 13.6m devices [Source 45]; tonies €630m [Source 50]; VJ software as price anchor [Source 49] | Event €19–49/day or €299/year, publisher licence; XR set at €0 |
| **D · Studio** (live editing, auto-edit) | Highlights from the stream; finished video in → transcript → effects, memes, scenes, cuts automatically → export | Whisper in the browser [Source 60], WebCodecs with hardware encoder and Mediabunny [Source 57, 58, 59]; no upload | Video editing USD 2.68bn [Source 51]; CapCut 736m MAU [Source 52]; OpusClip, Submagic, Descript as price anchors [Source 53, 54, 55] | Free with watermark, Pro, Pro+ "Studio & Scenes", agency, white label |

### 15.3 Language learning in detail

A child says "Apfel" – 🍎 appears, below it "elma", in small type "der Apfel" with a colour-coded article and syllables, and a voice says "elma". The teacher only chooses "I speak", "Show" and the mode (Translate, Reading aid, Repeat after me). Target groups are families, primary schools (20.4% of pupils under 16 mainly speak another language at home [Source 37]; 25% of fourth-graders fall below the minimum reading standard [Source 39]), German-as-a-second-language and integration courses, and Turkish as a heritage language (2.65m people with a migration background from Turkey [Source 38]). The reading aid connects to the founder's books on neurodiversity. The price anchor is the ANTON school licence at €250–700 per school per year [Source 41]; free competitors are Microsoft Reading Coach [Source 42] and Google Read Along [Source 43]. For schools, the school profile enforces on-device speech recognition (`processLocally`, Chrome 139+ [Source 28]) or offline Whisper.

### 15.4 Auto-edit in detail

LiveFX Studio has two doors: **Live → Highlights** (after the stream, 3–5 short clips at the moments with the most memes, gifts and chat messages) and **Drop a file** (drag an MP4 into the window, LiveFX listens locally, suggests effects, scenes, zooms and cuts as movable chips and exports via the hardware encoder). The preview draws the effects live; rendering happens only once, at export. Because there is no upload and no cloud transcoding, the marginal cost per video is zero and there are no minute quotas. LiveFX does not compete with CapCut as a general-purpose editor, but via speech → effect, story scenes, TR/DE/EN and local processing. In February 2026 Canva acquired Cavalry and MangoAI [Source 56] – a signal that editor providers buy in exactly these kinds of building blocks.

### 15.5 VR/AR and other fields of application

- **Stage and events** (usable today): "Applause!" → confetti on the LED wall; the phone is the director's console.
- **Classroom:** Story Film on the projector, WordPicture on the tablets.
- **Audiobook and podcast with pictures:** companion mode plays a finished timeline in sync with the audio, with no speech recognition on the device at all.
- **AR on the phone** (all phones, including iPhone): the dragon from the story stands on the kitchen table; clips are shared and act as a reach engine.
- **VR and display glasses:** the scene sky as a dome, the WordPicture card in the field of view; Meta opened the Ray-Ban Display to web apps in May 2026 [Source 46]. Until 2029 a showcase and partnership topic, **not a revenue line**.

### 15.6 Pricing architecture (estimate)

| Tier | Price | New through the vision |
|---|---|---|
| Free | €0 | Story Film with one world, WordPicture with 200 words, 3 highlights with watermark |
| Pro | €9.99/month | All basic worlds, band and split, all WordPicture lists, highlights without watermark, live editor |
| Pro+ "Studio & Scenes" | €14.99/month | AI scenes, auto-edit from file, MP4 export, batch, audiobook visualiser |
| WordPicture Family | €4.99/month | Language learning and reading aid without streaming features |
| Packs | €2.99–4.99 | World, vocabulary and style packs |
| Licences | School €300–800/year · course €49/teacher/year · event €19–49/day or €299/year · publisher [€2,000] per title per year (estimate, to be reviewed by the founder) · SDK by agreement | Education, stage, publishers, platforms |

The resulting revenues are shown separately in section 11.5, the milestones in section 14.2.

### 15.7 Why this matters for platforms

Today platforms turn speech into captions, in real time and free of charge. LiveFX turns speech into pictures, scenes, flashcards and cuts with the same compute load. That lets a platform give every live creator a "produced" stream without extra GPU servers – with more than 100m creators who went live on TikTok in just a few regions in 2025 [Source 2]. Every minute of watch time feeds into gifts [Source 5, 8], and Shorts emerge by themselves from every stream timeline: live becomes a source for short-form video.

### 15.8 Risks of the vision

| Risk | Countermeasure |
|---|---|
| Expectation of "AI video like in a commercial" | Position as an animated picture book, style as a strength |
| Ambiguity and metaphors in the Story Film | Negative list, context rules, "safe" reaction, "Back" button |
| System voices missing (e.g. Turkish on older devices) | Self-test, recorded audio, Piper TTS |
| Browser limits with long or 4K videos | Length limit, desktop first, WebM fallback |
| Copyright on export | Only in-house sounds, licensed GIFs, notice in the export dialog |
| Small hardware base for XR and glasses | Showcase only, decision in 2029 based on proven demand |
| Overstating the learning effect | "Supports vocabulary learning", expert review by the edtech advisory board |

---

## 16. Appendix

### 16.1 Sources

1. market.us – Live Streaming Market Report (market size, CAGR 26.7%): https://market.us/report/live-streaming-market/
2. Gyre – Live Streaming Statistics (market size, TikTok LIVE creator growth): https://gyre.pro/blog/live-streaming-statistics-insights-from-platforms-to-profit
3. datarefs – Creator Economy Statistics (USD 216bn, live share ~14%): https://www.datarefs.com/statistics/social-media/creator-economy/
4. New Market Pitch – Creator Economy Market Size (USD 260bn, CAGR 22%): https://newmarketpitch.com/blogs/news/creator-economy-market-size
5. InfluencerFee – TikTok LIVE Gifting Revenue Guide (gift share, USD 500–3,000/month, 50% creator share): https://influencerfee.com/blog/tiktok-live-gifting-revenue-guide/
6. Muvi – How to make money on TikTok LIVE (gift share ~50%): https://www.muvi.com/blogs/how-to-make-money-on-tiktok-live/
7. TTS Vibes – TikTok LIVE Gift Conversion Rate by Viewer: https://insights.ttsvibes.com/tiktok-live-gift-conversion-rate-by-viewer
8. Shopify TR – TikTok ne kadar ödeme yapıyor (coin prices, commission): https://www.shopify.com/tr/blog/tiktok-ne-kadar-odeme-yapiyor
9. Juntire – TikTok canlı yayın para kazanma 2026 (requirements, coin prices): https://juntire.com/blog/tiktok-canli-yayin-para-kazanma-2026
10. Milliyet – TikTok jeton ve hediye fiyatları 2025: https://www.milliyet.com.tr/teknoloji/sosyalmedya/tiktok-jeton-ve-hediye-fiyatlari-2025-tiktok-puan-hesaplamasi-nasil-yapilir-6659460
11. Capterra – Streamlabs (prices): https://www.capterra.com/p/228751/Streamlabs/
12. CreatorStackClub – Streamlabs, StreamYard, Restream (prices): https://www.creatorstackclub.com/software/streamlabs
13. ToolChase – Voicemod (prices, features): https://toolchase.com/tool/voicemod/
14. BIGVU – How to get a TikTok stream key (1,000 followers, 18+): https://bigvu.tv/blog/how-to-get-a-tiktok-stream-key/
15. SMMNut – TikTok LIVE Studio Guide 2026: https://smmnut.com/blog/tiktok-live-studio-guide-2026/
16. OBS Versions – OBS TikTok Live Streaming Guide: https://obs-versions.com/blog/obs-tiktok-live-streaming-guide
17. Instagram – Instagram Live Producer (desktop streaming with OBS): https://about.instagram.com/blog/tips-and-tricks/instagram-live-producer
18. StreamYard – Streaming software for Instagram Live: https://streamyard.com/blog/streaming-software-for-instagram-live
19. Börsenverein – Buchmarkt kompakt 2025/2026 (audiobooks €374m, +13%): https://www.boersenverein.de/fileadmin/bundesverband/dokumente/presse/digitale_pressemappen/WIPK/Buchmarkt_kompakt_2025_2026_Zahlenuebersicht.pdf
20. ARD/ZDF-Medienstudie 2025 (podcasts 34%, 23.8m): https://www.media-perspektiven.de/fileadmin/user_upload/media-perspektiven/pdf/2025/MP_30_2025_ARD_ZDF-Medienstudie_Zuwachs_bei_Podcastnutzung_nach_Jahren_der_Stagnation.pdf
21. TechCrunch – YouTube surpasses 1bn monthly podcast viewers: https://techcrunch.com/2025/02/26/youtube-surpasses-1-billion-monthly-podcast-viewers/
22. Stiftung Lesen – Vorlesemonitor 2024: https://www.stiftunglesen.de/ueber-uns/newsroom/pressemitteilung-detail/vorlesemonitor-2024-jedem-dritten-kind-fehlen-praegende-vorleseerfahrungen
23. Meticulous Research – AI video generation and editing 2026–2036: https://www.meticulousresearch.com/product/ai-video-generation-and-editing-software-market-forecast-6359
24. Google – Gemini API Pricing (Veo 3.1 Lite USD 0.05/s): https://ai.google.dev/gemini-api/docs/pricing
25. Veo 3 API Pricing 2026 (up to USD 0.75/s): https://www.veo3ai.io/blog/veo-3-api-pricing-2026
26. CNBC – Synthesia: valuation and ARR: https://www.cnbc.com/2026/01/26/nvidia-alphabet-vc-arms-back-synthesia.html
27. web.dev – WebGPU in all major browsers: https://web.dev/blog/webgpu-supported-major-browsers
28. Chrome 139 – on-device speech recognition (`processLocally`): https://developer.chrome.com/blog/new-in-chrome-139
29. MDN – SpeechSynthesis: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
30. Google Noto Emoji (Apache 2.0): https://github.com/googlefonts/noto-emoji
31. OpenMoji FAQ (CC BY-SA 4.0): https://openmoji.org/faq/
32. Duolingo – Q2 2026 shareholder letter (SEC): https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm
33. Business of Apps – Language Learning App Market: https://www.businessofapps.com/data/language-learning-app-market/
34. Mordor Intelligence – Language Learning Market: https://www.mordorintelligence.com/industry-reports/language-learning-market
35. GlobeNewswire – Lingokids USD 120m: https://www.globenewswire.com/news-release/2025/09/18/3152590/0/en/Lingokids-raises-120M-in-funding-to-expand-its-position-as-the-1-interactive-app-for-kids.html
36. BAMF – integration course figures 2025: https://www.bamf.de/DE/Themen/Statistik/Integrationskurszahlen/integrationskurszahlen-node.html
37. bpb – pupils with a family language other than German: https://www.bpb.de/themen/bildung/dossier-bildung/519697/schueler-innen-mit-einer-anderen-familiensprache-als-deutsch/
38. Destatis – migration background 2025: https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_128_125.html
39. Deutsches Schulportal – IGLU reading literacy: https://deutsches-schulportal.de/bildungswesen/iglu-studie-lesekompetenz-der-viertklaessler-verschlechtert-sich-deutlich/
40. Deutsches Schulportal – DigitalPakt 2.0: https://deutsches-schulportal.de/bildungswesen/was-hat-der-digitalpakt-schule-bislang-gebracht/
41. ANTON – school licence order documents: https://files.anton.app/files/ANTON-Schullizenz-Bestellunterlagen-DE.pdf
42. Microsoft – Reading Coach: https://techcommunity.microsoft.com/blog/educationblog/reading-coach-the-ai-powered-fluency-practice-tool-is-now-generally-available-in/4291953
43. Google – Read Along: https://readalong.google/
44. Piper TTS: https://github.com/rhasspy/piper
45. IDC – Smart Glasses 2026: https://www.idc.com/resource-center/blog/smart-glasses-surge-the-xr-market-is-rewriting-its-own-rules/
46. gHacks – Meta opens Ray-Ban Display to web apps: https://www.ghacks.net/2026/05/18/meta-opens-ray-ban-display-glasses-to-third-party-developers-through-wearables-toolkit/
47. W3C Immersive Web – WebXR DOM Overlays: https://immersive-web.github.io/dom-overlays/
48. MDN – WebXR Device API: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
49. Resolume – Avenue/Arena prices: https://www.resolume.com/software/avenue-arena
50. Musikwoche – tonies revenue 2025: https://musikwoche.de/recorded-publishing/tonies-steigerte-umsatz-und-gewinn-a2f6b99ac4f426723ff1690ecb65e839/
51. The Business Research Company – Video Editing Software: https://www.thebusinessresearchcompany.com/report/video-editing-software-global-market-report
52. Expanded Ramblings – CapCut statistics (Sensor Tower): https://expandedramblings.com/index.php/capcut/
53. Sacra – OpusClip: https://sacra.com/c/opusclip/
54. ngram – OpusClip vs. Submagic (pricing): https://www.ngram.com/blog/opus-clip-vs-submagic
55. Castmagic – Descript Pricing: https://www.castmagic.io/blog/descript-pricing
56. CNBC – Canva acquires Cavalry and MangoAI: https://www.cnbc.com/2026/02/23/canva-acquires-cavalry-for-motion-graphics-and-mangoai-for-video-ads.html
57. caniuse – WebCodecs: https://caniuse.com/webcodecs
58. WebKit – Features in Safari 26.0 (AudioEncoder): https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
59. Mediabunny: https://mediabunny.dev/
60. Xenova – whisper-web (WebGPU): https://github.com/xenova/whisper-web

Sources 1–18 retrieved on 30 Sep 2026, sources 19–60 on 3 Oct 2026. Product information (numbers of triggers, scenes and sounds, latency, AI costs) comes from the project itself (`CHANGELOG.md`, `README.md`, `docs/`).

### 16.2 Supporting documents

- `LiveFX_Finanzmodell.xlsx` – financial model for the €250k pre-seed (5-year P&L, use of funds, monthly cash flow, gates, valuation, sensitivity; source of the figures in chapter 11)
- `VISION.en.md` – Vision 2027–2029 (Story Film, WordPicture, Spaces, Studio)
- `prototypes/sprachlernen.html`, `prototypes/live-story.html` – vision prototypes
- `video/LiveFX_Vision_en_16x9.mp4`, `video/LiveFX_Vision_en_9x16.mp4` – vision trailer (English; DE/TR versions `video/LiveFX_Vision_*.mp4`)
- `video/LiveFX_Trailer_en_16x9.mp4`, `video/LiveFX_Trailer_en_9x16.mp4` – product trailer (English)
- `MARKTANALYSE.en.md` – detailed market analysis
- `QUELLEN.en.md` – numbered source list
- `LiveFX_Pitch_EN.pptx` (German `LiveFX_Pitch.pptx`, Turkish `LiveFX_Pitch_TR.pptx`), text template `PITCH-DECK.md` – pitch deck
- `LINKEDIN.md` – introduction articles DE/TR
- `../README.md`, `../CHANGELOG.md`, `../docs/` – product documentation
