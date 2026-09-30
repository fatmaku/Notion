// End-to-end harness: runs every scenario in test/e2e/*.js (name order) against a real server in Chromium.
//   node test/e2e.js          run all
//   node test/e2e.js 30       run only scenarios whose file name starts with "30"
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('./resolve-playwright');
const { startServer, api, sseClient, waitFor } = require('./helpers/server');

const DIR = path.join(__dirname, 'e2e');
const shotDir = process.env.SHOT_DIR || path.join(__dirname, 'shots');
fs.mkdirSync(shotDir, { recursive: true });
const filter = process.argv[2] || '';

(async () => {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.js') && f.startsWith(filter))
    .sort();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let failed = 0;
  try {
    for (const f of files) {
      const name = f.replace(/\.js$/, '');
      const started = Date.now();
      const log = (...a) => console.log(`  [${name}]`, ...a);
      try {
        await require(path.join(DIR, f)).run({ browser, startServer, api, sseClient, waitFor, shotDir, log });
        console.log(`✔ ${name} (${Date.now() - started} ms)`);
      } catch (e) {
        failed++;
        console.log(`✘ ${name} (${Date.now() - started} ms)\n${e && e.stack ? e.stack : e}`);
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`e2e: ${files.length - failed}/${files.length} scenarios passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
