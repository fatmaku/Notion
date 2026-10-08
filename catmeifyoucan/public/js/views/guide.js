// Cat Me If You Can – Hilfe-Leitfaden „So hilfst du Straßenkatzen“: Futter, Wasser, Kälte, Kitten,
// krank/verletzt, Ohrspitze. Sehr einfache Sätze in 6 Sprachen, ehrlich: keine erfundenen Telefonnummern
// oder Vereine. Drei Wege: Ansicht #/guide in der App, Fenster über dem Meldeformular
// (Link mit data-guide-pop, das Formular bleibt offen) und die öffentliche Seite guide.html.

import { t } from '../i18n.js';
import { esc, modal } from '../ui.js';

/** Abschnitte: Symbol, Überschrift (guide.<id>), Zeilen (guide.<id>1 …). */
export const GUIDE_SECTIONS = [
  { id: 'food', icon: '🥣', lines: 4, tone: 'warn' },
  { id: 'water', icon: '💧', lines: 3 },
  { id: 'cold', icon: '🏠', lines: 2 },
  { id: 'kittens', icon: '🍼', lines: 3 },
  { id: 'sick', icon: '🩹', lines: 4, tone: 'care' },
  { id: 'ear', icon: '👂', lines: 2 },
];

/** Bei „Futter“ sind die ersten Zeilen Ja, die übrigen Nein – das zeigt ein Symbol vor der Zeile. */
const LINE_MARK = { food: ['yes', 'no', 'no', 'no'] };

/** Inhalt des Leitfadens (ohne Rahmen). headingTag: h1 in der Ansicht, h2 im Fenster. */
export function guideHtml({ headingTag = 'h1', idPrefix = 'g' } = {}) {
  const h = headingTag;
  const sub = h === 'h1' ? 'h2' : 'h3';
  return `
    <div class="guide-head">
      <span class="guide-ic" aria-hidden="true">💚</span>
      <${h} id="${esc(idPrefix)}-title">${esc(t('guide.title'))}</${h}>
      <p class="guide-lead">${esc(t('guide.lead'))}</p>
    </div>
    <div class="guide-grid">${GUIDE_SECTIONS.map((s) => `
      <section class="guide-sec${s.tone ? ` tone-${s.tone}` : ''}" aria-labelledby="${esc(idPrefix)}-${s.id}">
        <${sub} id="${esc(idPrefix)}-${s.id}"><span class="guide-sec-ic" aria-hidden="true">${s.icon}</span> ${esc(t(`guide.${s.id}`))}</${sub}>
        <ul>${Array.from({ length: s.lines }, (_, i) => {
          const mark = (LINE_MARK[s.id] || [])[i];
          return `<li${mark ? ` class="mk-${mark}"` : ''}>${esc(t(`guide.${s.id}${i + 1}`))}</li>`;
        }).join('')}</ul>
      </section>`).join('')}
    </div>
    <p class="guide-photo"><span aria-hidden="true">📸</span> ${esc(t('guide.photo'))}</p>`;
}

/** Ansicht #/guide in der App. */
export function renderGuide(view) {
  view.innerHTML = `
    <button class="back" data-back><span class="dir-ic" aria-hidden="true">‹</span> ${esc(t('common.back'))}</button>
    <article class="card guide" aria-labelledby="g-title">${guideHtml()}</article>
    <a class="card guide-cta" href="#/help"><span class="big" aria-hidden="true">🆘</span><span>${esc(t('guide.radar'))}</span><span class="chev dir-ic" aria-hidden="true">›</span></a>`;
}

/** Leitfaden als Fenster (über einem offenen Formular). */
export function openGuide() {
  // tabindex=-1: modal() setzt den Fokus auf das erste fokussierbare Element – sonst wäre das der
  // OK-Knopf ganz unten, und das Fenster spränge ans Ende.
  return modal(`<article class="pad guide guide-pop" tabindex="-1" aria-labelledby="gp-title">${guideHtml({ headingTag: 'h2', idPrefix: 'gp' })}
    <div class="actions"><button type="button" class="btn primary" data-close>${esc(t('common.ok'))}</button></div></article>`, { cls: 'guide-modal' });
}

/** Link „Wie kann ich helfen?“. pop=true öffnet das Fenster statt die Seite zu wechseln. */
export function guideLinkHtml({ pop = false, label = t('guide.how'), cls = '' } = {}) {
  return `<a class="guide-link ${esc(cls)}" href="#/guide"${pop ? ' data-guide-pop' : ''}><span aria-hidden="true">💚</span> <span>${esc(label)}</span></a>`;
}

// Ein Klick-Empfänger für alle Links mit data-guide-pop (Meldeformular, Regeln im Onboarding).
if (typeof document !== 'undefined' && !globalThis.__catmeGuidePop) {
  globalThis.__catmeGuidePop = true;
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-guide-pop]');
    if (!a || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openGuide();
  });
}
