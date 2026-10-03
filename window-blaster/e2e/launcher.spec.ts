import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { networkInterfaces, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectErrors, snapshot, waitForPlay } from './helpers';

// Runs the real launcher binary (Linux build of the Mac server) against the built app.
const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'launcher', 'dist', 'windowblaster-linux-amd64');
const HTTP = 18180;
const HTTPS = 18543;
let proc: ChildProcess | null = null;
let out = '';
let dataDir = '';

test.beforeAll(async () => {
  test.skip(!existsSync(BIN), 'launcher not built (cd launcher && go build)');
  dataDir = mkdtempSync(join(tmpdir(), 'wb-launcher-'));
  proc = spawn(BIN, ['--app', join(HERE, '..', 'dist'), '--data', dataDir, '--http', String(HTTP), '--https', String(HTTPS), '--open=false', '--quiet'], { stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout?.on('data', (d) => (out += String(d)));
  proc.stderr?.on('data', (d) => (out += String(d)));
  for (let i = 0; i < 50 && !out.includes('Window Blaster läuft'); i++) await new Promise((r) => setTimeout(r, 100));
  expect(out).toContain('Window Blaster läuft');
});

test.afterAll(() => {
  proc?.kill('SIGINT');
});

test('Mac: connect page shows a QR code and the demo runs on http://localhost (secure context)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`http://localhost:${HTTP}/verbinden`);
  await expect(page.getByText('Handy einrichten')).toBeVisible();
  await expect(page.locator('.qr svg').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/launcher-connect.png', fullPage: true });
  await page.goto(`http://localhost:${HTTP}/?demo=1&skipTo=play&test=1&mode=front-shooter&weapons=smg,paint&noshake=1`);
  await waitForPlay(page);
  expect(await page.evaluate(() => window.isSecureContext)).toBe(true);
  const s = await snapshot(page);
  expect(String(s.screen)).toContain('play');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('phone: setup page over plain HTTP, certificate downloads, game over HTTPS with the local CA', async ({ browser }) => {
  // phone page as an iPhone would see it
  const iphone = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', viewport: { width: 390, height: 844 } });
  const p = await iphone.newPage();
  // reach the server through the machine's LAN address, exactly like a phone on the same Wi-Fi
  const lan = Object.values(networkInterfaces()).flat().find((a) => a && a.family === 'IPv4' && !a.internal)?.address ?? '127.0.0.1';
  await p.goto(`http://${lan}:${HTTP}/handy`);
  await expect(p.getByRole('link', { name: /Profil laden/ })).toBeVisible();
  await expect(p.getByText('Prüfe, ob dein Handy dem Mac schon vertraut')).toBeVisible(); // untrusted yet
  await p.screenshot({ path: 'test-results/launcher-handy.png', fullPage: true });
  const prof = await p.request.get(`http://${lan}:${HTTP}/zertifikat.mobileconfig`);
  expect(prof.headers()['content-type']).toBe('application/x-apple-aspen-config');
  expect(await prof.text()).toContain('com.apple.security.root');
  await iphone.close();
  // "trusted" phone: accept the local CA, game loads over HTTPS incl. real MediaPipe detector
  const trusted = await browser.newContext({ ignoreHTTPSErrors: true });
  const g = await trusted.newPage();
  await g.goto(`https://${lan}:${HTTPS}/?skipTo=play&test=1&round=20&mode=front-shooter&weapons=smg,paint`);
  await waitForPlay(g, 120_000);
  expect(String((await snapshot(g)).detector)).toContain('mediapipe');
  await trusted.close();
  // the CA written to the data dir really signs the served certificate
  expect(readFileSync(join(dataDir, 'ca.crt'), 'utf8')).toContain('BEGIN CERTIFICATE');
  if (lan !== '127.0.0.1') {
    expect(out).toMatch(/iPhone verbunden/);
    expect(out).toMatch(/Zertifikat geladen/);
    expect(out).toMatch(/Spiel auf .* geöffnet/);
  }
});
