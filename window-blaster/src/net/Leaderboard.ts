import type { GameModeId } from '../core/types';
import type { RoundResult } from '../game/GameMode';

export interface LeaderboardEntry {
  name: string;
  score: number;
  vehicle: string;
  flag?: string;
  at: number;
  me?: boolean;
}

export interface SubmitResponse {
  ok: boolean;
  rank?: number;
  weeklyRank?: number;
  verifiedScore?: number;
  error?: string;
}

/**
 * Client for the optional global leaderboard (see server/leaderboard-worker).
 * When no URL is configured the app keeps working with local records only.
 */
export class Leaderboard {
  constructor(
    readonly baseUrl: string | undefined,
    private readonly playerId: string,
  ) {}

  get configured(): boolean {
    return !!this.baseUrl;
  }

  async top(mode: GameModeId, period: 'week' | 'all', limit = 25): Promise<LeaderboardEntry[]> {
    if (!this.baseUrl) return [];
    const u = new URL(`${this.baseUrl.replace(/\/$/, '')}/top`);
    u.searchParams.set('mode', mode);
    u.searchParams.set('period', period);
    u.searchParams.set('limit', String(limit));
    u.searchParams.set('me', this.playerId);
    const res = await fetch(u, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`leaderboard ${res.status}`);
    const data = (await res.json()) as { entries: LeaderboardEntry[] };
    return data.entries;
  }

  async submit(name: string, r: RoundResult): Promise<SubmitResponse> {
    if (!this.baseUrl) return { ok: false, error: 'not-configured' };
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId: this.playerId, name, round: r, client: { v: __APP_VERSION__, lang: navigator.language } }),
    });
    const data = (await res.json().catch(() => ({}))) as SubmitResponse;
    return { ...data, ok: res.ok && data.ok !== false };
  }
}

export function ensurePlayerId(get: () => string | null, set: (v: string) => void): string {
  let id = get();
  if (!id) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    set(id);
  }
  return id;
}
