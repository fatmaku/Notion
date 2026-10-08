// Cat Me If You Can – Wirkung & Dank in der App: Herz mit Zahl in der Kopfzeile, Dank-Feed #/feed,
// „Deine Wirkung“ (Profil + eine Zeile auf „Heute“), Hinweis „braucht Hilfe“ und die schnellen
// Hilfe-Knöpfe für Freiwillige im Katzenprofil. Daten: api.feed / markFeedRead / impact / careAction.

import { t, L } from '../i18n.js';
import { esc, fmtNum, fmtAgo, catImg, catName, toast, errorText, modal } from '../ui.js';
import { CAT_STATUS } from '../../core/taxonomy.js';
import { guideLinkHtml } from './guide.js';

const KIND_ICON = { fed: '🥣', water: '💧', vet: '🩺', ok: '💚', care: '🤲', adopted: '🏡' };
/** Hilfe-Knöpfe in dieser Reihenfolge; „wieder gut“ nur, wenn die Katze Hilfe braucht oder in Behandlung ist. */
const CARE_BUTTONS = [['fed', '🥣'], ['water', '💧'], ['vet', '🩺'], ['ok', '💚']];
const OPEN_STATUS = ['active', 'needs_help', 'in_care', 'missing'];
const CONFIRM = { vet: 'in_care', ok: 'active' };

// ---------------------------------------------------------------- Herz in der Kopfzeile

// gen: jede verbindliche Zahl (aus der Feed-Ansicht) erhöht gen – ältere Antworten, die noch unterwegs
// waren, überschreiben sie dann nicht mehr.
const bell = { unread: 0, at: 0, busy: false, app: null, listening: false, gen: 0 };
const HEART = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.3S4.5 15.7 4.5 9.6A4.1 4.1 0 0 1 12 7.3a4.1 4.1 0 0 1 7.5 2.3c0 6.1-7.5 10.7-7.5 10.7z"/></svg>';

/** Herz-Knopf vor dem eigenen Profil-Knopf einhängen (nach jedem shell()). */
export function mountFeedBell(app) {
  bell.app = app;
  const top = document.querySelector('header.top');
  if (!top || top.querySelector('[data-feed-bell]') || !app.api.feed) return;
  const a = document.createElement('a');
  a.href = '#/feed';
  a.className = 'feed-bell';
  a.dataset.feedBell = '';
  a.innerHTML = `${HEART}<span class="feed-n" hidden></span>`;
  top.insertBefore(a, top.querySelector('[data-me]'));
  paintBell();
  refreshBell(true);
  if (!bell.listening) {
    bell.listening = true;
    window.addEventListener('hashchange', () => refreshBell(false));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshBell(false);
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') refreshBell(true);
    }, 120000);
  }
}

function paintBell() {
  const a = document.querySelector('[data-feed-bell]');
  if (!a) return;
  const n = bell.unread;
  const badge = a.querySelector('.feed-n');
  badge.hidden = !n;
  // Zahl isoliert (bdi): auf Arabisch/Persisch sonst falsch einsortiert; fa → persische Ziffern
  badge.innerHTML = n ? `<bdi>${esc(n > 99 ? `${fmtNum(99)}+` : fmtNum(n))}</bdi>` : '';
  a.classList.toggle('has-new', n > 0);
  const label = n ? `${t('feed.title')}: ${t('feed.bellNew', { n })}` : t('feed.title');
  a.setAttribute('aria-label', label);
  a.title = label;
  if ((location.hash || '').startsWith('#/feed')) a.setAttribute('aria-current', 'page');
  else a.removeAttribute('aria-current');
}

async function refreshBell(force) {
  const app = bell.app;
  paintBell();
  if (!app || !app.api.feed || !app.api.hasToken() || bell.busy) return;
  if ((location.hash || '').startsWith('#/feed')) return; // die Feed-Ansicht setzt die Zahl selbst
  if (!force && Date.now() - bell.at < 20000) return;
  bell.busy = true;
  const gen = bell.gen;
  try {
    const r = await app.api.feed({ countOnly: true });
    if (gen === bell.gen) bell.unread = Math.max(0, Number(r && r.unread) || 0);
  } catch {
    /* offline – alte Zahl bleibt */
  } finally {
    bell.busy = false;
    bell.at = Date.now();
    paintBell();
  }
}

function setUnread(n) {
  bell.gen++;
  bell.unread = Math.max(0, Number(n) || 0);
  bell.at = Date.now();
  paintBell();
}

// ---------------------------------------------------------------- Deine Wirkung

/** Freundliche Sätze, wichtigste zuerst: [Symbol, Text, Schlüssel]. Nur, was > 0 ist. */
export function impactLines(m) {
  if (!m) return [];
  const out = [];
  if (m.helpedCats) out.push(['💚', t('impact.helped', { n: m.helpedCats }), 'helped']);
  if (m.reports) out.push(['📝', t('impact.reports', { n: m.reports }), 'reports']);
  if (m.foundFirst) out.push(['🔭', t('impact.found', { n: m.foundFirst }), 'found']);
  if (m.seenByOthers) out.push(['👀', t('impact.seen', { n: m.seenByOthers }), 'seen']);
  if (m.careActions) out.push(['🤝', t('impact.care', { n: m.careActions }), 'care']);
  return out;
}

export function impactCardHtml(m, { links = true } = {}) {
  const lines = impactLines(m);
  return `<section class="card impact-card" aria-labelledby="impact-h">
    <h2 id="impact-h"><span aria-hidden="true">🌱</span> ${esc(t('impact.title'))}</h2>
    ${lines.length
      ? `<ul class="impact-list">${lines.map(([ic, text, k]) => `<li class="im-${k}"><span class="impact-ic" aria-hidden="true">${ic}</span><span>${esc(text)}</span></li>`).join('')}</ul>
         <p class="impact-thanks">${esc(t('impact.thanks'))}</p>`
      : `<p class="muted">${esc(t('impact.empty'))}</p>`}
    ${links ? `<p class="impact-links"><a href="#/feed"><span aria-hidden="true">💌</span> ${esc(t('impact.feedLink'))}</a>${guideLinkHtml({ label: t('guide.title') })}</p>` : ''}
  </section>`;
}

/** Profil: Karte „Deine Wirkung“ in den Platzhalter laden (lädt nachträglich, blockiert nichts). */
export async function mountProfileImpact(el, app) {
  if (!el || !app.api.impact) return;
  try {
    const m = await app.api.impact();
    if (el.isConnected) el.innerHTML = impactCardHtml(m);
  } catch {
    el.remove();
  }
}

/** „Heute“: eine kurze Zeile, sobald es etwas zu zeigen gibt. */
export async function mountHomeImpact(el, app) {
  if (!el || !app.api.impact) return;
  try {
    const m = await app.api.impact();
    const order = ['helped', 'seen', 'reports', 'found', 'care'];
    const lines = impactLines(m).sort((a, b) => order.indexOf(a[2]) - order.indexOf(b[2]));
    if (!lines.length || !el.isConnected) return;
    const [ic, text] = lines[0];
    el.innerHTML = `<a class="card impact-line" href="#/feed"><span class="big" aria-hidden="true">${ic}</span><span><small class="impact-kicker">${esc(t('impact.title'))}</small>${esc(text)}</span><span class="chev dir-ic" aria-hidden="true">›</span></a>`;
  } catch {
    /* ohne Zeile */
  }
}

// ---------------------------------------------------------------- Dank-Feed #/feed

function feedItemHtml(x) {
  return `<li class="feed-item${x.unread ? ' unread' : ''}">
    <a class="feed-link" href="#/cat/${esc(x.cat.id)}">
      ${catImg(x.cat, { size: 'sm' })}
      <span class="feed-body">
        <span class="feed-top"><b class="feed-name">${catName(x.cat)}</b>${x.unread ? ` <span class="chip new">${esc(t('feed.new'))}</span>` : ''}<small class="muted feed-when">${esc(fmtAgo(x.at))}</small></span>
        <span class="feed-msg"><span aria-hidden="true">${KIND_ICON[x.kind] || '💚'}</span> ${esc(t(`feed.${x.kind}`))}</span>
        <small class="muted">${esc(t('feed.yourReport', { t: fmtAgo(x.reportedAt) }))}</small>
      </span>
    </a>
  </li>`;
}

export async function renderFeed(view, app) {
  const [feed, impact] = await Promise.all([app.api.feed(), app.api.impact().catch(() => null)]);
  setUnread(feed.unread);
  view.innerHTML = `
    <button class="back" data-back><span class="dir-ic" aria-hidden="true">‹</span> ${esc(t('common.back'))}</button>
    <section class="card feed-card" aria-labelledby="feed-h">
      <h1 id="feed-h"><span aria-hidden="true">💌</span> ${esc(t('feed.title'))}</h1>
      ${feed.items.length
        ? `<ul class="feed">${feed.items.map(feedItemHtml).join('')}</ul>`
        : `<div class="feed-empty"><div class="big-emoji" aria-hidden="true">🐾</div><p><b>${esc(t('feed.empty'))}</b></p><p class="muted">${esc(t('feed.emptyHow'))}</p></div>`}
    </section>
    ${impactCardHtml(impact, { links: false })}
    <a class="card guide-cta" href="#/guide"><span class="big" aria-hidden="true">📖</span><span>${esc(t('guide.title'))}</span><span class="chev dir-ic" aria-hidden="true">›</span></a>`;
  if (feed.unread) {
    // Nur bis zum Stand dieser Liste: was inzwischen dazukam, bleibt neu.
    const upTo = Math.max(feed.now || 0, ...feed.items.map((x) => x.at));
    app.api.markFeedRead(upTo).then((r) => setUnread(r && r.unread)).catch(() => {});
  }
}

// ---------------------------------------------------------------- Katzenprofil

/**
 * Hinweis „braucht Hilfe“ (für alle) und schnelle Hilfe-Knöpfe (Freiwillige). refresh() zeichnet das
 * Profil nach einer Aktion neu.
 */
export function mountCatImpact(el, app, cat, refresh) {
  if (!el || !cat) return;
  const me = app.player;
  const volunteer = !!(me && ['volunteer', 'admin'].includes(me.role) && app.api.careAction);
  const status = cat.status;
  let html = '';
  if (status === 'needs_help') {
    html += `<section class="help-hint" aria-label="${esc(L(CAT_STATUS, 'needs_help'))}">
      <p><b><span aria-hidden="true">${t('status.icon.needs_help')}</span> ${esc(t('care.needsHelp'))}</b></p>
      <p>${esc(t('guide.lead'))}</p>
      ${guideLinkHtml({ cls: 'btn small' })}
    </section>`;
  }
  if (volunteer && OPEN_STATUS.includes(status)) {
    const buttons = CARE_BUTTONS.filter(([k]) => k !== 'ok' || ['needs_help', 'in_care'].includes(status));
    html += `<section class="card care-card" aria-labelledby="care-h">
      <h2 id="care-h"><span aria-hidden="true">🤝</span> ${esc(t('care.title'))} <small class="chip">${esc(t('care.who'))}</small></h2>
      <p class="small muted">${esc(t('care.lead'))}</p>
      <div class="care-grid">${buttons.map(([k, ic]) => `<button type="button" class="btn care-btn" data-care="${k}"><span aria-hidden="true">${ic}</span> <span>${esc(t(`care.${k}`))}</span></button>`).join('')}</div>
    </section>`;
  }
  el.innerHTML = html;
  if (!volunteer) return;

  const send = async (action, note, btn) => {
    if (btn) btn.disabled = true;
    try {
      const r = await app.api.careAction(cat.id, action, note || '');
      const extra = r && r.notified ? ` ${t('care.notified', { n: r.notified })}` : '';
      toast(`${t('care.done')}${extra}`, { type: 'success', ms: 4200 });
      if (refresh) refresh();
      return true;
    } catch (err) {
      toast(errorText(err), { type: err && err.code === 'care_too_soon' ? 'info' : 'error' });
      if (btn) btn.disabled = false;
      return false;
    }
  };

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-care]');
    if (!b || b.disabled) return;
    const action = b.dataset.care;
    if (!CONFIRM[action]) {
      send(action, '', b);
      return;
    }
    // Statuswechsel (beim Tierarzt → in Behandlung, wieder gut → draußen): kurz bestätigen, Notiz möglich
    const m = modal(`<form class="pad" data-f><h2><span aria-hidden="true">${CARE_BUTTONS.find(([k]) => k === action)[1]}</span> ${esc(t(`care.${action}`))}</h2>
      <p>${esc(t(`care.confirm.${action}`, { status: L(CAT_STATUS, CONFIRM[action]) }))}</p>
      <textarea name="note" rows="2" maxlength="300" placeholder="${esc(t('care.notePh'))}"></textarea>
      <div class="actions"><button class="btn primary">${esc(t('care.save'))}</button><button type="button" class="btn" data-close>${esc(t('common.cancel'))}</button></div></form>`);
    m.el.querySelector('[data-f]').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = ev.target.querySelector('.btn.primary');
      btn.disabled = true;
      const ok = await send(action, ev.target.note.value.trim(), null);
      if (ok) m.close();
      else btn.disabled = false;
    });
  });
}

