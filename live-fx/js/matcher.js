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
      this.triggers = (triggers || []).filter((t) => t.enabled !== false).map((t) => ({
        ...t,
        _keywords: (t.keywords || []).map(normalize).filter(Boolean),
      }));
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
        const already = this.firedInUtterance.get(trig.id) || 0;
        if (occurrences <= already) continue;

        // New occurrence. Mark it consumed even if cooldown blocks it, so it
        // doesn't fire late when the cooldown expires mid-sentence.
        this.firedInUtterance.set(trig.id, occurrences);
        candidates.push({ trig, matchedKeyword });
      }
      candidates.sort((a, b) => b.matchedKeyword.length - a.matchedKeyword.length);

      for (const { trig, matchedKeyword } of candidates) {
        const last = this.lastFireAt.get(trig.id) ?? -Infinity;
        if (now - last < (trig.cooldown ?? 3)) continue;
        if (now - this.lastGlobalFire < this.globalMinGap) continue;

        this.lastFireAt.set(trig.id, now);
        this.lastGlobalFire = now;
        fired.push({ trigger: trig, keyword: matchedKeyword });
      }
      return fired;
    }
  }

  global.LiveFXMatcher = { Matcher, normalize };
})(typeof window !== 'undefined' ? window : globalThis);
