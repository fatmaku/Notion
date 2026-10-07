// LiveFX – pack ↔ trigger list helpers shared by the panel (index.html) and the phone page (mobile.html).
// Pure functions over a trigger array; the callers persist through LiveFXStore. Needs js/packs.js
// (LiveFXPacks) and js/schema.js (LiveFXSchema) – loaded before this file. See docs/CONTRACTS.md §11.
(function (global) {
  'use strict';

  const P = () => global.LiveFXPacks;
  const S = () => global.LiveFXSchema;

  function limit() {
    const s = S();
    return s && s.LIMITS && Number.isFinite(s.LIMITS.triggers) ? s.LIMITS.triggers : 1000;
  }

  /** How many triggers of `packId` are in `triggers` (by id). */
  function present(triggers, packId) {
    const packs = P();
    if (!packs) return 0;
    const ids = new Set(packs.get(packId).map((t) => t.id));
    return (triggers || []).filter((t) => ids.has(t.id)).length;
  }

  /** "Loaded" = at least 80 % of the pack's triggers are present (a few may have been deleted by hand). */
  function isLoaded(triggers, packId) {
    const packs = P();
    const total = packs && packs.packs[packId] ? packs.packs[packId].triggers.length : 0;
    return total > 0 && present(triggers, packId) >= Math.ceil(total * 0.8);
  }

  /**
   * Adds the missing triggers of `packId` (normalized, capped at LIMITS.triggers).
   * Returns { triggers, added, skipped, warnings, label } – `triggers` is a new array.
   */
  function add(triggers, packId, opts = {}) {
    const packs = P();
    const list = Array.isArray(triggers) ? triggers.slice() : [];
    const pack = packs && packs.packs[packId];
    if (!pack) return { triggers: list, added: 0, skipped: 0, warnings: [`unbekanntes Paket: ${packId}`], label: String(packId) };
    const have = new Set(list.map((t) => t.id));
    const fresh = packs.get(packId).filter((t) => !have.has(t.id));
    const max = Number.isFinite(opts.limit) ? opts.limit : limit();
    const room = Math.max(0, max - list.length);
    const picked = fresh.slice(0, room);
    const warnings = [];
    if (fresh.length > room) warnings.push(`Maximal ${max} Trigger – ${fresh.length - room} aus „${pack.label}“ nicht geladen`);
    if (!picked.length) return { triggers: list, added: 0, skipped: fresh.length, warnings, label: pack.label };
    const n = S().normalizeTriggers(picked);
    for (const w of n.warnings) warnings.push(`Paket: ${w}`);
    return { triggers: list.concat(n.triggers), added: n.triggers.length, skipped: fresh.length - picked.length, warnings, label: pack.label };
  }

  /** Removes every trigger whose id starts with `<packId>-`. Returns { triggers, removed, label }. */
  function remove(triggers, packId) {
    const packs = P();
    const pack = packs && packs.packs[packId];
    const prefix = `${packId}-`;
    const list = Array.isArray(triggers) ? triggers : [];
    const kept = list.filter((t) => !String(t.id).startsWith(prefix));
    return { triggers: kept, removed: list.length - kept.length, label: pack ? pack.label : String(packId) };
  }

  /** Overview for tiles: [{ id, label, flag, count, description, story, present, loaded }]. */
  function summary(triggers) {
    const packs = P();
    if (!packs) return [];
    return packs.list().map((p) => ({ ...p, present: present(triggers, p.id), loaded: isLoaded(triggers, p.id) }));
  }

  /**
   * Keyword collisions between packs: `LiveFXPacks.collisions()` when the pack module provides it (2.2),
   * otherwise a local check of the loaded packs' keywords (same normalized keyword in two packs).
   * Returns [{ keyword, packs: [id, …] }].
   */
  function collisions(triggers) {
    const packs = P();
    if (!packs) return [];
    if (typeof packs.collisions === 'function') {
      try {
        const r = packs.collisions(triggers);
        if (Array.isArray(r)) return r;
      } catch (_) {
        /* fall through to the local check */
      }
    }
    const norm = (k) => {
      const M = global.LiveFXMatcher;
      return M && typeof M.normalize === 'function' ? M.normalize(k) : String(k || '').toLowerCase().trim();
    };
    const loaded = packs.list().filter((p) => isLoaded(triggers, p.id));
    const seen = new Map(); // keyword -> Set(packId)
    for (const p of loaded) {
      for (const t of packs.get(p.id)) {
        for (const k of t.keywords || []) {
          const n = norm(k);
          if (!n) continue;
          if (!seen.has(n)) seen.set(n, new Set());
          seen.get(n).add(p.id);
        }
      }
    }
    const out = [];
    for (const [keyword, ids] of seen) if (ids.size > 1) out.push({ keyword, packs: Array.from(ids) });
    return out;
  }

  global.LiveFXPacksStore = { present, isLoaded, add, remove, summary, collisions, limit };
})(typeof window !== 'undefined' ? window : globalThis);
