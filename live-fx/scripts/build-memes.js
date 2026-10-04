#!/usr/bin/env node
// LiveFX – builds the bundled reaction sticker set `memes/fluent/*.webp` + `memes/index.json`.
//
//   node scripts/build-memes.js            download (cached) + convert everything, rewrite index.json
//   node scripts/build-memes.js --force    re-encode even when the .webp already exists
//   node scripts/build-memes.js --check    only validate the curated list (exclusions, ids, keywords), no network
//
// Source: Microsoft Fluent Emoji (MIT) – see THIRD-PARTY-NOTICES.md and docs/STICKER.md.
//   animated: github.com/microsoft/fluentui-emoji-animated  (APNG 256 px, stored in Git LFS)
//   static:   github.com/microsoft/fluentui-emoji           (3D PNG 256 px) – used where no animation exists
// How the files are found: a blob-less, no-checkout `git clone --depth 1` of each repository gives the exact
// file paths (`git ls-tree`), LFS files are then fetched from media.githubusercontent.com, plain files from
// raw.githubusercontent.com, and every item's `metadata.json` glyph is compared with the curated emoji.
// Conversion: ffmpeg (libwebp_anim) → animated WebP 160 px, looped; a quality ladder keeps each file
// ≤ 40 KB (fewer fps / lower quality first; alpha is kept). Animations that stay above 46 KB (58 KB for
// stickers of the reactions pack) at the lowest rung use the static 3D image instead (`animated:false`;
// the overlay still pops / tilts / bounces it). Static PNGs → WebP 160 px.
// Downloads are cached in $MEMES_CACHE (default: <tmp>/livefx-memes-cache), so reruns are cheap.
//
// HARD EXCLUSIONS (enforced here and in test/memes.test.js): flags, religious symbols / places, weapons and
// violence, drugs / alcohol / tobacco, obscene or innuendo emoji, brand logos. See EXCLUDED below.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { execFile } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'memes');
const SET = 'fluent';
const SIZE = 160;
const TARGET_BYTES = 40 * 1024; // preferred size of one sticker
// An animation that cannot get below this falls back to the static 3D image. Stickers used by the
// "🎞️ Reaktionen (animiert)" pack (js/packs.js) may be a bit larger so that pack stays animated.
const ANIM_MAX_BYTES = 46 * 1024;
const ANIM_MAX_PACK_BYTES = 58 * 1024;
const TOTAL_MAX_BYTES = 6 * 1024 * 1024;
const REPOS = {
  animated: { name: 'fluentui-emoji-animated', git: 'https://github.com/microsoft/fluentui-emoji-animated', lfs: true },
  static: { name: 'fluentui-emoji', git: 'https://github.com/microsoft/fluentui-emoji', lfs: false },
};

// ---------------------------------------------------------------------------------------------------
// Hard exclusions. Codepoints (hex) that must never appear in an item's emoji, plus ranges.
// ---------------------------------------------------------------------------------------------------
const EXCLUDED = {
  flags: ['1f3f3', '1f3f4', '1f6a9', '1f38c', '1f3c1'], // + regional indicators / tag sequences (ranges below)
  religious: ['271d', '2626', '262a', '1f549', '2721', '1f52f', '2638', '262f', '1f6d0', '1f54e', '1f4ff', '26ea', '1f54c', '1f54d', '1f6d5', '1f54b', '26e9', '1f607', '1f608', '1f47f', '1f9ff', '1faac', '1f64f', '1f47c', '1f385', '1f936', '1f384', '1f383'],
  violence: ['1f52b', '1f4a3', '1f52a', '1f5e1', '2620', '1fa78', '2694', '1fa93', '1f3f9', '1f480', '26b0', '26b1', '1faa6', '1f9e8', '1f44a', '1f91b', '1f91c', '270a', '1f9df', '1f9db', '1f977', '1f93a', '1f93c', '1f92c'],
  drugs: ['1f6ac', '1f37a', '1f37b', '1f377', '1f943', '1f378', '1f379', '1f37e', '1f942', '1f376', '1f489', '1f48a', '1f974'],
  obscene: ['1f595', '1f346', '1f351', '1f4a6', '1f445', '1f444', '1f60f', '1f4a9', '1f92e'],
};
const EXCLUDED_RANGES = [
  [0x1f1e6, 0x1f1ff, 'flags'], // regional indicator symbols (country flags)
  [0xe0020, 0xe007f, 'flags'], // tag characters (subdivision flags)
];
const EXCLUDED_NAME_RE = /\b(flag|logo|windows|skype|teams|xbox|church|mosque|synagogue|temple|kaaba|shrine|pistol|gun|bomb|knife|dagger|sword|skull|coffin|beer|wine|cocktail|sake|champagne|cigarette|syringe|pill|vomit|poo|middle finger|eggplant|peach)\b/i;

function codepoints(s) {
  return Array.from(String(s), (c) => c.codePointAt(0)).filter((cp) => cp !== 0xfe0f && cp !== 0x200d);
}

/** Returns the exclusion category of an emoji string, or null when it is allowed. */
function excludedCategory(emoji) {
  for (const cp of codepoints(emoji)) {
    const hex = cp.toString(16);
    for (const [cat, list] of Object.entries(EXCLUDED)) if (list.includes(hex)) return cat;
    for (const [a, b, cat] of EXCLUDED_RANGES) if (cp >= a && cp <= b) return cat;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------
// Curated list: [id, Fluent asset folder, emoji, category, de, tr, en]  (keywords: arrays of phrases)
// ---------------------------------------------------------------------------------------------------
const LIST = [
  // laugh
  ['joy', 'Face with tears of joy', '😂', 'laugh', ['lachtränen', 'zum totlachen'], ['gülmekten ağlamak', 'kahkaha'], ['tears of joy', 'lol']],
  ['rofl', 'Rolling on the floor laughing', '🤣', 'laugh', ['am boden vor lachen', 'rofl'], ['yerlere yattım', 'gülmekten yerlerde'], ['rofl', 'rolling on the floor']],
  ['squint-laugh', 'Grinning squinting face', '😆', 'laugh', ['haha', 'lachen'], ['hahaha', 'gülmek'], ['haha', 'xd']],
  ['grin-smile', 'Grinning face with smiling eyes', '😄', 'laugh', ['grinsen', 'fröhlich'], ['sırıtmak', 'neşeli'], ['grin', 'happy']],
  ['beam', 'Beaming face with smiling eyes', '😁', 'laugh', ['breites grinsen', 'strahlen'], ['ışıl ışıl', 'kocaman gülümseme'], ['beaming', 'big grin']],
  ['sweat-smile', 'Grinning face with sweat', '😅', 'laugh', ['puh', 'glück gehabt'], ['oh be', 'kıl payı'], ['phew', 'close one']],
  ['cat-joy', 'Cat with tears of joy', '😹', 'laugh', ['lachende katze', 'katzenlachen'], ['gülen kedi', 'kedi kahkaha'], ['laughing cat', 'cat lol']],
  ['giggle', 'Face with hand over mouth', '🤭', 'laugh', ['kichern', 'hihi'], ['kıkırdamak', 'hihi'], ['giggle', 'tee hee']],
  // shock
  ['scream', 'Face screaming in fear', '😱', 'shock', ['schrei', 'oh nein'], ['çığlık', 'eyvah'], ['scream', 'omg']],
  ['astonished', 'Astonished face', '😲', 'shock', ['erstaunt', 'wow'], ['şaşkın', 'vay'], ['astonished', 'whoa']],
  ['open-mouth', 'Face with open mouth', '😮', 'shock', ['staunen', 'oh'], ['ağzı açık', 'oha'], ['open mouth', 'oh']],
  ['flushed', 'Flushed face', '😳', 'shock', ['peinlich', 'rot werden'], ['utandım', 'kızardım'], ['flushed', 'embarrassed']],
  ['mind-blown', 'Exploding head', '🤯', 'shock', ['kopf explodiert', 'krass'], ['beynim yandı', 'kafam patladı'], ['mind blown', 'exploding head']],
  ['gasp', 'Face with open eyes and hand over mouth', '🫢', 'shock', ['nach luft schnappen', 'ups'], ['hayret', 'aman'], ['gasp', 'oops']],
  ['fearful', 'Fearful face', '😨', 'shock', ['angst', 'gruselig'], ['korku', 'korkunç'], ['fearful', 'scared']],
  ['grimace', 'Grimacing face', '😬', 'shock', ['autsch', 'unangenehm'], ['eyvah', 'tüh'], ['yikes', 'awkward']],
  // love
  ['heart-eyes', 'Smiling face with heart-eyes', '😍', 'love', ['verliebt', 'herzaugen'], ['bayıldım', 'aşık oldum'], ['heart eyes', 'in love']],
  ['hearts-face', 'Smiling face with hearts', '🥰', 'love', ['süß', 'verknallt'], ['tatlı', 'sevimli'], ['adore', 'cute']],
  ['kiss', 'Face blowing a kiss', '😘', 'love', ['küsschen', 'bussi'], ['öpücük', 'muck'], ['kiss', 'mwah']],
  ['heart', 'Red heart', '❤️', 'love', ['herz', 'liebe'], ['kalp', 'sevgi'], ['heart', 'love']],
  ['heart-sparkle', 'Sparkling heart', '💖', 'love', ['glitzerherz', 'herzlich'], ['parlayan kalp', 'pırıltılı kalp'], ['sparkling heart', 'sparkle love']],
  ['hearts-two', 'Two hearts', '💕', 'love', ['zwei herzen', 'verliebt sein'], ['iki kalp', 'aşk'], ['two hearts', 'lovey']],
  ['heart-fire', 'Heart on fire', '❤️‍🔥', 'love', ['brennendes herz', 'leidenschaft'], ['yanan kalp', 'tutku'], ['heart on fire', 'passion']],
  ['heart-broken', 'Broken heart', '💔', 'love', ['gebrochenes herz', 'herzschmerz'], ['kırık kalp', 'kalbim kırıldı'], ['broken heart', 'heartbreak']],
  ['heart-mend', 'Mending heart', '❤️‍🩹', 'love', ['heilendes herz', 'wird wieder'], ['iyileşen kalp', 'geçecek'], ['mending heart', 'healing']],
  ['heart-purple', 'Purple heart', '💜', 'love', ['lila herz', 'violettes herz'], ['mor kalp', 'mor'], ['purple heart', 'purple']],
  ['heart-blue', 'Blue heart', '💙', 'love', ['blaues herz', 'blau'], ['mavi kalp', 'mavi'], ['blue heart', 'blue']],
  ['heart-pink', 'Pink heart', '🩷', 'love', ['rosa herz', 'pink'], ['pembe kalp', 'pembe'], ['pink heart', 'pink']],
  ['heart-hands', 'Heart hands', '🫶', 'love', ['herzhände', 'herz mit händen'], ['kalp eller', 'elle kalp'], ['heart hands', 'love you all']],
  ['cat-love', 'Smiling cat with heart-eyes', '😻', 'love', ['verliebte katze', 'katzenliebe'], ['aşık kedi', 'kedi aşkı'], ['cat heart eyes', 'cat love']],
  // fire / energy
  ['fire', 'Fire', '🔥', 'fire', ['feuer', 'heiß'], ['ateş', 'yanıyor'], ['fire', 'lit']],
  ['hot', 'Hot face', '🥵', 'fire', ['heiß', 'schwitzen'], ['sıcak', 'terledim'], ['hot', 'sweating']],
  ['lightning', 'High voltage', '⚡', 'weather', ['blitz', 'energie'], ['şimşek', 'enerji'], ['lightning', 'zap']],
  ['collision', 'Collision', '💥', 'fire', ['bumm', 'knall'], ['bum', 'patlama'], ['boom', 'pow']],
  // party
  ['party', 'Party popper', '🎉', 'party', ['party', 'feiern'], ['parti', 'kutlama'], ['party', 'celebrate']],
  ['party-face', 'Partying face', '🥳', 'party', ['partygesicht', 'feierlaune'], ['parti yüzü', 'eğlence'], ['partying', 'woohoo']],
  ['confetti', 'Confetti ball', '🎊', 'party', ['konfetti', 'glückwunsch'], ['konfeti', 'tebrikler'], ['confetti', 'congrats']],
  ['cake', 'Birthday cake', '🎂', 'party', ['geburtstagstorte', 'torte'], ['doğum günü pastası', 'pasta'], ['birthday cake', 'cake']],
  ['balloon', 'Balloon', '🎈', 'party', ['luftballon', 'ballon'], ['balon', 'uçan balon'], ['balloon', 'float']],
  ['gift', 'Wrapped gift', '🎁', 'party', ['geschenk', 'überraschung'], ['hediye', 'sürpriz'], ['gift', 'present']],
  ['music', 'Musical notes', '🎶', 'party', ['musik', 'noten'], ['müzik', 'notalar'], ['music', 'tune']],
  // applause / hands
  ['clap', 'Clapping hands', '👏', 'applause', ['klatschen', 'applaus'], ['alkış', 'bravo'], ['clap', 'applause']],
  ['raise-hands', 'Raising hands', '🙌', 'applause', ['hände hoch', 'hurra'], ['eller havaya', 'yaşasın'], ['raise hands', 'hooray']],
  ['thumbs-up', 'Thumbs up', '👍', 'thumbs', ['daumen hoch', 'gut'], ['beğendim', 'süper'], ['thumbs up', 'like']],
  ['thumbs-down', 'Thumbs down', '👎', 'thumbs', ['daumen runter', 'schlecht'], ['beğenmedim', 'kötü'], ['thumbs down', 'dislike']],
  ['ok-hand', 'Ok hand', '👌', 'thumbs', ['okay', 'perfekt'], ['tamam', 'mükemmel'], ['ok', 'perfect']],
  ['victory', 'Victory hand', '✌️', 'thumbs', ['peace', 'sieg'], ['zafer', 'barış'], ['victory', 'peace']],
  ['love-you', 'Love-you gesture', '🤟', 'thumbs', ['hab dich lieb', 'love you'], ['seni seviyorum', 'sevgiler'], ['love you', 'ily']],
  ['wave', 'Waving hand', '👋', 'thumbs', ['winken', 'hallo'], ['el sallamak', 'merhaba'], ['wave', 'hello']],
  ['muscle', 'Flexed biceps', '💪', 'thumbs', ['stark', 'muskeln'], ['güçlü', 'kas'], ['strong', 'flex']],
  ['fingers-crossed', 'Crossed fingers', '🤞', 'thumbs', ['daumen drücken', 'viel glück'], ['şans dile', 'umarım'], ['fingers crossed', 'good luck']],
  ['handshake', 'Handshake', '🤝', 'thumbs', ['handschlag', 'deal'], ['tokalaşma', 'anlaştık'], ['handshake', 'deal']],
  ['point-you', 'Index pointing at the viewer', '🫵', 'thumbs', ['du', 'genau du'], ['sen', 'evet sen'], ['you', 'i choose you']],
  // sad / cry
  ['sob', 'Loudly crying face', '😭', 'sad', ['heulen', 'weinen'], ['hüngür hüngür', 'ağlıyorum'], ['sob', 'crying']],
  ['cry', 'Crying face', '😢', 'sad', ['traurig', 'träne'], ['üzgün', 'gözyaşı'], ['sad', 'tear']],
  ['holding-tears', 'Face holding back tears', '🥹', 'sad', ['gerührt', 'tränen zurückhalten'], ['duygulandım', 'gözlerim doldu'], ['touched', 'holding back tears']],
  ['weary', 'Weary face', '😩', 'sad', ['erschöpft', 'nicht schon wieder'], ['bıktım', 'yoruldum'], ['weary', 'ugh']],
  ['pleading', 'Pleading face', '🥺', 'pleading', ['bitte bitte', 'hundeblick'], ['lütfen', 'kıyamam'], ['pleading', 'puppy eyes']],
  ['smile-tear', 'Smiling face with tear', '🥲', 'sad', ['lachen und weinen', 'tapfer'], ['buruk gülümseme', 'gülerken ağlamak'], ['smiling through tears', 'bittersweet']],
  ['melting', 'Melting face', '🫠', 'sad', ['dahinschmelzen', 'zerfließen'], ['eriyorum', 'erimek'], ['melting', 'melt']],
  // facepalm / meh
  ['facepalm', 'Person facepalming', '🤦', 'facepalm', ['facepalm', 'kopf schütteln'], ['yüzüne vurmak', 'pes'], ['facepalm', 'smh']],
  ['shrug', 'Person shrugging', '🤷', 'facepalm', ['schulterzucken', 'keine ahnung'], ['omuz silkmek', 'bilmiyorum'], ['shrug', 'idk']],
  ['eye-roll', 'Face with rolling eyes', '🙄', 'facepalm', ['augenrollen', 'ach komm'], ['göz devirmek', 'hadi ya'], ['eye roll', 'whatever']],
  ['unamused', 'Unamused face', '😒', 'facepalm', ['genervt', 'nicht lustig'], ['sıkıldım', 'komik değil'], ['unamused', 'meh']],
  ['dizzy-face', 'Face with spiral eyes', '😵‍💫', 'facepalm', ['schwindelig', 'verwirrt'], ['başım döndü', 'kafam karıştı'], ['dizzy', 'confused']],
  ['exhale', 'Face exhaling', '😮‍💨', 'facepalm', ['ausatmen', 'puuh'], ['oh be', 'nefes vermek'], ['exhale', 'sigh']],
  // thinking
  ['thinking', 'Thinking face', '🤔', 'thinking', ['nachdenken', 'hmm'], ['düşünmek', 'hmm'], ['thinking', 'hmm']],
  ['monocle', 'Face with monocle', '🧐', 'thinking', ['genau hinsehen', 'prüfen'], ['inceleme', 'dikkatle bakmak'], ['monocle', 'inspect']],
  ['raised-eyebrow', 'Face with raised eyebrow', '🤨', 'thinking', ['skeptisch', 'echt jetzt'], ['şüpheli', 'cidden mi'], ['skeptical', 'really']],
  ['shush', 'Shushing face', '🤫', 'thinking', ['psst', 'leise'], ['şşş', 'sessiz ol'], ['shh', 'quiet']],
  ['nerd', 'Nerd face', '🤓', 'thinking', ['streber', 'nerd'], ['inek', 'bilgiç'], ['nerd', 'actually']],
  ['brain', 'Brain', '🧠', 'thinking', ['gehirn', 'schlau'], ['beyin', 'akıllı'], ['brain', 'smart']],
  ['idea', 'Light bulb', '💡', 'thinking', ['idee', 'geistesblitz'], ['fikir', 'aklıma geldi'], ['idea', 'light bulb']],
  // cool
  ['cool', 'Smiling face with sunglasses', '😎', 'cool', ['cool', 'lässig'], ['havalı', 'cool'], ['cool', 'sunglasses']],
  ['cold', 'Cold face', '🥶', 'cool', ['eiskalt', 'frieren'], ['buz gibi', 'üşüdüm'], ['cold', 'freezing']],
  ['star-struck', 'Star-struck', '🤩', 'cool', ['begeistert', 'sternenaugen'], ['hayran', 'büyülendim'], ['star struck', 'amazing']],
  ['cowboy', 'Cowboy hat face', '🤠', 'cool', ['cowboy', 'yeehaw'], ['kovboy', 'yihaa'], ['cowboy', 'yeehaw']],
  ['wink', 'Winking face', '😉', 'cool', ['zwinkern', 'zwinker'], ['göz kırpmak', 'göz kırp'], ['wink', 'winky']],
  ['upside-down', 'Upside-down face', '🙃', 'cool', ['kopfüber', 'ironisch'], ['ters yüz', 'ironik'], ['upside down', 'ironic']],
  ['zany', 'Zany face', '🤪', 'cool', ['verrückt', 'durchgeknallt'], ['çılgın', 'deli dolu'], ['zany', 'crazy']],
  ['wink-tongue', 'Winking face with tongue', '😜', 'cool', ['frech', 'albern'], ['şakacı', 'muzip'], ['cheeky', 'silly']],
  ['money-mouth', 'Money-mouth face', '🤑', 'money', ['geldgesicht', 'reich'], ['para yüzü', 'zengin'], ['money mouth', 'rich']],
  ['clown', 'Clown face', '🤡', 'cool', ['clown', 'zirkus'], ['palyaço', 'sirk'], ['clown', 'circus']],
  ['robot', 'Robot', '🤖', 'cool', ['roboter', 'beep boop'], ['robot', 'bip bop'], ['robot', 'beep boop']],
  ['alien', 'Alien', '👽', 'cool', ['außerirdischer', 'alien'], ['uzaylı', 'yaratık'], ['alien', 'ufo']],
  ['ghost', 'Ghost', '👻', 'ghost', ['gespenst', 'buh'], ['hayalet', 'öcü'], ['ghost', 'boo']],
  ['relieved', 'Relieved face', '😌', 'cool', ['erleichtert', 'entspannt'], ['rahatladım', 'huzurlu'], ['relieved', 'calm']],
  ['hug', 'Hugging face', '🤗', 'love', ['umarmung', 'drücker'], ['sarılmak', 'kucaklama'], ['hug', 'hugs']],
  ['yum', 'Face savoring food', '😋', 'food', ['lecker', 'mjam'], ['nefis', 'lezzetli'], ['yummy', 'delicious']],
  ['yawn', 'Yawning face', '🥱', 'sleeping', ['gähnen', 'langweilig'], ['esnemek', 'sıkıcı'], ['yawn', 'boring']],
  ['sleeping', 'Sleeping face', '😴', 'sleeping', ['schlafen', 'müde'], ['uyumak', 'uykulu'], ['sleeping', 'tired']],
  ['zzz', 'Zzz', '💤', 'sleeping', ['zzz', 'schnarchen'], ['horul horul', 'zzz'], ['zzz', 'snore']],
  // angry (mild)
  ['angry', 'Angry face', '😠', 'angry', ['sauer', 'grummel'], ['kızgın', 'sinirli'], ['angry', 'grumpy']],
  ['pouting', 'Pouting face', '😡', 'angry', ['wütend', 'rot vor wut'], ['öfkeli', 'çok kızgın'], ['mad', 'furious']],
  // symbols
  ['hundred', 'Hundred points', '💯', '100', ['hundert', 'volle punktzahl'], ['yüz puan', 'tam puan'], ['hundred', 'one hundred']],
  ['check', 'Check mark button', '✅', 'symbol', ['erledigt', 'häkchen'], ['tamamlandı', 'onay'], ['done', 'check']],
  ['cross', 'Cross mark', '❌', 'symbol', ['falsch', 'nein'], ['yanlış', 'hayır'], ['wrong', 'no']],
  ['question', 'Red question mark', '❓', 'symbol', ['frage', 'was'], ['soru', 'ne'], ['question', 'what']],
  ['megaphone', 'Megaphone', '📣', 'symbol', ['ansage', 'durchsage'], ['duyuru', 'megafon'], ['announcement', 'megaphone']],
  ['alarm', 'Alarm clock', '⏰', 'symbol', ['wecker', 'zeit'], ['çalar saat', 'zaman'], ['alarm', 'time']],
  ['stopwatch', 'Stopwatch', '⏱️', 'symbol', ['stoppuhr', 'schnell'], ['kronometre', 'hızlı'], ['stopwatch', 'speedrun']],
  // rocket / crown / trophy / money / stars
  ['rocket', 'Rocket', '🚀', 'rocket', ['rakete', 'abheben'], ['roket', 'havalan'], ['rocket', 'to the moon']],
  ['crown', 'Crown', '👑', 'crown', ['krone', 'könig'], ['taç', 'kral'], ['crown', 'king']],
  ['trophy', 'Trophy', '🏆', 'trophy', ['pokal', 'sieger'], ['kupa', 'şampiyon'], ['trophy', 'champion']],
  ['medal', '1st place medal', '🥇', 'trophy', ['goldmedaille', 'erster platz'], ['altın madalya', 'birinci'], ['gold medal', 'first place']],
  ['target', 'Bullseye', '🎯', 'trophy', ['volltreffer', 'ins schwarze'], ['tam isabet', 'on ikiden'], ['bullseye', 'on target']],
  ['money-bag', 'Money bag', '💰', 'money', ['geldsack', 'kohle'], ['para çantası', 'para'], ['money bag', 'cash']],
  ['gem', 'Gem stone', '💎', 'money', ['diamant', 'juwel'], ['elmas', 'mücevher'], ['diamond', 'gem']],
  ['glowing-star', 'Glowing star', '🌟', 'star', ['leuchtender stern', 'superstar'], ['parlayan yıldız', 'süperstar'], ['glowing star', 'superstar']],
  ['star', 'Star', '⭐', 'star', ['stern', 'top'], ['yıldız', 'harika'], ['star', 'gold star']],
  ['sparkles', 'Sparkles', '✨', 'sparkles', ['glitzer', 'funkeln'], ['pırıltı', 'parıltı'], ['sparkles', 'shiny']],
  ['shooting-star', 'Shooting star', '🌠', 'star', ['sternschnuppe', 'wünsch dir was'], ['kayan yıldız', 'dilek tut'], ['shooting star', 'make a wish']],
  ['eyes', 'Eyes', '👀', 'eyes', ['augen', 'ich schau'], ['gözler', 'bakıyorum'], ['eyes', 'watching']],
  ['popcorn', 'Popcorn', '🍿', 'popcorn', ['popcorn', 'drama'], ['patlamış mısır', 'dram'], ['popcorn', 'grab popcorn']],
  ['game', 'Video game', '🎮', 'cool', ['zocken', 'controller'], ['oyun', 'kumanda'], ['gaming', 'controller']],
  ['teddy', 'Teddy bear', '🧸', 'animals', ['teddy', 'kuscheltier'], ['oyuncak ayı', 'peluş'], ['teddy bear', 'plush']],
  // animals
  ['cat', 'Cat face', '🐱', 'animals', ['katze', 'miau'], ['kedi', 'miyav'], ['cat', 'meow']],
  ['dog', 'Dog face', '🐶', 'animals', ['hund', 'wuff'], ['köpek', 'hav hav'], ['dog', 'woof']],
  ['unicorn', 'Unicorn', '🦄', 'animals', ['einhorn', 'magisch'], ['tek boynuzlu at', 'sihirli'], ['unicorn', 'magic']],
  ['see-no-evil', 'See-no-evil monkey', '🙈', 'animals', ['nicht hinsehen', 'äffchen'], ['görmedim', 'maymun'], ['see no evil', 'cant look']],
  ['hear-no-evil', 'Hear-no-evil monkey', '🙉', 'animals', ['nichts hören', 'lalala'], ['duymadım', 'lalala'], ['hear no evil', 'not listening']],
  ['speak-no-evil', 'Speak-no-evil monkey', '🙊', 'animals', ['nichts sagen', 'hoppla'], ['bir şey demedim', 'hoppala'], ['speak no evil', 'oops said it']],
  ['panda', 'Panda', '🐼', 'animals', ['panda', 'pandabär'], ['panda', 'panda ayı'], ['panda', 'panda bear']],
  ['fox', 'Fox', '🦊', 'animals', ['fuchs', 'schlau wie ein fuchs'], ['tilki', 'kurnaz'], ['fox', 'sly']],
  ['penguin', 'Penguin', '🐧', 'animals', ['pinguin', 'watscheln'], ['penguen', 'paytak'], ['penguin', 'waddle']],
  ['frog', 'Frog', '🐸', 'animals', ['frosch', 'quak'], ['kurbağa', 'vrak'], ['frog', 'ribbit']],
  ['turtle', 'Turtle', '🐢', 'animals', ['schildkröte', 'langsam'], ['kaplumbağa', 'yavaş'], ['turtle', 'slow']],
  ['snail', 'Snail', '🐌', 'animals', ['schnecke', 'schneckentempo'], ['salyangoz', 'ağır'], ['snail', 'snail pace']],
  ['sloth', 'Sloth', '🦥', 'animals', ['faultier', 'chillen'], ['tembel hayvan', 'tembellik'], ['sloth', 'lazy']],
  ['butterfly', 'Butterfly', '🦋', 'animals', ['schmetterling', 'flattern'], ['kelebek', 'uçuşmak'], ['butterfly', 'flutter']],
  ['trex', 'T-rex', '🦖', 'animals', ['dino', 't-rex'], ['dinozor', 't-rex'], ['dino', 'rawr']],
  ['lion', 'Lion', '🦁', 'animals', ['löwe', 'brüllen'], ['aslan', 'kükreme'], ['lion', 'roar']],
  // weather
  ['sun', 'Sun with face', '🌞', 'weather', ['sonne', 'sonnig'], ['güneş', 'güneşli'], ['sun', 'sunny']],
  ['rain', 'Cloud with rain', '🌧️', 'weather', ['regen', 'regnerisch'], ['yağmur', 'yağmurlu'], ['rain', 'rainy']],
  ['snowflake', 'Snowflake', '❄️', 'weather', ['schneeflocke', 'schnee'], ['kar tanesi', 'kar'], ['snowflake', 'snow']],
  ['storm', 'Cloud with lightning', '🌩️', 'weather', ['gewitter', 'donner'], ['fırtına', 'gök gürültüsü'], ['thunder', 'storm']],
  ['rainbow', 'Rainbow', '🌈', 'weather', ['regenbogen', 'bunt'], ['gökkuşağı', 'renkli'], ['rainbow', 'colorful']],
  ['snowman', 'Snowman without snow', '⛄', 'weather', ['schneemann', 'winter'], ['kardan adam', 'kış'], ['snowman', 'winter']],
  // food
  ['pizza', 'Pizza', '🍕', 'food', ['pizza', 'pizzazeit'], ['pizza', 'pizza zamanı'], ['pizza', 'pizza time']],
  ['coffee', 'Hot beverage', '☕', 'food', ['kaffee', 'kaffeepause'], ['kahve', 'kahve molası'], ['coffee', 'coffee break']],
  ['tea', 'Teacup without handle', '🍵', 'food', ['tee', 'teepause'], ['çay', 'çay molası'], ['tea', 'tea time']],
  ['burger', 'Hamburger', '🍔', 'food', ['burger', 'hunger'], ['hamburger', 'açım'], ['burger', 'hungry']],
  ['ice-cream', 'Soft ice cream', '🍦', 'food', ['eis', 'eiscreme'], ['dondurma', 'külah'], ['ice cream', 'soft serve']],
];

const CATEGORIES = Array.from(new Set(LIST.map((r) => r[3])));

function items() {
  return LIST.map(([id, name, emoji, category, de, tr, en]) => ({ id, name, emoji, category, keywords: { de, tr, en } }));
}

/** Throws when the curated list breaks a rule (ids, exclusions, keywords). Returns the item list. */
function checkList() {
  const list = items();
  const seen = new Set();
  const errors = [];
  for (const it of list) {
    if (!/^[a-z0-9_-]{1,80}$/.test(it.id)) errors.push(`${it.id}: bad id`);
    if (seen.has(it.id)) errors.push(`${it.id}: duplicate id`);
    seen.add(it.id);
    const cat = excludedCategory(it.emoji);
    if (cat) errors.push(`${it.id}: ${it.emoji} is excluded (${cat})`);
    if (EXCLUDED_NAME_RE.test(it.name)) errors.push(`${it.id}: asset name "${it.name}" is excluded`);
    for (const l of ['de', 'tr', 'en']) if (!Array.isArray(it.keywords[l]) || !it.keywords[l].length) errors.push(`${it.id}: no ${l} keywords`);
  }
  if (list.length < 120 || list.length > 150) errors.push(`list has ${list.length} items (want 120..150)`);
  if (errors.length) throw new Error(`curated list invalid:\n  ${errors.join('\n  ')}`);
  return list;
}

// ---------------------------------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------------------------------
const sh = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${cmd} ${args.slice(0, 6).join(' ')}… failed: ${stderr || err.message}`));
      else resolve(stdout);
    });
  });

function download(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'user-agent': 'livefx-build-memes' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          res.resume();
          resolve(download(new URL(res.headers.location, url).href, dest, redirects - 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`GET ${url} -> HTTP ${res.statusCode}`));
          return;
        }
        const tmp = `${dest}.part`;
        const out = fs.createWriteStream(tmp);
        res.pipe(out);
        out.on('finish', () => out.close(() => fs.rename(tmp, dest, (e) => (e ? reject(e) : resolve(dest)))));
        out.on('error', reject);
      })
      .on('error', reject);
  });
}

const isPng = (file) => {
  try {
    const fd = fs.openSync(file, 'r');
    const b = Buffer.alloc(8);
    fs.readSync(fd, b, 0, 8, 0);
    fs.closeSync(fd);
    return b.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  } catch (_) {
    return false;
  }
};

async function listRepo(repo, cache) {
  const dir = path.join(cache, repo.name);
  if (!fs.existsSync(path.join(dir, '.git'))) {
    console.log(`  cloning ${repo.git} (blob-less, no checkout) …`);
    await sh('git', ['clone', '--quiet', '--depth', '1', '--filter=blob:none', '--no-checkout', repo.git, dir]);
  }
  const out = await sh('git', ['-C', dir, 'ls-tree', '-r', '--name-only', 'HEAD']);
  return out.split('\n').filter(Boolean);
}

/** Finds the animated and the static 3D source paths of an asset folder ({animated, static}, null when absent). */
function resolveSource(name, animatedFiles, staticFiles) {
  const pick = (files, kind) => {
    const pre = `assets/${name}/`;
    const own = files.filter((f) => f.startsWith(pre) && f.endsWith('.png'));
    return own.find((f) => f === `${pre}${kind}/${path.basename(f)}`) || own.find((f) => f.startsWith(`${pre}Default/${kind}/`)) || null;
  };
  const a = pick(animatedFiles, 'animated');
  const s = pick(staticFiles, '3D');
  if (!a && !s) return null;
  return { animated: a ? { repo: REPOS.animated, path: a } : null, static: s ? { repo: REPOS.static, path: s } : null };
}

const urlFor = (repo, p) => {
  const enc = p.split('/').map(encodeURIComponent).join('/');
  return repo.lfs ? `https://media.githubusercontent.com/media/microsoft/${repo.name}/main/${enc}` : `https://raw.githubusercontent.com/microsoft/${repo.name}/main/${enc}`;
};

// Quality ladder for animated WebP: [size, fps, quality]. The first result <= TARGET_BYTES wins; when even
// the last rung is above ANIM_MAX_BYTES the sticker is built from the static 3D image instead.
// Note: ffmpeg's `-cr_threshold` (conditional replenishment) would halve the size but breaks the alpha
// channel (black blocks around the emoji), so it is deliberately not used.
const LADDER = [
  [SIZE, 10, 45],
  [SIZE, 8, 40],
  [SIZE, 6, 35],
  [SIZE, 6, 28],
  [SIZE, 5, 25],
];

/** Returns {size, fps, q, bytes} or null when the animation does not fit into `max` bytes. */
async function encodeAnimated(src, dest, max = ANIM_MAX_BYTES) {
  let last = null;
  for (const [size, fps, q] of LADDER) {
    await sh('ffmpeg', ['-v', 'error', '-y', '-f', 'apng', '-i', src, '-vf', `fps=${fps},scale=${size}:${size}:flags=lanczos,format=yuva420p`, '-c:v', 'libwebp_anim', '-lossless', '0', '-quality', String(q), '-compression_level', '6', '-preset', 'picture', '-loop', '0', '-an', dest]);
    last = { size, fps, q, bytes: fs.statSync(dest).size };
    if (last.bytes <= TARGET_BYTES) return last;
  }
  if (last.bytes <= max) return last;
  fs.unlinkSync(dest);
  return null;
}

const isAnimatedWebp = (file) => fs.readFileSync(file).includes(Buffer.from('ANIM'));

async function encodeStatic(src, dest) {
  await sh('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', `scale=${SIZE}:${SIZE}:flags=lanczos`, '-c:v', 'libwebp', '-lossless', '0', '-quality', '80', '-compression_level', '6', '-preset', 'icon', dest]);
  return { size: SIZE, bytes: fs.statSync(dest).size };
}

async function pool(list, n, fn) {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < list.length) {
        const k = i++;
        out[k] = await fn(list[k], k);
      }
    })
  );
  return out;
}

async function build({ force = false } = {}) {
  const list = checkList();
  const cache = process.env.MEMES_CACHE || path.join(os.tmpdir(), 'livefx-memes-cache');
  fs.mkdirSync(path.join(cache, 'src'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, SET), { recursive: true });
  console.log(`build-memes: ${list.length} items, cache ${cache}`);
  const [animatedFiles, staticFiles] = await Promise.all([listRepo(REPOS.animated, cache), listRepo(REPOS.static, cache)]);

  // Stickers referenced by the reactions pack get the larger animation budget.
  require('../js/packs.js');
  const packIds = new Set(
    globalThis.LiveFXPacks.get('reactions')
      .map((t) => /^memes\/fluent\/([a-z0-9_-]+)\.webp$/.exec((t.visual && t.visual.src) || ''))
      .filter(Boolean)
      .map((m) => m[1])
  );
  const missing = [];
  const results = await pool(list, 6, async (it) => {
    const src = resolveSource(it.name, animatedFiles, staticFiles);
    if (!src) {
      missing.push(`${it.id} (${it.name})`);
      return null;
    }
    // Verify the glyph against the repository's metadata.json (cached).
    const metaFile = path.join(cache, 'src', `${it.id}.meta.json`);
    const metaRepo = (src.static || src.animated).repo;
    if (!fs.existsSync(metaFile)) await download(urlFor({ ...metaRepo, lfs: false }, `assets/${it.name}/metadata.json`), metaFile);
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    const norm = (s) => codepoints(s).join(' ');
    if (norm(meta.glyph) !== norm(it.emoji)) throw new Error(`${it.id}: metadata glyph ${meta.glyph} != curated ${it.emoji}`);

    const fetchSrc = async (info, ext) => {
      const file = path.join(cache, 'src', `${it.id}.${ext}`);
      if (!isPng(file)) {
        await download(urlFor(info.repo, info.path), file);
        if (!isPng(file)) throw new Error(`${it.id}: ${info.path} is not a PNG (Git LFS pointer?)`);
      }
      return file;
    };
    const dest = path.join(OUT_DIR, SET, `${it.id}.webp`);
    let enc = null;
    let animated = false;
    let source = null;
    if (!force && fs.existsSync(dest)) {
      animated = isAnimatedWebp(dest);
      source = (animated ? src.animated : src.static || src.animated).path;
      enc = { bytes: fs.statSync(dest).size, cached: true };
    } else {
      if (src.animated) {
        enc = await encodeAnimated(await fetchSrc(src.animated, 'apng'), dest, packIds.has(it.id) ? ANIM_MAX_PACK_BYTES : ANIM_MAX_BYTES);
        if (enc) {
          animated = true;
          source = src.animated.path;
        }
      }
      if (!enc) {
        if (!src.static) throw new Error(`${it.id}: animation too large and no static 3D image`);
        enc = await encodeStatic(await fetchSrc(src.static, 'png'), dest);
        source = src.static.path;
      }
    }
    const note = enc.fps ? ` (${enc.size}px ${enc.fps}fps q${enc.q})` : src.animated && !animated ? ' (animation too large → static)' : '';
    process.stdout.write(`  ${animated ? 'A' : 'S'} ${it.id.padEnd(18)} ${(enc.bytes / 1024).toFixed(1).padStart(5)} KB${note}\n`);
    return { it, animated, source, bytes: enc.bytes };
  });
  if (missing.length) throw new Error(`no Fluent source for: ${missing.join(', ')}`);

  // Remove stale files of items that left the list.
  const keep = new Set(list.map((it) => `${it.id}.webp`));
  for (const f of fs.readdirSync(path.join(OUT_DIR, SET))) if (!keep.has(f)) fs.unlinkSync(path.join(OUT_DIR, SET, f));

  const index = {
    version: 1,
    generated: new Date().toISOString().slice(0, 10),
    sets: [
      {
        id: SET,
        name: 'Microsoft Fluent Emoji',
        license: 'MIT',
        copyright: 'Copyright (c) Microsoft Corporation',
        source: [REPOS.animated.git, REPOS.static.git],
        animated: true,
        size: SIZE,
      },
    ],
    excluded: Object.keys(EXCLUDED).concat('brands'),
    items: results.map((r) => ({
      id: r.it.id,
      set: SET,
      file: `memes/${SET}/${r.it.id}.webp`,
      animated: r.animated,
      category: r.it.category,
      keywords: r.it.keywords,
      emoji: r.it.emoji,
      name: r.it.name,
    })),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), `${JSON.stringify(index, null, 1)}\n`);
  const total = results.reduce((s, r) => s + r.bytes, 0);
  if (total > TOTAL_MAX_BYTES) throw new Error(`total ${total} bytes exceeds ${TOTAL_MAX_BYTES} – lower LADDER / ANIM_MAX_BYTES`);
  const anim = results.filter((r) => r.animated).length;
  const over = results.filter((r) => r.bytes > TARGET_BYTES).map((r) => `${r.it.id} ${(r.bytes / 1024).toFixed(1)} KB`);
  console.log(`build-memes: ${results.length} stickers (${anim} animated, ${results.length - anim} static), total ${(total / 1024 / 1024).toFixed(2)} MB`);
  if (over.length) console.log(`  over ${TARGET_BYTES / 1024} KB target: ${over.join(', ')}`);
  return { count: results.length, animated: anim, total };
}

module.exports = { LIST, CATEGORIES, EXCLUDED, EXCLUDED_RANGES, EXCLUDED_NAME_RE, excludedCategory, codepoints, items, checkList };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    const list = checkList();
    console.log(`build-memes --check: ${list.length} items OK, categories: ${CATEGORIES.join(', ')}`);
  } else {
    build({ force: args.includes('--force') }).catch((e) => {
      console.error(e.message || e);
      process.exit(1);
    });
  }
}
