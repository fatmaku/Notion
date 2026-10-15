// LiveFX – optional internet remote via a Cloudflare "quick tunnel" (2.2, docs/HANDY.md §Internet-Fernzugriff).
//
//   cloudflared tunnel --url http://127.0.0.1:<port> --no-autoupdate
//
// prints a random `https://<words>.trycloudflare.com` URL on stderr; every request to it is forwarded to the
// local server. Free, no account, no port forwarding. The phone link becomes a pairing link
// `https://<tunnel>/p#<secret>` (2.3, server/api-pairing.js – the master token is not part of it), which is a secure
// context, so the phone microphone works without a self-signed certificate. Requests through the tunnel are never
// treated as local (server/auth.js viaTunnel / isLocal), even though cloudflared connects from 127.0.0.1.
//
// Binary: `LIVEFX_CLOUDFLARED` (explicit path) → `cloudflared` on PATH → `<dataDir>/bin/cloudflared(.exe)`;
// missing → one-time download of the official GitHub release for this platform into `<dataDir>/bin/`.
// The download is verified against the SHA-256 the release publishes (release notes / `.sha256` asset);
// when no checksum can be fetched, the hash is recorded next to the binary and a warning is logged.
//
// Status machine: idle → starting → online | error; stop() → idle. The child dies with the server (SIGTERM
// on stop/shutdown, `process.on('exit')` kill as a last resort). Everything that touches the outside world
// (`spawn`, `fetch`, platform, which) is injectable so the tests can run with a fake cloudflared script.
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const childProcess = require('child_process');

const RELEASES = 'https://github.com/cloudflare/cloudflared/releases';
const LATEST_DOWNLOAD = `${RELEASES}/latest/download`;
const LATEST_API = 'https://api.github.com/repos/cloudflare/cloudflared/releases/latest';
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
const START_TIMEOUT_MS = 45000;
const DOWNLOAD_MAX_BYTES = 120 * 1024 * 1024;
const STDERR_TAIL = 2000;

/** Release asset for a platform; null when Cloudflare ships none. */
function assetFor(platform, arch) {
  const a = arch === 'arm64' || arch === 'aarch64' ? 'arm64' : arch === 'x64' || arch === 'amd64' ? 'amd64' : arch === 'ia32' || arch === 'x86' ? '386' : null;
  if (!a) return null;
  if (platform === 'linux') return { name: `cloudflared-linux-${a}`, archive: null };
  if (platform === 'win32') return a === '386' ? { name: 'cloudflared-windows-386.exe', archive: null } : { name: 'cloudflared-windows-amd64.exe', archive: null };
  if (platform === 'darwin') return { name: `cloudflared-darwin-${a === '386' ? 'amd64' : a}.tgz`, archive: 'tgz' };
  return null;
}

/** Minimal tar reader: returns the content of the first regular file called `cloudflared` (gunzipped input). */
function extractFromTgz(buf) {
  const tar = zlib.gunzipSync(buf);
  let off = 0;
  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/s, '');
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/s, '').trim() || '0', 8);
    const type = String.fromCharCode(header[156]);
    const start = off + 512;
    if ((type === '0' || type === '\0') && path.posix.basename(name) === 'cloudflared') return tar.subarray(start, start + size);
    off = start + Math.ceil(size / 512) * 512;
  }
  throw new Error('cloudflared nicht im Archiv gefunden');
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** Looks for an executable on PATH (`which`), without spawning anything. */
function findOnPath(names, env = process.env, platform = process.platform) {
  const dirs = String(env.PATH || env.Path || '').split(platform === 'win32' ? ';' : ':').filter(Boolean);
  for (const dir of dirs) {
    for (const n of names) {
      const p = path.join(dir, n);
      try {
        fs.accessSync(p, fs.constants.X_OK);
        if (fs.statSync(p).isFile()) return p;
      } catch (_) {
        /* next */
      }
    }
  }
  return null;
}

function createTunnel(opts = {}) {
  const {
    dataDir = path.join(os.tmpdir(), 'livefx'),
    log = () => {},
    spawn = childProcess.spawn,
    fetch: fetchImpl = globalThis.fetch,
    platform = process.platform,
    arch = process.arch,
    env = process.env,
    getPort = () => 8787,
    startTimeoutMs = START_TIMEOUT_MS,
    binaryPath = null,
  } = opts;

  const asset = assetFor(platform, arch);
  const binDir = path.join(dataDir, 'bin');
  const localBin = path.join(binDir, platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
  const manualUrl = asset ? `${LATEST_DOWNLOAD}/${asset.name}` : RELEASES;

  const state = { status: 'idle', url: null, hostname: null, since: null, error: null, binary: null, checksum: null, lastStderr: '' };
  const listeners = new Set();
  let child = null;
  let starting = null;
  let stopping = false;

  function emit() {
    for (const fn of listeners) {
      try {
        fn(status());
      } catch (e) {
        log('tunnel listener failed:', e.message);
      }
    }
  }

  function set(patch) {
    Object.assign(state, patch);
    emit();
  }

  function status() {
    return {
      status: state.status,
      url: state.url,
      hostname: state.hostname,
      since: state.since,
      error: state.error,
      binary: state.binary,
      checksum: state.checksum,
      manualUrl,
      binDir,
      supported: !!asset,
    };
  }

  // ---- binary ----
  function existingBinary() {
    const explicit = binaryPath || (typeof env.LIVEFX_CLOUDFLARED === 'string' ? env.LIVEFX_CLOUDFLARED.trim() : '');
    if (explicit) {
      try {
        fs.accessSync(explicit, fs.constants.X_OK);
        return explicit;
      } catch (_) {
        throw new Error(`LIVEFX_CLOUDFLARED zeigt auf keine ausführbare Datei: ${explicit}`);
      }
    }
    const onPath = findOnPath(platform === 'win32' ? ['cloudflared.exe', 'cloudflared'] : ['cloudflared'], env, platform);
    if (onPath) return onPath;
    try {
      fs.accessSync(localBin, fs.constants.X_OK);
      return localBin;
    } catch (_) {
      return null;
    }
  }

  async function fetchBytes(url, { max = DOWNLOAD_MAX_BYTES, accept } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('kein fetch verfügbar');
    const r = await fetchImpl(url, { redirect: 'follow', headers: { 'user-agent': 'LiveFX', ...(accept ? { accept } : {}) } });
    if (!r || !r.ok) throw new Error(`HTTP ${r ? r.status : '?'} für ${url}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > max) throw new Error(`Download zu groß (${buf.length} Bytes)`);
    return buf;
  }

  /** Published SHA-256 for `assetName`: `.sha256` sidecar asset, else the release notes (`<name> … <64 hex>`). */
  async function publishedChecksum(assetName) {
    try {
      const txt = (await fetchBytes(`${LATEST_DOWNLOAD}/${assetName}.sha256`, { max: 4096 })).toString('utf8');
      const m = /\b([a-f0-9]{64})\b/i.exec(txt);
      if (m) return m[1].toLowerCase();
    } catch (_) {
      /* no sidecar */
    }
    try {
      const body = JSON.parse((await fetchBytes(LATEST_API, { max: 2 * 1024 * 1024, accept: 'application/vnd.github+json' })).toString('utf8'));
      const notes = String((body && body.body) || '');
      const esc = assetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m = new RegExp(`${esc}[^a-f0-9]{0,200}?([a-f0-9]{64})\\b`, 'i').exec(notes) || new RegExp(`([a-f0-9]{64})[^a-f0-9]{0,200}?${esc}`, 'i').exec(notes);
      if (m) return m[1].toLowerCase();
    } catch (_) {
      /* no release notes */
    }
    return null;
  }

  async function download() {
    if (!asset) throw new Error(`Für ${platform}/${arch} gibt es kein cloudflared – manuell installieren: ${RELEASES}`);
    const url = `${LATEST_DOWNLOAD}/${asset.name}`;
    log(`tunnel: lade cloudflared herunter (${url})`);
    let raw;
    try {
      raw = await fetchBytes(url);
    } catch (e) {
      throw new Error(`cloudflared konnte nicht geladen werden (${e.message}). Manuell herunterladen: ${url} → als „${path.basename(localBin)}“ nach ${binDir} legen (oder LIVEFX_CLOUDFLARED=<Pfad> setzen).`);
    }
    const hash = sha256(raw);
    const expected = await publishedChecksum(asset.name);
    if (expected && expected !== hash) throw new Error(`cloudflared-Download beschädigt: SHA-256 ${hash} ≠ veröffentlicht ${expected} – bitte erneut versuchen oder manuell laden: ${url}`);
    if (!expected) log(`tunnel: ⚠️ keine Prüfsumme abrufbar – SHA-256 ${hash} wird in ${binDir} notiert (bitte mit ${RELEASES} vergleichen)`);
    const bin = asset.archive === 'tgz' ? extractFromTgz(raw) : raw;
    fs.mkdirSync(binDir, { recursive: true });
    const tmp = `${localBin}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, bin, { mode: 0o755 });
    fs.renameSync(tmp, localBin);
    try {
      fs.chmodSync(localBin, 0o755);
    } catch (_) {
      /* windows */
    }
    fs.writeFileSync(`${localBin}.sha256`, `${hash}  ${asset.name}${expected ? '' : '  (unverifiziert)'}\n`);
    state.checksum = { sha256: hash, verified: !!expected };
    log(`tunnel: cloudflared gespeichert: ${localBin} (SHA-256 ${hash.slice(0, 12)}…${expected ? ', geprüft' : ', ungeprüft'})`);
    return localBin;
  }

  async function ensureBinary() {
    const have = existingBinary();
    if (have) return have;
    return download();
  }

  // ---- child ----
  function killChild(proc) {
    if (!proc || proc.exitCode !== null || proc.killed) return;
    try {
      proc.kill('SIGTERM');
    } catch (_) {
      /* already gone */
    }
    const t = setTimeout(() => {
      try {
        if (proc.exitCode === null) proc.kill('SIGKILL');
      } catch (_) {
        /* ignore */
      }
    }, 1500);
    if (typeof t.unref === 'function') t.unref();
  }

  function onExit() {
    const proc = child;
    child = null;
    if (proc) killChild(proc);
  }
  process.on('exit', onExit);

  function spawnTunnel(bin, port) {
    return new Promise((resolve) => {
      let settled = false;
      let stderr = '';
      let timer = null;
      const finish = (patch) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(patch);
      };
      let proc;
      try {
        proc = spawn(bin, ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      } catch (e) {
        finish({ status: 'error', error: `cloudflared startet nicht: ${e.message}`, url: null, hostname: null });
        return;
      }
      child = proc;
      timer = setTimeout(() => {
        killChild(proc);
        finish({ status: 'error', error: `cloudflared hat in ${Math.round(startTimeoutMs / 1000)} s keine Adresse gemeldet (Internet? Firewall?)`, url: null, hostname: null });
      }, startTimeoutMs);
      if (typeof timer.unref === 'function') timer.unref();
      const onData = (d) => {
        stderr = (stderr + String(d)).slice(-STDERR_TAIL);
        state.lastStderr = stderr;
        const m = URL_RE.exec(stderr);
        if (m) {
          const url = m[0].toLowerCase();
          finish({ status: 'online', url, hostname: new URL(url).hostname, since: new Date().toISOString(), error: null });
        }
      };
      if (proc.stderr) proc.stderr.on('data', onData);
      if (proc.stdout) proc.stdout.on('data', onData);
      proc.on('error', (e) => {
        finish({ status: 'error', error: `cloudflared startet nicht: ${e.message}`, url: null, hostname: null });
      });
      proc.on('exit', (code, signal) => {
        if (child === proc) child = null;
        const tail = stderr.trim().split('\n').slice(-3).join(' | ').slice(0, 300);
        if (!settled) finish({ status: 'error', error: `cloudflared beendet (${signal || `Code ${code}`})${tail ? `: ${tail}` : ''}`, url: null, hostname: null });
        else if (!stopping && state.status === 'online') set({ status: 'error', error: `Tunnel abgebrochen (${signal || `Code ${code}`}) – erneut starten`, url: null, hostname: null, since: null });
      });
    });
  }

  async function start() {
    if (state.status === 'online') return status();
    if (starting) return starting;
    stopping = false;
    set({ status: 'starting', error: null, url: null, hostname: null, since: null });
    starting = (async () => {
      let bin;
      try {
        bin = await ensureBinary();
      } catch (e) {
        set({ status: 'error', error: e.message });
        return status();
      }
      state.binary = bin;
      const port = Number(getPort()) || 8787;
      const result = await spawnTunnel(bin, port);
      if (stopping) {
        set({ status: 'idle', url: null, hostname: null, since: null, error: null });
        return status();
      }
      set(result);
      if (result.status === 'online') log(`tunnel: online ${result.url}`);
      else log(`tunnel: Fehler – ${result.error}`);
      return status();
    })().finally(() => {
      starting = null;
    });
    return starting;
  }

  async function stop() {
    stopping = true;
    const proc = child;
    child = null;
    if (proc) killChild(proc);
    if (starting) await starting.catch(() => {});
    set({ status: 'idle', url: null, hostname: null, since: null, error: null });
    return status();
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function dispose() {
    process.removeListener('exit', onExit);
    return stop();
  }

  return { start, stop, status, onChange, dispose, ensureBinary, get child() { return child; } };
}

module.exports = { createTunnel, assetFor, extractFromTgz, findOnPath, sha256, URL_RE, RELEASES, LATEST_DOWNLOAD };
