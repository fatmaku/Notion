#!/usr/bin/env node
// Cat Me If You Can – Start: `node server.js` → http://127.0.0.1:8790
//
// Umgebung (alle optional):
//   PORT=8790  HOST=127.0.0.1 (0.0.0.0 fürs Handy im WLAN)
//   CATME_DATA=./data            Datenordner (Journal, Snapshot, Fotos, Admin-Token)
//   CATME_AI=auto|claude|off|mock Bildanalyse (auto = Claude, wenn ANTHROPIC_API_KEY gesetzt)
//   CATME_MODEL=claude-opus-5-5  Modell für Analyse, Wiedererkennung, Namensprüfung
//   CATME_DEMO=1                 Demo-Katzen, -Cafés und -Spieler:innen anlegen (nur wenn leer)
//   ADMIN_TOKEN=…                Token für /admin.html (sonst erzeugt: data/admin-token.txt)
//   TRUST_PROXY=1                Anzahl Proxys vor dem Server (X-Forwarded-For von rechts gelesen)
//   CATME_TLS_CERT / CATME_TLS_KEY  HTTPS direkt (Kamera im Handy braucht HTTPS)
//   CATME_TILES=https://…/{z}/{x}/{y}.png  CATME_TILES_ATTRIB=…  eigener Kartenkachel-Dienst
//   CATME_PUBLIC_URL=https://…   öffentliche Adresse – Link-Vorschaubilder (og:image) werden damit absolut

import fs from 'node:fs';
import path from 'node:path';
import { createApp, ROOT } from './server/app.js';

const port = Number(process.env.PORT) || 8790;
const host = process.env.HOST || '127.0.0.1';
const tls = process.env.CATME_TLS_CERT && process.env.CATME_TLS_KEY
  ? { cert: fs.readFileSync(process.env.CATME_TLS_CERT), key: fs.readFileSync(process.env.CATME_TLS_KEY) }
  : null;

const app = await createApp({ dataDir: path.resolve(process.env.CATME_DATA || path.join(ROOT, 'data')), tls });
app.server.listen(port, host, () => {
  const proto = tls ? 'https' : 'http';
  const shown = host === '0.0.0.0' ? 'localhost' : host;
  console.log(`[catme] Cat Me If You Can läuft: ${proto}://${shown}:${port}/`);
  console.log(`[catme] Analyse: ${app.ai.info}`);
  console.log(`[catme] Café-Ansicht: ${proto}://${shown}:${port}/partner.html · Moderation: ${proto}://${shown}:${port}/admin.html`);
});

let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    if (stopping) return;
    stopping = true;
    console.log('[catme] beende …');
    await app.close();
    process.exit(0);
  });
}
