import { describe, expect, it } from 'vitest';
import { mtof, stepEvents } from '../../src/audio/Music';

describe('music patterns', () => {
  it('produces valid notes for every step of both styles', () => {
    for (const style of ['action', 'runner'] as const) {
      for (let bar = 0; bar < 4; bar++) {
        for (let step = 0; step < 16; step++) {
          for (const ev of stepEvents(style, bar * 16 + step, bar, 0.9)) {
            expect(ev.len).toBeGreaterThan(0);
            expect(ev.gain).toBeGreaterThan(0);
            expect(ev.gain).toBeLessThanOrEqual(1);
            if (ev.part !== 'hat' && ev.part !== 'snare') expect(ev.freq).toBeGreaterThan(20);
          }
        }
      }
    }
  });
  it('gets denser with intensity', () => {
    const count = (i: number) => {
      let n = 0;
      for (let s = 0; s < 32; s++) n += stepEvents('action', s, Math.floor(s / 16), i).length;
      return n;
    };
    expect(count(0.9)).toBeGreaterThan(count(0.2));
  });
  it('always has a kick on the downbeat', () => {
    for (const style of ['action', 'runner'] as const) expect(stepEvents(style, 0, 0, 0).some((e) => e.part === 'kick')).toBe(true);
  });
  it('maps MIDI 69 to 440 Hz', () => {
    expect(mtof(69)).toBeCloseTo(440);
  });
});
