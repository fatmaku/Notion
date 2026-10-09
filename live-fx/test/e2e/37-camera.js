// Camera view (camera.html, docs/KAMERA.md): webcam (Chromium fake device) + the overlay iframe in one window.
// Checks: the video plays, the device picker lists the fake camera, the overlay layer sits click-through and
// transparent above the video and shows a fire sent through the bus (server API -> SSE -> iframe), the compositor
// rasters camera + overlay, the recorder produces a non-empty video after 2 s (incl. mic + effect sounds), „Pixelgenau“
// (tab capture) files have a picture on every capture way (restrict / crop / whole tab, silent capture -> canvas) and
// stop with the capture track, the recording outlives an overlay reload, mirror / 9:16 / clean mode, the Live-Mikro
// path (matcher -> fire, sentence -> story director) and the panel's camera card.
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run({ browser, startServer, api, shotDir, log }) {
  const server = await startServer();
  const { base, token } = server;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  try {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`camera: ${e.message}`));
    await page.goto(`${base}/camera.html?record=1`);
    await page.waitForFunction(() => window.livefxCamera, null, { timeout: 5000 });
    await page.evaluate(() => window.livefxCamera.ready.then(() => true));

    // (a) the webcam plays (fake device), the picker lists it
    await page.waitForFunction(() => {
      const v = document.querySelector('#cam');
      return v.readyState >= 2 && v.videoWidth > 0 && !v.paused;
    }, null, { timeout: 5000 });
    const t0 = await page.evaluate(() => document.querySelector('#cam').currentTime);
    await sleep(400);
    const t1 = await page.evaluate(() => document.querySelector('#cam').currentTime);
    assert.ok(t1 > t0, `video time advances (${t0} -> ${t1})`);
    const st = await page.evaluate(() => window.livefxCamera.state);
    assert.equal(st.camera, 'on');
    assert.equal(st.aspect, '16:9');
    const options = await page.locator('#cam-device option').allTextContents();
    assert.ok(options.length >= 1 && options[0] !== 'keine Kamera', `device picker: ${options.join(' | ')}`);
    assert.ok((await page.evaluate(() => window.livefxCamera.devices())).length >= 1, 'devices() lists the fake camera');
    assert.equal(await page.locator('#cam-off').isHidden(), true, 'no camera error');
    log(`camera on (${options[0]}), ${await page.evaluate(() => document.querySelector('#cam').videoWidth)}px`);

    // (b) the overlay iframe: same origin, output-sized, click-through, transparent, above the video
    const geo = await page.evaluate(() => {
      const f = document.querySelector('#fx');
      const v = document.querySelector('#cam');
      const cs = getComputedStyle(f);
      const fr = f.getBoundingClientRect();
      const vr = v.getBoundingClientRect();
      const d = f.contentDocument;
      return {
        src: f.getAttribute('src'),
        pe: cs.pointerEvents,
        bg: cs.backgroundColor,
        bodyBg: getComputedStyle(d.body).backgroundColor,
        after: !!(v.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING),
        same: Math.abs(fr.left - vr.left) < 1 && Math.abs(fr.top - vr.top) < 1 && Math.abs(fr.width - vr.width) < 1 && Math.abs(fr.height - vr.height) < 1,
        inner: [d.documentElement.clientWidth, d.documentElement.clientHeight],
        hit: document.elementFromPoint(fr.left + fr.width / 2, fr.top + fr.height / 2) === f,
        bar: document.querySelector('#bar').getBoundingClientRect().top >= fr.bottom - 1,
      };
    });
    assert.equal(geo.src, 'overlay.html');
    assert.equal(geo.pe, 'none', 'overlay is click-through');
    assert.equal(geo.bg, 'rgba(0, 0, 0, 0)', 'iframe transparent');
    assert.equal(geo.bodyBg, 'rgba(0, 0, 0, 0)', 'overlay body transparent');
    assert.ok(geo.after && geo.same, 'iframe covers the video exactly and comes after it');
    assert.deepEqual(geo.inner, [1280, 720], 'overlay laid out at the output size (720p)');
    assert.equal(geo.hit, false, 'clicks go through the overlay');
    assert.ok(geo.bar, 'toolbar sits below the picture, not on it');
    const fx = page.frame({ url: /overlay\.html/ });
    assert.ok(fx, 'overlay frame');
    await fx.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    await page.waitForSelector('#dot.on', { timeout: 4000 });

    // (c) a fire through the server reaches the embedded overlay: card visible over the video
    const fired = await api(base, 'POST', '/api/fire', { json: { id: 'wow', force: true }, token });
    assert.equal(fired.status, 200, fired.text);
    await fx.waitForSelector('.fx-card', { timeout: 3000 });
    await sleep(500); // past the pop-in
    const card = await page.evaluate(() => {
      const f = document.querySelector('#fx');
      const c = f.contentDocument.querySelector('.fx-card');
      const r = c.getBoundingClientRect();
      const fr = f.getBoundingClientRect();
      const k = fr.width / f.contentDocument.documentElement.clientWidth;
      return { x: fr.left + (r.left + r.width / 2) * k, y: fr.top + (r.top + r.height / 2) * k, w: r.width, op: Number(getComputedStyle(c).opacity), frame: [fr.left, fr.top, fr.right, fr.bottom] };
    });
    assert.ok(card.w > 20 && card.op > 0.3, `card visible (w ${card.w}, opacity ${card.op})`);
    assert.ok(card.x > card.frame[0] && card.x < card.frame[2] && card.y > card.frame[1] && card.y < card.frame[3], 'card lies over the camera picture');
    assert.equal(await fx.evaluate(() => window.livefx.renderer.stats.fires), 1);
    log('fire via bus -> card over the video');

    // (d) compositor: camera + overlay raster into one canvas of the output size
    const comp = await page.evaluate(() => {
      const cam = window.livefxCamera;
      const r = cam.compositor.paint();
      const c = cam.compositor.canvas;
      const g = c.getContext('2d');
      const px = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data);
      // brightest-spread check on a coarse grid: the fake camera picture is not flat black
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 997) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
      return { r, size: [c.width, c.height], lit, mid: px(c.width >> 1, c.height >> 1) };
    });
    assert.deepEqual(comp.size, [1280, 720]);
    assert.ok(comp.lit > 50, `camera picture in the raster (${comp.lit} lit samples)`);
    assert.ok(comp.r.nodes >= 3, `overlay nodes rastered: ${JSON.stringify(comp.r)}`);
    assert.ok(comp.r.texts >= 1, `card text rastered: ${JSON.stringify(comp.r)}`);
    assert.ok(comp.r.ms < 50, `one composite frame is cheap (${comp.r.ms.toFixed(1)} ms)`);
    log(`compositor: ${JSON.stringify(comp.r)}`);

    // (e) record ~2 s (canvas mode, mic + effect sounds) -> non-empty video, result panel with download
    await page.evaluate(() => {
      window.livefxCamera.startRecording(); // resolves only when the recording ends
    });
    await page.waitForSelector('#btn-rec.on', { timeout: 3000 });
    await api(base, 'POST', '/api/fire', { json: { id: 'clap', force: true }, token });
    await sleep(2000);
    const recInfo = await page.evaluate(() => window.livefxCamera.recording);
    const res = await page.evaluate(async () => {
      const r = await window.livefxCamera.stopRecording();
      return { bytes: r.bytes, type: r.mimeType, ms: r.ms, name: r.filename, blob: r.blob instanceof Blob && r.blob.size };
    });
    assert.ok(res.bytes > 1000 && res.blob === res.bytes, `recording has data: ${JSON.stringify(res)}`);
    assert.match(res.type, /^video\/(webm|mp4)/);
    assert.match(res.name, /^livefx-kamera-\d{8}-\d{6}\.(webm|mp4)$/);
    assert.ok(res.ms >= 1800, `recorded ~2 s (${res.ms} ms)`);
    await page.waitForSelector('#rec-result:not([hidden])', { timeout: 2000 });
    assert.match(await page.getAttribute('#rec-download', 'href'), /^blob:/);
    assert.equal(await page.getAttribute('#rec-download', 'download'), res.name);
    assert.equal(await page.locator('#btn-rec.on').count(), 0, 'record button back to idle');
    assert.equal(await page.evaluate(() => window.livefxCamera.compositor.running), false, 'compositor stopped');
    const played = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const v = document.querySelector('#rec-video');
          if (v.readyState >= 1) resolve(v.videoWidth);
          else v.addEventListener('loadedmetadata', () => resolve(v.videoWidth), { once: true });
          setTimeout(() => resolve(-1), 3000);
        })
    );
    assert.equal(played, 1280, 'recorded video decodes at 1280 px');
    await page.screenshot({ path: path.join(shotDir, '37-camera-recorded.png') });
    await page.click('#rec-close');
    log(`recorded ${res.bytes} bytes ${res.type} via ${recInfo && recInfo.via}`);

    // (e2) „Pixelgenau“ (tab capture) must give a file WITH a picture: Chrome's restrictTo() on an ineligible element
    // resolves but then sends no frames (sound-only file) – each capture way is checked for frames first.
    await page.evaluate(() => {
      const md = navigator.mediaDevices;
      window.__dm = { orig: md.getDisplayMedia, last: null };
      md.getDisplayMedia = async (c) => (window.__dm.last = await window.__dm.orig.call(md, c));
    });
    await page.click('#btn-more');
    await page.selectOption('#rec-mode', 'tab');
    await page.click('#btn-more');
    const tabRecord = async ({ end = false } = {}) => {
      await page.click('#btn-rec'); // a real click: getDisplayMedia wants a user gesture
      await page.waitForSelector('#btn-rec.on', { timeout: 8000 });
      const during = await page.evaluate(() => ({ ...window.livefxCamera.recording, hint: document.querySelector('#hint').textContent, eligible: document.querySelector('#frame').classList.contains('capture-target') }));
      await sleep(1500);
      // end: Chrome's „Freigabe beenden“ bar ends the capture track – the recording has to stop by itself
      if (end) await page.evaluate(() => window.__dm.last.getVideoTracks()[0].dispatchEvent(new Event('ended')));
      else await page.click('#btn-rec');
      await page.waitForSelector('#rec-result:not([hidden])', { timeout: 5000 });
      const out = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const v = document.querySelector('#rec-video');
            const done = () => resolve({ w: v.videoWidth, h: v.videoHeight, last: { ...window.livefxCamera.lastRecording, blob: null }, eligibleAfter: document.querySelector('#frame').classList.contains('capture-target') });
            if (v.readyState >= 1) done();
            else v.addEventListener('loadedmetadata', done, { once: true });
            setTimeout(done, 3000);
          })
      );
      await page.click('#rec-close');
      return { during, ...out };
    };
    const caps = await page.evaluate(() => ({ restrict: typeof window.RestrictionTarget === 'function', crop: typeof window.CropTarget === 'function' }));
    // 1. Element Capture first: #frame is made eligible meanwhile (without that Chrome sends no frames at all)
    const first = await tabRecord();
    assert.equal(first.during.mode, 'tab', `tab mode recording: ${JSON.stringify(first.during)}`);
    if (caps.restrict) {
      assert.equal(first.during.target, 'restrict', 'RestrictionTarget narrows the capture to the picture');
      assert.equal(first.during.eligible, true, '#frame eligible for Element Capture while recording');
    }
    assert.ok(first.w > 0 && first.h > 0, `Pixelgenau file has a picture: ${JSON.stringify(first)}`);
    if (first.during.target !== 'tab') assert.deepEqual([first.w, first.h], [1280, 720], 'only the picture, at its on-screen size');
    assert.equal(first.eligibleAfter, false, 'eligibility class removed afterwards');
    assert.ok(first.last.bytes > 1000 && first.last.target === first.during.target);
    log(`Pixelgenau (${first.during.target}): ${first.w}x${first.h}, ${first.last.bytes} bytes ${first.last.codecs}`);
    // 2. without Element Capture: CropTarget – or the whole tab when the crop delivers no frames (headless Chromium's
    //    cropTo sometimes stalls after one frame); the capture bar's „stop sharing“ (track ended) ends the file
    await page.evaluate(() => {
      window.__RestrictionTarget = window.RestrictionTarget;
      delete window.RestrictionTarget;
    });
    const second = await tabRecord({ end: true });
    await page.evaluate(() => {
      if (window.__RestrictionTarget) window.RestrictionTarget = window.__RestrictionTarget;
    });
    assert.ok((caps.crop ? ['crop', 'tab'] : ['tab']).includes(second.during.target), `crop or whole tab: ${JSON.stringify(second.during)}`);
    assert.ok(second.w > 0 && second.h > 0, `${second.during.target} capture has a picture: ${JSON.stringify(second)}`);
    assert.equal(await page.locator('#btn-rec.on').count(), 0, 'ended capture track stopped the recording');
    log(`Pixelgenau (${second.during.target}) + ended track: ${second.w}x${second.h}`);
    // a capture that delivers no picture at all -> canvas recording instead of a sound-only file
    await page.evaluate(() => {
      navigator.mediaDevices.getDisplayMedia = async () => {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        return c.captureStream(0); // never drawn: no frames
      };
    });
    const silentRec = await tabRecord();
    assert.equal(silentRec.during.mode, 'canvas', `silent capture falls back to the canvas: ${JSON.stringify(silentRec.during)}`);
    assert.match(silentRec.during.hint, /Pixelgenau nicht möglich/);
    assert.ok(silentRec.w > 0, `fallback recording has a picture (${silentRec.w}x${silentRec.h})`);
    await page.evaluate(() => {
      navigator.mediaDevices.getDisplayMedia = window.__dm.orig;
    });
    await page.click('#btn-more');
    await page.selectOption('#rec-mode', 'canvas');
    await page.click('#btn-more');
    log('Pixelgenau: restrict / crop|tab / ended track / silent capture -> canvas ok');

    // (f) mirror, 9:16 (overlay switches to portrait without reload), clean mode
    await page.click('#btn-mirror');
    assert.equal(await page.evaluate(() => document.querySelector('#cam').classList.contains('mirror')), !st.mirror);
    await page.click('#btn-mirror');
    await page.click('#btn-aspect');
    await page.waitForFunction(() => window.livefxCamera.state.aspect === '9:16');
    await fx.waitForFunction(() => document.body.classList.contains('layout-portrait') && document.documentElement.clientWidth === 720 && document.documentElement.clientHeight === 1280, null, { timeout: 3000 });
    assert.deepEqual(await page.evaluate(() => [window.livefxCamera.compositor.canvas.width, window.livefxCamera.compositor.canvas.height]), [720, 1280]);
    const portraitFit = await page.evaluate(() => {
      const r = document.querySelector('#frame').getBoundingClientRect();
      return { ratio: r.width / r.height, inView: r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= document.querySelector('#bar').getBoundingClientRect().top + 1 };
    });
    assert.ok(Math.abs(portraitFit.ratio - 9 / 16) < 0.01 && portraitFit.inView, `9:16 frame fits the window: ${JSON.stringify(portraitFit)}`);
    await page.keyboard.press('h');
    assert.equal(await page.evaluate(() => document.body.classList.contains('clean')), true, 'H hides the toolbar');
    assert.equal(await page.locator('#bar').isHidden(), true);
    await page.screenshot({ path: path.join(shotDir, '37-camera-portrait-clean.png') });
    await page.keyboard.press('h');
    await page.click('#btn-aspect');
    await fx.waitForFunction(() => !document.body.classList.contains('layout-portrait'), null, { timeout: 3000 });
    log('mirror / 9:16 / clean ok');

    // (f2) 2.3 „🎨 Ohne Kamera“: the webcam is released, the board stays behind the overlay, effects still show
    const camId = await page.evaluate(() => window.livefxCamera.state.deviceId);
    await page.selectOption('#cam-device', 'off');
    await page.waitForFunction(() => window.livefxCamera.state.camera === 'off', null, { timeout: 3000 });
    const noCam = await page.evaluate(() => ({
      src: document.querySelector('#cam').srcObject,
      off: document.querySelector('#cam-off').hidden,
      cls: document.querySelector('#frame').classList.contains('no-cam'),
      status: document.querySelector('#status').textContent,
      paint: window.livefxCamera.compositor.paint(),
    }));
    assert.ok(noCam.src === null && noCam.off && noCam.cls && /ohne Kamera/.test(noCam.status), `no camera: ${JSON.stringify(noCam)}`);
    assert.ok(noCam.paint.nodes > 0, 'compositor still rasters the overlay without a camera');
    await page.selectOption('#cam-device', camId || '');
    await page.waitForFunction(() => window.livefxCamera.state.camera === 'on' && document.querySelector('#cam').videoWidth > 0, null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => document.querySelector('#frame').classList.contains('no-cam')), false);
    log('Ohne Kamera -> board, back to the camera ok');

    // (g) Live-Mikro path without a real recognizer: matcher hit -> fire, sentence -> story director
    await page.evaluate(() => window.livefxCamera.studio.prepare());
    const firesBefore = await fx.evaluate(() => window.livefx.renderer.stats.fires);
    const hits = await page.evaluate(() => window.livefxCamera.studio.handleText('oh nein das war ein fail', true));
    assert.ok(hits >= 1, 'matcher hit in the camera page');
    await fx.waitForFunction((n) => window.livefx.renderer.stats.fires > n, firesBefore, { timeout: 3000 });
    await page.evaluate(() => window.livefxCamera.setStudioLang('tr-TR'));
    await page.evaluate(() => window.livefxCamera.studio.handleText('ormanda yağmur yağıyordu', true));
    await fx.waitForFunction(() => {
      const s = window.livefx.director && window.livefx.director.state;
      return s && (s.weather === 'rain' || s.scene === 'rain' || s.scene === 'forest');
    }, null, { timeout: 3000 });
    assert.match(await page.textContent('#transcript'), /yağmur yağıyordu/);
    log('Live-Mikro: hit fired, story line reached the director');

    // (h) recording through the own recorder (forced) works too
    const own = await page.evaluate(async () => {
      const cam = window.livefxCamera;
      const done = cam.startRecording({ own: true, mic: false, fx: false });
      await new Promise((r) => setTimeout(r, 900));
      const r = await cam.stopRecording();
      const same = (await done) === r;
      document.querySelector('#rec-close').click();
      return { bytes: r.bytes, via: cam.lastRecording.via, same };
    });
    assert.ok(own.bytes > 0 && own.via === 'camera' && own.same, `own recorder: ${JSON.stringify(own)}`);
    // WebM goes through the overlay's LiveFXSketch.record (same result shape) when it is there
    const hasSketch = await fx.evaluate(() => !!(window.LiveFXSketch && typeof window.LiveFXSketch.record === 'function'));
    const webm = await page.evaluate(async () => {
      const cam = window.livefxCamera;
      cam.startRecording({ format: 'webm', mic: false, fx: true });
      await new Promise((r) => setTimeout(r, 900));
      const r = await cam.stopRecording();
      document.querySelector('#rec-close').click();
      return { bytes: r && r.bytes, type: r && r.mimeType, via: cam.lastRecording.via, name: r && r.filename };
    });
    assert.ok(webm.bytes > 0 && /^video\/webm/.test(webm.type) && /\.webm$/.test(webm.name), `webm recording: ${JSON.stringify(webm)}`);
    assert.equal(webm.via, hasSketch ? 'sketch' : 'camera');
    // the overlay recorder's blob is copied into this page: the download survives an overlay reload (Story-Stil)
    const kept = await page.evaluate(async () => {
      const cam = window.livefxCamera;
      const last = cam.lastRecording;
      await cam.setStoryStyle('emoji'); // reloads the overlay iframe
      const b = await fetch(last.url).then((x) => x.blob(), () => null);
      await cam.setStoryStyle('');
      return { own: last.blob instanceof Blob, fetched: b ? b.size : -1, bytes: last.bytes };
    });
    assert.ok(kept.own && kept.fetched === kept.bytes && kept.bytes > 0, `recording outlives the overlay reload: ${JSON.stringify(kept)}`);
    await fx.waitForFunction(() => window.livefx && window.livefx.bus.serverOk, null, { timeout: 5000 });
    log(`webm via ${webm.via}`);

    await page.screenshot({ path: path.join(shotDir, '37-camera.png') });

    // (h2) „📱 Fernbedienung“: the pairing QR opens in a box OUTSIDE the picture – never in a recording or the output:
    // not inside #frame (the compositor and the Pixelgenau crop only see #frame), the composited frame is the same with
    // and without the box, a recording closes it and locks the button, clean mode hides it.
    await page.click('#btn-remote');
    await page.waitForFunction(() => {
      const c = document.querySelector('#remote-qr canvas');
      const e = document.querySelector('#remote-qr .qr-empty');
      return (c && c.dataset.qrPayload) || (e && !e.hidden && e.textContent !== 'QR-Code lädt …');
    }, null, { timeout: 8000 });
    const remote = await page.evaluate(() => {
      const box = document.querySelector('#remote-qr');
      const c = box.querySelector('canvas');
      const r = box.getBoundingClientRect();
      return {
        open: window.livefxCamera.remoteOpen,
        inFrame: document.querySelector('#frame').contains(box),
        inView: document.querySelector('#view').contains(box),
        payload: c ? c.dataset.qrPayload || '' : '',
        state: window.livefxCamera.remote ? window.livefxCamera.remote.state : null,
        rect: [r.left, r.top, r.width, r.height],
        expanded: document.querySelector('#btn-remote').getAttribute('aria-expanded'),
      };
    });
    assert.ok(remote.open && remote.expanded === 'true', `remote box open: ${JSON.stringify(remote)}`);
    assert.equal(remote.inFrame, false, 'QR box is not part of the picture (#frame)');
    assert.equal(remote.inView, false, 'QR box is not inside #view');
    assert.ok(remote.state && ['setup', 'legacy'].includes(remote.state.mode), `pairing data loaded: ${JSON.stringify(remote.state)}`);
    if (remote.payload) assert.ok(!remote.payload.includes(token) || remote.state.mode === 'legacy', 'pairing QR without the master token');
    await page.screenshot({ path: path.join(shotDir, '37-camera-remote.png') });
    // the composited frame does not contain the box: count pure-black pixels where the box sits, open vs closed
    const blackUnderBox = (rect) =>
      page.evaluate((rc) => {
        const cam = window.livefxCamera;
        cam.compositor.paint();
        const c = cam.compositor.canvas;
        const fr = document.querySelector('#frame').getBoundingClientRect();
        const k = c.width / fr.width;
        const x0 = Math.max(0, Math.floor((rc[0] - fr.left) * k));
        const y0 = Math.max(0, Math.floor((rc[1] - fr.top) * k));
        const w = Math.min(c.width - x0, Math.ceil(rc[2] * k));
        const h = Math.min(c.height - y0, Math.ceil(rc[3] * k));
        if (w <= 0 || h <= 0) return { black: 0, area: 0 };
        const d = c.getContext('2d').getImageData(x0, y0, w, h).data;
        let black = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] < 16 && d[i + 1] < 16 && d[i + 2] < 16 && d[i + 3] > 200) black++;
        return { black, area: w * h };
      }, rect);
    await page.selectOption('#cam-device', 'off'); // still picture: no camera noise in the comparison
    await page.waitForFunction(() => window.livefxCamera.state.camera === 'off', null, { timeout: 3000 });
    const withBox = await blackUnderBox(remote.rect);
    await page.click('#remote-close');
    assert.equal(await page.evaluate(() => window.livefxCamera.remoteOpen), false, '✕ closes the box');
    const withoutBox = await blackUnderBox(remote.rect);
    assert.ok(withBox.area > 1000, `box lies over the picture area (${withBox.area} px)`);
    assert.ok(Math.abs(withBox.black - withoutBox.black) < withBox.area * 0.01, `composited frame unchanged by the QR box (${withBox.black} vs ${withoutBox.black} black px)`);
    await page.selectOption('#cam-device', camId || '');
    await page.waitForFunction(() => window.livefxCamera.state.camera === 'on' && document.querySelector('#cam').videoWidth > 0, null, { timeout: 5000 });
    // a recording closes the box and locks the button until it ends
    await page.click('#btn-remote');
    await page.waitForFunction(() => window.livefxCamera.remoteOpen);
    const lock = await page.evaluate(async () => {
      const cam = window.livefxCamera;
      const done = cam.startRecording({ mic: false, fx: false });
      const during = { open: cam.remoteOpen, disabled: document.querySelector('#btn-remote').disabled };
      await new Promise((r) => setTimeout(r, 600));
      const later = { open: cam.remoteOpen, disabled: document.querySelector('#btn-remote').disabled };
      await cam.openRemote(); // refused while recording
      const refused = cam.remoteOpen;
      await cam.stopRecording();
      await done;
      document.querySelector('#rec-close').click();
      return { during, later, refused, after: document.querySelector('#btn-remote').disabled };
    });
    assert.deepEqual(lock, { during: { open: false, disabled: true }, later: { open: false, disabled: true }, refused: false, after: false }, `recording closes + locks the QR box: ${JSON.stringify(lock)}`);
    // clean mode (H / output window) never shows it
    await page.click('#btn-remote');
    await page.waitForFunction(() => window.livefxCamera.remoteOpen);
    await page.keyboard.press('h');
    assert.equal(await page.locator('#remote-qr').isVisible(), false, 'clean mode hides the QR box');
    await page.keyboard.press('h');
    log('📱 Fernbedienung QR: outside the picture, not composited, closed while recording / in clean mode');

    // (i) panel: camera card + record link, Story-Stil / Band-Position selects send layout messages
    const panel = await ctx.newPage();
    panel.on('pageerror', (e) => errors.push(`panel: ${e.message}`));
    await panel.goto(`${base}/`);
    await panel.waitForSelector('#pad button');
    await panel.evaluate(() => window.livefx.ready);
    assert.match(await panel.textContent('#camera-card h2'), /Kamera-Ansicht/);
    assert.match(await panel.textContent('#camera-url'), /\/camera\.html$/);
    assert.equal(await panel.getAttribute('#camera-open', 'href'), 'camera.html');
    await fx.evaluate(() => {
      window.__msgs = [];
      window.livefx.bus.onMessage((m) => window.__msgs.push(m));
    });
    await panel.selectOption('#story-style', 'sketch');
    await fx.waitForFunction(() => window.__msgs.some((m) => m.type === 'layout' && m.storyStyle === 'sketch'), null, { timeout: 3000 });
    await panel.selectOption('#band-position', 'chat');
    await fx.waitForFunction(() => window.__msgs.some((m) => m.type === 'layout' && m.bandPosition === 'chat'), null, { timeout: 3000 });
    const lay = await fx.evaluate(() => window.__msgs.filter((m) => m.type === 'layout').pop());
    assert.equal(lay.storyLayout, 'band', 'existing layout keys stay in the message');
    assert.equal(lay.zone, 'edges');
    assert.deepEqual(await panel.evaluate(() => window.livefx.storyLook.get()), { storyStyle: 'sketch', bandPosition: 'chat' });
    assert.deepEqual(await panel.evaluate(() => window.livefx.layout.get()), { storyLayout: 'band', band: 22, zone: 'edges' }, 'layout triple unchanged');
    const [popup] = await Promise.all([ctx.waitForEvent('page'), panel.click('#btn-camera-record')]);
    await popup.waitForLoadState('domcontentloaded');
    assert.match(popup.url(), /\/camera\.html\?record=1$/);
    await popup.waitForFunction(() => window.livefxCamera && document.body.classList.contains('record-mode'), null, { timeout: 5000 });
    await popup.close();
    // 2.3 „✏️ Zeichenfilm“: camera view without a webcam, story style sketch pinned, record mode (Live-Mikro requested)
    const [film] = await Promise.all([ctx.waitForEvent('page'), panel.click('#btn-camera-sketch')]);
    film.on('pageerror', (e) => errors.push(`zeichenfilm: ${e.message}`));
    await film.waitForLoadState('domcontentloaded');
    assert.match(film.url(), /\/camera\.html\?cam=off&storystyle=sketch&story=full&mic=1&record=1$/);
    await film.waitForFunction(() => window.livefxCamera && window.livefxCamera.state.camera === 'off' && document.body.classList.contains('record-mode'), null, { timeout: 5000 });
    const filmFx = film.frame({ url: /overlay\.html/ });
    await filmFx.waitForFunction(() => window.livefx && window.livefx.renderer.layout.storyStyle === 'sketch', null, { timeout: 5000 });
    await film.close();
    const saved = await panel.evaluate(() => JSON.parse(localStorage.getItem('livefx.camera') || '{}'));
    assert.ok(saved.deviceId !== 'off' && saved.storyStyle !== 'sketch', `Zeichenfilm link does not stick to plain camera.html: ${JSON.stringify(saved)}`);
    await panel.evaluate(() => window.livefx.storyLook.set({ storyStyle: 'mixed', bandPosition: 'bottom' }));
    log('panel camera card + Story-Stil / Band-Position ok');

    // (j) phone: 9:16 fits above the toolbar, no horizontal scroll
    const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    try {
      const phone = await pctx.newPage();
      phone.on('pageerror', (e) => errors.push(`phone: ${e.message}`));
      await phone.goto(`${base}/camera.html?aspect=9:16&record=1`);
      await phone.waitForFunction(() => window.livefxCamera, null, { timeout: 5000 });
      await phone.evaluate(() => window.livefxCamera.ready.then(() => true));
      const pg = await phone.evaluate(() => {
        const r = document.querySelector('#frame').getBoundingClientRect();
        const bar = document.querySelector('#bar').getBoundingClientRect();
        return { sw: document.documentElement.scrollWidth, iw: innerWidth, ratio: r.width / r.height, left: r.left, right: r.right, bottom: r.bottom, barTop: bar.top, camera: window.livefxCamera.state.camera };
      });
      assert.ok(pg.sw <= pg.iw, `no horizontal scroll on the phone (${pg.sw} <= ${pg.iw})`);
      assert.ok(Math.abs(pg.ratio - 9 / 16) < 0.01 && pg.left >= 0 && pg.right <= pg.iw + 0.5 && pg.bottom <= pg.barTop + 1, `phone frame: ${JSON.stringify(pg)}`);
      assert.equal(pg.camera, 'on');
      await phone.screenshot({ path: path.join(shotDir, '37-camera-phone.png') });
    } finally {
      await pctx.close();
    }
    log('phone 9:16 layout ok');

    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  } finally {
    await ctx.close();
    await server.stop();
  }
}

module.exports = { run };
