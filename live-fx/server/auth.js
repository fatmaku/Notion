// LiveFX – auth STUB (package P5 replaces this file). See docs/CONTRACTS.md §4 "Auth".
// TODO(P5): token file, host allow-list, same-origin check, Bearer compare, requireAuth.
'use strict';

function loadOrCreateToken({ dataDir, log = () => {} }) {
  const token = process.env.LIVEFX_TOKEN || 'stub-token';
  log(`auth: STUB token in use (${dataDir})`);
  return token;
}

function hostAllowed() {
  return true;
}

function isAuthorized() {
  return true;
}

function requireAuth(handler) {
  return handler;
}

function register() {}

module.exports = { loadOrCreateToken, hostAllowed, isAuthorized, requireAuth, register };
