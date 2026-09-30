// Builds the self-contained Mac download package (WindowBlaster-Mac.zip):
// built app, Caddy binaries (darwin arm64/amd64), start scripts, German guide, source.
// Usage: node scripts/package-mac.mjs [--caddy-dir <dir with mac_arm64/caddy, mac_amd64/caddy>] [--out <zip>]
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const caddyDir = opt('--caddy-dir', join(root, 'packaging', 'caddy'));
const out = opt('--out', join(root, 'WindowBlaster-Mac.zip'));
const includeLinux = args.includes('--with-linux');

if (!existsSync(join(root, 'dist', 'precache.json'))) throw new Error('run `npm run build` first');
const stage = join(root, 'packaging', 'stage');
rmSync(stage, { recursive: true, force: true });
const pkg = join(stage, 'WindowBlaster-Mac');
mkdirSync(join(pkg, 'bin'), { recursive: true });

cpSync(join(root, 'dist'), join(pkg, 'app'), { recursive: true });
for (const [src, dst] of [
  ['mac_arm64/caddy', 'caddy-darwin-arm64'],
  ['mac_amd64/caddy', 'caddy-darwin-amd64'],
  ...(includeLinux ? [['linux_amd64/caddy', 'caddy-linux-amd64']] : []),
]) {
  const p = join(caddyDir, src);
  if (!existsSync(p)) throw new Error(`missing caddy binary: ${p}`);
  cpSync(p, join(pkg, 'bin', dst));
  chmodSync(join(pkg, 'bin', dst), 0o755);
}
for (const f of ['Start-Window-Blaster.command', 'Handy-vertrauen.command', 'ANLEITUNG.md']) {
  cpSync(join(root, 'packaging', f), join(pkg, f));
  if (f.endsWith('.command')) chmodSync(join(pkg, f), 0o755);
}
const caddyVersion = existsSync(join(caddyDir, 'VERSION')) ? readFileSync(join(caddyDir, 'VERSION'), 'utf8').trim() : 'unbekannt';
writeFileSync(join(pkg, 'bin', 'LIZENZ-Caddy.txt'), `Caddy ${caddyVersion} – Apache License 2.0 – https://github.com/caddyserver/caddy\n`);

// source without node_modules / build output (git-tracked files)
const files = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
for (const f of files) {
  const dst = join(pkg, 'quelltext', f);
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(join(root, f), dst);
}
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
writeFileSync(join(pkg, 'VERSION.txt'), `Window Blaster ${version}\nGebaut: ${new Date().toISOString()}\nCaddy: ${caddyVersion}\n`);

rmSync(out, { force: true });
execSync(`zip -qr -X "${out}" WindowBlaster-Mac`, { cwd: stage, stdio: 'inherit' });
const size = execSync(`du -h "${out}" | cut -f1`, { encoding: 'utf8' }).trim();
console.log(`[package] ${out} (${size})`);
