// GIF search in the media library (mock provider): search, import via button, import via API, keys form.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

async function run({ browser, startServer, api, shotDir, log }) {
  const server = await startServer({ env: { LIVEFX_GIF_MOCK: '1' } });
  const { base } = server;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-DE' });
  const errors = [];
  try {
    const panel = await ctx.newPage();
    panel.on('pageerror', (e) => errors.push(e.message));
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    await panel.waitForSelector('#asset-library .gif-search .gif-form:not([hidden])', { timeout: 5000 });
    assert.ok(await panel.$('#asset-library .asset-upload'), 'upload button still there');
    assert.equal(await panel.inputValue('#asset-library .gif-lang'), 'de', 'language defaults from navigator.language');
    assert.equal(await panel.textContent('#asset-library .gif-title'), 'GIF-Suche');

    // search
    await panel.fill('#asset-library .gif-q', 'katze');
    await panel.click('#asset-library .gif-go');
    await panel.waitForFunction(() => document.querySelectorAll('#asset-library .gif-item').length === 6, null, { timeout: 5000 });
    const found = await panel.evaluate(() => ({
      imgs: Array.from(document.querySelectorAll('#asset-library img.gif-preview')).map((i) => ({ src: i.getAttribute('src'), alt: i.alt, lazy: i.getAttribute('loading') })),
      saves: document.querySelectorAll('#asset-library .gif-save').length,
      triggers: document.querySelectorAll('#asset-library .gif-trigger').length,
      attribution: document.querySelector('#asset-library .gif-attribution').textContent,
      status: document.querySelector('#asset-library .gif-status').textContent,
    }));
    assert.equal(found.imgs.length, 6);
    assert.ok(found.imgs.every((i) => i.lazy === 'lazy' && i.alt.includes('katze') && /\/api\/gifs\/mock\/\d\.gif$/.test(i.src)), JSON.stringify(found.imgs));
    assert.equal(found.saves, 6);
    assert.equal(found.triggers, 6);
    assert.match(found.attribution, /Powered by Tenor/);
    assert.match(found.status, /6 GIFs/);
    log('search rendered 6 previews');

    // XSS: a title with markup is rendered as text
    await panel.evaluate(() => {
      const q = document.querySelector('#asset-library .gif-q');
      q.value = '<img src=x onerror=window.__gx=1>';
    });
    await panel.click('#asset-library .gif-go');
    await panel.waitForFunction(() => /GIFs für/.test(document.querySelector('#asset-library .gif-status').textContent), null, { timeout: 5000 });
    const xss = await panel.evaluate(() => ({ x: window.__gx, extraImgs: document.querySelectorAll('#asset-library .gif-item img:not(.gif-preview)').length }));
    assert.equal(xss.x, undefined);
    assert.equal(xss.extraImgs, 0);
    await panel.fill('#asset-library .gif-q', 'katze');
    await panel.click('#asset-library .gif-go');
    await panel.waitForFunction(() => document.querySelector('#asset-library .gif-item img').alt.includes('katze'), null, { timeout: 5000 });

    // "Speichern" on the first result -> library shows the new asset
    await panel.evaluate(() => {
      window.__created = [];
      // the panel may not wire onCreateTrigger yet; remount with a hook to verify "Als Trigger"
    });
    await panel.click('#asset-library .gif-item[data-index="0"] .gif-save');
    await panel.waitForFunction(() => document.querySelectorAll('#asset-library .asset-item').length === 1, null, { timeout: 5000 });
    const lib1 = await panel.evaluate(() => ({
      names: Array.from(document.querySelectorAll('#asset-library .asset-item')).map((el) => el.dataset.name),
      status: document.querySelector('#asset-library .gif-status').textContent,
    }));
    assert.equal(lib1.names.length, 1);
    assert.ok(lib1.names[0].endsWith('.gif'), lib1.names[0]);
    assert.match(lib1.status, /gespeichert/);
    log('saved via button:', lib1.names[0]);

    // second import through the public API
    const second = await panel.evaluate(async () => {
      const s = await window.LiveFXAssets.gifs.search('hund', { provider: 'giphy', lang: 'de', limit: 3 });
      const a = await window.LiveFXAssets.gifs.importUrl(s.results[1].url, 'Hund lustig');
      return { provider: s.provider, count: s.results.length, asset: a };
    });
    assert.equal(second.provider, 'giphy');
    assert.equal(second.count, 3);
    assert.equal(second.asset.name, 'hund-lustig.gif');
    assert.equal(second.asset.type, 'image');
    const onServer = await api(base, 'GET', '/api/assets');
    assert.deepEqual(onServer.json.assets.map((a) => a.name).sort(), [lib1.names[0], 'hund-lustig.gif'].sort());
    const served = await fetch(`${base}/assets/hund-lustig.gif`);
    assert.equal(served.headers.get('content-type'), 'image/gif');

    // "Als Trigger" with a host hook (separate mount so the panel's own wiring is untouched)
    await panel.evaluate(() => {
      const div = document.createElement('div');
      div.id = '__gl';
      document.body.appendChild(div);
      window.__created = [];
      window.__gl = window.LiveFXAssets.mountLibrary(div, { onCreateTrigger: (asset, result) => window.__created.push({ asset, result }) });
    });
    await panel.waitForSelector('#__gl .gif-form:not([hidden])');
    await panel.fill('#__gl .gif-q', 'applaus');
    await panel.click('#__gl .gif-go');
    await panel.waitForSelector('#__gl .gif-item');
    await panel.click('#__gl .gif-item[data-index="2"] .gif-trigger');
    await panel.waitForFunction(() => window.__created.length === 1, null, { timeout: 5000 });
    const created = await panel.evaluate(() => window.__created[0]);
    assert.equal(created.asset.type, 'image');
    assert.ok(created.asset.url.startsWith('assets/'));
    assert.ok(created.result.title.includes('applaus'));
    await panel.waitForFunction(() => document.querySelectorAll('#__gl .asset-item').length === 3, null, { timeout: 5000 });
    await panel.evaluate(() => {
      window.__gl.destroy();
      document.getElementById('__gl').remove();
    });
    log('onCreateTrigger hook received', created.asset.name);

    // status + key form API
    const st = await panel.evaluate(() => window.LiveFXAssets.gifs.status());
    assert.deepEqual(st.providers, { tenor: true, giphy: true });
    assert.equal(st.mock, true);
    const keys = await panel.evaluate(() => window.LiveFXAssets.gifs.setKeys({ tenorKey: 'AIzaSyBrowserKey1234' }));
    assert.equal(keys.ok, true);
    assert.ok(!JSON.stringify(keys).includes('AIzaSyBrowserKey1234'));

    await panel.evaluate(() => document.querySelector('#asset-library').scrollIntoView());
    await panel.screenshot({ path: path.join(shotDir, 'gifs.png') });
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await ctx.close();
    await server.stop();
  }

  // Without any provider the library shows the key form instead of the search
  const bare = await startServer();
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const panel = await ctx2.newPage();
    panel.on('pageerror', (e) => errors.push(e.message));
    await panel.goto(`${bare.base}/`);
    await panel.waitForSelector('#asset-library .gif-setup:not([hidden]) .gif-keys', { timeout: 5000 });
    const missing = await panel.evaluate(() => ({
      text: document.querySelector('#asset-library .gif-missing').textContent,
      link: document.querySelector('#asset-library .gif-missing a').getAttribute('href'),
      formHidden: document.querySelector('#asset-library .gif-form').hidden,
    }));
    assert.match(missing.text, /API-Key fehlt/);
    assert.equal(missing.link, 'docs/GIFS.md');
    assert.equal(missing.formHidden, true);
    await panel.fill('#asset-library .gif-key-giphy', 'GiphyBrowserKey12345');
    await panel.click('#asset-library .gif-keys-save');
    await panel.waitForSelector('#asset-library .gif-form:not([hidden])', { timeout: 5000 });
    const st = await api(bare.base, 'GET', '/api/gifs/status');
    assert.deepEqual(st.json.providers, { tenor: false, giphy: true });
    await panel.screenshot({ path: path.join(shotDir, 'gifs-keys.png') });
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    log('key form saved a Giphy key');
  } finally {
    await ctx2.close();
    await bare.stop();
  }
}

module.exports = { run };
