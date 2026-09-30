// LiveFX – default trigger pack. Multilingual (DE / EN / TR) keyword lists.
// A trigger = what the streamer says  ->  which visual effect + sound the overlay plays.
//
// visual.kind:  'card'   big emoji / text sticker that pops in the center
//               'rain'   emoji falling from the top of the screen
//               'banner' wide text banner sliding across
//               'confetti'
//               'shake'  screen-shake + flash (combine with any emoji)
(function (global) {
  'use strict';

  global.LiveFXDefaultTriggers = [
    {
      id: 'bruh',
      label: 'BRUH',
      keywords: ['bruh', 'bruder', 'alter', 'digga', 'kanka'],
      visual: { kind: 'card', emoji: '😐', text: 'BRUH', color: '#ffffff', bg: '#111111' },
      sound: 'boom',
      cooldown: 4,
    },
    {
      id: 'no',
      label: 'NEIN',
      keywords: ['nein', 'no way', 'auf keinen fall', 'hayır', 'olamaz', 'niemals', 'never'],
      visual: { kind: 'card', emoji: '🙅', text: 'NEIN.', color: '#ffffff', bg: '#c0392b' },
      sound: 'scratch',
      cooldown: 4,
    },
    {
      id: 'wow',
      label: 'Mind blown',
      keywords: ['krass', 'wow', 'wahnsinn', 'unfassbar', 'insane', 'vay', 'inanılmaz', 'mind blown'],
      visual: { kind: 'card', emoji: '🤯', text: 'KRASS', color: '#ffffff', bg: '#8e44ad', shake: true },
      sound: 'airhorn',
      cooldown: 5,
    },
    {
      id: 'lol',
      label: 'LOL',
      keywords: ['lol', 'haha', 'lustig', 'witzig', 'komik', 'funny', 'lmao'],
      visual: { kind: 'rain', emoji: '😂', count: 18 },
      sound: 'rimshot',
      cooldown: 4,
    },
    {
      id: 'fail',
      label: 'Fail',
      keywords: ['fail', 'oh nein', 'mist', 'verkackt', 'eyvah', 'oops', 'ups', 'schade'],
      visual: { kind: 'card', emoji: '🎺', text: 'wah wah waaah', color: '#333333', bg: '#f1c40f' },
      sound: 'sadTrombone',
      cooldown: 6,
    },
    {
      id: 'win',
      label: "Let's go",
      keywords: ['geschafft', "let's go", 'lets go', 'yes', 'jawohl', 'oldu', 'başardık', 'gewonnen', 'we did it'],
      visual: { kind: 'confetti', emoji: '🏆', text: "LET'S GO!" },
      sound: 'tada',
      cooldown: 6,
    },
    {
      id: 'clap',
      label: 'Applaus',
      keywords: ['applaus', 'applause', 'clap', 'alkış', 'respekt', 'bravo'],
      visual: { kind: 'rain', emoji: '👏', count: 24 },
      sound: 'applause',
      cooldown: 5,
    },
    {
      id: 'awkward',
      label: 'Awkward',
      keywords: ['awkward', 'peinlich', 'stille', 'utanç', 'cringe', 'unangenehm'],
      visual: { kind: 'card', emoji: '🦗', text: '...', color: '#ffffff', bg: '#2c3e50' },
      sound: 'crickets',
      cooldown: 6,
    },
    {
      id: 'money',
      label: 'Money',
      keywords: ['geld', 'money', 'para', 'euro', 'dollar', 'cash', 'reich', 'kohle'],
      visual: { kind: 'rain', emoji: '💸', count: 22 },
      sound: 'cash',
      cooldown: 5,
    },
    {
      id: 'fire',
      label: 'Fire',
      keywords: ['feuer', 'fire', 'ateş', 'brennt', 'heiß', 'lit', 'on fire'],
      visual: { kind: 'rain', emoji: '🔥', count: 26 },
      sound: 'airhorn',
      cooldown: 5,
    },
    {
      id: 'love',
      label: 'Love',
      keywords: ['liebe', 'love', 'aşk', 'herz', 'süß', 'cute', 'tatlı'],
      visual: { kind: 'rain', emoji: '❤️', count: 20 },
      sound: 'ding',
      cooldown: 4,
    },
    {
      id: 'drumroll',
      label: 'Drumroll',
      keywords: ['trommelwirbel', 'drumroll', 'drum roll', 'und der gewinner', 'and the winner'],
      visual: { kind: 'banner', emoji: '🥁', text: 'TROMMELWIRBEL' },
      sound: 'drumroll',
      cooldown: 8,
    },
    {
      id: 'wrong',
      label: 'Falsch',
      keywords: ['falsch', 'wrong', 'yanlış', 'nope', 'stimmt nicht'],
      visual: { kind: 'card', emoji: '❌', text: 'FALSCH', color: '#ffffff', bg: '#e74c3c', shake: true },
      sound: 'buzzer',
      cooldown: 4,
    },
    {
      id: 'thinking',
      label: 'Hmm',
      keywords: ['hmm', 'überleg', 'moment mal', 'warte mal', 'düşüneyim', 'let me think'],
      visual: { kind: 'card', emoji: '🤔', text: 'hmmm', color: '#ffffff', bg: '#16a085' },
      sound: 'pop',
      cooldown: 4,
    },
    {
      id: 'gg',
      label: 'GG',
      keywords: ['gg', 'good game', 'gut gespielt', 'ez'],
      visual: { kind: 'banner', emoji: '🎮', text: 'GG EZ' },
      sound: 'whoosh',
      cooldown: 5,
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
