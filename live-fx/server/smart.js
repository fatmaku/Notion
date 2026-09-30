// LiveFX – smart mode STUB (package P4 replaces this file). See docs/CONTRACTS.md §7.
// TODO(P4): lazy Anthropic SDK import, buildRequest, classify with limits, mock mode.
'use strict';

const { HttpError } = require('./router');

function createSmart({ model = 'claude-opus-5-5' } = {}) {
  return {
    async init() {},
    available: false,
    reason: 'stub',
    model,
    mock: false,
    stats: { calls: 0, errors: 0, timeouts: 0, lastError: null },
    async classify() {
      throw new HttpError(503, 'smart_unavailable', 'smart mode not implemented');
    },
    buildRequest() {
      return null;
    },
  };
}

module.exports = { createSmart };
