// Copies the MediaPipe Tasks Vision WASM runtime from node_modules into public/
// so the app is fully self-hosted (no CDN at runtime, works offline via the SW).
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dst = join(root, 'public', 'mediapipe', 'wasm');

if (!existsSync(src)) {
  console.warn('[copy-mediapipe] source not found (run npm install first):', src);
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
let bytes = 0;
// vision_wasm_module_internal.* is only used with FilesetResolver's `useModule` flag, which we don't use.
for (const f of readdirSync(src)) {
  if (f.includes('vision_wasm_module_internal')) continue;
  cpSync(join(src, f), join(dst, f));
  bytes += statSync(join(dst, f)).size;
}
console.log(`[copy-mediapipe] copied ${readdirSync(dst).length} files (${(bytes / 1048576).toFixed(1)} MB) -> public/mediapipe/wasm`);
