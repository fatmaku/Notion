# Wirkung & Dank (`impact`) – die ernste Seite

## Was

* **Schnelle Hilfe für Freiwillige** im Katzenprofil: „Gefüttert“, „Wasser gegeben“, „Zum Tierarzt
  gebracht“, „Wieder gut“ – ein Tipp, fertig (Tierarzt und „wieder gut“ fragen kurz nach, weil sich
  der Status ändert; eine kurze, öffentliche Notiz ist möglich). Der bisherige Knopf „Status ändern“
  bleibt.
* **Dank-Feed** („Danke-Nachrichten“, `#/feed`): Wer eine Katze gemeldet hat, bekommt eine Nachricht,
  wenn ihr danach jemand hilft: „Duman · Hat Futter bekommen – dank deiner Meldung 💚“. Oben in der
  Kopfzeile sitzt ein Herz mit der Zahl der neuen Nachrichten.
* **Deine Wirkung** (Profil, Dank-Feed und eine Zeile auf „Heute“, sobald es etwas gibt): gesendete
  Meldungen, Katzen, denen nach deiner Meldung geholfen wurde, Katzen, die du zuerst gefunden hast,
  wie oft andere „deine“ Katzen gesehen haben, und für Freiwillige: wie oft sie geholfen haben.
* **Hilfe-Leitfaden** „So hilfst du Straßenkatzen“ in 6 Sprachen: Futter (Trockenfutter; keine
  Milch, keine salzigen/scharfen Reste, keine gekochten Knochen), Wasser (jeden Tag, im Sommer am
  wichtigsten), Kälte (trockene Kiste, Stroh statt Decke), Kitten (nicht wegtragen, die Mutter ist
  meist in der Nähe), krank/verletzt (ruhig Abstand halten, nicht hinterherlaufen, in Cat Me melden,
  Tierarztpraxis in der Nähe oder Veterinärdienst der Gemeinde fragen), Ohrspitze = kastriert, und:
  „Du musst eine Katze nicht anfassen, um ihr zu helfen.“ Bewusst ohne Telefonnummern und Vereine.

## Warum

Wer eine hungrige oder verletzte Katze meldet, soll sehen, dass das etwas bewirkt – sonst meldet
niemand ein zweites Mal. Freiwillige halten mit einem Tipp fest, was sie getan haben; das Protokoll
der Katze zeigt es allen. Und alle – Gäste wie Nachbar:innen – lernen, wie man richtig hilft (die
häufigsten Fehler: Milch, Essensreste, Kitten mitnehmen, kranke Katzen einfangen wollen).

## So benutzt man es

* **Melden** wie bisher (nach dem Foto auf der Sammelkarte oder im Katzenprofil „Zustand melden“).
  Im Formular steht jetzt „💚 Wie kann ich helfen?“ – das öffnet den Leitfaden als Fenster, das
  Formular bleibt offen.
* **Freiwillige** (Rolle `volunteer` oder `admin`, vergeben in der Moderation): Katzenprofil →
  Karte „Schnelle Hilfe · Für Freiwillige“. „Wieder gut“ erscheint nur bei „braucht Hilfe“ oder „in
  Behandlung“. Danach zeigt eine Meldung, wie viele Melder:innen einen Dank bekommen.
* **Herz oben** → Dank-Feed. Neue Einträge sind markiert; beim Öffnen werden sie als gelesen
  gespeichert (nur bis zum Stand der Liste – was danach kommt, bleibt neu). Die Zahl wird bei jedem
  Seitenwechsel (höchstens alle 20 s), beim Zurückkehren in die App und alle 2 Minuten aktualisiert.
* **Leitfaden**: `#/guide` in der App (Links: Meldeformular, Katzenprofil bei „braucht Hilfe“, Regeln,
  Profil, Dank-Feed) und öffentlich ohne Konto unter **`/guide.html`** (Sprachwahl, `?lang=fa`,
  „Jetzt spielen“). Die öffentlichen Katzenseiten `/c/<id>` (Erweiterung `share`) verlinken
  `guide.html` bei „braucht Hilfe“ automatisch.
* **Browser-Demo** (`/app.html?demo=1`): Man ist selbst Freiwillige:r und kann alle Knöpfe ausprobieren.
  Damit man auch den Dank sieht, reagiert die Demo-Freiwillige „ModaAyşe“ etwa 1 Minute nach einer
  eigenen Meldung (hungrig → gefüttert, durstig → Wasser, krank/verletzt → Tierarzt). Nur im Browser-
  Demo, als `demo` markiert – nie auf dem Server.

## Regeln

| Aktion | Ereignis | Erlaubt bei (Status) | Neuer Status | Abklingzeit (gleiche Person + Katze) |
|---|---|---|---|---|
| `fed` – gefüttert | `care_fed` | draußen, braucht Hilfe, in Behandlung, lange nicht gesehen | bleibt | 3 h |
| `water` – Wasser | `care_water` | wie oben | bleibt | 3 h |
| `vet` – Tierarzt | `care_vet` | wie oben | `in_care` | 12 h |
| `ok` – wieder gut | `care_ok` | braucht Hilfe, in Behandlung | `active` | 1 h |

Adoptiert/verstorben → `409 cat_closed`; „wieder gut“ bei „draußen, gut“ → `409 already_ok`, bei
„lange nicht gesehen“ → `409 invalid_transition` (der Status wird aus der letzten Sichtung berechnet –
ein Foto im Spiel holt die Katze zurück). Höchstens 60 Aktionen pro Person und Tag (`429 care_limit`).
Notizen ≤ 300 Zeichen, gleicher Wortfilter wie Hilfe-Meldungen.

**Wer bekommt einen Dank?** Jede Person, die die Katze **in den 14 Tagen vor der Hilfe** gemeldet
hat – außer der helfenden Person selbst. Als Meldung zählt: Hilfe-Meldung (ab „Beobachten“, auch
reiner Text), Zustand mit „hungrig“ oder „durstig“ (oder ab „Beobachten“) und der KI-Gesundheits-
hinweis aus dem eigenen Foto. „Gesund“, „gefüttert“, „hat Kitten“ allein zählen nicht. Als Hilfe
zählen die vier Aktionen und Statuswechsel durch Freiwillige/Moderation nach „in Behandlung“,
„adoptiert“ und „draußen, gut“ (aus „braucht Hilfe“/„in Behandlung“) – „verstorben“ erzeugt keinen
Dank. Gleiche Art von Dank für dieselbe Katze innerhalb von 6 h nur einmal.

## Technik

| Teil | Datei |
|---|---|
| Engine (auch im Browser-Demo) | `public/core/impact.js` → `careAction`, `myFeed`, `feedCount`, `markFeedRead`, `myImpact`, `demoRespond` |
| Server-Routen | `server/impact.js` (`mountImpact`), eingehängt am Anker in `server/app.js` |
| App | `public/js/views/impact.js` (Herz, Feed, Wirkung, Hinweis + Hilfe-Knöpfe), `public/js/views/guide.js` (Leitfaden, Fenster, Link) |
| Öffentliche Seite | `public/guide.html` + `public/js/guide-page.js` |
| Einbindung | Anker in `engine.js`, `api.js` (beide APIs), `app.js` (Routen `#/feed`, `#/guide` + eine Zeile in `shell()`), `sw.js`, `app.css`; je ein Import + Platzhalter in `views/cat.js`, `home.js`, `profile.js`, `condition.js` |
| Texte | `feed.*`, `impact.*`, `care.*`, `guide.*`, `ev.care_*`, `err.*` in `public/js/lang/*.js` |
| Tests | `test/impact.test.js` |

Der Feed wird **nicht gespeichert, sondern aus den Katzen-Ereignissen berechnet** (Index `by` für
die eigenen Meldungen, Index `catId` für die Hilfe). Dadurch braucht `store.js` keine neue Sammlung,
und beim Zusammenführen von Katzen (Ereignisse ziehen mit um) stimmt der Dank weiter. Gespeichert wird
nur `player.feedReadAt` (Zeitpunkt „gelesen bis“).

## API

| Methode | Pfad | Wer | Antwort |
|---|---|---|---|
| GET | `/api/me/feed[?limit=50]` | angemeldet | `{items: [{id, kind, at, reportedAt, unread, cat: {id, name, photoUrl, profile, status, demo}}], unread, total, readAt, now}` – neueste zuerst, `kind` ∈ `fed water vet ok care adopted` |
| GET | `/api/me/feed?count=1` | angemeldet | `{unread, now}` (für das Herz) |
| POST | `/api/me/feed/read` `{upTo}` | angemeldet | `{unread, now}` – `upTo` = `now` aus der Liste (Zukunft → jetzt) |
| GET | `/api/me/impact` | angemeldet | `{reports, helpedCats, foundFirst, seenByOthers, careActions, thanks}` |
| POST | `/api/cats/:id/care` `{action, note?}` | Rolle `volunteer`/`admin` (serverseitig) | `201 {cat, event: {type, action, at, from, to}, notified}` |

Fehler: `401 login_required`, `403 volunteers_only|banned`, `400 invalid_action|text_not_allowed`,
`404 cat_not_found`, `409 care_too_soon (Retry-After)|cat_closed|already_ok|invalid_transition`,
`429 care_limit|rate_limited`. Ratenbegrenzung `POST /care`: gemeinsame Schreib-Grenze pro IP
(30/min) **und** 12/min pro Konto (Stoß 20); `POST /feed/read`: 30/min pro Konto.

## Grenzen

* **Datenschutz:** Der Feed enthält nur die öffentliche Katze (Name, Ausschnitt-Foto, Muster, Status) –
  keine Koordinaten, keine Spitznamen der Helfer:innen. Das öffentliche Protokoll der Katze zeigt die
  Hilfe mit Spitzname (wie bisher bei Statuswechseln); Notizen sind öffentlich (Hinweis im Feld).
* Kein Push: Der Dank erscheint beim nächsten Öffnen der App (Herz-Zahl).
* Wer auf einem anderen Gerät spielt, hat ein anderes Konto (kein Login) – dort gibt es keinen Dank.
* Ob wirklich geholfen wurde, prüft niemand: Die Aktionen sind nur für Freiwillige freigeschaltet,
  die die Moderation ernannt hat.
* Der Leitfaden ist allgemein und ersetzt keinen Tierarzt. Er nennt bewusst keine Telefonnummern
  oder Organisationen; die können später (geprüft) ergänzt werden.
