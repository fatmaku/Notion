# İki Roman – Produktionspaket für Amazon KDP

Zwei Romane, ein Kunstprojekt: **YOLCU – 1453 Uyanışın Bedeli** (Tuncay Sancak; Arbeitstitel bis 01.10.2026: BEN YOKSAM) und **ŞAHİT** (Mustafa Sefa Güvenir; Arbeitstitel: ŞAHİDİ ARARKEN). Auf den EN/DE-Covern heißen sie THE TRAVELLER / THE WITNESS bzw. DER REISENDE / DER ZEUGE. Im Code und im Analysebericht bleiben die Kürzel BY und SA. Dieses Verzeichnis enthält alles, was für die Veröffentlichung als Taschenbuch (A5) und Kindle-eBook gebraucht wird, dazu Trailer, Marketing und die Analyse beider Bücher.

## Inhalt

| Ordner | Inhalt |
|---|---|
| `cover/out/<BUCH>/<TR|EN|DE>/` | `Fullcover.pdf` (KDP-Wrap), `Frontcover.pdf`, `Backcover.pdf`, `eBook-Cover.jpg` (1600 × 2560), `Vorschau.png`, `Fullcover_Guides.png` (mit Trim-/Beschnitt-/Sicherheitslinien) |
| `cover/out/` | `Doppelansicht_<SPR>.png` (beide Fronten nebeneinander, Faust-Naht), `Panorama_Marketing_<SPR>.png` (sechs Panels, nur für Marketing), `cover_report.json` |
| `interior/out/` | `YOLCU_Innenteil_A5.pdf`, `SAHIT_Innenteil_A5.pdf` (Druck), `YOLCU.epub`, `SAHIT.epub` (Kindle), epubcheck-Berichte, `preview/`, `report.json`. Gebaut aus `YOLCU_TR_v5.docx` und `SAHIT_TR_v6.docx` in `interior/src/` (ŞAHİT v6 = Sefa Abis „Edisyon Tuncay'a“ vom Oktober 2026, integriert; beide Bücher gestrafft, gegengeprüft, korrigiert; Liste in `analyse/Degisiklik_Listesi_v6.md`) |
| `interior/src/` | `YOLCU_TR_v5.docx`, `SAHIT_TR_v6.docx` (aktuelle Manuskripte = Word-Fassung); `v6/` = alle Arbeitsschritte der Fassung v6 als Operationslisten (`merge_straff.sh` baut beide Manuskripte reproduzierbar aus `YOLCU_TR_v4.docx` und Sefas `SAHIT_Edisyon_Sefa_2026-10.docx`); ältere Stufen `YOLCU_TR_v4.docx`, `SAHIT_TR_v5.docx`, `*_v2.docx`, `*_v3.docx`, `SAHIT_TR_v4.docx`, `v2/v3/v4/v5_aenderungen.json`, `v5_duzeltmeler.json` (alle Änderungen maschinenlesbar) |
| `trailer/out/` | 9 Videos `Iki_Roman_Fragman_<16x9_60s|9x16_30s|1x1_30s>_<TR|EN|DE>.mp4`, 9 Untertitel `.srt`, `storyboard/` (Stills), `render_report.txt` |
| `marketing/` | `Marketing_Story_Storyboard_<TR|EN|DE>.pdf` (+ `.md`): Kernbotschaft, KDP-Listing, Keywords, Kategorien, A+, Storyboard, Sprechertext, Musik-Brief, Launch-Plan |
| `analyse/` | `Bewertung_Ben_Yoksam_Sahidi_Ararken.md/.pdf` (Fassung 2, mit adversarialer Gegenprüfung): Logik-, Mystik- und Spannungsbewertung je Buch und als Doppelwerk; `Degisiklik_Listesi_v2.md/.pdf`: Änderungsliste der Manuskriptfassungen v2 und v3 (TR + DE); `jury_ergebnisse.json` (Rohdaten der sechs Jury-Stimmen und der Gegenprüfung); `Sefa_Degisiklikleri_v5.md/.pdf` (Prüfung von Sefas neuer Fassung, TR) + `sefa_v5_pruefung.json`; `Son_Kontrol_Raporu.md/.pdf` (Schlusskontrolle, TR); `Degisiklik_Listesi_v6.md/.pdf` (jede Änderung der Fassungen YOLCU v5 / ŞAHİT v6 mit Begründung, TR + DE-Kurzfassung); `Juri_v6.md/.pdf` + `juri_v6/` (unabhängige Jury der Endfassungen); `build_pdf.py` (Markdown → PDF), `build_degisiklik_v6.sh` |
| `assets/` | Referenzgrafik (1536 × 512) und die 4×-KI-Hochskalierung (Real-ESRGAN), zerlegte Panels, Portraits; `upscaled/*_front_<tr|en|de>.png` = Fronten mit den neu gesetzten Titeln (`cover/titles_on_fronts.py`) |
| `fonts/` | Cinzel, Literata, Cormorant Garamond (SIL OFL) |

## Maße und KDP-Einstellungen

**Taschenbuch (beide Bücher):** Trim **A5 = 148 × 210 mm (5,83 × 8,27 in)**, Innenteil Schwarz-Weiß auf **Creme**, Cover farbig, glänzend oder matt nach Wunsch.

| | YOLCU (BY) | ŞAHİT (SA) |
|---|---|---|
| Seiten (Innenteil-PDF) | **260** | **194** |
| Rückenbreite = Seiten × 0,0635 mm | **16,51 mm** | **12,32 mm** |
| Fullcover-Maß (B × H) | **318,86 × 216,35 mm** (= 2 × 3,175 + 2 × 148 + 16,51) | **314,67 × 216,35 mm** (= 2 × 3,175 + 2 × 148 + 12,32) |
| Beschnitt | 3,175 mm (0,125 in) umlaufend | dito |
| Sicherheitszone Text | ≥ 6,35 mm (0,25 in) vom Trim | dito |
| Rückentext | ≥ 1,6 mm (0,0625 in) von den Rückenkanten; Rückentext ab 79 Seiten erlaubt | dito |
| Barcode-Freifläche | 50,8 × 30,5 mm unten rechts der Rückseite, 6,35 mm von Trim und Rücken (weißes Feld; KDP druckt den Barcode) | dito |
| Innenränder (gespiegelt) | innen 20 mm · außen 15,5 mm · oben 16,5 mm · unten 16,5 mm (KDP-Minimum: innen 12,7 mm bei 151–300 Seiten, außen 6,35 mm) | dito |
| eBook-Cover | 1600 × 2560 px, JPEG, RGB | dito |

Die genauen Zahlen (Seiten, Rücken, Fullcover-Maß) stehen nach jedem Build in `cover/out/cover_report.json` und werden von `build_cover.py` aus `interior/out/report.json` übernommen.

## Cover-Logik (so ist es gebaut)

- Der KDP-Wrap ist immer **[Rückseite | Rücken | Front]** von links nach rechts. Die Referenzgrafik zeigte YOLCU (BEN YOKSAM) spiegelverkehrt; das ist korrigiert.
- Der Faustgruß entsteht, wenn beide Bücher **mit den Fronten nebeneinander liegen: ŞAHİT links, YOLCU rechts**. Das Panorama ist an der Berührungsstelle der Fäuste geteilt (`Doppelansicht_*.png`). Bei ŞAHİT liegt diese Stelle an der Vorderkante: Dort läuft die Front 3,175 mm in den Beschnitt, die Faust reicht auch bei Schnitttoleranz bis an die Kante. Bei YOLCU liegt sie am Rückenfalz, wo es keinen Beschnitt gibt; deshalb läuft das Frontmotiv 1,6 mm in den Rücken (`FOLD_OVERLAP` in `build_cover.py`), damit bei leichtem Falzversatz kein dunkler Rückenstreifen vor der Faust erscheint. An den gedruckten Büchern kann die Berührung um 1–2 mm abweichen; exakt ist sie in der Doppelansicht.
- Beide Rückseiten nutzen dasselbe Template: Portrait oben rückenseitig mit identischer weicher Vignette und Gradation, Text außen, Tagline unten, Barcode-Feld unten rechts.
- Autorennamen und Ornamente der Fronten stammen aus der KI-hochskalierten Referenz. Die Titel (seit der Umbenennung) und Untertitel werden von `cover/titles_on_fronts.py` je Sprache neu gesetzt: alte Rasterschrift ausgemalt, neue goldene Cinzel-Typografie mit Verlauf, Kante, Halo und Schatten im Look der Referenz. Die Genrezeile ist je Sprache Vektortext; Rückseiten und Rücken sind vollständig Vektortext (Cinzel, Literata).

## Upload-Checkliste KDP

1. **Innenteil-PDF** hochladen (`interior/out/*_Innenteil_A5.pdf`), Trim 5,83 × 8,27 in, **ohne Beschnitt**, Schwarz-Weiß, Creme.
2. Seitenzahl aus der KDP-Vorschau mit `cover_report.json` vergleichen (beide Innenteile haben eine gerade Seitenzahl; bei ungerader Zahl hängt `docx2book.py` eine leere Schlussseite an, damit KDP nichts ergänzen muss). Weicht sie trotzdem ab, Cover neu bauen:
   `python3 cover/build_cover.py --pages-by <N> --pages-sa <M>`
3. Im KDP-**Cover-Calculator** (Print Options → „Cover Calculator“) die Maße gegenprüfen; die dort ausgegebene Breite muss mit `Fullcover.pdf` übereinstimmen (Toleranz 0,1 mm).
4. **Fullcover.pdf** hochladen (eine Seite, Fonts eingebettet, RGB, keine Schnittmarken). Barcode-Option: „KDP druckt Barcode“ (die weiße Fläche ist dafür frei).
5. KDP-Vorschau prüfen: Rückentext mittig, nichts in der Beschnittzone abgeschnitten, Faust an der Kante.
6. **eBook**: `interior/out/YOLCU.epub` bzw. `SAHIT.epub` + `cover/out/<BY|SA>/TR/eBook-Cover.jpg`; Kindle-Previewer durchklicken (Inhaltsverzeichnis, Kapitelanfänge, Einschübe).
7. **Druckprobe** bestellen, bevor die Bücher live gehen.

Hinweis: Die KDP-Hilfeseiten waren aus der Build-Umgebung nicht erreichbar; die Werte oben entsprechen dem KDP-Standard (Beschnitt 0,125 in, Creme 0,0025 in/Seite, Randtabelle, Barcode 2 × 1,2 in, eBook-Cover 1600 × 2560). Schritt 3 stellt sicher, dass sie mit dem aktuellen KDP-Stand übereinstimmen.

## Neu bauen

```bash
# Cover (alle Sprachen), Seitenzahlen aus interior/out/report.json
python3 cover/prep_art.py          # nur nötig, wenn sich die Referenzgrafik ändert
python3 cover/titles_on_fronts.py  # Titel je Sprache auf die Fronten setzen (texts.json)
python3 cover/build_cover.py

# Manuskripte v5/v6 aus den Operationslisten neu erzeugen (optional; Ergebnis liegt in interior/src/)
bash interior/src/v6/merge_straff.sh

# Innenteil + ePub (aus YOLCU v5 und ŞAHİT v6; ohne --docx wird das Original-Manuskript gesetzt)
python3 interior/docx2book.py --book BY --pdf --epub --cover cover/out/BY/TR/eBook-Cover.jpg --docx interior/src/YOLCU_TR_v5.docx
python3 interior/docx2book.py --book SA --pdf --epub --cover cover/out/SA/TR/eBook-Cover.jpg --docx interior/src/SAHIT_TR_v6.docx
python3 interior/check_pdf.py interior/out/*_Innenteil_A5.pdf --json interior/out/check_pdf.json

# Trailer (9 Videos + SRT + Stills)
bash trailer/render_all.sh

# Gesamtpaket (ZIP mit Ordnerstruktur, Anleitung 00_OKU_BENI.txt) → out/Iki_Roman_KDP_Paket.zip
bash package.sh

# Marketing-PDFs und Analyse-PDFs
python3 marketing/build_marketing.py
python3 analyse/build_pdf.py analyse/Bewertung_Ben_Yoksam_Sahidi_Ararken.md analyse/Degisiklik_Listesi_v2.md analyse/Sefa_Degisiklikleri_v5.md analyse/Son_Kontrol_Raporu.md
```

Abhängigkeiten: Python 3.11 mit weasyprint, pillow, pypdf, pymupdf, fonttools, numpy, opencv-python-headless, imageio-ffmpeg, epubcheck (Java), markdown, python-docx; Node 22 mit Playwright (Chromium) für den Trailer.

## Grenzen, offen benannt

- Bildmaterial: nur die Referenzgrafik (1536 × 512 px) lag vor. Sie wurde mit Real-ESRGAN 4× hochskaliert (6144 × 2048 px ≈ 240 dpi auf A5). Das ist gut druckbar, aber kein Studio-Original; Typografie und Ornamente sind vektoriell und deshalb scharf. Liegt später ein 300-dpi-Original vor, genügt es, `assets/upscaled/referenz_x4_esrgan.png` zu ersetzen und `prep_art.py` + `build_cover.py` laufen zu lassen.
- Portraits wurden nicht retuschiert, nur identisch beschnitten, gegradet und vignettiert.
- Trailer-Musik ist ein generierter Platzhalter; Sprecherstimme fehlt. Beides ist im Marketing-Dokument als Brief mit Zeitmarken beschrieben.
- Der Innenteil ist ausschließlich Türkisch (keine Übersetzung beauftragt). EN/DE-Cover sind für spätere Übersetzungsausgaben bzw. Marketing gedacht.
