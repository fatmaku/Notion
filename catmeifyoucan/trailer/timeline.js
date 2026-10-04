// Cat Me If You Can – gemeinsamer Zeitplan für Bild (scene.js, Browser) und Ton (music.js, Node).
// Alle Zeiten in Sekunden. Szenen überlappen um XF (Übergang), Ereignisse sind relativ zum
// Szenenstart angegeben.

export const FPS = 30;
export const DURATION = 26;
export const XF = 0.45; // Dauer des Übergangs (Kreis-/Schiebeblende)

/** Szenenstart (global). Jede Szene bleibt sichtbar, bis die nächste sie ganz verdeckt. */
export const START = { s1: 0, s2: 2.9, s3: 6.9, s4: 10.9, s5: 15.9, s6: 20.9 };
export const ORDER = ['s1', 's2', 's3', 's4', 's5', 's6'];

export const EV = {
  s1: { l1: 0.45, l2: 0.75, eyes: [0.55, 0.95, 1.3, 1.7], blink: [1.95, 2.3, 2.6, 2.15] },
  s2: { l1: 0.5, phone: [0.1, 0.9], lock: [0.75, 1.3], throwA: 1.35, throwB: 1.9, wiggle: [1.9, 2.4], shutter: 2.5, saved: 2.7, sub: 2.75 },
  s3: { l1: 0.45, flip: [0.15, 1.0], ribbon: 1.05, typeA: 1.55, typeStep: 0.19, l2: 1.45 },
  s4: { l1: 0.45, count: [0.6, 3.05], cup: 3.2, l2: 3.3, sub: 3.6 },
  s5: { l1: 0.45, panel: [0.05, 0.75], dots: [0.4, 2.0], l2: 1.35, focus: 2.0, pop: 2.2, tap: 2.85, heart: 3.05, help: [3.25, 4.15], sub: 3.1 },
  s6: { logo: 0.3, word: 0.75, bubble: 1.25, pill: 1.5, rules: 1.75, maker: 2.0 },
};

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const eio = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** Zähler in Szene 4: 1 → 20 (u = Zeit seit Szenenstart). */
export function counterAt(u) {
  const [a, b] = EV.s4.count;
  if (u < a) return 0;
  const p = seg(u, a, b);
  // erst langsam, dann schnell, am Ende wieder ruhiger
  const q = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  return Math.min(20, 1 + Math.floor(q * 19 + 1e-6));
}

/** Zeitpunkte (global) für Soundeffekte – aus demselben Zeitplan berechnet. */
export function cues() {
  const s = START;
  const c = {
    eyes: EV.s1.eyes.map((x) => s.s1 + x),
    lock: s.s2 + EV.s2.lock[1],
    throwA: s.s2 + EV.s2.throwA,
    land: s.s2 + EV.s2.throwB,
    shutter: s.s2 + EV.s2.shutter,
    cardLand: s.s3 + EV.s3.flip[1],
    typing: Array.from({ length: 5 }, (_, i) => s.s3 + EV.s3.typeA + i * EV.s3.typeStep),
    count: [],
    ding: s.s4 + EV.s4.count[1],
    cup: s.s4 + EV.s4.cup,
    tap: s.s5 + EV.s5.tap,
    heart: s.s5 + EV.s5.heart,
    logo: s.s6 + EV.s6.logo,
  };
  let last = 0;
  for (let u = 0; u < 5; u += 0.001) {
    const n = counterAt(u);
    if (n !== last) {
      c.count.push({ t: s.s4 + u, n });
      last = n;
    }
  }
  return c;
}
