# GIF-Suche (KLIPY & GIPHY)

LiveFX sucht direkt in der Mediathek (Panel → **Medien** → **GIF-Suche**) weltweit nach GIFs bei **KLIPY** oder
**GIPHY**. Ein Treffer wird mit **„Als Trigger“** zu einem Bild-Trigger. Die Suche läuft über den LiveFX-Server;
die API-Keys verlassen den Server nie.

> **Tenor gibt es nicht mehr.** Google hat die Tenor-API am **30. Juni 2026** abgeschaltet, seitdem schlagen alle
> Anfragen fehl. LiveFX 2.1 hat Tenor entfernt. Ein alter Tenor-Key in `data/config.json` oder in
> `LIVEFX_TENOR_KEY` wird ignoriert; das Panel zeigt dann einen Hinweis. `provider=tenor` beantwortet der Server
> mit `410 provider_removed`. Ersatz ist **KLIPY**: Das ist das frühere Tenor-Team, die API ist Tenor-kompatibel
> und kostenlos.

## 1. KLIPY-Key holen (kostenlos, empfohlen)

1. Auf <https://partner.klipy.com> registrieren.
2. **API Keys** → **Add Platform** → Plattform anlegen (z. B. „LiveFX Overlay“, Web). Der angezeigte Key ist dein
   KLIPY-Key.
3. Für den Dauerbetrieb im Partner-Panel **Production Access** beantragen. Davor gilt ein Test-Kontingent.

KLIPY ist kostenlos. Pflicht ist nur die sichtbare Angabe **„Powered by KLIPY“**, die LiveFX automatisch
einblendet. Technisch nutzt LiveFX die Tenor-v2-kompatible Schnittstelle `https://api.klipy.com/v2/search`. Sie
wird immer mit `rating=g`, `contentfilter=high` und `locale=de_DE|tr_TR|en_US` aufgerufen.

## 2. GIPHY-Key holen (optional)

1. <https://developers.giphy.com/> öffnen → anmelden → **Create an App** → **API** (nicht SDK).
2. Auf der App-Seite steht der **API Key**. Das ist ein **Beta-Key mit 100 Aufrufen pro Stunde**. Für eine Suche
   nebenbei reicht das, bei viel Suchen ist das Limit aber schnell erreicht.
3. Ein **Production-Key** (ohne dieses Limit) muss bei GIPHY beantragt werden und **kostet Geld**. Für LiveFX
   reicht in der Regel KLIPY.

LiveFX sendet an GIPHY immer `rating=g`. Ohne diesen Parameter liefert GIPHY *alle* Altersstufen. Außerdem
geht `lang=de|tr|en` mit. Pflicht ist der gut sichtbare Hinweis **„Powered By GIPHY“**. Er steht immer unter den
Ergebnissen, sobald GIPHY gewählt ist.

## 3. Keys eintragen

**Variante A, im Panel:** Karte **Medien** → **GIF-Suche**. Solange kein Key bekannt ist, steht dort
„GIF-Suche: API-Key fehlt“ mit den Feldern **KLIPY-Key** und **GIPHY-Key**. Key einfügen und **Speichern**
klicken. Der Server speichert die Keys in `data/config.json` (Dateimodus 0600).

**Variante B, Umgebungsvariablen** (haben Vorrang vor `config.json`):

```bash
LIVEFX_KLIPY_KEY=… LIVEFX_GIPHY_KEY=… node server.js
```

**Variante C, per API:**

```bash
curl -X PUT http://127.0.0.1:8787/api/gifs/keys \
  -H "Authorization: Bearer <token aus data/token.txt>" \
  -H "Content-Type: application/json" \
  -d '{"klipyKey":"…","giphyKey":""}'      # "" entfernt einen Key; {"tenorKey":""} räumt einen alten Tenor-Key weg
```

## 4. Benutzung

- Suchbegriff eingeben, Anbieter (**KLIPY** oder **GIPHY**) und Sprache (de/en/tr) wählen, dann **Suchen**
  klicken. Die Sprache folgt der Sprech-Sprache des Panels, wenn dort eine feste Sprache eingestellt ist. Sonst
  gilt die Browsersprache.
- **⚡ Als Trigger** öffnet den Trigger-Editor mit einem Bild-Trigger. Als Bildquelle dient der **direkte Link
  (Hotlink)** auf den Medienserver des Anbieters, in einer kleinen Version (webp/gif, ca. 200 px). Das ist
  schnell und schont das Overlay. Das Trigger-Schema lässt als Link **nur** `https://` auf `klipy.com` (plus eine
  Subdomain, z. B. `static.klipy.com`) und `media.giphy.com` / `media0–9.giphy.com` / `i.giphy.com` zu, ohne Port
  und ohne Benutzerangabe (`HOTLINK_SRC_RE` in `js/schema.js`). Andere Adressen werden zur Emoji-Karte. Lädt ein
  GIF später nicht mehr (gelöscht beim Anbieter, offline), zeigt das Overlay ebenfalls das Emoji des Triggers.
- Kostenlose Alternative ohne Key: Tab **„Sticker (kostenlos)“** in derselben Mediathek (143 Fluent-Emoji-Sticker,
  siehe [STICKER.md](STICKER.md)).
- **🙈 ausblenden** entfernt ein einzelnes GIF aus allen künftigen Suchen in diesem Browser (gespeichert unter
  `localStorage` → `livefx.gifs.hidden`). „Ausgeblendete wieder zeigen“ holt die GIFs der aktuellen Suche
  zurück.
- Die Zeile **„Powered by KLIPY“** bzw. **„Powered By GIPHY“** steht immer unter den Ergebnissen. Bitte nicht
  entfernen, sie ist Bedingung der Anbieter.

### Kein Speichern, kein Cache (Nutzungsbedingungen)

Die GIPHY-Bedingungen verbieten es, Inhalte zu **speichern, zwischenzuspeichern oder über einen eigenen Server
auszuliefern (Proxy)**. KLIPY behandelt LiveFX genauso, solange dessen Bedingungen das nicht ausdrücklich
erlauben. Deshalb:

- Ein GIF wird **nie heruntergeladen** und nie in `data/assets/` abgelegt. Der Trigger enthält nur den Link.
- `POST /api/gifs/import` antwortet für KLIPY-, GIPHY- und alte Tenor-Adressen mit **`403 provider_terms`**. Für
  alle anderen Adressen gilt `400 host_not_allowed`. **Eigene** Bilder kommen weiter über „📤 Datei hochladen“
  (`POST /api/assets`) in die Mediathek.
- Suchergebnisse werden nicht gecacht, jede Suche ist eine echte Anfrage beim Anbieter.
- Konsequenz: Ein GIF-Trigger braucht beim Abspielen Internet. Löscht der Anbieter das GIF, bleibt der Trigger
  leer.

## 5. Sicherheitsfilter

Die Altersfreigaben der Anbieter (`rating=g`) lassen erfahrungsgemäß manches durch. LiveFX prüft deshalb
zusätzlich selbst, mit `js/safety.js` (`LiveFXSafety`):

1. **Suchbegriff:** Ein gesperrter Begriff wird gar nicht erst an den Anbieter geschickt. Die Antwort ist
   `{ok:true, results:[], blocked:true, reason}`, das Panel zeigt z. B. *„Dieser Suchbegriff ist gesperrt
   (Religion).“*
2. **Ergebnisse:** Titel, Tags, Slug und Beschreibung jedes Treffers werden geprüft. Treffer mit gesperrten
   Wörtern werden entfernt (`filtered` in der Antwort zählt sie).

Gesperrte Kategorien (Begriffe jeweils auf Deutsch, Türkisch und Englisch):

| Kategorie (`reason`) | Beispiele |
|---|---|
| `politics`: Politik | Parteien, „Präsident/Cumhurbaşkanı/Kanzler“, Wahlen, Protest-Slogans, Politikernamen |
| `religion`: Religion | Religionen, heilige Personen, Schriften und Orte (Kirche, Cami, Moschee …), Gebetsbegriffe |
| `hate`: Hass/Diskriminierung | Beleidigungen gegen Gruppen, rassistische und extremistische Begriffe (im Quelltext ROT13-kodiert) |
| `nsfw`: Sexuelle Inhalte | sexuelle Begriffe, Pornografie, vulgäre Ausdrücke |
| `violence`: Gewalt/Waffen/Terror | Waffen, Mord, Terror, Krieg, Suizid |
| `drugs`: Drogen/Alkohol | Drogen, Alkohol, Zigaretten |

So wird verglichen: Groß- und Kleinschreibung zählt nicht. Türkische und deutsche Sonderzeichen werden
vereinheitlicht (ı/i, ş/s, ç/c, ğ/g, ö/oe/o, ü/ue/u, ä/ae/a, ß/ss), ebenso Leetspeak (`0→o 1→i 3→e 4→a 5→s 7→t
@→a`). Auch gestreckte Wörter („kiiirche“) und gesperrt geschriebene („k.i.r.c.h.e“) werden erkannt. Verglichen
werden **ganze Wörter und Wortfolgen**. Deshalb bleiben „krass“, „yok artık“, „party“, „class“ oder „pass“
erlaubt. Feiertage wie „Weihnachten“ sind bewusst nicht gesperrt.

### Melden & ausblenden

- Rutscht trotzdem ein unpassendes GIF durch: mit **🙈 ausblenden** sofort entfernen. Es taucht in diesem Browser
  nicht mehr auf.
- Beim Anbieter melden: GIPHY über das Meldesymbol auf der GIF-Seite auf giphy.com, KLIPY über
  <https://klipy.com/support>.
- Fehlt ein Begriff im Filter oder sperrt er zu viel: als Issue melden oder die Listen in `js/safety.js`
  anpassen (`TERMS`, Hass-Begriffe in `HATE_ROT13`). Tests dazu stehen in `test/safety.test.js`.

## 6. API

| Route | Zweck |
|---|---|
| `GET /api/gifs/search?q=katze&provider=auto\|klipy\|giphy&limit=1..50&lang=de\|en\|tr` | `{ok, provider, attribution, lang, results:[{id, title, preview, url, width, height, provider}], filtered}` oder `{ok, blocked:true, reason, message, results:[]}` |
| `PUT /api/gifs/keys {klipyKey?, giphyKey?}` | Keys setzen (`""` entfernt) |
| `GET /api/gifs/status` | `{providers:{klipy, giphy}, default, attribution, mock, tenorRemoved?}` |
| `POST /api/gifs/import` | gesperrt: `403 provider_terms` (Anbieter-Medien) bzw. `400 host_not_allowed` |

`auto` nimmt KLIPY, wenn ein KLIPY-Key gesetzt ist, sonst GIPHY. Fehlercodes: `503 no_provider` (kein Key),
`502 upstream` (Anbieter nicht erreichbar), `410 provider_removed` (Tenor), `403 provider_terms`.

## 7. Demo-Modus ohne Internet (`LIVEFX_GIF_MOCK=1`)

```bash
LIVEFX_GIF_MOCK=1 node server.js
```

Beide Anbieter gelten dann als konfiguriert. Jede Suche liefert sechs Platzhalter, dazu drei absichtlich
unpassende Treffer, die der Filter entfernen muss. Die Vorschaubilder kommen vom eigenen Server
(`/api/gifs/mock/<n>.gif`). Die `url` sieht aus wie ein echter Hotlink (`https://static.klipy.com/…`,
`https://media.giphy.com/…`). `GET /api/gifs/mock-stats` zeigt die zuletzt gebaute Anbieter-Anfrage (ohne Key),
so prüfen die Tests `rating=g` und `lang`. Die automatischen Tests (`test/api-gifs.test.js`,
`test/e2e/80-gifs.js`) bauen nie eine Verbindung zu KLIPY oder GIPHY auf.

---

## Türkçe (kısa)

**Tenor API 30 Haziran 2026'da kapatıldı.** LiveFX artık **KLIPY** (ücretsiz, eski Tenor ekibi) ve **GIPHY**
kullanıyor.

- **KLIPY anahtarı:** <https://partner.klipy.com> → API Keys → Add Platform. Ücretsizdir; „Powered by KLIPY“
  yazısı görünür kalmalıdır.
- **GIPHY anahtarı:** developers.giphy.com → Create an App → API. Beta anahtar saatte 100 istek ile sınırlıdır.
  Production anahtarı ücretlidir. „Powered By GIPHY“ yazısı her zaman görünür.
- Anahtarlar Panel → Medya → GIF-Suche alanına girilir veya `LIVEFX_KLIPY_KEY` / `LIVEFX_GIPHY_KEY` ile verilir.
- GIF'ler **indirilmez ve saklanmaz**. „Als Trigger“ doğrudan sağlayıcının bağlantısını kullanır (kullanım
  koşulları gereği).
- **Güvenlik filtresi:** Siyaset, din, nefret söylemi, cinsel içerik, şiddet/silah/terör ve uyuşturucu/alkol
  terimleri engellenir. Engellenen aramalar sağlayıcıya hiç gönderilmez.
- Uygunsuz bir GIF'i **🙈 ausblenden** ile gizleyin (tarayıcıda kalıcıdır) ve sağlayıcıya bildirin.

## English (short)

**The Tenor API was shut down on 30 June 2026.** LiveFX now uses **KLIPY** (free, built by the former Tenor
team) and **GIPHY**.

- **KLIPY key:** <https://partner.klipy.com> → API Keys → Add Platform. It is free; the "Powered by KLIPY" line
  must stay visible.
- **GIPHY key:** developers.giphy.com → Create an App → API. The beta key allows 100 calls/hour; a production
  key is paid. "Powered By GIPHY" is always shown.
- Enter the keys in Panel → Media → GIF search, or set `LIVEFX_KLIPY_KEY` / `LIVEFX_GIPHY_KEY`.
- GIFs are **never downloaded, cached or proxied**. "Als Trigger" uses the provider's hotlink, as their terms
  require. Importing provider media returns `403 provider_terms`.
- **Safety filter:** politics, religion, hate/slurs, sexual content, violence/weapons/terror and drugs/alcohol
  are blocked in DE/TR/EN. Blocked queries never reach the provider, and results are filtered by
  title/tags/slug.
- Hide a bad result with **🙈 ausblenden** (persists per browser) and report it to the provider.
