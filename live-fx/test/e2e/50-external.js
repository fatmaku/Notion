// External API: /api/fire renders in the overlay, /fire volume is remembered for new overlays,
// /api/transcript reaches panel subscribers, and the LiveFXASR `external` backend maps bus
// transcript messages to onText().
'use strict';

const path = require('path');

async function run({ browser, startServer, api, sseClient, waitFor, shotDir, log }) {
  const server = await startServer();
  const token = 'test-token';
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const overlay = await ctx.newPage();
    await overlay.goto(`${server.base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });

    // 1. /api/fire {id:'lol'} (rain of 😂) -> canvas rain + its `.fx-rain` marker in the overlay
    const fire = await api(server.base, 'POST', '/api/fire', { json: { id: 'lol', source: 'e2e' }, token });
    if (fire.status !== 200 || fire.json.fired !== true) throw new Error(`/api/fire failed: ${fire.status} ${fire.text}`);
    await overlay.waitForSelector('.fx-rain[data-emoji="😂"]', { state: 'attached', timeout: 3000 });
    const rainParticles = await overlay.evaluate(() => window.livefx.renderer.particles.items.filter((p) => p.text === '😂').length);
    if (!(rainParticles > 0)) throw new Error(`no 😂 rain on the canvas (${rainParticles})`);
    await overlay.screenshot({ path: path.join(shotDir, 'external.png') });
    log(`/api/fire rendered .fx-rain + ${rainParticles} canvas drops`);

    // 2. /fire volume 0.3 -> a fresh overlay without ?volume= adopts state.volume
    const vol = await api(server.base, 'POST', '/fire', { json: { type: 'volume', volume: 0.3 }, token });
    if (vol.status !== 200) throw new Error(`/fire volume failed: ${vol.status} ${vol.text}`);
    const overlay2 = await ctx.newPage();
    await overlay2.goto(`${server.base}/overlay.html`);
    await overlay2.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    // Applying `state.volume` in the overlay is owned by P2 (overlay.html); see NOTES.
    await waitFor(() => overlay2.evaluate(() => window.livefx.renderer.volume === 0.3), { timeoutMs: 3000, what: 'renderer.volume === 0.3 from state message' });
    log('state.volume applied in second overlay');

    // 3. /api/transcript reaches a panel-role subscriber (the overlay bus does not get it by design)
    const panelSse = await sseClient(server.base, { role: 'panel' });
    try {
      await panelSse.next('state');
      const tr = await api(server.base, 'POST', '/api/transcript', { json: { text: 'oh nein', final: true }, token });
      if (tr.status !== 200 || tr.json.panels < 1) throw new Error(`/api/transcript failed: ${tr.status} ${tr.text}`);
      const msg = await panelSse.next('transcript');
      if (msg.text !== 'oh nein' || msg.final !== true || msg.source !== 'Extern') throw new Error(`unexpected transcript ${JSON.stringify(msg)}`);
      log('panel SSE received transcript');
    } finally {
      panelSse.close();
    }

    // 4. LiveFXASR external backend in the browser: bus transcript -> onText
    await overlay.addScriptTag({ url: '/js/asr.js' });
    const result = await overlay.evaluate(() => {
      const bus = window.livefx.bus;
      const calls = [];
      const states = [];
      const backends = window.LiveFXASR.backends;
      const asr = window.LiveFXASR.create('external', { bus, onText: (...a) => calls.push(a), onState: (s) => states.push(s) });
      const before = asr.state;
      asr.start();
      bus._emit({ id: 't1', type: 'transcript', text: 'oh nein', final: true });
      bus._emit({ id: 't2', type: 'fire', trigger: { id: 'x' } }); // ignored
      const listening = asr.state;
      asr.stop();
      bus._emit({ id: 't3', type: 'transcript', text: 'nach stop', final: false }); // ignored after stop
      let threw = false;
      try {
        window.LiveFXASR.create('nope', {});
      } catch (_) {
        threw = true;
      }
      return { backends, before, listening, after: asr.state, states, calls, threw, name: asr.name };
    });
    log('asr result', JSON.stringify(result));
    const ext = result.backends.find((b) => b.name === 'external');
    if (!ext || ext.supported !== true) throw new Error('external backend should be supported over http');
    if (result.name !== 'external' || result.before !== 'idle' || result.listening !== 'listening' || result.after !== 'idle') throw new Error('unexpected states');
    if (JSON.stringify(result.states) !== JSON.stringify(['listening', 'idle'])) throw new Error('onState sequence wrong');
    if (result.calls.length !== 1) throw new Error(`expected exactly one onText call, got ${result.calls.length}`);
    const [text, isFinal, meta] = result.calls[0];
    if (text !== 'oh nein' || isFinal !== true || !meta || meta.source !== 'Extern') throw new Error('onText args wrong');
    if (!result.threw) throw new Error('unknown backend must throw');

    await ctx.close();
  } finally {
    await server.stop();
  }
}

module.exports = { run };
