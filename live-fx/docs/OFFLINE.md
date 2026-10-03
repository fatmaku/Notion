# Offline-Erkennung mit Whisper (experimentell)

Die normale Spracherkennung („Browser (Chrome/Edge)“) schickt dein Mikro an Googles Dienst – ohne
Internet geht sie nicht, und in Firefox/Safari fehlt sie ganz. Die Offline-Erkennung lässt stattdessen
ein **Whisper-Modell direkt im Browser** laufen (transformers.js + ONNX Runtime, WebGPU oder WASM).
Nichts verlässt deinen Rechner. Dafür ist sie langsamer und rechenintensiver – deshalb „experimentell“.

## Einmalig einrichten (braucht Internet)

```bash
npm run setup-offline                 # Whisper tiny, ≈ 40 MB
npm run setup-offline -- --model base # genauer, ≈ 150 MB, etwa doppelt so langsam
```

Das Skript hat keine Abhängigkeiten und macht zwei Dinge:
1. Lädt das npm-Paket `@huggingface/transformers` (Tarball) und kopiert `transformers.min.js` sowie die
   ONNX-Runtime-Dateien (`*.wasm`, `*.mjs`) nach `vendor/`.
2. Lädt die quantisierten Modell-Dateien (`config.json`, `tokenizer.json`, …, `onnx/*_quantized.onnx`)
   von `https://huggingface.co/onnx-community/whisper-<modell>` nach `data/models/onnx-community/whisper-<modell>/`
   (anderer Datenordner: `--data <ordner>` oder `LIVEFX_DATA_DIR`).

Vorhandene Dateien werden übersprungen, ein abgebrochener Download lässt sich einfach fortsetzen;
`--force` lädt alles neu. Exit-Code 0 = fertig, 1 = Download-/Entpackfehler, 2 = falsche Argumente.
`tar` muss installiert sein (Windows 10+, macOS und Linux bringen es mit).

Danach `node server.js` neu starten – der Server liefert `vendor/` unter `/vendor/…` und die Modelle
unter `/models/…` aus (nur die erwarteten Dateitypen, nichts anderes).

## Im Panel auswählen

1. Panel öffnen (`http://127.0.0.1:8787/` – `localhost`/`127.0.0.1` oder HTTPS ist Pflicht, sonst gibt
   der Browser kein Mikro frei).
2. Unter **Spracherkennung** die Engine **„Offline (Whisper, experimentell)“** wählen. Steht sie auf
   „nicht verfügbar“: Einrichtung prüfen (siehe unten) und die Seite neu laden.
3. **Zuhören** starten. Beim ersten Mal lädt der Browser das Modell (Fortschritt in Prozent im Status,
   Zustand „startet“); danach liegt es im Browser-Cache und der Start dauert nur Sekunden.
4. Sprechen. Sobald du eine Pause machst (≈ 0,6 s) oder 6 s am Stück gesprochen hast, wird der Abschnitt
   erkannt und wie beim Mikro gematcht – im Protokoll als Quelle „Whisper“.

Die Sprache kommt aus der normalen Sprachauswahl (`de-DE` → Whisper `de`, `tr-TR` → `tr`, `en-…` → `en`)
und gilt ab dem nächsten Abschnitt. Modell-Option: `LiveFXASR.create('whisper', { model: 'onnx-community/whisper-base' })`;
das Panel nutzt vorerst immer `whisper-tiny` (bzw. das, was `setup-offline` geladen hat – bei `--model base`
im Panel-Code `model` setzen, eine Auswahl im Panel folgt).

## Was du erwarten kannst

| | tiny | base |
|---|---|---|
| Download | ≈ 40 MB | ≈ 150 MB |
| Laptop (WebGPU, Chrome) | ≈ 0,5–1 s pro Abschnitt | ≈ 1–2 s |
| Laptop (WASM, ohne GPU) | ≈ 1–2 s pro Abschnitt | ≈ 3–5 s |
| Qualität | Stichwörter, kurze Sätze | deutlich robuster, Dialekt besser |

Die Verzögerung kommt **zusätzlich** zur Sprechpause – rechne mit 1–3 s zwischen Wort und Meme. Für
Stichwort-Trigger reicht das meist; für Story-Modus mit exakten Sätzen ist `base` empfehlenswert.

## Grenzen

- Keine Zwischenergebnisse: Whisper liefert erst nach der Pause den ganzen Abschnitt (Reaktion „schnell“
  bringt hier nichts). Sätze länger als 6 s werden an der 6-s-Grenze geteilt.
- Einfache Pegel-Erkennung (RMS > 0,01): sehr leise Sprache oder lauter Hintergrund verschiebt die
  Abschnittsgrenzen. Mikro-Pegel im Panel prüfen – er sollte bei Sprache deutlich ausschlagen.
- Ist der Rechner zu langsam (mehr als drei Abschnitte in der Warteschlange), werden neue Abschnitte
  verworfen (Ereignis `dropped` im Diagnose-Protokoll) statt immer weiter zu verzögern.
- Halluzinationen bei Stille (typisch für Whisper: „Untertitel von …“) sind möglich – deshalb werden
  Abschnitte unter 0,4 s Sprache gar nicht erst gesendet.
- Safari/iOS: WebGPU je nach Version; WASM läuft, ist aber langsam. Am Handy lieber Web Speech oder
  „Extern“ (siehe `docs/HANDY.md`).

## Fehlersuche

| Symptom | Ursache / Lösung |
|---|---|
| Engine steht auf „nicht verfügbar“ | `vendor/transformers.min.js` fehlt → `npm run setup-offline`; Server neu starten; Seite über `http://localhost`/`127.0.0.1` oder HTTPS öffnen (nicht `file://`). Test: `http://127.0.0.1:8787/vendor/transformers.min.js` muss laden. |
| Fehler „Modell nicht gefunden“ / 404 unter `/models/…` | Modell-Ordner prüfen: `data/models/onnx-community/whisper-tiny/onnx/*.onnx`; anderer Datenordner → `--data` bzw. `LIVEFX_DATA_DIR` beim Server gleich setzen. |
| Lädt ewig bei x % | Erster Start lädt bis 150 MB in den Browser-Cache; Entwicklertools → Netzwerk zeigt, ob noch Bytes fließen. Danach ist der Cache warm. |
| „Mikrofon-Zugriff verweigert“ | Browser-Berechtigung fürs Mikro erteilen; unter `http://<LAN-IP>` gibt es kein Mikro → `localhost` oder HTTPS (`docs/HANDY-HTTPS.md`). |
| Erkennt nichts, Pegel bewegt sich | Sprache stimmt? Bei `tr`/`en` das Modell zwingen hilft; sehr kurze Rufe („wow!“) sind unter 0,4 s → etwas länger sprechen („wow, krass“). |
| Text erscheint, aber verzögert > 5 s | WASM statt WebGPU (Chrome: `chrome://gpu`), oder `base` auf schwachem Gerät → `tiny` nehmen, andere Tabs schließen. |
| Meldung „Whisper-Worker: …“ | `js/whisper-worker.js` konnte die Bibliothek nicht importieren – Browser-Konsole zeigt die genaue URL; meist fehlt eine `.wasm`/`.mjs`-Datei in `vendor/` → `npm run setup-offline -- --force`. |

Technik: `js/asr.js` (Backend `whisper`: Mikro → 16 kHz → Pegel-VAD → Worker), `js/whisper-worker.js`
(transformers.js-Pipeline `automatic-speech-recognition`, `dtype: 'q8'`), Schnittstelle in
`docs/CONTRACTS.md` §6, Tests in `test/asr-whisper.test.js`.
