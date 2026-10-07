# Story-Modus – Vorlesen mit lebenden Szenen (LiveFX 1.3)

Du liest eine Geschichte vor – LiveFX hört zu und verwandelt Schlüsselwörter in **ganze Szenen**: Regen, Nacht,
Wald, Meer, Feuer, Schloss, Schnee, Wüste, Stadt, Weltraum, Sonnenaufgang, Gewitter. Jede Szene füllt das
Overlay als animierter Hintergrund mit passender **Atmosphäre** (Regenrauschen, Grillen, Vogelgezwitscher,
Kaminknistern …) und **bleibt stehen, bis die nächste Szene kommt**. Figuren und Dinge („der Drache“, „die
Prinzessin“, „der Schatz“) erscheinen als **Sticker** oben über der Szene.

Funktioniert in OBS (Browser-Quelle), auf der Demo-Seite (Aufnahme ohne OBS), quer und hochkant.

**Neu in 2.2:** Szenen laufen in einem **Story-Band** am unteren Rand (Standard 22 % der Höhe) statt über der
ganzen Kamera, Effekte bleiben an den **Rändern**, und die **Live-Story** verwandelt jeden vorgelesenen Satz
sofort in Szene, Wetter, Tageszeit und Emoji-Figuren – ohne Trigger-Liste. Siehe die beiden Abschnitte unten.

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
- **Hochkant** (`overlay.html?layout=portrait`): das Story-Band ist 20 % hoch und sitzt **über** der Chat-Zone
  (unteres Drittel bleibt frei), Rand-Spalten sind 30 % breit, Sticker bleiben oben.
- **Demo-Seite** (`demo.html`): Szenen und Loops werden mit aufgenommen – ideal für einen Vorlese-Clip.
- Stream Deck / API: `POST /api/fire` mit `{"trigger":{"id":"scene-rain","label":"Regen","visual":{"kind":"scene","scene":"rain"},"sound":"loop:rain"}}`.

## Story-Band: die Kamera bleibt frei (2.2)

Regen, Nacht, Wald … werden nicht mehr über das ganze Bild gelegt. Das Overlay hat ein **Layout** mit drei Teilen:

| Schlüssel | Werte | Standard | Bedeutung |
|---|---|---|---|
| `storyLayout` | `band` · `full` · `frame` | `band` | **band** = Streifen am unteren Rand, **frame** = kleines 16:9-Fenster unten rechts (30 % Breite), **full** = ganzer Rahmen wie in 1.3 |
| `band` | 15 … 35 | 22 | Höhe des Streifens in Prozent der Bildhöhe (hochkant ohne Angabe: 20 %, über der Chat-Zone) |
| `zone` | `full` · `edges` · `bottom` · `top` | `edges` | wo **flüchtige Effekte** landen: **edges** = Regen/Konfetti nur in den beiden Rand-Spalten (22 % Breite, hochkant 30 %), Karten/Text/Sticker/Banner abwechselnd links und rechts, **kein** Weiß-Blitz und **kein** Zoom-Stoß; **bottom** = alles im Band; **top** = oberer Streifen; **full** = überall (1.3-Verhalten) |

- Setzen per URL (pinnt den jeweiligen Schlüssel): `overlay.html?story=band&band=22&zone=edges` – oder live per
  Bus-Nachricht `{type:'layout', storyLayout?, band?, zone?}` (nur die geschickten Schlüssel ändern sich; `POST /fire`).
  Der Server merkt sich das Layout (`state.layout`) und gibt es jedem neu verbundenen Overlay im `state`-Event mit.
- Technik: `#stage > .fx-band[data-layout]` hält die `.fx-scene`-Ebene, Partikel und Figuren sind auf dem Canvas auf
  das Band begrenzt, die Oberkante ist weich maskiert. Der Streifen skaliert Boden-Silhouetten, Deko und
  Bildunterschrift mit (`--fx-band-h`). Alte Szenen-Trigger brauchen keine Änderung.
- Demo-Seite: Auswahl „Story“ (Band unten / Vollbild / Fenster) und „Effekt-Zone“ in der Leiste, dieselben URL-Parameter.

## Live-Story: jeder Satz wird zur Szene (2.2)

Neben den Trigger-Paketen gibt es den **Story-Director** (`js/story-director.js`, global `LiveFXStoryDirector`):
ein Wortschatz in **Deutsch, Türkisch und Englisch** (Orte, Tageszeiten, Wetter, 22 Figuren, 16 Dinge, Tätigkeiten,
Stimmungen) macht aus jedem Satz einen **Welt-Zustand**, den das Band fortlaufend rendert – ohne Modell, ohne Cloud.

```
„Es regnete in der Nacht im Wald, der Drache flog über das Schloss“
„gece ormanda yağmur yağıyordu, ejderha kalenin üzerinden uçtu“
„It was raining at night in the forest, the dragon flew over the castle“
   → Szene rain · Wetter rain · Zeit night · Ort forest · Wahrzeichen castle (🏰 als Requisite)
     Figuren: 🐉 dragon (fliegt)   Loop: rain
```

- **Nachrichten**: das Panel (oder `POST /fire`) schickt `{type:'story', text, final, lang?}` pro Transkript-Satz;
  jedes Overlay füttert seinen eigenen Director (`window.livefx.director`) und zeichnet den Zustand
  (`renderer.story(state)`). Alternativ schickt man einen fertigen Zustand: `{type:'story-state', state}`.
  Zwischenergebnisse (`final:false`) bewegen nur Ort/Zeit/Wetter/Stimmung – Figuren warten auf den fertigen Satz.
- **Figuren** laufen als Emoji-Sprites ins Band hinein und wieder hinaus; Tätigkeiten: fliegen, schwimmen, rennen,
  springen, tanzen, schlafen, weinen, lachen, verschwinden. Maximal 6 Figuren und 4 Dinge (+ Wahrzeichen).
- **Szenen-Zuordnung**: Wetter gewinnt (Regen/Gewitter/Schnee), dann Orte mit eigener Szene (Wald, Meer, Stadt,
  Schloss, Wüste, Weltraum; Höhle → Nacht, Berge → Schnee), Lagerfeuer → Feuer, dann Tageszeit (Nacht → Nacht,
  Morgen/Abend → Sonnenaufgang). Die 13 Szenen und 12 Loops von 1.3 werden wiederverwendet.
- **Stimmung** (fröhlich, spannend, traurig, gruselig, ruhig) tönt das Band; „plötzlich“ rüttelt einmal.
  „**Ende**“ / „masal bitti“ / „the end“ räumt die Bühne, „es war einmal“ beginnt eine neue.
- Ohne neuen Satz blendet das Band nach **60 s** aus (`renderer.storyIdleMs`), der nächste Satz holt es zurück.
- Demo-Seite: Haken **Live-Story** → jeder Mikrofon-Satz geht durch den Director (und als `story` auf den Bus).

## Lautstärke (2.2)

Drei Regler: **master** (0.5), **sfx** (0.8, Effekt-Sounds) und **ambient** (0.5, Szenen-Atmosphäre). Nachricht
`{type:'volume', volume, bus?}` – ohne `bus` = master wie bisher. Details in `docs/SOUNDS.md`.
