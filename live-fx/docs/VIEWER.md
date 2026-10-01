# Zuschauer-Trigger – Twitch, YouTube, TikTok (LiveFX 2.0)

Deine Zuschauer lösen Effekte selbst aus: per **Chat-Befehl** (`!airhorn`), per **Geschenk**
(TikTok-Coins, Bits, Super Chat) oder beides. Alles läuft über die Karte **„💬 Zuschauer-Trigger“**
im Panel; der Server (`node server.js`) muss laufen.

```
Twitch-Chat ──(IRC, ohne Login)──┐
YouTube-Chat ──(API-Key, Polling)─┤──► Befehl → Trigger ──► Overlay (OBS)
TikTok / andere ──(Webhook)───────┘   Geschenk → Stufe ──► Overlay
```

## 1. Twitch – ohne Login

1. Im Panel unter **Zuschauer-Trigger** den **Twitch-Kanal** eintragen (Kanalname oder Link, z.B. `meinkanal`).
2. Haken **an** setzen → **Speichern**.
3. Der Status-Pill zeigt `verbunden`, sobald LiveFX im Chat mitliest.

Twitch erlaubt anonymes Mitlesen (so wie ein Zuschauer, der nicht eingeloggt ist). LiveFX schreibt
**nie** in den Chat und braucht weder Passwort noch OAuth-Token. Bricht die Verbindung ab, verbindet
LiveFX von selbst neu (1 s, 2 s, 4 s … bis 30 s Wartezeit).

**Bits:** Cheers (`cheer100 …`) werden als Geschenk gewertet – 100 Bits = Betrag 1 (entspricht etwa 1 USD).
Siehe [Geschenk-Stufen](#4-geschenk-stufen).

## 2. YouTube – API-Key nötig

YouTube hat keinen offenen Chat-Zugang; LiveFX fragt den Live-Chat über die **YouTube Data API v3** ab.
Dafür brauchst du einmalig einen (kostenlosen) API-Key:

1. [console.cloud.google.com](https://console.cloud.google.com/) → Projekt anlegen (Name egal).
2. **APIs & Dienste → Bibliothek** → „YouTube Data API v3“ → **Aktivieren**.
3. **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → API-Schlüssel**. Den Schlüssel kopieren (`AIza…`).
   Tipp: unter „Schlüssel einschränken“ nur die YouTube Data API erlauben.
4. Im Panel: **YouTube Video-ID oder Link** des laufenden Livestreams (`https://www.youtube.com/watch?v=…`
   oder `…/live/…`), **API-Key** eintippen, Haken **an** → **Speichern**.

Der Key wird nur auf dem Server gespeichert (`data/chat.json`, Dateirechte 0600) und kommt **nie** zurück ins
Panel – dort steht dann nur „gespeichert ✔“. Zum Ändern einfach einen neuen Key eintippen, zum Löschen
das Feld leeren und speichern … genauer: ein leerer Key wird nur gelöscht, wenn du ihn per API schickst
(`PUT /api/chat {"youtube":{"apiKey":""}}`); das Panel lässt ein leeres Feld unangetastet.

**Quota:** Google gibt 10.000 „Einheiten“ pro Tag. Ein Chat-Abruf kostet 5 Einheiten; LiveFX fragt so oft,
wie YouTube es vorgibt (`pollingIntervalMillis`, meist alle 5–10 s, nie schneller als alle 2 s).
Ein 4-Stunden-Stream verbraucht also grob 10–15 % des Tageslimits. Ist das Limit erreicht, zeigt der Status
`Fehler` (quotaExceeded) – ab Mitternacht Pacific Time geht es weiter. **Super Chats** laufen automatisch
in die Geschenk-Stufen (Betrag in der Währung des Super Chats).

Jeder Stream hat eine neue Video-ID – vor dem Stream kurz eintragen und speichern.

## 3. TikTok und alles andere – per Webhook

TikTok bietet keine offene Chat-/Geschenk-API. Tools wie **TikFinity**, **Streamer.bot** (mit TikTok-Plugin)
oder **TikTok Live Studio-Erweiterungen** sehen die Geschenke und können einen HTTP-Aufruf schicken.
Dafür gibt es `POST /api/gift`:

```bash
curl -X POST http://127.0.0.1:8787/api/gift \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"platform":"tiktok","user":"ayse123","amount":99,"gift":"Rose","currency":"coins"}'
```

- `amount` – Zahl, wird mit den Stufen verglichen (Coins, Euro, Bits/100 … du entscheidest, was du einträgst).
- `platform`, `user`, `gift`, `currency`, `text` – frei, erscheinen nur im Chat-Feed und im Log.
- Das Token steht im Panel unter „Externe API“.

In TikFinity: *Aktionen → Webhook/HTTP-Request* mit der URL oben, Methode POST, JSON-Body mit Platzhaltern
für Benutzername und Coin-Wert (`{username}`, `{coins}` o.ä.) und dem Header `Authorization: Bearer …`.
Streamer.bot: Sub-Action *Core → Network → Fetch URL* mit denselben Angaben.

Chat-Nachrichten von TikTok kannst du über denselben Weg als Befehl einspeisen:
`POST /api/chat/test {"platform":"tiktok","user":"…","text":"!airhorn"}` – der Name „test“ ist historisch,
die Route behandelt die Nachricht genau wie eine echte.

## 4. Geschenk-Stufen

Drei Zeilen **„ab Betrag → Trigger“**. Bei einem Geschenk gewinnt die **höchste Stufe, deren Betrag erreicht ist**:

| Stufen | Geschenk 7 | Geschenk 55 | Geschenk 0,5 |
|---|---|---|---|
| 1 → Applaus, 10 → Konfetti, 100 → Money-Regen | Applaus | Konfetti | nichts |

Geschenk-Effekte ignorieren Cooldowns (jemand hat dafür bezahlt), aber nicht den „Aktiv“-Haken des Triggers.
Umrechnung in `amount`: TikTok → Coins (so wie das Tool sie schickt), Twitch Bits → Bits ÷ 100,
YouTube Super Chat → Betrag in der Super-Chat-Währung.

## 5. Chat-Befehle

- **Präfix** (Standard `!`): Nur Nachrichten, die damit beginnen, werden geprüft. Das erste Wort ist der Befehl,
  Groß-/Kleinschreibung egal: `!LOL das war gut` → Befehl `!lol`.
- **Befehls-Tabelle:** Befehl → Trigger. „+ Befehl“, Trigger wählen, **Speichern**.
- **„Alle Trigger erlauben“:** zusätzlich funktioniert jeder Trigger über `!<trigger-id>` (z.B. `!wow`) oder
  `!<name>` als Slug (`Let's go` → `!let-s-go`, `Yok artık` → `!yok-artik`). Praktisch zum Ausprobieren, im
  echten Stream lieber eine Tabelle mit ausgewählten Effekten.
- Jeder ausgelöste Befehl erscheint im Log mit Quelle `chat:<plattform>:<name>` und wird im Chat-Feed
  grün markiert.

## 6. Cooldowns

Damit der Chat das Overlay nicht zuspammt:

- **pro Zuschauer** (Standard 15 s): derselbe Name darf erst nach dieser Zeit wieder einen Effekt auslösen.
- **global** (Standard 3 s): zwischen zwei Chat-Effekten liegen mindestens so viele Sekunden – egal von wem.
- Dazu gelten die normalen Trigger-Regeln: der **Cooldown des Triggers** selbst und der **Mindestabstand**
  aus den Einstellungen. Blockierte Befehle stehen grau im Feed („Cooldown“).

`0` schaltet einen Cooldown aus.

## 7. Test ohne Zuschauer

Im Panel unten in der Karte: **Test-Nachricht** eintippen (`!airhorn`), Name wählen, **Senden** – die Nachricht
nimmt exakt denselben Weg wie eine echte. Oder per API: `POST /api/chat/test {"text":"!airhorn","user":"Ich"}`.

## 8. Fehlerhilfe

| Symptom | Ursache / Lösung |
|---|---|
| Twitch bleibt auf `verbindet …` | Kein Internet, Firewall blockt `wss://irc-ws.chat.twitch.tv:443`, oder der Kanalname ist falsch (nur Buchstaben, Zahlen, `_`). |
| Twitch `verbunden`, aber nichts passiert | Befehl im Chat exakt mit Präfix schreiben (`!lol`, nicht `! lol`). Steht der Befehl in der Tabelle? Ist der Trigger aktiv? Cooldown abgelaufen? Der Chat-Feed im Panel zeigt jede Nachricht – kommt sie dort an? |
| YouTube `Fehler: Kein aktiver Live-Chat` | Video-ID gehört zu keinem laufenden Stream (Premiere/VOD) oder der Chat ist deaktiviert. |
| YouTube `Fehler: … quotaExceeded` | Tageslimit erreicht – morgen wieder, oder zweites Projekt mit eigenem Key. |
| YouTube `Fehler: API key not valid` | Key falsch kopiert oder Data API v3 nicht aktiviert. |
| `/api/gift` antwortet 401 | Bearer-Token fehlt/falsch – im Panel unter „Externe API“ kopieren. |
| Geschenk kommt an, aber `fired:false` | Betrag unter der kleinsten Stufe (`reason:"no_tier"`), Trigger der Stufe deaktiviert (`disabled`) oder gelöscht (`unknown`). |
| Effekt läuft doppelt | Zwei Panels geöffnet? Jedes Panel ist nur Anzeige – ausgelöst wird auf dem Server, also einmal. Doppelt heißt meist: Vorschau-Ton + OBS (siehe `docs/AUDIO.md`). |
| Nach Neustart alles weg | Einstellungen liegen in `data/chat.json` (bzw. `LIVEFX_DATA_DIR`). Datei kaputt → Standardwerte, Hinweis im Server-Log. |

Server-Log (`node server.js` im Terminal) zeigt jede Statusänderung: `chat: twitch #kanal connected`,
`chat: youtube <id> error (…)`.
