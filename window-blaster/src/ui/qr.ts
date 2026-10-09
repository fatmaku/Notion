import { encode } from 'uqr';

/** QR module matrix (true = dark), including a 4-module quiet zone. */
export function qrMatrix(text: string): boolean[][] {
  // level M like the Mac launcher: survives a glossy phone screen and a slightly shaky camera
  return encode(text, { ecc: 'M', border: 4 }).data;
}

/**
 * QR code as an inline SVG, black on white. Always place it on a white card – in see-through
 * glasses mode black is transparent, and phone cameras need the dark-on-light contrast anyway.
 */
export function qrSvg(text: string, label = 'QR-Code'): SVGSVGElement {
  const m = qrMatrix(text);
  const n = m.length;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${n} ${n}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  const bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('width', String(n));
  bg.setAttribute('height', String(n));
  bg.setAttribute('fill', '#fff');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('fill', '#000');
  path.setAttribute('d', qrPath(m));
  svg.append(bg, path);
  return svg;
}

/** One SVG path for all dark modules; horizontal runs are merged to keep the path short. */
export function qrPath(m: boolean[][]): string {
  let d = '';
  for (let y = 0; y < m.length; y++) {
    const row = m[y];
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let run = 1;
      while (x + run < row.length && row[x + run]) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  return d;
}
