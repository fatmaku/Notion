# Demo-Clip aufnehmen – ohne OBS

Mit der Seite **`demo.html`** nimmst du in einem einzigen Browser-Tab ein kurzes Video auf:
deine Webcam, dazu die Live-Effekte und Sounds, die auf deine Stimme reagieren. Ideal für ein
Vorschau-Video, einen TikTok/Reel oder um LiveFX jemandem zu zeigen. OBS wird dafür nicht gebraucht.

## Schritt für Schritt

1. **Server starten** – im LiveFX-Ordner ein Terminal öffnen und eingeben:
   ```
   node server.js
   ```
   Es erscheint `LiveFX läuft auf http://127.0.0.1:8787/`.
2. **Chrome** (oder Edge) öffnen und diese Adresse eingeben:
   ```
   http://127.0.0.1:8787/demo.html
   ```
3. **Kamera und Mikrofon erlauben**, wenn der Browser fragt. Du siehst dich jetzt gespiegelt wie in
   einem Selfie – das ist Absicht. Wurde etwas abgelehnt, zeigt die Seite oben einen gelben Hinweis;
   ohne Kamera bleibt der Hintergrund schwarz, die Effekte funktionieren trotzdem.
4. **Format wählen** (unten in der Leiste): **9:16** für TikTok/Instagram Reels, **16:9** für YouTube.
   Die Seite zeigt dir das Bild dann genau in diesem Ausschnitt mit schwarzen Balken drumherum –
   so siehst du, was später im Video ist.
5. **„🎙️ Mikro starten“** klicken, Sprache prüfen (Deutsch / English / Türkçe). In der Leiste
   erscheint live, was verstanden wurde; erkannte Trigger-Wörter werden gelb markiert.
6. **„⏺ Aufnahme starten“** klicken. Oben links blinkt `REC` mit einem Zähler.
7. **Reden!** Sag die Trigger-Wörter ganz natürlich im Satz, z. B.
   „das ist ja **krass**“, „**oh nein**, das war knapp“, „**Applaus** bitte“, „das war so **lustig**“.
   Die Effekte erscheinen sofort auf deinem Bild und landen samt Sound in der Aufnahme.
   Tipp: Die kleinen Buttons in der Leiste lösen die Effekte auch per Klick aus.
8. **„⏹ Stopp“** klicken. Ein Fenster mit der Vorschau erscheint.
9. **„⬇️ Herunterladen“** – die Datei heißt `livefx-demo-<Datum-Uhrzeit>.webm` und landet in deinem
   Download-Ordner.

## Tipps für einen guten Clip

- **Licht von vorn**: Fenster oder Lampe vor dir, nicht hinter dir.
- **In die Kamera schauen**, nicht auf deine Vorschau.
- **30–60 Sekunden** reichen völlig – lieber kurz und knackig.
- **Trigger-Wörter natürlich sagen**, mit kurzen Pausen dazwischen. Jeder Effekt hat eine kleine
  Abklingzeit (Cooldown), direkt hintereinander zündet derselbe Effekt also nicht zweimal.
- Die Leiste unten blendet sich nach 3 Sekunden ohne Mausbewegung aus, damit nichts stört – sie kommt
  wieder, sobald du die Maus bewegst. Sie ist **nie** im Video zu sehen, aufgenommen wird nur das Bild.
- Lautstärke der Effekt-Sounds mit dem 🔊-Regler einstellen; dein Mikrofon wird unverändert aufgenommen.
- Mehrere Versuche sind kein Problem: Jede Aufnahme bekommt ihre eigene Datei.

## WebM in MP4 umwandeln (für Instagram / TikTok)

Der Browser speichert das Video als **WebM**. YouTube nimmt das direkt an; Instagram, TikTok und die
meisten Handy-Apps wollen **MP4**. Zwei einfache Wege:

**Mit VLC (kostenlos, Windows/Mac/Linux):**
1. VLC öffnen → Menü *Medien* → *Konvertieren / Speichern…*
2. *Hinzufügen…* → deine `.webm`-Datei wählen → *Konvertieren / Speichern*.
3. Profil **„Video – H.264 + MP3 (MP4)“** wählen, Zieldatei mit Endung `.mp4` angeben → *Start*.

**Mit ffmpeg (ein Befehl im Terminal):**
```
ffmpeg -i livefx-demo.webm -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k livefx-demo.mp4
```

Danach die MP4-Datei aufs Handy schicken (AirDrop, WhatsApp „an mich selbst“, Google Drive …) und wie
gewohnt hochladen.

## Gut zu wissen

- **Animierte GIFs** (eigene Bild-Trigger) erscheinen **in der Aufnahme als Standbild**. Live auf der
  Seite und im OBS-Overlay laufen sie normal – die Aufnahme zeichnet das Bild nur einmal pro Effekt
  auf die Leinwand. Wer bewegte GIFs im Clip braucht, nimmt in OBS auf.
- Das Bild wird gespiegelt aufgenommen (wie du dich selbst siehst). Text auf Klamotten oder Schildern
  erscheint deshalb spiegelverkehrt.
- Die Demo-Seite ist gleichzeitig eine kleine Steuerung: Alles, was hier zündet, geht auch an ein
  offenes OBS-Overlay – und was du im Control-Panel (`http://127.0.0.1:8787/`) oder über
  `/api/fire` auslöst, erscheint auch hier.
- Für **echte Streams** bleibt OBS der richtige Weg (bessere Qualität, Szenen, Chat, Bitrate).
  Wie das geht, steht in [OBS-ANLEITUNG.md](OBS-ANLEITUNG.md).
- Es geht nichts ins Internet: Das Video entsteht komplett in deinem Browser und liegt nur auf deinem
  Rechner. Nur die Spracherkennung von Chrome nutzt – wie im Control-Panel – den Google-Dienst.
