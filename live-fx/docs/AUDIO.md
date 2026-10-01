# Ton & Echo – Mikro in OBS, Effekte ohne Doppelton

Zwei Dinge gehen bei echten Streams am häufigsten schief: **Zuschauer hören den Streamer nicht** und
**alles klingt doppelt (Echo)**. Beides hat dieselbe Ursache: Welche Tonquellen OBS mischt, ist nicht das,
was du am PC hörst. Diese Seite erklärt es Schritt für Schritt – die Karte **🔊 Ton-Check** im Panel führt
dich durch dieselben fünf Punkte.

## Warum Echo entsteht

```
Browser-Tab (Panel)  ──Vorschau-Ton──▶ Lautsprecher ──▶ Mikro ──┐
                                                               ├──▶ OBS-Mix ──▶ Stream
OBS-Browser-Quelle (overlay.html) ──„Audio über OBS steuern“──┘
Desktop-Audio (fängt den Panel-Tab noch einmal ein) ───────────┘
```

- Das **Overlay läuft zweimal**: einmal als Vorschau im Panel, einmal als Browser-Quelle in OBS. Beide bekommen
  jeden Effekt. Spielt die Vorschau Ton, hört der Stream den Effekt **doppelt** (einmal aus OBS, einmal über
  Lautsprecher → Mikro bzw. über „Desktop-Audio“).
- **Desktop-Audio** in OBS nimmt *alles* auf, was dein PC ausgibt – also auch den Panel-Tab und eventuell
  OBS' eigenes Monitoring. Das ergibt Hall, Dopplungen oder eine Rückkopplung.
- Das Mikro der Spracherkennung läuft **im Browser**. OBS bekommt davon nichts, solange du das Mikro nicht
  **als eigene OBS-Quelle** hinzufügst.

Seit LiveFX 1.5 ist die Vorschau im Panel deshalb **standardmäßig stumm** (`overlay.html?volume=0`). Der
Schalter **„Vorschau-Ton“** unter der Vorschau schaltet ihn nur zum Reinhören ein; ist dabei ein OBS-Overlay
verbunden, zeigt das Panel eine **Echo-Warnung** mit Ausschalt-Knopf.

## Schritt 1 – Mikrofon in OBS als Quelle

1. OBS → **Quellen** → **+** → **Audioeingabeaufnahme** (Windows) bzw. **Audio-Eingabeaufnahme** (Mac) → Name „Mikro“ → OK.
2. Dein Mikrofon auswählen → OK.
3. Im **Audiomixer** erscheint „Mikro“. Sprich – der Balken muss ausschlagen.
4. Wenn OBS unter *Einstellungen → Audio → Globale Audiogeräte* schon ein „Mikrofon/Aux“ eingetragen hat,
   reicht das; dann **keine** zweite Mikro-Quelle anlegen (sonst hörst du dich doppelt).

Der Browser (LiveFX-Panel) und OBS dürfen dasselbe Mikro gleichzeitig benutzen – das ist normal.

## Schritt 2 – Browser-Quelle: Audio über OBS

1. Doppelklick auf die Browser-Quelle `LiveFX Overlay`.
2. **„Audio über OBS steuern“** ✅ anhaken → OK.
3. Im Audiomixer erscheint „LiveFX Overlay“. Im Panel **„🔊 Test-Sound in OBS“** drücken (Karte „Ton-Check“)
   → der Balken zuckt und im OBS-Vorschaubild erscheint die Karte **TON-TEST**.

Ohne diesen Haken spielt OBS den Overlay-Ton **direkt über deine Lautsprecher**, nicht in den Stream.

## Schritt 3 – Desktop-Audio stumm oder Tab ausschließen

- Einfachste Lösung: **Desktop-Audio** im Audiomixer stumm schalten (Lautsprecher-Symbol) – dann landen nur
  Mikro + Overlay im Stream.
- Brauchst du Desktop-Audio (Musik, Spiel)? Dann den Browser ausschließen:
  - **OBS 28+ (Windows)**: Quelle **„Anwendungs-Audioaufnahme“** nur für das Spiel/den Player statt Desktop-Audio.
  - **Alternativ**: Panel in einem anderen Browser-Profil/Fenster laufen lassen und dessen Audioausgabe
    (Windows: Lautstärkemixer → App → anderes Gerät, z. B. ein virtuelles Kabel) umleiten.
- Vorschau-Ton im Panel **aus** lassen (Standard).

## Schritt 4 – Audio-Monitoring aus

Zahnrad im Audiomixer → **Erweiterte Audioeigenschaften** → Spalte **Audio-Monitoring**:

| Quelle | Einstellung |
|---|---|
| Mikro | **Monitoring aus** (sonst hörst du dich selbst mit Verzögerung) |
| LiveFX Overlay | **Monitoring aus** (zum Testen kurz „Überwachen und ausgeben“, danach wieder aus) |
| Desktop-Audio | **Monitoring aus** |

„Nur überwachen“ = du hörst es, der Stream nicht. „Überwachen und ausgeben“ = beide. Dauerhaft eingeschaltetes
Monitoring in Kombination mit Desktop-Audio ist die häufigste Echo-Quelle.

## Schritt 5 – Vorschau-Ton im Panel aus

Unter der Overlay-Vorschau im Panel: **„🔈 Vorschau-Ton“** aus (Standard). Das Panel hakt den Punkt im
Ton-Check automatisch ab. Zum Reinhören kurz an – aber nie während OBS läuft.

## Test-Ablauf (2 Minuten)

1. Panel → **🔊 Ton-Check** → **🎙️ Mikro-Test**: 5 s sprechen → „Mikro liefert Pegel ✔“. Gleichzeitig muss sich
   in OBS der Balken deiner Mikro-Quelle bewegen.
2. **🔊 Test-Sound in OBS** → Karte TON-TEST im OBS-Vorschaubild, Balken „LiveFX Overlay“ zuckt.
3. Zum Hören: Overlay-Quelle kurz auf „Überwachen und ausgeben“ → Test-Sound → wieder „Monitoring aus“.
4. Kurze **Testaufnahme** in OBS (Aufnahme starten, 20 s reden + Taste 1 drücken, stoppen) und abspielen:
   Stimme klar, Effekt **einmal**, kein Hall → fertig.

## Fehlerhilfe

| Problem | Ursache | Lösung |
|---|---|---|
| **Zuschauer hören mich nicht** | Mikro läuft nur im Browser, nicht in OBS | Schritt 1: Mikro als OBS-Quelle; Mixer-Balken prüfen; Mikro nicht stumm (🔇 im Mixer) |
| Mikro-Balken in OBS bewegt sich nicht | falsches Gerät, Windows-Datenschutz | Quelle bearbeiten → richtiges Mikro; Windows: Einstellungen → Datenschutz → Mikrofon → Desktop-Apps erlauben |
| **Echo / Hall auf meiner Stimme** | Monitoring an oder Desktop-Audio nimmt Lautsprecher mit | Schritt 4 (Monitoring aus) + Kopfhörer statt Lautsprecher |
| **Effekte doppelt** | Vorschau-Ton an + OBS-Overlay, oder zwei Browser-Quellen | Vorschau-Ton aus (Echo-Warnung im Panel beachten); nur **eine** Browser-Quelle mit `overlay.html` |
| Effekte nur bei mir, nicht im Stream | „Audio über OBS steuern“ fehlt | Schritt 2 |
| Effekte im Stream, aber ich höre nichts | Monitoring aus (richtig so!) | Zum Kontrollieren kurz „Überwachen und ausgeben“ oder Vorschau-Ton im Panel – nach dem Test wieder aus |
| Stimme doppelt mit Verzögerung | Mikro zweimal in OBS (global + Quelle) | Eine davon entfernen |
| Effekt viel leiser/lauter als Stimme | Lautstärke-Regler | Panel „Lautstärke Overlay“ oder Mixer-Fader „LiveFX Overlay“ |

Noch Fragen zur Szene selbst (Browser-Quelle, Hochkant, Stream-Key)? → `docs/OBS-ANLEITUNG.md`.
