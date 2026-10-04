// LiveFX – server state: persisted triggers (data/triggers.json), the shared keyword matcher,
// the last known volume and the SSE sequence counter. See docs/CONTRACTS.md §5.
//
// File format (schema v2):
//   { version: 2, updatedAt: ISO string, removed: [defaultId, ...], triggers: [trigger, ...] }
//
// `triggers` holds every trigger the user stored (including edited defaults); `removed` lists the
// ids of default triggers the user deleted so they are not resurrected on the next merge with
// LiveFXDefaultTriggers. Writes are atomic (tmp file + rename). A corrupt file never crashes the
// server: it is moved aside and the defaults are used.
'use strict';

const fs = require('fs');
const path = require('path');

require('../js/schema.js');
require('../js/matcher.js');

const FILE_NAME = 'triggers.json';
const VERSION = 2;

function createState({ dataDir, defaults = [], log = () => {} }) {
  const Schema = globalThis.LiveFXSchema;
  const { Matcher } = globalThis.LiveFXMatcher;
  const file = dataDir ? path.join(dataDir, FILE_NAME) : null;

  // Defaults are normalized once so merged output always has the full v2 shape.
  const normDefaults = Schema.normalizeTriggers(Array.isArray(defaults) ? defaults : []).triggers;

  let stored = { triggers: [], removed: [] };

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function cleanRemoved(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const id of list) {
      if (typeof id === 'string' && Schema.ID_RE.test(id) && !out.includes(id)) out.push(id);
    }
    return out;
  }

  function isoNow() {
    return new Date().toISOString();
  }

  /** Writes the state file atomically. Errors are logged, never thrown. */
  function persist() {
    if (!file) return false;
    const payload = {
      version: VERSION,
      updatedAt: state.updatedAt,
      removed: stored.removed,
      triggers: stored.triggers,
    };
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n', 'utf8');
      fs.renameSync(tmp, file);
      return true;
    } catch (e) {
      log(`state: could not write ${file}: ${e.message}`);
      try {
        fs.unlinkSync(tmp);
      } catch (_) {
        /* tmp never created */
      }
      return false;
    }
  }

  function backupCorrupt(reason) {
    const backup = `${file}.corrupt-${Date.now()}`;
    try {
      fs.renameSync(file, backup);
      log(`state: ${FILE_NAME} unusable (${reason}) – moved to ${path.basename(backup)}, using defaults`);
    } catch (e) {
      log(`state: ${FILE_NAME} unusable (${reason}) and could not be backed up (${e.message}), using defaults`);
    }
  }

  /** Loads the file. Returns true when a usable file was read. */
  function load() {
    if (!file) return false;
    let raw;
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch (e) {
      if (e.code !== 'ENOENT') log(`state: cannot read ${file}: ${e.message}`);
      return false;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      backupCorrupt('invalid JSON');
      return false;
    }
    // Accept the v2 object form and (leniently) a bare array of triggers.
    let list;
    let removed = [];
    let updatedAt = null;
    if (Array.isArray(parsed)) list = parsed;
    else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.triggers)) {
      list = parsed.triggers;
      removed = parsed.removed;
      updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null;
      if (parsed.version !== undefined && parsed.version !== VERSION) log(`state: ${FILE_NAME} has version ${parsed.version}, reading as v${VERSION}`);
    } else {
      backupCorrupt('unexpected shape');
      return false;
    }
    const n = Schema.normalizeTriggers(list);
    for (const w of n.warnings) log(`state: ${w}`);
    stored = { triggers: n.triggers, removed: cleanRemoved(removed) };
    state.updatedAt = updatedAt;
    return true;
  }

  const state = {
    version: VERSION,
    volume: null,
    theme: null,
    perf: null, // 2.1: last performance mode from the panel (auto | eco | high), repeated in the SSE `state` message
    seq: 0,
    updatedAt: null,
    matcher: null,
    file,

    nextSeq() {
      return ++state.seq;
    },

    /** Stored triggers merged with the defaults that were neither overridden nor removed. */
    getTriggers() {
      return Schema.mergeWithDefaults({ triggers: clone(stored.triggers), removed: stored.removed }, normDefaults);
    },

    getRemoved() {
      return stored.removed.slice();
    },

    /**
     * Replaces the trigger set. `removed` is derived from the missing default ids when the client
     * omits it; an explicit list is kept as sent (so a client may deliberately let a default return).
     */
    setTriggers({ triggers, removed } = {}) {
      const n = Schema.normalizeTriggers(triggers);
      const rem = Array.isArray(removed) ? cleanRemoved(removed) : Schema.deriveRemoved(n.triggers, normDefaults);
      stored = { triggers: n.triggers, removed: rem };
      state.updatedAt = isoNow();
      const ok = persist();
      const warnings = n.warnings.slice();
      if (!ok && file) warnings.push('Trigger konnten nicht gespeichert werden (Dateisystem)');
      refreshMatcher();
      return { count: stored.triggers.length, warnings };
    },
  };

  function refreshMatcher() {
    // The matcher keeps disabled triggers too (fireById reports them as 'disabled').
    const all = state.getTriggers();
    if (state.matcher) state.matcher.setTriggers(all);
    else state.matcher = new Matcher(all);
  }

  // ---- boot ----
  if (!load()) {
    // First start (or unusable file): seed the file with the defaults so users can find and edit it.
    stored = { triggers: clone(normDefaults), removed: [] };
    state.updatedAt = isoNow();
    if (persist()) log(`state: wrote defaults to ${file}`);
  }
  refreshMatcher();

  return state;
}

function register() {}

module.exports = { createState, register, FILE_NAME };
