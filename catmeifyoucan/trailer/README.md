# Trailer · Cat Me If You Can

26 Sekunden Motion Graphics (flach mit leichtem 3D), 30 fps, in 6 Sprachen (tr · en · de · ru · ar · fa)
und 2 Formaten: **16:9** (1920 × 1080, Startseite/YouTube) und **9:16** (1080 × 1920, Reels/TikTok/Shorts).
Keine Sprecherstimme, nur große, sehr einfache Texte und eine selbst erzeugte, lizenzfreie Musik.

| Ergebnis | Pfad |
|---|---|
| Videos | `public/media/trailer-16x9-<lang>.mp4`, `public/media/trailer-9x16-<lang>.mp4` |
| Standbilder (Poster) | `public/media/trailer-16x9-<lang>.jpg`, `public/media/trailer-9x16-<lang>.jpg` |

Jedes Video: H.264 High, yuv420p (BT.709), AAC 128 kbit/s Stereo, `+faststart`, ≤ 6 MB (zurzeit ca. 5 MB).

## Neu rendern

```bash
cd catmeifyoucan
node trailer/render.js --lang en --format 16x9     # ein Video (~1,5 min)
node trailer/render.js --all                       # alle 12 Videos (~9 min mit --jobs 3)
node trailer/render.js --lang ar,fa --format 9x16 --jobs 2
node trailer/check.js                              # Layout-Prüfung aller Sprachen/Formate (ohne Video)
node trailer/preview.js --lang de --format 9x16 --t 2.7,10.6,25.5 --out /tmp/frames   # Einzelbilder
node trailer/serve.js 8930                         # Szene im Browser: /trailer/scene.html?lang=tr&format=9x16&t=8
```

Benötigt: Node ≥ 20, Playwright mit Chromium (`test/helpers/playwright.js` findet es), `ffmpeg`.
Für die Zustands-Symbole (😺 🍽️ 🤒 🩹, wie im Spiel) braucht Chromium eine Farb-Emoji-Schrift
(z. B. Noto Color Emoji). Alles andere kommt aus `public/` (Schriften, Logo, Katzen aus `js/avatar.js`).

## Dateien

| Datei | Aufgabe |
|---|---|
| `texts.js` | Alle Texte in 6 Sprachen (≤ 6 Wörter pro Zeile, Regeln aus `docs/BRAND.md`) |
| `timeline.js` | Zeitplan der Szenen und Ereignisse – gemeinsam für Bild und Ton |
| `scene.html`, `scene.css`, `scene.js` | Die Szene. Jedes Bild ist eine reine Funktion der Zeit: `window.renderAt(t)` |
| `music.js` | Musik + Geräusche als WAV (synthetisch, C-Dur, 120 BPM, Ein-/Ausblenden) |
| `render.js` | Rendert Bild für Bild mit Playwright, schickt JPEGs an ffmpeg, mischt die Musik dazu |
| `serve.js` | Kleiner Server: `/trailer/*` aus diesem Ordner, alles andere aus `public/` |
| `check.js`, `preview.js` | Prüfen: Text im Bild und in der 9:16-Schutzzone, Einzelbilder |

## Ablauf (Botschaften in der Reihenfolge von BRAND.md, Abschnitt 5)

| Zeit | Szene | Text (en) |
|---|---|---|
| 0–3 s | Nacht über Kadıköy: Altstadt-Silhouette, Fähre, Mond, Katzenaugen gehen auf | Kadıköy is full of street cats. |
| 3–7 s | Handy-Sucher rastet auf die Katze ein, Wollknäuel fliegt, Verschluss klickt (kein Blitz), „+1 KediDex“ | Take a photo. · It joins your KediDex. |
| 7–11 s | Sammelkarte dreht sich (3D), „New cat!“, der Name „Duman“ wird getippt, Konfetti | Found it first? You name it. |
| 11–16 s | Tagesziel füllt sich 1 → 20, dann Kaffeetasse mit „20%“ | 20 cats in one day = 20% off · Partner café. Same day only. |
| 16–21 s | Die ernste Seite: Karte mit Punkten (wir zählen), Karte der Katze mit Chips Gesund/Hungrig/Krank/Verletzt, Herz, Freiwillige:r kommt | Every photo helps. We count. We help. · Volunteers see it and help. |
| 21–26 s | Abspann: Logo, „Cat Me If You Can“, Slogan „Cat me if you can.“, „Kadıköy · Play in your browser“, Verhaltensregeln, Macher-Zeile | Photos only · No touching, no chasing · No flash |

Gestaltung: Farben/Schriften aus BRAND.md Abschnitt 7 (Unbounded, Manrope, Vazirmatn für ar/fa),
Logo `public/icons/logo.svg`, Katzen aus `catAvatarSvg()`. Bewegung weich (ease-out), nichts blinkt.
Die Verhaltensregeln („nur Fotos · nicht anfassen, nicht jagen · kein Blitz“, Wortlaut wie auf der Startseite) stehen im Abspann; der Auslöser in
Szene 2 ist deshalb ein Verschluss und **kein** Blitz.

## Formate

* **16:9:** Text auf der Startseite der Leserichtung (links, bei ar/fa rechts), Bild daneben.
* **9:16:** Bild oben, Text unten, neu gesetzt (nicht beschnitten). Kein Text in den oberen 220 px
  und unteren 380 px und mindestens 100 px Abstand zum Seitenrand (Textspalte 840 px, je 120 px Rand):
  Dort liegen die Bedienelemente von Reels/TikTok/Shorts. `check.js` prüft das.
* Verhaltensregeln und Macher-Zeile brechen nur am „ · “ um (der Punkt wird dann zum Zeilenumbruch).
* Die Karte mit den Zustands-Chips wächst mit langen Texten (ru, ar) nach links; `check.js` prüft,
  dass jeder Chip ganz in der Karte liegt.
* Überschriften werden automatisch so groß wie möglich gesetzt; zu lange Zeilen brechen höchstens
  einmal um (Markennamen nie).

## Ändern

* **Texte:** `texts.js`. Danach `node trailer/check.js`, dann neu rendern.
* **Timing:** `timeline.js` (Bild und Musik ziehen automatisch mit).
* **Poster:** `POSTER_T` in `render.js` (zurzeit 10,6 s = Sammelkarte mit Name).
* **Dateigröße:** `--crf` (Standard 20); die Bitrate ist zusätzlich auf 1,5 Mbit/s begrenzt.
