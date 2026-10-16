// Builds the online demo as one self-contained page:
//   dist/ladeklar-demo.artifact.html  – body content for the Claude artifact (no <html>/<head>)
//   dist/demo.html                    – standalone file (open locally or host anywhere static)
// The real app code + engine are bundled with esbuild; legal sample texts are embedded.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const out = path.join(ROOT, 'dist');
fs.mkdirSync(out, { recursive: true });

const res = await build({
  entryPoints: [path.join(ROOT, 'web/js/demo.js')], bundle: true, format: 'iife', minify: true, write: false,
  target: ['chrome110', 'safari16.4', 'firefox115'], legalComments: 'inline', charset: 'utf8',
});
const js = res.outputFiles[0].text;

const legal = {};
for (const [k, f] of [['impressum', 'IMPRESSUM.md'], ['datenschutz', 'DATENSCHUTZ.md'], ['agb', 'AGB.md']]) {
  const md = path.join(ROOT, 'docs/recht', f);
  legal[k] = fs.existsSync(md) ? execFileSync('pandoc', ['-f', 'gfm', '-t', 'html', md], { encoding: 'utf8' }) : '';
}
const css = fs.readFileSync(path.join(ROOT, 'web/css/app.css'), 'utf8');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Manrope:wght@400..800&display=swap">';
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const body = `<title>Ladeklar Live-Demo</title>
${fonts}
<style>${css}
#app { height: 100%; }
</style>
<div id="app"></div>
<script>window.LADEKLAR_DEMO = true; window.LADEKLAR_LEGAL = ${safe(JSON.stringify(legal))};</script>
<script>${safe(js)}</script>
`;
fs.writeFileSync(path.join(out, 'ladeklar-demo.artifact.html'), body);
fs.writeFileSync(path.join(out, 'demo.html'), `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#0b1622">${body.split('<div id="app">')[0]}</head><body><div id="app"></div>${body.split('<div id="app"></div>')[1]}</body></html>`);
console.log('demo built:', (body.length / 1024).toFixed(0), 'KB →', path.join(out, 'ladeklar-demo.artifact.html'));
