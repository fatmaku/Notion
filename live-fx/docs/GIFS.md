# GIF-Suche (Tenor & Giphy)

LiveFX kann direkt in der Mediathek (Panel → **Medien** → **GIF-Suche**) nach GIFs bei Tenor und Giphy suchen
und Treffer mit einem Klick in die eigene Mediathek übernehmen („Speichern“) oder gleich als Trigger anlegen
(„Als Trigger“). Die Suche läuft über den LiveFX-Server; der Browser spricht nie selbst mit Tenor/Giphy und die
API-Keys verlassen den Server nicht.

Dafür braucht der Server mindestens einen (kostenlosen) API-Key. Beide Anbieter erlauben die private Nutzung
in großzügigen Kontingenten – für einen Stream reicht das locker.

## 1. Kostenlosen Tenor-Key holen (empfohlen)

Tenor gehört zu Google; der Key kommt aus der Google Cloud Console.

1. <https://console.cloud.google.com/> öffnen und mit einem Google-Konto anmelden (ein Cloud-Projekt wird beim
   ersten Mal automatisch angelegt oder über „Neues Projekt“ erstellt – kostenlos, keine Kreditkarte nötig).
2. Links im Menü **APIs & Dienste → Bibliothek** wählen, nach **„Tenor API“** suchen und **Aktivieren** klicken.
3. Dann **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → API-Schlüssel**.
4. Der angezeigte Schlüssel (beginnt meist mit `AIza…`) ist dein Tenor-Key. Optional unter „Schlüssel
   einschränken“ nur die Tenor API freigeben.

## 2. Kostenlosen Giphy-Key holen

1. <https://developers.giphy.com/> öffnen, Konto anlegen bzw. anmelden.
2. **Create an App** → **API** (nicht SDK) auswählen → App-Name und Beschreibung eintragen (z. B. „LiveFX Overlay“).
3. Auf der App-Seite steht der **API Key**. Das ist zunächst ein *Beta*-Key mit begrenztem Kontingent
   (mehrere hundert Anfragen pro Stunde) – für den Eigengebrauch völlig ausreichend.

## 3. Keys eintragen

**Variante A – im Panel:** Panel öffnen → Karte **Medien** → Abschnitt **GIF-Suche**. Solange kein Key bekannt ist,
steht dort „GIF-Suche: API-Key fehlt“ mit zwei Feldern (Tenor-Key / Giphy-Key). Key einfügen → **Speichern**.
Der Server legt die Keys in `data/config.json` ab (nur für den eigenen Benutzer lesbar, Dateimodus 0600). Ein
leeres Feld beim Speichern entfernt den jeweiligen Key wieder.

**Variante B – Umgebungsvariablen** (haben Vorrang vor `config.json`):

```bash
LIVEFX_TENOR_KEY=AIza… LIVEFX_GIPHY_KEY=… node server.js
```

**Variante C – per API** (z. B. aus einem Skript):

```bash
curl -X PUT http://127.0.0.1:8787/api/gifs/keys \
  -H "Authorization: Bearer <token aus data/token.txt>" \
  -H "Content-Type: application/json" \
  -d '{"tenorKey":"AIza…","giphyKey":""}'
```

Ob ein Anbieter konfiguriert ist, zeigt `GET /api/gifs/status` → `{"ok":true,"providers":{"tenor":true,"giphy":false},"mock":false}`.
Die Keys selbst werden von keiner Route zurückgegeben.

## 4. Benutzung

- Suchbegriff eingeben, Anbieter (**Auto** = Tenor, falls konfiguriert, sonst Giphy) und Sprache (de/en/tr) wählen,
  **Suchen**.
- **Speichern** lädt das GIF über den Server herunter (max. 8 MB, nur echte GIF/PNG/JPEG/WEBP-Dateien, nur von
  Tenor-/Giphy-Servern) und legt es unter `data/assets/` ab. Danach taucht es in der Mediathek und im
  Trigger-Editor (✎ → Bild) auf.
- **Als Trigger** speichert das GIF und legt direkt einen neuen Trigger damit an.
- Ergebnisse werden 5 Minuten lang zwischengespeichert, damit wiederholte Suchen kein Kontingent verbrauchen.

API für eigene Tools (alle mit Bearer-Token oder aus dem Panel):

| Route | Zweck |
|---|---|
| `GET /api/gifs/search?q=katze&provider=auto\|tenor\|giphy&limit=1..50&lang=de\|en\|tr` | `{ok, provider, results:[{id, title, preview, url, width, height}]}` |
| `POST /api/gifs/import {url, name?}` | lädt eine Tenor-/Giphy-URL in die Mediathek: `{ok, asset:{name, url, size, type, mtime}}` |
| `PUT /api/gifs/keys {tenorKey?, giphyKey?}` | Keys setzen (`""` entfernt) |
| `GET /api/gifs/status` | konfigurierte Anbieter |

Fehlercodes: `503 no_provider` (kein Key), `502 upstream` (Anbieter nicht erreichbar), `400 host_not_allowed`
(Import-URL nicht von Tenor/Giphy), `413 payload_too_large`, `415 unsupported_type`.

## 5. Lizenz & Attribution

Die Inhalte von Tenor und Giphy dürfen laut deren Nutzungsbedingungen über die offiziellen APIs in eigenen
Anwendungen angezeigt und verwendet werden. Beide Anbieter verlangen dafür einen sichtbaren Hinweis
**„Powered by Tenor“** bzw. **„Powered by GIPHY“** – LiveFX blendet diese Zeile automatisch neben den
Suchergebnissen ein. Bitte lasse sie stehen. Für den kommerziellen Einsatz oder das Weiterverteilen
gespeicherter GIFs gelten die Bedingungen des jeweiligen Anbieters:

- Tenor: <https://tenor.com/gifapi/documentation> (Abschnitt „Attribution“) und <https://tenor.com/legal-terms>
- Giphy: <https://developers.giphy.com/docs/api#attribution> und <https://support.giphy.com/hc/en-us/articles/360020027752-GIPHY-API-Terms-of-Service>

Die Suche verwendet die Inhaltsfilter `contentfilter=medium` (Tenor) bzw. `rating=pg-13` (Giphy).

## 6. Demo-Modus ohne Internet (`LIVEFX_GIF_MOCK=1`)

Für Tests, Vorführungen oder Rechner ohne Internetzugang gibt es einen eingebauten Mock:

```bash
LIVEFX_GIF_MOCK=1 node server.js
```

Dann melden beide Anbieter „konfiguriert“ (`"mock": true` im Status), jede Suche liefert sechs Platzhalter-GIFs
(der Suchbegriff steht im Titel) und der Import funktioniert komplett lokal – der Server liefert die
Platzhalter unter `/api/gifs/mock/<n>.gif` selbst aus. Es wird nie eine Verbindung zu Tenor oder Giphy aufgebaut.
Die automatischen Tests (`test/api-gifs.test.js`, `test/e2e/80-gifs.js`) laufen ausschließlich in diesem Modus.
