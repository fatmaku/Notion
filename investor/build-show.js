// Builds LiveFX_Investor_Show.html: one self-contained file (fonts, images and texts inlined).
// Usage: node build-show.js
// Texts come from deck-content.{de,tr,en}.json (same figures as the decks), the layout from show-template.html.
// Open with ?lang=de|tr|en, ?play (auto-advance), ?clean (no controls), #n (start slide).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BIZ = path.join(ROOT, 'live-fx/business');
const b64 = (p, mime) => `data:${mime};base64,` + fs.readFileSync(p).toString('base64');
const jpg = (p) => b64(p, 'image/jpeg');
const LANGS = ['de', 'tr', 'en'];

const fonts = [['lexend-5.woff2', 'U+0100-02BA,U+02BD-02C5,U+1E00-1E9F,U+1EF2-1EFF'], ['lexend-3.woff2', 'U+0000-00FF,U+0131,U+2000-206F,U+20AC']]
  .map(([f, r]) => `@font-face{font-family:'Lexend';src:url(${b64(path.join(BIZ, 'video/assets', f), 'font/woff2')}) format('woff2');font-weight:300 700;unicode-range:${r}}`).join('\n');

const IMG = {
  neon: jpg(path.join(BIZ, 'landing-assets/overlay-neon.jpg')),
  panel: jpg(path.join(BIZ, 'video/assets/panel.jpg')),
  card: {}, vision: {}, story: {}, word: {},
};
for (const l of LANGS) {
  IMG.card[l] = jpg(path.join(BIZ, `video/assets/overlay-card${l === 'de' ? '' : '.' + l}.jpg`));
  IMG.vision[l] = ['8s', '15s', '22s', '29s'].map((t) => jpg(path.join(BIZ, `video/stills/vision-${l}-16x9-${t}.jpg`)));
  IMG.story[l] = jpg(path.join(__dirname, `assets/proto-story-${l}.jpg`));
  IMG.word[l] = jpg(path.join(__dirname, `assets/proto-wortbild-${l}.jpg`));
}
const DATA = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(fs.readFileSync(path.join(__dirname, `deck-content.${l}.json`), 'utf8'))]));

const safe = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
let html = fs.readFileSync(path.join(__dirname, 'show-template.html'), 'utf8');
html = html.replace('/*__FONTS__*/', fonts).replace('/*__DATA__*/null', safe(DATA)).replace('/*__IMG__*/null', safe(IMG));
const out = path.join(__dirname, 'LiveFX_Investor_Show.html');
fs.writeFileSync(out, html);
console.log('wrote', out, Math.round(html.length / 1024), 'KB');
