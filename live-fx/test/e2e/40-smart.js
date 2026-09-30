// Smart mode (mock classifier): the panel gate asks /api/smart/classify, the returned id is fired through
// matcher.fireById + fire('KI') and the overlay renders the card.
'use strict';

const path = require('path');

const TEXT = 'bitte trigger:wow jetzt';

async function run({ browser, startServer, shotDir, log }) {
  const server = await startServer();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  try {
    const overlay = await ctx.newPage();
    await overlay.goto(`${server.base}/overlay.html`);
    await overlay.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });

    const panel = await ctx.newPage();
    await panel.goto(`${server.base}/`);
    await panel.waitForSelector('#pad button');
    await panel.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });

    // The panel wiring (#smart checkbox) belongs to another package; use the module directly.
    const hasModule = await panel.evaluate(() => typeof window.LiveFXSmart !== 'undefined');
    if (!hasModule) {
      log('LiveFXSmart not loaded by index.html – injecting /js/smart.js');
      await panel.addScriptTag({ url: '/js/smart.js' });
    }

    const result = await panel.evaluate(async (text) => {
      const s = LiveFXSmart.create({});
      s.setEnabled(true);
      const status = await s.refreshStatus();
      const gate = s.shouldClassify(text, 0, true);
      const r = gate ? await s.classify(text, 'de-DE') : null;
      return {
        status,
        gate,
        r,
        persisted: localStorage.getItem('livefx.smart'),
        again: s.shouldClassify(text, 0, true),
        twoWords: s.shouldClassify('trigger:wow jetzt', 0, true),
        withHits: s.shouldClassify('noch ein anderer satz', 1, true),
        interim: s.shouldClassify('noch ein anderer satz', 0, false),
        fresh: s.shouldClassify('noch ein anderer satz', 0, true),
        disabled: (s.setEnabled(false), s.shouldClassify('noch ein anderer satz', 0, true)),
      };
    }, TEXT);
    log('classify result', JSON.stringify(result.r), 'status', JSON.stringify(result.status));
    if (!result.status.available || !result.status.mock) throw new Error('status not available/mock: ' + JSON.stringify(result.status));
    if (!result.gate) throw new Error('shouldClassify must be true for a fresh final 4-word utterance');
    if (!result.r || result.r.triggerId !== 'wow') throw new Error('expected triggerId wow, got ' + JSON.stringify(result.r));
    if (result.r.confidence < 0.6) throw new Error('confidence too low: ' + result.r.confidence);
    if (result.persisted !== '1') throw new Error('toggle not persisted, got ' + result.persisted);
    if (result.again) throw new Error('same text twice must not classify again');
    if (result.twoWords) throw new Error('2-word text must not classify');
    if (result.withHits) throw new Error('utteranceHits > 0 must not classify');
    if (result.interim) throw new Error('interim text must not classify');
    if (!result.fresh) throw new Error('fresh final text must classify');
    if (result.disabled) throw new Error('disabled gate must not classify');

    // Fire the classified trigger the way the panel will: fireById (cooldown/gap) -> fire(trigger, 'KI').
    const fired = await panel.evaluate((id) => {
      const { trigger, blocked } = window.livefx.matcher.fireById(id);
      if (blocked) return { blocked };
      window.livefx.fire(trigger, 'KI');
      return { blocked: null, label: trigger.label };
    }, result.r.triggerId);
    if (fired.blocked) throw new Error('fireById blocked: ' + fired.blocked);

    await overlay.waitForSelector('.fx-card', { timeout: 3000 });
    const text = await overlay.textContent('.fx-card');
    if (!/KRASS/.test(text)) throw new Error('unexpected card text: ' + text);
    await overlay.screenshot({ path: path.join(shotDir, 'smart.png') });
    log('overlay shows', text.trim());
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
