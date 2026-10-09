# Innenkompass – klickbarer Prototyp

Ein einzelnes HTML-File (`index.html`) mit eingebettetem CSS und JavaScript. Keine externen Abhängigkeiten, keine Netzwerkaufrufe (per Content-Security-Policy zusätzlich blockiert). Grundlage ist `../KONZEPT.md`.

## Öffnen

`index.html` per Doppelklick im Browser öffnen (Chrome, Edge, Firefox, Safari). Funktioniert lokal und offline, ohne Server. Am Desktop wird die App in Handybreite zentriert angezeigt; am besten testet man sie in den Entwicklertools mit einer Breite von etwa 390 px.

Tipp: Unter **Journal** oder **Einstellungen** auf **„Demo-Daten laden“** tippen. Dann erscheinen sofort Musterkarten (z. B. „Rabe“). Demo-Einträge sind markiert und lassen sich wieder entfernen.

## Was der Prototyp abdeckt

- **Drei Sprachen**: Deutsch (Standard), Türkisch, Englisch. Umschalter oben rechts, `html lang` wird angepasst, alle Texte stehen in einer Übersetzungstabelle.
- **Startseite** mit großer Taste „Traum oder Gedanken festhalten“ sowie Zugang zu Journal, Muster und „Meine Bedeutungen“.
- **Geführte Sitzung in 8 Schritten** (Konzept Abschnitt 4): Art des Erlebnisses, eigene Beschreibung und Tags, Gefühle (Mehrfachauswahl, „keines davon“, „weiß ich nicht“, Freitext), eigene Verbindung, Kontext, gleichrangige Blickwinkel (keiner als wahr markiert), Zusammenfassung nur aus eigenen Antworten mit „Passt / Teilweise / Nein / Ändern“, nächster Schritt. Jeder Schritt bietet „Keine Antwort passt“, „Etwas anderes“, „Unsicher“, „Überspringen“ und „Beenden“.
- **Persönliche Bedeutungen** werden nur mit ausdrücklicher Zustimmung (Checkbox nach der Zusammenfassung) gespeichert und sind unter „Meine Bedeutungen“ bearbeitbar und löschbar.
- **Spiritueller Themenweg** (Abschnitt 5), freiwillig: Er fragt zuerst nach der Art der Erfahrung, dann nach einer Bedrohung bzw. einer Stimme, die zum Verletzen auffordert, und schließlich nach der gewünschten Sicht (persönlich / Kultur-Religion / beides). Für die Kultur- und Religionsperspektive gibt es nur eine Platzhalterkarte („Inhalte werden mit Fachleuten erstellt …“). Die App behauptet nie, ein Wesen sei anwesend.
- **Sicherheitsstopp**: In jeder Sitzung ist der Link „Ich fühle mich gerade nicht sicher“ dauerhaft sichtbar, und im Spirituellen Weg stoppt ein „Ja“ den Deutungsweg. Danach erscheint ein ruhiger Bildschirm mit Notruf 112 (EU und Türkei) und der TelefonSeelsorge (0800 111 0 111 / 0800 111 0 222) sowie dem Hinweis auf den örtlichen Notdienst. Es gibt dort keine Diagnose und keine Kaufaufforderung.
- **Journal**: chronologische Zeitleiste mit Suche und Tag-Filter. Einträge lassen sich ansehen, mit Tags ergänzen und mit Bestätigung löschen. Außerdem: JSON-Export aller Daten und „Alles löschen“ mit Bestätigung.
- **Musterkarten** (Abschnitt 6): Lokale Zählung von Tags und Gefühlen, die in mindestens zwei Einträgen vorkommen. Jede Karte nennt Anzahl und Zeitraum und verlinkt auf die zugrunde liegenden Einträge. Sie gibt keine Ursachen-Deutung. Karten lassen sich ausblenden und wieder einblenden.
- **Online-KI-Schalter** in den Einstellungen, standardmäßig aus, mit einer Erklärung, was übertragen würde. Im Prototyp ist das nur ein Platzhalter („Im Prototyp nicht verbunden“), es wird nichts gesendet.
- **Gestaltung und Bedienung**: Mobile-first, Hell- und Dunkelmodus (Systemeinstellung), große Schrift, Bedienelemente ab 44 px, Tastaturbedienung, Beschriftungen und ARIA-Attribute. Es gibt keine Streaks und keine Käufe.
- **Speicherung** im `localStorage` des Browsers. Ist er nicht verfügbar (z. B. im privaten Modus mit blockiertem Speicher), läuft die App im Arbeitsspeicher weiter und zeigt einen Hinweis.

## Was der Prototyp nicht abdeckt

- **Keine echte KI**: Es gibt weder einen Online-KI-Dialog noch ein lokales Sprachmodell. Freitexte werden nicht analysiert.
- **Keine Synchronisation**, kein Konto, kein Zugriffsschutz über Gerätefunktionen (PIN/Face ID).
- **Keine Kamera- oder Kaffeesatz-Erkennung**, kein Kaffeeritual, keine Bild- oder Spracheingabe, keine Vorlesefunktion.
- **Keine geprüften Kultur- oder Religionsinhalte**: Dort steht nur ein Platzhalter.
- **Keine Abos, Käufe oder Erinnerungen.**
- Die Übersetzungen sind noch nicht von Muttersprachler:innen redaktionell geprüft. Auch die Hilfenummern müssen vor einer Veröffentlichung noch einmal geprüft werden.

## Screenshots

Im Ordner `screenshots/` (390 × 844 px): Start-, Sitzungs-, Muster- und Sicherheitsansicht auf Deutsch, Türkisch und Englisch sowie Journal, Zusammenfassung, Kultur-Platzhalter und Dunkelmodus.
