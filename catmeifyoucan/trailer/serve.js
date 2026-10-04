// Kleiner statischer Server für die Trailer-Szene: /trailer/* aus diesem Ordner, alles andere aus
// public/ (damit /css/fonts.css, /js/avatar.js und /icons/logo.svg wie im Spiel geladen werden).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, '..', 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json',
};

export function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = decodeURIComponent(url.pathname);
    let root = PUBLIC;
    if (p.startsWith('/trailer/')) { root = HERE; p = p.slice('/trailer'.length); }
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

// Direkt gestartet: node trailer/serve.js [port] → zum Anschauen im Browser
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { port } = await startServer(Number(process.argv[2]) || 8930);
  console.log(`Trailer-Szene: http://127.0.0.1:${port}/trailer/scene.html?lang=en&format=16x9&t=8`);
}
