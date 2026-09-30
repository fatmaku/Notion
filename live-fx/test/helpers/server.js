// Test helpers: spawn server.js on a random port with an isolated data dir, plus tiny HTTP / SSE clients.
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');

const SERVER = path.join(__dirname, '..', '..', 'server.js');

function waitFor(fn, { timeoutMs = 10000, intervalMs = 50, what = 'condition' } = {}) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (async function tick() {
      try {
        const v = await fn();
        if (v) return resolve(v);
      } catch (_) {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) return reject(new Error(`timeout waiting for ${what}`));
      setTimeout(tick, intervalMs);
    })();
  });
}

/** GET over https accepting self-signed certs; resolves {status} (body discarded). */
function httpsStatus(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        res.resume();
        res.on('end', () => resolve({ status: res.statusCode }));
      })
      .on('error', reject);
  });
}

/** Starts server.js. Resolves once /health answers. `https: true` when env carries LIVEFX_TLS_CERT/KEY. */
async function startServer({ env = {}, https: useHttps = false } = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-test-'));
  const token = env.LIVEFX_TOKEN || 'test-token';
  const proc = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      PORT: '0',
      HOST: '127.0.0.1',
      LIVEFX_DATA_DIR: dataDir,
      LIVEFX_TOKEN: token,
      LIVEFX_SMART_MOCK: '1',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  let err = '';
  proc.stdout.on('data', (d) => (out += d));
  proc.stderr.on('data', (d) => (err += d));
  const exited = new Promise((resolve) => proc.on('exit', (code) => resolve(code)));

  let base;
  try {
    base = await waitFor(
      () => {
        const m = (useHttps ? /https:\/\/[^\s/]+:\d+/ : /http:\/\/[^\s/]+:\d+/).exec(out);
        return m ? m[0] : null;
      },
      { what: `server URL in stdout (stderr: ${err.slice(0, 300)})` }
    );
    if (useHttps) await waitFor(async () => (await httpsStatus(`${base}/health`)).status === 200, { what: '/health (https)' });
    else await waitFor(async () => (await fetch(`${base}/health`)).ok, { what: '/health' });
  } catch (e) {
    proc.kill('SIGKILL');
    throw new Error(`${e.message}\nstdout: ${out}\nstderr: ${err}`);
  }

  async function stop() {
    if (proc.exitCode === null) {
      proc.kill('SIGTERM');
      await Promise.race([exited, new Promise((r) => setTimeout(r, 2000))]);
      if (proc.exitCode === null) proc.kill('SIGKILL');
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  return { base, dataDir, token, proc, stop, logs: () => ({ out, err }) };
}

/** Minimal fetch wrapper returning {status, headers, json, text}. */
async function api(base, method, p, { json: body, body: raw, headers = {}, token } = {}) {
  const h = { ...headers };
  if (token) h.authorization = `Bearer ${token}`;
  let payload = raw;
  if (body !== undefined) {
    h['content-type'] = h['content-type'] || 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + p, { method, headers: h, body: payload });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    /* not json */
  }
  return { status: res.status, headers: res.headers, json: parsed, text };
}

/** Subscribes to /events and lets tests await the next message of a given type. */
function sseClient(base, { role = 'overlay', lastEventId } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${base}/events?role=${role}`);
    const headers = { accept: 'text/event-stream' };
    if (lastEventId !== undefined) headers['last-event-id'] = String(lastEventId);
    const req = http.get(url, { headers }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`SSE status ${res.statusCode}`));
        return;
      }
      const client = { events: [], retry: null, res, closed: false };
      const waiters = [];
      let buf = '';
      let curId = null;
      let curData = [];

      function deliver(ev) {
        ev._consumed = false;
        client.events.push(ev);
        for (let i = 0; i < waiters.length; i++) {
          const w = waiters[i];
          if (!w.type || ev.msg.type === w.type) {
            waiters.splice(i, 1);
            clearTimeout(w.timer);
            ev._consumed = true; // each event is handed out by next() exactly once
            w.resolve(ev.msg);
            return;
          }
        }
      }
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        let idx;
        while ((idx = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, idx).replace(/\r$/, '');
          buf = buf.slice(idx + 1);
          if (line === '') {
            if (curData.length) {
              let msg = null;
              try {
                msg = JSON.parse(curData.join('\n'));
              } catch (_) {
                msg = { type: '_unparsable', raw: curData.join('\n') };
              }
              deliver({ id: curId, msg });
            }
            curId = null;
            curData = [];
          } else if (line.startsWith(':')) {
            /* comment / heartbeat */
          } else if (line.startsWith('retry:')) client.retry = Number(line.slice(6).trim());
          else if (line.startsWith('id:')) curId = Number(line.slice(3).trim());
          else if (line.startsWith('data:')) curData.push(line.slice(5).replace(/^ /, ''));
        }
      });
      res.on('close', () => (client.closed = true));

      client.next = (type, ms = 3000) => {
        const already = client.events.findIndex((e) => !e._consumed && (!type || e.msg.type === type));
        if (already !== -1) {
          client.events[already]._consumed = true;
          return Promise.resolve(client.events[already].msg);
        }
        return new Promise((res2, rej2) => {
          const w = { type, resolve: (m) => res2(m), timer: null };
          w.timer = setTimeout(() => {
            const i = waiters.indexOf(w);
            if (i !== -1) waiters.splice(i, 1);
            rej2(new Error(`timeout waiting for SSE message${type ? ` of type ${type}` : ''}`));
          }, ms);
          waiters.push(w);
        });
      };
      client.close = () => req.destroy();
      // Mark events consumed only via next(); the initial `state` message counts as an event too.
      client.events.forEach((e) => (e._consumed = false));
      resolve(client);
    });
    req.on('error', reject);
  });
}

module.exports = { startServer, api, sseClient, waitFor };
