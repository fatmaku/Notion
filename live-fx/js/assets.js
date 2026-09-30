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

  /**
   * Renders the media library into `el`. Calls `onChange(assets)` after every successful change
   * (and after the initial load). Returns {refresh, destroy}.
   */
  function mountLibrary(el, { onChange } = {}) {
    if (!el) throw new Error('mountLibrary: element missing');
    el.classList.add('asset-library');
    el.innerHTML =
      '<div class="asset-toolbar">' +
      '<input type="file" accept="image/*,audio/*" multiple hidden class="asset-input">' +
      '<button type="button" class="asset-upload small">📤 Datei hochladen</button>' +
      '<span class="asset-hint">PNG, JPG, GIF, WEBP, MP3, WAV, OGG · max. 8 MB</span>' +
      '</div>' +
      '<div class="asset-status" aria-live="polite"></div>' +
      '<div class="asset-grid"></div>';
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
    return {
      refresh,
      get assets() {
        return assets;
      },
      destroy() {
        destroyed = true;
        el.innerHTML = '';
      },
    };
  }

  global.LiveFXAssets = { list, upload, remove, thumbnailFor, groupAssets, mountLibrary, formatSize, hasServer };
})(typeof window !== 'undefined' ? window : globalThis);
