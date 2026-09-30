// LiveFX – media library client: list / upload / delete uploaded images and sounds, thumbnails for
// the soundboard, and a small library widget for the panel. See docs/CONTRACTS.md §11.
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
  function thumbnailFor(trigger) {
    const v = (trigger && trigger.visual) || {};
    if (v.kind === 'image' && typeof v.src === 'string' && v.src) return { img: v.src };
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


  // ---- GIF search (Tenor / Giphy via the server, see server/api-gifs.js and docs/GIFS.md) ----
  const gifs = {
    async status() {
      if (!hasServer()) return { ok: false, providers: { tenor: false, giphy: false }, mock: false };
      return parseResponse(await fetch('api/gifs/status', { cache: 'no-store' }));
    },
    /** Returns {provider, results:[{id, title, preview, url, width, height}]}. */
    async search(q, { provider = 'auto', lang = 'en', limit = 24 } = {}) {
      if (!hasServer()) throw new Error('GIF-Suche braucht den Server (node server.js)');
      const params = new URLSearchParams({ q: String(q || ''), provider: String(provider), lang: String(lang), limit: String(limit) });
      return parseResponse(await fetch(`api/gifs/search?${params}`, { cache: 'no-store' }));
    },
    /** Downloads an allow-listed GIF URL into the asset store; resolves with the new asset. */
    async importUrl(url, name) {
      if (!hasServer()) throw new Error('GIF-Import braucht den Server (node server.js)');
      const payload = { url: String(url || '') };
      if (name) payload.name = String(name);
      const res = await fetch('api/gifs/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await parseResponse(res);
      return body.asset;
    },
    /** Stores API keys on the server ('' removes a key). Resolves with {providers, mock}. */
    async setKeys({ tenorKey, giphyKey } = {}) {
      if (!hasServer()) throw new Error('Keys speichern braucht den Server (node server.js)');
      const payload = {};
      if (tenorKey !== undefined) payload.tenorKey = tenorKey === null ? '' : String(tenorKey);
      if (giphyKey !== undefined) payload.giphyKey = giphyKey === null ? '' : String(giphyKey);
      const res = await fetch('api/gifs/keys', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      return parseResponse(res);
    },
  };

  function defaultLang() {
    const l = String((typeof navigator !== 'undefined' && navigator.language) || 'en').slice(0, 2).toLowerCase();
    return ['de', 'en', 'tr'].includes(l) ? l : 'en';
  }

  /**
   * Renders the GIF search below the library grid. `refresh()` reloads the library after an import,
   * `onCreateTrigger(asset)` (optional) is called by „Als Trigger“ once the GIF is stored.
   */
  function mountGifSearch(root, { refresh, onCreateTrigger }) {
    const sel = (opts, cur) => opts.map(([v, t]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(t)}</option>`).join('');
    root.className = 'gif-search';
    root.innerHTML =
      '<h3 class="gif-title">GIF-Suche</h3>' +
      '<div class="gif-setup" hidden></div>' +
      '<form class="gif-form" hidden>' +
      '<input type="search" class="gif-q" placeholder="z. B. katze, applaus, facepalm" maxlength="200" autocomplete="off" aria-label="GIF suchen">' +
      `<select class="gif-provider" aria-label="Anbieter">${sel([['auto', 'Auto'], ['tenor', 'Tenor'], ['giphy', 'Giphy']], 'auto')}</select>` +
      `<select class="gif-lang" aria-label="Sprache">${sel([['de', 'Deutsch'], ['en', 'English'], ['tr', 'Türkçe']], defaultLang())}</select>` +
      '<button type="submit" class="gif-go small">🔎 Suchen</button>' +
      '</form>' +
      '<div class="gif-status" aria-live="polite"></div>' +
      '<div class="gif-results"></div>' +
      '<div class="gif-attribution" hidden></div>';
    const setup = root.querySelector('.gif-setup');
    const form = root.querySelector('.gif-form');
    const qInput = root.querySelector('.gif-q');
    const provSel = root.querySelector('.gif-provider');
    const langSel = root.querySelector('.gif-lang');
    const goBtn = root.querySelector('.gif-go');
    const status = root.querySelector('.gif-status');
    const results = root.querySelector('.gif-results');
    const attribution = root.querySelector('.gif-attribution');
    let current = [];
    let busy = false;

    function setStatus(text, kind) {
      status.textContent = text || '';
      status.className = `gif-status${kind ? ` ${kind}` : ''}`;
    }

    function renderSetup(st) {
      const providers = (st && st.providers) || {};
      const ready = !!(providers.tenor || providers.giphy);
      form.hidden = !ready;
      setup.hidden = ready;
      if (ready) {
        setup.innerHTML = '';
        if (st.mock) setStatus('Demo-Modus (LIVEFX_GIF_MOCK=1): Ergebnisse sind Platzhalter.', '');
        return;
      }
      setup.innerHTML =
        '<p class="gif-missing">GIF-Suche: API-Key fehlt. Kostenlose Keys gibt es bei Tenor und Giphy – ' +
        '<a href="docs/GIFS.md" target="_blank" rel="noopener">Anleitung (docs/GIFS.md)</a>.</p>' +
        '<form class="gif-keys">' +
        '<input type="password" class="gif-key-tenor" placeholder="Tenor-Key" maxlength="200" autocomplete="off" aria-label="Tenor-Key">' +
        '<input type="password" class="gif-key-giphy" placeholder="Giphy-Key" maxlength="200" autocomplete="off" aria-label="Giphy-Key">' +
        '<button type="submit" class="gif-keys-save small">Speichern</button>' +
        '</form>';
      setup.querySelector('.gif-keys').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const tenorKey = setup.querySelector('.gif-key-tenor').value.trim();
        const giphyKey = setup.querySelector('.gif-key-giphy').value.trim();
        if (!tenorKey && !giphyKey) {
          setStatus('Bitte mindestens einen Key eintragen.', 'error');
          return;
        }
        const payload = {};
        if (tenorKey) payload.tenorKey = tenorKey;
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

    function renderResults(provider) {
      if (!current.length) {
        results.innerHTML = '<div class="gif-empty">Keine GIFs gefunden.</div>';
        attribution.hidden = true;
        return;
      }
      results.innerHTML = current
        .map((r, i) => {
          const title = esc(r.title || r.id || 'GIF');
          return (
            `<div class="gif-item" data-index="${i}" data-id="${esc(r.id)}">` +
            `<img class="gif-preview" src="${esc(r.preview || r.url)}" alt="${title}" title="${title}" loading="lazy">` +
            `<div class="gif-actions">` +
            `<button type="button" class="gif-save small" data-index="${i}" title="In die Mediathek speichern">💾 Speichern</button>` +
            `<button type="button" class="gif-trigger small" data-index="${i}" title="Speichern und als Trigger anlegen">⚡ Als Trigger</button>` +
            `</div></div>`
          );
        })
        .join('');
      attribution.hidden = false;
      attribution.textContent = provider === 'giphy' ? 'Powered by GIPHY' : 'Powered by Tenor';
    }

    async function search() {
      const q = qInput.value.trim();
      if (!q) {
        setStatus('Bitte einen Suchbegriff eingeben.', 'error');
        return;
      }
      if (busy) return;
      busy = true;
      goBtn.disabled = true;
      setStatus(`Suche „${q}“ …`, 'busy');
      try {
        const r = await gifs.search(q, { provider: provSel.value, lang: langSel.value, limit: 24 });
        current = Array.isArray(r.results) ? r.results : [];
        renderResults(r.provider);
        setStatus(current.length ? `${current.length} GIFs für „${q}“.` : `Nichts gefunden für „${q}“.`, 'ok');
      } catch (e) {
        current = [];
        results.innerHTML = '';
        attribution.hidden = true;
        setStatus(`Suche fehlgeschlagen: ${e.message}`, 'error');
        if (e.code === 'no_provider') renderSetup({ providers: {} });
      } finally {
        busy = false;
        goBtn.disabled = false;
      }
    }

    async function importResult(index, asTrigger) {
      const r = current[index];
      if (!r) return;
      const item = results.querySelector(`.gif-item[data-index="${index}"]`);
      if (item) item.classList.add('busy');
      setStatus('Speichere GIF …', 'busy');
      try {
        const asset = await gifs.importUrl(r.url, r.title ? `${r.title}.gif` : '');
        setStatus(`„${asset.name}“ gespeichert.`, 'ok');
        if (refresh) await refresh();
        if (asTrigger && typeof onCreateTrigger === 'function') onCreateTrigger(asset, r);
      } catch (e) {
        setStatus(`Speichern fehlgeschlagen: ${e.message}`, 'error');
      } finally {
        if (item) item.classList.remove('busy');
      }
    }

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      search();
    });
    results.addEventListener('click', (ev) => {
      const save = ev.target.closest('.gif-save');
      if (save) {
        importResult(Number(save.dataset.index), false);
        return;
      }
      const trig = ev.target.closest('.gif-trigger');
      if (trig) importResult(Number(trig.dataset.index), true);
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

  /**
   * Renders the media library into `el`. Calls `onChange(assets)` after every successful change
   * (and after the initial load). `onCreateTrigger(asset, result)` (optional) is called by the GIF
   * search's „Als Trigger“ button after the GIF has been imported. Returns {refresh, assets, gifs, destroy}.
   */
  function mountLibrary(el, { onChange, onCreateTrigger } = {}) {
    if (!el) throw new Error('mountLibrary: element missing');
    el.classList.add('asset-library');
    el.innerHTML =
      '<div class="asset-toolbar">' +
      '<input type="file" accept="image/*,audio/*" multiple hidden class="asset-input">' +
      '<button type="button" class="asset-upload small">📤 Datei hochladen</button>' +
      '<span class="asset-hint">PNG, JPG, GIF, WEBP, MP3, WAV, OGG · max. 8 MB</span>' +
      '</div>' +
      '<div class="asset-status" aria-live="polite"></div>' +
      '<div class="asset-grid"></div>' +
      '<div class="gif-search"></div>';
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
    const gifUi = mountGifSearch(el.querySelector('.gif-search'), { refresh, onCreateTrigger });
    return {
      refresh,
      gifs: gifUi,
      get assets() {
        return assets;
      },
      destroy() {
        destroyed = true;
        el.innerHTML = '';
      },
    };
  }

  global.LiveFXAssets = { list, upload, remove, thumbnailFor, groupAssets, mountLibrary, formatSize, hasServer, gifs };
})(typeof window !== 'undefined' ? window : globalThis);
