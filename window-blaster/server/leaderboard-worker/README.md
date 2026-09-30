# Weltweite Rangliste (Cloudflare Worker)

Kostenloser Backend-Dienst für die weltweite Bestenliste von Window Blaster.
Jede eingereichte Runde wird serverseitig mit den gemeinsamen Punkteformeln
(`shared/scoring.ts`, `shared/verify.ts`) **nachgerechnet**; nur Runden, deren
Ereignisprotokoll den Punktestand exakt erklärt, werden eingetragen. Demo-Runden
und Endlos-Runden werden abgelehnt. Pro Spieler zählt je Board nur der Bestwert.

## Einrichten (einmalig, ca. 5 Minuten)

1. Cloudflare-Konto anlegen (Free-Tarif reicht) und Wrangler anmelden:
   ```bash
   cd window-blaster/server/leaderboard-worker
   npm install
   npx wrangler login
   ```
2. KV-Namespace anlegen und die ausgegebene `id` in `wrangler.toml` eintragen:
   ```bash
   npx wrangler kv namespace create SCORES
   ```
3. Deployen – die Ausgabe enthält die öffentliche URL
   (z. B. `https://window-blaster-leaderboard.<dein-name>.workers.dev`):
   ```bash
   npx wrangler deploy
   ```
4. In GitHub: *Settings → Secrets and variables → Actions → Variables* die
   Variable `LEADERBOARD_URL` mit dieser URL anlegen. Der nächste Pages-Deploy
   baut die App mit aktivierter Rangliste. Lokal: `VITE_LEADERBOARD_URL=… npm run dev`.
5. Optional in `wrangler.toml` `ALLOWED_ORIGIN` auf deine Pages-Domain setzen.

## API

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/top?mode=front-shooter&period=day\|week\|all&vehicle=all\|car\|train\|bus\|other&limit=25&me=<playerId>` | Bestenliste |
| POST | `/submit` `{ playerId, name, round: RoundResult }` | Runde einreichen (wird verifiziert) |
| GET | `/health` | Statuscheck |

Boards gibt es je Modus, je Fahrzeugtyp (plus „alle“), jeweils täglich (UTC),
wöchentlich (ISO-Woche) und allzeit. Rate-Limits: 4 Einreichungen / Minute pro
Spieler, 40 / Stunde pro IP.
