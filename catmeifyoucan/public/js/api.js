// Cat Me If You Can – API-Schicht der App.
//
// RemoteApi spricht mit dem Server (/api/…). LocalApi ist der Demo-Modus ohne Server: dieselbe
// Spiel-Engine (public/core) läuft im Browser, Daten liegen in localStorage, Analyse = einfache
// Fellfarben-Analyse. Beide haben dieselben Methoden – die Oberfläche merkt keinen Unterschied.

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details || null;
  }
}

const TOKEN_KEY = 'catme.token';
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* privater Modus */
    }
  },
};

export class RemoteApi {
  constructor(base = '') {
    this.base = base;
    this.isDemo = false;
    this.token = store.get(TOKEN_KEY);
  }

  async req(method, path, body, { timeout = 20000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    let res;
    try {
      res = await fetch(this.base + path, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
    } catch {
      throw new ApiError(0, 'network', 'network');
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      if (res.status === 401 && data && data.error === 'login_required') this.setToken(null);
      throw new ApiError(res.status, (data && data.error) || 'http_' + res.status, data && data.message, data && data.details);
    }
    return data;
  }

  setToken(tok) {
    this.token = tok;
    store.set(TOKEN_KEY, tok);
  }

  hasToken() {
    return !!this.token;
  }

  logout() {
    this.setToken(null);
  }

  health() { return this.req('GET', '/api/health', null, { timeout: 4000 }); }
  config() { return this.req('GET', '/api/config'); }
  async register(nickname, lang) {
    const r = await this.req('POST', '/api/players', { nickname, lang });
    this.setToken(r.token);
    return r.player;
  }
  me() { return this.req('GET', '/api/me'); }
  updateMe(patch) { return this.req('PATCH', '/api/me', patch); }
  dex() { return this.req('GET', '/api/me/dex'); }
  myObservations() { return this.req('GET', '/api/me/observations'); }
  catchCat(payload) { return this.req('POST', '/api/catch', payload, { timeout: 170000 }); }
  nameCat(id, name) { return this.req('POST', `/api/cats/${encodeURIComponent(id)}/name`, { name }); }
  reportHelp(id, note) { return this.req('POST', `/api/cats/${encodeURIComponent(id)}/help`, { note }); }
  setStatus(id, status, note) { return this.req('POST', `/api/cats/${encodeURIComponent(id)}/status`, { status, note }); }
  dispute(obsId, reason) { return this.req('POST', `/api/observations/${encodeURIComponent(obsId)}/dispute`, { reason }); }
  cats(params = {}) {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
    return this.req('GET', `/api/cats?${q}`);
  }
  cat(id) { return this.req('GET', `/api/cats/${encodeURIComponent(id)}`); }
  map() { return this.req('GET', '/api/map'); }
  stats() { return this.req('GET', '/api/stats'); }
  leaderboard(period, metric) { return this.req('GET', `/api/leaderboard?period=${encodeURIComponent(period)}&metric=${encodeURIComponent(metric)}`); }
  places(type) { return this.req('GET', `/api/places${type ? `?type=${encodeURIComponent(type)}` : ''}`); }
  help() { return this.req('GET', '/api/help'); }
  suggestPlace(data) { return this.req('POST', '/api/places', data); }
  claimVoucher() { return this.req('POST', '/api/vouchers', {}); }
  async voucherToday() { return (await this.req('GET', '/api/vouchers/today')).voucher; }
}

// ------------------------------------------------------------------ Demo-Modus

const DEMO_KEY = 'catme.demo.v1';

async function shrinkDataUrl(dataUrl, max = 240) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * s);
  c.height = Math.round(img.naturalHeight * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72);
}

export async function createLocalApi() {
  const [{ createEngine }, { MemoryStore }, { seedDemo }, { heuristicAnalysis }, { GAME }] = await Promise.all([
    import('../core/engine.js'),
    import('../core/store.js'),
    import('../core/demo.js'),
    import('../core/analysis.js'),
    import('../config/game.js'),
  ]);
  const mem = new MemoryStore();
  let fresh = true;
  const saved = store.get(DEMO_KEY);
  if (saved) {
    try {
      mem.load(JSON.parse(saved));
      fresh = false;
    } catch {
      /* kaputt → neu */
    }
  }
  let timer = null;
  const persist = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(mem.snapshot()));
      } catch {
        // Speicher voll: älteste Fotos entfernen und nochmal
        const obs = mem.observations.all().filter((o) => o.photoUrl).sort((a, b) => a.createdAt - b.createdAt);
        for (const o of obs.slice(0, Math.ceil(obs.length / 3))) mem.observations.put({ ...o, photoUrl: null });
        try {
          localStorage.setItem(DEMO_KEY, JSON.stringify(mem.snapshot()));
        } catch {
          /* aufgeben */
        }
      }
    }, 400);
  };
  mem.onChange = persist;

  const engine = createEngine({
    store: mem,
    // Demo: Am Computer lädt man meist ein vorhandenes Foto hoch – die 10-Minuten-Frische-Regel
    // gilt hier nicht. Galeriefotos zählen weiterhin nicht, alle anderen Regeln bleiben gleich.
    game: { ...GAME, maxPhotoAgeSec: 3650 * 86400 },
    analyzer: { name: 'heuristic', analyze: async (input) => heuristicAnalysis(input) },
    photos: {
      async save(images) {
        const url = images && images.crop && images.crop.small;
        return { photoId: null, photoUrl: url || null };
      },
      async remove() {},
    },
  });
  if (fresh) {
    seedDemo(engine);
    persist();
  }

  const wrap = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      if (e && e.status) throw new ApiError(e.status, e.code, e.message, e.details);
      throw e;
    }
  };
  const me = () => {
    const id = store.get('catme.demo.player');
    const p = id ? mem.players.get(id) : null;
    if (!p) throw new ApiError(401, 'login_required', 'login');
    return p;
  };

  // AR-Bibliotheken: lokal (falls mit `npm run vendor:ar` installiert), sonst CDN
  let ar = { tf: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js', cocoSsd: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js' };
  try {
    const r = await fetch('vendor/ar/coco-ssd.min.js', { method: 'HEAD' });
    if (r.ok && /javascript/.test(r.headers.get('content-type') || '')) ar = { tf: 'vendor/ar/tf.min.js', cocoSsd: 'vendor/ar/coco-ssd.min.js', local: true };
  } catch {
    /* kein lokaler Ordner */
  }

  return {
    isDemo: true,
    engine,
    hasToken: () => !!(store.get('catme.demo.player') && mem.players.get(store.get('catme.demo.player'))),
    logout: () => store.set('catme.demo.player', null),
    health: async () => ({ ok: true, demo: true, ai: 'heuristic' }),
    config: async () => ({ ...engine.config(), ar, tiles: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' }, demo: true, localDemo: true }),
    register: (nickname, lang) => wrap(async () => {
      const p = await engine.createPlayer({ nickname, lang, tokenHash: `local-${Math.random().toString(36).slice(2)}-${Date.now()}` });
      mem.players.update(p.id, { role: 'volunteer' }); // im Demo darf man alles ausprobieren
      store.set('catme.demo.player', p.id);
      return engine.publicPlayer(p);
    }),
    me: () => wrap(async () => {
      const p = me();
      return { player: engine.publicPlayer(p), today: engine.today(p), profile: engine.profile(p) };
    }),
    updateMe: (patch) => wrap(() => engine.updatePlayer(me(), patch)),
    dex: () => wrap(async () => engine.myDex(me())),
    myObservations: () => wrap(async () => engine.observationsOf(me())),
    catchCat: (payload) => wrap(async () => {
      const small = payload.crop ? await shrinkDataUrl(payload.crop) : null;
      return engine.catchCat(me(), { ...payload, images: { crop: { small } } });
    }),
    nameCat: (id, name) => wrap(() => engine.nameCat(me(), id, name)),
    reportHelp: (id, note) => wrap(async () => engine.reportHelp(me(), id, note)),
    setStatus: (id, status, note) => wrap(async () => engine.setCatStatus(me(), id, status, note)),
    dispute: (obsId, reason) => wrap(async () => engine.dispute(me(), obsId, reason)),
    cats: (params = {}) => wrap(async () => engine.listCats(params)),
    cat: (id) => wrap(async () => engine.getCat(id)),
    map: () => wrap(async () => engine.mapData()),
    stats: () => wrap(async () => engine.stats()),
    leaderboard: (period, metric) => wrap(async () => engine.leaderboard({ period, metric })),
    places: (type) => wrap(async () => engine.listPlaces({ type })),
    help: () => wrap(async () => engine.helpList()),
    suggestPlace: (data) => wrap(async () => engine.suggestPlace(me(), data)),
    claimVoucher: () => wrap(async () => engine.claimVoucher(me())),
    voucherToday: () => wrap(async () => engine.voucherToday(me())),
    /** Demo: Gutschein beim ersten passenden Partner-Café einlösen. */
    demoRedeem: (code) => wrap(async () => {
      const partners = engine.partnersOf(engine.ctx.regions[0].id);
      let last = null;
      for (const p of partners) {
        const chk = engine.checkVoucher(p, code);
        if (chk.valid) return engine.redeemVoucher(p, code);
        last = chk;
      }
      throw new ApiError(409, (last && last.reason) || 'invalid', 'invalid', last);
    }),
    resetDemo: () => {
      store.set(DEMO_KEY, null);
      store.set('catme.demo.player', null);
    },
  };
}
