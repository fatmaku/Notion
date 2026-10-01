# İki Roman – Produktionspaket für Amazon KDP

Zwei Romane, ein Kunstprojekt: **BEN YOKSAM – 1453 Uyanışın Bedeli** (Tuncay Sancak) und **ŞAHİDİ ARARKEN** (Mustafa Sefa Güvenir). Dieses Verzeichnis enthält alles, was für die Veröffentlichung als Taschenbuch (A5) und Kindle-eBook gebraucht wird, dazu Trailer, Marketing und die Analyse beider Bücher.

## Inhalt

| Ordner | Inhalt |
|---|---|
| `cover/out/<BUCH>/<TR|EN|DE>/` | `Fullcover.pdf` (KDP-Wrap), `Frontcover.pdf`, `Backcover.pdf`, `eBook-Cover.jpg` (1600 × 2560), `Vorschau.png`, `Fullcover_Guides.png` (mit Trim-/Beschnitt-/Sicherheitslinien) |
| `cover/out/` | `Doppelansicht_<SPR>.png` (beide Fronten nebeneinander, Faust-Naht), `Panorama_Marketing_<SPR>.png` (sechs Panels, nur für Marketing), `cover_report.json` |
| `interior/out/` | `BEN_YOKSAM_Innenteil_A5.pdf`, `SAHIDI_ARARKEN_Innenteil_A5.pdf` (Druck), `BEN_YOKSAM.epub`, `SAHIDI_ARARKEN.epub` (Kindle), epubcheck-Berichte, `preview/`, `report.json`. Gebaut aus den **v3-Manuskripten** in `interior/src/` (zehn minimale Korrekturen ohne Plotänderung, Liste in `analyse/Degisiklik_Listesi_v2.md`) |
| `interior/src/` | `*_v3.docx` (aktuelle korrigierte Manuskripte), `*_v2.docx` (erste Korrekturrunde), `v2_aenderungen.json`, `v3_aenderungen.json` (alle Änderungen maschinenlesbar) |
| `trailer/out/` | 9 Videos `Iki_Roman_Fragman_<16x9_60s|9x16_30s|1x1_30s>_<TR|EN|DE>.mp4`, 9 Untertitel `.srt`, `storyboard/` (Stills), `render_report.txt` |
| `marketing/` | `Marketing_Story_Storyboard_<TR|EN|DE>.pdf` (+ `.md`): Kernbotschaft, KDP-Listing, Keywords, Kategorien, A+, Storyboard, Sprechertext, Musik-Brief, Launch-Plan |
| `analyse/` | `Bewertung_Ben_Yoksam_Sahidi_Ararken.md/.pdf` (Fassung 2, mit adversarialer Gegenprüfung): Logik-, Mystik- und Spannungsbewertung je Buch und als Doppelwerk; `Degisiklik_Listesi_v2.md/.pdf`: Änderungsliste der Manuskriptfassungen v2 und v3 (TR + DE); `jury_ergebnisse.json` (Rohdaten der sechs Jury-Stimmen und der Gegenprüfung); `build_pdf.py` (Markdown → PDF) |
| `assets/` | Referenzgrafik (1536 × 512) und die 4×-KI-Hochskalierung (Real-ESRGAN), zerlegte Panels, Portraits |
| `fonts/` | Cinzel, Literata, Cormorant Garamond (SIL OFL) |

## Maße und KDP-Einstellungen

**Taschenbuch (beide Bücher):** Trim **A5 = 148 × 210 mm (5,83 × 8,27 in)**, Innenteil Schwarz-Weiß auf **Creme**, Cover farbig, glänzend oder matt nach Wunsch.

| | BEN YOKSAM | ŞAHİDİ ARARKEN |
|---|---|---|
| Seiten (Innenteil-PDF) | **281** | **200** |
| Rückenbreite = Seiten × 0,0635 mm | **17,84 mm** | **12,70 mm** |
| Fullcover-Maß (B × H) | **320,19 × 216,35 mm** (= 2 × 3,175 + 2 × 148 + 17,84) | **315,05 × 216,35 mm** (= 2 × 3,175 + 2 × 148 + 12,70) |
| Beschnitt | 3,175 mm (0,125 in) umlaufend | dito |
| Sicherheitszone Text | ≥ 6,35 mm (0,25 in) vom Trim | dito |
| Rückentext | ≥ 1,6 mm (0,0625 in) von den Rückenkanten; Rückentext ab 79 Seiten erlaubt | dito |
| Barcode-Freifläche | 50,8 × 30,5 mm unten rechts der Rückseite, 6,35 mm von Trim und Rücken (weißes Feld; KDP druckt den Barcode) | dito |
| Innenränder (gespiegelt) | innen 20 mm · außen 15,5 mm · oben 16,5 mm · unten 16,5 mm (KDP-Minimum: innen 12,7 mm bei 151–300 Seiten, außen 6,35 mm) | dito |
| eBook-Cover | 1600 × 2560 px, JPEG, RGB | dito |

Die genauen Zahlen (Seiten, Rücken, Fullcover-Maß) stehen nach jedem Build in `cover/out/cover_report.json` und werden von `build_cover.py` aus `interior/out/report.json` übernommen.

## Cover-Logik (so ist es gebaut)

- Der KDP-Wrap ist immer **[Rückseite | Rücken | Front]** von links nach rechts. Die Referenzgrafik zeigte BEN YOKSAM spiegelverkehrt; das ist korrigiert.
- Der Faustgruß entsteht, wenn beide Bücher **mit den Fronten nebeneinander liegen: ŞAHİDİ ARARKEN links, BEN YOKSAM rechts**. Das Panorama ist an der Berührungsstelle der Fäuste geteilt; jede Front läuft 3,175 mm über die Naht hinaus in den Beschnitt, damit die Berührung auch bei ±1 mm Schnitttoleranz erhalten bleibt (`Doppelansicht_*.png`).
- Beide Rückseiten nutzen dasselbe Template: Portrait oben rückenseitig mit identischer weicher Vignette und Gradation, Text außen, Tagline unten, Barcode-Feld unten rechts.
- Titel, Autorennamen, Untertitel und Ornamente der Fronten stammen aus der KI-hochskalierten Referenz (Typografie wie freigegeben). Nur die Genrezeile ist je Sprache neu gesetzt (Vektor). Rückseiten und Rücken sind vollständig Vektortext (Cinzel, Literata).

## Upload-Checkliste KDP

1. **Innenteil-PDF** hochladen (`interior/out/*_Innenteil_A5.pdf`), Trim 5,83 × 8,27 in, **ohne Beschnitt**, Schwarz-Weiß, Creme.
2. Seitenzahl aus der KDP-Vorschau mit `cover_report.json` vergleichen. Weicht sie ab (KDP kann eine Leerseite anhängen), Cover neu bauen:
   `python3 cover/build_cover.py --pages-by <N> --pages-sa <M>`
3. Im KDP-**Cover-Calculator** (Print Options → „Cover Calculator“) die Maße gegenprüfen; die dort ausgegebene Breite muss mit `Fullcover.pdf` übereinstimmen (Toleranz 0,1 mm).
4. **Fullcover.pdf** hochladen (eine Seite, Fonts eingebettet, RGB, keine Schnittmarken). Barcode-Option: „KDP druckt Barcode“ (die weiße Fläche ist dafür frei).
5. KDP-Vorschau prüfen: Rückentext mittig, nichts in der Beschnittzone abgeschnitten, Faust an der Kante.
6. **eBook**: `interior/out/<BUCH>.epub` + `cover/out/<BUCH>/TR/eBook-Cover.jpg`; Kindle-Previewer durchklicken (Inhaltsverzeichnis, Kapitelanfänge, Einschübe).
7. **Druckprobe** bestellen, bevor die Bücher live gehen.

Hinweis: Die KDP-Hilfeseiten waren aus der Build-Umgebung nicht erreichbar; die Werte oben entsprechen dem KDP-Standard (Beschnitt 0,125 in, Creme 0,0025 in/Seite, Randtabelle, Barcode 2 × 1,2 in, eBook-Cover 1600 × 2560). Schritt 3 stellt sicher, dass sie mit dem aktuellen KDP-Stand übereinstimmen.

## Neu bauen

```bash
# Cover (alle Sprachen), Seitenzahlen aus interior/out/report.json
python3 cover/prep_art.py        # nur nötig, wenn sich die Referenzgrafik ändert
python3 cover/build_cover.py

# Innenteil + ePub (aus den v3-Manuskripten; ohne --docx wird das Original-Manuskript gesetzt)
python3 interior/docx2book.py --book BY --pdf --epub --cover cover/out/BY/TR/eBook-Cover.jpg --docx interior/src/BEN_YOKSAM_1453_TR_v3.docx
python3 interior/docx2book.py --book SA --pdf --epub --cover cover/out/SA/TR/eBook-Cover.jpg --docx interior/src/SAHIDI_ARARKEN_TR_v3.docx
python3 interior/check_pdf.py interior/out/*_Innenteil_A5.pdf --json interior/out/check_pdf.json

# Trailer (9 Videos + SRT + Stills)
bash trailer/render_all.sh

# Marketing-PDFs und Analyse-PDFs
python3 marketing/build_marketing.py
python3 analyse/build_pdf.py analyse/Bewertung_Ben_Yoksam_Sahidi_Ararken.md analyse/Degisiklik_Listesi_v2.md
```

Abhängigkeiten: Python 3.11 mit weasyprint, pillow, pypdf, pymupdf, fonttools, numpy, opencv-python-headless, imageio-ffmpeg, epubcheck (Java), markdown, python-docx; Node 22 mit Playwright (Chromium) für den Trailer.

## Grenzen, offen benannt

- Bildmaterial: nur die Referenzgrafik (1536 × 512 px) lag vor. Sie wurde mit Real-ESRGAN 4× hochskaliert (6144 × 2048 px ≈ 240 dpi auf A5). Das ist gut druckbar, aber kein Studio-Original; Typografie und Ornamente sind vektoriell und deshalb scharf. Liegt später ein 300-dpi-Original vor, genügt es, `assets/upscaled/referenz_x4_esrgan.png` zu ersetzen und `prep_art.py` + `build_cover.py` laufen zu lassen.
- Portraits wurden nicht retuschiert, nur identisch beschnitten, gegradet und vignettiert.
- Trailer-Musik ist ein generierter Platzhalter; Sprecherstimme fehlt. Beides ist im Marketing-Dokument als Brief mit Zeitmarken beschrieben.
- Der Innenteil ist ausschließlich Türkisch (keine Übersetzung beauftragt). EN/DE-Cover sind für spätere Übersetzungsausgaben bzw. Marketing gedacht.
