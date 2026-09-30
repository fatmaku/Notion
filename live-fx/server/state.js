// LiveFX – state STUB (package P2 replaces this file). See docs/CONTRACTS.md §5.
// TODO(P2): data/triggers.json persistence (atomic write), merge with defaults, removed list.
'use strict';

require('../js/matcher.js');

function createState({ defaults = [] }) {
  const state = {
    getTriggers: () => defaults,
    getRemoved: () => [],
    setTriggers: () => ({ count: defaults.length, warnings: ['state stub: not persisted'] }),
    matcher: new globalThis.LiveFXMatcher.Matcher(defaults),
    volume: null,
    seq: 0,
    nextSeq() {
      return ++state.seq;
    },
    updatedAt: null,
    version: 2,
  };
  return state;
}

function register() {}

module.exports = { createState, register };
