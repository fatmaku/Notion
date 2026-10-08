// Cat Me If You Can – App-Start, Kopfzeile, Navigation, Router, Onboarding.

import { RemoteApi, createLocalApi } from './api.js';
import { t, getLang, setLang, LANGS, LANG_INFO, tx } from './i18n.js';
import { esc, sep, toast, errorText, fmtNum } from './ui.js';

// Erweiterung perf: Ansichten erst laden, wenn man sie öffnet (import() je Route, der Lade-Kreis läuft
// solange). Startseite „Heute“ ist in app.html per modulepreload schon unterwegs.
const VIEWS = {
  home: () => import('./views/home.js'),
  catch: () => import('./views/catch.js'),
  dex: () => import('./views/dex.js'),
  cat: () => import('./views/cat.js'),
  map: () => import('./map.js'),
  stats: () => import('./views/stats.js'),
  voucher: () => import('./views/voucher.js'),
  profile: () => import('./views/profile.js'),
};
const STALE = Symbol('stale');
const failedViews = new Set();
const offline = (msg) => Object.assign(new Error(msg), { code: 'network' });
/** Modul einer Ansicht laden. Inzwischen andere Route gewählt → nichts zeichnen; kein Netz → „Keine Verbindung“. */
async function loadView(name) {
  const seq = routeSeq;
  if (failedViews.has(name)) {
    // Der Browser merkt sich ein fehlgeschlagenes Modul bis zum Neuladen. Netz wieder da → neu laden
    // (der Hash und damit die Seite bleiben), sonst wieder „Keine Verbindung“.
    const back = await fetch('js/app.js', { method: 'HEAD', cache: 'no-store' }).then((r) => r.ok, () => false);
    if (!back) throw offline('offline');
    location.reload();
    return new Promise(() => {});
  }
  let mod;
  try {
    mod = await (typeof name === 'function' ? name() : VIEWS[name]()); // Name aus VIEWS oder eigene Ladefunktion
  } catch (e) {
    console.warn('[catme] Ansicht nicht geladen', e);
    failedViews.add(name);
    throw offline(String((e && e.message) || e));
  }
  if (seq !== routeSeq) throw STALE;
  return mod;
}

const ICONS = {
  home: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
  dex: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/><circle cx="11.5" cy="8.5" r="1.6"/>',
  map: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  stats: '<path d="M5 20V11M10 20V5M15 20v-7M20 20V9"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

const ROUTES = [
  [/^\/?$/, 'home', async (v, app) => (await loadView('home')).renderHome(v, app)],
  [/^\/catch$/, 'catch', async (v, app) => (await loadView('catch')).renderCatch(v, app)],
  [/^\/dex$/, 'dex', async (v, app, m, q) => (await loadView('dex')).renderDex(v, app, q)],
  [/^\/cat\/([^/]+)$/, 'dex', async (v, app, m) => (await loadView('cat')).renderCat(v, app, decodeURIComponent(m[1]))],
  [/^\/map$/, 'map', async (v, app) => (await loadView('map')).renderMap(v, app)],
  [/^\/stats$/, 'stats', async (v, app, m, q) => (await loadView('stats')).renderStats(v, app, q)],
  [/^\/help$/, 'stats', async (v, app) => (await loadView('stats')).renderHelp(v, app)],
  [/^\/voucher$/, 'home', async (v, app) => (await loadView('voucher')).renderVoucher(v, app)],
  [/^\/profile$/, 'profile', async (v, app) => (await loadView('profile')).renderProfile(v, app)],
  [/^\/rules$/, 'profile', async (v) => (await loadView('profile')).renderRules(v)],
  // ── Erweiterung: share ──

  // ── Erweiterung: cafe ──

  // ── Erweiterung: routes ──
  // Katzen-Spaziergänge (js/views/routes.js, erst bei Bedarf geladen)
  [/^\/routes$/, 'map', async (v, app) => (await loadView(() => import('./views/routes.js'))).renderRoutes(v, app)],
  [/^\/routes\/([^/]+)$/, 'map', async (v, app, m) => (await loadView(() => import('./views/routes.js'))).renderRoute(v, app, decodeURIComponent(m[1]))],

  // ── Erweiterung: impact ──
  [/^\/feed$/, 'feed', async (v, app) => (await loadView(() => import('./views/impact.js'))).renderFeed(v, app)],
  [/^\/guide$/, 'guide', async (v) => (await loadView(() => import('./views/guide.js'))).renderGuide(v)],

  // ── Erweiterung: report ──

  // ── Erweiterung: perf ──

];

let earlyConfig = null;
async function chooseApi() {
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') return createLocalApi();
  const remote = new RemoteApi();
  earlyConfig = remote.config(); // Erweiterung perf: Einstellungen parallel zur Server-Prüfung holen (eine Wartezeit weniger)
  earlyConfig.catch(() => {});
  // Server kurz weg (Update/Neustart: 502/503/504 oder Netzfehler) → ein paar Mal neu versuchen, statt still
  // ins Browser-Demo zu wechseln – dort gespeicherte Fänge kämen nie beim Server an. Statisch gehostet
  // (404, HTML statt JSON) → sofort Demo im Browser.
  const waits = [700, 1500, 2500];
  for (let i = 0; ; i++) {
    try {
      const h = await remote.health();
      return h && h.ok === true ? remote : createLocalApi();
    } catch (e) {
      const transient = e && (e.status === 0 || e.status >= 500);
      if (!transient || i >= waits.length) return createLocalApi();
      await new Promise((r) => setTimeout(r, waits[i]));
    }
  }
}

function shell(app) {
  document.body.innerHTML = `
    <a class="skip" href="#view">${esc(t('common.skip'))}</a>
    <header class="top">
      <a href="#/" class="brand" aria-label="Cat Me If You Can"><img src="icons/logo.svg" alt="" width="36" height="36">
        <span class="wordmark"><b>Cat Me</b><i>If You Can</i></span></a>
      ${app.api.isDemo ? `<span class="chip demo" title="${esc(t('onb.demo'))}">${esc(t('common.demo'))}</span>` : ''}
      <a href="#/profile" class="me-pill" data-me aria-label="${esc(t('p.settings'))}"></a>
    </header>
    <main id="view" tabindex="-1"></main>
    <nav class="tabs" aria-label="Navigation">
      <a href="#/" data-tab="home">${icon('home')}<span>${esc(t('nav.today'))}</span></a>
      <a href="#/dex" data-tab="dex">${icon('dex')}<span>${esc(t('nav.dex'))}</span></a>
      <a href="#/catch" data-tab="catch" class="tab-catch"><span class="tab-catch-btn"><img src="icons/logo.svg" alt="" width="40" height="40"></span><span>${esc(t('nav.catch'))}</span></a>
      <a href="#/map" data-tab="map">${icon('map')}<span>${esc(t('nav.map'))}</span></a>
      <a href="#/stats" data-tab="stats">${icon('stats')}<span>${esc(t('nav.stats'))}</span></a>
    </nav>`;
  app.updateMe();
  import('./views/impact.js').then((m) => m.mountFeedBell(app)).catch(() => {}); // Erweiterung impact: Herz mit Dank-Zahl oben
}

function onboarding(app) {
  const wrap = document.createElement('div');
  wrap.className = 'onboarding';
  const draw = () => {
    wrap.innerHTML = `
      <div class="onb-inner">
        <img class="onb-logo" src="icons/logo.svg" alt="" width="132" height="132">
        <h1 class="onb-title"><span>Cat Me</span><em>If You Can</em></h1>
        <p class="onb-slogan">${esc(t('app.slogan'))}</p>
        <div class="langs" role="group" aria-label="${esc(t('onb.lang'))}">${LANGS.map((l) => `<button data-lang="${l}" lang="${l}" class="${l === getLang() ? 'on' : ''}" aria-label="${esc(LANG_INFO[l].name)}">${esc(LANG_INFO[l].name)}</button>`).join('')}</div>
        <h2>${esc(t('onb.title'))}</h2>
        <p>${esc(t('onb.lead'))}</p>
        <ul class="onb-rules">${['onb.rule1', 'onb.rule2', 'onb.rule3', 'onb.rule4'].map((k) => `<li>${esc(t(k))}</li>`).join('')}</ul>
        <form data-f class="onb-form">
          <label for="nick">${esc(t('onb.nick'))}</label>
          <div class="row"><input id="nick" name="nick" required minlength="2" maxlength="20" autocomplete="nickname" placeholder="${esc(t('onb.nickPh'))}"><button class="btn primary">${esc(t('onb.start'))} <span class="dir-ic" aria-hidden="true">→</span></button></div>
        </form>
        ${app.api.isDemo ? `<p class="small muted">🧪 ${esc(t('onb.demo'))}</p>` : ''}
        <p class="small"><a href="#/rules" data-rules>${esc(t('p.rules'))}</a></p>
      </div>`;
    import('./views/cafe.js').then((m) => m.cafeWelcome(wrap, app.api)).catch(() => {}); // Erweiterung cafe: „Willkommen von Café X“
    wrap.querySelector('[data-f]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      try {
        const p = await app.api.register(e.target.nick.value, getLang());
        app.setPlayer(p);
        wrap.remove();
        shell(app);
        route(app);
      } catch (err) {
        toast(errorText(err), { type: 'error', ms: 4500 });
        btn.disabled = false;
      }
    });
    wrap.querySelector('[data-rules]').addEventListener('click', (e) => {
      e.preventDefault();
      import('./views/profile.js').then(({ renderRules }) => {
        const box = document.createElement('div');
        renderRules(box);
        box.querySelector('[data-back]').addEventListener('click', () => box.remove());
        box.className = 'onb-rules-pop';
        wrap.append(box);
      });
    });
  };
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    setLang(b.dataset.lang);
    draw();
  });
  draw();
  document.body.innerHTML = '';
  document.body.append(wrap);
}

let cleanup = null;
let routeSeq = 0;
async function route(app) {
  if (!app.api.hasToken()) return onboarding(app);
  if (!document.querySelector('#view')) shell(app);
  const raw = (location.hash || '#/').slice(1);
  const [path, query = ''] = raw.split('?');
  const q = new URLSearchParams(query);
  const hit = ROUTES.find(([re]) => re.test(path)) || ROUTES[0];
  const m = path.match(hit[0]) || [];
  if (cleanup) {
    try {
      cleanup();
    } catch {
      /* egal */
    }
    cleanup = null;
  }
  const seq = ++routeSeq;
  document.body.dataset.route = hit[1];
  document.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('on', a.dataset.tab === hit[1]));
  const view = document.querySelector('#view');
  view.innerHTML = `<div class="loading"><span class="spinner-cat">🐱</span></div>`;
  window.scrollTo(0, 0);
  try {
    const c = await hit[2](view, app, m, q);
    if (seq !== routeSeq) {
      if (typeof c === 'function') c();
      return;
    }
    if (typeof c === 'function') cleanup = c;
  } catch (e) {
    if (seq !== routeSeq) return;
    if (e && e.code === 'login_required') return onboarding(app);
    view.innerHTML = `<div class="empty"><div class="big-emoji">😿</div><p>${esc(errorText(e))}</p><button class="btn" data-retry>${esc(t('common.retry'))}</button></div>`;
    view.querySelector('[data-retry]').addEventListener('click', () => route(app));
  }
}

async function boot() {
  setLang(getLang());
  const api = await chooseApi();
  const config = await (api instanceof RemoteApi && earlyConfig ? earlyConfig.catch(() => api.config()) : api.config());
  const app = {
    api,
    config,
    player: null,
    lang: () => getLang(),
    setPlayer(p) {
      app.player = p;
      app.updateMe();
    },
    updateMe() {
      const el = document.querySelector('[data-me]');
      if (!el || !app.player) return;
      const p = app.player;
      el.innerHTML = `<span class="lvl">${esc(t('home.level', { n: p.level }))}</span><span class="avatar">${esc(p.nickname.slice(0, 1).toLocaleUpperCase('tr'))}</span>`;
      el.title = `${p.nickname}${sep()}${tx(p.title)}${sep()}${fmtNum(p.xp)} XP`;
    },
    async refreshPlayer() {
      try {
        const { player } = await api.me();
        app.setPlayer(player);
      } catch {
        /* egal */
      }
    },
    rerender() {
      shell(app);
      route(app);
    },
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]') && !e.target.closest('.onb-rules-pop')) {
      e.preventDefault();
      if (history.length > 1) history.back();
      else location.hash = '#/';
    }
  });
  window.addEventListener('hashchange', () => route(app));
  if (api.hasToken()) app.refreshPlayer();
  await route(app);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot().catch((e) => {
  document.body.innerHTML = `<div class="empty"><div class="big-emoji">😿</div><p>${esc(String(e && e.message ? e.message : e))}</p></div>`;
});
