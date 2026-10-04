// Übersicht der gerenderten Social-Media-Bilder (Filter nach Sprache und Format).
import { LANGS, MOTIFS } from '/marketing/texts.js';

const state = { lang: 'en', format: 'post' };
const FORMATS = ['post', 'story', 'og'];

function bar(el, items, key) {
  el.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = it;
    b.setAttribute('aria-pressed', String(state[key] === it));
    b.addEventListener('click', () => {
      state[key] = it;
      render();
    });
    el.append(b);
  }
}

function render() {
  bar(document.getElementById('langs'), ['all', ...LANGS], 'lang');
  bar(document.getElementById('formats'), FORMATS, 'format');
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  const langs = state.lang === 'all' ? LANGS : [state.lang];
  const files = [];
  if (state.format === 'og') for (const l of langs) files.push({ src: `/media/og-${l}.png`, name: `public/media/og-${l}.png`, og: true });
  else for (const m of MOTIFS) for (const l of langs) files.push({ src: `/marketing/social/${m}-${state.format}-${l}.jpg`, name: `${m}-${state.format}-${l}.jpg` });
  for (const f of files) {
    const fig = document.createElement('figure');
    if (f.og) fig.className = 'og';
    const img = document.createElement('img');
    img.src = `${f.src}?v=${Date.now()}`;
    img.alt = f.name;
    img.loading = 'lazy';
    const cap = document.createElement('figcaption');
    cap.textContent = f.name;
    const a = document.createElement('a');
    a.href = f.src;
    a.append(img);
    fig.append(a, cap);
    grid.append(fig);
  }
}

render();
