// Double-click start (2.3): start/Start-LiveFX.bat (Windows), start/Start-LiveFX.command (macOS), start/start.sh
// (Linux) and the server's command line (--help, --local, --open, already running, remembered port, Node check).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { startServer, api } = require('./helpers/server');

const ROOT = path.join(__dirname, '..');
const START = path.join(ROOT, 'start');
const SERVER = path.join(ROOT, 'server.js');
const hasBash = spawnSync('bash', ['-c', 'true']).status === 0;

function tmp(prefix = 'livefx-start-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Runs server.js with args until `until` appears in stdout (or exit). Resolves { code, out, err, proc }. */
function runServer(args, { env = {}, until = null, timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [SERVER, ...args], { env: { ...process.env, LIVEFX_SMART_MOCK: '1', LIVEFX_TOKEN: 'test-token', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    let done = false;
    const finish = (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ code, out, err, proc });
    };
    proc.stdout.on('data', (d) => {
      out += d;
      if (until && until.test(out)) finish(null);
    });
    proc.stderr.on('data', (d) => (err += d));
    proc.on('exit', (code) => finish(code));
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
  });
}

function stop(proc) {
  return new Promise((resolve) => {
    if (proc.exitCode !== null) return resolve();
    proc.on('exit', () => resolve());
    proc.kill('SIGTERM');
    setTimeout(() => proc.kill('SIGKILL'), 2000).unref();
  });
}

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

// ---------------------------------------------------------------- files

test('start/ folder: launchers, README-START, executable bits', () => {
  for (const f of ['Start-LiveFX.bat', 'Start-LiveFX.command', 'start.sh', 'README-START.txt']) assert.ok(fs.existsSync(path.join(START, f)), f);
  if (process.platform !== 'win32') {
    for (const f of ['Start-LiveFX.command', 'start.sh']) assert.ok(fs.statSync(path.join(START, f)).mode & 0o111, `${f} is executable`);
  }
});

test('bash -n: start.sh and Start-LiveFX.command parse; the .command delegates to start.sh with a pause', { skip: hasBash ? false : 'bash fehlt' }, () => {
  for (const f of ['start.sh', 'Start-LiveFX.command']) {
    const r = spawnSync('bash', ['-n', path.join(START, f)], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
  const cmd = fs.readFileSync(path.join(START, 'Start-LiveFX.command'), 'utf8');
  assert.match(cmd, /^#!\/bin\/bash\n/);
  assert.match(cmd, /cd "\$\(dirname "\$0"\)"/, 'works from any working directory (Finder)');
  assert.match(cmd, /LIVEFX_PAUSE=1 exec \/bin\/bash \.\/start\.sh "\$@"/);
  assert.match(cmd, /Gatekeeper|Öffnen/);
  const sh = fs.readFileSync(path.join(START, 'start.sh'), 'utf8');
  assert.match(sh, /cd "\$\(dirname "\$0"\)\/\.\." \|\| exit 1/);
  assert.match(sh, /"\$NODE" "\$APP_DIR\/server\.js" --lan --open "\$@"/, 'paths quoted (spaces / umlauts)');
  assert.match(sh, /https:\/\/nodejs\.org\/de\/download/);
  assert.match(sh, /node\/bin\/node/, 'portable node');
  assert.ok(!/\b(curl|wget)\b/.test(sh), 'the launcher never downloads anything');
});

/** Tiny batch "parser": labels, gotos, required lines, quoting of paths. */
function parseBat(text) {
  const lines = text.split('\r\n');
  const labels = new Set();
  const gotos = [];
  lines.forEach((l, i) => {
    const t = l.trim();
    const lab = /^:([A-Za-z0-9_]+)\s*$/.exec(t);
    if (lab) labels.add(lab[1].toLowerCase());
    for (const m of t.matchAll(/\bgoto\s+:?([A-Za-z0-9_]+)/gi)) gotos.push({ label: m[1].toLowerCase(), line: i + 1 });
  });
  return { lines, labels, gotos };
}

test('Start-LiveFX.bat: CRLF, ASCII, required steps, every goto has a label, paths always quoted', () => {
  const buf = fs.readFileSync(path.join(START, 'Start-LiveFX.bat'));
  const text = buf.toString('latin1');
  assert.ok(!/[^\x00-\x7f]/.test(text), 'ASCII only (cmd reads .bat files in the OEM codepage – umlauts would break)');
  assert.ok(!/(^|[^\r])\n/.test(text), 'CRLF line endings only');
  const { lines, labels, gotos } = parseBat(text);
  assert.equal(lines[0], '@echo off');
  for (const g of gotos) assert.ok(g.label === 'eof' || labels.has(g.label), `goto :${g.label} (line ${g.line}) has a label`);
  for (const l of ['nonode', 'oldnode', 'inzip', 'done', 'nodir']) assert.ok(labels.has(l), `:${l}`);
  const must = [
    /^cd \/d "%~dp0\.\."$/m, // own folder, works with spaces / umlauts / another drive
    /^setlocal EnableExtensions DisableDelayedExpansion$/m, // "!" in folder names stays literal
    /if exist "%APPDIR%\\node\\node\.exe" set "NODE=%APPDIR%\\node\\node\.exe"/, // portable node
    /for \/d %%D in \("%APPDIR%\\node\\node-v\*"\)/, // unrenamed node-v22…-win-x64 folder
    /where node\.exe 2\^>nul/,
    /^"%NODE%" -e "process\.exit\(Number\(process\.versions\.node\.split\('\.'\)\[0\]\)>=20\?0:1\)" >nul 2>&1$/m,
    /^if errorlevel 1 goto :oldnode$/m,
    /^"%NODE%" "%APPDIR%\\server\.js" --lan --open %\*$/m,
    /start "" "https:\/\/nodejs\.org\/de\/download"/,
    /winget install OpenJS\.NodeJS\.LTS/,
    /Strg\+C/,
    /Firewall/,
    /if not "%CHECKDIR:\.zip\\=%"=="%CHECKDIR%" goto :inzip/, // started from inside the ZIP
  ];
  for (const re of must) assert.match(text, re);
  assert.ok((text.match(/^pause$/gm) || []).length >= 4, 'every exit path keeps the window open');
  // %APPDIR% / %NODE% only inside double quotes (a folder name may contain & or parentheses)
  for (const [i, l] of lines.entries()) {
    if (/^\s*rem\b/i.test(l)) continue;
    const unquoted = l.replace(/"[^"]*"/g, '');
    assert.ok(!/%(APPDIR|NODE|CHECKDIR|~dp0)/.test(unquoted), `line ${i + 1} uses a path unquoted: ${l}`);
  }
  // parentheses only in rem/echo lines or in for-sets (no fragile if (...) else (...) blocks)
  for (const [i, l] of lines.entries()) {
    const t = l.trim();
    if (!/[()]/.test(t.replace(/"[^"]*"/g, '')) || /^(rem|echo)\b/i.test(t) || /^if not defined NODE for \/[df] /.test(t)) continue;
    assert.fail(`line ${i + 1} has a bare parenthesis: ${l}`);
  }
});

test('README-START.txt: DE / TR / EN, Gatekeeper, firewall, portable Node, BOM + CRLF for Notepad', () => {
  const buf = fs.readFileSync(path.join(START, 'README-START.txt'));
  assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'UTF-8 BOM');
  const text = buf.toString('utf8');
  assert.ok(!/(^|[^\r])\n/.test(text), 'CRLF');
  for (const s of ['(Deutsch)', '(Türkçe)', '(English)', 'Start-LiveFX.bat', 'Start-LiveFX.command', 'start.sh', 'nodejs.org/de/download', 'Rechtsklick', '„Öffnen“', 'Dennoch öffnen', 'Zugriff zulassen', 'LiveFX\\node\\node.exe', 'LiveFX/node/bin/node', 'QR-Code', 'Internet-Link', '--local']) {
    assert.ok(text.includes(s), s);
  }
});

// ---------------------------------------------------------------- start.sh behaviour (fake app folder)

function fakeApp({ nodeVersion = null } = {}) {
  const dir = tmp('livefx-app-');
  fs.mkdirSync(path.join(dir, 'start'));
  fs.copyFileSync(path.join(START, 'start.sh'), path.join(dir, 'start', 'start.sh'));
  fs.writeFileSync(path.join(dir, 'server.js'), "console.log('ARGS ' + JSON.stringify(process.argv.slice(2)) + ' NODE ' + process.version);\n");
  if (nodeVersion) {
    const bin = path.join(dir, 'node', 'node-v22.0.0-linux-x64', 'bin');
    fs.mkdirSync(bin, { recursive: true });
    const real = process.execPath;
    const fake = nodeVersion === 'real' ? `#!/bin/sh\necho PORTABLE >&2\nexec "${real}" "$@"\n` : `#!/bin/sh\nif [ "$1" = "-v" ]; then echo ${nodeVersion}; exit 0; fi\nexit 1\n`;
    fs.writeFileSync(path.join(bin, 'node'), fake, { mode: 0o755 });
  }
  const tools = path.join(dir, 'tools');
  fs.mkdirSync(tools);
  for (const t of ['dirname', 'ls', 'sort', 'tail', 'uname', 'cat']) {
    const p = spawnSync('bash', ['-c', `command -v ${t}`], { encoding: 'utf8' }).stdout.trim();
    if (p) fs.symlinkSync(p, path.join(tools, t));
  }
  fs.writeFileSync(path.join(tools, 'xdg-open'), `#!/bin/sh\necho "$@" >> "${path.join(dir, 'opened.txt')}"\n`, { mode: 0o755 });
  return dir;
}

/** start.sh opens the browser in the background – wait (synchronously) until the fake xdg-open wrote its file. */
function waitFile(file, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').trim()) return fs.readFileSync(file, 'utf8').trim();
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
  return null;
}

function runSh(dir, args = [], env = {}) {
  return spawnSync('/bin/bash', [path.join(dir, 'start', 'start.sh'), ...args], {
    cwd: os.tmpdir(),
    encoding: 'utf8',
    env: { PATH: path.join(dir, 'tools'), HOME: dir, LIVEFX_NODE_FALLBACKS: '', ...env },
    timeout: 15000,
  });
}

const unixOnly = process.platform === 'win32' || !hasBash ? 'nur mit bash (Linux/macOS)' : false;

test('start.sh: no Node → German help, opens nodejs.org, exit 1', { skip: unixOnly }, () => {
  const dir = fakeApp();
  try {
    const r = runSh(dir);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /Node\.js fehlt – LiveFX braucht Node\.js 20 oder neuer/);
    assert.match(r.stdout, /brew install node/);
    assert.equal(waitFile(path.join(dir, 'opened.txt')), 'https://nodejs.org/de/download');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('start.sh: Node too old (portable v18) → hint + exit 1', { skip: unixOnly }, () => {
  const dir = fakeApp({ nodeVersion: 'v18.19.0' });
  try {
    const r = runSh(dir);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /Node\.js ist zu alt: v18\.19\.0/);
    assert.match(r.stdout, /Version 20 oder neuer/);
    assert.equal(waitFile(path.join(dir, 'opened.txt')), 'https://nodejs.org/de/download');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('start.sh: portable node/ folder is used; server gets --lan --open plus own args; works from another cwd', { skip: unixOnly }, () => {
  const dir = fakeApp({ nodeVersion: 'real' });
  try {
    const r = runSh(dir, ['--port', '8790']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /PORTABLE/, 'node/ next to the app wins');
    assert.match(r.stdout, /ARGS \["--lan","--open","--port","8790"\]/);
    assert.match(r.stdout, /LiveFX startet/);
    assert.match(r.stdout, /LiveFX wurde beendet/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('start.sh in a folder with spaces and umlauts starts the real server (--help)', { skip: unixOnly }, () => {
  const parent = tmp();
  const dir = path.join(parent, 'Mein Stream – Übertragung (neu)');
  fs.mkdirSync(path.join(dir, 'start'), { recursive: true });
  try {
    fs.copyFileSync(path.join(START, 'start.sh'), path.join(dir, 'start', 'start.sh'));
    fs.symlinkSync(SERVER, path.join(dir, 'server.js'));
    const r = spawnSync('/bin/bash', [path.join(dir, 'start', 'start.sh'), '--help'], { encoding: 'utf8', env: { ...process.env, LIVEFX_NODE_FALLBACKS: '' }, timeout: 15000 });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /node server\.js \[Optionen\]/);
    assert.ok(r.stdout.includes(dir), 'shows the folder');
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- server command line

test('server.js --help lists the options in German and exits 0', async () => {
  const r = await runServer(['--help']);
  assert.equal(r.code, 0);
  for (const s of ['--open', '--local', '--lan', '--port', '--no-qr', 'docs/START.md']) assert.ok(r.out.includes(s), s);
});

test('server.js --local: only 127.0.0.1, banner says phone access is off; --port picks the port', async () => {
  const dataDir = tmp();
  const port = await freePort();
  const r = await runServer(['--local', '--port', String(port)], { env: { HOST: '0.0.0.0', LIVEFX_DATA_DIR: dataDir }, until: /Beenden: Strg\+C/ });
  try {
    assert.match(r.out, new RegExp(`LiveFX läuft auf http://127\\.0\\.0\\.1:${port}/`));
    assert.match(r.out, /Handy: aus/);
    const s = await api(`http://127.0.0.1:${port}`, 'GET', '/api/setup', { token: 'test-token' });
    assert.equal(s.json.lan.listening, false, '--local wins over HOST');
    assert.equal(s.json.lan.bind, '127.0.0.1');
    assert.ok(!fs.existsSync(path.join(dataDir, 'server.json')), 'a fixed port is not remembered');
  } finally {
    await stop(r.proc);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('second start on the same port: "LiveFX läuft schon", opens the existing panel, exit 0', async (t) => {
  const first = await startServer();
  t.after(() => first.stop());
  const port = new URL(first.base).port;
  const bin = tmp();
  const opened = path.join(bin, 'opened.txt');
  fs.writeFileSync(path.join(bin, 'xdg-open'), `#!/bin/sh\necho "$@" >> "${opened}"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'open'), `#!/bin/sh\necho "$@" >> "${opened}"\n`, { mode: 0o755 });
  const env = { PORT: port, HOST: '127.0.0.1', LIVEFX_DATA_DIR: first.dataDir, PATH: `${bin}${path.delimiter}${process.env.PATH}`, CI: '', LIVEFX_NO_BROWSER: '' };
  delete env.CI;
  const r = await runServer(['--open'], { env: { ...env } });
  try {
    assert.equal(r.code, 0, r.out + r.err);
    assert.match(r.out, new RegExp(`LiveFX läuft schon \\(Version ${require('../package.json').version.replace(/\./g, '\\.')}\\) – Panel: http://127\\.0\\.0\\.1:${port}/`));
    assert.ok(!/anderes Programm|anderen Port/.test(r.out + r.err), 'no misleading "other program" message');
    if (process.platform === 'linux' || process.platform === 'darwin') {
      await new Promise((res) => setTimeout(res, 300));
      assert.equal(fs.readFileSync(opened, 'utf8').trim(), `http://127.0.0.1:${port}/`, 'browser opened on the running instance');
    }
  } finally {
    fs.rmSync(bin, { recursive: true, force: true });
  }
});

test('--open opens the panel once listening (xdg-open/open), LIVEFX_NO_BROWSER=1 suppresses it', { skip: process.platform === 'win32' ? 'Windows: start' : false }, async () => {
  const bin = tmp();
  const opened = path.join(bin, 'opened.txt');
  for (const n of ['xdg-open', 'open']) fs.writeFileSync(path.join(bin, n), `#!/bin/sh\necho "$@" >> "${opened}"\n`, { mode: 0o755 });
  const dataDir = tmp();
  const base = { HOST: '127.0.0.1', PORT: '0', LIVEFX_DATA_DIR: dataDir, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const env = { ...process.env, ...base };
  delete env.CI;
  delete env.LIVEFX_NO_BROWSER;
  try {
    const r = await new Promise((resolve) => {
      const proc = spawn(process.execPath, [SERVER, '--open'], { env: { ...env, LIVEFX_SMART_MOCK: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      proc.stdout.on('data', (d) => {
        out += d;
        if (/Beenden: Strg\+C/.test(out)) resolve({ proc, out });
      });
    });
    await new Promise((res) => setTimeout(res, 400));
    await stop(r.proc);
    const url = /LiveFX läuft auf (http:\/\/127\.0\.0\.1:\d+\/)/.exec(r.out)[1];
    assert.equal(fs.readFileSync(opened, 'utf8').trim(), url);
    assert.match(r.out, /öffnet sich im Browser/);
    fs.rmSync(opened);
    const r2 = await runServer(['--open'], { env: { ...base, LIVEFX_NO_BROWSER: '1' }, until: /Beenden: Strg\+C/ });
    await new Promise((res) => setTimeout(res, 300));
    await stop(r2.proc);
    assert.ok(!fs.existsSync(opened), 'LIVEFX_NO_BROWSER=1: nothing opened');
  } finally {
    fs.rmSync(bin, { recursive: true, force: true });
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('a fallback port is remembered in data/server.json and preferred on the next start', async () => {
  const dataDir = tmp();
  const port = await freePort();
  fs.writeFileSync(path.join(dataDir, 'server.json'), JSON.stringify({ port }));
  const env = { ...process.env, HOST: '127.0.0.1', LIVEFX_DATA_DIR: dataDir };
  delete env.PORT;
  const r = await runServer([], { env, until: /Beenden: Strg\+C/ });
  try {
    assert.match(r.out, new RegExp(`LiveFX läuft auf http://127\\.0\\.0\\.1:${port}/`), r.out + r.err);
    assert.match(r.out, /wie beim letzten Start Port/);
  } finally {
    await stop(r.proc);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('server.js stays parseable by old Node (version check first, no ?? / ?. in the file)', () => {
  const src = fs.readFileSync(SERVER, 'utf8');
  const head = src.split('\n').slice(0, 30).join('\n');
  assert.match(head, /var NODE_MAJOR = Number\(String\(process\.versions\.node\)\.split\('\.'\)\[0\]\);\nif \(NODE_MAJOR < 20\)/);
  assert.match(head, /nodejs\.org\/de\/download/);
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
  assert.ok(!/\?\?|\?\.(?!\d)/.test(code), 'no nullish coalescing / optional chaining in server.js');
  assert.ok(head.indexOf('NODE_MAJOR < 20') < src.indexOf("require('./server/router')"), 'check runs before the modules load');
  assert.equal(require('../package.json').engines.node, '>=20');
});
