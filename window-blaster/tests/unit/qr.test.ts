import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { qrMatrix, qrPath } from '../../src/ui/qr';
import { pickTargets, questLaunchUrl } from '../../src/app/shareTargets';

/** Renders a module matrix as RGBA pixels and decodes it with an independent decoder (jsQR). */
function decode(m: boolean[][], px = 4): string | null {
  const n = m.length * px;
  const data = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dark = m[Math.floor(y / px)][Math.floor(x / px)];
      const i = (y * n + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = dark ? 0 : 255;
      data[i + 3] = 255;
    }
  }
  return jsQR(data, n, n)?.data ?? null;
}

describe('QR encoder', () => {
  const samples = [
    'https://fatmaku.github.io/Notion/window-blaster/',
    'http://192.168.178.20:8080/handy',
    questLaunchUrl('https://fatmaku.github.io/Notion/window-blaster/'),
    'WIFI:T:WPA;S:Mein\\;WLAN;P:geheim\\:123;;',
    'https://example.org/?q=Umlaute äöü ß – 🚗',
  ];
  for (const s of samples) {
    it(`round-trips ${s.slice(0, 40)}`, () => {
      const m = qrMatrix(s);
      expect(m.length).toBe(m[0].length);
      expect(decode(m)).toBe(s);
    });
  }

  it('has a quiet zone of 4 light modules and merges runs in the SVG path', () => {
    const m = qrMatrix('https://fatmaku.github.io/Notion/window-blaster/');
    for (let i = 0; i < 4; i++) {
      expect(m[i].every((v) => !v)).toBe(true);
      expect(m[m.length - 1 - i].every((v) => !v)).toBe(true);
      expect(m.every((row) => !row[i] && !row[row.length - 1 - i])).toBe(true);
    }
    const d = qrPath([[true, true, true, false, true]]);
    expect(d).toBe('M0 0h3v1h-3zM4 0h1v1h-1z');
  });
});

describe('share targets', () => {
  const PUB = 'https://fatmaku.github.io/Notion/window-blaster/';
  it('on the public copy: online + Quest, never the Mac', () => {
    const t = pickTargets({ publicUrl: PUB, appRoot: PUB, publicLive: false, macSetupUrl: 'http://192.168.1.5:8080/handy', hereReachable: true });
    expect(t.map((x) => x.kind)).toEqual(['online', 'quest']);
    expect(t[1].url).toBe(`https://www.oculus.com/open_url/?url=${encodeURIComponent(PUB)}`);
  });

  it('on the Mac launcher: online first when live, then the Mac setup page', () => {
    const t = pickTargets({ publicUrl: PUB, appRoot: 'https://192.168.1.5:8443/', publicLive: true, macSetupUrl: 'http://192.168.1.5:8080/handy', hereReachable: true });
    expect(t.map((x) => x.kind)).toEqual(['online', 'quest', 'mac']);
  });

  it('public copy not switched on yet: only the Mac', () => {
    const t = pickTargets({ publicUrl: PUB, appRoot: 'https://192.168.1.5:8443/', publicLive: false, macSetupUrl: 'http://192.168.1.5:8080/handy', hereReachable: true });
    expect(t.map((x) => x.kind)).toEqual(['mac']);
  });

  it('dev server on the LAN: this address; localhost alone offers nothing', () => {
    expect(pickTargets({ publicUrl: '', appRoot: 'https://192.168.1.9:5173/', publicLive: false, macSetupUrl: null, hereReachable: true })).toEqual([{ kind: 'here', url: 'https://192.168.1.9:5173/' }]);
    expect(pickTargets({ publicUrl: '', appRoot: 'http://localhost:4173/', publicLive: false, macSetupUrl: null, hereReachable: true })).toEqual([]);
  });

  it('an installed Mac copy far away from the Mac offers no dead LAN address', () => {
    expect(pickTargets({ publicUrl: 'https://fatmaku.github.io/Notion/window-blaster/', appRoot: 'https://192.168.1.5:8443/', publicLive: false, macSetupUrl: null, hereReachable: false })).toEqual([]);
  });

  it('no Quest link for a non-https public address', () => {
    const t = pickTargets({ publicUrl: 'http://example.org/', appRoot: 'http://example.org/', publicLive: true, macSetupUrl: null, hereReachable: true });
    expect(t.map((x) => x.kind)).toEqual(['online']);
  });
});
