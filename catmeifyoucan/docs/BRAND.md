# Cat Me If You Can · Marken- und Textleitfaden

Dieser Leitfaden gilt für alles: App, Startseite, Trailer, Social-Media-Bilder, Übersetzungen.

## 1. Name und Schreibweise

| Was | Richtig | Falsch |
|---|---|---|
| Name | **Cat Me If You Can** | CAT ME if you can · Cat me if you can · CatMeIfYouCan (außer Hashtag/Domain) |
| Kurzform | **Cat Me** | CATME · catme |
| Sammlung im Spiel | **KediDex** | Kedidex · KEDIDEX |
| Ort | **Kadıköy** (mit ı und ö) | Kadikoy (nur in Hashtags/URLs) |
| Macher | **HappyTuncay** (ein Wort, H und T groß) | Happy Tuncay · happytuncay |
| Café des Machers | **Happy Overthinking Coffee** (jedes Wort groß) | happy overthinking coffee |

* **Keine Großbuchstaben-Zeilen.** Kein `text-transform: uppercase`, keine Texte in GANZ GROSS
  (Türkisch: i/İ würde falsch). Überschriften und Knöpfe im Satzanfang groß („Jetzt spielen“).
* Hashtags: `#CatMeIfYouCan` `#CatMeKadikoy` `#Kadıköy` `#KadikoyCats` `#StreetCatsOfIstanbul`.
* Slogan überall auf Englisch (das Wortspiel): **„Cat me if you can.“** Darunter eine einfache
  Zeile in der Landessprache.

## 2. Macher-Zeile (immer im Fußbereich, im Trailer am Ende)

| Sprache | Text |
|---|---|
| en | A HappyTuncay product · Made at Happy Overthinking Coffee, Kadıköy |
| tr | Bir HappyTuncay ürünü · Kadıköy'deki Happy Overthinking Coffee'de doğdu |
| de | Ein Produkt von HappyTuncay · Entstanden im Happy Overthinking Coffee, Kadıköy |
| ru | Продукт HappyTuncay · Создано в Happy Overthinking Coffee, Кадыкёй |
| ar | منتج من HappyTuncay · وُلد في Happy Overthinking Coffee، قاضي كوي |
| fa | محصولی از HappyTuncay · ساخته‌شده در Happy Overthinking Coffee، کادیکوی |

Markennamen (HappyTuncay, Happy Overthinking Coffee, Cat Me If You Can, KediDex) werden nie übersetzt.

## 3. Sprachen

Reihenfolge: **tr · en · de · ru · ar · fa**. Das sind Türkisch, dazu die häufigsten Gäste
Istanbuls: Englisch, Deutsch, Russisch, Arabisch und Persisch. `ar` und `fa` laufen von rechts nach
links (`dir="rtl"`). Fehlt ein Text, wird **Englisch** angezeigt. Erkannt wird die Sprache über
den Browser; die Wahl wird gespeichert (`localStorage` `catme.lang`).

## 4. So schreiben wir

* **Sehr einfach.** Viele Leser:innen sind Gäste und lesen nicht in ihrer Muttersprache.
  Kurze Sätze (höchstens etwa 12 Wörter), bekannte Wörter, keine Fachbegriffe.
  Nicht „BCS“, „TNR“, „Zensus“, sondern „Ernährung“, „kastriert (Ohrmarke)“, „wir zählen die Katzen“.
* **Herzlich und ehrlich.** Spaß zuerst, aber die Katzen sind keine Beute. Nie „jagen“ oder
  „Beute“ schreiben, sondern **fotografieren, finden, sammeln**.
* **Du-Form** (tr: sen, de: du, ru: ты, ar/fa: freundlich-direkt).
* Zahlen als Ziffern („20 Katzen“, „20 %“). Prozent in Landesschreibweise: tr `%20`, de `20 %`,
  en/ru `20%`, ar `٪20` oder `20%`, fa `۲۰٪` oder `20%`. Einheitlich innerhalb einer Sprache bleiben.

## 5. Die fünf Kernbotschaften (in dieser Reihenfolge)

1. **Kadıköy hat tausende Straßenkatzen.** Jede hat ein Gesicht und eine Geschichte.
2. **Mach ein Foto – die Katze landet in deinem KediDex.** Die App erkennt Typ, Alter und Zustand.
3. **Neue Katze? Du gibst ihr den Namen.** Wer sie zuerst findet, benennt sie.
4. **20 verschiedene Katzen an einem Tag = 20 % Rabatt** in einem Partner-Café. Nur an diesem Tag.
5. **Jedes Foto hilft.** Wir zählen die Katzen. Du kannst melden: hungrig, krank, verletzt.
   Freiwillige sehen das und helfen.

Verhaltensregeln (immer dazu, kurz): nur fotografieren · nicht anfassen, nicht jagen · kein Blitz ·
nur Straßenkatzen.

## 6. Vorteile (für die Startseite)

| Für wen | Vorteil |
|---|---|
| Du | Spaß draußen, Kadıköy neu entdecken, Rabatt im Café, deiner Katze einen Namen geben |
| Die Katzen | werden gezählt; Kranke und Hungrige werden gemeldet; Freiwillige helfen schneller |
| Cafés | neue Gäste aus der Nachbarschaft und von weit weg |
| Kadıköy | eine Karte aller Straßenkatzen: Wo fehlt Futter? Wo braucht es Kastration? |

## 7. Gestaltung

| Token | Wert | Verwendung |
|---|---|---|
| `--navy` | `#14213d` | Nacht über Kadıköy, Hintergründe, Text auf Hell |
| `--orange` | `#f28c28` | Sarman-Orange, Hauptakzent, Knöpfe |
| `--cream` | `#fbf3e4` | heller Grund, Text auf Dunkel |
| `--teal` | `#1f8a8a` | Bosporus, zweiter Akzent, Links |
| `--sun` | `#f6d55c` | kleine Highlights (Auge im Logo, Sterne) |

* **Schriften** (lokal, `css/fonts.css`): **Unbounded** für Überschriften (modern, breit),
  **Manrope** für Text, **Vazirmatn** für Arabisch/Persisch. Alle können Türkisch und Kyrillisch.
* **Logo:** `public/icons/logo.svg`, eine zwinkernde Sarman-Katze im Kamera-Sucher. Nicht verzerren,
  nicht umfärben.
* **Abstände:** großzügig. Grundraster 8 px; Abschnitte mindestens 64 px (Handy) bzw. 120 px
  (Desktop) Abstand; Fließtext höchstens ca. 60 Zeichen breit.
* **Bewegung:** ruhig und weich (ease-out, 300–800 ms), nichts blinkt. `prefers-reduced-motion`
  respektieren: dann keine Animationen, nur statische Bilder.

## 8. Technische Leitplanken

* Keine fremden Server: alles liegt unter `public/` (Content-Security-Policy `script-src 'self'`).
  **Keine Inline-Skripte** (nur `<script type="module" src="…">`), Inline-Styles sind erlaubt.
* 3D: three.js liegt unter `public/vendor/three/three.module.min.js` (ES-Modul, `import * as THREE from '…'`).
* Echte Zahlen: `GET /api/stats` (Server). Ohne Server: Demo-Zahlen und ein Hinweis „Demo“.

### Dateien

| Was | Pfad |
|---|---|
| Startseite | `public/index.html` + `public/site/` (CSS, JS, Bilder, eigene Texte `public/site/i18n.js`) |
| Spiel | `public/app.html` (nicht umbenennen; Startseite verlinkt „Jetzt spielen“ → `app.html`) |
| Trailer | `public/media/trailer-16x9-<lang>.mp4`, `public/media/trailer-9x16-<lang>.mp4`, Standbild `public/media/trailer-16x9-<lang>.jpg` |
| Vorschaubild für Links | `public/media/og-<lang>.png` (1200 × 630), `public/media/og.png` = Englisch |
| Social-Media-Bilder | `marketing/social/<motiv>-<post\|story>-<lang>.jpg` (JPEG, ≤ 350 KB) + Texte `marketing/CAPTIONS.md` |
