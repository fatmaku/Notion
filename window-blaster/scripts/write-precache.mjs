// After `vite build`: writes dist/precache.json (small app-shell files the service
// worker caches on install) and dist/offline-assets.json (large files – WASM runtime
// and detector model – that the app downloads on demand for offline play).
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(dist).map((p) => ({ path: relative(dist, p).split('\\').join('/'), size: statSync(p).size }));
const isHeavy = (p) => p.startsWith('mediapipe/') || p.startsWith('models/');
const skip = (p) => p === 'sw.js' || p === 'precache.json' || p === 'offline-assets.json' || p.endsWith('.map');
// only the wasm variant pair the loader actually uses (simd + nosimd fallback); the "module" variant is unused
const unusedWasm = (p) => p.includes('vision_wasm_module_internal');

const shell = files.filter((f) => !isHeavy(f.path) && !skip(f.path)).map((f) => f.path);
const heavy = files.filter((f) => isHeavy(f.path) && !unusedWasm(f.path));
writeFileSync(join(dist, 'precache.json'), JSON.stringify({ v: Date.now(), files: shell }));
writeFileSync(join(dist, 'offline-assets.json'), JSON.stringify({ files: heavy }));
const mb = (n) => (n / 1048576).toFixed(1);
console.log(`[precache] shell: ${shell.length} files (${mb(files.filter((f) => shell.includes(f.path)).reduce((s, f) => s + f.size, 0))} MB), offline assets: ${heavy.length} files (${mb(heavy.reduce((s, f) => s + f.size, 0))} MB)`);
