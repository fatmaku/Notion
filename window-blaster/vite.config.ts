import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string; windowBlaster?: { publicUrl?: string } };
// Public HTTPS copy of the game (GitHub Pages). Setup QR codes point there: nothing to trust, no Mac needed.
// VITE_PUBLIC_URL overrides it ('' disables), e.g. for a fork or another host.
const publicUrl = normalizeUrl(process.env.VITE_PUBLIC_URL ?? pkg.windowBlaster?.publicUrl ?? '');

function normalizeUrl(u: string): string {
  const t = u.trim();
  if (!t) return '';
  // same form as new URL(...).href in the app (lower-case host), always with a trailing slash
  const href = new URL(t).href;
  return href.endsWith('/') ? href : `${href}/`;
}
// Unique per build: the service worker's cache name changes with every build, so a rebuilt app with
// the same version number still updates on the phone. WB_BUILD_ID can pin it (tests).
const buildId = process.env.WB_BUILD_ID ?? Date.now().toString(36);

// VITE_BASE  : public base path (GitHub Pages: /<repo>/window-blaster/)
// VITE_HTTPS : any value -> self-signed HTTPS dev server (camera needs a secure context on LAN)
export default defineConfig(() => ({
  base: process.env.VITE_BASE ?? '/',
  plugins: process.env.VITE_HTTPS ? [basicSsl()] : [],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_ID__: JSON.stringify(buildId),
    __PUBLIC_URL__: JSON.stringify(publicUrl),
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    // iOS 14.5+/Safari 14.1+, Chrome 90+: transpile newer syntax so older iPhones still boot
    target: ['es2020', 'safari14', 'chrome90', 'firefox90'],
    cssTarget: ['safari14', 'chrome90'],
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: { main: 'index.html', sw: 'src/sw.ts' },
      output: {
        entryFileNames: (chunk: { name: string }) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
}));
