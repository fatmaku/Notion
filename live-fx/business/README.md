# LiveFX – Geschäftsunterlagen

Dieser Ordner enthält alles, was LiveFX nach außen vorstellt: Businessplan, Marktanalyse, Pitch-Deck, Marketingvideo, LinkedIn-Texte und Landingpage. Die Produktdokumentation liegt eine Ebene höher (`../README.md`, `../CHANGELOG.md`, `../docs/`).

## Dateien

| Datei | Was es ist | Wofür / wie benutzen |
|---|---|---|
| `BUSINESSPLAN.md` | Vollständiger Businessplan (15 Abschnitte: Executive Summary bis Anhang), Markdown | Lesen und pflegen; Quelle für die Word-Fassung. Platzhalter `[Name]`, `[E-Mail]`, `[Zahl]` ausfüllen. Finanzplan ist eine Schätzung in drei Szenarien. |
| `BUSINESSPLAN.docx` | Word-Fassung des Businessplans mit Titelseite, Inhaltsverzeichnis, Tabellen und Seitenzahlen | An Investoren, Förderstellen, Banken, Plattform-Partner schicken. Nach Änderungen am Markdown neu erzeugen (siehe unten). In Word: Rechtsklick auf das Inhaltsverzeichnis → „Felder aktualisieren“. |
| `MARKTANALYSE.md` | Ausführliche Marktanalyse: Marktgröße mit Spannen, Gifting, Segmente, Türkei, Preisvergleich, Trends, Chancen/Risiken, Fazit | Anhang zum Businessplan, Grundlage für Deck-Folien und Pressegespräche. Zahlen nur mit [Quelle n] verwenden. |
| `QUELLEN.md` | Nummerierte Quellenliste (18 Quellen) mit Rohnotizen und Liste aller eigenen Schätzungen | Beim Zitieren nachschlagen; neue Quellen hier anhängen und die Nummer in den Dokumenten verwenden. |
| `LINKEDIN.md` | LinkedIn-Texte: Artikel (DE, ~600 Wörter), kurzer Post, Hook-Post, türkischer Artikel und Kurzpost, Hashtags, Antwort-Vorlagen für Kommentare | Anekdoten-Platzhalter mit eigenen Erlebnissen füllen, Video anhängen, posten (Reihenfolge im Kopf der Datei). |
| `PITCH-DECK.md` | Text- und Strukturvorlage des Pitch-Decks (12 Folien) | Sprechtext und Folienreihenfolge; Grundlage der PowerPoint-Fassung. |
| `LiveFX_Pitch.pptx` (bzw. `*.pptx`) | Pitch-Deck als PowerPoint | Für Plattform-Pitches (TikTok, Meta, YouTube), Investoren-Gespräche, Wettbewerbe. Folie 4 braucht das Demo-Video. |
| `landing.html` + `landing-assets/` | Landingpage (statische Seite mit Bildern/Assets) | Ordner komplett auf einen Webspace legen oder lokal öffnen; verlinkt Download, Demo-Video und Kontakt. |
| `VIDEO.md` | Skript, Storyboard und Produktionsnotizen zum Marketingvideo | Lesen vor dem Dreh/Export; Sprechtext für die 30-s- und die Langfassung. |
| `video/` | Marketingvideo (Material und Exporte 9:16 und 16:9) | 30-s-Fassung für LinkedIn-Hook-Post und Folie 4; 9:16 für TikTok/Instagram/Shorts. |

## Typische Abläufe

**Investor oder Förderstelle anschreiben:** `BUSINESSPLAN.docx` + Pitch-Deck (PDF-Export) + Link zum Video. Vorher Platzhalter prüfen (`grep -n "\[" BUSINESSPLAN.md`).

**Plattform pitchen (TikTok LIVE Studio, Instagram Live Producer, YouTube):** Pitch-Deck, 30-s-Video, `../PITCH.md` als Einseiter; Businessplan nur auf Nachfrage.

**LinkedIn-Launch:** Reihenfolge und Hashtags in `LINKEDIN.md`; Marktzahlen aus den Posts stehen mit Nummern in `QUELLEN.md` – die Links als ersten Kommentar unter den Post setzen.

**Zahlen aktualisieren:** Neue Quelle in `QUELLEN.md` eintragen (nächste Nummer), dann in `MARKTANALYSE.md` und `BUSINESSPLAN.md` mit `[Quelle n]` zitieren. Produktzahlen (Trigger, Szenen, Sounds) kommen aus `../CHANGELOG.md`.

## Word-Fassung neu erzeugen

`BUSINESSPLAN.docx` wurde aus `BUSINESSPLAN.md` mit einem docx-js-Skript erzeugt (Titelseite, Inhaltsverzeichnis mit Seitenzahlen, echte Tabellen, Kopfzeile, „Seite x von y“). Nach Änderungen am Markdown entweder Claude bitten, die Word-Fassung mit dem docx-Skill neu zu bauen, oder schnell per pandoc:

```bash
cd live-fx/business
pandoc BUSINESSPLAN.md -o BUSINESSPLAN.docx --toc --toc-depth=1
```

(Die pandoc-Variante hat keine Titelseite und keine Seitenzahlen im Fuß; für den Versand die gestaltete Fassung bevorzugen.)

## Stand

Produktstand der Dokumente: **Version 1.6** (siehe `../CHANGELOG.md`). Stand der Marktzahlen: Recherche vom 30.09.2026.
