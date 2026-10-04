// LiveFX – media library client: list / upload / delete uploaded images and sounds, thumbnails for
// the soundboard, and a small library widget for the panel. See docs/CONTRACTS.md §11.
// 2.1: library tabs „Dateien & GIFs“ (uploads + GIF search) and „Sticker (kostenlos)“ (memes/index.json).
(function (global) {
  'use strict';

  const S = () => global.LiveFXSchema || null;
  const esc = (s) => {
    const sc = S();
    if (sc && sc.escapeHtml) return sc.escapeHtml(s);
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  };

  function hasServer() {
    return typeof location !== 'undefined' && /^https?:$/.test(location.protocol);
  }

  function formatSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function parseResponse(res) {
    let body = null;
    try {
      body = await res.json();
    } catch (_) {
      body = null;
    }
    if (!res.ok || !body || body.ok === false) {
      const msg = (body && body.message) || (body && body.error) || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.code = body && body.error;
      throw err;
    }
    return body;
  }

  async function list() {
    if (!hasServer()) return [];
    const res = await fetch('api/assets', { cache: 'no-store' });
    const body = await parseResponse(res);
    return Array.isArray(body.assets) ? body.assets : [];
  }

  async function upload(file) {
    if (!hasServer()) throw new Error('Uploads brauchen den Server (node server.js)');
    if (!file) throw new Error('Keine Datei');
    const res = await fetch('api/assets', {
      method: 'POST',
      body: file,
      headers: {
        'x-filename': encodeURIComponent(file.name || 'upload'),
        'content-type': file.type || 'application/octet-stream',
      },
    });
    const body = await parseResponse(res);
    return body.asset;
  }

  async function remove(name) {
    if (!hasServer()) throw new Error('Löschen braucht den Server (node server.js)');
    const res = await fetch(`api/assets/${encodeURIComponent(String(name))}`, { method: 'DELETE' });
    await parseResponse(res);
    return true;
  }

  /** Soundboard thumbnail: image triggers show their picture, everything else its emoji. */
  // Pad thumbnails for scene triggers (story mode). LiveFXPacks.SCENE_INFO is preferred when loaded.
  const SCENE_EMOJI = { rain: '🌧️', night: '🌙', forest: '🌲', sea: '🌊', fire: '🔥', castle: '🏰', snow: '❄️', desert: '🏜️', city: '🌆', space: '🪐', sunrise: '🌅', storm: '⛈️', clear: '🎬' };

  /** First emoji (grapheme) of a string like "🐉🔥" – falls back to the whole string. */
  function firstEmoji(str) {
    const s = String(str || '');
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        const it = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)[Symbol.iterator]().next();
        if (!it.done && it.value && it.value.segment) return it.value.segment;
      }
    } catch (_) {
      /* no segmenter */
    }
    const m = s.match(/^\p{Extended_Pictographic}[\uFE0F\u200D\p{Emoji_Modifier}]*/u);
    return m ? m[0] : s;
  }

  function thumbnailFor(trigger) {
    const v = (trigger && trigger.visual) || {};
    if (v.kind === 'image' && typeof v.src === 'string' && v.src) return { img: v.src };
    if (v.kind === 'scene') {
      const P = global.LiveFXPacks;
      const info = P && P.SCENE_INFO && typeof v.scene === 'string' && Object.prototype.hasOwnProperty.call(P.SCENE_INFO, v.scene) ? P.SCENE_INFO[v.scene] : null;
      return { emoji: (info && info.emoji) || SCENE_EMOJI[v.scene] || '🎬' };
    }
    if (v.kind === 'sticker' && v.emoji) return { emoji: firstEmoji(v.emoji) };
    return { emoji: v.emoji || '✨' };
  }

  /** Splits the asset list into what the editor wants: {images:[...], sounds:[...]}. */
  function groupAssets(assets) {
    const images = [];
    const sounds = [];
    for (const a of assets || []) {
      if (a.type === 'image') images.push(a);
      else if (a.type === 'sound') sounds.push(a);
    }
    return { images, sounds };
  }

  let previewAudio = null;
  function preview(url) {
    if (previewAudio) {
      try {
        previewAudio.pause();
      } catch (_) {
        /* ignore */
      }
      previewAudio.remove();
      previewAudio = null;
    }
    const a = document.createElement('audio');
    a.setAttribute('src', url);
    a.style.display = 'none';
    document.body.appendChild(a);
    previewAudio = a;
    const done = () => {
      if (previewAudio === a) previewAudio = null;
      a.remove();
    };
    a.addEventListener('ended', done);
    a.addEventListener('error', done);
    setTimeout(done, 30000);
    const p = a.play();
    if (p && p.catch) p.catch(done);
  }


  // ---- GIF search (KLIPY / GIPHY via the server, see server/api-gifs.js and docs/GIFS.md) ----
  // Results are hotlinks on the provider's media host: „Als Trigger“ uses that URL directly, nothing is
  // downloaded (provider terms). Queries and results pass LiveFXSafety (js/safety.js) when it is loaded;
  // the server applies the same filter in any case.
  const HIDDEN_KEY = 'livefx.gifs.hidden';
  const HIDDEN_MAX = 500;
  const ATTRIBUTION = { klipy: 'Powered by KLIPY', giphy: 'Powered By GIPHY' };

  function readHidden() {
    try {
      const raw = global.localStorage && global.localStorage.getItem(HIDDEN_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').slice(-HIDDEN_MAX) : [];
    } catch (_) {
      return [];
    }
  }

  function writeHidden(list) {
    try {
      if (global.localStorage) global.localStorage.setItem(HIDDEN_KEY, JSON.stringify(list.slice(-HIDDEN_MAX)));
    } catch (_) {
      /* private mode / quota: hiding then lasts only for this page */
    }
  }

  const hiddenKey = (r) => `${r.provider || 'gif'}:${r.id}`;

  const gifs = {
    async status() {
      if (!hasServer()) return { ok: false, providers: { klipy: false, giphy: false }, mock: false };
      return parseResponse(await fetch('api/gifs/status', { cache: 'no-store' }));
    },
    /** Resolves {provider, attribution, results:[{id,title,preview,url,width,height,provider}]} or {blocked:true, reason, message}. */
    async search(q, { provider = 'auto', lang = 'en', limit = 24 } = {}) {
      if (!hasServer()) throw new Error('GIF-Suche braucht den Server (node server.js)');
      const params = new URLSearchParams({ q: String(q || ''), provider: String(provider), lang: String(lang), limit: String(limit) });
      return parseResponse(await fetch(`api/gifs/search?${params}`, { cache: 'no-store' }));
    },
    /** Server-side import. Refused (403 provider_terms) for KLIPY/GIPHY media – kept for API compatibility. */
    async importUrl(url, name) {
      if (!hasServer()) throw new Error('GIF-Import braucht den Server (node server.js)');
      const payload = { url: String(url || '') };
      if (name) payload.name = String(name);
      const res = await fetch('api/gifs/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await parseResponse(res);
      return body.asset;
    },
    /** Stores API keys on the server ('' removes a key). Resolves with the status. */
    async setKeys({ klipyKey, giphyKey } = {}) {
      if (!hasServer()) throw new Error('Keys speichern braucht den Server (node server.js)');
      const payload = {};
      if (klipyKey !== undefined) payload.klipyKey = klipyKey === null ? '' : String(klipyKey);
      if (giphyKey !== undefined) payload.giphyKey = giphyKey === null ? '' : String(giphyKey);
      const res = await fetch('api/gifs/keys', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      return parseResponse(res);
    },
    hidden: {
      list: readHidden,
      clear() {
        writeHidden([]);
      },
    },
  };

  /** Search language: the panel's speech language (de-DE/tr-TR/en-US) when fixed, else the browser language. */
  function defaultLang() {
    const pick = (v) => {
      const l = String(v || '').slice(0, 2).toLowerCase();
      return ['de', 'en', 'tr'].includes(l) ? l : '';
    };
    let fromPanel = '';
    try {
      const el = typeof document !== 'undefined' && document.getElementById('lang');
      fromPanel = el ? pick(el.value) : '';
    } catch (_) {
      fromPanel = '';
    }
    return fromPanel || pick(typeof navigator !== 'undefined' && navigator.language) || 'en';
  }

  const TXT = {
    de: { none: 'Keine GIFs gefunden.', hidden: (n) => `${n} ausgeblendet`, reset: 'Ausgeblendete wieder zeigen' },
    tr: { none: 'GIF bulunamadı.', hidden: (n) => `${n} gizlendi`, reset: 'Gizlenenleri göster' },
    en: { none: 'No GIFs found.', hidden: (n) => `${n} hidden`, reset: 'Show hidden again' },
  };

  function blockedText(reason, lang, serverMsg) {
    const Sf = global.LiveFXSafety;
    if (Sf && Sf.message) return Sf.message(reason, lang);
    return serverMsg || 'Dieser Suchbegriff ist gesperrt.';
  }

  /**
   * Renders the GIF search below the library grid. `onCreateTrigger(asset, result)` (optional) is called by
   * „Als Trigger“ with asset = {name, url, type:'image', hotlink:true, provider, width, height}; `url` is the
   * provider hotlink (small rendition), so the panel can use it as visual.src exactly like an uploaded asset.
   */
  function mountGifSearch(root, { onCreateTrigger } = {}) {
    const sel = (opts, cur) => opts.map(([v, t]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(t)}</option>`).join('');
    root.className = 'gif-search';
    root.innerHTML =
      '<h3 class="gif-title">GIF-Suche</h3>' +
      '<div class="gif-notice" hidden></div>' +
      '<div class="gif-setup" hidden></div>' +
      '<form class="gif-form" hidden>' +
      '<input type="search" class="gif-q" placeholder="z. B. katze, applaus, facepalm" maxlength="200" autocomplete="off" aria-label="GIF suchen">' +
      `<select class="gif-provider" aria-label="Anbieter">${sel([['klipy', 'KLIPY'], ['giphy', 'GIPHY']], 'klipy')}</select>` +
      `<select class="gif-lang" aria-label="Sprache">${sel([['de', 'Deutsch'], ['en', 'English'], ['tr', 'Türkçe']], defaultLang())}</select>` +
      '<button type="submit" class="gif-go small">🔎 Suchen</button>' +
      '</form>' +
      '<div class="gif-status" aria-live="polite"></div>' +
      '<div class="gif-results"></div>' +
      '<div class="gif-hidden-info" hidden style="margin-top:8px;font-size:12px;color:var(--fx-muted, var(--muted, #8d93a3))"><span class="gif-hidden-count"></span> · <button type="button" class="gif-unhide link small">Ausgeblendete wieder zeigen</button></div>' +
      '<div class="gif-attribution" hidden style="font-size:12px;font-weight:700;letter-spacing:.02em"></div>';
    const notice = root.querySelector('.gif-notice');
    const setup = root.querySelector('.gif-setup');
    const form = root.querySelector('.gif-form');
    const qInput = root.querySelector('.gif-q');
    const provSel = root.querySelector('.gif-provider');
    const langSel = root.querySelector('.gif-lang');
    const goBtn = root.querySelector('.gif-go');
    const status = root.querySelector('.gif-status');
    const results = root.querySelector('.gif-results');
    const hiddenInfo = root.querySelector('.gif-hidden-info');
    const attribution = root.querySelector('.gif-attribution');
    let current = [];
    let shownProvider = 'klipy';
    let busy = false;

    const t = () => TXT[langSel.value] || TXT.de;

    function setStatus(text, kind) {
      status.textContent = text || '';
      status.className = `gif-status${kind ? ` ${kind}` : ''}`;
    }

    /** Attribution is always visible while the search is usable (provider requirement). */
    function showAttribution(provider) {
      shownProvider = provider === 'giphy' ? 'giphy' : 'klipy';
      attribution.textContent = ATTRIBUTION[shownProvider];
      attribution.dataset.provider = shownProvider;
      attribution.hidden = form.hidden;
    }

    function renderSetup(st) {
      const providers = (st && st.providers) || {};
      const ready = !!(providers.klipy || providers.giphy);
      if (st && st.tenorRemoved && st.notice) {
        notice.hidden = false;
        notice.className = 'gif-notice gif-missing';
        notice.textContent = st.notice;
      } else {
        notice.hidden = true;
      }
      form.hidden = !ready;
      setup.hidden = ready;
      if (ready) {
        setup.innerHTML = '';
        for (const opt of provSel.options) opt.disabled = !st.mock && !providers[opt.value];
        const def = st.default && providers[st.default] ? st.default : providers.klipy ? 'klipy' : 'giphy';
        provSel.value = def;
        showAttribution(def);
        if (st.mock) setStatus('Demo-Modus (LIVEFX_GIF_MOCK=1): Ergebnisse sind Platzhalter.', '');
        return;
      }
      attribution.hidden = true;
      setup.innerHTML =
        '<p class="gif-missing">GIF-Suche: API-Key fehlt. Kostenlose Keys gibt es bei KLIPY (empfohlen) und GIPHY – ' +
        '<a href="docs/GIFS.md" target="_blank" rel="noopener">Anleitung (docs/GIFS.md)</a>.</p>' +
        '<form class="gif-keys">' +
        '<input type="password" class="gif-key-klipy" placeholder="KLIPY-Key" maxlength="200" autocomplete="off" aria-label="KLIPY-Key">' +
        '<input type="password" class="gif-key-giphy" placeholder="GIPHY-Key" maxlength="200" autocomplete="off" aria-label="GIPHY-Key">' +
        '<button type="submit" class="gif-keys-save small">Speichern</button>' +
        '</form>';
      setup.querySelector('.gif-keys').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const klipyKey = setup.querySelector('.gif-key-klipy').value.trim();
        const giphyKey = setup.querySelector('.gif-key-giphy').value.trim();
        if (!klipyKey && !giphyKey) {
          setStatus('Bitte mindestens einen Key eintragen.', 'error');
          return;
        }
        const payload = {};
        if (klipyKey) payload.klipyKey = klipyKey;
        if (giphyKey) payload.giphyKey = giphyKey;
        try {
          const r = await gifs.setKeys(payload);
          setStatus('Keys gespeichert.', 'ok');
          renderSetup(r);
        } catch (e) {
          setStatus(`Keys konnten nicht gespeichert werden: ${e.message}`, 'error');
        }
      });
    }

    function visibleResults() {
      const hidden = new Set(readHidden());
      return current.filter((r) => !hidden.has(hiddenKey(r)));
    }

    function renderResults() {
      const list = visibleResults();
      const hiddenCount = current.length - list.length;
      hiddenInfo.hidden = hiddenCount === 0;
      root.querySelector('.gif-hidden-count').textContent = t().hidden(hiddenCount);
      root.querySelector('.gif-unhide').textContent = t().reset;
      if (!list.length) {
        results.innerHTML = `<div class="gif-empty">${esc(t().none)}</div>`;
        return;
      }
      results.innerHTML = list
        .map((r) => {
          const i = current.indexOf(r);
          const title = esc(r.title || r.id || 'GIF');
          return (
            `<div class="gif-item" data-index="${i}" data-id="${esc(r.id)}" data-provider="${esc(r.provider || '')}">` +
            `<img class="gif-preview" src="${esc(r.preview || r.url)}" alt="${title}" title="${title}" loading="lazy" referrerpolicy="no-referrer">` +
            `<div class="gif-actions">` +
            `<button type="button" class="gif-trigger small" data-index="${i}" title="Als Bild-Trigger anlegen (direkt verlinkt, nichts wird gespeichert)">⚡ Als Trigger</button>` +
            `<button type="button" class="gif-hide small" data-index="${i}" title="Dieses GIF ausblenden (wird gemerkt)">🙈 ausblenden</button>` +
            `</div></div>`
          );
        })
        .join('');
    }

    async function search() {
      const q = qInput.value.trim();
      if (!q) {
        setStatus('Bitte einen Suchbegriff eingeben.', 'error');
        return;
      }
      if (busy) return;
      const lang = langSel.value;
      const provider = provSel.value;
      showAttribution(provider);
      const Sf = global.LiveFXSafety;
      const local = Sf && Sf.check ? Sf.check(q) : { ok: true };
      if (!local.ok) {
        current = [];
        results.innerHTML = '';
        hiddenInfo.hidden = true;
        setStatus(blockedText(local.reason, lang), 'error blocked');
        return;
      }
      busy = true;
      goBtn.disabled = true;
      setStatus(`Suche „${q}“ …`, 'busy');
      try {
        const r = await gifs.search(q, { provider, lang, limit: 24 });
        if (r.provider) showAttribution(r.provider);
        if (r.blocked) {
          current = [];
          results.innerHTML = '';
          hiddenInfo.hidden = true;
          setStatus(blockedText(r.reason, lang, r.message), 'error blocked');
          return;
        }
        let list = Array.isArray(r.results) ? r.results : [];
        if (Sf && Sf.filterResults) list = Sf.filterResults(list);
        current = list;
        renderResults();
        const n = visibleResults().length;
        setStatus(n ? `${n} GIFs für „${q}“.` : `Nichts gefunden für „${q}“.`, 'ok');
      } catch (e) {
        current = [];
        results.innerHTML = '';
        hiddenInfo.hidden = true;
        setStatus(`Suche fehlgeschlagen: ${e.message}`, 'error');
        if (e.code === 'no_provider') renderSetup({ providers: {} });
      } finally {
        busy = false;
        goBtn.disabled = false;
      }
    }

    function createTrigger(index) {
      const r = current[index];
      if (!r) return;
      const asset = {
        name: String(r.title || r.id || 'GIF').slice(0, 100),
        url: r.url,
        type: 'image',
        hotlink: true,
        provider: r.provider || shownProvider,
        width: r.width || 0,
        height: r.height || 0,
      };
      if (typeof onCreateTrigger === 'function') {
        onCreateTrigger(asset, r);
        setStatus('Trigger-Editor geöffnet – das GIF wird direkt vom Anbieter geladen.', 'ok');
      } else {
        setStatus('„Als Trigger“ ist hier nicht verfügbar.', 'error');
      }
    }

    function hide(index) {
      const r = current[index];
      if (!r) return;
      const list = readHidden();
      const key = hiddenKey(r);
      if (!list.includes(key)) list.push(key);
      writeHidden(list);
      renderResults();
    }

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      search();
    });
    provSel.addEventListener('change', () => showAttribution(provSel.value));
    results.addEventListener('click', (ev) => {
      const trig = ev.target.closest('.gif-trigger');
      if (trig) {
        createTrigger(Number(trig.dataset.index));
        return;
      }
      const h = ev.target.closest('.gif-hide');
      if (h) hide(Number(h.dataset.index));
    });
    root.querySelector('.gif-unhide').addEventListener('click', () => {
      const shownKeys = new Set(current.map(hiddenKey));
      writeHidden(readHidden().filter((k) => !shownKeys.has(k)));
      renderResults();
    });

    if (!hasServer()) {
      setup.hidden = false;
      setup.innerHTML = '<p class="gif-missing">GIF-Suche braucht den Server (node server.js)</p>';
      return { search, destroy() {} };
    }
    gifs
      .status()
      .then(renderSetup)
      .catch((e) => setStatus(`GIF-Suche nicht verfügbar: ${e.message}`, 'error'));
    return { search, destroy() {} };
  }


  // ---- Free sticker library (2.1): bundled Fluent Emoji from memes/index.json (docs/STICKER.md) ----
  // Same-origin files, MIT licensed: „Als Trigger“ hands {name, url:'memes/fluent/x.webp', type:'image', emoji}
  // to onCreateTrigger exactly like a GIF result, so the panel creates an image trigger with emoji fallback.
  const STICKER_INDEX = 'memes/index.json';
  const STICKER_CREDIT = 'Fluent Emoji © Microsoft, MIT – siehe THIRD-PARTY-NOTICES.md';
  const STICKER_CATS = {
    laugh: '😂 Lachen', shock: '😱 Schock', love: '❤️ Liebe', fire: '🔥 Feuer', party: '🎉 Party', applause: '👏 Applaus',
    thumbs: '👍 Gesten', sad: '😢 Traurig', pleading: '🥺 Bitte', facepalm: '🤦 Facepalm', thinking: '🤔 Denken', cool: '😎 Cool',
    money: '💰 Geld', ghost: '👻 Geist', food: '🍕 Essen', sleeping: '😴 Müde', angry: '😠 Wütend', symbol: '💯 Symbole',
    rocket: '🚀 Rakete', crown: '👑 Krone', trophy: '🏆 Pokal', star: '⭐ Stern', sparkles: '✨ Glitzer', eyes: '👀 Augen',
    popcorn: '🍿 Popcorn', animals: '🐶 Tiere', weather: '🌈 Wetter', 100: '💯 100',
  };
  let stickerCache = null;

  /** Lower-case + diacritics folded (ä→a, ğ→g, ı→i …) so „gul“ finds „gülmek“ and „lach“ finds „Lachtränen“. */
  function fold(str) {
    return String(str || '')
      .toLocaleLowerCase('tr')
      .replace(/ı/g, 'i')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ß/g, 'ss');
  }

  /** Keeps only well-formed index items whose file is a bundled sticker path the schema accepts. */
  function cleanStickers(index) {
    const items = index && Array.isArray(index.items) ? index.items : [];
    const sc = S();
    const re = (sc && sc.MEMES_IMAGE_RE) || /^memes\/[a-z0-9_-]{1,40}\/[a-z0-9_-]{1,80}\.(webp|png)$/;
    return items
      .filter((it) => it && typeof it.id === 'string' && typeof it.file === 'string' && re.test(it.file) && !it.file.includes('..'))
      .map((it) => {
        const kw = it.keywords && typeof it.keywords === 'object' ? it.keywords : {};
        const keywords = {};
        for (const l of ['de', 'tr', 'en']) keywords[l] = Array.isArray(kw[l]) ? kw[l].filter((k) => typeof k === 'string').slice(0, 12) : [];
        const item = {
          id: it.id,
          file: it.file,
          animated: it.animated === true,
          category: typeof it.category === 'string' ? it.category : '',
          emoji: typeof it.emoji === 'string' ? it.emoji : '',
          name: typeof it.name === 'string' ? it.name : it.id,
          keywords,
        };
        item.hay = fold([item.id, item.name, item.emoji, ...keywords.de, ...keywords.tr, ...keywords.en].join(' '));
        return item;
      });
  }

  /** Filters stickers by free text (every word must occur in keywords de/tr/en, name or id) and category. */
  function searchStickers(items, q, category) {
    const words = fold(q).split(/\s+/).filter(Boolean);
    return (items || []).filter((it) => (!category || it.category === category) && words.every((w) => it.hay.includes(w)));
  }

  const stickers = {
    CREDIT: STICKER_CREDIT,
    CATEGORIES: STICKER_CATS,
    fold,
    clean: cleanStickers,
    search: searchStickers,
    /** Loads + caches memes/index.json. Resolves with the cleaned item list. */
    async load() {
      if (stickerCache) return stickerCache;
      const res = await fetch(STICKER_INDEX, { cache: 'default' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      stickerCache = cleanStickers(await res.json());
      return stickerCache;
    },
    /** The asset handed to onCreateTrigger for a sticker (keywords of `lang` prefill the editor). */
    toAsset(it, lang = 'de') {
      const kws = (it.keywords[lang] && it.keywords[lang].length ? it.keywords[lang] : it.keywords.en) || [];
      const first = String(kws[0] || it.name);
      const name = `${it.emoji ? `${it.emoji} ` : ''}${first.charAt(0).toUpperCase()}${first.slice(1)}`.slice(0, 100);
      return { name, url: it.file, type: 'image', emoji: it.emoji || '🖼️', sticker: true, keywords: kws.slice(0, 3), animated: it.animated };
    },
  };

  /** Renders the sticker browser: search, category chips, 64 px lazy grid, „Als Trigger“, credit line. */
  function mountStickerLibrary(root, { onCreateTrigger } = {}) {
    root.classList.add('sticker-lib');
    root.innerHTML =
      '<div class="sticker-form">' +
      '<input type="search" class="sticker-q" placeholder="Suchen: lachen, gül, wow, herz …" maxlength="60" autocomplete="off" aria-label="Sticker suchen">' +
      '</div>' +
      '<div class="sticker-chips" role="group" aria-label="Kategorien"></div>' +
      '<div class="sticker-status" aria-live="polite"></div>' +
      '<div class="sticker-grid"></div>' +
      `<p class="sticker-credit">${esc(STICKER_CREDIT)}</p>`;
    const qInput = root.querySelector('.sticker-q');
    const chips = root.querySelector('.sticker-chips');
    const status = root.querySelector('.sticker-status');
    const grid = root.querySelector('.sticker-grid');
    let items = [];
    let cat = '';
    let shown = [];

    function setStatus(text, kind) {
      status.textContent = text || '';
      status.className = `sticker-status${kind ? ` ${kind}` : ''}`;
    }

    function renderChips() {
      const cats = [];
      for (const it of items) if (it.category && !cats.includes(it.category)) cats.push(it.category);
      const chip = (id, label) => `<button type="button" class="sticker-chip small${id === cat ? ' active' : ''}" data-cat="${esc(id)}" aria-pressed="${id === cat}">${esc(label)}</button>`;
      chips.innerHTML = chip('', 'Alle') + cats.map((c) => chip(c, STICKER_CATS[c] || c)).join('');
    }

    function render() {
      shown = searchStickers(items, qInput.value, cat);
      if (!shown.length) {
        grid.innerHTML = '<div class="sticker-empty">Kein Sticker gefunden.</div>';
        setStatus(items.length ? `0 von ${items.length} Stickern` : '');
        return;
      }
      grid.innerHTML = shown
        .map((it, i) => {
          const label = it.keywords.de[0] || it.name;
          const title = esc([`${it.emoji} ${label}`, it.keywords.tr[0], it.keywords.en[0]].filter(Boolean).join(' · '));
          return (
            `<div class="sticker-item" data-id="${esc(it.id)}" data-category="${esc(it.category)}">` +
            `<img class="sticker-thumb" src="${esc(it.file)}" alt="${esc(it.name)}" title="${title}" width="64" height="64" loading="lazy" decoding="async">` +
            (it.animated ? '<span class="sticker-badge" title="animiert">▶ animiert</span>' : '') +
            `<span class="sticker-name" title="${title}">${esc(label)}</span>` +
            `<button type="button" class="sticker-trigger small" data-index="${i}" title="Als Bild-Trigger anlegen">⚡ Als Trigger</button>` +
            '</div>'
          );
        })
        .join('');
      setStatus(`${shown.length} von ${items.length} Stickern`);
    }

    async function load() {
      setStatus('Lade Sticker …', 'busy');
      try {
        items = await stickers.load();
        renderChips();
        render();
      } catch (e) {
        setStatus(`Sticker konnten nicht geladen werden: ${e.message}`, 'error');
      }
    }

    qInput.addEventListener('input', render);
    chips.addEventListener('click', (ev) => {
      const b = ev.target.closest('.sticker-chip');
      if (!b) return;
      cat = b.dataset.cat || '';
      renderChips();
      render();
    });
    grid.addEventListener('click', (ev) => {
      const b = ev.target.closest('.sticker-trigger');
      if (!b) return;
      const it = shown[Number(b.dataset.index)];
      if (!it) return;
      if (typeof onCreateTrigger !== 'function') {
        setStatus('„Als Trigger“ ist hier nicht verfügbar.', 'error');
        return;
      }
      const asset = stickers.toAsset(it, defaultLang());
      onCreateTrigger(asset, { title: asset.name, sticker: it });
      setStatus('Trigger-Editor geöffnet.', 'ok');
    });
    let loaded = null;
    return {
      /** Loads the index on first call (the tab is lazy). */
      open() {
        if (!loaded) loaded = load();
        return loaded;
      },
      search(q) {
        qInput.value = String(q || '');
        render();
      },
      get items() {
        return items;
      },
    };
  }

  /**
   * Renders the media library into `el`. Calls `onChange(assets)` after every successful change
   * (and after the initial load). `onCreateTrigger(asset, result)` (optional) is called by the GIF
   * search's „Als Trigger“ button with a hotlink asset ({name, url, type:'image', hotlink:true, …}). Returns {refresh, assets, gifs, destroy}.
   */
  function mountLibrary(el, { onChange, onCreateTrigger } = {}) {
    if (!el) throw new Error('mountLibrary: element missing');
    el.classList.add('asset-library');
    el.innerHTML =
      '<div class="lib-tabs" role="tablist">' +
      '<button type="button" class="lib-tab active small" role="tab" aria-selected="true" data-tab="files">📁 Dateien &amp; GIFs</button>' +
      '<button type="button" class="lib-tab small" role="tab" aria-selected="false" data-tab="stickers">😀 Sticker (kostenlos)</button>' +
      '</div>' +
      '<div class="lib-pane" data-pane="files">' +
      '<div class="asset-toolbar">' +
      '<input type="file" accept="image/*,audio/*" multiple hidden class="asset-input">' +
      '<button type="button" class="asset-upload small">📤 Datei hochladen</button>' +
      '<span class="asset-hint">PNG, JPG, GIF, WEBP, MP3, WAV, OGG · max. 8 MB</span>' +
      '</div>' +
      '<div class="asset-status" aria-live="polite"></div>' +
      '<div class="asset-grid"></div>' +
      '<div class="gif-search"></div>' +
      '</div>' +
      '<div class="lib-pane" data-pane="stickers" hidden><div class="sticker-lib"></div></div>';
    const input = el.querySelector('.asset-input');
    const button = el.querySelector('.asset-upload');
    const status = el.querySelector('.asset-status');
    const grid = el.querySelector('.asset-grid');
    let assets = [];
    let destroyed = false;

    function setStatus(text, kind) {
      status.textContent = text || '';
      status.className = `asset-status${kind ? ` ${kind}` : ''}`;
    }

    function render() {
      if (!hasServer()) {
        grid.innerHTML = '<div class="asset-empty">Uploads brauchen den Server (node server.js)</div>';
        button.disabled = true;
        return;
      }
      if (!assets.length) {
        grid.innerHTML = '<div class="asset-empty">Noch keine Dateien hochgeladen.</div>';
        return;
      }
      grid.innerHTML = assets
        .map((a) => {
          const name = esc(a.name);
          const url = esc(a.url);
          const thumb =
            a.type === 'image'
              ? `<img class="asset-thumb" src="${url}" alt="" loading="lazy">`
              : `<div class="asset-thumb asset-thumb-sound"><span>🔊</span><button type="button" class="asset-play small" data-url="${url}" title="Anhören">▶</button></div>`;
          return (
            `<div class="asset-item" data-name="${name}" data-type="${esc(a.type)}">${thumb}` +
            `<div class="asset-meta"><span class="asset-name" title="${name}">${name}</span><span class="asset-size">${esc(formatSize(a.size))}</span></div>` +
            `<button type="button" class="asset-del small" data-name="${name}" title="Löschen">✕</button></div>`
          );
        })
        .join('');
    }

    async function refresh() {
      try {
        assets = await list();
        if (destroyed) return assets;
        render();
        if (onChange) onChange(assets);
      } catch (e) {
        setStatus(`Liste konnte nicht geladen werden: ${e.message}`, 'error');
      }
      return assets;
    }

    async function uploadFiles(files) {
      const queue = Array.from(files || []);
      if (!queue.length) return;
      button.disabled = true;
      let i = 0;
      const failed = [];
      for (const f of queue) {
        i++;
        setStatus(`Lade hoch (${i}/${queue.length}): ${f.name} …`, 'busy');
        try {
          await upload(f);
        } catch (e) {
          failed.push(`${f.name}: ${e.message}`);
        }
      }
      button.disabled = false;
      if (failed.length) setStatus(`Fehler: ${failed.join(' · ')}`, 'error');
      else setStatus(`${queue.length} Datei${queue.length === 1 ? '' : 'en'} hochgeladen.`, 'ok');
      await refresh();
    }

    button.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      await uploadFiles(input.files);
      input.value = '';
    });
    el.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      el.classList.add('drag');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag'));
    el.addEventListener('drop', (ev) => {
      ev.preventDefault();
      el.classList.remove('drag');
      if (ev.dataTransfer && ev.dataTransfer.files) uploadFiles(ev.dataTransfer.files);
    });
    grid.addEventListener('click', async (ev) => {
      const play = ev.target.closest('.asset-play');
      if (play) {
        preview(play.dataset.url);
        return;
      }
      const del = ev.target.closest('.asset-del');
      if (del) {
        const name = del.dataset.name;
        if (!global.confirm(`„${name}“ wirklich löschen? Trigger, die die Datei benutzen, zeigen dann nichts mehr.`)) return;
        try {
          await remove(name);
          setStatus(`„${name}“ gelöscht.`, 'ok');
        } catch (e) {
          setStatus(`Löschen fehlgeschlagen: ${e.message}`, 'error');
        }
        await refresh();
      }
    });

    render();
    refresh();
    const gifUi = mountGifSearch(el.querySelector('.gif-search'), { onCreateTrigger });
    const stickerUi = mountStickerLibrary(el.querySelector('.sticker-lib'), { onCreateTrigger });
    function showTab(name) {
      const tab = name === 'stickers' ? 'stickers' : 'files';
      for (const b of el.querySelectorAll('.lib-tab')) {
        const on = b.dataset.tab === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
      }
      for (const pane of el.querySelectorAll('.lib-pane')) pane.hidden = pane.dataset.pane !== tab;
      if (tab === 'stickers') stickerUi.open();
      return tab;
    }
    el.querySelector('.lib-tabs').addEventListener('click', (ev) => {
      const b = ev.target.closest('.lib-tab');
      if (b) showTab(b.dataset.tab);
    });
    return {
      refresh,
      gifs: gifUi,
      stickers: stickerUi,
      showTab,
      get assets() {
        return assets;
      },
      destroy() {
        destroyed = true;
        el.innerHTML = '';
      },
    };
  }

  global.LiveFXAssets = { list, upload, remove, thumbnailFor, groupAssets, mountLibrary, formatSize, hasServer, gifs, stickers };
})(typeof window !== 'undefined' ? window : globalThis);
