// Window Blaster – global leaderboard (Cloudflare Worker + KV).
// Every submitted round is replayed with the shared scoring formulas before it
// is accepted, so a score can only be as high as its event log justifies.
import { verifyRound, type VerifyRound } from '../../../shared/verify';

export interface Env {
  SCORES: KVNamespace;
  ALLOWED_ORIGIN?: string;
}

interface Entry {
  p: string; // playerId
  n: string; // name
  s: number; // score
  v: string; // vehicle
  f: string; // flag
  at: number;
}

const MODES = new Set(['front-shooter', 'side-shooter', 'side-runner']);
const VEHICLES = new Set(['car', 'train', 'bus', 'other']);
const BOARD_SIZE = 200;

const json = (data: unknown, status = 200, origin = '*'): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': origin, 'cache-control': 'no-store' },
  });

function isoWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `w${date.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

function flagFor(country: string | undefined): string {
  if (!country || country.length !== 2) return '';
  const cc = country.toUpperCase();
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function cleanName(raw: unknown): string {
  const s = String(raw ?? '')
    .replace(/[^\p{L}\p{N} _\-.!?]/gu, '')
    .trim()
    .slice(0, 16);
  return s || 'Fahrgast';
}

async function readBoard(env: Env, key: string): Promise<Entry[]> {
  return (await env.SCORES.get<Entry[]>(key, 'json')) ?? [];
}

/** Insert/replace the player's best entry, keep the board sorted and bounded. Returns the rank (1-based). */
async function upsert(env: Env, key: string, e: Entry): Promise<number> {
  const board = await readBoard(env, key);
  const idx = board.findIndex((x) => x.p === e.p);
  if (idx >= 0) {
    if (board[idx].s >= e.s) return board.findIndex((x) => x.p === e.p) + 1;
    board.splice(idx, 1);
  }
  board.push(e);
  board.sort((a, b) => b.s - a.s || a.at - b.at);
  if (board.length > BOARD_SIZE) board.length = BOARD_SIZE;
  await env.SCORES.put(key, JSON.stringify(board));
  const rank = board.findIndex((x) => x.p === e.p) + 1;
  return rank || BOARD_SIZE + 1;
}

async function rateLimited(env: Env, key: string, limit: number, ttl: number): Promise<boolean> {
  const cur = Number((await env.SCORES.get(key)) ?? 0);
  if (cur >= limit) return true;
  await env.SCORES.put(key, String(cur + 1), { expirationTtl: ttl });
  return false;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || '*';
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        },
      });
    }

    if (url.pathname === '/health') return json({ ok: true, week: isoWeek() }, 200, origin);

    if (url.pathname === '/top' && request.method === 'GET') {
      const mode = url.searchParams.get('mode') ?? '';
      const period = url.searchParams.get('period') === 'all' ? 'all' : isoWeek();
      const vehicle = url.searchParams.get('vehicle') ?? 'all';
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 25)));
      const me = url.searchParams.get('me') ?? '';
      if (!MODES.has(mode)) return json({ error: 'mode' }, 400, origin);
      const board = await readBoard(env, `board:${mode}:${vehicle}:${period}`);
      const entries = board.slice(0, limit).map((e) => ({ name: e.n, score: e.s, vehicle: e.v, flag: e.f, at: e.at, me: !!me && e.p === me }));
      const myIdx = me ? board.findIndex((e) => e.p === me) : -1;
      return json({ entries, myRank: myIdx >= 0 ? myIdx + 1 : null, total: board.length }, 200, origin);
    }

    if (url.pathname === '/submit' && request.method === 'POST') {
      let body: { playerId?: string; name?: string; round?: VerifyRound & { mode: string; vehicle?: string } };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return json({ ok: false, error: 'json' }, 400, origin);
      }
      const playerId = String(body.playerId ?? '');
      const round = body.round;
      if (!/^[a-f0-9]{16,32}$/.test(playerId) || !round || !MODES.has(round.mode)) return json({ ok: false, error: 'bad-request' }, 400, origin);
      const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
      if (await rateLimited(env, `rl:p:${playerId}`, 1, 20)) return json({ ok: false, error: 'rate-limit' }, 429, origin);
      if (await rateLimited(env, `rl:ip:${ip}`, 40, 3600)) return json({ ok: false, error: 'rate-limit' }, 429, origin);
      const v = verifyRound(round);
      if (!v.ok) return json({ ok: false, error: `rejected:${v.reason ?? 'unknown'}` }, 422, origin);
      const vehicle = VEHICLES.has(String(round.vehicle)) ? String(round.vehicle) : 'other';
      const entry: Entry = {
        p: playerId,
        n: cleanName(body.name),
        s: v.verifiedScore,
        v: vehicle,
        f: flagFor((request as Request & { cf?: { country?: string } }).cf?.country),
        at: Date.now(),
      };
      const week = isoWeek();
      const [rank, weeklyRank] = await Promise.all([
        upsert(env, `board:${round.mode}:all:all`, entry),
        upsert(env, `board:${round.mode}:all:${week}`, entry),
        upsert(env, `board:${round.mode}:${vehicle}:all`, entry),
        upsert(env, `board:${round.mode}:${vehicle}:${week}`, entry),
      ]);
      return json({ ok: true, rank, weeklyRank, verifiedScore: v.verifiedScore }, 200, origin);
    }

    return json({ error: 'not-found' }, 404, origin);
  },
} satisfies ExportedHandler<Env>;
