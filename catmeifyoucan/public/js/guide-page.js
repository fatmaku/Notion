// Cat Me If You Can – öffentliche Seite guide.html: der Hilfe-Leitfaden ohne Konto, z. B. verlinkt von
// den Katzenseiten /c/<id> („So kannst du helfen“) und der Startseite. Sprache: ?lang= → gespeicherte
// Wahl (catme.lang, gemeinsam mit App und Startseite) → Browser → Englisch.

import { t, getLang, setLang, LANGS, LANG_INFO } from './i18n.js';
import { esc } from './ui.js';
import { guideHtml } from './views/guide.js';

function render() {
  const view = document.querySelector('#view');
  document.title = `${t('guide.title')} · Cat Me If You Can`;
  const skip = document.querySelector('.skip');
  if (skip) skip.textContent = t('common.skip');
  view.innerHTML = `
    <div class="langs guide-langs" role="group" aria-label="${esc(t('onb.lang'))}">${LANGS.map((l) => `<button type="button" data-lang="${l}" lang="${l}" class="${l === getLang() ? 'on' : ''}" aria-pressed="${l === getLang()}">${esc(LANG_INFO[l].name)}</button>`).join('')}</div>
    <article class="card guide" aria-labelledby="g-title">${guideHtml()}</article>
    <section class="card guide-play">
      <p><b>${esc(t('onb.title'))}</b></p>
      <div class="actions"><a class="btn primary" href="app.html">${esc(t('guide.play'))} <span class="dir-ic" aria-hidden="true">→</span></a><a class="btn" href="./">${esc(t('cp.what'))}</a></div>
    </section>
    <p class="maker small muted">${esc(t('brand.maker'))}</p>`;
}

const q = new URLSearchParams(location.search).get('lang');
if (q && LANGS.includes(q)) setLang(q);
else setLang(getLang());
render();
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-lang]');
  if (!b) return;
  setLang(b.dataset.lang);
  render();
  const again = document.querySelector(`[data-lang="${b.dataset.lang}"]`);
  if (again) again.focus();
});
