// Builds the self-contained download WindowBlaster.zip (one zip, one folder, < 30 MB):
//   WindowBlaster/Start-Window-Blaster.command   start (removes quarantine, picks the right server)
//   WindowBlaster/LIESMICH-ZUERST.txt / ANLEITUNG.html
//   WindowBlaster/app/                            built game (run `npm run build` first)
//   WindowBlaster/bin/windowblaster-mac-{arm64,intel}   Go server (launcher/), built here
//   WindowBlaster/quelltext/                      source (git-tracked files, minus the model copy)
// Usage: node scripts/package-mac.mjs [--out WindowBlaster.zip] [--with-linux]
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const out = opt('--out', join(root, 'WindowBlaster.zip'));
const withLinux = args.includes('--with-linux');
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

if (!existsSync(join(root, 'dist', 'precache.json'))) throw new Error('run `npm run build` first');

// 1) server binaries (pure Go, no cgo; arm64 gets the linker's ad-hoc code signature)
const launcher = join(root, 'launcher');
const env = { ...process.env, CGO_ENABLED: '0', GOTOOLCHAIN: process.env.GOTOOLCHAIN ?? 'local' };
const targets = [
  ['darwin', 'arm64', 'windowblaster-mac-arm64'],
  ['darwin', 'amd64', 'windowblaster-mac-intel'],
  ...(withLinux ? [['linux', 'amd64', 'windowblaster-linux-amd64']] : []),
];
for (const [os, arch, name] of targets) {
  execSync(`go build -trimpath -ldflags "-s -w -X main.version=${version}" -o dist/${name} .`, { cwd: launcher, env: { ...env, GOOS: os, GOARCH: arch }, stdio: 'inherit' });
}

// 2) assemble
const stage = join(root, 'packaging', 'stage');
rmSync(stage, { recursive: true, force: true });
const pkg = join(stage, 'WindowBlaster');
mkdirSync(join(pkg, 'bin'), { recursive: true });
cpSync(join(root, 'dist'), join(pkg, 'app'), { recursive: true });
for (const [, , name] of targets) {
  cpSync(join(launcher, 'dist', name), join(pkg, 'bin', name));
  chmodSync(join(pkg, 'bin', name), 0o755);
}
cpSync(join(root, 'packaging', 'Start-Window-Blaster.command'), join(pkg, 'Start-Window-Blaster.command'));
chmodSync(join(pkg, 'Start-Window-Blaster.command'), 0o755);
cpSync(join(root, 'packaging', 'LIESMICH-ZUERST.txt'), join(pkg, 'LIESMICH-ZUERST.txt'));
// the guide is the same template the server shows at /anleitung
const guide = readFileSync(join(launcher, 'web', 'anleitung.html'), 'utf8').replaceAll('{{.Version}}', version).replaceAll('{{.HTTPPort}}', '8080');
if (guide.includes('{{')) throw new Error('anleitung.html contains template actions the package cannot render');
writeFileSync(join(pkg, 'ANLEITUNG.html'), guide);
writeFileSync(join(pkg, 'bin', 'LIZENZEN.txt'), `Window Blaster Server ${version} – enthält rsc.io/qr (BSD-3-Clause) und die Go-Standardbibliothek (BSD-3-Clause).\nMediaPipe Tasks Vision (Apache-2.0) und EfficientDet-Lite0 (Apache-2.0) im Ordner app.\n`);
writeFileSync(join(pkg, 'VERSION.txt'), `Window Blaster ${version}\nGebaut: ${new Date().toISOString()}\n`);

// 3) source as ONE nested quelltext.zip (no second, confusing start script in the folder);
//    tracked + new-but-not-ignored files, minus the 7 MB model copy (same file as app/models)
const files = execSync('git ls-files --cached --others --exclude-standard', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const src = join(stage, 'quelltext');
for (const f of files) {
  if (f.endsWith('.tflite') || f.startsWith('launcher/testdata/') || !existsSync(join(root, f))) continue;
  const dst = join(src, f);
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(join(root, f), dst);
}
mkdirSync(join(src, 'public', 'models'), { recursive: true });
writeFileSync(join(src, 'public', 'models', 'HINWEIS.txt'), 'Das Modell efficientdet_lite0.tflite liegt im Ordner app/models des Spiels – zum Entwickeln nach public/models/ kopieren.\n');
execSync(`zip -qr -X "${join(pkg, 'quelltext.zip')}" .`, { cwd: src, stdio: 'inherit' });
rmSync(src, { recursive: true, force: true });

// 4) zip (keeps Unix permissions; no macOS resource forks)
rmSync(out, { force: true });
execSync(`zip -qr -X "${out}" WindowBlaster`, { cwd: stage, stdio: 'inherit' });
const mb = statSync(out).size / 1048576;
console.log(`[package] ${out} (${mb.toFixed(1)} MB)`);
if (mb > 29.5) throw new Error('package exceeds the 30 MB chat upload limit');
