// Test helper: a tiny in-process WebSocket server (RFC 6455, text frames, small payloads) built on
// Node's http upgrade – enough to play "Twitch IRC" for server/chat-twitch.js without a dependency.
//
//   const srv = await startWsServer();                 // { url: 'ws://127.0.0.1:<port>', connections, close() }
//   srv.onConnection((conn) => { conn.onMessage((text) => …); conn.send('…'); conn.close(); });
//   await srv.nextConnection();                        // resolves with the next conn
'use strict';

const http = require('http');
const crypto = require('crypto');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function encodeFrame(text, opcode = 0x1) {
  const payload = Buffer.from(text, 'utf8');
  let header;
  if (payload.length < 126) header = Buffer.from([0x80 | opcode, payload.length]);
  else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, payload]);
}

/** Decodes one frame from buf; returns { opcode, payload, rest } or null when incomplete. */
function decodeFrame(buf) {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let len = buf[1] & 0x7f;
  let off = 2;
  if (len === 126) {
    if (buf.length < 4) return null;
    len = buf.readUInt16BE(2);
    off = 4;
  } else if (len === 127) {
    if (buf.length < 10) return null;
    len = Number(buf.readBigUInt64BE(2));
    off = 10;
  }
  let mask = null;
  if (masked) {
    if (buf.length < off + 4) return null;
    mask = buf.subarray(off, off + 4);
    off += 4;
  }
  if (buf.length < off + len) return null;
  const payload = Buffer.from(buf.subarray(off, off + len));
  if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
  return { opcode, payload, rest: buf.subarray(off + len) };
}

function makeConn(socket) {
  const handlers = [];
  const closeHandlers = [];
  const conn = {
    socket,
    received: [],
    closed: false,
    send(text) {
      if (conn.closed) return false;
      socket.write(encodeFrame(text));
      return true;
    },
    onMessage(fn) {
      handlers.push(fn);
    },
    onClose(fn) {
      closeHandlers.push(fn);
    },
    /** Resolves with the next text message matching `re` (or any). Already received ones count. */
    next(re, ms = 3000) {
      const found = conn.received.find((m) => !m._used && (!re || re.test(m.text)));
      if (found) {
        found._used = true;
        return Promise.resolve(found.text);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`ws-server: timeout waiting for ${re || 'message'}`)), ms);
        handlers.push((text, entry) => {
          if (entry._used || (re && !re.test(text))) return;
          entry._used = true;
          clearTimeout(timer);
          resolve(text);
        });
      });
    },
    close() {
      if (conn.closed) return;
      conn.closed = true;
      try {
        socket.write(encodeFrame('', 0x8));
      } catch (_) {
        /* ignore */
      }
      socket.end();
    },
  };
  let buf = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const f = decodeFrame(buf);
      if (!f) break;
      buf = f.rest;
      if (f.opcode === 0x1) {
        const text = f.payload.toString('utf8');
        const entry = { text, _used: false };
        conn.received.push(entry);
        for (const h of handlers.slice()) h(text, entry);
      } else if (f.opcode === 0x9) socket.write(encodeFrame(f.payload.toString('utf8'), 0xa));
      else if (f.opcode === 0x8) {
        if (!conn.closed) {
          conn.closed = true;
          try {
            socket.write(encodeFrame('', 0x8));
          } catch (_) {
            /* ignore */
          }
        }
        socket.end();
      }
    }
  });
  const bye = () => {
    conn.closed = true;
    for (const h of closeHandlers) h();
  };
  socket.on('close', bye);
  socket.on('error', bye);
  return conn;
}

function startWsServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(426, { 'content-type': 'text/plain' });
    res.end('upgrade required');
  });
  const connections = [];
  const connHandlers = [];
  const waiters = [];
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key || String(req.headers.upgrade || '').toLowerCase() !== 'websocket') {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, '', ''].join('\r\n'));
    const conn = makeConn(socket);
    connections.push(conn);
    for (const h of connHandlers) h(conn);
    while (waiters.length) waiters.shift()(conn);
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `ws://127.0.0.1:${port}`,
        port,
        connections,
        onConnection: (fn) => connHandlers.push(fn),
        nextConnection(ms = 5000) {
          return new Promise((res, rej) => {
            const timer = setTimeout(() => rej(new Error('ws-server: no connection')), ms);
            waiters.push((c) => {
              clearTimeout(timer);
              res(c);
            });
          });
        },
        close() {
          for (const c of connections) c.close();
          return new Promise((res) => server.close(() => res()));
        },
      });
    });
  });
}

module.exports = { startWsServer, encodeFrame, decodeFrame };
