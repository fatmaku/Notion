/**
 * Hot-seat "Duell": 2–4 players take turns on one phone, same mode and weapons.
 * Pure state – the App drives the flow and the screens render it.
 */
export interface PartyState {
  players: string[];
  roundsEach: number;
  /** scores[player][round] */
  scores: number[][];
  /** index of the player whose turn is next */
  turn: number;
  /** index of the player who played the most recent round (-1 before the first) */
  last: number;
}

export interface Standing {
  player: string;
  index: number;
  total: number;
  best: number;
  rounds: number[];
  rank: number;
}

export class Party {
  readonly state: PartyState;

  constructor(players: string[], roundsEach = 1) {
    const names = players.map((p, i) => p.trim() || `Spieler ${i + 1}`).slice(0, 4);
    if (names.length < 2) throw new Error('Duell braucht mindestens 2 Spieler');
    this.state = { players: names, roundsEach: Math.max(1, Math.min(5, Math.round(roundsEach))), scores: names.map(() => []), turn: 0, last: -1 };
  }

  get players(): string[] {
    return this.state.players;
  }

  /** Name of the player who plays the next round (null when the duel is over). */
  get current(): string | null {
    return this.done ? null : this.state.players[this.state.turn];
  }

  get currentIndex(): number {
    return this.state.turn;
  }

  /** 1-based round number the current player is about to play. */
  get roundNumber(): number {
    return (this.state.scores[this.state.turn]?.length ?? 0) + 1;
  }

  /** Who played the round that just ended. */
  get lastPlayer(): string | null {
    return this.state.last < 0 ? null : this.state.players[this.state.last];
  }

  get done(): boolean {
    return this.state.scores.every((s) => s.length >= this.state.roundsEach);
  }

  get playedRounds(): number {
    return this.state.scores.reduce((n, s) => n + s.length, 0);
  }

  get totalRounds(): number {
    return this.state.players.length * this.state.roundsEach;
  }

  /** Books the finished round for the current player and advances the turn (round-robin). */
  record(score: number): void {
    if (this.done) return;
    this.state.scores[this.state.turn].push(Math.max(0, Math.round(score)));
    this.state.last = this.state.turn;
    const n = this.state.players.length;
    for (let i = 1; i <= n; i++) {
      const next = (this.state.turn + i) % n;
      if (this.state.scores[next].length < this.state.roundsEach) {
        this.state.turn = next;
        return;
      }
    }
  }

  /** Ranked by total (ties share a rank). */
  standings(): Standing[] {
    const rows = this.state.players.map((player, index) => {
      const rounds = this.state.scores[index];
      return { player, index, rounds, total: rounds.reduce((a, b) => a + b, 0), best: rounds.length ? Math.max(...rounds) : 0, rank: 1 };
    });
    rows.sort((a, b) => b.total - a.total || b.best - a.best || a.index - b.index);
    // a shared rank only when total AND best round are equal – otherwise the better single round decides
    rows.forEach((r, i) => {
      r.rank = i > 0 && rows[i - 1].total === r.total && rows[i - 1].best === r.best ? rows[i - 1].rank : i + 1;
    });
    return rows;
  }

  /** Winner(s) once the duel is over. */
  winners(): string[] {
    if (!this.done) return [];
    const s = this.standings();
    return s.filter((r) => r.rank === 1).map((r) => r.player);
  }

  /** Same players, fresh scores. */
  rematch(): Party {
    return new Party(this.state.players, this.state.roundsEach);
  }
}
