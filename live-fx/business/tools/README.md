# LiveFX – Werkzeuge für die Geschäftsunterlagen

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

## Typischer Ablauf nach einer Änderung

1. Markdown bzw. Folientext in allen drei Sprachen anpassen (Deutsch ist die Master-Fassung; Quellenverweise DE „[Quelle n]“, TR „[Kaynak n]“, EN „[Source n]“ mit denselben Nummern aus `QUELLEN.md`).
2. Word-Fassungen mit `build-docx.js` neu bauen (drei Aufrufe oben).
3. Deck mit `build-pptx.js` neu bauen.
4. PDFs erzeugen und die geänderten Seiten ansehen.
