# LiveFX – Investor-Paket · Yatırımcı Paketi · Investor Package

Start: `index.html` öffnen · `index.html` dosyasını açın · open `index.html`

---

## Deutsch

Dieser Ordner enthält das Investorenpaket für eine **Pre-Seed-Runde über 250.000 € (18 Monate) für LiveFX** – das Produkt LiveFX 2.1 (Stimme → Memes, Sounds und Szenen live im Stream, DE/TR/EN automatisch erkannt, Leistungsmodus, 143 freie Sticker, sichere GIF-Suche) und die Vision-Linien: A Erzählfilm (Live-Video aus Worten), B WortBild (Sprachenlernen mit Bild und Aussprache), C Räume (Bühne, Klassenzimmer, AR/VR, Brille), D Studio (Live-Schnitt, Auto-Edit). Gründer & Erfinder, Geschäftsführer: Tuncay Sancak · Investor Relations: Gönül Demet.

| Datei | Inhalt |
|---|---|
| `index.html` | Übersichtsseite mit Umschalter DE/TR/EN; verlinkt alle Unterlagen und die Projektmaterialien in `../live-fx/business/` |
| `../live-fx/business/LiveFX_Finanzmodell.xlsx` | **Finanzmodell** (Quelle aller Zahlen; Export `../live-fx/business/tools/finance-250k.json`): GuV 5 Jahre, Mittelverwendung, Liquidität 24 Monate, Gates 18 Monate, Bewertung, Sensitivität |
| `INVESTOR-MEMO.de.md` / `.tr.md` / `.en.md` | Investment-Memo: These, Problem, Produkt 2.1, Vision A–D, Markt, Modell, Wettbewerb, Go-to-Market, Angebot 250.000 € (Mittelverwendung, Runway, Folgerunde), GuV 5 Jahre, Bewertung, Gates, Roadmap, Risiken, Team, Quellen |
| `LiveFX_Investor_Deck_DE.pptx` / `_TR` / `_EN` | Investor-Deck, 15 Folien |
| `OnePager_DE.pdf` / `_TR` / `_EN` | Eine Seite A4 zum Vorabversand |
| `LiveFX_Investor_Show.html` | Animierte, selbstlaufende Investor-Show (eine Datei, alles eingebettet). `?lang=de\|tr\|en`, `?play` = Auto-Play, `?clean` = ohne Bedienleiste; Pfeiltasten, Leertaste, Tasten 1/2/3 = Sprache |
| `LiveFX_Investor_Show_DE.mp4` / `_TR` / `_EN` | Die Show als Video, 1920 × 1080, 30 fps, mit Musik, 1:50 Minuten (12 Folien) |
| `assets/` | Screenshots der Prototypen (für Deck und Show) |
| `build-deck.js` + `deck-content.{de,tr,en}.json` | Generator für die Decks (pptxgenjs): `node build-deck.js` |
| `build-onepager.js` | Generator für die One-Pager (Playwright): `node build-onepager.js` |
| `show-template.html` + `build-show.js` | Quelle und Generator der Show (Texte aus `deck-content.*.json`): `node build-show.js` |
| `record-show.js` | Nimmt die Show Bild für Bild auf: `MUSIC=<wav> node record-show.js` (Musik: `node ../live-fx/business/video/music.js 115 <wav>`) |

**Vor dem Versand:** Die Mittelverwendung (125.000 € Team/Produkt / 50.000 € Markteintritt / 37.500 € WortBild / 25.000 € Recht, Marke, Datenschutz / 12.500 € Reserve) und alle Gate-Werte sind ein Vorschlag. Bewertung: **Angebot der Gründer 2,25 Mio. € Pre-Money, 2,5 Mio. € Post-Money, 10 % für Investor:innen** (Alternative SAFE: Cap 2,25 Mio. €, 20 % Discount) – **Verhandlungsrahmen; mit Steuer-/Rechtsberater prüfen**. Platzhalter `[Zahl]`, `[offen]`, `[E-Mail]`, `[Telefon]`, `[Monat/Jahr]` ausfüllen – nur echte Zahlen. Konditionen (Instrument, Closing) mit Rechts- und Steuerberatung klären. Alle Finanzzahlen stammen aus dem Finanzmodell, Markt- und Planzahlen aus `../live-fx/business/` (BUSINESSPLAN, MARKTANALYSE, VISION, PITCH-DECK, QUELLEN) und tragen dort die Nummer [Quelle n].

---

## Türkçe

Bu klasör, **LiveFX için 250.000 € tutarındaki (18 ay) pre-seed turunun** yatırımcı paketini içerir: LiveFX 2.1 ürünü (ses → yayında canlı meme, ses efekti ve sahneler; DE/TR/EN otomatik tanıma, performans modu, 143 ücretsiz çıkartma, güvenli GIF araması) ve vizyon hatları: A Anlatı Filmi (kelimelerden canlı video), B Kelime-Resim (resim ve telaffuzla dil öğrenme), C Mekânlar (sahne, sınıf, AR/VR, gözlük), D Studio (canlı kurgu, otomatik kurgu). Kurucu & Mucit, Genel Müdür: Tuncay Sancak · Yatırımcı İlişkileri: Gönül Demet.

| Dosya | İçerik |
|---|---|
| `index.html` | DE/TR/EN dil seçicili genel bakış sayfası; tüm belgelere ve `../live-fx/business/` içindeki proje materyallerine bağlantılar |
| `../live-fx/business/LiveFX_Finanzmodell.xlsx` | **Finans modeli** (tüm rakamların kaynağı; dışa aktarım `../live-fx/business/tools/finance-250k.json`): 5 yıllık gelir tablosu, fon kullanımı, 24 aylık nakit akışı, 18 aylık kapılar, değerleme, duyarlılık |
| `INVESTOR-MEMO.de.md` / `.tr.md` / `.en.md` | Yatırım notu: tez, sorun, ürün 2.1, vizyon A–D, pazar, model, rekabet, pazara giriş, 250.000 € teklif (fon kullanımı, nakit ömrü, sonraki tur), 5 yıllık gelir tablosu, değerleme, kapılar, yol haritası, riskler, ekip, kaynaklar |
| `LiveFX_Investor_Deck_DE.pptx` / `_TR` / `_EN` | 15 slaytlık yatırımcı sunumu |
| `OnePager_DE.pdf` / `_TR` / `_EN` | Önceden göndermek için A4 tek sayfa özet |
| `LiveFX_Investor_Show.html` | Animasyonlu, kendi kendine ilerleyen yatırımcı gösterisi (tek dosya, her şey gömülü). `?lang=de\|tr\|en`, `?play` = otomatik oynatma, `?clean` = kontrol çubuğu olmadan; ok tuşları, boşluk, 1/2/3 tuşları = dil |
| `LiveFX_Investor_Show_DE.mp4` / `_TR` / `_EN` | Gösterinin videosu, 1920 × 1080, 30 fps, müzikli, 1:50 dakika (12 slayt) |
| `assets/` | Prototiplerin ekran görüntüleri (sunum ve gösteri için) |
| `build-deck.js` + `deck-content.{de,tr,en}.json` | Sunum üreticisi (pptxgenjs): `node build-deck.js` |
| `build-onepager.js` | Tek sayfa özet üreticisi (Playwright): `node build-onepager.js` |
| `show-template.html` + `build-show.js` | Gösterinin kaynağı ve üreticisi (metinler `deck-content.*.json` dosyalarından): `node build-show.js` |
| `record-show.js` | Gösteriyi kare kare kaydeder: `MUSIC=<wav> node record-show.js` (müzik: `node ../live-fx/business/video/music.js 115 <wav>`) |

**Göndermeden önce:** Fon kullanımı (125.000 € ekip/ürün / 50.000 € pazara giriş / 37.500 € Kelime-Resim / 25.000 € hukuk, marka, veri koruma / 12.500 € yedek) ve tüm kapı değerleri bir öneridir. Değerleme: **kurucu teklifi 2,25 milyon € yatırım öncesi, 2,5 milyon € yatırım sonrası, yatırımcılara %10** (alternatif SAFE: tavan 2,25 milyon €, %20 iskonto) – **pazarlık aralığı; vergi/hukuk danışmanıyla kontrol edin**. `[Sayı]`, `[açık]`, `[E-posta]`, `[Telefon]`, `[Ay/Yıl]` yer tutucularını yalnızca gerçek rakamlarla doldurun. Koşulları (enstrüman, kapanış) hukuk ve vergi danışmanlarıyla netleştirin. Tüm finansal rakamlar finans modelinden; pazar ve plan rakamları `../live-fx/business/` içindeki belgelerden (BUSINESSPLAN, MARKTANALYSE, VISION, PITCH-DECK, QUELLEN) alınmıştır ve oradaki [Kaynak n] numarasını taşır.

---

## English

This folder holds the investor package for a **€250,000 pre-seed round (18 months) for LiveFX** – the LiveFX 2.1 product (voice → live memes, sounds and scenes in the stream, DE/TR/EN auto-detected, performance mode, 143 free stickers, safe GIF search) and the vision lines: A Story Film (live video from words), B WordPicture (language learning with picture and pronunciation), C Spaces (stage, classroom, AR/VR, glasses), D Studio (live editing, auto-edit). Founder & Inventor, Managing Director: Tuncay Sancak · Investor Relations: Gönül Demet.

| File | Contents |
|---|---|
| `index.html` | Overview page with a DE/TR/EN switcher; links every document and the project materials in `../live-fx/business/` |
| `../live-fx/business/LiveFX_Finanzmodell.xlsx` | **Finance model** (source of every figure; export `../live-fx/business/tools/finance-250k.json`): 5-year P&L, use of funds, monthly cash flow 24 months, gates 18 months, valuation, sensitivity |
| `INVESTOR-MEMO.de.md` / `.tr.md` / `.en.md` | Investment memo: thesis, problem, product 2.1, vision A–D, market, model, competition, go-to-market, €250,000 offer (use of funds, runway, follow-on), 5-year P&L, valuation, gates, roadmap, risks, team, sources |
| `LiveFX_Investor_Deck_DE.pptx` / `_TR` / `_EN` | 15-slide investor deck |
| `OnePager_DE.pdf` / `_TR` / `_EN` | One A4 page to send ahead |
| `LiveFX_Investor_Show.html` | Animated, self-running investor show (one file, everything embedded). `?lang=de\|tr\|en`, `?play` = auto-play, `?clean` = no control bar; arrow keys, space, keys 1/2/3 = language |
| `LiveFX_Investor_Show_DE.mp4` / `_TR` / `_EN` | The show as video, 1920 × 1080, 30 fps, with music, 1:50 minutes (12 slides) |
| `assets/` | Prototype screenshots (for deck and show) |
| `build-deck.js` + `deck-content.{de,tr,en}.json` | Deck generator (pptxgenjs): `node build-deck.js` |
| `build-onepager.js` | One-pager generator (Playwright): `node build-onepager.js` |
| `show-template.html` + `build-show.js` | Show source and generator (texts from `deck-content.*.json`): `node build-show.js` |
| `record-show.js` | Records the show frame by frame: `MUSIC=<wav> node record-show.js` (music: `node ../live-fx/business/video/music.js 115 <wav>`) |

**Before sending:** the use of funds (€125,000 team/product / €50,000 go-to-market / €37,500 WordPicture / €25,000 legal, trademark, data protection / €12,500 reserve) and all gate values are a proposal. Valuation: **founder offer €2.25M pre-money, €2.5M post-money, 10% for investors** (alternative SAFE: €2.25M cap, 20% discount) – **negotiation range; review with tax/legal advisor**. Fill in the placeholders `[number]`, `[open]`, `[email]`, `[phone]`, `[month/year]` – real figures only. Settle the terms (instrument, closing) with legal and tax advisers. All financial figures come from the finance model; market and plan figures come from `../live-fx/business/` (BUSINESSPLAN, MARKTANALYSE, VISION, PITCH-DECK, QUELLEN) and carry the [Source n] number used there.
