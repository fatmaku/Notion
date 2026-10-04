// Playwright aus lokalem node_modules oder der globalen npm-Installation laden.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Startoptionen: PW_CHROMIUM=/pfad/zu/chrome nutzt einen vorhandenen Chromium statt des Playwright-Downloads. */
export function launchOptions(extra = {}) {
  return process.env.PW_CHROMIUM ? { ...extra, executablePath: process.env.PW_CHROMIUM } : extra;
}

export async function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const dirs = [process.cwd(), path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')];
  try {
    dirs.push(execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch {
    /* npm fehlt */
  }
  dirs.push('/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules');
  for (const d of dirs) {
    try {
      return require(require.resolve('playwright', { paths: [d] }));
    } catch {
      /* nächster */
    }
  }
  throw new Error('playwright nicht gefunden – npm install playwright');
}
