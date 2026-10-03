# LiveFX – Werkzeuge für die Geschäftsunterlagen

> 🇩🇪 Deutsch (unten) · 🇹🇷 [Türkçe](#-türkçe) · 🇬🇧 [English](#-english)

Die Word- und PowerPoint-Fassungen im Ordner `business/` werden aus Quelltexten erzeugt, nicht von Hand gepflegt. Nach jeder Änderung am Markdown bzw. am Folientext einfach neu bauen.

| Werkzeug | Erzeugt | Eingabe |
|---|---|---|
| `build-docx.js` | `BUSINESSPLAN.docx`, `BUSINESSPLAN.tr.docx`, `BUSINESSPLAN.en.docx` (und jedes andere Markdown-Dokument als gestaltetes Word) | `BUSINESSPLAN.md`, `BUSINESSPLAN.tr.md`, `BUSINESSPLAN.en.md` |
| `build-pptx.js` | `LiveFX_Pitch.pptx`, `LiveFX_Pitch_TR.pptx`, `LiveFX_Pitch_EN.pptx` | siehe `build-pptx.js` (Aufruf und Optionen stehen im Kopf der Datei) |

## Installation (einmalig)

Benötigt Node.js 18 oder neuer. Die beiden npm-Pakete gehören nur zu diesen Werkzeugen, nicht zur LiveFX-App (die bleibt abhängigkeitsfrei):

```bash
cd live-fx/business
npm i docx pptxgenjs --prefix tools
```

Das legt `tools/node_modules/` an; die Skripte finden die Pakete dort automatisch. Alternativ funktionieren eine globale Installation, `NODE_PATH=/pfad/zu/node_modules` oder `LIVEFX_NODE_MODULES=/pfad/zu/node_modules`.

Optional, aber empfohlen: **LibreOffice** (`soffice`) und **Poppler** (`pdftotext`, `pdftoppm`). Damit trägt `build-docx.js` die Seitenzahlen ins Inhaltsverzeichnis ein, und man kann das Ergebnis als PDF prüfen.

```bash
# Debian/Ubuntu
sudo apt install libreoffice-writer poppler-utils
# macOS
brew install --cask libreoffice && brew install poppler
```

## build-docx.js – Markdown → Word

```bash
cd live-fx/business
node tools/build-docx.js BUSINESSPLAN.md    BUSINESSPLAN.docx    de
node tools/build-docx.js BUSINESSPLAN.tr.md BUSINESSPLAN.tr.docx tr
node tools/build-docx.js BUSINESSPLAN.en.md BUSINESSPLAN.en.docx en
```

Aufruf: `node tools/build-docx.js <eingabe.md> <ausgabe.docx> <de|tr|en> [--no-pages] [--header "Text"]`

- `de|tr|en` legt die Sprache fest: Rechtschreibprüfung, Titel des Inhaltsverzeichnisses („Inhalt“ / „İçindekiler“ / „Contents“), Kopfzeile („LiveFX – Businessplan · Vertraulich“ / „LiveFX – İş Planı · Gizli“ / „LiveFX – Business Plan · Confidential“, gebildet aus der ersten Überschrift + „Vertraulich“) und Fußzeile („Seite x von y“ / „Sayfa x / y“ / „Page x of y“).
- `--no-pages` überspringt den Probelauf mit LibreOffice; das Inhaltsverzeichnis bleibt dann ohne Seitenzahlen (Einträge sind trotzdem anklickbar).
- `--header "Text"` ersetzt die Kopfzeile, etwa für andere Dokumente: `node tools/build-docx.js VISION.md VISION.docx de --header "LiveFX – Vision · Vertraulich"`.

Was das Skript erzeugt: A4-Titelseite (aus der ersten Überschrift, dem Untertitel, den Meta-Zeilen und den `>`-Hinweisen vor dem ersten `---`), klickbares Inhaltsverzeichnis mit Seitenzahlen (alle `##`-Kapitel), Überschriften als Word-Formatvorlagen (sichtbar im Navigationsbereich), echte Tabellen mit Kopfzeile, die auf jeder Seite wiederholt wird, Zebra-Streifen und rechtsbündigen Zahlenspalten, Aufzählungen und nummerierte Listen, Zitate, Codeblöcke (breite Diagramme werden verkleinert), **fett**, *kursiv*, `Code`, Links und nackte URLs als anklickbare Hyperlinks. Kapitel 1 und der Anhang („Anhang“, „Ek“, „Appendix“) beginnen auf einer neuen Seite.

Markdown-Konventionen der Eingabe (wie in `BUSINESSPLAN.md`):

```
# LiveFX – Businessplan                 ← Titelseite: „LiveFX“ groß, darunter „Businessplan“
**Claim.** Untertitel …                  ← Untertitel
Stand: … · Vertraulich                   ← Meta-Zeilen
> Auch auf Türkisch: … · In English: …   ← Hinweise auf der Titelseite
---                                      ← Ende der Titelseite
## 1. Kapitel                            ← Inhaltsverzeichnis
### 1.1 Unterkapitel
```

Prüfen nach dem Bau:

```bash
soffice --headless --convert-to pdf BUSINESSPLAN.docx    # PDF neben die docx legen
pdftoppm -jpeg -r 60 BUSINESSPLAN.pdf seite                # Seitenbilder seite-01.jpg …
```

In Word aktualisieren sich die Felder für „Seite x von y“ automatisch. Die Seitenzahlen im Inhaltsverzeichnis stammen aus dem LibreOffice-Probelauf und können in Word um eine Seite abweichen, wenn Calibri dort anders umbricht als die Ersatzschrift von LibreOffice.

## build-pptx.js – Pitch-Deck

Siehe `build-pptx.js`: Aufruf, Sprachen (DE/TR/EN) und Ausgabedateien stehen im Kopfkommentar der Datei. Das Deck braucht das Paket `pptxgenjs` aus der Installation oben.

```bash
node tools/build-pptx.js tools/deck-content.de.json LiveFX_Pitch.pptx
node tools/build-pptx.js tools/deck-content.tr.json LiveFX_Pitch_TR.pptx
node tools/build-pptx.js tools/deck-content.en.json LiveFX_Pitch_EN.pptx
```

Optionale Felder in `deck-content.<sprache>.json`:

- `meta.footerNote` – Text vor Marke und Foliennummer in der Fußzeile, z. B. „Vertraulich · Oktober 2026“ / „Gizli · Ekim 2026“ / „Confidential · October 2026“.
- Team-Folie: `second` (`initials`, `name`, `role`, `text`) – zweite Person als eigene Karte unter der Gründer-Karte (Investor Relations).
- Ask-Folie: `funds` (`title`, `items` als `[Bereich, Betrag, Prozent]`) – Mittelverwendung als gestapelter Balken unter den vier Karten.

Sichtprüfung: `soffice --headless --convert-to pdf LiveFX_Pitch.pptx` und `pdftoppm -jpeg -r 50 LiveFX_Pitch.pdf folie`.

## Typischer Ablauf nach einer Änderung

1. Markdown bzw. Folientext in allen drei Sprachen anpassen (Deutsch ist die Master-Fassung; Quellenverweise DE „[Quelle n]“, TR „[Kaynak n]“, EN „[Source n]“ mit denselben Nummern aus `QUELLEN.md`).
2. Word-Fassungen mit `build-docx.js` neu bauen (drei Aufrufe oben).
3. Deck mit `build-pptx.js` neu bauen.
4. PDFs erzeugen und die geänderten Seiten ansehen.

---

## 🇹🇷 Türkçe

`business/` klasöründeki Word ve PowerPoint dosyaları elle düzenlenmez, kaynak metinlerden üretilir. Markdown'da ya da slayt metninde yapılan her değişiklikten sonra yeniden oluşturmak yeterli.

| Araç | Ürettiği | Girdi |
|---|---|---|
| `build-docx.js` | `BUSINESSPLAN.docx`, `BUSINESSPLAN.tr.docx`, `BUSINESSPLAN.en.docx` (ve her Markdown belgesinden biçimlendirilmiş bir Word dosyası) | `BUSINESSPLAN.md`, `BUSINESSPLAN.tr.md`, `BUSINESSPLAN.en.md` |
| `build-pptx.js` | `LiveFX_Pitch.pptx`, `LiveFX_Pitch_TR.pptx`, `LiveFX_Pitch_EN.pptx` | `tools/deck-content.de.json`, `.tr.json`, `.en.json` |

### Kurulum (bir kez)

Node.js 18 ya da üstü gerekir. İki npm paketi yalnızca bu araçlara aittir, LiveFX uygulamasına değil (uygulama bağımlılıksız kalır):

```bash
cd live-fx/business
npm i docx pptxgenjs --prefix tools
```

Bu komut `tools/node_modules/` klasörünü oluşturur; betikler paketleri orada kendiliğinden bulur. Alternatif olarak genel kurulum, `NODE_PATH=/yol/node_modules` ya da `LIVEFX_NODE_MODULES=/yol/node_modules` da çalışır.

İsteğe bağlı ama önerilir: **LibreOffice** (`soffice`) ve **Poppler** (`pdftotext`, `pdftoppm`). Böylece `build-docx.js` içindekiler tablosuna sayfa numaralarını yazar ve sonucu PDF olarak kontrol edebilirsiniz.

### build-docx.js – Markdown → Word

```bash
cd live-fx/business
node tools/build-docx.js BUSINESSPLAN.md    BUSINESSPLAN.docx    de
node tools/build-docx.js BUSINESSPLAN.tr.md BUSINESSPLAN.tr.docx tr
node tools/build-docx.js BUSINESSPLAN.en.md BUSINESSPLAN.en.docx en
```

Kullanım: `node tools/build-docx.js <girdi.md> <çıktı.docx> <de|tr|en> [--no-pages] [--header "Metin"]`

- `de|tr|en` dili belirler: yazım denetimi, içindekiler başlığı („İçindekiler“), üst bilgi (ilk başlık + „Gizli“, ör. „LiveFX – İş Planı · Gizli“) ve alt bilgi („Sayfa x / y“).
- `--no-pages` LibreOffice deneme çalıştırmasını atlar; içindekiler tablosu sayfa numarasız kalır (girdiler yine tıklanabilir).
- `--header "Metin"` üst bilgiyi değiştirir, ör. `node tools/build-docx.js VISION.tr.md VISION.tr.docx tr --header "LiveFX – Vizyon · Gizli"`.

Betik şunları üretir: A4 kapak sayfası (ilk başlık, alt başlık, meta satırları ve ilk `---` öncesindeki `>` notları), sayfa numaralı tıklanabilir içindekiler (tüm `##` bölümleri), Word stilleri olarak başlıklar, her sayfada tekrarlanan başlık satırlı tablolar, listeler, alıntılar, kod blokları, **kalın**, *italik*, bağlantılar. 1. bölüm ve ek („Ek“) yeni sayfada başlar.

Kontrol:

```bash
soffice --headless --convert-to pdf BUSINESSPLAN.tr.docx
pdftoppm -jpeg -r 60 BUSINESSPLAN.tr.pdf sayfa
```

### build-pptx.js – Sunum

```bash
node tools/build-pptx.js tools/deck-content.tr.json LiveFX_Pitch_TR.pptx
```

Tüm görünür metinler JSON dosyasındadır; çeviri yalnızca JSON'daki metin değerlerini değiştirir (alan adları, `layout` ve dizilerin sırası aynı kalır). İsteğe bağlı alanlar: `meta.footerNote` (alt bilgi, ör. „Gizli · Ekim 2026“), ekip slaytında `second` (ikinci kişi kartı: `initials`, `name`, `role`, `text`), talep slaytında `funds` (fon kullanımı çubuğu: `title`, `items` = `[alan, tutar, yüzde]`).

### Değişiklikten sonra tipik akış

1. Markdown'ı ya da slayt metnini üç dilde güncelleyin (Almanca ana sürümdür; kaynaklar DE „[Quelle n]“, TR „[Kaynak n]“, EN „[Source n]“, `QUELLEN.md` ile aynı numaralar).
2. Word sürümlerini `build-docx.js` ile yeniden oluşturun.
3. Sunumu `build-pptx.js` ile yeniden oluşturun.
4. PDF'leri üretip değişen sayfalara bakın.

---

## 🇬🇧 English

The Word and PowerPoint files in `business/` are generated from source text, not edited by hand. After any change to the Markdown or to the slide text, simply rebuild.

| Tool | Produces | Input |
|---|---|---|
| `build-docx.js` | `BUSINESSPLAN.docx`, `BUSINESSPLAN.tr.docx`, `BUSINESSPLAN.en.docx` (and a styled Word file from any other Markdown document) | `BUSINESSPLAN.md`, `BUSINESSPLAN.tr.md`, `BUSINESSPLAN.en.md` |
| `build-pptx.js` | `LiveFX_Pitch.pptx`, `LiveFX_Pitch_TR.pptx`, `LiveFX_Pitch_EN.pptx` | `tools/deck-content.de.json`, `.tr.json`, `.en.json` |

### Installation (one-off)

Requires Node.js 18 or later. The two npm packages belong only to these tools, not to the LiveFX app (which stays dependency-free):

```bash
cd live-fx/business
npm i docx pptxgenjs --prefix tools
```

This creates `tools/node_modules/`; the scripts find the packages there automatically. A global install, `NODE_PATH=/path/to/node_modules` or `LIVEFX_NODE_MODULES=/path/to/node_modules` also work.

Optional but recommended: **LibreOffice** (`soffice`) and **Poppler** (`pdftotext`, `pdftoppm`). With them, `build-docx.js` writes page numbers into the table of contents, and you can check the result as a PDF.

### build-docx.js – Markdown → Word

```bash
cd live-fx/business
node tools/build-docx.js BUSINESSPLAN.md    BUSINESSPLAN.docx    de
node tools/build-docx.js BUSINESSPLAN.tr.md BUSINESSPLAN.tr.docx tr
node tools/build-docx.js BUSINESSPLAN.en.md BUSINESSPLAN.en.docx en
```

Usage: `node tools/build-docx.js <input.md> <output.docx> <de|tr|en> [--no-pages] [--header "Text"]`

- `de|tr|en` sets the language: spell-check, table-of-contents title („Contents“), header (first heading + „Confidential“, e.g. „LiveFX – Business Plan · Confidential“) and footer („Page x of y“).
- `--no-pages` skips the LibreOffice trial run; the table of contents then has no page numbers (entries are still clickable).
- `--header "Text"` replaces the header, e.g. `node tools/build-docx.js VISION.en.md VISION.en.docx en --header "LiveFX – Vision · Confidential"`.

The script produces: an A4 title page (first heading, subtitle, meta lines and the `>` notes before the first `---`), a clickable table of contents with page numbers (all `##` chapters), headings as Word styles, real tables with a header row repeated on every page, lists, quotes, code blocks, **bold**, *italic* and links. Chapter 1 and the appendix („Appendix“) start on a new page.

Check:

```bash
soffice --headless --convert-to pdf BUSINESSPLAN.en.docx
pdftoppm -jpeg -r 60 BUSINESSPLAN.en.pdf page
```

### build-pptx.js – pitch deck

```bash
node tools/build-pptx.js tools/deck-content.en.json LiveFX_Pitch_EN.pptx
```

All visible text lives in the JSON file; translating means changing only the text values in the JSON (field names, `layout` and array order stay the same). Optional fields: `meta.footerNote` (footer text, e.g. „Confidential · October 2026“), `second` on the team slide (a second person card: `initials`, `name`, `role`, `text`), `funds` on the ask slide (use-of-funds bar: `title`, `items` = `[area, amount, percent]`).

### Typical workflow after a change

1. Update the Markdown or slide text in all three languages (German is the master version; sources cited as DE „[Quelle n]“, TR „[Kaynak n]“, EN „[Source n]“ with the same numbers as in `QUELLEN.md`).
2. Rebuild the Word versions with `build-docx.js`.
3. Rebuild the deck with `build-pptx.js`.
4. Generate PDFs and look at the changed pages.
