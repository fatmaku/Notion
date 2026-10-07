// node test/matcher.test.js
const assert = require('assert');
require('../js/triggers.js');
require('../js/matcher.js');
const { Matcher, normalize } = globalThis.LiveFXMatcher;

const triggers = globalThis.LiveFXDefaultTriggers;
let t = 0;
const now = () => t;

// 1. basic match
let m = new Matcher(triggers);
let hits = m.process('das ist ja krass', now());
assert.strictEqual(hits.length, 1);
assert.strictEqual(hits[0].trigger.id, 'wow');

// 2. interim results of the same utterance must not re-fire
t += 5;
hits = m.process('das ist ja krass und', now());
assert.strictEqual(hits.length, 0, 'interim growth must not re-fire');

// 3. second occurrence in same utterance fires once cooldown passed
t += 5;
hits = m.process('das ist ja krass und wow', now());
assert.strictEqual(hits.length, 1, 'second occurrence fires');

// 4. cooldown blocks
m = new Matcher(triggers);
t = 100;
assert.strictEqual(m.process('bruh', now()).length, 1);
m.endUtterance();
t = 101;
assert.strictEqual(m.process('bruh', now()).length, 0, 'cooldown');
m.endUtterance();
t = 110;
assert.strictEqual(m.process('bruh', now()).length, 1, 'after cooldown');

// 5. whole word only
m = new Matcher(triggers);
assert.strictEqual(m.process('geldautomat', 200).length, 0, 'no substring match');
assert.strictEqual(m.process('ich brauch geld', 210).length, 1);

// 6. global min gap (default 0.5 s since 2.2)
assert.strictEqual(new Matcher(triggers).globalMinGap, 0.5);
assert.strictEqual(globalThis.LiveFXMatcher.DEFAULT_GLOBAL_MIN_GAP, 0.5);
m = new Matcher(triggers, { globalMinGap: 2 });
hits = m.process('krass, applaus!', 300);
assert.strictEqual(hits.length, 1, 'global gap keeps one');

// 7. multi-word keyword + punctuation + turkish
m = new Matcher(triggers);
assert.strictEqual(m.process("No way! Let's go!!!", 400).length, 1); // 'no' fires, 'win' blocked by gap
assert.strictEqual(m.process('bu inanılmaz', 500)[0].trigger.id, 'wow');

// 8. disabled trigger ignored
m = new Matcher(triggers.map((x) => (x.id === 'wow' ? { ...x, enabled: false } : x)));
assert.strictEqual(m.process('krass', 600).length, 0);

assert.strictEqual(normalize('  Hallo, WELT!! '), 'hallo welt');
console.log('matcher tests: OK');

// 9. most specific keyword wins across triggers
m = new Matcher(triggers);
hits = m.process('oh nein das war ein fail', 700);
assert.strictEqual(hits.length, 1);
assert.strictEqual(hits[0].trigger.id, 'fail', 'longer keyword "oh nein" beats "nein"');
console.log('specificity test: OK');

// 10. fireById honours cooldown / gap / disabled / unknown and separates id-less triggers
m = new Matcher(triggers.concat([{ id: 'off', label: 'off', keywords: ['aus'], enabled: false }]));
assert.deepStrictEqual(m.fireById('nope', 800).blocked, 'unknown');
assert.deepStrictEqual(m.fireById('off', 800).blocked, 'disabled');
assert.strictEqual(m.fireById('lol', 800).blocked, null);
assert.strictEqual(m.fireById('lol', 801).blocked, 'cooldown');
assert.strictEqual(m.fireById('wow', 800.3).blocked, 'gap'); // default globalMinGap 0.5 s (2.2)
assert.strictEqual(m.fireById('wow', 802).blocked, null);
assert.strictEqual(m.process('lol', 900).length, 1, 'speech match shares cooldown state with fireById');
m = new Matcher([{ keywords: ['eins'] }, { keywords: ['zwei'] }]);
assert.strictEqual(m.process('eins', 1000).length, 1);
m.endUtterance();
assert.strictEqual(m.process('zwei', 1000.1).length, 0, 'global gap');
m.endUtterance();
assert.strictEqual(m.process('zwei', 1003).length, 1, 'id-less triggers do not share a cooldown counter');
console.log('fireById tests: OK');
