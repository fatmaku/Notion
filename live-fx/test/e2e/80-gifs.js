// GIF search in the media library (mock KLIPY/GIPHY): attribution, safety filter (blocked query + filtered
// results), per-result „ausblenden“ (persists in localStorage), „Als Trigger“ -> image trigger with the
// provider hotlink (no import), key form.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

async function run({ browser, startServer, api, shotDir, log }) {
  const server = await startServer({ env: { LIVEFX_GIF_MOCK: '1' } });
  const { base } = server;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-DE' });
  const errors = [];
  const G = '#asset-library';
  try {
    const panel = await ctx.newPage();
    panel.on('pageerror', (e) => errors.push(e.message));
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    await panel.waitForSelector(`${G} .gif-search .gif-form:not([hidden])`, { timeout: 5000 });
    assert.ok(await panel.$(`${G} .asset-upload`), 'upload button still there');
    assert.equal(await panel.inputValue(`${G} .gif-lang`), 'de', 'language defaults from navigator.language');
    assert.equal(await panel.textContent(`${G} .gif-title`), 'GIF-Suche');
    const provs = await panel.evaluate((g) => Array.from(document.querySelectorAll(`${g} .gif-provider option`)).map((o) => o.value), G);
    assert.deepEqual(provs, ['klipy', 'giphy'], 'tenor is gone');
    assert.equal(await panel.inputValue(`${G} .gif-provider`), 'klipy');
    // attribution visible before any search
    assert.equal(await panel.isVisible(`${G} .gif-attribution`), true);
    assert.equal(await panel.textContent(`${G} .gif-attribution`), 'Powered by KLIPY');

    // search: 6 mock results, the 3 unsafe ones (beer / gun tag / church slug) are filtered on the server
    await panel.fill(`${G} .gif-q`, 'katze');
    await panel.click(`${G} .gif-go`);
    await panel.waitForFunction((g) => document.querySelectorAll(`${g} .gif-item`).length === 6, G, { timeout: 5000 });
    const found = await panel.evaluate((g) => ({
      imgs: Array.from(document.querySelectorAll(`${g} img.gif-preview`)).map((i) => ({ src: i.getAttribute('src'), alt: i.alt, lazy: i.getAttribute('loading') })),
      saves: document.querySelectorAll(`${g} .gif-save`).length,
      triggers: document.querySelectorAll(`${g} .gif-trigger`).length,
      hides: document.querySelectorAll(`${g} .gif-hide`).length,
      attribution: document.querySelector(`${g} .gif-attribution`).textContent,
      attrHidden: document.querySelector(`${g} .gif-attribution`).hidden,
      status: document.querySelector(`${g} .gif-status`).textContent,
    }), G);
    assert.equal(found.imgs.length, 6);
    assert.ok(found.imgs.every((i) => i.lazy === 'lazy' && i.alt.includes('katze') && /\/api\/gifs\/mock\/\d\.gif$/.test(i.src)), JSON.stringify(found.imgs));
    assert.ok(found.imgs.every((i) => !/beer|funny|crowd/.test(i.alt)), 'unsafe mock results filtered');
    assert.equal(found.saves, 0, 'no import button (provider terms)');
    assert.equal(found.triggers, 6);
    assert.equal(found.hides, 6);
    assert.equal(found.attribution, 'Powered by KLIPY');
    assert.equal(found.attrHidden, false);
    assert.match(found.status, /6 GIFs/);
    const stats = await api(base, 'GET', '/api/gifs/mock-stats');
    assert.equal(stats.json.last.params.rating, 'g');
    assert.equal(stats.json.last.params.locale, 'de_DE');
    log('search rendered 6 safe previews, rating=g locale=de_DE');

    // GIPHY: attribution switches
    await panel.selectOption(`${G} .gif-provider`, 'giphy');
    assert.equal(await panel.textContent(`${G} .gif-attribution`), 'Powered By GIPHY');
    await panel.click(`${G} .gif-go`);
    await panel.waitForFunction((g) => /GIPHY/.test(document.querySelector(`${g} .gif-item img`).alt), G, { timeout: 5000 });
    assert.equal(await panel.textContent(`${G} .gif-attribution`), 'Powered By GIPHY');
    await panel.selectOption(`${G} .gif-provider`, 'klipy');

    // blocked query: message, no results, provider never called
    const callsBefore = (await api(base, 'GET', '/api/gifs/mock-stats')).json.calls;
    await panel.fill(`${G} .gif-q`, 'Kirche');
    await panel.click(`${G} .gif-go`);
    await panel.waitForFunction((g) => /gesperrt/.test(document.querySelector(`${g} .gif-status`).textContent), G, { timeout: 5000 });
    const blocked = await panel.evaluate((g) => ({
      status: document.querySelector(`${g} .gif-status`).textContent,
      items: document.querySelectorAll(`${g} .gif-item`).length,
      attr: document.querySelector(`${g} .gif-attribution`).hidden,
    }), G);
    assert.match(blocked.status, /Dieser Suchbegriff ist gesperrt \(Religion\)/);
    assert.equal(blocked.items, 0);
    assert.equal(blocked.attr, false, 'attribution stays visible');
    assert.equal((await api(base, 'GET', '/api/gifs/mock-stats')).json.calls, callsBefore, 'blocked query never hit the provider');
    log('blocked:', blocked.status);

    // client-side pre-check once js/safety.js is on the page (index.html may or may not load it yet)
    if (!(await panel.evaluate(() => !!window.LiveFXSafety))) await panel.addScriptTag({ url: '/js/safety.js' });
    await panel.fill(`${G} .gif-q`, 'P1stole');
    await panel.click(`${G} .gif-go`);
    await panel.waitForFunction((g) => /Gewalt/.test(document.querySelector(`${g} .gif-status`).textContent), G, { timeout: 5000 });
    assert.equal((await api(base, 'GET', '/api/gifs/mock-stats')).json.calls, callsBefore, 'still no provider call');

    // XSS: a title with markup is rendered as text
    await panel.evaluate((g) => {
      document.querySelector(`${g} .gif-q`).value = '<img src=x onerror=window.__gx=1>';
    }, G);
    await panel.click(`${G} .gif-go`);
    await panel.waitForFunction((g) => /GIFs für/.test(document.querySelector(`${g} .gif-status`).textContent), G, { timeout: 5000 });
    const xss = await panel.evaluate((g) => ({ x: window.__gx, extraImgs: document.querySelectorAll(`${g} .gif-item img:not(.gif-preview)`).length }), G);
    assert.equal(xss.x, undefined);
    assert.equal(xss.extraImgs, 0);

    // hide: one result disappears, stays hidden after reload
    await panel.fill(`${G} .gif-q`, 'katze');
    await panel.click(`${G} .gif-go`);
    await panel.waitForFunction((g) => document.querySelectorAll(`${g} .gif-item`).length === 6 && document.querySelector(`${g} .gif-item img`).alt.includes('katze'), G, { timeout: 5000 });
    const hiddenId = await panel.getAttribute(`${G} .gif-item[data-index="1"]`, 'data-id');
    await panel.click(`${G} .gif-item[data-index="1"] .gif-hide`);
    await panel.waitForFunction((g) => document.querySelectorAll(`${g} .gif-item`).length === 5, G, { timeout: 5000 });
    const stored = await panel.evaluate(() => JSON.parse(localStorage.getItem('livefx.gifs.hidden')));
    assert.deepEqual(stored, [`klipy:${hiddenId}`]);
    assert.equal(await panel.isVisible(`${G} .gif-hidden-info`), true);
    await panel.reload();
    await panel.waitForSelector(`${G} .gif-search .gif-form:not([hidden])`, { timeout: 5000 });
    await panel.fill(`${G} .gif-q`, 'katze');
    await panel.click(`${G} .gif-go`);
    await panel.waitForFunction((g) => document.querySelectorAll(`${g} .gif-item`).length === 5, G, { timeout: 5000 });
    const ids = await panel.evaluate((g) => Array.from(document.querySelectorAll(`${g} .gif-item`)).map((e) => e.dataset.id), G);
    assert.ok(!ids.includes(hiddenId), 'hidden GIF stays hidden after reload');
    log('hidden', hiddenId, 'persisted');

    // "Als Trigger" -> panel opens the editor with the hotlink; saving yields an image trigger with https src
    const before = await panel.evaluate(() => window.livefx.triggers.length);
    const firstUrl = await panel.evaluate(async () => (await window.LiveFXAssets.gifs.search('katze', { provider: 'klipy', lang: 'de', limit: 1 })).results[0].url);
    assert.match(firstUrl, /^https:\/\/static\.klipy\.com\//);
    await panel.click(`${G} .gif-item[data-index="0"] .gif-trigger`);
    await panel.waitForSelector('dialog.fx-editor[open]', { timeout: 5000 });
    const ed = await panel.evaluate(() => ({
      kind: document.querySelector('dialog.fx-editor [name="kind"]').value,
      src: document.querySelector('dialog.fx-editor [name="src"]').value,
      label: document.querySelector('dialog.fx-editor [name="label"]').value,
    }));
    assert.equal(ed.kind, 'image');
    assert.equal(ed.src, firstUrl);
    assert.ok(ed.label.startsWith('katze'), ed.label);
    await panel.fill('dialog.fx-editor [name="keywords"]', 'miau');
    await panel.click('dialog.fx-editor [data-act="save"]');
    await panel.waitForFunction((n) => window.livefx.triggers.length === n + 1, before, { timeout: 5000 });
    const trig = await panel.evaluate(() => window.livefx.triggers[window.livefx.triggers.length - 1]);
    assert.equal(trig.visual.kind, 'image');
    assert.match(trig.visual.src, /^https:\/\/static\.klipy\.com\//);
    const assets = await api(base, 'GET', '/api/assets');
    assert.equal(assets.json.assets.length, 0, 'nothing was downloaded into the asset store');
    log('image trigger with hotlink', trig.visual.src);

    // import of provider media is refused, status/key API
    const imp = await panel.evaluate(async (u) => {
      try {
        await window.LiveFXAssets.gifs.importUrl(u);
        return 'ok';
      } catch (e) {
        return `${e.status}:${e.code}`;
      }
    }, firstUrl);
    assert.equal(imp, '403:provider_terms');
    const st = await panel.evaluate(() => window.LiveFXAssets.gifs.status());
    assert.deepEqual(st.providers, { klipy: true, giphy: true });
    assert.equal(st.mock, true);
    const keys = await panel.evaluate(() => window.LiveFXAssets.gifs.setKeys({ klipyKey: 'KlipyBrowserKey1234' }));
    assert.equal(keys.ok, true);
    assert.ok(!JSON.stringify(keys).includes('KlipyBrowserKey1234'));

    await panel.evaluate((g) => document.querySelector(g).scrollIntoView(), G);
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
    await panel.waitForSelector(`${G} .gif-setup:not([hidden]) .gif-keys`, { timeout: 5000 });
    const missing = await panel.evaluate((g) => ({
      text: document.querySelector(`${g} .gif-missing`).textContent,
      link: document.querySelector(`${g} .gif-missing a`).getAttribute('href'),
      formHidden: document.querySelector(`${g} .gif-form`).hidden,
      fields: Array.from(document.querySelectorAll(`${g} .gif-keys input`)).map((i) => i.className),
    }), G);
    assert.match(missing.text, /API-Key fehlt/);
    assert.match(missing.text, /KLIPY/);
    assert.equal(missing.link, 'docs/GIFS.md');
    assert.equal(missing.formHidden, true);
    assert.deepEqual(missing.fields, ['gif-key-klipy', 'gif-key-giphy']);
    await panel.fill(`${G} .gif-key-klipy`, 'KlipyBrowserKey12345');
    await panel.click(`${G} .gif-keys-save`);
    await panel.waitForSelector(`${G} .gif-form:not([hidden])`, { timeout: 5000 });
    const st = await api(bare.base, 'GET', '/api/gifs/status');
    assert.deepEqual(st.json.providers, { klipy: true, giphy: false });
    assert.equal(await panel.textContent(`${G} .gif-attribution`), 'Powered by KLIPY');
    await panel.screenshot({ path: path.join(shotDir, 'gifs-keys.png') });
    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    log('key form saved a KLIPY key');
  } finally {
    await ctx2.close();
    await bare.stop();
  }
}

module.exports = { run };
