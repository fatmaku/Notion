/* İki Roman – trailer configuration (EN).
   Loaded by engine2.html via <script> (sets window.CFG) and read by make_srt.py through Node (module.exports).
   The timelines (cuts) are identical in tr.js / en.js / de.js – change all three together. */
(function () {
  const CFG = {
    lang: 'en',
    text: {
      question: 'How do you know that something exists?',
      by: {
        lines: ['A black package at the door.', 'No sender. No address.', 'The book inside… is about him.'],
        title: 'THE TRAVELLER', subtitle: '1453 — The Price of Awakening', author: 'Tuncay Sancak'
      },
      sa: {
        lines: ['A traveller sets out.', 'A witness awaits him.', 'A man who no longer speaks… Who is the witness?'],
        title: 'THE WITNESS', subtitle: '', author: 'Mustafa Sefa Güvenir'
      },
      shared: { lines: ['A green room.', 'Three knocks.', 'A glass of water.', 'Two people remember the same scene.'] },
      tagline: 'Two Novels – Two Paths – A Third Story',
      claim: 'Each one a novel in its own right. Read together, a third book appears.',
      cta: 'Now on Amazon',
      handle: '@happytuncay',
      clock: '14:53'
    },
    /* Timelines. All times in seconds. lines: [index into text.*.lines, fade-in, fade-out]. */
    cuts: {
      '60': {
        dur: 60,
        scenes: { cold: [0, 7], by: [7, 19], sa: [19, 31], shared: [31, 44], fist: [44, 53], end: [53, 60] },
        knocks: [1.0, 1.8, 2.6],
        question: [3.2, 6.7],
        by:     { gfx: [7.8, 16.8], mode: 'stack', lines: [[0, 8.4, 16.7], [1, 11.0, 16.7], [2, 13.6, 16.7]], title: [17.0, 19.3] },
        sa:     { gfx: [19.8, 28.8], mode: 'stack', lines: [[0, 20.4, 28.7], [1, 23.0, 28.7], [2, 25.6, 28.7]], title: [29.0, 31.3] },
        shared: { room: 32.0, knocks: [34.0, 34.8, 35.6], glass: 37.0, hand: 38.8, chair: 40.6, gfxEnd: 43.7,
                  mode: 'replace', lines: [[0, 32.4, 33.9], [1, 34.2, 36.8], [2, 37.0, 39.7], [3, 40.0, 43.6]] },
        fist:   { impact: 47.0, tagline: [47.8, 52.9], claim: [48.8, 52.9] },
        end:    { covers: 53.0, names: 54.0, cta: 54.8, handle: 55.5, butterfly: [54.2, 59.2], fadeOut: 58.8 }
      },
      '30': {
        dur: 30,
        scenes: { cold: [0, 4], by: [4, 10], sa: [10, 16], shared: [16, 21], fist: [21, 26], end: [26, 30] },
        knocks: [0.7, 1.3, 1.9],
        question: [2.2, 3.9],
        by:     { gfx: [4.4, 8.3], mode: 'stack', lines: [[0, 4.8, 8.3], [2, 6.5, 8.3]], title: [8.5, 10.3] },
        sa:     { gfx: [10.4, 14.3], mode: 'stack', lines: [[0, 10.8, 14.3], [2, 12.5, 14.3]], title: [14.5, 16.3] },
        shared: { room: 16.3, knocks: [17.0, 17.6, 18.2], glass: 18.5, hand: 18.9, chair: 19.3, gfxEnd: 20.9,
                  mode: 'replace', lines: [[1, 16.6, 18.8], [3, 19.0, 20.8]] },
        fist:   { impact: 23.0, tagline: [23.6, 25.9], claim: [24.3, 25.9] },
        end:    { covers: 26.0, names: 26.8, cta: 27.3, handle: 27.8, butterfly: [26.4, 29.4], fadeOut: 28.8 }
      }
    }
  };
  if (typeof window !== 'undefined') window.CFG = CFG;
  if (typeof module !== 'undefined' && module.exports) module.exports = CFG;
})();
