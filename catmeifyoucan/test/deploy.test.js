// Yayına alma (deploy/): Docker-Dateien, Caddy, Skripte, Anleitung – statisch geprüft (ohne Docker)
// und ein produktionsnaher Rauchtest: `node server.js` wie hinter Caddy (CATME_PUBLIC_URL, TRUST_PROXY=1).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const D = (...p) => path.join(ROOT, 'deploy', ...p);
const read = (p) => fs.readFileSync(p, 'utf8');
const hasBash = spawnSync('bash', ['-c', 'true']).status === 0;
const SCRIPTS = ['kur.sh', 'guncelle.sh', 'yedek.sh', 'geri-yukle.sh', 'sifirla.sh', 'ortak.sh', 'qr.sh'];

/** KEY=WERT-Zeilen einer .env-Datei (ohne Kommentare). */
function envKeys(text) {
  const keys = new Set();
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = /^([A-Z][A-Z0-9_]*)=/.exec(t);
    assert.ok(m, `.env.example: ungültige Zeile „${t}“`);
    keys.add(m[1]);
  }
  return keys;
}

/** Dockerfile ohne Kommentare, Fortsetzungszeilen zusammengefügt. */
function dockerInstructions(text) {
  return text
    .replace(/\\\n/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

// ---------------------------------------------------------------- Dateien

test('deploy: alle Dateien des Go-live-Kits sind da', () => {
  for (const f of ['Dockerfile', '.dockerignore', '.gitignore']) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  for (const f of ['docker-compose.yml', 'Caddyfile', 'Caddyfile.host', '.env.example', 'catme.service', 'KURULUM.md', '.gitattributes', ...SCRIPTS]) {
    assert.ok(fs.existsSync(D(f)), `deploy/${f}`);
  }
});

test('deploy: Skripte sind gültiges Bash mit set -euo pipefail und LF-Zeilenenden', { skip: !hasBash && 'bash fehlt' }, () => {
  for (const f of SCRIPTS) {
    const r = spawnSync('bash', ['-n', D(f)], { encoding: 'utf8' });
    assert.equal(r.status, 0, `bash -n deploy/${f}: ${r.stderr}`);
    const src = read(D(f));
    assert.ok(!src.includes('\r'), `deploy/${f} hat CRLF`);
    if (f !== 'ortak.sh') {
      assert.match(src, /^#!\/usr\/bin\/env bash/, `deploy/${f}: Shebang`);
      assert.match(src, /^set -euo pipefail$/m, `deploy/${f}: set -euo pipefail`);
      assert.match(src, /source "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)\/ortak\.sh"/, `deploy/${f}: lädt ortak.sh`);
    }
  }
});

// ---------------------------------------------------------------- Dockerfile

test('Dockerfile: Produktions-Abhängigkeiten, nicht-root, Volume, Healthcheck mit node, CMD', () => {
  const ins = dockerInstructions(read(path.join(ROOT, 'Dockerfile')));
  const all = ins.join('\n');
  assert.match(all, /^FROM node:\d+-alpine/m, 'schlankes Node-LTS-Image');
  assert.match(all, /npm ci --omit=dev/, 'nur Produktions-Abhängigkeiten');
  assert.doesNotMatch(all, /--omit=optional|--no-optional/, '@anthropic-ai/sdk (optional) bleibt drin');
  assert.match(all, /import\('@anthropic-ai\/sdk'\)/, 'Build bricht ab, wenn das optionale SDK still fehlt');

  const users = ins.filter((l) => /^USER\s/.test(l));
  assert.ok(users.length, 'USER fehlt');
  assert.doesNotMatch(users.at(-1), /^USER\s+(root|0)\b/, 'läuft nicht als root');

  assert.match(all, /CATME_DATA=\/data/);
  assert.match(all, /HOST=0\.0\.0\.0/);
  assert.match(all, /PORT=8790/);
  assert.match(all, /^VOLUME \["\/data"\]/m);

  const hc = ins.find((l) => /^HEALTHCHECK/.test(l));
  assert.ok(hc, 'HEALTHCHECK fehlt');
  assert.match(hc, /CMD \["node"/, 'Healthcheck mit node');
  assert.match(hc, /\/api\/health/);
  assert.doesNotMatch(hc, /\bcurl\b|\bwget\b/, 'kein curl/wget nötig');

  const cmd = ins.filter((l) => /^CMD\s/.test(l)).at(-1);
  assert.equal(cmd, 'CMD ["node", "server.js"]', 'exec-Form → SIGTERM kommt bei node an');

  // nur das, was läuft – nichts aus Tests, Trailer, Marketing, Daten
  const copies = ins.filter((l) => /^COPY\s/.test(l) && !/--from=/.test(l));
  const sources = copies.flatMap((l) => l.replace(/^COPY\s+(--\S+\s+)*/, '').split(/\s+/).slice(0, -1));
  assert.deepEqual(new Set(sources), new Set(['package.json', 'package-lock.json', 'server.js', 'server', 'public']));
  for (const bad of ['test', 'trailer', 'marketing', 'docs', 'data', 'deploy', 'scripts', 'node_modules', '.']) {
    assert.ok(!sources.includes(bad), `COPY ${bad}`);
  }
});

test('.dockerignore: Erlaubnisliste – nur package*.json, server.js, server/, public/', () => {
  const lines = read(path.join(ROOT, '.dockerignore')).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  assert.equal(lines[0], '*', 'erst alles ausschließen');
  const allowed = lines.filter((l) => l.startsWith('!')).map((l) => l.slice(1).replace(/\/$/, ''));
  assert.deepEqual(new Set(allowed), new Set(['package.json', 'package-lock.json', 'server.js', 'server', 'public']));
});

// ---------------------------------------------------------------- Compose, Caddy, .env

test('docker-compose.yml: app + caddy, Volumes, Neustart, Umgebung aus .env', () => {
  const y = read(D('docker-compose.yml'));
  assert.match(y, /^services:\n {2}app:\n/m);
  assert.match(y, /^ {2}caddy:\n {4}image: caddy:2\n/m, 'offizielles caddy:2-Image');
  assert.match(y, /build:\n {6}context: \.\.\n {6}dockerfile: Dockerfile/);
  assert.equal((y.match(/restart: unless-stopped/g) || []).length, 2);
  assert.match(y, /env_file:\n {6}- \.env/);
  assert.match(y, /CATME_PUBLIC_URL: https:\/\/\$\{SITE_DOMAIN/);
  assert.match(y, /TRUST_PROXY: "1"/);
  assert.match(y, /CATME_DEMO: \$\{CATME_DEMO:-0\}/, 'Demo standardmäßig aus');
  assert.match(y, /CATME_AI: \$\{CATME_AI:-auto\}/);
  assert.match(y, /CATME_DATA: \/data/);
  assert.match(y, /- app-data:\/data/);
  assert.match(y, /- caddy-data:\/data/);
  assert.match(y, /- caddy-config:\/config/);
  assert.match(y, /^volumes:\n {2}app-data:.*\n {2}caddy-data:\n {2}caddy-config:/m);
  assert.match(y, /- \.\/Caddyfile:\/etc\/caddy\/Caddyfile:ro/);
  // App nur lokal erreichbar – von außen geht alles über Caddy (Host-Netz, echte Client-IPs)
  assert.match(y, /- "127\.0\.0\.1:8790:8790"/);
  assert.doesNotMatch(y, /- "?(0\.0\.0\.0:)?8790:8790"?\s*$/m, 'App-Port nicht öffentlich');
  assert.match(y, /network_mode: host/);
});

test('docker-compose.yml: beide Container gehärtet (read_only, cap_drop ALL, no-new-privileges)', () => {
  const y = read(D('docker-compose.yml'));
  const block = (name) => {
    const m = new RegExp(`^ {2}${name}:\\n([\\s\\S]*?)(?=^ {2}\\S|^\\S)`, 'm').exec(y);
    assert.ok(m, `Dienst ${name}`);
    return m[1];
  };
  for (const name of ['app', 'caddy']) {
    const b = block(name);
    assert.match(b, /^ {4}read_only: true$/m, `${name}: read_only`);
    assert.match(b, /^ {4}tmpfs:\n {6}- \/tmp$/m, `${name}: /tmp als tmpfs`);
    assert.match(b, /^ {4}cap_drop: \[ALL\]$/m, `${name}: cap_drop`);
    assert.match(b, /^ {6}- no-new-privileges:true$/m, `${name}: no-new-privileges`);
  }
  assert.doesNotMatch(block('app'), /cap_add/, 'App braucht keine Capabilities');
  assert.match(block('caddy'), /^ {4}cap_add: \[NET_BIND_SERVICE\]$/m, 'Caddy: nur Ports < 1024');
  assert.doesNotMatch(y, /privileged: true/);
});

test('docker-compose.yml: jede ${VAR} ist in .env.example erklärt', () => {
  const y = read(D('docker-compose.yml'));
  const example = envKeys(read(D('.env.example')));
  const fromScripts = new Set(['CADDYFILE_SHA']); // setzt kur.sh beim Start
  const used = new Set([...y.matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]));
  assert.ok(used.has('SITE_DOMAIN') && used.has('ACME_EMAIL') && used.has('SITE_WWW'));
  for (const k of used) assert.ok(example.has(k) || fromScripts.has(k), `${k} fehlt in deploy/.env.example`);
  // was die App selbst liest, steht ebenfalls in der Vorlage
  for (const k of ['ADMIN_TOKEN', 'ANTHROPIC_API_KEY', 'CATME_AI', 'CATME_MODEL', 'CATME_DEMO', 'CATME_TILES', 'CATME_TILES_ATTRIB']) {
    assert.ok(example.has(k), `${k} fehlt in deploy/.env.example`);
  }
  // keine echten Geheimnisse in der Vorlage
  const ex = read(D('.env.example'));
  assert.match(ex, /^ADMIN_TOKEN=$/m);
  assert.match(ex, /^ANTHROPIC_API_KEY=$/m);
  assert.match(ex, /^CATME_DEMO=0$/m);
});

test('Caddyfile: {$SITE_DOMAIN}, HTTPS automatisch, Proxy auf die App, kein doppeltes Packen', () => {
  for (const [file, upstream] of [['Caddyfile', '127.0.0.1:8790'], ['Caddyfile.host', '127.0.0.1:8790']]) {
    const c = read(D(file))
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n');
    assert.match(c, new RegExp(`reverse_proxy ${upstream.replace(/\./g, '\\.')}`), `${file}: reverse_proxy`);
    assert.doesNotMatch(c, /^\s*encode\b/m, `${file}: kein encode – die App packt selbst`);
    assert.doesNotMatch(c, /tls internal|local_certs/, `${file}: keine Test-Zertifikate`);
    assert.doesNotMatch(c, /^\s*header\s+-?(Content-Security-Policy|X-Content-Type-Options|Referrer-Policy)/m, `${file}: Sicherheitsköpfe der App bleiben`);
    const max = /max_size (\d+)MB/.exec(c);
    assert.ok(max, `${file}: request_body max_size`);
    assert.ok(Number(max[1]) * 1024 * 1024 > 3.6 * 1024 * 1024, `${file}: Limit über dem Fang-Limit der App (3,6 MB)`);
  }
  const c = read(D('Caddyfile'));
  assert.match(c, /^\{\$SITE_DOMAIN\} \{\$SITE_WWW\} \{$/m);
  assert.match(c, /redir @www https:\/\/\{\$SITE_DOMAIN\}\{uri\} permanent/);
  assert.match(c, /\{\$CADDY_EMAIL_OPTION\}/);
  assert.match(read(D('docker-compose.yml')), /CADDY_EMAIL_OPTION: \$\{ACME_EMAIL:\+email \$\{ACME_EMAIL\}\}/);
  assert.match(read(D('Caddyfile.host')), /^ALAN\.ADI \{$/m);
});

test('catme.service: eigener Benutzer, Neustart immer, Env-Datei, Daten in /var/lib/catme', () => {
  const s = read(D('catme.service'));
  assert.match(s, /^User=catme$/m);
  assert.match(s, /^Restart=always$/m);
  assert.match(s, /^EnvironmentFile=\/etc\/catme\.env$/m);
  assert.match(s, /^Environment=CATME_DATA=\/var\/lib\/catme$/m);
  assert.match(s, /^StateDirectory=catme$/m);
  assert.match(s, /^Environment=HOST=127\.0\.0\.1$/m, 'nur lokal hinter Caddy');
  assert.match(s, /^Environment=TRUST_PROXY=1$/m);
  assert.match(s, /^ExecStart=\/usr\/bin\/node server\.js$/m);
  // Härtung: nur der Datenordner beschreibbar, keine Capabilities
  for (const line of ['NoNewPrivileges=true', 'ProtectSystem=strict', 'ProtectHome=true', 'PrivateTmp=true', 'ReadWritePaths=/var/lib/catme', 'CapabilityBoundingSet=', 'RestrictSUIDSGID=true', 'RestrictNamespaces=true']) {
    assert.match(s, new RegExp(`^${line.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`, 'm'), line);
  }
  assert.doesNotMatch(s, /^MemoryDenyWriteExecute=true/m, 'würde den V8-JIT von Node brechen');
});

test('.gitignore: deploy/.env, Overrides und Sicherungen kommen nie ins Repo', () => {
  const g = read(path.join(ROOT, '.gitignore'));
  assert.match(g, /^deploy\/\.env$/m);
  assert.match(g, /^!deploy\/\.env\.example$/m);
  assert.match(g, /^yedekler\/$/m);
  const git = spawnSync('git', ['check-ignore', '-q', 'deploy/.env'], { cwd: ROOT });
  if (git.error || git.status === 128) return; // kein git / kein Repo (z. B. aus dem Zip)
  assert.equal(git.status, 0, 'git ignoriert deploy/.env');
  assert.equal(spawnSync('git', ['check-ignore', '-q', 'yedekler/catme-yedek-x.tar.gz'], { cwd: ROOT }).status, 0);
  assert.equal(spawnSync('git', ['check-ignore', '-q', 'deploy/.env.example'], { cwd: ROOT }).status, 1, '.env.example bleibt im Repo');
});

test('KURULUM.md: keine erfundenen Preise (Server, Claude) – nur Verweis auf den Anbieter', () => {
  const k = read(D('KURULUM.md'));
  assert.doesNotMatch(k, /\d\s*(€|\$|Euro|EUR|USD|TL|₺)|(€|\$)\s*\d|\d\s*(ABD )?senti?\b|US-Cent|birkaç Euro|kuruş/i);
  assert.doesNotMatch(read(D('kur.sh')), /kuruş|cent\b/i, 'kur.sh nennt keine Preise');
});

test('KURULUM.md + README: einfache Anleitung auf Türkisch mit deutscher Kurzfassung', () => {
  const k = read(D('KURULUM.md'));
  for (const s of ['bash deploy/kur.sh', 'admin.html', 'partner.html', 'ADMIN_TOKEN', 'ANTHROPIC_API_KEY', 'CATME_DEMO', 'yedek.sh', 'geri-yukle.sh', 'guncelle.sh', 'ufw allow', 'get.docker.com', 'catme.service', 'Caddyfile.host']) {
    assert.ok(k.includes(s), `KURULUM.md erwähnt ${s}`);
  }
  assert.match(k, /^## .*Deutsch/m, 'deutsche Kurzfassung');
  assert.match(k, /A kaydı|A-Record|A record/i);
  assert.match(read(path.join(ROOT, 'README.md')), /\(deploy\/KURULUM\.md\)/, 'README verlinkt die Anleitung');
});

// ---------------------------------------------------------------- Skript-Funktionen (bash)

function bash(script, env = {}) {
  return spawnSync('bash', ['-c', script], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', ...env } });
}

test('kur.sh: Domain wird bereinigt und geprüft', { skip: !hasBash && 'bash fehlt' }, () => {
  const check = (d) => bash('source deploy/kur.sh; n="$(alan_adi_duzelt "$DOMAIN")"; if alan_adi_gecerli "$n"; then echo "ok $n"; else echo "bad $n"; fi', { DOMAIN: d }).stdout.trim();
  assert.equal(check('HTTPS://Kedi.Ornek.COM/app.html'), 'ok kedi.ornek.com');
  assert.equal(check('kedi.ornek.com.'), 'ok kedi.ornek.com');
  assert.equal(check('xn--kedi-9ua.com.tr'), 'ok xn--kedi-9ua.com.tr');
  for (const bad of ['localhost', '1.2.3.4', 'kedi_ornek.com', '-kedi.com', 'kedi.com:8443', 'kedi.örnek.com', 'a b.com']) {
    assert.match(check(bad), /^bad/, bad);
  }
});

test('ortak.sh: env_set ersetzt/ergänzt Zeilen, behält Kommentare, Datei bleibt privat', { skip: !hasBash && 'bash fehlt' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-env-'));
  try {
    const f = path.join(tmp, '.env');
    fs.writeFileSync(f, '# Kommentar\nSITE_DOMAIN=alt.example\nADMIN_TOKEN=\n');
    const r = bash(`source deploy/ortak.sh; ENV_DOSYA="$F"; env_set SITE_DOMAIN neu.example; env_set ANTHROPIC_API_KEY 'sk-ant-a/b&c'; env_set ADMIN_TOKEN abc; echo "[$(env_get SITE_DOMAIN)] [$(env_get ANTHROPIC_API_KEY)] [$(env_get FEHLT)]"`, { F: f });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), '[neu.example] [sk-ant-a/b&c] []');
    assert.equal(read(f), '# Kommentar\nSITE_DOMAIN=neu.example\nADMIN_TOKEN=abc\nANTHROPIC_API_KEY=sk-ant-a/b&c\n');
    assert.equal(fs.statSync(f).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('kur.sh: ohne Docker → verständlicher Hinweis zur Installation, Abbruch', { skip: !hasBash && 'bash fehlt' }, () => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-bin-'));
  try {
    const which = (cmd) => spawnSync('bash', ['-c', `command -v ${cmd}`], { encoding: 'utf8' }).stdout.trim();
    fs.symlinkSync(which('dirname'), path.join(bin, 'dirname'));
    const envBefore = fs.existsSync(D('.env'));
    const r = spawnSync(which('bash'), ['deploy/kur.sh', 'kedi.ornek.com'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { PATH: bin, NO_COLOR: '1', HOME: os.tmpdir() },
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr + r.stdout, /Docker kurulu değil/);
    assert.match(r.stdout, /get\.docker\.com/);
    assert.equal(fs.existsSync(D('.env')), envBefore, 'ohne Docker wird deploy/.env nicht angelegt');
  } finally {
    fs.rmSync(bin, { recursive: true, force: true });
  }
});

test('geri-yukle.sh, sifirla.sh, guncelle.sh: sichern IMMER vorher – auch bei gestoppter App', { skip: !hasBash && 'bash fehlt' }, () => {
  for (const f of ['geri-yukle.sh', 'sifirla.sh', 'guncelle.sh']) {
    const src = read(D(f));
    const i = src.indexOf('bash "$DEPLOY/yedek.sh"');
    assert.ok(i > 0, `${f}: ruft yedek.sh auf`);
    const before = src.slice(0, i).split('\n').slice(-3).join('\n');
    assert.doesNotMatch(before, /app_calisiyor/, `${f}: Sicherung nicht nur bei laufender App`);
  }
  // die Sicherung kommt vor dem Löschen
  for (const f of ['geri-yukle.sh', 'sifirla.sh']) {
    const src = read(D(f));
    assert.ok(src.indexOf('yedek.sh"') < src.indexOf('dc stop app'), `${f}: erst sichern, dann stoppen/löschen`);
  }
});

function sh(script, args, input) {
  return spawnSync('sh', ['-c', script, 'sh', ...args], { input, encoding: 'buffer' });
}

test('Sichern → Leeren → Zurückspielen: tar-Logik von yedek.sh / geri-yukle.sh / sifirla.sh (Temp-Ordner)', { skip: !hasBash && 'bash fehlt' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-yedek-'));
  try {
    const snippets = bash('source deploy/ortak.sh; printf "%s\\0%s" "$VERI_TEMIZLE_SH" "$GERI_YUKLE_SH"');
    assert.equal(snippets.status, 0, snippets.stderr);
    const [wipe, restore] = snippets.stdout.split('\0');
    assert.ok(wipe && restore);

    // „Volume“ mit Daten wie im Betrieb, inkl. Punkt-Datei und Unterordner
    const data = path.join(tmp, 'data');
    fs.mkdirSync(path.join(data, 'photos'), { recursive: true });
    const files = {
      'snapshot.json': JSON.stringify({ cats: [{ id: 'c1' }] }),
      'journal.jsonl': '{"op":"insert","col":"cats","doc":{"id":"c2"}}\n',
      'game.override.json': '{"dailyGoal":15}',
      'photos/c1.jpg': 'JPEGDATA',
      '.versteckt': 'x',
    };
    for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(data, f), c);

    // yedek.sh: tar czf - -C /data .
    const backup = spawnSync('tar', ['czf', '-', '-C', data, '.']);
    assert.equal(backup.status, 0, String(backup.stderr));
    const archive = path.join(tmp, 'catme-yedek.tar.gz');
    fs.writeFileSync(archive, backup.stdout);
    const list = spawnSync('tar', ['tzf', archive], { encoding: 'utf8' }).stdout;
    assert.match(list, /(^|\/)snapshot\.json$/m, 'geri-yukle.sh erkennt die Sicherung an snapshot.json');

    // Daten ändern sich danach (neue Datei, geänderter Snapshot)
    fs.writeFileSync(path.join(data, 'snapshot.json'), '{"kaputt":true}');
    fs.writeFileSync(path.join(data, 'neu.txt'), 'nach der Sicherung');

    // sifirla.sh: alles weg außer game.override.json
    const reset = sh(wipe, [data, 'game.override.json']);
    assert.equal(reset.status, 0, String(reset.stderr));
    assert.deepEqual(fs.readdirSync(data), ['game.override.json']);

    // geri-yukle.sh: leeren + entpacken → exakt der gesicherte Stand (neu.txt ist weg)
    const r = sh(restore, [data], fs.readFileSync(archive));
    assert.equal(r.status, 0, String(r.stderr));
    assert.deepEqual(fs.readdirSync(data).sort(), ['.versteckt', 'game.override.json', 'journal.jsonl', 'photos', 'snapshot.json']);
    for (const [f, c] of Object.entries(files)) assert.equal(read(path.join(data, f)), c, f);

    // kaputtes Archiv → Fehlercode (geri-yukle.sh bricht dann mit Meldung ab)
    assert.notEqual(sh(restore, [data], Buffer.from('kein tar')).status, 0);
    // nicht vorhandener Ordner → Fehler statt irgendwo zu löschen
    assert.notEqual(sh(wipe, [path.join(tmp, 'gibtsnicht')]).status, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- Rauchtest wie in Produktion (ohne Docker)

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function request(port, pathname, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('timeout')));
    req.end(body);
  });
}

test('Rauchtest: node server.js wie hinter Caddy (CATME_PUBLIC_URL, TRUST_PROXY=1, CATME_DEMO=0)', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-deploy-'));
  const port = await freePort();
  const adminToken = 'deploy-test-admin-token-0123456789';
  const env = { ...process.env, PORT: String(port), HOST: '127.0.0.1', CATME_DATA: dataDir, CATME_PUBLIC_URL: 'https://kedi.example', TRUST_PROXY: '1', CATME_DEMO: '0', CATME_AI: 'off', ADMIN_TOKEN: adminToken, NODE_ENV: 'production' };
  delete env.ANTHROPIC_API_KEY;
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (c) => (log += c));
  child.stderr.on('data', (c) => (log += c));
  const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // warten, bis der Server lauscht
  const t0 = Date.now();
  while (!/läuft: http:\/\//.test(log)) {
    if (child.exitCode !== null) assert.fail(`server.js beendet:\n${log}`);
    if (Date.now() - t0 > 15000) assert.fail(`server.js startet nicht:\n${log}`);
    await new Promise((r) => setTimeout(r, 50));
  }

  // Gesundheit (das prüft auch der Docker-HEALTHCHECK)
  const h = await request(port, '/api/health');
  assert.equal(h.status, 200);
  const health = JSON.parse(h.text);
  assert.equal(health.ok, true);
  assert.equal(health.demo, false);
  assert.ok(!fs.existsSync(path.join(dataDir, 'admin-token.txt')), 'ADMIN_TOKEN aus der Umgebung – keine Token-Datei');

  // Startseite: absolute Vorschaubilder (WhatsApp & Co.)
  const home = await request(port, '/', { headers: { 'Accept-Language': 'tr' } });
  assert.equal(home.status, 200);
  assert.match(home.text, /<meta property="og:image" content="https:\/\/kedi\.example\/media\/og[^"]*\.png">/);
  assert.match(home.text, /<meta name="twitter:image" content="https:\/\/kedi\.example\/media\/og[^"]*\.png">/);
  assert.ok(home.headers['content-security-policy'], 'Sicherheitsköpfe kommen von der App');

  // unbekannter Café-Code → kein Cookie
  const unknown = await request(port, '/?ref=ZZZZZZ', { headers: { 'X-Forwarded-Proto': 'https' } });
  assert.equal(unknown.status, 200);
  assert.equal(unknown.headers['set-cookie'], undefined);

  // echtes Partner-Café anlegen (wie in admin.html) → Code → Cookie; hinter HTTPS-Proxy mit Secure
  const created = await request(port, '/api/admin/places', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'partner', name: 'Rauchtest Kafe', lat: 40.9834, lon: 29.0263, pin: '135790', status: 'approved', active: true, reward: { minCats: 20, discountPct: 20 } }),
  });
  assert.equal(created.status, 200, created.text);
  const code = JSON.parse(created.text).refCode;
  assert.match(code, /^[A-Z0-9]{4,}$/);
  const viaProxy = await request(port, `/?ref=${code}`, { headers: { 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '203.0.113.7' } });
  const cookie = [].concat(viaProxy.headers['set-cookie'] || []).join('\n');
  assert.match(cookie, new RegExp(`catme_ref=${code};`));
  assert.match(cookie, /; HttpOnly; Secure/);
  const plain = await request(port, `/?ref=${code}`);
  const plainCookie = [].concat(plain.headers['set-cookie'] || []).join('\n');
  assert.match(plainCookie, /catme_ref=/);
  assert.doesNotMatch(plainCookie, /Secure/, 'ohne HTTPS kein Secure');

  // Moderation ohne Token gesperrt
  assert.equal((await request(port, '/api/admin/queue')).status, 403);

  // docker stop / systemctl stop schicken SIGTERM → sauber beenden, Daten verdichtet
  child.kill('SIGTERM');
  const { code: exitCode } = await exited;
  assert.equal(exitCode, 0, log);
  const snap = JSON.parse(read(path.join(dataDir, 'snapshot.json')));
  assert.ok(snap.places.some((p) => p.name === 'Rauchtest Kafe'), 'Café nach dem Beenden im Snapshot');
  assert.equal(read(path.join(dataDir, 'journal.jsonl')), '', 'Journal verdichtet');
});

// ---------------------------------------------------------------- Telefon-QR: deploy/qr.sh + server/setup-qr.js (Erweiterung qr-setup)

/** Terminal-Ausgabe → Bild: jedes Zeichen 1 Modul breit, 2 Module hoch (▀ ▄ █). ansi = schwarz auf weiß. */
function terminalToImage(lines, { mode = 'ansi', scale = 6, lightTerminal = false } = {}) {
  // eslint-disable-next-line no-control-regex
  const rows = lines.map((l) => [...l.replace(/\x1b\[[0-9;]*m/g, '').replace(/^ {2}/, '')]);
  const w = Math.max(...rows.map((r) => r.length)) * scale;
  const h = rows.length * 2 * scale;
  const data = new Uint8ClampedArray(w * h * 4);
  // plain: so, wie es ein dunkles Terminal zeigt (helle Zeichen) – oder ein helles (dunkle Zeichen, --invert)
  const ink = mode === 'ansi' ? 0 : lightTerminal ? 25 : 235;
  const bg = mode === 'ansi' ? 255 : lightTerminal ? 250 : 18;
  for (let y = 0; y < h; y++) {
    const row = rows[Math.floor(y / (2 * scale))];
    const top = Math.floor(y / scale) % 2 === 0;
    for (let x = 0; x < w; x++) {
      const ch = row[Math.floor(x / scale)] || ' ';
      const on = ch === '█' || (top ? ch === '▀' : ch === '▄');
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = on ? ink : bg;
      data[i + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

function runCli(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['server/setup-qr.js', ...args], { cwd: ROOT, env: { PATH: process.env.PATH, HOME: os.tmpdir(), ...env } });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (err += c));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

const qrLines = (out) => out.split('\n').filter((l) => /[▀▄█]/.test(l) || /^ {2}\x1b\[30;107m/.test(l)); // eslint-disable-line no-control-regex

test('qr.sh: Hilfe und falsche Eingaben – verständlich, ohne Docker zu brauchen', { skip: !hasBash && 'bash fehlt' }, () => {
  const help = spawnSync('bash', [D('qr.sh'), 'yardim'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /bash deploy\/qr\.sh kafe <kafe-id>/);
  assert.match(help.stdout, /gonullu/);
  for (const [args, msg] of [[['gonullu', '99'], /1 ile 50/], [['gonullu', '0'], /1 ile 50/], [['gonullu', 'x'], /1 ile 50/], [['kafe', '../etc'], /geçersiz/], [['bilinmez'], /Bilinmeyen/], [['admin', 'fazla'], /Fazla/]]) {
    const r = spawnSync('bash', [D('qr.sh'), ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
    assert.equal(r.status, 1, args.join(' '));
    assert.match(r.stderr, msg, args.join(' '));
  }
  const src = read(D('qr.sh'));
  assert.match(src, /qr_goster "\$\{arg\[@\]\}"/);
  assert.doesNotMatch(src, /ADMIN_TOKEN=|env_get ADMIN_TOKEN/, 'qr.sh liest den ADMIN_TOKEN nicht selbst – das macht die App im Container');
  const ortak = read(D('ortak.sh'));
  assert.match(ortak, /dc exec -T app node server\/setup-qr\.js "\$@" --online/, 'laufende App: nur fragen, nie selbst ins Journal');
  assert.match(ortak, /dc run --rm --no-deps -T app node server\/setup-qr\.js "\$@"/, 'App aus: Wegwerf-Container mit demselben Volume');
  const kur = read(D('kur.sh'));
  assert.match(kur, /qr_goster admin/);
  assert.match(kur, /Telefon için QR kod/);
  assert.match(read(path.join(ROOT, 'server', 'setup-qr.js')), /Telefonun kamerasıyla okutun: yönetim sayfası açılır, giriş yapılmış olur/, 'der Hinweis steht einmal, über dem QR');
  assert.match(kur, /bash deploy\/qr\.sh/);
  const k = read(D('KURULUM.md'));
  for (const x of ['bash deploy/qr.sh', 'bash deploy/qr.sh kafe', 'bash deploy/qr.sh gonullu', 'Cihazlar']) assert.ok(k.includes(x), `KURULUM.md erwähnt ${x}`);
});

test('qr.sh: läuft die App → fragt sie (--online); ist sie aus → Wegwerf-Container, der Code gilt nach dem Start', { skip: !hasBash && 'bash fehlt' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-qrsh-'));
  fs.writeFileSync(path.join(tmp, '.env'), 'SITE_DOMAIN=kedi.example\n');
  const run = (running, args) => spawnSync('bash', ['-c', `
    set -euo pipefail
    source "$1"; shift
    docker_kontrol() { :; }
    dc() { printf 'DC %s\\n' "$*"; }
    app_calisiyor() { return ${running ? 0 : 1}; }
    ENV_DOSYA="$TMPENV"
    main "$@"`, 'qr', D('qr.sh'), ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', TMPENV: path.join(tmp, '.env') } });
  try {
    const on = run(true, ['admin']);
    assert.equal(on.status, 0, on.stderr);
    assert.match(on.stdout, /^DC exec -T app node server\/setup-qr\.js admin --online --plain$/m);
    assert.doesNotMatch(on.stderr, /kapalı/);
    const off = run(false, ['kafe', 'pl_abc']);
    assert.equal(off.status, 0, off.stderr);
    assert.match(off.stdout, /^DC run --rm --no-deps -T app node server\/setup-qr\.js partner pl_abc --plain$/m);
    assert.match(off.stderr, /Uygulama şu an kapalı/);
    const vol = run(true, ['gonullu', '5']);
    assert.match(vol.stdout, /setup-qr\.js volunteer 5 --online --plain$/m);
    fs.rmSync(path.join(tmp, '.env'));
    const none = run(true, ['admin']);
    assert.equal(none.status, 1);
    assert.match(none.stderr, /Kurulum bulunamadı/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('shellcheck: deploy/*.sh ohne Befund (wenn shellcheck installiert ist)', { skip: spawnSync('bash', ['-c', 'command -v shellcheck']).status !== 0 && 'shellcheck fehlt' }, () => {
  const r = spawnSync('shellcheck', ['-x', ...SCRIPTS.map((f) => `deploy/${f}`)], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('setup-qr.js: Terminal-QR (farbig und ohne Farben) ist lesbar, führt zur angemeldeten Moderation, ohne ADMIN_TOKEN', { timeout: 60000 }, async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const jsQRmod = require('jsqr');
  const jsQR = jsQRmod.default || jsQRmod;
  const { createApp } = await import('../server/app.js');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-cli-'));
  const adminToken = 'cli-test-admin-token-0123456789abcdef';
  const app = await createApp({ dataDir, aiMode: 'mock', demo: false, adminToken, publicUrl: 'https://kedi.example', log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const port = app.server.address().port;
  const env = { PORT: String(port), ADMIN_TOKEN: adminToken, CATME_DATA: dataDir };
  const exchange = async (url) => {
    const code = new URL(url).hash.replace(/^#setup=/, '');
    const res = await fetch(`http://127.0.0.1:${port}/api/setup/admin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    return res.status;
  };
  try {
    for (const mode of ['ansi', 'plain']) {
      const r = await runCli(['admin', ...(mode === 'plain' ? ['--plain'] : [])], env);
      assert.equal(r.code, 0, r.err);
      assert.ok(!r.out.includes(adminToken), 'kein ADMIN_TOKEN in der Ausgabe');
      const link = /Bağlantı: +(\S+)/.exec(r.out)[1];
      assert.match(link, /^https:\/\/kedi\.example\/admin\.html#setup=[A-Za-z0-9_-]{24}$/, 'CATME_PUBLIC_URL der App');
      assert.match(r.out, /10 dakika geçerli/);
      const lines = qrLines(r.out);
      if (mode === 'ansi') assert.ok(lines.every((l) => l.includes('\x1b[30;107m') && l.endsWith('\x1b[0m')), 'feste Farben: schwarz auf weiß, Zeilenende zurückgesetzt');
      else assert.ok(lines.every((l) => !l.includes('\x1b')), 'ohne Farben');
      // Ruhezone: 4 Module rundherum = 2 helle Zeilen oben, 4 helle Spalten links
      const plainLines = lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').slice(2)); // eslint-disable-line no-control-regex
      const light = mode === 'ansi' ? ' ' : '█';
      assert.equal(plainLines[0], light.repeat(plainLines[0].length), 'Ruhezone oben');
      assert.ok(plainLines.every((l) => l.startsWith(light.repeat(4)) && l.endsWith(light.repeat(4))), 'Ruhezone links/rechts');
      const img = terminalToImage(lines, { mode });
      const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: mode === 'ansi' ? 'dontInvert' : 'attemptBoth' });
      assert.ok(qr, `${mode}: QR aus dem Terminal lesbar`);
      assert.equal(qr.data, link);
      assert.equal(await exchange(link), 201, `${mode}: Code öffnet die Moderation`);
    }
    // --plain --invert (helles Terminal ohne Farben): dunkle Zeichen auf hellem Grund, ebenfalls lesbar
    const inv = await runCli(['admin', '--plain', '--invert'], env);
    const invLink = /Bağlantı: +(\S+)/.exec(inv.out)[1];
    const invImg = terminalToImage(qrLines(inv.out), { mode: 'plain', lightTerminal: true });
    assert.equal(jsQR(invImg.data, invImg.width, invImg.height, { inversionAttempts: 'dontInvert' }).data, invLink, 'helles Terminal');
    // passt in ein 80 Zeichen breites Terminal (auch mit langer Domain)
    const wide = await runCli(['admin', '--base', 'https://kedi-kadikoy-sokak-kedileri.example.com.tr'], env);
    assert.ok(qrLines(wide.out).every((l) => l.replace(/\x1b\[[0-9;]*m/g, '').length <= 80), 'höchstens 80 Spalten'); // eslint-disable-line no-control-regex
    // --base, NO_COLOR, Café-Liste, Café-QR, Freiwillige, JSON
    const nc = await runCli(['admin', '--base', 'https://andere.example/'], { ...env, NO_COLOR: '1' });
    assert.match(nc.out, /https:\/\/andere\.example\/admin\.html#setup=/);
    assert.ok(!nc.out.includes('\x1b['), 'NO_COLOR → ohne Farben');
    const cafe = (await (await fetch(`http://127.0.0.1:${port}/api/admin/places`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'partner', name: 'Terminal Kafe', lat: 40.9853, lon: 29.0261, reward: { minCats: 20, discountPct: 20 } }) })).json());
    const list = await runCli(['kafe'], env);
    assert.match(list.out, new RegExp(`${cafe.id}\\s+Terminal Kafe.*PIN henüz yok`));
    const cq = await runCli(['kafe', cafe.id, '--json'], env);
    const cj = JSON.parse(cq.out);
    assert.equal(cj.placeName, 'Terminal Kafe');
    assert.match(cj.url, /^https:\/\/kedi\.example\/partner\.html#setup=/);
    const vq = await runCli(['gonullu', '7', '--json'], env);
    assert.equal(JSON.parse(vq.out).maxUses, 7);
    assert.match(JSON.parse(vq.out).url, /\/app\.html#invite=/);
    assert.equal((await runCli(['kafe', 'pl_gibtsnicht'], env)).code, 1);
    assert.match((await runCli(['admin'], { ...env, ADMIN_TOKEN: 'falsch-falsch-falsch-falsch' })).err, /ADMIN_TOKEN kabul edilmedi/);
    assert.equal((await runCli(['gonullu', '51'], env)).code, 2);
    const codes = app.engine.ctx.store.setupCodes.all();
    assert.ok(codes.every((d) => d.via === 'terminal'));
  } finally {
    await app.close();
  }

  // App aus: Code wird ans Journal angehängt (nichts überschrieben) und gilt nach dem Start
  try {
    const before = read(path.join(dataDir, 'snapshot.json'));
    // --online (qr.sh bei laufendem Container): nie selbst ins Journal, sondern klar abbrechen
    const jBefore = read(path.join(dataDir, 'journal.jsonl'));
    const on = await runCli(['admin', '--online'], { ...env, PORT: String(port), CATME_QR_RETRIES: '2' });
    assert.equal(on.code, 1);
    assert.match(on.err, /yanıt vermiyor/);
    assert.equal(read(path.join(dataDir, 'journal.jsonl')), jBefore, '--online schreibt nichts');
    // ohne ADMIN_TOKEN (weder Umgebung noch admin-token.txt) kein Code
    const noTok = await runCli(['admin'], { PORT: String(port), CATME_DATA: dataDir });
    assert.equal(noTok.code, 1);
    assert.match(noTok.err, /ADMIN_TOKEN bulunamadı/);
    assert.equal(read(path.join(dataDir, 'journal.jsonl')), jBefore);
    fs.appendFileSync(path.join(dataDir, 'journal.jsonl'), '{"op":"insert","col":"ca'); // halbe Zeile (Absturz)
    const r = await runCli(['admin', '--base', 'https://kedi.example', '--plain'], { ...env, PORT: String(port) });
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /Uygulama kapalıydı/);
    assert.equal(read(path.join(dataDir, 'snapshot.json')), before, 'Snapshot unverändert');
    const link = /Bağlantı: +(\S+)/.exec(r.out)[1];
    const img = terminalToImage(qrLines(r.out), { mode: 'plain' });
    assert.equal(jsQR(img.data, img.width, img.height).data, link);
    const foreign = await runCli(['admin', '--base', 'https://kedi.example', '--json'], { ...env, ADMIN_TOKEN: 'ganz-anderer-token-0123456789' });
    assert.equal(foreign.code, 0, foreign.err);
    const foreignCode = new URL(JSON.parse(foreign.out).url).hash.replace(/^#setup=/, '');
    const { createApp } = await import('../server/app.js');
    const again = await createApp({ dataDir, aiMode: 'mock', demo: false, adminToken, log: () => {} });
    await new Promise((res) => again.server.listen(0, '127.0.0.1', res));
    try {
      const code = new URL(link).hash.replace(/^#setup=/, '');
      const res = await fetch(`http://127.0.0.1:${again.server.address().port}/api/setup/admin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      assert.equal(res.status, 201, 'Code aus dem Journal gilt nach dem Start');
      // mit einem anderen ADMIN_TOKEN geschrieben → gilt nicht (gehört nicht zu diesem Token)
      const res2 = await fetch(`http://127.0.0.1:${again.server.address().port}/api/setup/admin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: foreignCode }) });
      assert.equal(res2.status, 400);
    } finally {
      await again.close();
    }
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
