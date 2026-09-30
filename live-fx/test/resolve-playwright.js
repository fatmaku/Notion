// Resolves playwright from the local node_modules first, then from the global npm root.
'use strict';

const { execSync } = require('child_process');
const path = require('path');

function resolve() {
  const candidates = [process.cwd(), path.join(__dirname, '..')];
  try {
    candidates.push(execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch (_) {
    /* npm missing */
  }
  candidates.push('/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules');
  for (const dir of candidates) {
    try {
      return require(require.resolve('playwright', { paths: [dir] }));
    } catch (_) {
      /* try next */
    }
  }
  throw new Error('playwright not found – npm install playwright (or npm install -g playwright)');
}

module.exports = resolve();
