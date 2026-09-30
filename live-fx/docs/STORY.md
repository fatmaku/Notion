# Story-Modus – Vorlesen mit lebenden Szenen (LiveFX 1.3)

Du liest eine Geschichte vor – LiveFX hört zu und verwandelt Schlüsselwörter in **ganze Szenen**: Regen, Nacht,
Wald, Meer, Feuer, Schloss, Schnee, Wüste, Stadt, Weltraum, Sonnenaufgang, Gewitter. Jede Szene füllt das
Overlay als animierter Hintergrund mit passender **Atmosphäre** (Regenrauschen, Grillen, Vogelgezwitscher,
Kaminknistern …) und **bleibt stehen, bis die nächste Szene kommt**. Figuren und Dinge („der Drache“, „die
Prinzessin“, „der Schatz“) erscheinen als **Sticker** oben über der Szene.

Funktioniert in OBS (Browser-Quelle), auf der Demo-Seite (Aufnahme ohne OBS), quer und hochkant.

## In 30 Sekunden

1. Panel öffnen (`http://127.0.0.1:8787/`), unter **Erkennung** die Sprache wählen (Deutsch, Türkçe, English).
2. Karte **📖 Story-Modus** → Haken bei **„Story-Modus an“**. Das Panel
   - lädt das Geschichten-Paket deiner Sprache (📖 Geschichten (DE) / Masal (TR) / Story (EN)),
   - stellt die Erkennung auf Toleranz **mittel**, Reaktion **sicher** (nur fertige Sätze) und **2 s** Mindestabstand,
   - zeigt das **Szenen-Pad**: ein Knopf pro Szene plus „Szene beenden“.
3. **Mikro starten** und vorlesen: „Es war einmal … in einem dunklen Wald … es regnete in Strömen … und dann kam
   der Drache!“ → Sonnenaufgang mit Banner, Wald mit Vögeln, Regen, Drachen-Sticker.
4. „**Ende**“ / „und wenn sie nicht gestorben sind …“ blendet die Szene aus und stoppt die Atmosphäre (Tada).

Haken wieder raus → die vorherigen Erkennungs-Einstellungen kommen zurück; das Paket bleibt in der Liste
(unter **Meme-Pakete** mit „Entfernen“ löschbar).

## Szenen-Pad (Handsteuerung)

Das Pad feuert Szenen auch ohne Sprache – praktisch, wenn ein Wort nicht erkannt wurde oder du die Stimmung
vorbereiten willst. Ein Klick auf dieselbe Szene ändert nichts (kein Flackern); eine andere Szene wird mit
0,8 s Überblendung getauscht, die Atmosphäre wird mit 1,5 s ein-/ausgeblendet. **„Szene beenden“** (🎬) räumt
die Bühne und stoppt den Loop.

## Welche Wörter lösen was aus?

Die Pakete enthalten je 28–30 Trigger; hier die wichtigsten Stichwörter (Groß-/Kleinschreibung egal, auch
ASCII-Schreibweisen wie „yagmur“, „wueste“):

| Szene | Deutsch | Türkçe | English |
|---|---|---|---|
| 🌅 Auftakt | es war einmal | bir varmış bir yokmuş | once upon a time |
| 🌧️ Regen | es regnete, regen, in strömen | yağmur yağıyordu, yağmur | it was raining, rain |
| 🌙 Nacht | in der nacht, nachts, dunkel | gece, karanlık | at night, dark, midnight |
| 🌲 Wald | im wald, bäume | ormanda, orman | in the forest, the woods |
| 🌊 Meer | am meer, wellen, strand | deniz, dalgalar | the sea, ocean, waves |
| 🔥 Feuer | am feuer, lagerfeuer, kamin | ateşin başında, şömine | by the fire, campfire |
| 🏰 Schloss | schloss, könig, burg | sarayda, padişah, kale | castle, the king, palace |
| ❄️ Schnee | schnee, winter | kar yağıyordu, kar, kış | snow, winter |
| 🏜️ Wüste | wüste, sand, oase | çöl, kum | desert, dunes |
| 🌆 Stadt | stadt, großstadt | şehir, sokaklar | the city, streets |
| 🪐 Weltraum | sterne, weltall, rakete | yıldızlar, uzay | stars, outer space |
| 🌅 Morgen | am morgen, sonnenaufgang | sabah, güneş doğdu | in the morning, sunrise |
| ⛈️ Gewitter | gewitter, donner, blitz | fırtına, şimşek | storm, thunder |
| 🎬 Ende | ende, das ende, und wenn sie nicht gestorben sind | son, masal bitti | the end, lived happily |

Sticker: Drache 🐉, Prinzessin 👸, Ritter 🛡️⚔️, Schatz 💎, Hexe 🧙, Zauber ✨, Verliebt 💖, Schiff ⛵, Pferd 🐎,
Hund 🐕, Katze 🐱, Wolf 🐺, Fee 🧚, Riese 🧌 (TR zusätzlich Gökkuşağı 🌈, Kuş 🐦; EN Rainbow 🌈).

Alle Stichwörter siehst du in der Trigger-Tabelle und kannst sie dort ergänzen – oder du nutzt die
**Lern-Karte** unter dem Transkript: ein Satz ohne Treffer lässt sich per Klick einem Trigger zuweisen.

## Eigene Szenen-Trigger

Trigger-Editor (✎ oder „+ Trigger“) → Effekt **„Szene (Hintergrund + Atmosphäre)“**:

- **Szene**: eine der 13 Szenen (inkl. „Szene beenden“),
- **Intensität** 1–3: Menge der Partikel (Tropfen, Flocken, Funken …),
- **Text**: optionale Bildunterschrift („Es war einmal…“), unten mittig (quer) bzw. im oberen Drittel (hochkant),
- **Sound** → Gruppe **„Atmosphäre (Loop)“**: `rain`, `wind`, `fireplace`, `birds`, `sea`, `thunder`, `nightCrickets`,
  `heartbeatSlow`, `churchBells`, `cityHum`, `spaceDrone`, `storm`. Ein Szenen-Trigger ohne Sound lässt den
  laufenden Loop weiterlaufen; „Szene beenden“ stoppt ihn.

Effekt **„Sticker (2–4 Emojis)“**: bis zu vier Emojis in Formation mit Hüpfer, Position „Oben“ empfohlen, damit
die Szene sichtbar bleibt. Als JSON:

```json
{ "id": "meine-szene", "label": "Höhle", "keywords": ["in der höhle", "höhle"], "cooldown": 8,
  "sound": "loop:wind", "visual": { "kind": "scene", "scene": "night", "text": "Tief in der Höhle…", "intensity": 1 } }
```

## Tipps

- **Reaktion „sicher“** ist im Story-Modus Absicht: Szenen sollen nicht bei halben Sätzen springen.
  Wer es schneller will, stellt unter **Erkennung** wieder „schnell“ ein (bleibt bis zum nächsten Umschalten).
- **Cooldowns**: Szenen 8 s, Sticker 6 s – „der Drache“ dreimal im Satz erscheint einmal.
- **Lautstärke**: der Regler im Panel gilt auch für die Atmosphäre.
- **Hochkant** (`overlay.html?layout=portrait`): die Szene füllt den ganzen Rahmen, Sticker bleiben oben,
  der untere Bereich bleibt für den Chat frei.
- **Demo-Seite** (`demo.html`): Szenen und Loops werden mit aufgenommen – ideal für einen Vorlese-Clip.
- Stream Deck / API: `POST /api/fire` mit `{"trigger":{"id":"scene-rain","label":"Regen","visual":{"kind":"scene","scene":"rain"},"sound":"loop:rain"}}`.
