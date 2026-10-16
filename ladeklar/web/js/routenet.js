// "Routen-Netz": Germany's freight corridors as a living line drawing – trucks (light dots)
// travel the motorways, cities ping when a status comes in. Used on the login screen,
// the website and the trailer. Deterministic when driven by drawAt(t) (video capture).
export const CITIES = {
  HH: [10.0, 53.55, 'Hamburg'], HB: [8.8, 53.08, 'Bremen'], KI: [10.14, 54.32, 'Kiel'], HRO: [12.1, 54.09, 'Rostock'], B: [13.4, 52.52, 'Berlin'],
  H: [9.73, 52.37, 'Hannover'], MD: [11.63, 52.13, 'Magdeburg'], DO: [7.47, 51.51, 'Dortmund'], K: [6.96, 50.94, 'Köln'], KS: [9.48, 51.31, 'Kassel'],
  L: [12.37, 51.34, 'Leipzig'], DD: [13.74, 51.05, 'Dresden'], EF: [11.03, 50.98, 'Erfurt'], F: [8.68, 50.11, 'Frankfurt'], WÜ: [9.93, 49.79, 'Würzburg'],
  N: [11.08, 49.45, 'Nürnberg'], MA: [8.47, 49.49, 'Mannheim'], SB: [6.99, 49.24, 'Saarbrücken'], KA: [8.4, 49.0, 'Karlsruhe'], S: [9.18, 48.78, 'Stuttgart'],
  UL: [9.99, 48.4, 'Ulm'], M: [11.58, 48.14, 'München'], R: [12.1, 49.01, 'Regensburg'], FR: [7.85, 47.99, 'Freiburg'], OS: [8.05, 52.28, 'Osnabrück'],
};
export const ROADS = [['HH', 'HB'], ['HH', 'KI'], ['HH', 'HRO'], ['HH', 'H'], ['HH', 'B'], ['HRO', 'B'], ['B', 'MD'], ['MD', 'H'], ['B', 'L'], ['L', 'DD'], ['L', 'EF'], ['EF', 'KS'], ['H', 'KS'], ['HB', 'OS'], ['OS', 'DO'], ['H', 'DO'], ['DO', 'K'], ['K', 'F'], ['KS', 'F'], ['F', 'MA'], ['F', 'WÜ'], ['WÜ', 'N'], ['EF', 'N'], ['N', 'R'], ['R', 'M'], ['N', 'M'], ['MA', 'KA'], ['KA', 'S'], ['S', 'UL'], ['UL', 'M'], ['KA', 'FR'], ['SB', 'MA'], ['K', 'SB'], ['MA', 'S'], ['S', 'WÜ']];

function project(w, h, pad) {
  const lon0 = 5.6, lon1 = 15.2, lat0 = 47.1, lat1 = 55.2;
  const kx = Math.cos((51 * Math.PI) / 180);
  const sx = (w - pad * 2) / ((lon1 - lon0) * kx), sy = (h - pad * 2) / (lat1 - lat0);
  const s = Math.min(sx, sy);
  const ox = (w - (lon1 - lon0) * kx * s) / 2, oy = (h - (lat1 - lat0) * s) / 2;
  return ([lon, lat]) => [ox + (lon - lon0) * kx * s, oy + (lat1 - lat) * s];
}
// smooth curve between two cities (slight bend so the net looks drawn, not plotted)
function bend(a, b, seed) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const k = ((seed % 7) - 3) * 0.045;
  return [mx - dy * k, my + dx * k];
}
const qpt = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];

/**
 * Draw the net into a canvas. opts: { color, accent, glow, labels, focus:[codes], route:[from,to], alpha }
 * Returns { drawAt(tSeconds), start(), stop(), resize() }.
 */
export function routeNet(canvas, opts = {}) {
  const o = { color: '#ffffff', accent: '#e6cd92', trucks: 16, labels: false, alpha: 1, pad: 40, ...opts };
  const g = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, P = null, edges = [], trucks = [], raf = 0, t0 = performance.now();
  const rnd = (() => { let x = 1234567; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    P = project(w, h, o.pad);
    edges = ROADS.map(([a, b], i) => { const A = P(CITIES[a]), B = P(CITIES[b]); return { a, b, A, B, C: bend(A, B, i + 3) }; });
    trucks = Array.from({ length: o.trucks }, (_, i) => ({ e: Math.floor(rnd() * edges.length), off: rnd(), speed: 0.035 + rnd() * 0.05, dir: rnd() > 0.5 ? 1 : -1, hue: i % 5 === 0 }));
  }
  function drawAt(sec) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.globalAlpha = o.alpha;
    g.lineCap = 'round';
    // roads
    for (const e of edges) {
      const hot = o.route && ((e.a === o.route[0] && e.b === o.route[1]) || (e.b === o.route[0] && e.a === o.route[1]));
      g.strokeStyle = hot ? o.accent : o.color; g.globalAlpha = o.alpha * (hot ? 0.9 : 0.12); g.lineWidth = hot ? 2.4 : 1.1;
      g.beginPath(); g.moveTo(...e.A); g.quadraticCurveTo(...e.C, ...e.B); g.stroke();
    }
    // cities
    for (const [code, c] of Object.entries(CITIES)) {
      const p = P(c);
      const focus = o.focus?.includes(code);
      g.globalAlpha = o.alpha * (focus ? 1 : 0.42);
      g.fillStyle = focus ? o.accent : o.color;
      g.beginPath(); g.arc(p[0], p[1], focus ? 3.6 : 2.1, 0, Math.PI * 2); g.fill();
      // status ping
      const ph = (sec * 0.35 + (code.charCodeAt(0) % 9) / 9) % 1;
      if ((code.charCodeAt(0) + code.length) % 4 === 0 || focus) {
        g.globalAlpha = o.alpha * (1 - ph) * (focus ? 0.7 : 0.28);
        g.strokeStyle = o.accent; g.lineWidth = 1.2;
        g.beginPath(); g.arc(p[0], p[1], 3 + ph * (focus ? 26 : 16), 0, Math.PI * 2); g.stroke();
      }
      if (o.labels && (focus || o.labels === 'all')) {
        g.globalAlpha = o.alpha * (focus ? 0.95 : 0.4);
        const fs = (o.labelSize || 13) * (focus ? 1 : 0.85);
        g.fillStyle = o.color; g.font = `${focus ? 800 : 600} ${fs}px Manrope, system-ui, sans-serif`;
        g.fillText(c[2], p[0] + fs * 0.6, p[1] - fs * 0.45);
      }
    }
    // a highlighted tour along a list of cities (trailer / website): driven part bright, truck at pathProgress
    if (o.path && o.path.length > 1) {
      const pts = [];
      for (let i = 0; i < o.path.length - 1; i++) {
        const a = o.path[i], bb = o.path[i + 1];
        const e = edges.find((x) => (x.a === a && x.b === bb) || (x.a === bb && x.b === a));
        if (!e) continue;
        const fwd = e.a === a;
        for (let k = 0; k <= 24; k++) pts.push(qpt(fwd ? e.A : e.B, e.C, fwd ? e.B : e.A, k / 24));
      }
      const n = pts.length - 1, upto = Math.max(0, Math.min(n, Math.round((o.pathProgress ?? 1) * n)));
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.globalAlpha = o.alpha * 0.35; g.strokeStyle = o.accent; g.lineWidth = 2; g.setLineDash([3, 6]);
      g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke(); g.setLineDash([]);
      g.globalAlpha = o.alpha; g.lineWidth = 4; g.shadowColor = o.accent; g.shadowBlur = 14;
      g.beginPath(); pts.slice(0, upto + 1).forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke();
      g.shadowBlur = 0;
      const tp = pts[upto];
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(tp[0], tp[1], 7, 0, Math.PI * 2); g.fill();
      g.strokeStyle = o.accent; g.lineWidth = 3; g.beginPath(); g.arc(tp[0], tp[1], 12 + 4 * Math.sin(sec * 5), 0, Math.PI * 2); g.stroke();
    }
    // trucks with light trails
    for (const tr of trucks) {
      const e = edges[tr.e];
      let u = (tr.off + sec * tr.speed) % 1;
      if (tr.dir < 0) u = 1 - u;
      for (let k = 0; k < 9; k++) {
        const uu = Math.min(1, Math.max(0, u - tr.dir * k * 0.012));
        const p = qpt(e.A, e.C, e.B, uu);
        g.globalAlpha = o.alpha * (k === 0 ? 0.95 : 0.36 * (1 - k / 9));
        g.fillStyle = tr.hue ? o.accent : o.color;
        g.beginPath(); g.arc(p[0], p[1], k === 0 ? 2.3 : 1.6, 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  const loop = (now) => { drawAt((now - t0) / 1000); raf = requestAnimationFrame(loop); };
  resize();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return {
    drawAt, resize, project: () => P, set(patch) { Object.assign(o, patch); },
    start() { if (reduce) { drawAt(4); return; } cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
