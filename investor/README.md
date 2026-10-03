# LiveFX – Investor-Paket · Yatırımcı Paketi · Investor Package

Start: `index.html` öffnen · `index.html` dosyasını açın · open `index.html`

---

## Deutsch

Dieser Ordner enthält das Investorenpaket für eine **Pre-Seed-Runde über 500.000 € für LiveFX** – das Produkt LiveFX 2.0 (Stimme → Memes, Sounds und Szenen live im Stream, DE/TR/EN automatisch erkannt, Story-Modus, Zuschauer-Trigger) und alle Vision-Linien: A Erzählfilm (Live-Video aus Worten), B WortBild (Sprachenlernen mit Bild und Aussprache), C Räume (Bühne, Klassenzimmer, AR/VR, Brille), D Studio (Live-Schnitt, Auto-Edit). Gründer & Erfinder, Geschäftsführer: Tuncay Sancak · Investor Relations: Gönül Demet.

| Datei | Inhalt |
|---|---|
| `index.html` | Übersichtsseite mit Umschalter DE/TR/EN; verlinkt alle Unterlagen und die Projektmaterialien in `../live-fx/business/` |
| `INVESTOR-MEMO.de.md` / `.tr.md` / `.en.md` | Investment-Memo: These, Problem, Produkt 2.0, Vision A–D mit Prototypen, Markt, Modell, Wettbewerb, Go-to-Market, Angebot und Mittelverwendung, Gates, Finanzszenario, Risiken, Team, Quellen |
| `LiveFX_Investor_Deck_DE.pptx` / `_TR` / `_EN` | Investor-Deck, 14 Folien |
| `OnePager_DE.pdf` / `_TR` / `_EN` | Eine Seite A4 zum Vorabversand |
| `LiveFX_Investor_Show.html` | Animierte, selbstlaufende Investor-Show (eine Datei, alles eingebettet). `?lang=de\|tr\|en`, `?play` = Auto-Play, `?clean` = ohne Bedienleiste; Pfeiltasten, Leertaste, Tasten 1/2/3 = Sprache |
| `LiveFX_Investor_Show_DE.mp4` / `_TR` / `_EN` | Die Show als Video, 1920 × 1080, 30 fps, mit Musik |
| `assets/` | Screenshots der Prototypen (für Deck und Show) |
| `build-deck.js` + `deck-content.{de,tr,en}.json` | Generator für die Decks (pptxgenjs): `node build-deck.js` |
| `build-onepager.js` | Generator für die One-Pager (Playwright): `node build-onepager.js` |
| `show-template.html` + `build-show.js` | Quelle und Generator der Show (Texte aus `deck-content.*.json`): `node build-show.js` |
| `record-show.js` | Nimmt die Show Bild für Bild auf: `MUSIC=<wav> node record-show.js` (Musik: `node ../live-fx/business/video/music.js 150 <wav>`) |

**Vor dem Versand:** Die Mittelverwendung (250.000 € Team / 100.000 € Vision-Linien / 75.000 € Go-to-Market und Piloten / 50.000 € Recht, Marke, Datenschutz / 25.000 € Reserve) und alle Gate-Werte sind ein **Vorschlag – bitte bestätigen**. Platzhalter `[Zahl]`, `[offen]`, `[E-Mail]`, `[Telefon]`, `[Monat/Jahr]` ausfüllen – nur echte Zahlen. Konditionen (Instrument, Bewertung, Closing) mit Rechts- und Steuerberatung klären. Alle Markt- und Planzahlen stammen aus `../live-fx/business/` (BUSINESSPLAN, MARKTANALYSE, VISION, PITCH-DECK, QUELLEN) und tragen dort die Nummer [Quelle n].

---

## Türkçe

Bu klasör, **LiveFX için 500.000 € tutarındaki pre-seed turunun** yatırımcı paketini içerir: LiveFX 2.0 ürünü (ses → yayında canlı meme, ses efekti ve sahneler; DE/TR/EN otomatik tanıma, hikâye modu, izleyici tetikleyicileri) ve tüm vizyon hatları: A Anlatı Filmi (kelimelerden canlı video), B Kelime-Resim (resim ve telaffuzla dil öğrenme), C Mekânlar (sahne, sınıf, AR/VR, gözlük), D Studio (canlı kurgu, otomatik kurgu). Kurucu & Mucit, Genel Müdür: Tuncay Sancak · Yatırımcı İlişkileri: Gönül Demet.

| Dosya | İçerik |
|---|---|
| `index.html` | DE/TR/EN dil seçicili genel bakış sayfası; tüm belgelere ve `../live-fx/business/` içindeki proje materyallerine bağlantılar |
| `INVESTOR-MEMO.de.md` / `.tr.md` / `.en.md` | Yatırım notu: tez, sorun, ürün 2.0, prototipleriyle vizyon A–D, pazar, model, rekabet, pazara giriş, teklif ve fon kullanımı, kapılar, finansal senaryo, riskler, ekip, kaynaklar |
| `LiveFX_Investor_Deck_DE.pptx` / `_TR` / `_EN` | 14 slaytlık yatırımcı sunumu |
| `OnePager_DE.pdf` / `_TR` / `_EN` | Önceden göndermek için A4 tek sayfa özet |
| `LiveFX_Investor_Show.html` | Animasyonlu, kendi kendine ilerleyen yatırımcı gösterisi (tek dosya, her şey gömülü). `?lang=de\|tr\|en`, `?play` = otomatik oynatma, `?clean` = kontrol çubuğu olmadan; ok tuşları, boşluk, 1/2/3 tuşları = dil |
| `LiveFX_Investor_Show_DE.mp4` / `_TR` / `_EN` | Gösterinin videosu, 1920 × 1080, 30 fps, müzikli |
| `assets/` | Prototiplerin ekran görüntüleri (sunum ve gösteri için) |
| `build-deck.js` + `deck-content.{de,tr,en}.json` | Sunum üreticisi (pptxgenjs): `node build-deck.js` |
| `build-onepager.js` | Tek sayfa özet üreticisi (Playwright): `node build-onepager.js` |
| `show-template.html` + `build-show.js` | Gösterinin kaynağı ve üreticisi (metinler `deck-content.*.json` dosyalarından): `node build-show.js` |
| `record-show.js` | Gösteriyi kare kare kaydeder: `MUSIC=<wav> node record-show.js` (müzik: `node ../live-fx/business/video/music.js 150 <wav>`) |

**Göndermeden önce:** Fon kullanımı (250.000 € ekip / 100.000 € vizyon hatları / 75.000 € pazara giriş ve pilotlar / 50.000 € hukuk, marka, veri koruma / 25.000 € yedek) ve tüm kapı değerleri bir **öneridir – lütfen onaylayın**. `[Sayı]`, `[açık]`, `[E-posta]`, `[Telefon]`, `[Ay/Yıl]` yer tutucularını yalnızca gerçek rakamlarla doldurun. Koşulları (enstrüman, değerleme, kapanış) hukuk ve vergi danışmanlarıyla netleştirin. Tüm pazar ve plan rakamları `../live-fx/business/` içindeki belgelerden (BUSINESSPLAN, MARKTANALYSE, VISION, PITCH-DECK, QUELLEN) alınmıştır ve oradaki [Kaynak n] numarasını taşır.

---

## English

This folder holds the investor package for a **€500,000 pre-seed round for LiveFX** – the LiveFX 2.0 product (voice → live memes, sounds and scenes in the stream, DE/TR/EN auto-detected, story mode, viewer triggers) and every vision line: A Story Film (live video from words), B WordPicture (language learning with picture and pronunciation), C Spaces (stage, classroom, AR/VR, glasses), D Studio (live editing, auto-edit). Founder & Inventor, Managing Director: Tuncay Sancak · Investor Relations: Gönül Demet.

| File | Contents |
|---|---|
| `index.html` | Overview page with a DE/TR/EN switcher; links every document and the project materials in `../live-fx/business/` |
| `INVESTOR-MEMO.de.md` / `.tr.md` / `.en.md` | Investment memo: thesis, problem, product 2.0, vision A–D with prototypes, market, model, competition, go-to-market, offer and use of funds, gates, financial scenario, risks, team, sources |
| `LiveFX_Investor_Deck_DE.pptx` / `_TR` / `_EN` | 14-slide investor deck |
| `OnePager_DE.pdf` / `_TR` / `_EN` | One A4 page to send ahead |
| `LiveFX_Investor_Show.html` | Animated, self-running investor show (one file, everything embedded). `?lang=de\|tr\|en`, `?play` = auto-play, `?clean` = no control bar; arrow keys, space, keys 1/2/3 = language |
| `LiveFX_Investor_Show_DE.mp4` / `_TR` / `_EN` | The show as video, 1920 × 1080, 30 fps, with music |
| `assets/` | Prototype screenshots (for deck and show) |
| `build-deck.js` + `deck-content.{de,tr,en}.json` | Deck generator (pptxgenjs): `node build-deck.js` |
| `build-onepager.js` | One-pager generator (Playwright): `node build-onepager.js` |
| `show-template.html` + `build-show.js` | Show source and generator (texts from `deck-content.*.json`): `node build-show.js` |
| `record-show.js` | Records the show frame by frame: `MUSIC=<wav> node record-show.js` (music: `node ../live-fx/business/video/music.js 150 <wav>`) |

**Before sending:** the use of funds (€250,000 team / €100,000 vision lines / €75,000 go-to-market and pilots / €50,000 legal, trademark, data protection / €25,000 reserve) and all gate values are a **proposal – please confirm**. Fill in the placeholders `[number]`, `[open]`, `[email]`, `[phone]`, `[month/year]` – real figures only. Settle the terms (instrument, valuation, closing) with legal and tax advisers. All market and plan figures come from `../live-fx/business/` (BUSINESSPLAN, MARKTANALYSE, VISION, PITCH-DECK, QUELLEN) and carry the [Source n] number used there.
