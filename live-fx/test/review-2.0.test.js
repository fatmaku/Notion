// Regression tests from the 2.0 adversarial review of the viewer-trigger server parts
// (server/api-chat.js, api-gift.js, chat-twitch.js, chat-youtube.js, sse.js, api-fire.js, server.js, sw.js).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer, api, sseClient, waitFor } = require('./helpers/server');
const { startWsServer } = require('./helpers/ws-server');
const twitchMod = require('../server/chat-twitch');
const youtubeMod = require('../server/chat-youtube');
const apiChat = require('../server/api-chat');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const auth = { token: 'test-token' };
const ROOT = path.join(__dirname, '..');

/** In-process chat module with a stub bus/state (no server). */
function stubChat(triggers = [{ id: 'lol', label: 'LOL', enabled: true }, { id: 'off', label: 'Off', enabled: false }]) {
  const sent = [];
  const ctx = {
    bus: { broadcast: (m, o) => sent.push({ m, o }) },
    state: { getTriggers: () => triggers, matcher: { fireById: (id) => (id === 'off' ? { trigger: null, blocked: 'disabled' } : { trigger: triggers.find((t) => t.id === id), blocked: null }) } },
  };
  const chat = apiChat.createChat(ctx);
  chat.update({ cooldownPerUserMs: 0, cooldownGlobalMs: 0 });
  return { chat, sent };
}

// ---------------------------------------------------------------------------------------------
// api-chat.js
// ---------------------------------------------------------------------------------------------
test('review: !constructor / __proto__ never resolve through Object.prototype', () => {
  const { chat, sent } = stubChat();
  chat.update({ prefix: 'c' });
  const r = chat.ingest({ platform: 'test', user: 'x', text: 'constructor' });
  assert.equal(r.trigger, null);
  assert.equal(r.reason, null, 'nothing mapped -> no blocked reason');
  chat.update({ prefix: '_' });
  const r2 = chat.ingest({ platform: 'test', user: 'x', text: '__proto__' });
  assert.equal(r2.trigger, null);
  assert.ok(!sent.some((e) => e.m.type === 'fire'), 'nothing fired');
  // the commands map cannot be given a dangerous key either
  const m = apiChat.mergeSettings(JSON.parse(JSON.stringify(apiChat.DEFAULTS)), { prefix: '_', commands: { __proto__: 'lol', _proto_: 'lol' } });
  assert.deepEqual(Object.keys(m.settings.commands), ['_proto_'], '__proto__ dropped, harmless key kept');
  assert.equal(Object.getPrototypeOf(m.settings.commands), Object.prototype);
});

test('review: changing only the prefix re-keys the stored commands', () => {
  const { chat } = stubChat();
  chat.update({ prefix: '!', commands: { '!lol': 'lol' } });
  chat.update({ prefix: '#' });
  assert.deepEqual(chat.settings.commands, { '#lol': 'lol' });
  assert.equal(chat.resolveCommand('#lol'), 'lol');
  // prefix + commands together: the sent commands win (keys get the new prefix)
  chat.update({ prefix: '!', commands: { wow: 'lol' } });
  assert.deepEqual(chat.settings.commands, { '!wow': 'lol' });
});

test('review: control characters are stripped from user / text / platform, warnings are capped', () => {
  const { chat, sent } = stubChat();
  chat.update({ commands: { '!lol': 'lol' } });
  const r = chat.ingest({ platform: 'test', user: 'a\u0007b\r\nc', text: '!lol\u0000 \u009fhi\u001b[31m' });
  assert.equal(r.user, 'abc');
  assert.equal(r.text, '!lol hi[31m');
  assert.equal(r.fired, 'lol');
  const chatMsg = sent.find((e) => e.m.type === 'chat').m;
  assert.equal(chatMsg.user, 'abc');
  const g = chat.gift({ platform: 'ti\u0000ktok', user: 'F\u0001an', amount: 1, currency: 'E\nUR', gift: 'ro\rse' });
  assert.deepEqual([g.platform, g.user, g.currency, g.gift], ['tiktok', 'Fan', 'EUR', 'rose']);
  const cmds = {};
  for (let i = 0; i < 3000; i++) cmds[`bad key ${i}`] = 'lol';
  const { warnings } = chat.update({ commands: cmds });
  assert.ok(warnings.length <= 21, `warnings capped (${warnings.length})`);
  assert.match(warnings[warnings.length - 1], /weitere/);
});

test('review: bits must be a plain integer (no 1e308, 0x10, Infinity)', () => {
  assert.equal(twitchMod.parseLine('@bits=1e308 :a!a@a PRIVMSG #c :x').bits, undefined);
  assert.equal(twitchMod.parseLine('@bits=0x10 :a!a@a PRIVMSG #c :x').bits, undefined);
  assert.equal(twitchMod.parseLine('@bits=Infinity :a!a@a PRIVMSG #c :x').bits, undefined);
  assert.equal(twitchMod.parseLine('@bits=-5 :a!a@a PRIVMSG #c :x').bits, undefined);
  assert.equal(twitchMod.parseLine('@bits=250 :a!a@a PRIVMSG #c :x').bits, 250);
  const { chat, sent } = stubChat();
  chat.ingest({ platform: 'twitch', user: 'x', text: 'cheer', bits: 1e300 });
  chat.ingest({ platform: 'twitch', user: 'x', text: 'cheer', bits: 2.5 });
  assert.ok(!sent.some((e) => e.m.type === 'gift'), 'absurd bits values are not gifts');
  chat.ingest({ platform: 'twitch', user: 'x', text: 'cheer', bits: 100 });
  assert.equal(sent.filter((e) => e.m.type === 'gift').length, 1);
});

test('review: allowAll label slug cannot fire a disabled trigger', () => {
  const { chat, sent } = stubChat();
  chat.update({ allowAll: true });
  const r = chat.ingest({ platform: 'test', user: 'x', text: '!off' });
  assert.equal(r.trigger, 'off');
  assert.equal(r.reason, 'disabled');
  assert.ok(!sent.some((e) => e.m.type === 'fire'));
  // gifts: force bypasses cooldowns but not `enabled`
  const g = chat.update({ gifts: { tiers: [{ min: 1, trigger: 'off' }] } }) && chat.gift({ platform: 'test', user: 'x', amount: 5 });
  assert.equal(g.reason, 'disabled');
  assert.equal(g.fired, null);
});

// ---------------------------------------------------------------------------------------------
// chat-twitch.js
// ---------------------------------------------------------------------------------------------
test('review: twitch parser survives malformed lines, escapes and long input', () => {
  for (const line of ['@', ':', '@a=b', '@a=b :x', '   ', 'PRIVMSG', '@=;;=:= :!@ PRIVMSG', '\r\n', ':a!b@c PRIVMSG', '@a=\\ :x!x@x PRIVMSG #c :\\', 'x'.repeat(100000)]) {
    assert.doesNotThrow(() => twitchMod.parseLine(line), line.slice(0, 20));
  }
  const p = twitchMod.parseLine('@display-name=A\\sB\\:C\\\\D\\rE\\nF\\qG;bits=;id=1 :a!a@a PRIVMSG #c :héllo 👋 \r\n');
  assert.equal(p.user, 'A B;C\\D\rE\nFqG');
  assert.equal(p.text, 'héllo 👋 ');
  assert.equal(p.bits, undefined);
  const noPrefix = twitchMod.parseLine('@a=b PRIVMSG #c :hi');
  assert.equal(noPrefix.user, '');
  assert.equal(noPrefix.channel, 'c');
});

test('review: twitch connect watchdog drops a socket that never opens, stop() cancels everything', async () => {
  const created = [];
  class NeverOpens {
    constructor() {
      this.readyState = 0;
      this.closed = false;
      this.listeners = {};
      created.push(this);
    }
    addEventListener(ev, fn) {
      (this.listeners[ev] = this.listeners[ev] || []).push(fn);
    }
    send() {}
    close() {
      this.closed = true;
    }
  }
  const states = [];
  const tw = twitchMod.createTwitchChat({ channel: 'x', WebSocketImpl: NeverOpens, connectTimeoutMs: 60, backoffMinMs: 30, backoffMaxMs: 40, onState: (s, d) => states.push([s, d]) });
  tw.start();
  assert.equal(created.length, 1);
  await waitFor(() => created.length >= 2, { what: 'second connection attempt after the watchdog' });
  assert.ok(created[0].closed, 'first socket closed by the watchdog');
  assert.ok(states.some(([s, d]) => s === 'disconnected' && /Zeit/.test(d)));
  tw.stop();
  const n = created.length;
  await sleep(250);
  assert.equal(created.length, n, 'no reconnect after stop()');
  assert.equal(tw.state, 'off');
  assert.ok(created.every((s) => s.closed));
});

test('review: twitch reconnect backoff is bounded and stops after stop()', async (t) => {
  const srv = await startWsServer();
  t.after(() => srv.close());
  let conns = 0;
  srv.onConnection((c) => {
    conns++;
    setTimeout(() => c.close(), 5);
  });
  const tw = twitchMod.createTwitchChat({ channel: 'x', url: srv.url, backoffMinMs: 20, backoffMaxMs: 40 });
  t.after(() => tw.stop());
  tw.start();
  await waitFor(() => conns >= 4, { what: 'four attempts' });
  tw.stop();
  const n = conns;
  await sleep(200);
  assert.equal(conns, n, 'no connection attempts after stop()');
});

test('review: twitch drops an oversized partial line instead of buffering forever', async (t) => {
  const srv = await startWsServer();
  t.after(() => srv.close());
  const msgs = [];
  const tw = twitchMod.createTwitchChat({ channel: 'x', url: srv.url, onMessage: (m) => msgs.push(m) });
  t.after(() => tw.stop());
  tw.start();
  const conn = await srv.nextConnection();
  await conn.next(/^JOIN/);
  conn.send('y'.repeat(70000)); // no newline
  conn.send(' still no newline');
  conn.send('\r\n:a!a@a PRIVMSG #x :after garbage\r\n');
  await waitFor(() => msgs.length >= 1, { what: 'message after the garbage' });
  assert.equal(msgs[0].text, 'after garbage');
  assert.equal(msgs.length, 1);
});

// ---------------------------------------------------------------------------------------------
// chat-youtube.js
// ---------------------------------------------------------------------------------------------
function ytFetch({ onMessages, onVideos } = {}) {
  return async (u, opts) => {
    const url = new URL(u);
    if (url.pathname.endsWith('/videos')) return onVideos ? onVideos(url, opts) : { ok: true, status: 200, json: async () => ({ items: [{ id: 'v', liveStreamingDetails: { activeLiveChatId: 'C1' } }] }) };
    return onMessages(url, opts);
  };
}

test('review: a huge pollingIntervalMillis is clamped (no setTimeout overflow hot loop)', async (t) => {
  let polls = 0;
  const yt = youtubeMod.createYouTubeChat({ apiKey: 'k', videoId: 'abcdefghijk', fetchImpl: ytFetch({ onMessages: () => (polls++, { ok: true, status: 200, json: async () => ({ pollingIntervalMillis: 2 ** 40, items: [] }) }) }) });
  t.after(() => yt.stop());
  yt.start();
  await waitFor(() => polls >= 1, { what: 'first poll' });
  await sleep(400);
  assert.equal(polls, 1, `only one poll within 400 ms (got ${polls})`);
  assert.equal(youtubeMod.MAX_POLL_MS, 60000);
});

test('review: stop() aborts the in-flight YouTube request; errors never carry the API key', async () => {
  let signal = null;
  const yt = youtubeMod.createYouTubeChat({
    apiKey: 'SECRET-KEY-123',
    videoId: 'abcdefghijk',
    fetchImpl: ytFetch({ onVideos: (url, opts) => new Promise(() => (signal = opts.signal)) }),
  });
  yt.start();
  await waitFor(() => signal, { what: 'request started' });
  assert.equal(signal.aborted, false);
  yt.stop();
  assert.equal(signal.aborted, true, 'in-flight request aborted');
  assert.equal(yt.state, 'off');

  const states = [];
  const yt2 = youtubeMod.createYouTubeChat({
    apiKey: 'SECRET-KEY-123',
    videoId: 'abcdefghijk',
    log: (l) => states.push(['log', l]),
    onState: (s, d) => states.push([s, d]),
    fetchImpl: ytFetch({
      onVideos: (url) => {
        throw new Error(`request to ${url} failed`);
      },
    }),
  });
  yt2.start();
  await waitFor(() => states.some(([s]) => s === 'error'), { what: 'error state' });
  yt2.stop();
  assert.ok(!JSON.stringify(states).includes('SECRET-KEY-123'), `key leaked: ${JSON.stringify(states)}`);
  assert.ok(JSON.stringify(states).includes('[key]'));
});

test('review: 403 stops polling for good, other errors retry; stop() during the retry wait', async () => {
  let calls = 0;
  const seen = [];
  const yt = youtubeMod.createYouTubeChat({
    apiKey: 'k',
    videoId: 'abcdefghijk',
    onState: (s, d) => seen.push([s, d]),
    fetchImpl: ytFetch({ onMessages: () => (calls++, { ok: false, status: 403, json: async () => ({ error: { message: 'forbidden', errors: [{ reason: 'quotaExceeded' }] } }) }) }),
  });
  yt.start();
  await waitFor(() => seen.some(([s]) => s === 'error'), { what: 'error' });
  assert.equal(yt.state, 'error');
  assert.match(yt.lastError, /forbidden/);
  await sleep(100);
  assert.equal(calls, 1, 'no further polling after 403');
  yt.stop();
  assert.equal(yt.state, 'off');
});

// ---------------------------------------------------------------------------------------------
// routes / SSE / shutdown against the real server
// ---------------------------------------------------------------------------------------------
test('review: server routes', async (t) => {
  const ws = await startWsServer();
  t.after(() => ws.close());
  // The ws helper answers plain HTTP with 426 – a local, network-free error path for the YouTube poller.
  const server = await startServer({ env: { LIVEFX_TWITCH_WS_URL: ws.url, LIVEFX_YOUTUBE_API_BASE: ws.url.replace('ws://', 'http://') } });
  t.after(() => server.stop());
  const { base } = server;

  await t.test('every chat / gift route requires auth', async () => {
    assert.equal((await api(base, 'GET', '/api/chat')).status, 401);
    assert.equal((await api(base, 'PUT', '/api/chat', { json: { prefix: '#' } })).status, 401);
    assert.equal((await api(base, 'POST', '/api/chat/test', { json: { text: '!lol' } })).status, 401);
    assert.equal((await api(base, 'POST', '/api/gift', { json: { amount: 1 } })).status, 401);
    // a cross-site browser request (no Bearer) is refused
    const cross = await api(base, 'GET', '/api/chat', { headers: { 'sec-fetch-site': 'cross-site', origin: 'http://evil.example' } });
    assert.equal(cross.status, 401);
  });

  await t.test('oversized PUT bodies are rejected with 413, junk types with warnings only', async () => {
    const big = await api(base, 'PUT', '/api/chat', { ...auth, json: { twitch: { channel: 'x'.repeat(1024 * 1024) } } });
    assert.equal(big.status, 413);
    const cmds = {};
    for (let i = 0; i < 10000; i++) cmds[`c${i}`] = 'lol';
    const many = await api(base, 'PUT', '/api/chat', { ...auth, json: { commands: cmds } });
    assert.equal(many.status, 200, many.text);
    assert.equal(Object.keys(many.json.settings.commands).length, 100);
    const junk = await api(base, 'PUT', '/api/chat', { ...auth, json: { commands: [], gifts: 'x', prefix: 'a b', cooldownPerUserMs: '1e400', twitch: 'nope', youtube: null } });
    assert.equal(junk.status, 200);
    assert.ok(junk.json.warnings.length >= 4, junk.text);
    assert.equal(junk.json.settings.prefix, '!');
    await api(base, 'PUT', '/api/chat', { ...auth, json: { commands: {} } });
  });

  await t.test('/api/gift rejects non-numeric amounts (bool, array, "1e400", NaN, Infinity)', async () => {
    for (const amount of [true, [], {}, '1e400', 'NaN', 'Infinity', -0.01, null, undefined, '']) {
      const r = await api(base, 'POST', '/api/gift', { ...auth, json: { amount } });
      assert.equal(r.status, 400, `amount ${JSON.stringify(amount)} -> ${r.status}`);
    }
    assert.equal((await api(base, 'POST', '/api/gift', { ...auth, json: { amount: ' 2.5 ' } })).json.amount, 2.5);
  });

  await t.test('unsorted / duplicate tier mins: highest matching tier wins', async () => {
    const put = await api(base, 'PUT', '/api/chat', { ...auth, json: { gifts: { tiers: [{ min: 10, trigger: 'wow' }, { min: 1, trigger: 'lol' }, { min: 10, trigger: 'money' }, { min: 'NaN', trigger: 'lol' }, { min: -1, trigger: 'lol' }] } } });
    assert.deepEqual(put.json.settings.gifts.tiers.map((x) => x.min), [1, 10, 10]);
    const r = await api(base, 'POST', '/api/gift', { ...auth, json: { amount: 50 } });
    assert.equal(r.json.tier, 10);
    assert.ok(['wow', 'money'].includes(r.json.trigger));
    assert.equal((await api(base, 'POST', '/api/gift', { ...auth, json: { amount: 0.5 } })).json.reason, 'no_tier');
  });

  await t.test('/fire type theme is validated; invalid themes are neither relayed nor persisted', async () => {
    const overlay = await sseClient(base, { role: 'overlay' });
    t.after(() => overlay.close());
    const first = await overlay.next('state');
    assert.equal(first.theme, null);
    const bad = await api(base, 'POST', '/fire', { ...auth, json: { type: 'theme', theme: '<img onerror=alert(1)>' } });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error, 'invalid_envelope');
    const bad2 = await api(base, 'POST', '/fire', { ...auth, json: { type: 'theme', theme: ['neon'] } });
    assert.equal(bad2.status, 400);
    const ok = await api(base, 'POST', '/fire', { ...auth, json: { type: 'theme', theme: 'pastel', extra: 'dropped' } });
    assert.equal(ok.status, 200, ok.text);
    const relayed = await overlay.next('theme');
    assert.equal(relayed.theme, 'pastel');
    assert.equal(relayed.extra, undefined);
    const again = await sseClient(base, { role: 'overlay' });
    t.after(() => again.close());
    const st = await again.next('state');
    assert.equal(st.theme, 'pastel');
    assert.deepEqual(Object.keys(st).sort(), ['id', 'overlays', 'panels', 'theme', 'ts', 'type', 'version', 'volume'], 'state carries no panel-only fields');
  });

  await t.test('panel-only chat/gift events are not replayed to an overlay via Last-Event-ID', async () => {
    const panel = await sseClient(base, { role: 'panel' });
    t.after(() => panel.close());
    await panel.next('state');
    await api(base, 'POST', '/api/chat/test', { ...auth, json: { user: 'A', text: 'hello overlay' } });
    await api(base, 'POST', '/api/gift', { ...auth, json: { amount: 3, user: 'G' } });
    const c = await panel.next('chat');
    assert.equal(c.text, 'hello overlay');
    await panel.next('gift');
    // reconnecting overlay claims to have seen nothing -> replay of the ring, filtered by audience
    const overlay = await sseClient(base, { role: 'overlay', lastEventId: 0 });
    t.after(() => overlay.close());
    await overlay.next('state');
    await sleep(150);
    const types = overlay.events.map((e) => e.msg.type);
    assert.ok(!types.includes('chat') && !types.includes('gift'), `overlay replay got ${types.join(',')}`);
    assert.ok(types.includes('fire'), 'the gift-fired trigger (audience all) is replayed');
    // the panel reconnecting does get them
    const panel2 = await sseClient(base, { role: 'panel', lastEventId: 0 });
    t.after(() => panel2.close());
    await panel2.next('chat');
  });

  await t.test('GET /api/chat never leaks the key: settings, status, warnings, recent, errors', async () => {
    const r = await api(base, 'PUT', '/api/chat', { ...auth, json: { youtube: { apiKey: 'AIza-LEAK-ME', videoId: 'abcdefghijk', enabled: true }, prefix: 'a b' } });
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('AIza-LEAK-ME'));
    await waitFor(async () => (await api(base, 'GET', '/api/chat', auth)).json.status.youtube === 'error', { what: 'youtube error state (fake API answers 426)' });
    const g = await api(base, 'GET', '/api/chat', auth);
    assert.ok(!g.text.includes('AIza-LEAK-ME'), g.text);
    assert.match(g.json.status.youtubeError, /HTTP 426/);
    await api(base, 'POST', '/api/chat/test', { ...auth, json: { user: 'AIza-LEAK-ME', text: 'AIza-LEAK-ME' } }); // the user typing it is fine, that is not the stored key
    await api(base, 'PUT', '/api/chat', { ...auth, json: { youtube: { apiKey: '', enabled: false } } });
    const g2 = await api(base, 'GET', '/api/chat', auth);
    assert.equal(g2.json.settings.youtube.hasKey, false);
    assert.equal(g2.json.status.youtube, 'off');
  });

  await t.test('SIGTERM closes the Twitch connection and exits cleanly', async () => {
    const next = ws.nextConnection();
    await api(base, 'PUT', '/api/chat', { ...auth, json: { twitch: { channel: 'bye', enabled: true } } });
    const conn = await next;
    await conn.next(/^JOIN/);
    const exited = new Promise((r) => server.proc.on('exit', (code, sig) => r({ code, sig })));
    server.proc.kill('SIGTERM');
    const res = await Promise.race([exited, sleep(1900).then(() => 'timeout')]);
    assert.deepEqual(res, { code: 0, sig: null }, `server exit: ${JSON.stringify(res)}`);
    await waitFor(() => conn.closed, { what: 'twitch socket closed on shutdown' });
  });
});

// ---------------------------------------------------------------------------------------------
// sw.js
// ---------------------------------------------------------------------------------------------
test('review: sw.js shell lists every browser file on disk, caches nothing live', () => {
  const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  // Two lists (2.1): FULL_SHELL for the panel worker, OVERLAY_SHELL for `/sw.js?shell=overlay`.
  const listOf = (name) => {
    const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(src);
    assert.ok(m, `${name} list in sw.js`);
    return [...m[1].matchAll(/'(\/[^']*)'/g)].map((x) => x[1]);
  };
  const shell = listOf('FULL_SHELL');
  assert.ok(shell.length > 20);
  const overlayShell = listOf('OVERLAY_SHELL');
  // The overlay shell is exactly what overlay.html loads (+ the page itself and the icons), nothing of the panel.
  const overlayHtml = fs.readFileSync(path.join(ROOT, 'overlay.html'), 'utf8');
  const loaded = [...overlayHtml.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)].map((m) => `/${m[1]}`);
  assert.deepEqual(loaded.sort(), ['/css/overlay.css', '/js/bus.js', '/js/fx.js', '/js/schema.js', '/js/sounds.js']);
  const icons = fs.readdirSync(path.join(ROOT, 'icons')).map((f) => `/icons/${f}`);
  assert.deepEqual(overlayShell.slice().sort(), ['/overlay.html', ...loaded, ...icons].sort(), 'OVERLAY_SHELL = overlay page + its css/js + icons');
  for (const p of overlayShell) assert.ok(shell.includes(p), `${p} is in the full shell too`);
  for (const p of ['/js/panel.js', '/js/asr.js', '/js/demo.js', '/js/whisper-worker.js', '/index.html']) assert.ok(!overlayShell.includes(p), `${p} not in the overlay shell`);
  assert.match(src, /new URLSearchParams\(self\.location\.search\)\.get\('shell'\) === 'overlay'/, 'worker picks the list from its own URL');
  assert.match(src, /livefx-overlay-v/, 'overlay worker uses its own cache');
  assert.match(overlayHtml, /register\('\/sw\.js\?shell=overlay', \{ scope: '\/overlay\.html' \}\)/, 'overlay registers the overlay shell with its own scope');
  const onDisk = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'js'))) if (f.endsWith('.js')) onDisk.push(`/js/${f}`);
  for (const f of fs.readdirSync(path.join(ROOT, 'css'))) if (f.endsWith('.css')) onDisk.push(`/css/${f}`);
  for (const f of fs.readdirSync(ROOT)) if (f.endsWith('.html')) onDisk.push(`/${f}`);
  for (const f of fs.readdirSync(path.join(ROOT, 'icons'))) onDisk.push(`/icons/${f}`);
  onDisk.push('/manifest.webmanifest');
  const missing = onDisk.filter((p) => !shell.includes(p));
  assert.deepEqual(missing, [], `browser files missing from SHELL: ${missing.join(', ')}`);
  const stale = shell.filter((p) => p !== '/' && !fs.existsSync(path.join(ROOT, p)));
  assert.deepEqual(stale, [], `SHELL entries without a file: ${stale.join(', ')}`);
  const netOnly = /const NETWORK_ONLY = (\/.*\/);/.exec(src)[1];
  const re = new RegExp(netOnly.slice(1, -1));
  for (const p of ['/api/chat', '/api/gift', '/fire', '/events', '/assets/x.mp3', '/health', '/m', '/models/x', '/docs/VIEWER.md']) assert.ok(re.test(p), `${p} must be network-only`);
  assert.ok(!shell.some((p) => p.startsWith('/api/')));
  assert.match(src, /SHELL_VERSION = '2\.0\.0'/);
});
