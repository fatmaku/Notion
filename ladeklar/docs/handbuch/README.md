# Ladeklar – Handbücher

Stand: 16.10.2026 · Ladeklar Version 1.0

In diesem Ordner liegen die drei Benutzerhandbücher für Ladeklar. Jedes Handbuch richtet sich an eine Rolle und beschreibt genau die Oberfläche, die diese Rolle in der App sieht.

| Handbuch | Für wen | Inhalt in Kürze |
|---|---|---|
| [HANDBUCH_UNTERNEHMEN.md](HANDBUCH_UNTERNEHMEN.md) | Inhaber, Unternehmens-Admins und Disponenten eines Lizenznehmers (Spedition, Transportunternehmen) | Einrichtung in 10 Minuten, Live-Übersicht, Lieferungen, Fahrer, Fahrzeug-Pool, Berichte, Einstellungen, Datenexport, Lizenz, häufige Fragen, Glossar |
| [FAHRER_KURZANLEITUNG.md](FAHRER_KURZANLEITUNG.md) | Fahrerinnen und Fahrer | Eine Druckseite je Sprache: Anmelden, LKW wählen, Auftrag bestätigen, Aufgeladen, Abgeladen, Lieferschein, Bestätigen – in 8 Sprachen (Deutsch, English, Polski, Română, Čeština, Türkçe, Русский, Українська) |
| [HANDBUCH_LIZENZGEBER.md](HANDBUCH_LIZENZGEBER.md) | Plattformbetreiber (Lizenzgeber) und dessen Mitarbeitende | Lizenzgeber-Konsole, Lizenznehmer anlegen, Lizenz und Status ändern, Abrechnung, Tarife, Datenschutz-Grenze, Server-Betrieb, Checkliste für den Kundenstart |

## Bildschirmfotos

Alle Bildschirmfotos liegen im Unterordner [`img/`](img/). Sie zeigen die deutsche Oberfläche mit den Demodaten der Beispielfirma „Kaya Logistik“. Die Dateinamen beginnen mit der Rolle:

- `fahrer-…` – Fahrer-App auf dem Handy
- `sprache-…` – Startbildschirm der Fahrer-App in jeder der 8 Sprachen
- `buero-…` – Disposition und Unternehmens-Einstellungen im Browser
- `tablet-…` – Disposition und Fahrer-App auf dem Tablet
- `lizenzgeber-…` – Lizenzgeber-Konsole

## PDF-Fassungen

Für den Druck und zum Versenden werden PDF-Fassungen aus diesen Markdown-Dateien erzeugt:

```bash
node tools/build-docs.js
```

Den Befehl im Hauptordner von Ladeklar ausführen.

> **Tipp:** Drucken Sie die Fahrer-Kurzanleitung in den Sprachen Ihrer Fahrer aus und legen Sie sie ins Fahrerhaus. Jede Sprache passt auf eine Seite.

## Hinweise zur Pflege

- Die Beschriftungen von Knöpfen, Reitern und Feldern sind in den Handbüchern **fett** oder in „Anführungszeichen“ gesetzt und stimmen mit der App (Version 1.0) überein. Ändert sich eine Beschriftung in der App, bitte auch das Handbuch anpassen.
- Funktionen, die noch nicht in der App sind, stehen höchstens mit dem Vermerk „geplant (Roadmap)“ in den Handbüchern.
- Rechtstexte (AGB, AVV, Datenschutzhinweise, Muster-Betriebsvereinbarung) liegen getrennt im Ordner [`../recht/`](../recht/).
