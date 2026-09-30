// LiveFX – keyword matcher. Turns a (possibly still-interim) speech transcript into fired triggers.
//
// Speech recognition delivers the same utterance many times while it grows
// ("ich", "ich hab", "ich hab das", "ich hab das geschafft"). We therefore count
// how often each keyword occurs in the *current* utterance and only fire for
// occurrences we have not fired for yet. Per-trigger cooldowns and a global
// rate limit keep the overlay from turning into a slot machine.
(function (global) {
  'use strict';

  function normalize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[’´`]/g, "'")
      .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function countOccurrences(haystack, keyword) {
    // Whole-word match; keyword may contain spaces.
    const padded = ` ${haystack} `;
    const needle = ` ${keyword} `;
    let count = 0;
    let idx = padded.indexOf(needle);
    while (idx !== -1) {
      count++;
      idx = padded.indexOf(needle, idx + 1);
    }
    return count;
  }

  class Matcher {
    constructor(triggers, opts = {}) {
      this.setTriggers(triggers);
      this.globalMinGap = opts.globalMinGap ?? 1.2; // seconds between any two effects
      this.lastFireAt = new Map(); // triggerId -> timestamp (s)
      this.lastGlobalFire = -Infinity;
      this.firedInUtterance = new Map(); // triggerId -> count already fired for the current utterance
    }

    setTriggers(triggers) {
      // Keep every trigger (fireById must report disabled ones), match only the enabled ones.
      this.all = (triggers || []).map((t, i) => ({
        ...t,
        _key: t.id || `idx-${i}`,
        _keywords: (t.keywords || []).map(normalize).filter(Boolean),
      }));
      this.triggers = this.all.filter((t) => t.enabled !== false);
    }

    _cooldownState(trig, now) {
      const last = this.lastFireAt.get(trig._key) ?? -Infinity;
      if (now - last < (trig.cooldown ?? 3)) return 'cooldown';
      if (now - this.lastGlobalFire < this.globalMinGap) return 'gap';
      return null;
    }

    _markFired(trig, now) {
      this.lastFireAt.set(trig._key, now);
      this.lastGlobalFire = now;
    }

    /**
     * Fires a trigger by id outside of speech matching (hotkeys, API, smart mode) while
     * honouring the same cooldown / global gap rules.
     * @returns {{trigger: object|null, blocked: null|'cooldown'|'gap'|'disabled'|'unknown'}}
     */
    fireById(id, now = Date.now() / 1000) {
      const trig = (this.all || []).find((t) => t.id === id);
      if (!trig) return { trigger: null, blocked: 'unknown' };
      if (trig.enabled === false) return { trigger: trig, blocked: 'disabled' };
      const blocked = this._cooldownState(trig, now);
      if (blocked) return { trigger: trig, blocked };
      this._markFired(trig, now);
      return { trigger: trig, blocked: null };
    }

    /** Call when the recognizer finalizes an utterance so counters reset. */
    endUtterance() {
      this.firedInUtterance.clear();
    }

    /**
     * @param {string} transcript current (interim or final) utterance text
     * @param {number} now seconds
     * @returns {Array<{trigger, keyword}>} triggers that should fire now
     */
    process(transcript, now = Date.now() / 1000) {
      const text = normalize(transcript);
      const fired = [];
      if (!text) return fired;

      // Collect every trigger with a new occurrence, then let the most specific
      // (longest) keyword go first: "oh nein" (fail) beats "nein" (no).
      const candidates = [];
      for (const trig of this.triggers) {
        let occurrences = 0;
        let matchedKeyword = null;
        for (const kw of trig._keywords) {
          const c = countOccurrences(text, kw);
          if (c > 0) {
            occurrences += c;
            if (!matchedKeyword || kw.length > matchedKeyword.length) matchedKeyword = kw;
          }
        }
        const already = this.firedInUtterance.get(trig._key) || 0;
        if (occurrences <= already) continue;

        // New occurrence. Mark it consumed even if cooldown blocks it, so it
        // doesn't fire late when the cooldown expires mid-sentence.
        this.firedInUtterance.set(trig._key, occurrences);
        candidates.push({ trig, matchedKeyword });
      }
      candidates.sort((a, b) => b.matchedKeyword.length - a.matchedKeyword.length);

      for (const { trig, matchedKeyword } of candidates) {
        if (this._cooldownState(trig, now)) continue;
        this._markFired(trig, now);
        fired.push({ trigger: trig, keyword: matchedKeyword });
      }
      return fired;
    }
  }

  global.LiveFXMatcher = { Matcher, normalize };
})(typeof window !== 'undefined' ? window : globalThis);
