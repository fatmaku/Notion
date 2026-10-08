// Cat Me If You Can – öffentliche Katzenseiten mit Link-Vorschau (/c/<id>), robots.txt, sitemap.xml.
//
// Jede Katze bekommt eine eigene Seite, die beim Teilen (WhatsApp, Instagram, X, Telegram) mit
// Bild, Name und kurzer Beschreibung erscheint. Die Seite kommt fertig vom Server (kein
// JavaScript nötig); js/catpage.js ergänzt nur „Teilen“ und „Link kopieren“.
//
// Datenschutz und Tierschutz: keine Koordinaten (auch keine gerundeten), nur der Ausschnitt um die
// Katze als Foto, Spitznamen wie in der Rangliste (gesperrte Konten nie). Alles wird escaped.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pickSiteLang } from './static.js';
import { sendBody } from './compress.js';
import { catAvatarSvg } from '../public/js/avatar.js';
import { PATTERNS, RARITY, CAT_STATUS, AGE_GROUPS, label } from '../public/core/taxonomy.js';
import { CAT_ID_RE, PUBLIC_PHOTO_RE } from '../public/core/share.js';
import tr from '../public/js/lang/tr.js';
import en from '../public/js/lang/en.js';
import de from '../public/js/lang/de.js';
import ru from '../public/js/lang/ru.js';
import ar from '../public/js/lang/ar.js';
import fa from '../public/js/lang/fa.js';

const STRINGS = { tr, en, de, ru, ar, fa };

/** Sprachen der Seite (Reihenfolge wie überall: tr · en · de · ru · ar · fa). */
export const PAGE_LANGS = {
  tr: { dir: 'ltr', locale: 'tr-TR', og: 'tr_TR', name: 'Türkçe' },
  en: { dir: 'ltr', locale: 'en-GB', og: 'en_GB', name: 'English' },
  de: { dir: 'ltr', locale: 'de-DE', og: 'de_DE', name: 'Deutsch' },
  ru: { dir: 'ltr', locale: 'ru-RU', og: 'ru_RU', name: 'Русский' },
  ar: { dir: 'rtl', locale: 'ar', og: 'ar_AR', name: 'العربية' },
  fa: { dir: 'rtl', locale: 'fa-IR', og: 'fa_IR', name: 'فارسی' },
};
const TZ = 'Europe/Istanbul';
const BRAND = 'Cat Me If You Can';

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ---------------------------------------------------------------- Texte (wie js/i18n.js, aber pro Anfrage)

/** Übersetzer für eine Sprache: t() Klartext, th() HTML (Namen als <bdi>), Zahlen/Daten per Intl. */
export function translator(lang) {
  const code = PAGE_LANGS[lang] ? lang : 'en';
  const info = PAGE_LANGS[code];
  const pr = new Intl.PluralRules(info.locale);
  const nf = new Intl.NumberFormat(info.locale, { maximumFractionDigits: 1, useGrouping: 'min2' });
  const fmt = (v) => (typeof v === 'number' && Number.isFinite(v) ? nf.format(v) : String(v ?? ''));
  function raw(key, vars) {
    let s = STRINGS[code][key] ?? STRINGS.en[key] ?? STRINGS.tr[key] ?? key;
    if (s && typeof s === 'object') {
      const cat = vars && vars.n != null ? pr.select(Number(vars.n)) : 'other';
      s = s[cat] ?? s.other ?? Object.values(s)[0];
    } else if (typeof s === 'string' && s.includes('|') && vars && vars.n != null) {
      const [one, other] = s.split('|');
      s = Number(vars.n) === 1 ? one : other;
    }
    return String(s);
  }
  const t = (key, vars) => raw(key, vars).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? fmt(vars[k]) : ''));
  const th = (key, vars) =>
    esc(raw(key, vars)).replace(/\{(\w+)\}/g, (_, k) => {
      const v = vars && vars[k];
      if (v == null) return '';
      return typeof v === 'number' ? esc(fmt(v)) : `<bdi>${esc(v)}</bdi>`;
    });
  const date = (ts) => (ts ? new Date(ts).toLocaleDateString(info.locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '');
  /** „vor 2 Tagen“ – wie fmtAgo() in der App; ab 14 Tagen das Datum. */
  const ago = (ts, now) => {
    if (!ts) return '';
    const s = Math.max(0, (now - ts) / 1000);
    if (s < 60) return t('common.now');
    if (s < 3600) return t('common.minAgo', { n: Math.floor(s / 60) });
    if (s < 86400) return t('common.hAgo', { n: Math.floor(s / 3600) });
    if (s < 86400 * 14) return t('common.dAgo', { n: Math.floor(s / 86400) });
    return date(ts);
  };
  return { lang: code, info, t, th, fmt, date, ago, enumLabel: (table, key) => label(table, key, code) };
}

// ---------------------------------------------------------------- Adressen

/**
 * Absolute Basis-Adresse für Vorschauen (WhatsApp & Co. brauchen absolute Bild-Adressen).
 * 1. publicUrl (CATME_PUBLIC_URL), 2. Host-Kopfzeile, wenn sie harmlos aussieht – das Schema aus
 * X-Forwarded-Proto nur hinter einem vertrauenswürdigen Proxy, 3. sonst '' (relative Adressen).
 */
export function absoluteBase(req, { publicUrl = '', trustProxy = 0 } = {}) {
  if (publicUrl) {
    try {
      const u = new URL(String(publicUrl));
      if (u.protocol === 'https:' || u.protocol === 'http:') return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
    } catch {
      /* ungültig → aus der Anfrage */
    }
  }
  const host = String((req && req.headers && req.headers.host) || '');
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return '';
  let proto = req.socket && req.socket.encrypted ? 'https' : 'http';
  if (trustProxy === true || Number(trustProxy) > 0) {
    const xf = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
    if (xf === 'https' || xf === 'http') proto = xf;
  }
  return `${proto}://${host.toLowerCase()}`;
}

/** Hilfe-Leitfaden: nur eigene Pfade (/…) oder http(s)-Adressen. */
function safeHref(v) {
  if (typeof v !== 'string' || !v) return null;
  if (/^\/(?!\/)[^\s"'<>]*$/.test(v)) return v;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Bildgröße (für og:image:width/height)

/** Breite/Höhe aus dem JPEG-Kopf (SOFn-Segment), ohne Bildbibliothek. */
export function jpegSize(buf) {
  if (!buf || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 8 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const m = buf[i + 1];
    if (m === 0xff) {
      i++;
      continue;
    }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) {
      i += 2;
      continue;
    }
    if (m === 0xd9 || m === 0xda) return null;
    const len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return width && height ? { width, height } : null;
    }
    i += 2 + len;
  }
  return null;
}

// ---------------------------------------------------------------- Seiten

/** Pfeil in Leserichtung (auf Arabisch/Persisch gespiegelt, .dir-ic). */
const ARROW = '<span class="dir-ic" aria-hidden="true">→</span>';

const STATUS_NOTE = {
  needs_help: { icon: '🩹', key: 'cp.helpNote', cls: 'help' },
  in_care: { icon: '💚', key: 'cp.careNote', cls: 'care' },
  adopted: { icon: '🏡', key: 'cp.adoptedNote', cls: 'home' },
};

function head({ T, title, desc, canonical, alternates, image, imageAlt, imageSize, imageType, noindex, extra = '' }) {
  const L = T.info;
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#14213d">
<meta name="color-scheme" content="dark">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}${canonical ? `<link rel="canonical" href="${esc(canonical)}">\n` : ''}${(alternates || []).map(([hl, href]) => `<link rel="alternate" hreflang="${esc(hl)}" href="${esc(href)}">`).join('\n')}
<link rel="icon" href="/icons/logo.svg" type="image/svg+xml">
<link rel="icon" href="/icons/favicon-64.png" sizes="64x64" type="image/png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">\n` : ''}<meta property="og:image" content="${esc(image)}">
${imageType ? `<meta property="og:image:type" content="${esc(imageType)}">\n` : ''}${imageSize ? `<meta property="og:image:width" content="${imageSize.width}">\n<meta property="og:image:height" content="${imageSize.height}">\n` : ''}<meta property="og:image:alt" content="${esc(imageAlt)}">
<meta property="og:locale" content="${L.og}">
${Object.keys(PAGE_LANGS).filter((l) => l !== T.lang).map((l) => `<meta property="og:locale:alternate" content="${PAGE_LANGS[l].og}">`).join('\n')}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(imageAlt)}">
<link rel="stylesheet" href="/css/fonts.css">
<link rel="stylesheet" href="/css/catpage.css">
${extra}</head>`;
}

function topBar(T, langHref) {
  const cur = PAGE_LANGS[T.lang];
  return `<header class="cp-top">
  <a class="cp-brand" href="/?lang=${T.lang}" aria-label="${BRAND}"><img src="/icons/logo.svg" alt="" width="40" height="40"><span class="cp-word" lang="en" dir="ltr"><b>Cat Me</b><i>If You Can</i></span></a>
  <details class="cp-lang">
    <summary aria-label="${esc(T.t('onb.lang'))}: ${esc(cur.name)}"><span aria-hidden="true">🌐</span> <span lang="${T.lang}">${esc(cur.name)}</span></summary>
    <ul>${Object.entries(PAGE_LANGS).map(([l, info]) => `<li><a href="${esc(langHref(l))}" hreflang="${l}" lang="${l}" dir="${info.dir}" data-lang="${l}"${l === T.lang ? ' aria-current="true"' : ''}>${esc(info.name)}</a></li>`).join('')}</ul>
  </details>
</header>`;
}

function footer(T) {
  return `<footer class="cp-foot">
  <img src="/icons/logo.svg" alt="" width="32" height="32">
  <p>${esc(T.t('brand.maker'))}</p>
  <p class="cp-tags" dir="ltr">#CatMeIfYouCan · #CatMeKadikoy</p>
</footer>`;
}

function page({ T, headHtml, bodyClass, langHref, main }) {
  return `<!doctype html>
<html lang="${T.lang}" dir="${T.info.dir}">
${headHtml}
<body class="${esc(bodyClass)}">
${topBar(T, langHref)}
<main id="main" class="cp-main">
${main}
</main>
${footer(T)}
</body>
</html>
`;
}

function placeText(d) {
  if (!d.districtName) return null;
  return d.districtAka && d.districtAka !== d.districtName ? `${d.districtName} (${d.districtAka})` : d.districtName;
}

/**
 * HTML der Katzenseite. d = engine.publicCatPage(); opts: {lang, base (absolute Adresse oder ''), now,
 * guideUrl (Hilfe-Leitfaden), langFromQuery (Sprache stand in ?lang), ogFallback (media/og-<lang>.png), photoSize}
 */
export function renderCatPage(d, { lang = 'en', base = '', now = Date.now(), guideUrl = null, langFromQuery = false, ogFallback = null, photoSize = null } = {}) {
  const T = translator(lang);
  const { t, th } = T;
  const id = encodeURIComponent(d.id);
  const pagePath = `/c/${id}`;
  const canonical = `${base}${pagePath}${langFromQuery ? `?lang=${T.lang}` : ''}`;
  const alternates = [...Object.keys(PAGE_LANGS).map((l) => [l, `${base}${pagePath}?lang=${l}`]), ['x-default', `${base}${pagePath}`]];
  const type = T.enumLabel(PATTERNS, d.pattern || 'diger');
  const place = placeText(d);
  const region = t('app.region');
  const placeLong = place ? `${place}, ${region}` : region;
  const status = CAT_STATUS[d.status] ? d.status : 'active';
  const deceased = status === 'deceased';
  const missing = status === 'missing';
  const named = !!d.name;

  // ---- Titel und Beschreibung (Vorschau)
  let title;
  if (deceased) title = named ? t('cp.memoryTitle', { name: d.name }) : t('cp.memory');
  else if (missing && named) title = t('cp.missingTitle', { name: d.name });
  else if (named) title = t('cp.meet', { name: d.name });
  else title = t('cp.titleUnnamed', { place: d.districtAka || d.districtName || region });
  const descParts = [];
  if (deceased) descParts.push(t('cp.memoryNote'));
  else if (missing) descParts.push(named ? t('cp.missingNote', { name: d.name }) : t('cp.missingThis'));
  descParts.push(`${type} · ${placeLong}`);
  if (d.observationCount > 0) descParts.push(t('cp.seenTimes', { n: d.observationCount }));
  if (d.discoveredBy) descParts.push(t('card.discoveredBy', { name: d.discoveredBy }));
  if (!deceased) descParts.push(t('app.slogan'));
  const desc = descParts.join(' · ');
  const fullTitle = `${title} · ${BRAND}`;

  // ---- Vorschaubild: Ausschnitt-Foto der Katze, sonst das Bild der Sprache
  const photo = d.photoUrl && PUBLIC_PHOTO_RE.test(d.photoUrl) ? d.photoUrl : null;
  const og = photo ? `${base}${photo}` : `${base}/${ogFallback || `media/og-${T.lang}.png`}`;
  const imageAlt = photo ? (named ? t('cp.photoOf', { name: d.name }) : t('cp.photoThis')) : BRAND;
  const imageSize = photo ? photoSize : { width: 1200, height: 630 };

  // ---- Karte
  const rar = RARITY[d.rarity] ? d.rarity : 'common';
  const stars = RARITY[rar].stars;
  const visual = photo
    ? `<img class="cp-img" src="${esc(photo)}" alt="${esc(imageAlt)}"${photoSize ? ` width="${photoSize.width}" height="${photoSize.height}"` : ''} decoding="async">`
    : `<div class="cp-img cp-avatar" role="img" aria-label="${esc(t('cp.drawing'))}">${catAvatarSvg(d.look || { pattern: d.pattern })}</div>`;
  const facts = [
    [t('card.type'), esc(type)],
    place ? [t('card.place'), `<bdi>${esc(place)}</bdi>`] : null,
    d.ageGroup && AGE_GROUPS[d.ageGroup] ? [t('card.age'), esc(T.enumLabel(AGE_GROUPS, d.ageGroup))] : null,
    d.observationCount > 0 ? [t('cp.seen'), esc(t('cp.times', { n: d.observationCount }))] : null,
    d.lastSeenAt ? [t('cat.lastSeen'), `<time datetime="${new Date(d.lastSeenAt).toISOString()}">${esc(T.ago(d.lastSeenAt, now))}</time>`] : null,
    d.discoveredBy ? [t('cat.discoverer'), `<span aria-hidden="true">👑</span>&nbsp;<bdi>${esc(d.discoveredBy)}</bdi>`, d.discoveredBy.length > 9] : null,
    d.namedBy ? [t('cat.namer'), `<bdi>${esc(d.namedBy)}</bdi>`, d.namedBy.length > 9] : null,
  ].filter(Boolean);
  // Lange Spitznamen bekommen die ganze Breite; bleibt eine Kachel allein, füllt sie ihre Zeile.
  const narrow = facts.filter((f) => !f[2]);
  if (narrow.length % 2) narrow[narrow.length - 1][2] = true;
  const chips = [
    `<span class="cp-chip st-${status}"><span aria-hidden="true">${esc(t(`status.icon.${status}`))}</span> ${esc(T.enumLabel(CAT_STATUS, status))}</span>`,
    d.earTipped ? `<span class="cp-chip"><span aria-hidden="true">✂️</span> ${esc(t('cp.neutered'))}</span>` : '',
    d.demo ? `<span class="cp-chip demo">${esc(t('cat.demo'))}</span>` : '',
  ].join(' ');

  const card = `<article class="cp-card r-${rar}${deceased ? ' is-memory' : ''}" aria-labelledby="cp-name">
  <div class="cp-photo">
    ${visual}
    <span class="cp-corner tl" aria-hidden="true"></span><span class="cp-corner tr" aria-hidden="true"></span><span class="cp-corner bl" aria-hidden="true"></span><span class="cp-corner br" aria-hidden="true"></span>
  </div>
  <div class="cp-info">
    <p class="cp-kicker">${deceased ? `<span aria-hidden="true">🕊️</span> ${esc(t('cp.memory'))}` : esc(t('cp.kicker'))}</p>
    <h1 id="cp-name">${named ? `<bdi>${esc(d.name)}</bdi>` : esc(t('card.unnamed'))}</h1>
    ${!named && !deceased ? `<p class="cp-nameit">${esc(t('cp.nameIt'))}</p>` : ''}
    ${d.title ? `<p class="cp-legend"><span aria-hidden="true">🌟</span> ${esc(t('cat.legend'))}: <bdi>${esc(d.title)}</bdi></p>` : ''}
    <p class="cp-rarity"><span class="cp-stars" aria-hidden="true">${'★'.repeat(stars)}<span class="off">${'☆'.repeat(5 - stars)}</span></span> <span>${esc(T.enumLabel(RARITY, rar))}</span></p>
    <p class="cp-chips">${chips}</p>
    <dl class="cp-facts">${facts.map(([k, v, wide]) => `<div${wide ? ' class="wide"' : ''}><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
  </div>
</article>`;

  // ---- Hinweis je nach Status
  let note = '';
  if (deceased) {
    note = `<section class="cp-note memory"><p><span aria-hidden="true">🕊️</span> ${th('cp.memoryNote')}</p></section>`;
  } else if (missing) {
    note = `<section class="cp-note missing"><p><strong>${named ? th('cp.missingNote', { name: d.name }) : th('cp.missingThis')}</strong></p><p>${th('cp.missingHow')}</p></section>`;
  } else if (STATUS_NOTE[status]) {
    const n = STATUS_NOTE[status];
    const guide = status === 'needs_help' ? safeHref(guideUrl) : null;
    note = `<section class="cp-note ${n.cls}"><p><span aria-hidden="true">${n.icon}</span> ${th(n.key)}</p>${guide ? `<p><a href="${esc(guide)}"><span>${th('cp.helpGuide')}</span>${ARROW}</a></p>` : ''}</section>`;
  }

  // ---- Knöpfe
  const appHref = `/app.html#/cat/${id}`;
  let primary = '';
  // Beschriftung in eigenem <span>: .cp-btn ist ein Flex-Container, Text und <bdi> blieben sonst getrennt
  // Adoptiert oder in Behandlung: nicht auf der Straße suchen lassen – allgemein „Katzen finden“
  if (status === 'adopted' || status === 'in_care') primary = `<a class="cp-btn primary" href="${esc(appHref)}" data-play><span>${th('cp.playAny')}</span>${ARROW}</a>`;
  else if (!deceased) primary = `<a class="cp-btn primary" href="${esc(appHref)}" data-play><span>${named ? th('cp.play', { name: d.name }) : th('cp.playThis')}</span>${ARROW}</a>`;
  const shareText = named ? t('cp.shareText', { name: d.name }) : t('cp.shareThis');
  const actions = `<div class="cp-actions">
  ${primary}
  <a class="cp-btn" href="/?lang=${T.lang}"><span>${th('cp.what')}</span></a>
  <div class="cp-share" data-share hidden data-url="${esc(canonical)}" data-title="${esc(fullTitle)}" data-text="${esc(shareText)}" data-copied="${esc(t('share.copied'))}" data-hint="${esc(t('share.copyHint'))}">
    <button type="button" class="cp-btn ghost" data-act="share"><span aria-hidden="true">📤</span><span>${esc(t('share.button'))}</span></button>
    <button type="button" class="cp-btn ghost" data-act="copy"><span aria-hidden="true">🔗</span><span>${esc(t('share.copy'))}</span></button>
    <p class="cp-msg" role="status" aria-live="polite" data-msg></p>
  </div>
</div>`;
  const rules = deceased ? '' : `<p class="cp-rules">${esc(t('onb.rule1'))}</p>`;

  const headHtml = head({
    T,
    title: fullTitle,
    desc,
    canonical,
    alternates,
    image: og,
    imageAlt,
    imageSize,
    imageType: photo ? 'image/jpeg' : 'image/png',
    noindex: d.demo || !named,
    extra: '<script type="module" src="/js/catpage.js"></script>\n',
  });
  return page({
    T,
    headHtml,
    bodyClass: `cp st-${status}`,
    langHref: (l) => `${pagePath}?lang=${l}`,
    main: `${card}\n${note}\n${actions}\n${rules}`,
  });
}

/** Freundliche 404-Seite („Diese Katze finden wir nicht“). */
export function renderNotFoundPage({ lang = 'en', base = '', ogFallback = null } = {}) {
  const T = translator(lang);
  const { t, th } = T;
  const title = `${t('cp.notFound')} · ${BRAND}`;
  const headHtml = head({
    T,
    title,
    desc: t('app.slogan'),
    canonical: null,
    alternates: [],
    image: `${base}/${ogFallback || `media/og-${T.lang}.png`}`,
    imageAlt: BRAND,
    imageSize: { width: 1200, height: 630 },
    imageType: 'image/png',
    noindex: true,
  });
  const main = `<section class="cp-card cp-404">
  <div class="cp-404-art" aria-hidden="true"><img src="/icons/logo.svg" alt="" width="120" height="120"></div>
  <div class="cp-info">
    <h1>${th('cp.notFound')}</h1>
    <p>${th('cp.notFoundText')}</p>
  </div>
</section>
<div class="cp-actions">
  <a class="cp-btn primary" href="/app.html"><span>${th('cp.playAny')}</span>${ARROW}</a>
  <a class="cp-btn" href="/?lang=${T.lang}"><span>${th('cp.what')}</span></a>
</div>`;
  return page({ T, headHtml, bodyClass: 'cp is-404', langHref: (l) => `?lang=${l}`, main });
}

// ---------------------------------------------------------------- robots.txt und sitemap.xml

/** Alles erlaubt (auch die offenen Daten unter /api/export); Sitemap nur mit absoluter Adresse. */
export function robotsTxt(base) {
  return ['# Cat Me If You Can', 'User-agent: *', 'Allow: /', ...(base ? ['', `Sitemap: ${base}/sitemap.xml`] : []), ''].join('\n');
}

const isoDate = (ts) => new Date(ts).toISOString().replace(/\.\d{3}Z$/, '+00:00');

export function sitemapXml(base, cats, { landingAt = null, appAt = null, pages = [] } = {}) {
  const url = (loc, lastmod, extra = '') => `  <url><loc>${esc(`${base}${loc}`)}</loc>${lastmod ? `<lastmod>${isoDate(lastmod)}</lastmod>` : ''}${extra}</url>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url('/', landingAt, '<priority>1.0</priority>'),
    url('/app.html', appAt, '<priority>0.8</priority>'),
    // weitere öffentliche Seiten (Hilfe-Leitfaden, Monatsbericht) – nur wenn es sie gibt
    ...pages.map((p) => url(p.loc, p.at, p.extra || '')),
    ...cats.map((c) => url(`/c/${encodeURIComponent(c.id)}`, c.updatedAt || null)),
    '</urlset>',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------- HTTP

function etagOf(body) {
  return `"cp-${crypto.createHash('sha1').update(body).digest('base64url').slice(0, 22)}"`;
}

function send(req, res, status, body, headers) {
  const buf = Buffer.from(body);
  sendBody(req, res, status, buf, headers, { etag: etagOf(buf) }); // Erweiterung perf: gepackt, ETag je Verfahren, 304
}

/**
 * Seiten-Handler für server/app.js: (req, res, url, ip) → true, wenn beantwortet.
 * opts: {engine, publicDir, photoDir, headers (CSP & Co.), publicUrl, trustProxy, limiter, helpGuideUrl, now}
 */
export function createSharePages({ engine, publicDir, photoDir = null, headers = {}, publicUrl = '', trustProxy = 0, limiter = null, helpGuideUrl = null, now = () => Date.now() }) {
  const sizes = new Map(); // Foto-Ausschnitte ändern sich nie (zufällige IDs) → Größe einmal lesen
  function photoSize(photoUrl) {
    if (!photoDir || !photoUrl || !PUBLIC_PHOTO_RE.test(photoUrl)) return null;
    const name = photoUrl.slice('/photos/'.length);
    if (sizes.has(name)) return sizes.get(name);
    let size = null;
    try {
      const fd = fs.openSync(path.join(photoDir, name), 'r');
      try {
        const buf = Buffer.alloc(64 * 1024);
        const n = fs.readSync(fd, buf, 0, buf.length, 0);
        size = jpegSize(buf.subarray(0, n));
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      size = null;
    }
    if (sizes.size > 5000) sizes.clear();
    sizes.set(name, size);
    return size;
  }
  const ogFallback = (lang) => (fs.existsSync(path.join(publicDir, 'media', `og-${lang}.png`)) ? `media/og-${lang}.png` : 'media/og.png');
  let guideCache = { at: 0, url: null };
  function guideUrl() {
    if (helpGuideUrl) return helpGuideUrl;
    // Ein Hilfe-Leitfaden einer anderen Erweiterung wird automatisch verlinkt, sobald es ihn gibt.
    if (now() - guideCache.at > 60000) {
      const file = ['help.html', 'hilfe.html', 'guide.html'].find((f) => fs.existsSync(path.join(publicDir, f)));
      guideCache = { at: now(), url: file ? `/${file}` : null };
    }
    return guideCache.url;
  }
  const mtime = (f) => {
    try {
      return fs.statSync(path.join(publicDir, f)).mtimeMs;
    } catch {
      return null;
    }
  };
  const htmlHeaders = (extra = {}) => ({ 'Content-Type': 'text/html; charset=utf-8', ...headers, ...extra });

  return async function sharePages(req, res, url, ip) {
    const p = url.pathname;
    if (p === '/robots.txt') {
      send(req, res, 200, robotsTxt(absoluteBase(req, { publicUrl, trustProxy })), { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
      return true;
    }
    if (p === '/sitemap.xml') {
      if (limiter) limiter.take(ip);
      const base = absoluteBase(req, { publicUrl, trustProxy });
      const pages = [
        { file: 'guide.html', extra: '<priority>0.7</priority>' },
        { file: 'report.html', extra: '<changefreq>monthly</changefreq><priority>0.7</priority>' },
      ].filter((p) => mtime(p.file) != null).map((p) => ({ loc: `/${p.file}`, at: mtime(p.file), extra: p.extra }));
      const xml = sitemapXml(base, engine.sitemapCats(), { landingAt: mtime('index.html'), appAt: mtime('app.html'), pages });
      send(req, res, 200, xml, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600', 'X-Content-Type-Options': 'nosniff' });
      return true;
    }
    const m = /^\/c\/([^/]+)\/?$/.exec(p);
    if (!m && p !== '/c' && p !== '/c/') return false;
    if (limiter) limiter.take(ip);
    const qLang = url.searchParams.get('lang');
    const lang = pickSiteLang(qLang, req.headers['accept-language']);
    const langFromQuery = !!(qLang && PAGE_LANGS[qLang]);
    const base = absoluteBase(req, { publicUrl, trustProxy });
    let id = null;
    try {
      id = m ? decodeURIComponent(m[1]) : null;
    } catch {
      id = null;
    }
    let data = null;
    if (id && CAT_ID_RE.test(id)) {
      try {
        data = engine.publicCatPage(id);
      } catch (e) {
        if (!e || e.status !== 404) throw e;
      }
    }
    if (data && data.redirect) {
      // zusammengeführte Katze → Seite der Ziel-Katze (Sprache bleibt)
      res.writeHead(301, { Location: `/c/${encodeURIComponent(data.id)}${langFromQuery ? `?lang=${lang}` : ''}`, 'Cache-Control': 'public, max-age=300', ...headers });
      res.end();
      return true;
    }
    if (!data) {
      send(req, res, 404, renderNotFoundPage({ lang, base, ogFallback: ogFallback(lang) }), htmlHeaders({ 'Cache-Control': 'no-cache', 'Content-Language': lang, Vary: 'Accept-Language' }));
      return true;
    }
    const html = renderCatPage(data, { lang, base, now: now(), guideUrl: guideUrl(), langFromQuery, ogFallback: ogFallback(lang), photoSize: photoSize(data.photoUrl) });
    send(req, res, 200, html, htmlHeaders({ 'Cache-Control': 'public, max-age=300', 'Content-Language': lang, Vary: 'Accept-Language' }));
    return true;
  };
}
