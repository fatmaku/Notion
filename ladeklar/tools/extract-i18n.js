// Collects every t('…') key from the UI. Driver/login/common screens need all eight
// languages, office/licensor screens English + Turkish. Error messages of the engine and the server
// (fail('code', '…'), json error messages) are shown through t(err.message) on every screen, so they
// need all eight languages too (C8). Writes web/js/lang/_keys.json (or the path given as argument).
import fs from 'node:fs';
import path from 'node:path';
const repo = new URL('..', import.meta.url).pathname;
const root = path.join(repo, 'web/js/');
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'lang') walk(p); } else if (f.endsWith('.js')) files.push(p); } };
walk(root);
const keys = new Map();
const add = (k, scope) => { const cur = keys.get(k) || new Set(); cur.add(scope); keys.set(k, cur); };
const DRIVER = /views\/(driver|login|common)\.js$|\/(app|format|api-http)\.js$/;
const unq = (s) => s.replace(/\\'/g, "'");
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const scope = DRIVER.test(f) ? 'driver' : 'office';
  for (const m of src.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) add(unq(m[1]), scope);
  // labels kept in arrays and translated with t(variable)
  const camel = (x) => /^[a-z]+[A-Z]\w*$/.test(x); // method names, not labels
  for (const m of src.matchAll(/\['(\w+)', '[\w-]+', '([^']+)', '([^']+)'\]/g)) if (!camel(m[2])) { add(m[2], scope); add(m[3], scope); }
  // client-side error messages, shown through t(e.message)
  for (const m of src.matchAll(/new (?:Api)?Error\(\s*(?:'\w+',\s*)?'((?:[^'\\]|\\.)*)'/g)) add(unq(m[1]), 'driver');
}
for (const k of ['Impressum', 'Datenschutz', 'AGB']) add(k, 'driver');

/** The string literals inside each call `name(…)` (balanced parentheses, quotes respected). */
function callArgs(src, name) {
  const out = [];
  const re = new RegExp(`\\b${name}\\(`, 'g');
  for (let m; (m = re.exec(src));) {
    let depth = 1, i = re.lastIndex, lit = [], q = null, cur = '';
    for (; i < src.length && depth; i++) {
      const c = src[i];
      if (q) { if (c === '\\') { cur += src[i + 1]; i++; } else if (c === q) { if (q === "'") lit.push(cur); q = null; cur = ''; } else cur += c; continue; }
      if (c === "'" || c === '`' || c === '"') q = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    out.push(lit);
  }
  return out;
}
// a message, not a code or a status word: has a blank or ends like a sentence
const isMessage = (s) => /\s/.test(s.trim()) || /[.!?]$/.test(s);
const engine = fs.readFileSync(path.join(repo, 'core/engine.js'), 'utf8');
for (const fn of ['fail', 'loginRefused', 'new EngineError']) {
  for (const lit of callArgs(engine, fn.replace('new ', 'new\\s+'))) {
    // fail('code', '…'), loginRefused(u, meta, extra, 'code', '…'): the code comes first
    const msgs = lit.filter((x, i) => !(i === 0 && /^\w+$/.test(x))).filter(isMessage);
    for (const x of msgs) add(x, 'driver');
  }
}
const server = fs.readFileSync(path.join(repo, 'server/index.js'), 'utf8');
for (const m of server.matchAll(/\bmessage:\s*'((?:[^'\\]|\\.)*)'/g)) add(unq(m[1]), 'driver');
for (const lit of callArgs(server, 'new\\s+EngineError')) for (const x of lit.slice(1).filter(isMessage)) add(x, 'driver');

const out = {};
for (const [k, s] of [...keys.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'))) out[k] = s.has('driver') ? 'all' : 'office';
const dest = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'lang', '_keys.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
const all = Object.values(out).filter((v) => v === 'all').length;
console.log(`${Object.keys(out).length} keys (${all} for all 8 languages, ${Object.keys(out).length - all} office-only) → ${path.relative(process.cwd(), dest)}`);
