// Shared building blocks for all screens.
import { icon } from '../icons.js';
import { t, tStatus, tProblem, getLang } from '../i18n.js';
import { esc, time, dateTime, dayLabel, window_, kg, num, address, phoneHref, initials } from '../format.js';

export { icon, esc };

export const STATUS_ICON = { open: 'circle-dot', accepted: 'check', arrived_pickup: 'map-pin', loaded: 'arrow-up-from-line', arrived_dropoff: 'map-pin', unloaded: 'arrow-down-to-line', delivered: 'circle-check-big', cancelled: 'ban' };
export const STEP_ICON = { accepted: 'check', arrived_pickup: 'map-pin', loaded: 'arrow-up-from-line', arrived_dropoff: 'map-pin', unloaded: 'arrow-down-to-line', delivered: 'file-check' };
export const PROBLEM_ICON = { delay: 'traffic-cone', breakdown: 'wrench', accident: 'siren', damaged: 'package-x', refused: 'hand', address: 'map-pin', waiting: 'hourglass', other: 'circle-help' };
export const VEHICLE_ICON = { sattelzug: 'truck', solo: 'truck', gliederzug: 'truck', kuehlkoffer: 'snowflake', kipper: 'truck', tank: 'truck', transporter: 'truck', plane: 'container', kuehl: 'snowflake', container: 'container', tieflader: 'container', koffer: 'box' };
export const vehicleTypeText = (ty) => ({ sattelzug: t('Sattelzugmaschine'), solo: t('Solo-LKW'), gliederzug: t('Gliederzug'), kuehlkoffer: t('Kühlkoffer'), kipper: t('Kipper'), tank: t('Tankwagen'), transporter: t('Transporter'), plane: t('Planenauflieger'), kuehl: t('Kühlauflieger'), container: t('Container-Chassis'), tieflader: t('Tieflader'), koffer: t('Kofferauflieger') }[ty] || ty);
export const featureText = (f) => ({ ladebordwand: t('Ladebordwand'), kuehlung: t('Kühlung'), adr: 'ADR', mitnahmestapler: t('Mitnahmestapler'), hebebuehne: t('Hebebühne'), kran: t('Kran') }[f] || f);

export function pill(status, extra = '') {
  return `<span class="pill s-${status} ${['loaded', 'arrived_dropoff', 'accepted', 'arrived_pickup', 'unloaded'].includes(status) ? 'live' : ''} ${extra}">${['loaded', 'arrived_dropoff', 'accepted', 'arrived_pickup', 'unloaded'].includes(status) ? '' : icon(STATUS_ICON[status] || 'circle-dot')}${esc(tStatus(status))}</span>`;
}
export const problemPill = (p) => (p ? `<span class="pill prob">${icon(PROBLEM_ICON[p.code] || 'triangle-alert')}${esc(tProblem(p.code))}</span>` : '');
export const plate = (txt, cls = '') => (txt ? `<span class="plate ${cls}"><span>${esc(txt)}</span></span>` : '');
export const avatar = (name, cls = '') => `<span class="avatar ${cls}">${esc(initials(name))}</span>`;
export const flag = (lang) => `<span class="flag">${esc((lang || 'de').toUpperCase())}</span>`;
export function routeTitle(d) { return `${esc(d.pickup?.city || d.pickup?.place || '?')} <span class="arr">→</span> ${esc(d.dropoff?.city || d.dropoff?.place || '?')}${d.dropoff?.country && d.dropoff.country !== 'DE' ? ` <span class="flag">${esc(d.dropoff.country)}</span>` : ''}`; }
export function emptyState(ic, title, text = '', action = '') { return `<div class="empty">${icon(ic)}<b>${esc(title)}</b>${text ? `<p class="small">${esc(text)}</p>` : ''}${action}</div>`; }

export function logoImg(app, tenant, cls = 'logo-chip') {
  const id = tenant?.branding?.logoFileId;
  if (!id) return `<span class="${cls}" style="background:var(--brand);color:var(--brand-ink);font:800 15px var(--f-display);padding:0 12px">${esc(initials(tenant?.name || 'L'))}</span>`;
  return `<span class="${cls}"><img src="${esc(app.fileUrl(id))}" alt="${esc(tenant.name)}"></span>`;
}

/** Progress stepper with time stamps from the events. */
export function stepper(d, { times = true } = {}) {
  const steps = d.steps || ['accepted', 'loaded', 'unloaded', 'delivered'];
  const cur = d.status;
  const order = ['open', ...steps];
  const idx = d.status === 'cancelled' ? -1 : order.indexOf(cur);
  const evAt = (s) => [...(d.events || [])].reverse().find((e) => e.type === s && !e.undone)?.at;
  const short = { accepted: t('Bestätigt'), arrived_pickup: t('Ankunft'), loaded: t('Beladen'), arrived_dropoff: t('Ankunft'), unloaded: t('Entladen'), delivered: t('Zugestellt') };
  return `<div class="steps" style="--n:${steps.length}">${steps.map((s, i) => {
    const pos = i + 1;
    const cls = pos <= idx ? 'done' : pos === idx + 1 && idx >= 0 ? 'now' : '';
    const at = pos <= idx ? evAt(s) : null;
    return `<div class="st ${cls}"><span class="nd">${icon(STEP_ICON[s])}</span><span class="lb" title="${esc(short[s])}">${esc(short[s])}</span>${times ? `<span class="tm">${at ? time(at) : '&nbsp;'}</span>` : ''}</div>`;
  }).join('')}</div>`;
}
export function progressRatio(d) {
  const steps = d.steps || ['accepted', 'loaded', 'unloaded', 'delivered'];
  const idx = ['open', ...steps].indexOf(d.status);
  return d.status === 'cancelled' ? 0 : Math.max(0, idx) / steps.length;
}

export function placeBlock(p, kind) {
  const isPick = kind === 'pickup';
  return `<div class="place"><span class="pin ${isPick ? '' : 'b'}">${icon(isPick ? 'arrow-up-from-line' : 'arrow-down-to-line')}</span>
    <div class="stack" style="--gap:2px"><span class="eyebrow">${isPick ? t('Ladestelle') : t('Entladestelle')} · ${esc(dayLabel(p.date, t))}${p.from || p.to ? ' · ' + esc(window_(p)) : ''}</span>
    <b>${esc(p.place || p.city)}</b><span class="small muted">${esc(address(p))}${p.country && p.country !== 'DE' ? ' · ' + esc(p.country) : ''}</span>
    ${p.contact || p.phone ? `<span class="small">${p.contact ? esc(p.contact) : ''}${p.phone ? ` · <a href="${esc(phoneHref(p.phone))}">${esc(p.phone)}</a>` : ''}</span>` : ''}</div></div>`;
}

export function goodsFacts(d) {
  const g = d.goods || {};
  const out = [];
  if (g.pallets) out.push(`<span class="fact">${icon('boxes')}${num(g.pallets)} ${t('Pal.')}</span>`);
  if (g.weightKg) out.push(`<span class="fact">${icon('weight')}${esc(kg(g.weightKg))}</span>`);
  if (g.adr) out.push(`<span class="fact adr">${icon('flame')}ADR</span>`);
  if (g.temp) out.push(`<span class="fact cold">${icon('thermometer-snowflake')}${esc(g.temp)}</span>`);
  if (d.urgent) out.push(`<span class="fact" style="background:var(--bad-bg);color:var(--bad)">${icon('zap')}${t('Eilig')}</span>`);
  return out.join('');
}

export const EVENT_ICON = { created: 'plus', assigned: 'user-plus', accepted: 'check', arrived_pickup: 'map-pin', loaded: 'arrow-up-from-line', arrived_dropoff: 'map-pin', unloaded: 'arrow-down-to-line', delivered: 'circle-check-big', cancelled: 'ban', returned: 'undo-2', problem: 'triangle-alert', problem_resolved: 'shield-check', note: 'message-square-text', doc: 'camera', doc_removed: 'trash-2', undo: 'rotate-ccw', updated: 'pencil', vehicle: 'truck', unassigned: 'user-x' };
export function eventText(e) {
  const k = {
    created: t('Lieferung angelegt'), assigned: t('Fahrer zugewiesen'), accepted: t('Buchung bestätigt'), arrived_pickup: t('An der Ladestelle angekommen'), loaded: t('Aufgeladen'), arrived_dropoff: t('An der Entladestelle angekommen'), unloaded: t('Abgeladen'), delivered: t('Zugestellt – Lieferschein bestätigt'),
    cancelled: t('Storniert'), returned: t('Zurückgegeben'), problem: t('Problem gemeldet'), problem_resolved: t('Problem erledigt'), note: t('Notiz'), doc: t('Dokument hochgeladen'), doc_removed: t('Dokument entfernt'), undo: t('Schritt zurückgenommen'), updated: t('Geändert'), vehicle: t('Fahrzeug gesetzt'), unassigned: t('Fahrer entfernt (Zugang gelöscht)'),
  }[e.type] || e.type;
  return k;
}
export function eventDetail(e) {
  if (e.type === 'problem') return `${tProblem(e.code)}${e.note ? ' – ' + e.note : ''}`;
  if (e.type === 'note' || e.type === 'returned' || e.type === 'cancelled') return e.note || '';
  if (e.type === 'unloaded' && e.pallets) return t('Paletten: {g} abgegeben, {t} mitgenommen', { g: e.pallets.given, t: e.pallets.taken });
  if (e.type === 'doc') return e.kind === 'pod' ? t('Lieferschein') : e.kind === 'damage' ? t('Schadensfoto') : e.kind === 'signature' ? t('Unterschrift') : t('Foto');
  if (e.type === 'undo') return t('wieder „{s}“', { s: tStatus(e.to) });
  return '';
}
export const eventTone = (type) => (['delivered', 'problem_resolved'].includes(type) ? 'ok' : ['problem', 'returned', 'cancelled'].includes(type) ? 'bad' : ['accepted', 'loaded', 'unloaded', 'arrived_pickup', 'arrived_dropoff'].includes(type) ? 'brand' : '');

export function timeline(d) {
  const evs = [...(d.events || [])].reverse();
  return `<div class="timeline">${evs.map((e) => `<div class="tl ${e.undone ? 'undone' : ''}"><time>${time(e.at)}<br><span class="xs">${esc(dayLabel(new Date(e.at).toISOString().slice(0, 10), t))}</span></time><span class="tn ${eventTone(e.type)}">${icon(EVENT_ICON[e.type] || 'circle-dot')}</span><div class="stack" style="--gap:1px"><b>${esc(eventText(e))}</b><p>${esc(e.byName || '')}${e.role === 'driver' ? '' : e.byName ? ' · ' + t('Büro') : ''}${eventDetail(e) ? ' · ' + esc(eventDetail(e)) : ''}${e.geo ? ` · <a href="https://www.google.com/maps?q=${e.geo.lat},${e.geo.lng}" target="_blank" rel="noopener">${icon('map-pin')} ${t('Standort')}</a>` : ''}</p></div></div>`).join('')}</div>`;
}

export function notesThread(app, d) {
  const me = app.me.user.id;
  if (!(d.notes || []).length) return `<p class="small muted">${t('Noch keine Notizen.')}</p>`;
  return `<div class="notes">${d.notes.map((n) => `<div class="note ${n.by === me ? 'me' : ''}">${esc(n.text)}<small>${esc(n.by === me ? t('Ich') : n.byName)} · ${dateTime(n.at)}</small></div>`).join('')}</div>`;
}

export function docsGrid(app, d, { removable = false, add = '' } = {}) {
  const docs = (d.docs || []).filter((x) => x.kind !== 'signature');
  const label = (k) => ({ pod: t('Lieferschein'), damage: t('Schaden'), load: t('Ladung'), cmr: 'CMR', other: t('Foto') }[k] || k);
  const sig = d.signatureFileId ? `<button class="doc" data-act="lightbox" data-src="${esc(app.fileUrl(d.signatureFileId))}" data-title="${esc(t('Unterschrift'))}"><img src="${esc(app.fileUrl(d.signatureFileId))}" alt="" style="object-fit:contain;background:#fff"><span class="tag">${t('Unterschrift')}</span></button>` : '';
  if (!docs.length && !add && !sig) return `<p class="small muted">${t('Noch keine Dokumente.')}</p>`;
  return `<div class="docs">${add}${docs.map((x) => {
    const url = x.localUrl || app.fileUrl(x.fileId);
    const isPdf = x.mime === 'application/pdf';
    return `<div class="doc" data-key="doc-${esc(x.fileId)}">${isPdf ? `<a href="${esc(url)}" target="_blank" rel="noopener" style="display:grid;place-items:center;height:100%">${icon('file-text')}</a>` : `<button class="doc" style="border:0;width:100%;height:100%" data-act="lightbox" data-src="${esc(url)}" data-title="${esc(label(x.kind))}"><img src="${esc(url)}" alt="" loading="lazy"></button>`}<span class="tag">${esc(label(x.kind))}</span>${removable && !x.queued ? `<button class="rm" data-act="removeDoc" data-id="${esc(d.id)}" data-file="${esc(x.fileId)}" aria-label="${t('Entfernen')}">${icon('x')}</button>` : ''}</div>`;
  }).join('')}${sig}</div>`;
}

export function sheet({ title, sub = '', body, foot = '', wide = false, key = 'sheet', back = false }) {
  return `<div class="sheet-bg" data-key="${key}-bg"></div><section class="sheet ${wide ? 'wide' : ''}" data-key="${key}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header class="sheet-h">${back ? `<button class="ibtn" data-act="${back}" aria-label="${t('Zurück')}">${icon('chevron-left')}</button>` : ''}<div class="grow"><h2>${title}</h2>${sub ? `<p class="small muted">${sub}</p>` : ''}</div><button class="ibtn" data-act="close" aria-label="${t('Schließen')}">${icon('x')}</button></header>
    <div class="sheet-b">${body}</div>${foot ? `<footer class="sheet-f">${foot}</footer>` : ''}</section>`;
}

export function toastsHtml(app) {
  return app.toasts.map((x) => `<div class="toast ${x.plain ? 'plain' : ''} ${x.err ? 'err' : ''} ${x.priority === 'high' ? 'high' : ''} ${x.out ? 'out' : ''}" data-key="t-${x.id}" data-act="toast" data-id="${x.id}" role="status">
    <span class="ti">${x.logo && !x.plain && x.priority !== 'high' ? `<img src="${esc(x.logo)}" alt="">` : icon(x.icon)}</span>
    <div style="min-width:0"><b>${esc(x.title)}</b>${x.body ? `<p>${esc(x.body)}</p>` : ''}</div>${x.onClick ? `<span class="act">${t('Öffnen')}</span>` : '<span></span>'}</div>`).join('');
}

export function lightboxHtml(app) {
  const l = app.ui.lightbox;
  if (!l) return '';
  return `<div class="lightbox" data-key="lightbox"><div class="lb-h"><b class="grow">${esc(l.title)}</b><a class="btn btn-sm" href="${esc(l.src)}" target="_blank" rel="noopener">${icon('external-link')}${t('Original')}</a><button class="ibtn" data-act="lightboxClose" aria-label="${t('Schließen')}">${icon('x')}</button></div><img src="${esc(l.src)}" alt=""></div>`;
}

export function langPicker(app, cls = 'langs') {
  const names = { de: 'Deutsch', en: 'English', pl: 'Polski', ro: 'Română', cs: 'Čeština', tr: 'Türkçe', ru: 'Русский', uk: 'Українська' };
  return `<div class="${cls}">${Object.entries(names).map(([k, v]) => `<button data-act="lang" data-lang="${k}" aria-pressed="${getLang() === k}">${v}</button>`).join('')}</div>`;
}

export function licenseBanner(app) {
  const l = app.me?.license;
  if (!l) return '';
  if (l.state === 'trial' && l.trialEnd) {
    const days = Math.max(0, Math.ceil((l.trialEnd - Date.now()) / 864e5));
    if (days > 10) return '';
    return `<div class="banner info">${icon('sparkles')}<span class="grow">${t('Testphase: noch {n} Tage. Danach läuft Ihr Tarif „{p}“ weiter, sobald Sie ihn bestätigen.', { n: days, p: l.plan.name })}</span></div>`;
  }
  if (l.state === 'cancelled') return `<div class="banner bad">${icon('lock')}<span class="grow">${t('Ihr Vertrag ist gekündigt. Sie können alle Daten bis zur Löschung ansehen und exportieren (Einstellungen → Daten & Datenschutz), aber nichts mehr ändern.')}</span></div>`;
  if (['suspended', 'expired'].includes(l.state)) return `<div class="banner bad">${icon('lock')}<span class="grow">${t('Ihr Zugang ist gesperrt. Daten können angesehen und exportiert werden. Bitte melden Sie sich beim Anbieter.')}</span></div>`;
  return '';
}

export function deliveryCompact(d, app, i = 0) {
  return `<button class="tour ${d.problem ? 'prob' : ''} ${app.flash.has(d.id) ? 'flash' : ''}" style="--i:${i}" data-act="openDelivery" data-id="${esc(d.id)}" data-key="tour-${esc(d.id)}">
    <div class="row between wrap"><div class="row" style="--gap:8px">${pill(d.status)}${problemPill(d.problem)}${d.urgent ? `<span class="pill bad">${icon('zap')}${t('Eilig')}</span>` : ''}</div><span class="mono small muted">${esc(d.bookingNo)}</span></div>
    <div class="route">${routeTitle(d)}</div>
    ${['open', 'cancelled'].includes(d.status) ? '' : stepper(d, { times: true })}
    <div class="meta">${d.driverName ? `<span>${icon('circle-user')} ${esc(d.driverName)}</span>` : `<span>${icon('users')} ${d.openForAll ? t('offen für alle Fahrer') : t('kein Fahrer')}</span>`}${d.vehiclePlate ? plate(d.vehiclePlate) : ''}${d.trailerPlate ? plate(d.trailerPlate) : ''}<span>${icon('calendar')} ${esc(dayLabel(d.pickup?.date, t))}${d.pickup?.from ? ' ' + esc(d.pickup.from) : ''}</span>${d.customer ? `<span>${icon('building-2')} ${esc(d.customer)}</span>` : ''}<span class="muted" style="margin-left:auto">${icon('clock')} ${esc(lastLabel(d))}</span></div>
  </button>`;
}
export function lastLabel(d) {
  const e = (d.events || []).filter((x) => !['updated'].includes(x.type)).pop();
  if (!e) return '';
  const s = Math.round((Date.now() - e.at) / 60000);
  const rel = s < 1 ? t('gerade eben') : s < 60 ? t('vor {n} Min.', { n: s }) : s < 1440 ? t('vor {n} Std.', { n: Math.round(s / 60) }) : dateTime(e.at);
  return `${eventText(e)} · ${rel}`;
}
