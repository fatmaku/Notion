// LiveFX – gifts webhook (2.0): `POST /api/gift {platform, user, amount, currency?, gift?, text?}`.
//
// Anything that knows about a donation can call it with the Bearer token: TikFinity / Streamer.bot
// for TikTok gifts, Ko-fi / Streamlabs hooks, or your own script. YouTube Super Chats (chat poller)
// and Twitch bits (IRC `bits` tag) take the same path internally. The highest gift tier with
// `min <= amount` (settings `gifts.tiers` in data/chat.json) fires its trigger – cooldown-free, because
// somebody paid for it – and every panel gets `{type:'gift', …}` on SSE. See docs/VIEWER.md.
'use strict';

const { readJson, HttpError, json } = require('./router');
const { requireAuth } = require('./auth');

function str(v, max) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  return s.length > max ? s.slice(0, max) : s;
}

function register(router, ctx) {
  router.route(
    'POST',
    '/api/gift',
    requireAuth(async (req, res) => {
      const body = await readJson(req);
      if (!ctx.chat) throw new HttpError(503, 'chat_unavailable', 'Chat-Modul nicht initialisiert');
      // Only a number or a numeric string counts: `true`, `[]`, `null` would silently become 1 / 0.
      const amount = typeof body.amount === 'number' || (typeof body.amount === 'string' && body.amount.trim()) ? Number(body.amount) : NaN;
      if (!Number.isFinite(amount) || amount < 0) throw new HttpError(400, 'invalid_amount', 'amount muss eine Zahl ≥ 0 sein');
      const r = ctx.chat.gift({
        platform: str(body.platform, 20).toLowerCase() || 'other',
        user: str(body.user, 60) || 'Anonym',
        amount,
        currency: str(body.currency, 8),
        gift: str(body.gift, 40),
        text: str(body.text, 500),
      });
      json(res, 200, { ok: true, fired: !!r.fired, tier: r.tier, trigger: r.trigger, reason: r.reason, amount: r.amount });
    })
  );
}

module.exports = { register };
