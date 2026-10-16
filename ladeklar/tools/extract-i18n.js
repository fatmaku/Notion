// Collects every t('…') key from the UI. Driver/login/common screens need all eight
// languages, office/licensor screens English + Turkish. Writes web/js/lang/_keys.json.
import fs from 'node:fs';
import path from 'node:path';
const root = new URL('../web/js/', import.meta.url).pathname;
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'lang') walk(p); } else if (f.endsWith('.js')) files.push(p); } };
walk(root);
const keys = new Map();
const add = (k, scope) => { const cur = keys.get(k) || new Set(); cur.add(scope); keys.set(k, cur); };
const DRIVER = /views\/(driver|login|common)\.js$|\/(app|format|api-http)\.js$/;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const scope = DRIVER.test(f) ? 'driver' : 'office';
  for (const m of src.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) add(m[1].replace(/\\'/g, "'"), scope);
  // labels kept in arrays and translated with t(variable)
  for (const m of src.matchAll(/\['(\w+)', '[\w-]+', '([^']+)', '([^']+)'\]/g)) { add(m[2], scope); add(m[3], scope); }
}
for (const k of ['Impressum', 'Datenschutz', 'AGB']) add(k, 'driver');
const out = {};
for (const [k, s] of [...keys.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'))) out[k] = s.has('driver') ? 'all' : 'office';
fs.writeFileSync(path.join(root, 'lang', '_keys.json'), JSON.stringify(out, null, 1));
const all = Object.values(out).filter((v) => v === 'all').length;
console.log(`${Object.keys(out).length} keys (${all} for all 8 languages, ${Object.keys(out).length - all} office-only)`);
