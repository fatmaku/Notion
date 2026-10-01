// Unit + integration tests for the viewer triggers (2.0): server/chat-twitch.js (fake IRC over
// WebSocket), server/chat-youtube.js (fake fetch), server/api-chat.js routes, cooldowns, API-key secrecy.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { startServer, api, sseClient, waitFor } = require('./helpers/server');
const { startWsServer } = require('./helpers/ws-server');
const twitchMod = require('../server/chat-twitch');
const youtubeMod = require('../server/chat-youtube');
const apiChat = require('../server/api-chat');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const auth = { token: 'test-token' };

// ---------------------------------------------------------------------------------------------
// chat-twitch.js
// ---------------------------------------------------------------------------------------------
test('twitch: parseLine handles tags, PRIVMSG, PING and bits', () => {
  const p = twitchMod.parseLine('@badge-info=;display-name=Cool\\sName;bits=250;id=abc :cool!cool@cool.tmi.twitch.tv PRIVMSG #chan :hello :) world\r\n');
  assert.equal(p.command, 'PRIVMSG');
  assert.equal(p.user, 'Cool Name');
  assert.equal(p.login, 'cool');
  assert.equal(p.channel, 'chan');
  assert.equal(p.text, 'hello :) world');
  assert.equal(p.bits, 250);
  const ping = twitchMod.parseLine('PING :tmi.twitch.tv');
  assert.equal(ping.command, 'PING');
  assert.equal(ping.trailing, 'tmi.twitch.tv');
  const noTags = twitchMod.parseLine(':nick!nick@nick.tmi.twitch.tv PRIVMSG #x :!airhorn');
  assert.equal(noTags.user, 'nick');
  assert.equal(noTags.text, '!airhorn');
  assert.equal(twitchMod.parseLine(''), null);
  assert.equal(twitchMod.normalizeChannel('https://www.twitch.tv/SomeOne/'), 'someone');
  assert.equal(twitchMod.normalizeChannel('#Foo_Bar'), 'foo_bar');
  assert.equal(twitchMod.normalizeChannel('bad name!'), '');
});

test('twitch: connects to a fake IRC server, joins, answers PING, reports PRIVMSG, reconnects', async (t) => {
  const srv = await startWsServer();
  t.after(() => srv.close());
  const msgs = [];
  const states = [];
  const tw = twitchMod.createTwitchChat({ channel: 'TestStreamer', url: srv.url, backoffMinMs: 50, backoffMaxMs: 100, onMessage: (m) => msgs.push(m), onState: (s) => states.push(s) });
  t.after(() => tw.stop());
  tw.start();
  const conn = await srv.nextConnection();
  assert.match(await conn.next(/^CAP REQ/), /twitch\.tv\/tags/);
  assert.match(await conn.next(/^NICK/), /^NICK justinfan\d+/);
  assert.equal((await conn.next(/^JOIN/)).trim(), 'JOIN #teststreamer');
  conn.send(':tmi.twitch.tv 001 justinfan1 :Welcome, GLHF!\r\n');
  await waitFor(() => tw.state === 'connected', { what: 'connected' });
  conn.send('PING :tmi.twitch.tv\r\n');
  assert.equal((await conn.next(/^PONG/)).trim(), 'PONG :tmi.twitch.tv');
  // two lines in one frame + a line split over two frames
  conn.send('@display-name=Viewer1 :viewer1!viewer1@viewer1.tmi.twitch.tv PRIVMSG #teststreamer :!lol hi\r\n:other!other@other.tmi.twitch.tv PRIVMSG #otherchan :not for us\r\n');
  conn.send('@bits=100 :cheerer!cheerer@cheerer.tmi.twitch.tv PRIVMSG #teststreamer :cheer100 ');
  conn.send('nice!\r\n');
  await waitFor(() => msgs.length >= 2, { what: 'two PRIVMSGs' });
  assert.equal(msgs.length, 2, 'the message for another channel is ignored');
  assert.deepEqual({ platform: msgs[0].platform, user: msgs[0].user, text: msgs[0].text, login: msgs[0].login }, { platform: 'twitch', user: 'Viewer1', text: '!lol hi', login: 'viewer1' });
  assert.equal(msgs[1].text, 'cheer100 nice!');
  assert.equal(msgs[1].bits, 100);
  assert.equal(tw.messages, 2);

  // server drops the connection -> disconnected, then a fresh connection with JOIN
  conn.close();
  await waitFor(() => states.includes('disconnected'), { what: 'disconnected state' });
  const conn2 = await srv.nextConnection();
  assert.equal((await conn2.next(/^JOIN/)).trim(), 'JOIN #teststreamer');
  tw.stop();
  assert.equal(tw.state, 'off');
});

test('twitch: invalid channel -> error state without connecting', () => {
  const states = [];
  const tw = twitchMod.createTwitchChat({ channel: 'no spaces here', url: 'ws://127.0.0.1:1', onState: (s, d) => states.push([s, d]) });
  tw.start();
  assert.equal(tw.state, 'error');
  assert.match(states[0][1], /Kanalname/);
  tw.stop();
});

// ---------------------------------------------------------------------------------------------
// chat-youtube.js
// ---------------------------------------------------------------------------------------------
function fakeYouTube({ chatId = 'CHAT1', pages } = {}) {
  const calls = [];
  let page = 0;
  const fetchImpl = async (u) => {
    const url = new URL(u);
    calls.push(url);
    const ok = (body) => ({ ok: true, status: 200, json: async () => body });
    if (url.pathname.endsWith('/videos')) {
      if (url.searchParams.get('id') === 'nolive') return ok({ items: [{ id: 'nolive', liveStreamingDetails: {} }] });
      if (url.searchParams.get('id') === 'missing') return ok({ items: [] });
      return ok({ items: [{ id: url.searchParams.get('id'), liveStreamingDetails: { activeLiveChatId: chatId } }] });
    }
    if (url.pathname.endsWith('/liveChat/messages')) {
      if (url.searchParams.get('key') === 'bad') return { ok: false, status: 403, json: async () => ({ error: { message: 'quota', errors: [{ reason: 'quotaExceeded' }] } }) };
      const p = pages[Math.min(page, pages.length - 1)];
      page++;
      return ok(p);
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { fetchImpl, calls };
}

const now = () => new Date().toISOString();

test('youtube: resolves liveChatId, delivers messages + a super chat as gift, honours pollingIntervalMillis', async (t) => {
  const pages = [
    {
      pollingIntervalMillis: 2000,
      nextPageToken: 'TOK1',
      items: [
        { id: 'm1', snippet: { type: 'textMessageEvent', publishedAt: now(), displayMessage: '!airhorn', textMessageDetails: { messageText: '!airhorn' } }, authorDetails: { displayName: 'Ayşe' } },
        { id: 'old', snippet: { type: 'textMessageEvent', publishedAt: new Date(Date.now() - 60000).toISOString(), textMessageDetails: { messageText: 'from before we joined' } }, authorDetails: { displayName: 'Old' } },
        {
          id: 'sc',
          snippet: { type: 'superChatEvent', publishedAt: now(), displayMessage: '€5,00 from Mehmet: "danke"', superChatDetails: { amountMicros: '5000000', currency: 'EUR', amountDisplayString: '€5,00', userComment: 'danke' } },
          authorDetails: { displayName: 'Mehmet' },
        },
      ],
    },
    { pollingIntervalMillis: 2000, nextPageToken: 'TOK2', items: [{ id: 'm2', snippet: { type: 'textMessageEvent', publishedAt: now(), textMessageDetails: { messageText: 'second poll' } }, authorDetails: { displayName: 'B' } }] },
  ];
  const yt_ = fakeYouTube({ pages });
  const msgs = [];
  const gifts = [];
  const states = [];
  const yt = youtubeMod.createYouTubeChat({ apiKey: 'k', videoId: 'https://www.youtube.com/watch?v=abc123XYZ_-', fetchImpl: yt_.fetchImpl, onMessage: (m) => msgs.push(m), onGift: (g) => gifts.push(g), onState: (s) => states.push(s) });
  t.after(() => yt.stop());
  assert.equal(yt.videoId, 'abc123XYZ_-');
  yt.start();
  await waitFor(() => msgs.length >= 1 && gifts.length >= 1, { what: 'first poll' });
  assert.equal(yt.liveChatId, 'CHAT1');
  assert.equal(yt_.calls[0].searchParams.get('part'), 'liveStreamingDetails');
  assert.equal(yt_.calls[0].searchParams.get('key'), 'k');
  assert.equal(yt_.calls[1].searchParams.get('liveChatId'), 'CHAT1');
  assert.deepEqual(msgs.map((m) => [m.platform, m.user, m.text]), [['youtube', 'Ayşe', '!airhorn']], 'backlog message skipped');
  assert.equal(gifts.length, 1);
  assert.deepEqual({ platform: gifts[0].platform, user: gifts[0].user, amount: gifts[0].amount, currency: gifts[0].currency, gift: gifts[0].gift, text: gifts[0].text }, { platform: 'youtube', user: 'Mehmet', amount: 5, currency: 'EUR', gift: 'superchat', text: 'danke' });
  assert.equal(yt.state, 'connected');
  // second poll only after pollingIntervalMillis (>= MIN_POLL_MS = 2000)
  await sleep(500);
  assert.equal(msgs.length, 1, 'no second poll before the interval');
  await waitFor(() => msgs.length >= 2, { timeoutMs: 5000, what: 'second poll' });
  assert.equal(msgs[1].text, 'second poll');
  assert.equal(yt_.calls[2].searchParams.get('pageToken'), 'TOK1', 'nextPageToken is carried over');
  yt.stop();
  assert.equal(yt.state, 'off');
});

test('youtube: no active chat / missing video / quota -> error state, bad input -> error without fetch', async (t) => {
  const seen = [];
  const f = fakeYouTube({ pages: [] });
  const yt2 = youtubeMod.createYouTubeChat({ apiKey: 'k', videoId: 'nolive', fetchImpl: f.fetchImpl, onState: (s, d) => seen.push([s, d]) });
  t.after(() => yt2.stop());
  yt2.start();
  await waitFor(() => seen.some(([s]) => s === 'error'), { what: 'error state' });
  assert.match(seen.find(([s]) => s === 'error')[1], /Live-Chat/);
  const yt3 = youtubeMod.createYouTubeChat({ apiKey: 'bad', videoId: 'video1', fetchImpl: fakeYouTube({ pages: [] }).fetchImpl, onState: (s, d) => seen.push([`q:${s}`, d]) });
  t.after(() => yt3.stop());
  yt3.start();
  await waitFor(() => seen.some(([s]) => s === 'q:error'), { what: 'quota error' });
  assert.match(seen.find(([s]) => s === 'q:error')[1], /quota/);
  const noKey = youtubeMod.createYouTubeChat({ apiKey: '', videoId: 'video1', fetchImpl: () => assert.fail('must not fetch') });
  noKey.start();
  assert.equal(noKey.state, 'error');
  assert.equal(youtubeMod.normalizeVideoId('https://youtu.be/dQw4w9WgXcQ?t=1'), 'dQw4w9WgXcQ');
  assert.equal(youtubeMod.normalizeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeMod.normalizeVideoId('not a video'), '');
});

// ---------------------------------------------------------------------------------------------
// api-chat.js – pure helpers
// ---------------------------------------------------------------------------------------------
test('api-chat: mergeSettings validates and never keeps junk', () => {
  const { settings, warnings } = apiChat.mergeSettings(JSON.parse(JSON.stringify(apiChat.DEFAULTS)), {
    twitch: { channel: 'https://twitch.tv/MyChan', enabled: true },
    youtube: { apiKey: ' secret ', videoId: 'https://www.youtube.com/watch?v=abcdefghijk', enabled: 'yes' },
    prefix: '!!',
    cooldownPerUserMs: -5,
    cooldownGlobalMs: '2500',
    commands: { AIRHORN: 'airhorn', '!bad id': 'x', '!remove': '', '!weird': 'not valid id!!', 'with space': 'lol' },
    allowAll: true,
    gifts: { tiers: [{ min: 100, trigger: 'wow' }, { min: 1, trigger: 'lol' }, { min: 'x', trigger: 'lol' }] },
    unknown: 1,
  });
  assert.equal(settings.twitch.channel, 'mychan');
  assert.equal(settings.twitch.enabled, true);
  assert.equal(settings.youtube.apiKey, 'secret');
  assert.equal(settings.youtube.videoId, 'abcdefghijk');
  assert.equal(settings.youtube.enabled, false, 'non-boolean enabled is false');
  assert.equal(settings.prefix, '!!');
  assert.equal(settings.cooldownPerUserMs, 15000, 'negative cooldown rejected');
  assert.equal(settings.cooldownGlobalMs, 2500);
  assert.deepEqual(settings.commands, { '!!airhorn': 'airhorn' });
  assert.equal(settings.allowAll, true);
  assert.deepEqual(settings.gifts.tiers, [{ min: 1, trigger: 'lol' }, { min: 100, trigger: 'wow' }]);
  assert.equal(settings.unknown, undefined);
  assert.ok(warnings.length >= 3, warnings.join('; '));
  assert.equal(apiChat.slug("Let's go!"), 'let-s-go');
  assert.equal(apiChat.slug('Yok artık'), 'yok-artik');
  assert.equal(apiChat.commandKey('Hype', '!'), '!hype');
});

// ---------------------------------------------------------------------------------------------
// routes against the real server
// ---------------------------------------------------------------------------------------------
test('/api/chat routes', async (t) => {
  const srv = await startWsServer();
  t.after(() => srv.close());
  const server = await startServer({ env: { LIVEFX_TWITCH_WS_URL: srv.url } });
  t.after(() => server.stop());
  const { base, dataDir } = server;

  await t.test('GET without auth -> 401, with auth -> defaults', async () => {
    assert.equal((await api(base, 'GET', '/api/chat')).status, 401);
    const r = await api(base, 'GET', '/api/chat', auth);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.settings.prefix, '!');
    assert.equal(r.json.settings.youtube.hasKey, false);
    assert.equal(r.json.status.twitch, 'off');
    assert.equal(r.json.status.messages, 0);
    assert.deepEqual(r.json.recent, []);
  });

  await t.test('PUT stores commands + API key; GET never returns the key, only hasKey; file holds it', async () => {
    const r = await api(base, 'PUT', '/api/chat', { ...auth, json: { commands: { '!lol': 'lol', '!wow': 'wow' }, youtube: { apiKey: 'AIza-secret-123', videoId: 'abcdefghijk' }, cooldownPerUserMs: 400, cooldownGlobalMs: 100 } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.warnings, []);
    assert.equal(r.json.settings.youtube.hasKey, true);
    assert.equal(r.json.settings.youtube.apiKey, undefined);
    assert.ok(!r.text.includes('AIza-secret-123'), 'PUT response leaks the key');
    const g = await api(base, 'GET', '/api/chat', auth);
    assert.ok(!g.text.includes('AIza-secret-123'), 'GET response leaks the key');
    assert.equal(g.json.settings.youtube.hasKey, true);
    assert.deepEqual(g.json.settings.commands, { '!lol': 'lol', '!wow': 'wow' });
    const file = JSON.parse(fs.readFileSync(path.join(dataDir, 'chat.json'), 'utf8'));
    assert.equal(file.youtube.apiKey, 'AIza-secret-123');
    // PUT without apiKey keeps it, PUT with '' clears it
    await api(base, 'PUT', '/api/chat', { ...auth, json: { prefix: '!' } });
    assert.equal((await api(base, 'GET', '/api/chat', auth)).json.settings.youtube.hasKey, true);
    await api(base, 'PUT', '/api/chat', { ...auth, json: { youtube: { apiKey: '' } } });
    assert.equal((await api(base, 'GET', '/api/chat', auth)).json.settings.youtube.hasKey, false);
  });

  await t.test('POST /api/chat/test: command fires the trigger (SSE fire with chat source + chat event), per-user and global cooldowns', async () => {
    const overlay = await sseClient(base, { role: 'overlay' });
    const panel = await sseClient(base, { role: 'panel' });
    t.after(() => {
      overlay.close();
      panel.close();
    });
    await overlay.next('state');
    await panel.next('state');
    const r = await api(base, 'POST', '/api/chat/test', { ...auth, json: { platform: 'twitch', user: 'Ayşe', text: '!LOL that was funny' } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.fired, true);
    assert.equal(r.json.trigger, 'lol');
    assert.equal(r.json.command, '!lol');
    const fire = await overlay.next('fire');
    assert.equal(fire.trigger.id, 'lol');
    assert.equal(fire.source, 'chat:twitch:Ayşe');
    assert.ok(!Object.keys(fire.trigger).some((k) => k.startsWith('_')), 'internal keys stripped');
    const chat = await panel.next('chat');
    assert.equal(chat.platform, 'twitch');
    assert.equal(chat.user, 'Ayşe');
    assert.equal(chat.text, '!LOL that was funny');
    assert.equal(chat.fired, 'lol');
    assert.equal(chat.command, '!lol');

    // same user again within 400 ms -> user cooldown (checked before the matcher, so no 'gap')
    const r2 = await api(base, 'POST', '/api/chat/test', { ...auth, json: { platform: 'twitch', user: 'Ayşe', text: '!wow' } });
    assert.equal(r2.json.fired, false);
    assert.equal(r2.json.reason, 'cooldown:user');
    const c2 = await panel.next('chat');
    assert.equal(c2.blocked, 'cooldown:user');
    // other user right away -> global cooldown (100 ms)
    const r3 = await api(base, 'POST', '/api/chat/test', { ...auth, json: { platform: 'twitch', user: 'Mehmet', text: '!wow' } });
    assert.equal(r3.json.fired, false);
    assert.equal(r3.json.reason, 'cooldown:global');
    // overlays do not get chat events
    assert.ok(!overlay.events.some((e) => e.msg.type === 'chat'), 'chat events are panel-only');
    await sleep(1300); // user + global cooldown and the matcher's global gap (1.2 s) are over
    const r4 = await api(base, 'POST', '/api/chat/test', { ...auth, json: { platform: 'twitch', user: 'Mehmet', text: '!wow' } });
    assert.equal(r4.json.fired, true, 'other user after the global cooldown');
    // non-command text is a plain chat event
    const r5 = await api(base, 'POST', '/api/chat/test', { ...auth, json: { user: 'Mehmet', text: 'hello everyone' } });
    assert.equal(r5.json.fired, false);
    assert.equal(r5.json.command, null);
    // unknown command -> not fired, no reason (nothing mapped)
    const r6 = await api(base, 'POST', '/api/chat/test', { ...auth, json: { user: 'X', text: '!nothing' } });
    assert.equal(r6.json.fired, false);
    assert.equal(r6.json.trigger, null);
    assert.equal((await api(base, 'POST', '/api/chat/test', { ...auth, json: { text: '' } })).status, 400);
    const g = await api(base, 'GET', '/api/chat', auth);
    assert.equal(g.json.status.messages, 6);
    assert.equal(g.json.recent.length, 6);
    assert.equal(g.json.recent[0].text, '!LOL that was funny');
  });

  await t.test('allowAll: !<id> and !<label-slug> fire without an explicit mapping', async () => {
    await api(base, 'PUT', '/api/chat', { ...auth, json: { allowAll: true, cooldownPerUserMs: 0, cooldownGlobalMs: 0 } });
    await sleep(1300); // matcher global gap
    const byId = await api(base, 'POST', '/api/chat/test', { ...auth, json: { user: 'A', text: '!clap' } });
    assert.equal(byId.json.fired, true, byId.text);
    assert.equal(byId.json.trigger, 'clap');
    await sleep(1300);
    const bySlug = await api(base, 'POST', '/api/chat/test', { ...auth, json: { user: 'B', text: `!${apiChat.slug("Let's go")} please` } });
    assert.equal(bySlug.json.trigger, 'win', bySlug.text);
    assert.equal(bySlug.json.fired, true);
    await api(base, 'PUT', '/api/chat', { ...auth, json: { allowAll: false } });
    await sleep(1300);
    const off = await api(base, 'POST', '/api/chat/test', { ...auth, json: { user: 'A', text: '!clap' } });
    assert.equal(off.json.fired, false);
    assert.equal(off.json.trigger, null);
  });

  await t.test('Twitch enabled via PUT -> connector joins the fake IRC server, chat PRIVMSG fires, bits become a gift', async () => {
    const overlay = await sseClient(base, { role: 'overlay' });
    const panel = await sseClient(base, { role: 'panel' });
    t.after(() => {
      overlay.close();
      panel.close();
    });
    await overlay.next('state');
    await panel.next('state');
    const next = srv.nextConnection();
    const r = await api(base, 'PUT', '/api/chat', { ...auth, json: { twitch: { channel: 'MyStream', enabled: true }, gifts: { tiers: [{ min: 1, trigger: 'money' }] }, cooldownPerUserMs: 0, cooldownGlobalMs: 0 } });
    assert.equal(r.status, 200, r.text);
    const conn = await next;
    assert.equal((await conn.next(/^JOIN/)).trim(), 'JOIN #mystream');
    conn.send(':tmi.twitch.tv 001 justinfan1 :Welcome\r\n');
    await waitFor(async () => (await api(base, 'GET', '/api/chat', auth)).json.status.twitch === 'connected', { what: 'status connected' });
    await sleep(1300); // matcher global gap from the previous subtest
    conn.send('@display-name=Viewer :viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #mystream :!lol\r\n');
    const fire = await overlay.next('fire');
    assert.equal(fire.trigger.id, 'lol');
    assert.equal(fire.source, 'chat:twitch:Viewer');
    const chat = await panel.next('chat');
    assert.equal(chat.platform, 'twitch');
    assert.equal(chat.fired, 'lol');
    // bits: `bits=500` -> gift amount 5 (USD) -> tier min 1 -> trigger money (forced, no cooldown)
    conn.send('@display-name=Cheerer;bits=500 :cheerer!cheerer@cheerer.tmi.twitch.tv PRIVMSG #mystream :cheer500 go\r\n');
    const gift = await panel.next('gift');
    assert.equal(gift.platform, 'twitch');
    assert.equal(gift.user, 'Cheerer');
    assert.equal(gift.amount, 5);
    assert.equal(gift.gift, 'bits');
    assert.equal(gift.fired, 'money');
    const fire2 = await overlay.next('fire');
    assert.equal(fire2.trigger.id, 'money');
    assert.equal(fire2.source, 'gift:twitch:Cheerer');
    // disabling stops the connector
    await api(base, 'PUT', '/api/chat', { ...auth, json: { twitch: { enabled: false } } });
    await waitFor(() => conn.closed, { what: 'connection closed after disable' });
    assert.equal((await api(base, 'GET', '/api/chat', auth)).json.status.twitch, 'off');
  });

  await t.test('YouTube enabled via PUT -> poller hits the fake API, super chat takes the gift path', async () => {
    // tiny fake YouTube Data API over http
    const yt = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      res.setHeader('content-type', 'application/json');
      if (u.pathname.endsWith('/videos')) res.end(JSON.stringify({ items: [{ id: u.searchParams.get('id'), liveStreamingDetails: { activeLiveChatId: 'LC1' } }] }));
      else if (u.pathname.endsWith('/liveChat/messages')) {
        res.end(
          JSON.stringify({
            pollingIntervalMillis: 60000,
            nextPageToken: 'T',
            items: [
              { id: 'a', snippet: { type: 'textMessageEvent', publishedAt: new Date().toISOString(), textMessageDetails: { messageText: '!wow' } }, authorDetails: { displayName: 'Tuber' } },
              { id: 'b', snippet: { type: 'superChatEvent', publishedAt: new Date().toISOString(), superChatDetails: { amountMicros: '20000000', currency: 'EUR', userComment: 'nice stream' } }, authorDetails: { displayName: 'Rich' } },
            ],
          })
        );
      } else {
        res.statusCode = 404;
        res.end('{}');
      }
    });
    await new Promise((r) => yt.listen(0, '127.0.0.1', r));
    t.after(() => yt.close());
    const server2 = await startServer({ env: { LIVEFX_YOUTUBE_API_BASE: `http://127.0.0.1:${yt.address().port}/youtube/v3` } });
    t.after(() => server2.stop());
    const panel = await sseClient(server2.base, { role: 'panel' });
    const overlay = await sseClient(server2.base, { role: 'overlay' });
    t.after(() => {
      panel.close();
      overlay.close();
    });
    await panel.next('state');
    await overlay.next('state');
    const r = await api(server2.base, 'PUT', '/api/chat', {
      ...auth,
      json: { youtube: { apiKey: 'KEY', videoId: 'abcdefghijk', enabled: true }, commands: { '!wow': 'wow' }, gifts: { tiers: [{ min: 1, trigger: 'lol' }, { min: 10, trigger: 'money' }] } },
    });
    assert.equal(r.status, 200, r.text);
    const chat = await panel.next('chat');
    assert.equal(chat.platform, 'youtube');
    assert.equal(chat.user, 'Tuber');
    assert.equal(chat.fired, 'wow');
    const gift = await panel.next('gift');
    assert.equal(gift.platform, 'youtube');
    assert.equal(gift.amount, 20);
    assert.equal(gift.currency, 'EUR');
    assert.equal(gift.gift, 'superchat');
    assert.equal(gift.tier, 10, 'highest tier with min <= amount');
    assert.equal(gift.fired, 'money');
    const fires = [await overlay.next('fire'), await overlay.next('fire')].map((f) => f.trigger.id).sort();
    assert.deepEqual(fires, ['money', 'wow']);
    const st = (await api(server2.base, 'GET', '/api/chat', auth)).json.status;
    assert.equal(st.youtube, 'connected');
    assert.equal(st.youtubeMessages, 2);
  });
});
