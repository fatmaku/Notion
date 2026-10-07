# Social-Media-Paket · Cat Me If You Can

Bilder und Texte, damit das Spiel bekannt wird: 5 Motive × 2 Formate × 6 Sprachen (60 Bilder),
dazu die Link-Vorschau für jede Sprache. Alles wird aus HTML-Vorlagen mit Playwright gerendert.
Es braucht keine fremden Server: Schriften, Logo und Katzen kommen aus `public/`.

| Was | Pfad |
|---|---|
| Social-Bilder (JPEG, Qualität 88, ≤ 350 KB) | `marketing/social/<motiv>-<format>-<sprache>.jpg` |
| Link-Vorschau 1200 × 630 (PNG, ≤ 300 KB) | `public/media/og-<sprache>.png`, `public/media/og.png` (= Englisch) |
| Captions, Alt-Texte, Hashtags, Reels-Hooks, 7-Tage-Plan, Café- und DM-Texte, QR-Sticker | `marketing/CAPTIONS.md` |
| Texte auf den Bildern (alle Sprachen) | `marketing/texts.js` |
| Vorlage (eine Seite für alle Bilder) | `marketing/templates/social.html`, `social.css`, `social.js` |
| Zeichnungen (Skyline, Fähre, Café-Fenster, Karte, Symbole) | `marketing/templates/art.js` |
| Übersicht im Browser | `marketing/templates/gallery.html` |
| Rendern + Prüfen | `marketing/render.js` |

Sprachen: **tr · en · de · ru · ar · fa** (ar und fa von rechts nach links, Schrift Vazirmatn).
Formate: **post** 1080 × 1350 (Feed, 4:5) und **story** 1080 × 1920 (Story, Reel-Cover, 9:16).

## Die fünf Motive

| Motiv | Überschrift (en) | Inhalt |
|---|---|---|
| `cat-me` | Cat me if you can. | Logo im Nachthimmel über Kadıköy, zwei Katzenkarten, Wollknäuel, Fähre. Eine einfache Zeile in der Landessprache. |
| `twenty` | 20 cats = 20% off | Fächer aus Katzenkarten, Abzeichen „20/20“, Gutschein. Partner-Café, nur an diesem Tag. |
| `name-it` | Found it first? You name it. | Sammelkarte „New cat!“ mit dem Namen „Tarçın“ im Kamera-Sucher. |
| `every-cat-counts` | Every cat counts. | Die ernste Seite: „Wie geht es der Katze?“ mit den Zuständen Gesund · Hungrig · Krank · Verletzt, Karte mit gezählten Katzen, drei Schritte bis zu den Freiwilligen. |
| `made-in-kadikoy` | Made in Kadıköy with love for cats | HappyTuncay hat das Spiel im Happy Overthinking Coffee gemacht. Café-Fenster mit Blick auf Kadıköy, Kaffee mit Pfote, zwinkernde Katze. |

Auf jedem Bild: Logo + „Cat Me If You Can“, Ort, Knopf „Play free in your browser“ (übersetzt),
`#CatMeIfYouCan` und die Macher-Zeile aus `docs/BRAND.md` (bei `made-in-kadikoy` steht sie im Text selbst).

## Neu rendern

```bash
cd catmeifyoucan
node marketing/render.js                                   # alles (66 Bilder, ca. 1–2 min)
node marketing/render.js --motif twenty --lang ar,fa       # nur ein Teil
node marketing/render.js --format story --lang de
node marketing/render.js --og                              # nur die Link-Vorschauen
node marketing/render.js --check                           # nur prüfen, nichts schreiben
node marketing/render.js --serve 8940                      # im Browser ansehen
#   Vorlage: http://127.0.0.1:8940/marketing/templates/social.html?motif=name-it&format=story&lang=fa
#   Übersicht: http://127.0.0.1:8940/marketing/templates/gallery.html
```

Benötigt: Node ≥ 20 und Playwright mit Chromium (`test/helpers/playwright.js` findet es).
`ffmpeg` verkleinert die Link-Vorschauen: auf 256 Farben, wenn das Bild dabei praktisch gleich bleibt
(SSIM ≥ 0,985), sonst verlustfrei. Ohne `ffmpeg` bleiben sie unverkleinert (zurzeit knapp unter 300 KB).

## Was `render.js` prüft

Für jedes Bild, sonst endet das Skript mit Fehlercode:

* Kein Text außerhalb des Bildes oder näher als 32 px am Rand (Link-Vorschau: 20 px).
* **Story-Schutzzone:** kein Text in den oberen 220 px und unteren 380 px (dort liegen die
  Bedienelemente von Instagram/TikTok). Dort ist nur Deko (Sterne, Mond, Skyline, Pfotenspur).
* Kein Textüberlauf, keine überlappenden Textblöcke, das Bild verdeckt keinen Text.
* Überschriften passen in die vorgesehene Zahl an Zeilen (sie werden automatisch so groß wie
  möglich gesetzt, Markennamen brechen nie um).
* Kein `text-transform: uppercase`; die Schriften (Unbounded, Manrope bzw. Vazirmatn) sind geladen.
* Dateigröße: JPEG ≤ 350 KB (sonst wird die Qualität schrittweise gesenkt), PNG ≤ 300 KB.

Die Ausgabe zeigt pro Bild Größe, Skalierung der Bild-Bühne und die gewählten Schriftgrößen.

## Texte ändern

1. `marketing/texts.js` bearbeiten. Regeln aus `docs/BRAND.md`: sehr einfache Sätze, Du-Form,
   Satzanfang groß, keine Großbuchstaben-Zeilen, Überschriften höchstens etwa 8 Wörter,
   Markennamen nie übersetzen, Prozent in Landesschreibweise (tr `%20`, de `20 %`, fa `۲۰٪`).
2. `node marketing/render.js --check`, dann rendern.
3. Ein paar Bilder ansehen, vor allem ar und fa.
4. Captions in `marketing/CAPTIONS.md` anpassen, wenn sich die Aussage ändert.

Neues Motiv: Eintrag in `MOTIFS` und `TEXTS` (`texts.js`), eine Bühne in `social.js` (`build()`),
Farben in `social.css` (`.m-<motiv>`).

## Hinweise

* Social-Bilder sind JPEG (Qualität 88, wie in `docs/BRAND.md`), damit sie unter 350 KB bleiben und
  überall hochgeladen werden können. Die Link-Vorschauen bleiben PNG.
* Arabisch nutzt westliche Ziffern wie die Startseite. In den Bildern und auf der Startseite steht
  „20%“ als eigene Einheit (LRI … PDI), damit es überall gleich aussieht. In kopierbarem Text
  (CAPTIONS.md) darf „20%“ nach arabischen Buchstaben als „%20“ erscheinen – laut BRAND.md erlaubt.
* Die Zustands-Symbole sind eigene SVG-Zeichnungen (keine Emoji-Schrift nötig), damit jedes Rendern
  auf jedem Rechner gleich aussieht.
* `{LINK}` in den Captions ist ein Platzhalter. Erst ersetzen, wenn die echte Adresse feststeht.
