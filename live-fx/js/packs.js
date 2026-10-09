// LiveFX – language / culture meme packs (Türkçe, Deutsch, English), story packs (1.3) and theme packs
// „Familie & Kinder“ / „Gaming“ (2.0). UMD, global `LiveFXPacks`.
//
// A pack is a curated list of trigger objects (schema v2, see docs/CONTRACTS.md §1) that the panel
// can add to the streamer's trigger list with one click. Rules baked into every pack:
//   - ids are prefixed with the pack id (`tr-`, `de-`, `en-`, `family-`, `gaming-`) and never collide with the defaults
//   - keywords are whole words / phrases as spoken (the matcher lower-cases and matches whole words;
//     diacritics matter, so common ASCII spellings are listed as extra variants)
//   - keywords avoid the exact words of the default pack (js/triggers.js) so a pack trigger does not
//     always fire together with a default
//   - only builtin sounds from js/sounds.js (or null) and only visual kinds card/banner/rain/confetti;
//     story packs additionally use `scene` / `sticker` visuals and `loop:<name>` ambient sounds
//   - every trigger has an English `hint` for the smart mode
(function (global) {
  'use strict';

  // Small helpers keep the pack tables readable. Every helper returns a plain visual object.
  const card = (emoji, text, bg, color, extra) => Object.assign({ kind: 'card', position: 'center', emoji, text, bg, color: color || '#ffffff' }, extra || {});
  const banner = (emoji, text, extra) => Object.assign({ kind: 'banner', position: 'top', emoji, text }, extra || {});
  const rain = (emoji, count, extra) => Object.assign({ kind: 'rain', position: 'center', emoji, count }, extra || {});
  const confetti = (emoji, text, extra) => Object.assign({ kind: 'confetti', position: 'safe', emoji, text }, extra || {});

  /** Expands a compact row [id, label, keywords, hint, sound, visual, cooldown] into a trigger. */
  function row(prefix, r) {
    return {
      id: `${prefix}-${r[0]}`,
      label: r[1],
      keywords: r[2],
      hint: r[3],
      sound: r[4],
      visual: r[5],
      cooldown: r[6] == null ? 5 : r[6],
      enabled: true,
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Türkçe – TikTok / Instagram / YouTube TR streamer culture
  // ---------------------------------------------------------------------------------------------
  const TR = [
    ['yokartik', 'Yok artık', ['yok artık', 'yok artik', 'yok ya', 'yok daha neler'], 'streamer cannot believe it, over the top disbelief', 'airhorn', card('😱', 'YOK ARTIK!', '#8e44ad', '#ffffff', { shake: true }), 5],
    ['oha', 'Ohaa', ['oha', 'ohaa', 'ohaaa', 'ohh', 'oha be'], 'streamer is shocked or amazed', 'boom', card('🤯', 'OHAAA', '#2c3e50', '#ffffff', { shake: true }), 5],
    ['helal', 'Helal olsun', ['helal olsun', 'helal', 'helal be', 'helal sana'], 'praise, well done, respect', 'applause', confetti('👏', 'HELAL OLSUN!'), 6],
    ['aynen', 'Aynen', ['aynen', 'aynen öyle', 'aynen aynen', 'aynen kanki'], 'strong agreement, exactly', 'ding', card('☝️', 'AYNEN', '#16a085'), 4],
    ['kral', 'Kral', ['kral', 'kralsın', 'kralsin', 'kral adam', 'kraliçe'], 'calling someone the king / queen, admiration', 'tada', banner('👑', 'KRAL'), 6],
    ['efsane', 'Efsane', ['efsane', 'efsanesin', 'efsane ya', 'destan'], 'legendary, epic moment', 'airhorn', confetti('🏆', 'EFSANE!'), 6],
    ['rezil', 'Rezil', ['rezil', 'rezil olduk', 'rezil oldum', 'rezalet'], 'embarrassing disaster, disgrace', 'sadTrombone', card('🙈', 'REZİL OLDUK', '#c0392b'), 6],
    ['hadiya', 'Hadi ya', ['hadi ya', 'hadi canım', 'hadi be', 'yapma ya'], 'mild disbelief, come on really?', 'pop', card('🤨', 'Hadi ya…', '#34495e'), 4],
    ['vaybe', 'Vay be', ['vay be', 'vay canına', 'vay anasını', 'vay arkadaş'], 'impressed, wow', 'whoosh', card('😮', 'VAY BE', '#2980b9'), 4],
    ['sahane', 'Şahane', ['şahane', 'sahane', 'şahane ya', 'şahanesin'], 'splendid, great', 'tada', confetti('🌟', 'ŞAHANE!'), 6],
    ['inanilmaz', 'İnanılmaz', ['inanamıyorum', 'inanamiyorum', 'inanılmaz ya', 'inanilmaz ya'], 'unbelievable', 'boom', card('🤯', 'İNANILMAZ', '#8e44ad', '#ffffff', { shake: true }), 5],
    ['afiyet', 'Afiyet olsun', ['afiyet olsun', 'afiyet olsun canım', 'yemek vakti'], 'enjoy your meal', 'pop', card('🍽️', 'Afiyet olsun', '#e67e22'), 8],
    ['gecmisolsun', 'Geçmiş olsun', ['geçmiş olsun', 'gecmis olsun', 'çabuk iyileş', 'cabuk iyiles'], 'get well soon', 'bell', card('🩹', 'Geçmiş olsun', '#16a085'), 8],
    ['kolaygelsin', 'Kolay gelsin', ['kolay gelsin', 'kolay gelsin herkese', 'iyi çalışmalar', 'iyi calismalar'], 'have an easy time, good work', 'ding', card('💪', 'Kolay gelsin', '#2980b9'), 8],
    ['basarilar', 'Başarılar', ['başarılar', 'basarilar', 'bol şans', 'bol sans'], 'good luck', 'levelUp', card('🍀', 'BAŞARILAR', '#27ae60'), 6],
    ['vayanam', 'Vay anam', ['vay anam', 'vay anam vay', 'vay anasını sat'], 'oh no, shocked', 'scratch', card('😱', 'VAY ANAM', '#c0392b', '#ffffff', { shake: true }), 5],
    ['eyvallah', 'Eyvallah', ['eyvallah', 'eyvallah kardeşim', 'eyw'], 'thanks bro, acknowledgement', 'ding', card('🤝', 'Eyvallah', '#2c3e50'), 4],
    ['olm', 'Olm!', ['olm', 'oğlum', 'oglum', 'lan', 'ulan'], 'buddy address, casual exclamation', 'boom', card('😤', 'OLM!', '#111111'), 5],
    ['kanki', 'Kanki', ['kanki', 'kankam', 'kankalar', 'kardeşim', 'kardesim'], 'addressing a close friend', 'pop', card('🫂', 'KANKİ', '#8e44ad'), 5],
    ['abi', 'Abi / Abla', ['abi', 'abla', 'abicim', 'ablacım', 'abim'], 'addressing an older brother or sister figure', null, card('🙋', 'Abi!', '#34495e'), 6],
    ['cokiyi', 'Çok iyi', ['çok iyi', 'cok iyi', 'çok iyisin', 'süper', 'super', 'süpersin'], 'very good, super', 'tada', confetti('🌟', 'ÇOK İYİ!'), 5],
    ['bomba', 'Bomba', ['bomba', 'bomba gibi', 'bomba gibisin', 'patladı'], 'something explosive, awesome', 'boom', card('💣', 'BOMBA!', '#e74c3c', '#ffffff', { shake: true }), 5],
    ['yikildim', 'Yıkıldım', ['yıkıldım', 'yikildim', 'yıkıldık', 'öldüm', 'oldum ben'], 'laughing so hard, I am dead', 'rimshot', rain('💀', 20), 5],
    ['agliyorum', 'Ağlıyorum', ['ağlıyorum', 'agliyorum', 'ağlarım', 'ağlıcam', 'gözlerim doldu'], 'crying, emotional or laughing to tears', 'rimshot', rain('😭', 22), 5],
    ['guldum', 'Güldüm', ['güldüm', 'guldum', 'çok güldüm', 'gülmekten öldüm', 'kırıldım'], 'laughed a lot', 'rimshot', rain('🤣', 18), 4],
    ['utandim', 'Utandım', ['utandım', 'utandim', 'ay utandım', 'yerin dibine girdim'], 'embarrassed', 'crickets', card('😳', 'Utandım…', '#2c3e50'), 6],
    ['kafayiyedim', 'Kafayı yedim', ['kafayı yedim', 'kafayi yedim', 'delirdim', 'deliriyorum', 'kafayı yiyeceğim'], 'going crazy, losing my mind', 'buzzer', card('🤪', 'KAFAYI YEDİM', '#e67e22', '#ffffff', { shake: true }), 6],
    ['deli', 'Deli', ['deli', 'deli misin', 'delisin', 'manyak', 'manyaksın'], 'calling something or someone crazy', 'boom', card('🤯', 'DELİ', '#8e44ad'), 5],
    ['korktum', 'Korktum', ['korktum', 'korkuyorum', 'ödüm koptu', 'ödüm patladı'], 'scared, jump scare', 'scratch', card('😨', 'KORKTUM', '#111111', '#ffffff', { shake: true }), 6],
    ['sok', 'Şok', ['şok', 'sok oldum', 'şok oldum', 'şoktayım', 'şaka mı'], 'shocked, in disbelief', 'boom', card('😧', 'ŞOK', '#c0392b', '#ffffff', { shake: true }), 5],
    ['nealaka', 'Ne alaka', ['ne alaka', 'ne alakası var', 'alakası yok', 'saçma'], 'that makes no sense, unrelated', 'buzzer', card('🤷', 'NE ALAKA?', '#7f8c8d'), 5],
    ['sacmalama', 'Saçmalama', ['saçmalama', 'sacmalama', 'saçmalıyorsun', 'saçma sapan'], 'stop talking nonsense', 'buzzer', card('🙄', 'Saçmalama', '#34495e'), 5],
    ['yalan', 'Yalan', ['yalan', 'yalan söyleme', 'yalancı', 'atıyorsun', 'inanmıyorum'], 'calling a lie, not believing', 'scratch', card('🤥', 'YALAN!', '#e74c3c'), 5],
    ['haklisin', 'Haklısın', ['haklısın', 'haklisin', 'doğru', 'dogru', 'katılıyorum', 'kesinlikle'], 'you are right, agreement', 'ding', card('✅', 'HAKLISIN', '#27ae60'), 4],
    ['evet', 'Evet!', ['evet', 'evet evet', 'tabii', 'tabii ki', 'tamamdır'], 'yes, affirmative', 'pop', card('👍', 'EVET', '#2980b9'), 5],
    ['olmaz', 'Olmaz', ['olmaz', 'asla', 'yok öyle', 'yok öyle bir şey', 'imkansız'], 'no way, refusing', 'scratch', card('🙅', 'OLMAZ', '#c0392b'), 5],
    ['tamam', 'Tamam', ['tamam', 'tamam tamam', 'oldu bitti', 'anlaştık'], 'okay, agreed, deal', 'pop', card('👌', 'Tamam', '#16a085'), 6],
    ['bitti', 'Bitti', ['bitti', 'bitti gitti', 'bu iş bitti', 'bitti bu iş'], 'it is over, finished', 'whoosh', banner('🏁', 'BİTTİ'), 6],
    ['kazandik', 'Kazandık', ['kazandık', 'kazandik', 'kazandım', 'başardım', 'aldık'], 'we won, victory', 'tada', confetti('🥇', 'KAZANDIK!'), 6],
    ['kaybettik', 'Kaybettik', ['kaybettik', 'kaybettim', 'yenildik', 'gitti gider', 'bitmiştir'], 'we lost, defeat', 'sadTrombone', card('💔', 'Kaybettik…', '#2c3e50'), 6],
    ['zengin', 'Zengin', ['zengin', 'zenginiz', 'zengin olduk', 'milyoner', 'paramız var'], 'rich, money talk', 'cash', rain('💰', 22), 5],
    ['fakir', 'Fakir', ['fakir', 'fakiriz', 'paramız yok', 'param yok', 'beş parasız'], 'broke, no money', 'sadTrombone', card('🪙', 'Paramız yok…', '#7f8c8d'), 6],
    ['kalp', 'Kalp', ['kalp', 'canım', 'canim', 'sevgi', 'aşkım', 'askim', 'seni seviyorum'], 'love and affection', 'ding', rain('💖', 22), 5],
    ['alev', 'Alev', ['alev', 'alev aldı', 'yanıyor', 'yandık', 'yandım'], 'on fire, heating up', 'airhorn', rain('🔥', 24), 5],
    ['sesver', 'Ses ver', ['ses ver', 'ses verin', 'ses yok mu', 'neredesiniz'], 'asking chat to react', 'airhorn', banner('📣', 'SES VER!'), 8],
    ['selam', 'Selam', ['selam', 'selamlar', 'merhaba', 'merhabalar', 'selamün aleyküm', 'selamun aleykum'], 'greeting the chat', 'pop', card('👋', 'Selam!', '#2980b9'), 8],
    ['hosgeldin', 'Hoş geldin', ['hoş geldin', 'hos geldin', 'hoş geldiniz', 'hos geldiniz', 'hoşgeldin'], 'welcoming a viewer', 'ding', confetti('🎉', 'HOŞ GELDİN!'), 8],
    ['iyigeceler', 'İyi geceler', ['iyi geceler', 'iyi aksamlar', 'iyi akşamlar', 'görüşürüz', 'gorusuruz', 'bay bay'], 'saying good night / goodbye', 'whoosh', card('🌙', 'İyi geceler', '#2c3e50'), 8],
    ['tesekkurler', 'Teşekkürler', ['teşekkürler', 'tesekkurler', 'teşekkür ederim', 'sağ ol', 'sag ol', 'sağ olun'], 'saying thank you', 'ding', rain('💖', 16), 6],
    ['ahbe', 'Ah be', ['ah be', 'of ya', 'off ya', 'ya of', 'of be'], 'sighing, frustrated', 'sadTrombone', card('😩', 'Ah be…', '#34495e'), 6],
    ['yeter', 'Yeter', ['yeter', 'yeter artık', 'yeter ya', 'yeter be', 'dur artık'], 'enough, stop it', 'buzzer', card('✋', 'YETER!', '#c0392b', '#ffffff', { shake: true }), 5],
    ['sinirlendim', 'Sinirlendim', ['sinirlendim', 'sinirlerim bozuldu', 'kızdım', 'kizdim', 'gıcık oldum'], 'angry, annoyed', 'buzzer', card('😡', 'SİNİRLENDİM', '#e74c3c', '#ffffff', { shake: true }), 6],
    ['sabir', 'Sabır', ['sabır', 'sabir', 'sabret', 'sakin ol', 'sakin'], 'patience, calm down', 'pop', card('🧘', 'Sabır…', '#16a085'), 6],
    ['hadibakalim', 'Hadi bakalım', ['hadi bakalım', 'hadi bakalim', 'bakalım', 'bakalim', 'görelim'], 'let us see, here we go', 'drumroll', banner('🥁', 'HADİ BAKALIM'), 8],
    ['gelgel', 'Gel gel', ['gel gel', 'gel buraya', 'gelsene', 'buraya gel'], 'come here, calling someone over', 'whoosh', card('👉', 'GEL GEL', '#2980b9'), 5],
    ['cekil', 'Çekil', ['çekil', 'cekil', 'çekil oradan', 'kaçın', 'uzaklaş'], 'get out of the way, move', 'whoosh', card('🏃', 'ÇEKİL!', '#e67e22', '#ffffff', { shake: true }), 5],
    ['buneya', 'Bu ne ya', ['bu ne ya', 'bu ne', 'nedir bu', 'ne oluyor', 'ne oluyor ya'], 'what is this, confused', 'scratch', card('😵', 'BU NE YA?', '#8e44ad'), 5],
    // --- 2.0: +30 ---
    ['yasabir', 'Ya sabır', ['ya sabır', 'ya sabir', 'sabır ya rabbim', 'ya rabbim sabır'], 'give me patience, exasperated', 'gong', card('🧘', 'YA SABIR', '#34495e'), 5],
    ['cus', 'Çüş', ['çüş', 'cus', 'çüş ya', 'çüüş'], 'whoa, hold your horses, too much', 'scratch', card('🐴', 'ÇÜŞ!', '#c0392b'), 5],
    ['bayildim', 'Bayıldım', ['bayıldım', 'bayildim', 'bayıldım ya', 'bayılıyorum'], 'I love it, adore it', 'tada', rain('😍', 18), 5],
    ['agla', 'Ağla', ['ağla', 'agla', 'ağla ağla', 'ağlayın'], 'cry about it, taunting', 'sadTrombone', card('😭', 'AĞLA', '#2c3e50'), 5],
    ['kopuyorum', 'Kopuyorum', ['kopuyorum', 'koptum', 'gülmekten kopuyorum', 'kopacağım'], 'laughing hysterically', 'laugh', rain('🤣', 20), 5],
    ['noluyo', 'Noluyo', ['noluyo', 'noluyor', 'noluyo ya', 'noluyo lan'], 'what is going on, confused', 'scratch', card('😵‍💫', 'NOLUYO?', '#34495e'), 4],
    ['birdakika', 'Bir dakika', ['bi dakka', 'dur bakalım', 'bi saniye', 'dur dur'], 'hold on a minute, wait', 'drumroll', card('✋', 'Bir dakika…', '#7f8c8d'), 4],
    ['tebrikler', 'Tebrikler', ['tebrikler', 'tebrik ederim', 'kutlarım', 'kutluyorum'], 'congratulations', 'tada', confetti('🎉', 'TEBRİKLER!'), 6],
    ['yaparsin', 'Yaparsın', ['yaparsın', 'yaparsin', 'sen yaparsın', 'yapabilirsin'], 'you can do it, encouragement', 'levelUp', banner('💪', 'YAPARSIN!'), 6],
    ['hadi', 'Hadi', ['hadi', 'hadi hadi', 'haydi', 'hadi ama'], 'come on, hurry, let us go', 'whoosh', card('🏃', 'HADİ!', '#e67e22'), 4],
    ['napiyorsun', 'Ne yapıyorsun', ['ne yapıyorsun', 'napıyorsun', 'napiyorsun', 'ne yaptın sen'], 'what are you doing, facepalm', 'buzzer', card('🤦', 'NE YAPIYORSUN', '#c0392b'), 5],
    ['gercekmi', 'Gerçek mi', ['gerçek mi', 'gercek mi', 'ciddi misin', 'cidden mi', 'şaka yapıyorsun'], 'seriously? are you for real?', 'ooh', card('🤨', 'Gerçek mi?', '#2980b9'), 4],
    ['muhtesem', 'Muhteşem', ['muhteşem', 'muhtesem', 'mükemmel', 'harika', 'harikasın'], 'awesome, perfect, wonderful', 'tada', confetti('🌟', 'MUHTEŞEM!'), 6],
    ['sonunda', 'Sonunda', ['sonunda', 'nihayet', 'en sonunda', 'oh be sonunda'], 'finally, at last', 'levelUp', banner('🏁', 'SONUNDA!'), 6],
    ['kacti', 'Kaçtı', ['kaçtı', 'kacti', 'kaçırdım', 'kaçırdın', 'elimden kaçtı'], 'missed it, got away', 'slideWhistle', card('🙊', 'KAÇTI', '#7f8c8d'), 5],
    ['patlat', 'Patlat', ['patlat', 'patlatıyoruz', 'patlattık', 'patlıyor'], 'blow it up, going off', 'boom', rain('💥', 20), 5],
    ['neguzel', 'Ne güzel', ['ne güzel', 'ne guzel', 'çok güzel', 'güzel ya', 'güzelmiş'], 'how beautiful, how nice', 'bell', rain('✨', 18), 5],
    ['tuh', 'Tüh', ['tüh', 'tuh', 'tüh be', 'tüh ya'], 'damn, pity', 'sadTrombone', card('😖', 'Tüh…', '#34495e'), 5],
    ['korkma', 'Korkma', ['korkma', 'korkmayın', 'merak etme', 'endişelenme'], 'do not worry, do not be afraid', 'ding', card('🤗', 'Korkma', '#16a085'), 5],
    ['dikkat', 'Dikkat', ['dikkat', 'dikkat et', 'dikkatli ol', 'uyarı'], 'warning, watch out', 'siren', banner('⚠️', 'DİKKAT!'), 6],
    ['cay', 'Çay', ['çay', 'cay', 'çay koy', 'çay var mı', 'bir çay'], 'tea, tea break', 'pop', rain('🍵', 16), 6],
    ['aciktim', 'Acıktım', ['acıktım', 'aciktim', 'karnım aç', 'açlıktan öldüm'], 'hungry', 'pop', rain('🥙', 16), 6],
    ['uyku', 'Uykum geldi', ['uykum geldi', 'uykum var', 'uyuyacağım', 'yoruldum', 'çok yorgunum'], 'sleepy, tired', 'crickets', card('😴', 'Uykum geldi…', '#2c3e50'), 6],
    ['gol', 'Gol', ['gol', 'gool', 'goool', 'gol oldu'], 'goal, scored', 'airhorn', confetti('⚽', 'GOOOL!'), 6],
    ['hoppa', 'Hoppa', ['hoppa', 'hoppala', 'hop hop', 'hooop'], 'whoa, oops, surprised stumble', 'boing', card('🤸', 'HOPPA', '#e67e22'), 4],
    ['yavas', 'Yavaş', ['yavaş', 'yavas', 'yavaş ol', 'ağır ol', 'sakin sakin'], 'slow down, easy', 'pop', card('🐢', 'Yavaş…', '#16a085'), 4],
    ['bayram', 'Bayram', ['bayram', 'bayramınız kutlu olsun', 'bayramınız mübarek olsun', 'iyi bayramlar'], 'holiday greetings, festive', 'bell', rain('🎊', 20), 8],
    ['uctum', 'Uçtum', ['uçtum', 'uctum', 'uçuyorum', 'havalara uçtum'], 'over the moon, flying high', 'whoosh', rain('🚀', 16), 5],
  ];

  // ---------------------------------------------------------------------------------------------
  // Deutsch – Twitch / TikTok DE
  // ---------------------------------------------------------------------------------------------
  const DE = [
    ['alter', 'Alter Schwede', ['alter schwede', 'alta', 'ey alta', 'alter falter'], 'surprised exclamation, dude', 'boom', card('😮', 'ALTER SCHWEDE', '#111111', '#ffffff', { shake: true }), 5],
    ['digga', 'Diggi', ['diggi', 'digger', 'dicker', 'ey diggi'], 'addressing a buddy, dude', 'pop', card('🧢', 'DIGGI', '#34495e'), 5],
    ['geil', 'Geil', ['geil', 'so geil', 'voll geil', 'geilo', 'abartig'], 'awesome, so cool', 'airhorn', confetti('🤩', 'GEIL!'), 5],
    ['mega', 'Mega', ['mega', 'mega gut', 'hammer', 'der hammer', 'bombe'], 'huge, great, amazing', 'tada', card('💥', 'MEGA!', '#e74c3c', '#ffffff', { shake: true }), 5],
    ['ehrenmann', 'Ehrenmann', ['ehrenmann', 'ehrenfrau', 'ehre', 'ehrenlos', 'ehrenbruder'], 'man of honour, respect for a good deed', 'applause', banner('🎖️', 'EHRENMANN'), 6],
    ['safe', 'Safe', ['safe', 'auf jeden', 'auf jeden fall', 'hundert pro', 'hundert prozent'], 'definitely, for sure', 'ding', card('💯', 'SAFE', '#16a085'), 4],
    ['fremdscham', 'Fremdscham', ['fremdscham', 'fremdschämen', 'cringy', 'oh mann'], 'second-hand embarrassment', 'crickets', card('😬', 'Fremdscham…', '#2c3e50'), 6],
    ['bruder', 'Bruder muss los', ['bruder muss los', 'bruderherz', 'brudi', 'bro muss los'], 'bro has to leave, meme farewell', 'whoosh', card('🏃', 'Bruder muss los', '#34495e'), 6],
    ['habibi', 'Habibi', ['habibi', 'habibti', 'mein habibi', 'yalla'], 'my dear, affectionate address', 'pop', card('🫶', 'HABIBI', '#e67e22'), 5],
    ['isso', 'Isso', ['isso', 'ist so', 'genau so', 'so ist es', 'ganz genau'], 'that is how it is, agreement', 'ding', card('☝️', 'ISSO', '#16a085'), 4],
    ['keinding', 'Kein Ding', ['kein ding', 'kein problem', 'kein thema', 'passt schon', 'alles gut'], 'no problem, no worries', 'pop', card('👌', 'Kein Ding', '#2980b9'), 5],
    ['laeuft', 'Läuft bei dir', ['läuft bei dir', 'läuft bei mir', 'läuft', 'laeuft bei dir'], 'things are going well for you, sarcastic or real praise', 'tada', banner('😎', 'LÄUFT BEI DIR'), 6],
    ['nice', 'Nice', ['nice', 'nice one', 'sehr nice', 'schön', 'sauber'], 'nice, well done', 'ding', card('👍', 'NICE', '#27ae60'), 4],
    ['irre', 'Irre', ['irre', 'wahnsinnig', 'verrückt', 'crazy', 'wild'], 'crazy, unbelievable', 'airhorn', card('🤯', 'IRRE!', '#8e44ad', '#ffffff', { shake: true }), 5],
    ['ohgott', 'Meine Güte', ['meine güte', 'du meine güte', 'ach du liebe zeit', 'ach du schreck', 'ach du schande'], 'shocked exclamation', 'scratch', card('😱', 'MEINE GÜTE', '#c0392b', '#ffffff', { shake: true }), 5],
    ['verdammt', 'Verdammt', ['verdammt', 'verdammt nochmal', 'mensch', 'scheibenkleister', 'so ein mist'], 'damn, frustrated', 'sadTrombone', card('😤', 'VERDAMMT', '#34495e'), 6],
    ['wasgeht', 'Was geht', ['was geht', 'was geht ab', 'was läuft', 'na was geht'], 'what is up, greeting', 'whoosh', card('🤙', 'WAS GEHT?', '#2980b9'), 6],
    ['moin', 'Moin', ['moin', 'moin moin', 'servus', 'hallo zusammen', 'hallo chat', 'na ihr'], 'greeting the chat', 'pop', card('👋', 'MOIN!', '#2980b9'), 8],
    ['tschuess', 'Tschüss', ['tschüss', 'tschau', 'ciao', 'bis morgen', 'gute nacht', 'bis dann'], 'goodbye, ending the stream', 'whoosh', card('🌙', 'Tschüss!', '#2c3e50'), 8],
    ['glueckwunsch', 'Glückwunsch', ['glückwunsch', 'herzlichen glückwunsch', 'gratuliere', 'gratulation'], 'congratulations', 'tada', confetti('🎉', 'GLÜCKWUNSCH!'), 6],
    ['hutab', 'Hut ab', ['hut ab', 'chapeau', 'meinen respekt', 'stark', 'ganz stark'], 'respect, hats off', 'applause', rain('🎩', 16), 6],
    ['weltklasse', 'Weltklasse', ['weltklasse', 'weltklasse leistung', 'erste sahne', 'spitze', 'top'], 'world class performance', 'airhorn', banner('🌍', 'WELTKLASSE'), 6],
    ['kopfhoch', 'Kopf hoch', ['kopf hoch', 'wird schon', 'nicht aufgeben', 'weiter so', 'weitermachen'], 'encouragement, keep going', 'ding', card('💪', 'KOPF HOCH', '#27ae60'), 6],
    ['ruhe', 'Ruhe!', ['ruhe', 'ruhe jetzt', 'stopp', 'stop', 'halt die klappe', 'schluss'], 'demanding silence, stop', 'buzzer', card('🤫', 'RUHE!', '#111111', '#ffffff', { shake: true }), 5],
    ['achtung', 'Achtung', ['achtung', 'vorsicht', 'alarm', 'alarmstufe rot', 'pass auf'], 'warning, alarm', 'buzzer', banner('🚨', 'ACHTUNG', { shake: true }), 5],
    ['feierabend', 'Feierabend', ['feierabend', 'ich hab feierabend', 'wochenende', 'endlich feierabend'], 'end of work, celebration', 'tada', confetti('🍻', 'FEIERABEND!'), 8],
    ['hunger', 'Hunger', ['hunger', 'ich hab hunger', 'döner', 'pizza', 'kebab'], 'hungry, talking about food', 'pop', rain('🍕', 18), 6],
    ['kaffee', 'Kaffee', ['kaffee', 'ich brauch kaffee', 'koffein', 'cappuccino'], 'needs coffee', 'ding', card('☕', 'KAFFEE', '#6d4c41'), 6],
    ['bier', 'Bier', ['bier', 'ein bier', 'prost', 'bierchen', 'zum wohl'], 'beer, cheers', 'pop', rain('🍺', 18), 6],
    ['langweilig', 'Langweilig', ['langweilig', 'gähn', 'schnarch', 'öde'], 'bored, boring', 'crickets', card('🥱', 'langweilig…', '#7f8c8d'), 6],
    ['dankeschoen', 'Dankeschön', ['dankeschön', 'danke', 'vielen dank', 'danke dir', 'danke euch'], 'thank you', 'ding', rain('💖', 16), 6],
    // --- 2.0: +18 ---
    ['keinplan', 'Kein Plan', ['kein plan', 'null ahnung', 'weiß nicht', 'kein schimmer'], 'no idea, clueless', 'crickets', card('🤷', 'KEIN PLAN', '#7f8c8d'), 5],
    ['lost', 'Lost', ['lost', 'voll lost', 'bin lost', 'komplett lost'], 'lost, clueless, out of it', 'slideWhistle', card('🫠', 'LOST', '#34495e'), 5],
    ['junge', 'Junge!', ['junge', 'junge junge', 'junge junge junge', 'ey junge'], 'boy oh boy, surprised', 'boom', card('😳', 'JUNGE.', '#111111'), 5],
    ['wasnlos', 'Was ist los', ['was ist los', 'was los', 'was soll das', 'wie bitte'], 'what is going on, excuse me?', 'scratch', card('🤨', 'WAS LOS?', '#c0392b'), 4],
    ['lecker', 'Lecker', ['lecker', 'mega lecker', 'schmeckt', 'köstlich'], 'tasty, delicious', 'pop', rain('😋', 16), 6],
    ['losgehts', "Los geht's", ["los geht's", 'los gehts', "auf geht's", 'auf gehts', 'und los'], 'here we go, let us start', 'airhorn', confetti('🚀', "LOS GEHT'S!"), 6],
    ['sauer', 'Sauer', ['sauer', 'ich bin sauer', 'bin sauer', 'stinksauer', 'wütend'], 'angry, mad', 'buzzer', card('😤', 'SAUER!', '#c0392b'), 5],
    ['muede', 'Müde', ['müde', 'bin müde', 'so müde', 'ich geh pennen'], 'tired, sleepy', 'crickets', card('😴', 'müde…', '#2c3e50'), 6],
    ['keinbock', 'Kein Bock', ['kein bock', 'null bock', 'null lust', 'kein nerv'], 'cannot be bothered, no motivation', 'sadTrombone', card('😑', 'KEIN BOCK', '#34495e'), 5],
    ['bock', 'Bock', ['bock', 'hab bock', 'voll bock', 'bock drauf'], 'keen, motivated, up for it', 'airhorn', card('🔥', 'BOCK!', '#e67e22'), 5],
    ['uff', 'Uff', ['uff', 'puh', 'phew', 'uff uff'], 'relief, phew', 'whoosh', card('😮‍💨', 'uff…', '#16a085'), 4],
    ['jackpot', 'Jackpot', ['jackpot', 'volltreffer', 'bingo', 'treffer'], 'jackpot, bullseye, bingo', 'tada', confetti('🎰', 'JACKPOT!'), 6],
    ['legende', 'Legende', ['legende', 'legendär', 'du bist eine legende', 'absolute legende'], 'legend, legendary', 'airhorn', banner('🏆', 'LEGENDE'), 6],
    ['ohneworte', 'Ohne Worte', ['ohne worte', 'sprachlos', 'ich bin sprachlos', 'mir fehlen die worte'], 'speechless', 'crickets', card('😶', '…', '#2c3e50'), 5],
    ['glueck', 'Glück gehabt', ['viel glück', 'glück gehabt', 'schwein gehabt', 'daumen drücken'], 'good luck, lucky escape', 'coin', rain('🍀', 18), 6],
    ['party', 'Party', ['party', 'feiern', 'lass feiern', 'partyyy'], 'party, celebrate', 'tada', confetti('🎉', 'PARTY!'), 6],
    ['autsch', 'Autsch', ['autsch', 'aua', 'au weia', 'das tat weh'], 'ouch, that hurt', 'boing', card('🤕', 'AUTSCH', '#c0392b'), 4],
    ['hilfe', 'Hilfe', ['hilfe', 'hilf mir', 'hilfe hilfe', 'sos'], 'help, emergency', 'siren', banner('🆘', 'HILFE!'), 6],
  ];

  // ---------------------------------------------------------------------------------------------
  // English – Twitch / TikTok internet slang
  // ---------------------------------------------------------------------------------------------
  const EN = [
    ['nocap', 'No cap', ['no cap', 'no kizzy', 'for real', 'fr fr', 'deadass'], 'for real, no lie', 'ding', card('🧢', 'NO CAP', '#16a085'), 4],
    ['cap', 'Cap', ['cap', 'that\'s cap', 'thats cap', 'capping'], 'calling out a lie', 'scratch', card('🤥', 'CAP', '#e74c3c'), 5],
    ['sheesh', 'Sheesh', ['sheesh', 'sheeesh', 'sheeeesh', 'shiesh'], 'impressed, sheesh', 'airhorn', card('🥶', 'SHEEESH', '#2980b9', '#ffffff', { shake: true }), 5],
    ['w', 'Big W', ['big w', 'that\'s a w', 'thats a w', 'w in the chat', 'dub', 'massive w'], 'a win, victory', 'tada', confetti('🏆', 'BIG W'), 6],
    ['l', 'Big L', ['big l', 'that\'s an l', 'thats an l', 'l in the chat', 'take the l', 'massive l'], 'a loss, taking the L', 'sadTrombone', card('🇱', 'BIG L', '#c0392b'), 6],
    ['rizz', 'Rizz', ['rizz', 'rizzler', 'unspoken rizz', 'w rizz', 'rizz king'], 'charisma, flirting skill', 'whoosh', card('😏', 'RIZZ', '#8e44ad'), 5],
    ['slay', 'Slay', ['slay', 'slayed', 'slaying', 'queen', 'ate that'], 'did amazing, slay queen', 'tada', confetti('💅', 'SLAY'), 5],
    ['goat', 'GOAT', ['goat', 'the goat', 'goated', 'greatest of all time'], 'greatest of all time', 'airhorn', banner('🐐', 'GOATED'), 6],
    ['based', 'Based', ['based', 'so based', 'based take', 'chad'], 'unapologetically true, based', 'ding', card('🗿', 'BASED', '#111111'), 5],
    ['sus', 'Sus', ['sus', 'sussy', 'suspicious', 'imposter', 'impostor'], 'suspicious, among us', 'scratch', card('🕵️', 'SUS', '#c0392b', '#ffffff', { shake: true }), 5],
    ['bet', 'Bet', ['bet', 'say less', 'aight bet', 'you got it'], 'okay, agreed, deal', 'pop', card('🤝', 'BET', '#16a085'), 4],
    ['facts', 'Facts', ['facts', 'straight facts', 'so true', 'big facts', 'preach'], 'agreement, that is true', 'ding', card('📠', 'FACTS', '#27ae60'), 4],
    ['heat', 'Heat', ['heat', 'banger', 'straight heat', 'heater', 'bangers'], 'a banger, great content', 'airhorn', rain('🔥', 24), 5],
    ['wild', 'Wild', ['wild', 'that\'s wild', 'thats wild', 'crazy', 'unreal', 'unhinged'], 'crazy, unbelievable', 'boom', card('🤯', 'WILD', '#8e44ad', '#ffffff', { shake: true }), 5],
    ['lessgo', 'Lessgo', ['lessgo', 'lesgo', 'lets gooo', 'let\'s gooo', 'lets goooo', 'let\'s goooo'], 'hype, let us go', 'airhorn', confetti('🚀', 'LESSGOOO'), 6],
    ['ohno', 'Oh no', ['oh no', 'oh no no no', 'uh oh', 'oh crap', 'oh shoot'], 'something went wrong', 'sadTrombone', card('😰', 'OH NO', '#c0392b'), 6],
    ['rip', 'RIP', ['rip', 'rest in peace', 'press f', 'f in the chat', 'f in chat', 'pay respects'], 'mourning, RIP, F in the chat', 'sadTrombone', banner('🪦', 'F IN THE CHAT'), 6],
    ['poggers', 'Poggers', ['poggers', 'pog', 'pogchamp', 'pog champ', 'poggies'], 'excited, pog moment', 'airhorn', card('😮', 'POGGERS', '#e67e22', '#ffffff', { shake: true }), 5],
    ['clutch', 'Clutch', ['clutch', 'clutched', 'clutched it', 'so clutch', 'clutch up'], 'saved it at the last second', 'tada', confetti('🎯', 'CLUTCH!'), 6],
    ['ratio', 'Ratio', ['ratio', 'ratioed', 'ratio plus l', 'get ratioed'], 'dunking on someone, ratio', 'buzzer', card('📉', 'RATIO', '#111111'), 5],
    ['vibe', 'Vibe', ['vibe', 'vibes', 'vibing', 'immaculate vibes', 'good vibes'], 'good mood, vibing', 'ding', rain('🌈', 18), 5],
    ['chill', 'Chill', ['chill', 'chill out', 'relax', 'calm down', 'take it easy'], 'calm down, relax', 'pop', card('😌', 'chill…', '#16a085'), 6],
    ['bro', 'Bro', ['bro', 'dude', 'my guy', 'bro what', 'dude what'], 'addressing a buddy, bro', 'boom', card('😐', 'BRO.', '#111111'), 5],
    ['hellochat', 'Hello chat', ['hello chat', 'hi chat', 'hey chat', 'what\'s up chat', 'whats up chat', 'hello everyone'], 'greeting the chat', 'pop', card('👋', 'HELLO CHAT', '#2980b9'), 8],
    ['welcome', 'Welcome', ['welcome', 'welcome in', 'welcome back', 'welcome everybody'], 'welcoming viewers', 'ding', confetti('🎉', 'WELCOME!'), 8],
    ['thankyou', 'Thank you', ['thank you', 'thanks', 'thank you so much', 'appreciate it', 'thanks guys'], 'thank you', 'ding', rain('💖', 16), 6],
    ['goodnight', 'Good night', ['good night', 'goodnight', 'see you tomorrow', 'see you guys', 'bye chat', 'peace out'], 'ending the stream, goodbye', 'whoosh', card('🌙', 'good night', '#2c3e50'), 8],
    ['bruhmoment', 'Bruh moment', ['bruh moment', 'bruh what', 'certified bruh moment', 'bruhh'], 'awkward or dumb moment', 'crickets', card('🫤', 'bruh moment', '#2c3e50'), 6],
    ['imdead', "I'm dead", ['i\'m dead', 'im dead', 'i am dead', 'i\'m deceased', 'im deceased'], 'laughing so hard, I am dead', 'rimshot', rain('💀', 22), 5],
    ['crying', 'Crying', ['crying', 'i\'m crying', 'sobbing', 'in tears', 'not me crying'], 'crying, emotional or laughing', 'rimshot', rain('😭', 22), 5],
    ['screaming', 'Screaming', ['screaming', 'i\'m screaming', 'im screaming', 'screaming crying', 'aaaah'], 'screaming, overwhelmed', 'boom', card('😱', 'SCREAMING', '#e74c3c', '#ffffff', { shake: true }), 5],
    ['yikes', 'Yikes', ['yikes', 'big yikes', 'oof', 'big oof', 'ick', 'the ick'], 'that was bad, yikes', 'crickets', card('😬', 'YIKES', '#2c3e50'), 6],
    // --- 2.0: +18 ---
    ['plottwist', 'Plot twist', ['plot twist', 'plottwist', 'twist', 'what a twist'], 'unexpected turn of events', 'dramatic', card('🌀', 'PLOT TWIST', '#8e44ad'), 6],
    ['nah', 'Nah', ['nah', 'nah bro', 'nah man', 'hell nah'], 'no, refusing', 'nope', card('🙅', 'NAH.', '#111111'), 4],
    ['lowkey', 'Lowkey', ['lowkey', 'low key', 'highkey', 'high key'], 'secretly / openly, lowkey highkey', 'pop', card('🤫', 'lowkey', '#34495e'), 4],
    ['mid', 'Mid', ['mid', 'so mid', 'very mid', "that's mid"], 'mediocre, mid', 'sadTrombone', card('😐', 'MID', '#7f8c8d'), 5],
    ['cooked', 'Cooked', ['cooked', "we're cooked", 'im cooked', "i'm cooked", "it's over"], 'doomed, it is over', 'boom', card('🍳', 'COOKED', '#c0392b'), 5],
    ['lethimcook', 'Let him cook', ['let him cook', 'let her cook', 'let them cook', 'cooking'], 'let them do their thing, it is working', 'drumroll', card('👨‍🍳', 'LET HIM COOK', '#e67e22'), 5],
    ['aura', 'Aura', ['aura', 'aura points', 'plus aura', 'minus aura'], 'aura, coolness points', 'whoosh', rain('✨', 18), 5],
    ['sigma', 'Sigma', ['sigma', 'skibidi', 'skibidi sigma', 'what the sigma'], 'sigma / skibidi brainrot meme', 'boing', card('🗿', 'SIGMA', '#111111'), 5],
    ['delulu', 'Delulu', ['delulu', 'delusional', 'delulu is the solulu', 'solulu'], 'delusional, delulu', 'laugh', card('🦄', 'DELULU', '#e84393'), 5],
    ['iykyk', 'IYKYK', ['iykyk', 'if you know you know', 'if you know', 'ykyk'], 'if you know you know, insider', 'ding', card('🤝', 'IYKYK', '#16a085'), 4],
    ['holymoly', 'Whoa', ['whoa', 'woah', 'whoa whoa', 'woah dude'], 'astonished, whoa', 'ooh', card('😲', 'WHOA', '#2980b9'), 5],
    ['nicetry', 'Nice try', ['nice try', 'good try', 'close one', 'so close'], 'almost, nice try', 'slideWhistle', card('😅', 'NICE TRY', '#7f8c8d'), 5],
    ['goated', 'Goated', ['so goated', 'goated with the sauce', 'top tier'], 'the best, top tier', 'airhorn', banner('🐐', 'GOATED'), 6],
    ['omg', 'OMG', ['omg', 'oh my gosh', 'oh my', 'oh my goodness'], 'oh my god, shocked', 'scratch', card('😱', 'OMG', '#8e44ad', '#ffffff', { shake: true }), 5],
    ['hype', 'Hype', ['hype', 'hyped', 'so hyped', 'hype train'], 'hype, excitement', 'airhorn', confetti('🚂', 'HYPE TRAIN'), 6],
    ['salty', 'Salty', ['salty', 'so salty', 'mad salty', 'butthurt'], 'bitter about losing, salty', 'buzzer', card('🧂', 'SALTY', '#34495e'), 5],
    ['maincharacter', 'Main character', ['main character', 'main character energy', 'protagonist', 'npc'], 'main character energy vs npc', 'tada', banner('🎬', 'MAIN CHARACTER'), 6],
    ['touchgrass', 'Touch grass', ['touch grass', 'go outside', 'grass', 'log off'], 'go outside, touch grass', 'pop', rain('🌱', 16), 6],
  ];

  // ---------------------------------------------------------------------------------------------
  // Familie & Kinder (2.0) – DE / TR / EN mixed, soft sounds only (bell, pop, ding, coin, levelUp, tada, boing, laugh)
  // ---------------------------------------------------------------------------------------------
  const FAMILY = [
    ['gutenacht', 'Gute Nacht', ['gute nacht', 'schlaf gut', 'träum schön', 'iyi uykular', 'sweet dreams'], 'good night, sleep well', 'bell', card('🌙', 'Gute Nacht', '#2c3e50', '#ffffff'), 8],
    ['aferin', 'Aferin', ['aferin', 'aferin sana', 'aferin kızım', 'aferin oğlum', 'well done kiddo'], 'well done (Turkish praise for kids)', 'ding', confetti('👏', 'AFERİN!'), 5],
    ['gutgemacht', 'Gut gemacht', ['prima', 'sehr gut', 'great job', 'çok güzel yaptın', 'well done'], 'great job, well done', 'tada', confetti('🌟', 'GUT GEMACHT!'), 5],
    ['oyunzamani', 'Oyun zamanı', ['oyun zamanı', 'oyun zamani', 'spielzeit', 'playtime', 'play time'], 'playtime', 'levelUp', banner('🧸', 'OYUN ZAMANI'), 6],
    ['bedtime', 'Bedtime', ['bedtime', 'schlafenszeit', 'yatma vakti', 'uyku vakti', 'ab ins bett'], 'bedtime', 'bell', card('🛏️', 'Bedtime', '#34495e'), 8],
    ['essenfertig', 'Essen ist fertig', ['essen ist fertig', 'essen fertig', 'yemek hazır', 'yemek hazir', 'dinner is ready', 'food is ready'], 'dinner is ready', 'pop', rain('🍽️', 14), 8],
    ['zaehneputzen', 'Zähne putzen', ['zähne putzen', 'zaehne putzen', 'diş fırçala', 'dis fircala', 'brush your teeth'], 'brush your teeth', 'pop', card('🪥', 'Zähne putzen!', '#2980b9'), 8],
    ['aufraeumen', 'Aufräumen', ['aufräumen', 'aufraeumen', 'odanı topla', 'clean up', 'tidy up'], 'tidy up, clean the room', 'whoosh', card('🧹', 'Aufräumen!', '#16a085'), 8],
    ['kuscheln', 'Kuscheln', ['kuscheln', 'kuschelzeit', 'sarıl', 'sarılalım', 'cuddle', 'hug'], 'cuddle, hug', 'bell', rain('🤗', 14), 6],
    ['habdichlieb', 'Hab dich lieb', ['ich hab dich lieb', 'hab dich lieb', 'i love you', 'seni çok seviyorum', 'love you'], 'I love you', 'bell', rain('💕', 18), 6],
    ['geburtstag', 'Happy Birthday', ['happy birthday', 'alles gute zum geburtstag', 'doğum günün kutlu olsun', 'dogum gunun kutlu olsun', 'geburtstag', 'iyi ki doğdun'], 'happy birthday', 'tada', confetti('🎂', 'HAPPY BIRTHDAY!'), 10],
    ['kitzeln', 'Kitzeln', ['kitzeln', 'kitzel', 'gıdıklama', 'gidiklama', 'tickle', 'tickle tickle'], 'tickling', 'laugh', rain('😆', 16), 5],
    ['langsam', 'Langsam', ['langsam', 'nicht so schnell', 'yavaş yavaş', 'slowly', 'slow down'], 'slow down, careful', 'pop', card('🐌', 'Langsam…', '#16a085'), 5],
    ['bitte', 'Bitte', ['bitte', 'bitteschön', 'lütfen', 'please', 'bitte bitte'], 'please', 'ding', card('🥺', 'Bitte!', '#7c5cff'), 4],
    ['dankemama', 'Danke Mama / Papa', ['danke mama', 'danke papa', 'teşekkürler anne', 'teşekkürler baba', 'thank you mom', 'thank you dad'], 'thank you mom / dad', 'bell', rain('💐', 14), 6],
    ['mama', 'Mama', ['mama', 'anne', 'anneciğim', 'mom', 'mommy', 'mummy'], 'calling mom', 'bell', card('👩', 'MAMA', '#e84393'), 5],
    ['papa', 'Papa', ['papa', 'baba', 'babacığım', 'dad', 'daddy'], 'calling dad', 'pop', card('👨', 'PAPA', '#2980b9'), 5],
    ['juhu', 'Juhu', ['juhu', 'juhuu', 'yaşasın', 'yasasin', 'yay', 'hooray', 'hurra'], 'yay, hooray', 'tada', confetti('🎉', 'JUHU!'), 5],
    ['hausaufgaben', 'Hausaufgaben', ['hausaufgaben', 'ödev', 'odev', 'homework', 'homework time'], 'homework time', 'drumroll', card('📚', 'Hausaufgaben', '#34495e'), 8],
    ['maerchen', 'Märchen', ['märchen', 'masal', 'story time', 'vorlesen', 'masal zamanı', 'bedtime story'], 'story time, fairy tale', 'bell', card('📖', 'Märchenzeit', '#8e44ad'), 8],
    ['baden', 'Baden', ['baden', 'badezeit', 'banyo', 'banyo vakti', 'bath time', 'bubble bath'], 'bath time', 'pop', rain('🫧', 18), 8],
    ['zuckersuess', 'Zuckersüß', ['zuckersüß', 'zuckersuess', 'çok tatlı', 'cok tatli', 'so sweet', 'adorable'], 'so sweet, adorable', 'bell', rain('🍭', 14), 6],
    ['nochmal', 'Nochmal', ['nochmal', 'noch einmal', 'bir daha', 'bir daha bir daha', 'once more', 'one more time'], 'again, one more time', 'boing', card('🔁', 'NOCHMAL!', '#e67e22'), 4],
    ['ichkanndas', 'Ich kann das', ["ich hab's geschafft", 'ich habs geschafft', 'ich kann das', 'başardım ben', 'i did it', 'i can do it'], 'I did it, I can do it', 'levelUp', confetti('🏅', 'ICH KANN DAS!'), 6],
    ['bussi', 'Bussi', ['bussi', 'küsschen', 'öpücük', 'opucuk', 'kiss kiss', 'muah'], 'kiss, smooch', 'pop', rain('😘', 14), 5],
    ['gutenmorgen', 'Guten Morgen', ['guten morgen', 'günaydın', 'gunaydin', 'good morning', 'morgen zusammen'], 'good morning', 'bell', banner('☀️', 'GUTEN MORGEN'), 8],
    ['ohoh', 'Oh oh', ['oh oh', 'uh-oh', 'eyvah eyvah', 'oopsie', 'hoppla'], 'uh-oh, small mishap', 'boing', card('😬', 'Oh oh…', '#e67e22'), 4],
  ];

  // ---------------------------------------------------------------------------------------------
  // Gaming (2.0) – DE / TR / EN gamer talk
  // ---------------------------------------------------------------------------------------------
  const GAMING = [
    ['headshot', 'Headshot', ['headshot', 'head shot', 'kopfschuss', 'kafadan', 'one tap', 'onetap'], 'headshot, one tap', 'boom', card('🎯', 'HEADSHOT!', '#c0392b', '#ffffff', { shake: true }), 4],
    ['ggwp', 'GG WP', ['ggs', 'gg wp', 'ggwp', 'gg ez', 'well played'], 'good game well played', 'applause', confetti('🤝', 'GG WP'), 6],
    ['ragequit', 'Rage quit', ['rage quit', 'ragequit', 'rage', 'ich rage', 'alt f4'], 'rage quit, angry exit', 'buzzer', card('😡', 'RAGE QUIT', '#c0392b'), 6],
    ['ace', 'Ace', ['ace', 'aced', 'ace round', 'team kill', 'team wipe'], 'ace, whole enemy team eliminated', 'airhorn', confetti('🔥', 'ACE!'), 6],
    ['noob', 'Noob', ['noob', 'newb', 'noobs', 'du bot', 'anfänger'], 'noob, beginner', 'laugh', card('🍼', 'NOOB', '#7f8c8d'), 5],
    ['easy', 'Easy', ['easy', 'easy game', 'ez clap', 'too easy', 'viel zu leicht', 'çok kolay'], 'too easy', 'tada', card('😎', 'EASY', '#16a085'), 5],
    ['respawn', 'Respawn', ['respawn', 'respawned', 'wiederbelebt', 'back in', 'revive'], 'respawn, back in the game', 'levelUp', card('♻️', 'RESPAWN', '#27ae60'), 5],
    ['bossfight', 'Boss fight', ['boss fight', 'bossfight', 'boss kampf', 'final boss', 'endboss'], 'boss fight', 'dramatic', banner('👹', 'BOSS FIGHT'), 8],
    ['lag', 'Lag', ['lag', 'lagging', 'laggt', 'ich lagge', 'mein ping'], 'lag, bad ping', 'scratch', card('🐌', 'LAG…', '#34495e'), 6],
    ['gameover', 'Game over', ['game over', 'gameover', 'wasted', 'you died', 'du bist tot'], 'game over, died', 'sadTrombone', card('💀', 'GAME OVER', '#111111'), 6],
    ['levelup', 'Level up', ['level up', 'levelup', 'aufgestiegen', 'seviye atladım', 'next level'], 'level up', 'levelUp', confetti('⬆️', 'LEVEL UP!'), 5],
    ['loot', 'Loot', ['loot', 'legendary drop', 'epic loot', 'beute', 'rare drop'], 'loot, rare drop', 'coin', rain('💎', 20), 5],
    ['speedrun', 'Speedrun', ['speedrun', 'speed run', 'world record', 'weltrekord', 'rekor'], 'speedrun, world record', 'drumroll', banner('⏱️', 'SPEEDRUN'), 6],
    ['camper', 'Camper', ['camper', 'camping', 'campen', 'camperlord'], 'camper, camping', 'crickets', card('⛺', 'CAMPER', '#7f8c8d'), 6],
    ['nerf', 'Nerf / Buff', ['nerf', 'nerfed', 'buff', 'buffed', 'overpowered'], 'nerf, buff, overpowered', 'boing', card('⚖️', 'NERF!', '#8e44ad'), 5],
    ['crit', 'Critical hit', ['critical hit', 'crit', 'crit damage', 'kritischer treffer', 'krit'], 'critical hit', 'boom', card('💥', 'CRIT!', '#e67e22'), 4],
    ['combo', 'Combo', ['combo', 'kombo', 'combo breaker', 'multikill', 'multi kill'], 'combo, multikill', 'airhorn', banner('🔗', 'COMBO!'), 5],
    ['firstblood', 'First blood', ['first blood', 'firstblood', 'erster kill', 'ilk kan'], 'first blood, first kill', 'dramatic', banner('🩸', 'FIRST BLOOD'), 8],
    ['afk', 'AFK', ['afk', 'bin afk', 'brb', 'kurz weg', 'bin gleich wieder da'], 'away from keyboard', 'pop', card('🚶', 'AFK', '#34495e'), 6],
    ['glhf', 'GL HF', ['glhf', 'gl hf', 'good luck have fun', 'viel spaß', 'iyi oyunlar'], 'good luck have fun', 'ding', card('🍀', 'GL HF', '#27ae60'), 6],
    ['trash', 'Trash', ['trash', 'du bist trash', 'so trash', 'müll', 'çöp'], 'trash, bad play', 'buzzer', card('🗑️', 'TRASH', '#7f8c8d'), 5],
    ['mvp', 'MVP', ['mvp', 'top frag', 'topfrag', 'carry', 'carried', 'hardcarry'], 'mvp, carried the team', 'tada', confetti('🥇', 'MVP!'), 6],
    ['niceshot', 'Nice shot', ['nice shot', 'schöner schuss', 'güzel atış', 'sick shot', 'what a shot'], 'nice shot', 'ding', card('🏹', 'NICE SHOT', '#2980b9'), 4],
    ['hacker', 'Hacker', ['hacker', 'hacks', 'cheater', 'aimbot', 'wallhack'], 'hacker, cheater accusation', 'siren', banner('🚨', 'HACKER?!'), 6],
    ['achievement', 'Achievement', ['achievement', 'achievement unlocked', 'erfolg freigeschaltet', 'trophy', 'trophäe'], 'achievement unlocked', 'levelUp', card('🏆', 'ACHIEVEMENT UNLOCKED', '#f1c40f', '#111111'), 6],
    ['rush', 'Rush', ['rush b', 'rush', 'push', 'push push', 'go go go'], 'rush, push, go go go', 'whoosh', banner('🏃', 'RUSH!'), 5],
    ['victory', 'Victory', ['victory royale', 'victory', 'sieg', 'zafer', 'winner winner', 'chicken dinner'], 'victory, we won', 'airhorn', confetti('🍗', 'VICTORY!'), 8],
  ];

  // ---------------------------------------------------------------------------------------------
  // Story mode (1.3): scene + ambient-loop triggers and character stickers for reading aloud.
  // Scene ids mirror LiveFXSchema.SCENES (schema.js loads after packs.js, so the list is repeated
  // here; test/packs.test.js asserts both agree). `loop` = LiveFXSounds.loops name or null.
  // ---------------------------------------------------------------------------------------------
  const SCENE_INFO = Object.freeze({
    rain: { emoji: '🌧️', label: 'Regen', loop: 'rain' },
    night: { emoji: '🌙', label: 'Nacht', loop: 'nightCrickets' },
    forest: { emoji: '🌲', label: 'Wald', loop: 'birds' },
    sea: { emoji: '🌊', label: 'Meer', loop: 'sea' },
    fire: { emoji: '🔥', label: 'Feuer', loop: 'fireplace' },
    castle: { emoji: '🏰', label: 'Schloss', loop: 'churchBells' },
    snow: { emoji: '❄️', label: 'Schnee', loop: 'wind' },
    desert: { emoji: '🏜️', label: 'Wüste', loop: 'wind' },
    city: { emoji: '🌆', label: 'Stadt', loop: 'cityHum' },
    space: { emoji: '🪐', label: 'Weltraum', loop: 'spaceDrone' },
    sunrise: { emoji: '🌅', label: 'Sonnenaufgang', loop: 'birds' },
    storm: { emoji: '⛈️', label: 'Gewitter', loop: 'storm' },
    clear: { emoji: '🎬', label: 'Szene beenden', loop: null },
  });
  const SCENE_IDS = Object.freeze(Object.keys(SCENE_INFO));
  const loopFor = (sceneId) => (SCENE_INFO[sceneId] && SCENE_INFO[sceneId].loop ? `loop:${SCENE_INFO[sceneId].loop}` : null);

  /** Scene visual: full-screen background + particles, stays until the next scene. */
  const scene = (id, text, intensity, extra) =>
    Object.assign({ kind: 'scene', position: 'center', scene: id, intensity: intensity || 2 }, text ? { text } : {}, extra || {});
  /** Sticker visual: 2–4 emojis in formation at the top, over the running scene. */
  const sticker = (emoji, text, extra) => Object.assign({ kind: 'sticker', position: 'top', emoji, text }, extra || {});
  const SCENE_CD = 8;
  const STICKER_CD = 6;

  /** Scene row: [id, label, keywords, hint, sceneId, caption?, intensity?, sound override?]. */
  const sceneRow = (r) => [r[0], r[1], r[2], r[3], r[7] === undefined ? loopFor(r[4]) : r[7], scene(r[4], r[5], r[6]), SCENE_CD];
  /** Sticker row: [id, label, keywords, hint, sound, emoji, text]. */
  const stickerRow = (r) => [r[0], r[1], r[2], r[3], r[4], sticker(r[5], r[6]), STICKER_CD];

  // Deutsch – Märchen / Vorlesen
  const STORY_DE = [
    ...[
      ['eswareinmal', 'Es war einmal', ['es war einmal', 'es war ein mal', 'vor langer zeit', 'es lebte einmal'], 'story opening, once upon a time', 'sunrise', 'Es war einmal…', 1],
      ['regen', 'Regen', ['es regnete', 'regen', 'es regnet', 'im regen', 'regnete', 'regentropfen', 'in strömen'], 'it is raining in the story', 'rain', 'Es regnete…', 2],
      ['nacht', 'Nacht', ['in der nacht', 'nachts', 'dunkel', 'dunkelheit', 'mitternacht', 'nacht brach herein', 'nacht', 'der mond'], 'night falls, darkness', 'night', null, 2],
      ['wald', 'Wald', ['im wald', 'wald', 'der wald', 'dunklen wald', 'bäume', 'baeume', 'durch den wald', 'tiefen wald'], 'in the forest, trees', 'forest', null, 2],
      ['meer', 'Meer', ['am meer', 'das meer', 'meer', 'ozean', 'wellen', 'am strand', 'strand'], 'at the sea, ocean, beach', 'sea', null, 2],
      ['feuer', 'Feuer', ['am feuer', 'lagerfeuer', 'kamin', 'am kamin', 'feuer brannte', 'flammen', 'knisterte'], 'by the fire, fireplace, campfire', 'fire', null, 2],
      ['schloss', 'Schloss', ['schloss', 'im schloss', 'könig', 'der könig', 'königin', 'burg', 'die burg', 'koenig'], 'castle, king, queen', 'castle', null, 2],
      ['schnee', 'Schnee', ['schnee', 'es schneite', 'winter', 'im winter', 'schneeflocken', 'eis und schnee', 'verschneit'], 'snow, winter', 'snow', null, 2],
      ['wueste', 'Wüste', ['wüste', 'wueste', 'in der wüste', 'sand', 'sanddünen', 'oase'], 'desert, sand, heat', 'desert', null, 2],
      ['stadt', 'Stadt', ['stadt', 'in der stadt', 'die stadt', 'großstadt', 'grossstadt', 'straßen', 'die straßen der stadt'], 'in the city, streets', 'city', null, 2],
      ['sterne', 'Sterne', ['sterne', 'die sterne', 'weltraum', 'weltall', 'im weltall', 'rakete', 'planeten', 'galaxie'], 'stars, outer space', 'space', null, 2],
      ['morgen', 'Morgen', ['am morgen', 'sonnenaufgang', 'morgen', 'am nächsten morgen', 'die sonne ging auf', 'die sonne schien', 'morgens'], 'morning, sunrise, a new day', 'sunrise', null, 2],
      ['gewitter', 'Gewitter', ['gewitter', 'donner', 'blitz', 'es donnerte', 'sturm', 'blitz und donner', 'unwetter'], 'storm, thunder, lightning', 'storm', null, 3],
      // 2.3: no bare 'ende' – "am Ende des Tages", "am Ende kam …" must not clear the scene mid-story
      ['ende', 'Ende', ['das ende', 'ende der geschichte', 'und wenn sie nicht gestorben sind', 'so leben sie noch'], 'the end of the story', 'clear', 'ENDE', 1, 'tada'],
    ].map(sceneRow),
    ...[
      ['drache', 'Drache', ['drache', 'der drache', 'ein drache', 'drachen', 'feuerspeiend'], 'a dragon appears', 'dramatic', '🐉🔥', 'Der Drache!'],
      ['prinzessin', 'Prinzessin', ['prinzessin', 'die prinzessin', 'prinz', 'der prinz'], 'princess or prince', 'bell', '👸✨', 'Die Prinzessin'],
      ['ritter', 'Ritter', ['ritter', 'der ritter', 'schwert', 'rüstung', 'ruestung'], 'knight, sword, armour', 'whoosh', '🛡️⚔️', 'Der Ritter'],
      ['schatz', 'Schatz', ['schatz', 'der schatz', 'goldschatz', 'schatztruhe', 'edelsteine'], 'treasure, gold, jewels', 'coin', '💎💰', 'Der Schatz!'],
      ['hexe', 'Hexe', ['hexe', 'die hexe', 'zauberer', 'der zauberer', 'böse hexe'], 'witch or wizard', 'laugh', '🧙🔮', 'Die Hexe'],
      ['zauber', 'Zauber', ['zauber', 'zauberspruch', 'magie', 'verzaubert', 'zauberstab'], 'magic, a spell', 'tada', '✨🪄✨', 'Zauber!'],
      ['herz', 'Verliebt', ['verliebt', 'verliebte sich', 'ein herz', 'herzen', 'küsste'], 'falling in love, a kiss', 'bell', '💖💕', 'Verliebt'],
      ['schiff', 'Schiff', ['schiff', 'das schiff', 'segelschiff', 'boot', 'das boot'], 'a ship or boat', 'whoosh', '⛵🌊', 'Das Schiff'],
      ['pferd', 'Pferd', ['pferd', 'das pferd', 'pferde', 'ritt', 'galoppierte'], 'a horse, riding', 'pop', '🐎💨', 'Das Pferd'],
      ['hund', 'Hund', ['hund', 'der hund', 'hunde', 'welpe', 'bellte'], 'a dog', 'pop', '🐕🐾', 'Der Hund'],
      ['katze', 'Katze', ['katze', 'die katze', 'kätzchen', 'kater', 'miaute'], 'a cat', 'pop', '🐱🐾', 'Die Katze'],
      ['wolf', 'Wolf', ['wolf', 'der wolf', 'der böse wolf', 'wölfe'], 'a wolf, danger', 'dramatic', '🐺🌑', 'Der Wolf!'],
      ['fee', 'Fee', ['fee', 'die fee', 'elfe', 'die gute fee'], 'a fairy or elf', 'bell', '🧚✨', 'Die Fee'],
      ['riese', 'Riese', ['riese', 'der riese', 'troll', 'oger'], 'a giant, troll or ogre', 'boom', '🧌🪨', 'Der Riese'],
    ].map(stickerRow),
  ];

  // Türkçe – masal
  const STORY_TR = [
    ...[
      ['birvarmis', 'Bir varmış bir yokmuş', ['bir varmış bir yokmuş', 'bir varmis bir yokmus', 'bir varmış', 'masal başlıyor'], 'Turkish story opening, once upon a time', 'sunrise', 'Bir varmış, bir yokmuş…', 1],
      ['yagmur', 'Yağmur', ['yağmur yağıyordu', 'yagmur yagiyordu', 'yağmur', 'yagmur', 'yağmur yağdı', 'yağmurlu', 'sağanak'], 'it is raining in the story', 'rain', 'Yağmur yağıyordu…', 2],
      ['gece', 'Gece', ['gece', 'geceydi', 'gece oldu', 'karanlık', 'karanlik', 'gece yarısı', 'ay ışığı'], 'night falls, darkness', 'night', null, 2],
      ['orman', 'Orman', ['ormanda', 'orman', 'ormanın derinliklerinde', 'ağaçlar', 'agaclar', 'ormana'], 'in the forest, trees', 'forest', null, 2],
      ['deniz', 'Deniz', ['deniz', 'denizde', 'dalgalar', 'okyanus', 'deniz kenarında', 'sahilde', 'kumsal'], 'at the sea, ocean, beach', 'sea', null, 2],
      ['ates', 'Ateş başı', ['ateşin başında', 'atesin basinda', 'kamp ateşi', 'şömine', 'somine', 'ateş yaktı', 'alevler'], 'by the fire, fireplace, campfire', 'fire', null, 2],
      ['saray', 'Saray', ['sarayda', 'saray', 'kralın sarayı', 'kralin sarayi', 'padişah', 'padisah', 'kale', 'sultan'], 'palace, castle, sultan', 'castle', null, 2],
      ['kar', 'Kar', ['kar yağıyordu', 'kar yagiyordu', 'kar', 'kış', 'kis', 'kar taneleri', 'buz gibi'], 'snow, winter', 'snow', null, 2],
      ['col', 'Çöl', ['çöl', 'col', 'çölde', 'colde', 'kum', 'kumlar', 'deve'], 'desert, sand, heat', 'desert', null, 2],
      ['sehir', 'Şehir', ['şehir', 'sehir', 'şehirde', 'sehirde', 'büyük şehir', 'sokaklar', 'kasaba'], 'in the city, streets', 'city', null, 2],
      ['yildizlar', 'Yıldızlar', ['yıldızlar', 'yildizlar', 'uzay', 'uzayda', 'gökyüzü', 'gokyuzu', 'gezegen', 'roket'], 'stars, outer space', 'space', null, 2],
      ['sabah', 'Sabah', ['sabah', 'sabah oldu', 'güneş doğdu', 'gunes dogdu', 'sabahleyin', 'gün doğdu', 'şafak'], 'morning, sunrise, a new day', 'sunrise', null, 2],
      ['firtina', 'Fırtına', ['fırtına', 'firtina', 'gök gürledi', 'gok gurledi', 'şimşek', 'simsek', 'yıldırım', 'fırtına çıktı'], 'storm, thunder, lightning', 'storm', null, 3],
      // 2.3: no bare 'son' – "en son", "son dakika", "son olarak" are everyday Turkish (the director has the same rule)
      ['son', 'Son', ['masal bitti', 'masalın sonu', 'masalin sonu', 'hikayenin sonu', 'hikaye bitti', 'masal sona erdi', 'ermiş muradına', 'gökten üç elma düştü'], 'the end of the story', 'clear', 'SON', 1, 'tada'],
    ].map(sceneRow),
    ...[
      ['ejderha', 'Ejderha', ['ejderha', 'ejderhalar', 'ejder', 'dev ejderha'], 'a dragon appears', 'dramatic', '🐉🔥', 'Ejderha!'],
      ['prenses', 'Prenses', ['prenses', 'prens', 'prensesi', 'güzel prenses'], 'princess or prince', 'bell', '👸✨', 'Prenses'],
      ['sovalye', 'Şövalye', ['şövalye', 'sovalye', 'kılıç', 'kilic', 'zırh', 'şövalyeler'], 'knight, sword, armour', 'whoosh', '🛡️⚔️', 'Şövalye'],
      ['hazine', 'Hazine', ['hazine', 'hazineyi', 'altınlar', 'altinlar', 'mücevher', 'hazine sandığı'], 'treasure, gold, jewels', 'coin', '💎💰', 'Hazine!'],
      ['cadi', 'Cadı', ['cadı', 'cadi', 'kötü cadı', 'büyücü', 'buyucu', 'cadılar'], 'witch or wizard', 'laugh', '🧙🔮', 'Cadı'],
      ['buyu', 'Büyü', ['büyü', 'buyu', 'sihir', 'sihirli', 'büyülü', 'büyü yaptı'], 'magic, a spell', 'tada', '✨🪄✨', 'Büyü!'],
      ['gokkusagi', 'Gökkuşağı', ['gökkuşağı', 'gokkusagi', 'gökkuşağı çıktı', 'rengarenk'], 'a rainbow appears', 'bell', '🌈✨', 'Gökkuşağı'],
      ['asik', 'Âşık', ['aşık oldu', 'asik oldu', 'aşık', 'sevdalandı', 'öptü'], 'falling in love, a kiss', 'bell', '💖💕', 'Âşık oldu'],
      ['gemi', 'Gemi', ['gemi', 'gemiye', 'yelkenli', 'kayık', 'kayik', 'tekne'], 'a ship or boat', 'whoosh', '⛵🌊', 'Gemi'],
      ['at', 'At', ['atına', 'atina', 'atıyla', 'beyaz at', 'atlar', 'at sırtında'], 'a horse, riding', 'pop', '🐎💨', 'At'],
      ['kurt', 'Kurt', ['kurt', 'kurtlar', 'kötü kurt', 'kurdu'], 'a wolf, danger', 'dramatic', '🐺🌑', 'Kurt!'],
      ['kus', 'Kuş', ['kuş', 'kus', 'kuşlar', 'kuslar', 'serçe'], 'a bird', 'pop', '🐦🪶', 'Kuş'],
      ['dev', 'Dev', ['dev', 'devler', 'dev geldi', 'koca dev'], 'a giant, troll or ogre', 'boom', '🧌🪨', 'Dev'],
      ['peri', 'Peri', ['peri', 'peri kızı', 'periler', 'iyi peri'], 'a fairy', 'bell', '🧚✨', 'Peri'],
      ['kedi', 'Kedi', ['kedi', 'kediler', 'kedicik', 'miyav'], 'a cat', 'pop', '🐱🐾', 'Kedi'],
      ['kopek', 'Köpek', ['köpek', 'kopek', 'köpekler', 'hav hav'], 'a dog', 'pop', '🐕🐾', 'Köpek'],
    ].map(stickerRow),
  ];

  // English – fairy tales / reading aloud
  const STORY_EN = [
    ...[
      ['onceupon', 'Once upon a time', ['once upon a time', 'once upon', 'long ago', 'long long ago'], 'story opening, once upon a time', 'sunrise', 'Once upon a time…', 1],
      ['rain', 'Rain', ['it was raining', 'it rained', 'rain', 'raining', 'the rain', 'rainy', 'pouring rain'], 'it is raining in the story', 'rain', 'It was raining…', 2],
      ['night', 'Night', ['at night', 'that night', 'night', 'dark', 'darkness', 'midnight', 'pitch black', 'the moon'], 'night falls, darkness', 'night', null, 2],
      ['forest', 'Forest', ['in the forest', 'forest', 'the woods', 'dark forest', 'into the woods', 'trees', 'the forest'], 'in the forest, trees', 'forest', null, 2],
      ['sea', 'Sea', ['the sea', 'at sea', 'ocean', 'the ocean', 'waves', 'the beach', 'the shore', 'on the beach'], 'at the sea, ocean, beach', 'sea', null, 2],
      ['fire', 'Fireplace', ['by the fire', 'campfire', 'fireplace', 'the fire crackled', 'flames', 'bonfire'], 'by the fire, fireplace, campfire', 'fire', null, 2],
      ['castle', 'Castle', ['castle', 'the castle', 'the king', 'king', 'kingdom', 'the palace', 'palace', 'tower'], 'castle, king, kingdom', 'castle', null, 2],
      ['snow', 'Snow', ['snow', 'it snowed', 'snowing', 'winter', 'snowflakes', 'the snow', 'frozen'], 'snow, winter', 'snow', null, 2],
      ['desert', 'Desert', ['desert', 'the desert', 'sand', 'dunes', 'sand dunes', 'oasis'], 'desert, sand, heat', 'desert', null, 2],
      ['city', 'City', ['the city', 'city', 'big city', 'streets', 'downtown', 'the town', 'town'], 'in the city, streets', 'city', null, 2],
      ['space', 'Space', ['stars', 'the stars', 'outer space', 'space', 'galaxy', 'rocket', 'planet', 'planets'], 'stars, outer space', 'space', null, 2],
      ['morning', 'Morning', ['in the morning', 'sunrise', 'morning', 'the sun rose', 'next morning', 'dawn', 'at dawn'], 'morning, sunrise, a new day', 'sunrise', null, 2],
      ['storm', 'Storm', ['storm', 'thunder', 'lightning', 'thunderstorm', 'the storm', 'thunder and lightning'], 'storm, thunder, lightning', 'storm', null, 3],
      ['theend', 'The end', ['the end', 'lived happily', 'and they lived happily', 'end of story'], 'the end of the story', 'clear', 'THE END', 1, 'tada'],
    ].map(sceneRow),
    ...[
      ['dragon', 'Dragon', ['dragon', 'the dragon', 'dragons', 'a dragon'], 'a dragon appears', 'dramatic', '🐉🔥', 'The dragon!'],
      ['princess', 'Princess', ['princess', 'the princess', 'prince', 'the prince'], 'princess or prince', 'bell', '👸✨', 'The princess'],
      ['knight', 'Knight', ['knight', 'the knight', 'sword', 'armor', 'armour', 'knights'], 'knight, sword, armour', 'whoosh', '🛡️⚔️', 'The knight'],
      ['treasure', 'Treasure', ['treasure', 'the treasure', 'gold coins', 'jewels', 'treasure chest', 'gems'], 'treasure, gold, jewels', 'coin', '💎💰', 'Treasure!'],
      ['witch', 'Witch', ['witch', 'the witch', 'wizard', 'the wizard', 'sorcerer', 'wicked witch'], 'witch or wizard', 'laugh', '🧙🔮', 'The witch'],
      ['magic', 'Magic', ['magic', 'magic spell', 'spell', 'magical', 'enchanted', 'wand'], 'magic, a spell', 'tada', '✨🪄✨', 'Magic!'],
      ['heart', 'In love', ['fell in love', 'in love', 'kissed', 'true love', 'a kiss'], 'falling in love, a kiss', 'bell', '💖💕', 'In love'],
      ['ship', 'Ship', ['ship', 'the ship', 'sailboat', 'boat', 'the boat', 'sailing'], 'a ship or boat', 'whoosh', '⛵🌊', 'The ship'],
      ['horse', 'Horse', ['horse', 'the horse', 'horses', 'galloped', 'pony'], 'a horse, riding', 'pop', '🐎💨', 'The horse'],
      ['wolf', 'Wolf', ['wolf', 'the wolf', 'big bad wolf', 'wolves'], 'a wolf, danger', 'dramatic', '🐺🌑', 'The wolf!'],
      ['fairy', 'Fairy', ['fairy', 'the fairy', 'fairies', 'fairy godmother', 'elf'], 'a fairy or elf', 'bell', '🧚✨', 'The fairy'],
      ['giant', 'Giant', ['giant', 'the giant', 'troll', 'ogre', 'the troll'], 'a giant, troll or ogre', 'boom', '🧌🪨', 'The giant'],
      ['dog', 'Dog', ['dog', 'the dog', 'puppy', 'dogs', 'barked'], 'a dog', 'pop', '🐕🐾', 'The dog'],
      ['cat', 'Cat', ['cat', 'the cat', 'kitten', 'kitty', 'meow'], 'a cat', 'pop', '🐱🐾', 'The cat'],
      ['rainbow', 'Rainbow', ['rainbow', 'a rainbow', 'the rainbow', 'rainbows'], 'a rainbow appears', 'bell', '🌈✨', 'Rainbow'],
    ].map(stickerRow),
  ];

  // ---------------------------------------------------------------------------------------------
  // 2.1 – own text stickers (our copyright, no files): big comic words, schema text style `sticker`
  // (bold outline + burst background in two colours). Keywords are the spoken phrase variants. They may
  // overlap with the same-language meme pack (tr / de / en) – load one style or the other – but never with
  // the defaults, the reactions pack or another text pack (test/packs.test.js).
  // ---------------------------------------------------------------------------------------------
  const PAL = [
    ['#ffd166', '#ef476f'],
    ['#06d6a0', '#118ab2'],
    ['#ff9f1c', '#2ec4b6'],
    ['#fee440', '#7209b7'],
    ['#ffffff', '#ff006e'],
    ['#caffbf', '#3a86ff'],
    ['#ffbe0b', '#fb5607'],
    ['#9bf6ff', '#f72585'],
  ];
  const TEXT_CD = 5;
  const sticky = (text, i) => ({ kind: 'text', position: 'center', style: 'sticker', text, color: PAL[i % PAL.length][0], color2: PAL[i % PAL.length][1] });
  /** Text sticker row: [id, TEXT, keywords, hint, sound] → row() input. */
  const textRows = (rows) => rows.map((r, i) => [r[0], r[1], r[2], r[3], r[4], sticky(r[1], i), TEXT_CD]);

  const TEXT_TR = textRows([
    ['oha', 'OHA', ['oha be ya', 'ohaa be', 'oha oha'], 'shocked or amazed, whoa', 'boom'],
    ['yokartik', 'YOK ARTIK', ['yok artık ya', 'yok artık be', 'yok artik ya'], 'cannot believe it, no way', 'airhorn'],
    ['aynen', 'AYNEN', ['aynen ya', 'aynen be', 'aynen öyle ya'], 'exactly, strong agreement', 'ding'],
    ['eyvah', 'EYVAH', ['eyvah be', 'eyvahlar olsun', 'eyvah ki ne eyvah'], 'uh-oh, something went wrong', 'slideWhistle'],
    ['helal', 'HELAL', ['helal be sana', 'helal olsun be', 'helal ya'], 'well done, respect', 'applause'],
    ['efsane', 'EFSANE', ['efsane be', 'efsane bir an', 'efsanevi'], 'legendary moment', 'fanfare'],
    ['bravo', 'BRAVO', ['bravo sana', 'bravo be', 'bravooo'], 'bravo, applause', 'applause'],
    ['cokiyi', 'ÇOK İYİ', ['çok iyi ya', 'çok iyi be', 'cok iyi ya'], 'very good', 'tada'],
    ['sakami', 'ŞAKA MI', ['şaka mı bu', 'şaka mısın', 'saka mi bu'], 'is this a joke? disbelief', 'ooh'],
    ['hadibe', 'HADİ BE', ['hadi be oradan', 'hadi be sen de', 'hadi be ya'], 'come on, get out of here (playful disbelief)', 'scratch'],
    ['olurmu', 'OLUR MU ÖYLE', ['olur mu öyle', 'olur mu oyle', 'öyle olur mu'], 'that is not fair, how can that be', 'buzzer'],
    ['super', 'SÜPER', ['süper ya', 'süper be', 'super ya'], 'super, great', 'tada'],
    ['harika', 'HARİKA', ['harika ya', 'harika be', 'harikulade'], 'wonderful', 'sparkle'],
    ['vay', 'VAY BE', ['vay be ya', 'vay vay vay', 'vay be abi'], 'wow, impressed', 'ooh'],
    ['kral', 'KRAL', ['kral be', 'kral misin', 'kralsın be'], 'you are the king', 'fanfare'],
    ['oley', 'OLEY', ['oley', 'oleyy', 'oley be'], 'yay, hooray', 'tada'],
    ['yasasin', 'YAŞASIN', ['yaşasın be', 'yaşasın ya', 'yasasin be'], 'hooray, long live', 'levelUp'],
    ['tamamdir', 'TAMAMDIR', ['tamamdır be', 'tamamdır abi', 'tamamdir abi'], 'done, all good', 'ding'],
    ['devam', 'DEVAM', ['devam devam', 'devam et', 'devam ediyoruz'], 'keep going', 'whoosh'],
    ['aferin', 'AFERİN', ['aferin be', 'aferin size', 'aferin ya'], 'well done (praise)', 'ding'],
    ['mukemmel', 'MÜKEMMEL', ['mükemmel ya', 'mükemmel be', 'mukemmel ya'], 'perfect', 'fanfare'],
    ['haydi', 'HAYDİ', ['haydi be', 'haydi haydi', 'haydin'], 'let us go, come on', 'drumroll'],
    ['cokguzel', 'ÇOK GÜZEL', ['çok güzel ya', 'çok güzel be', 'cok guzel ya'], 'very beautiful, very nice', 'bell'],
    ['nediyorsun', 'NE DİYORSUN', ['ne diyorsun ya', 'ne diyorsun sen', 'ne diyon'], 'what are you saying? surprise', 'scratch'],
    ['bombagibi', 'BOMBA GİBİ', ['bomba gibi ya', 'bomba gibi be', 'bomba gibiydi'], 'awesome, explosive', 'boom'],
    ['ahbe', 'AH BE', ['ah be ya', 'ah be abi', 'ah ah ah'], 'sigh, so close', 'sadTrombone'],
    ['uff', 'UFF', ['uff be', 'uff ya', 'uffff'], 'ugh, phew', 'whoosh'],
    ['guldum', 'GÜLDÜM', ['güldüm ya', 'çok güldüm ya', 'guldum ya'], 'that was funny', 'laugh'],
  ]);

  const TEXT_DE = textRows([
    ['krass', 'KRASS', ['voll krass', 'krass alter', 'richtig krass'], 'wow, intense', 'boom'],
    ['laeuft', 'LÄUFT', ['läuft', 'läuft bei mir', 'läuft bei uns', 'laeuft'], 'it is going great', 'levelUp'],
    ['ehrenmann', 'EHRENMANN', ['echter ehrenmann', 'ehrenmann digga', 'ehrenmann alter'], 'man of honour, respect', 'fanfare'],
    ['ehrenfrau', 'EHRENFRAU', ['echte ehrenfrau', 'ehrenfrau digga', 'ehrenfrau alter'], 'woman of honour, respect', 'fanfare'],
    ['digga', 'DIGGA', ['ey digga', 'digga digga', 'digga was'], 'dude! surprised exclamation', 'pop'],
    ['nice', 'NICE', ['nice', 'sehr nice', 'richtig nice'], 'nice, cool', 'ding'],
    ['omg', 'OMG', ['o m g', 'ach du meine güte', 'omg digga'], 'oh my gosh', 'ooh'],
    ['safe', 'SAFE', ['safe safe', 'ganz safe', 'safe alter'], 'definitely, for sure', 'ding'],
    ['mega', 'MEGA', ['einfach mega', 'mega mega', 'voll mega'], 'great, amazing', 'tada'],
    ['keinplan', 'KEIN PLAN', ['null plan', 'keine ahnung digga', 'hab keinen plan'], 'no idea', 'crickets'],
    ['stark', 'STARK', ['stark', 'richtig stark', 'starke leistung'], 'strong, impressive', 'applause'],
    ['jawoll', 'JAWOLL', ['jawoll', 'aber jawoll', 'jawollo'], 'yes! hell yeah', 'airhorn'],
    ['hammer', 'HAMMER', ['absoluter hammer', 'hammer hart', 'echt hammer'], 'awesome, amazing', 'boom'],
    ['spitze', 'SPITZE', ['spitze', 'spitzenklasse', 'absolute spitze'], 'top, excellent', 'tada'],
    ['ernst', 'NICHT DEIN ERNST', ['nicht dein ernst', 'ist das dein ernst', 'im ernst jetzt'], 'you cannot be serious', 'scratch'],
    ['wild', 'WILD', ['voll wild', 'wie wild', 'ganz schön wild'], 'crazy, wild', 'whoosh'],
    ['legende', 'LEGENDE', ['legende', 'du legende', 'legendär'], 'legend', 'fanfare'],
    ['goenndir', 'GÖNN DIR', ['gönn dir', 'goenn dir', 'gönn dir digga'], 'treat yourself, go for it', 'cash'],
    ['zugut', 'ZU GUT', ['zu gut', 'viel zu gut', 'einfach zu gut'], 'too good', 'sparkle'],
    ['keinstress', 'KEIN STRESS', ['kein stress', 'alles chillig', 'ganz entspannt'], 'no stress, relax', 'bell'],
    ['heftig', 'HEFTIG', ['heftig', 'voll heftig', 'richtig heftig'], 'intense, heavy', 'boom'],
    ['endlich', 'ENDLICH', ['endlich', 'na endlich', 'endlich geschafft'], 'finally', 'levelUp'],
    ['weiterso', 'WEITER SO', ['weiter so', 'mach weiter', 'immer weiter'], 'keep it up', 'applause'],
    ['sogut', 'SO GUT', ['so gut', 'sooo gut', 'mega gut gemacht'], 'so good', 'tada'],
    ['hallo', 'HALLO?!', ['hallo hallo', 'hallooo', 'hallo geht es noch'], 'hello?! are you serious', 'scratch'],
    ['oha', 'OHA', ['oha alter', 'oha digga', 'na oha'], 'whoa (German oha)', 'ooh'],
    ['bestesleben', 'BESTES LEBEN', ['bestes leben', 'bester tag', 'lebe dein bestes leben'], 'best life, great vibe', 'sparkle'],
  ]);

  const TEXT_EN = textRows([
    ['gg', 'GG', ['gg everyone', 'gg guys', 'good game all'], 'good game', 'fanfare'],
    ['w', 'W', ['w', 'huge w', 'w moment'], 'a win', 'tada'],
    ['l', 'L', ['l', 'huge l', 'take the l'], 'a loss', 'sadTrombone'],
    ['letsgo', "LET'S GO", ["let's gooo", 'lets gooo', 'lesgooo'], 'hype, let us go', 'airhorn'],
    ['noway', 'NO WAY', ['no way bro', 'no freaking way', 'nah no way'], 'disbelief', 'scratch'],
    ['sheesh', 'SHEESH', ['sheesh bro', 'sheeesh bro', 'sheesh man'], 'impressed', 'ooh'],
    ['clutch', 'CLUTCH', ['clutch', 'clutched', 'clutch play'], 'clutch play, saved it', 'airhorn'],
    ['slay', 'SLAY', ['slayyy', 'slay queen', 'slayed it'], 'killed it (in a good way), looking great', 'sparkle'],
    ['bruh', 'BRUH', ['bruhhh', 'bro what', 'bruh bruh'], 'bruh, really?', 'boing'],
    ['omg', 'OMG', ['oh my gosh', 'omg omg', 'omggg'], 'oh my gosh', 'ooh'],
    ['hype', 'HYPE', ['hype train', 'so hyped', 'hyped'], 'hype', 'drumroll'],
    ['pog', 'POG', ['pog', 'pogchamp', 'pog moment'], 'amazing play, pog', 'tada'],
    ['epic', 'EPIC', ['epic', 'so epic', 'epic moment'], 'epic', 'fanfare'],
    ['goat', 'GOAT', ['the goat', 'goated', 'goat status'], 'greatest of all time', 'fanfare'],
    ['facts', 'FACTS', ['facts', 'straight facts', 'facts bro'], 'agreement, true', 'ding'],
    ['vibes', 'VIBES', ['vibes', 'good vibes', 'vibing'], 'good vibes', 'bell'],
    ['yikes', 'YIKES', ['yikes', 'big yikes', 'yikes bro'], 'awkward, uh-oh', 'crickets'],
    ['oof', 'OOF', ['oof', 'big oof', 'ooof'], 'ouch, that hurt (mild)', 'boing'],
    ['niceone', 'NICE ONE', ['nice one bro', 'nicely done', 'nice one mate'], 'well done', 'applause'],
    ['legend', 'LEGEND', ['legend', 'absolute legend', 'legendary'], 'legend', 'fanfare'],
    ['what', 'WHAT?!', ['what', 'whaaat', 'what the heck'], 'surprise, what?!', 'scratch'],
    ['loveit', 'LOVE IT', ['love it', 'loving it', 'i love this'], 'love it', 'bell'],
    ['toogood', 'TOO GOOD', ['too good', 'way too good', 'so good bro'], 'too good', 'sparkle'],
    ['bigbrain', 'BIG BRAIN', ['big brain', 'galaxy brain', 'big brain play'], 'clever play', 'levelUp'],
    ['maincharacter', 'MAIN CHARACTER', ['main character', 'main character energy', 'mc energy'], 'main character energy', 'fanfare'],
    ['bet', 'BET', ['bet', 'bet bet', 'say less'], 'okay, deal', 'pop'],
    ['vibecheck', 'VIBE CHECK', ['vibe check', 'vibe check passed', 'passed the vibe check'], 'vibe check', 'drumroll'],
  ]);

  // ---------------------------------------------------------------------------------------------
  // 2.1 – 🎞️ Reaktionen: bundled animated stickers (Microsoft Fluent Emoji, MIT – memes/fluent/, built by
  // scripts/build-memes.js). `emoji` is the fallback the renderer shows when the image source is rejected.
  // Keywords (DE / TR / EN) never collide with any other pack or the defaults, so it combines with all.
  // ---------------------------------------------------------------------------------------------
  const img = (file, emoji, extra) => Object.assign({ kind: 'image', position: 'center', src: `memes/fluent/${file}.webp`, emoji }, extra || {});
  /** Reaction row: [id, label, keywords, hint, sound, file, emoji] → row() input. */
  const reactionRows = (rows) => rows.map((r, i) => [r[0], r[1], r[2], r[3], r[4], img(r[5], r[6], i % 3 === 0 ? { tilt: true } : null), 4]);
  const REACTIONS = reactionRows([
    ['joy', 'Tränen gelacht', ['tränen gelacht', 'katıla katıla', 'crying laughing', 'cry laughing'], 'laughing to tears', 'laugh', 'joy', '😂'],
    ['rofl', 'Am Boden vor Lachen', ['am boden vor lachen', 'yerlere yattım', 'rolling on the floor'], 'rolling on the floor laughing', 'rimshot', 'rofl', '🤣'],
    ['giggle', 'Kichern', ['kicher kicher', 'kıkır kıkır', 'tee hee'], 'giggling', 'kidlaugh', 'giggle', '🤭'],
    ['scream', 'Schrei', ['ahhh', 'aaaaah', 'çığlık attım'], 'screaming in shock', 'scream', 'scream', '😱'],
    ['mindblown', 'Kopf explodiert', ['kopf explodiert', 'beynim yandı', 'my mind is blown'], 'mind blown', 'boom', 'mind-blown', '🤯'],
    ['gasp', 'Schnapp', ['gasp', 'nach luft schnappen', 'nefesim kesildi'], 'gasp, shocked', 'ooh', 'gasp', '🫢'],
    ['heartyes', 'Herzaugen', ['herzaugen', 'heart eyes', 'kalp gözler'], 'heart eyes, in love', 'bell', 'heart-eyes', '😍'],
    ['heartfire', 'Brennendes Herz', ['brennendes herz', 'yanan kalp', 'heart on fire'], 'burning love, passion', 'sparkle', 'heart-fire', '❤️‍🔥'],
    ['hearthands', 'Herzhände', ['herzhände', 'kalp eller', 'heart hands'], 'heart hands, love to chat', 'bell', 'heart-hands', '🫶'],
    ['brokenheart', 'Gebrochenes Herz', ['gebrochenes herz', 'kalbim kırıldı', 'heartbroken'], 'heartbroken', 'sadTrombone', 'heart-broken', '💔'],
    ['partyface', 'Partygesicht', ['partygesicht', 'parti zamanı', 'party time'], 'party time', 'fanfare', 'party-face', '🥳'],
    ['popper', 'Konfettikanone', ['konfettikanone', 'konfeti patlat', 'pop the confetti'], 'celebration', 'tada', 'party', '🎉'],
    ['clap', 'Klatschen', ['alle klatschen', 'alkışlar', 'round of applause'], 'applause', 'applause', 'clap', '👏'],
    ['raisehands', 'Hände hoch', ['hände hoch', 'eller havaya', 'hands up'], 'hands up, hooray', 'airhorn', 'raise-hands', '🙌'],
    ['thumbsup', 'Daumen hoch', ['daumen hoch', 'beğendim', 'thumbs up'], 'thumbs up, approval', 'ding', 'thumbs-up', '👍'],
    ['thumbsdown', 'Daumen runter', ['daumen runter', 'beğenmedim', 'thumbs down'], 'thumbs down, disapproval', 'buzzer', 'thumbs-down', '👎'],
    ['sob', 'Heulen', ['ich heule', 'hüngür hüngür', 'sob sob'], 'sobbing', 'sadTrombone', 'sob', '😭'],
    ['pleading', 'Hundeblick', ['hundeblick', 'puppy eyes', 'kıyamam'], 'pleading puppy eyes', 'pop', 'pleading', '🥺'],
    ['facepalm', 'Facepalm', ['facepalm', 'face palm', 'elimi alnıma vurdum'], 'facepalm', 'gong', 'facepalm', '🤦'],
    ['shrug', 'Schulterzucken', ['schulterzucken', 'omuz silktim', 'shrug'], 'shrug, no idea', 'boing', 'shrug', '🤷'],
    ['eyeroll', 'Augenrollen', ['augenrollen', 'göz devirdim', 'eye roll'], 'eye roll', 'boing', 'eye-roll', '🙄'],
    ['thinking', 'Grübeln', ['grübel grübel', 'düşünüyorum', 'thinking face'], 'thinking', 'tick', 'thinking', '🤔'],
    ['cool', 'Sonnenbrille', ['sonnenbrille auf', 'havalıyım', 'deal with it'], 'cool, sunglasses', 'whoosh', 'cool', '😎'],
    ['starstruck', 'Sternenaugen', ['sternenaugen', 'büyülendim', 'star struck'], 'star-struck, amazed', 'sparkle', 'star-struck', '🤩'],
    ['hundred', 'Hundert Punkte', ['hundert punkte', 'yüz üzerinden yüz', 'one hundred percent'], '100 points, perfect', 'ding', 'hundred', '💯'],
    ['rocket', 'Rakete', ['ab zum mond', 'aya gidiyoruz', 'to the moon'], 'to the moon', 'whoosh', 'rocket', '🚀'],
    ['crown', 'Krone', ['krone auf', 'taç tak', 'crown him'], 'crown, king / queen', 'fanfare', 'crown', '👑'],
    ['trophy', 'Pokal', ['der pokal', 'kupa bizim', 'trophy time'], 'trophy, winner', 'fanfare', 'trophy', '🏆'],
    ['ghost', 'Gespenst', ['gespenst', 'hayalet geldi', 'spooky'], 'ghost, spooky', 'ooh', 'ghost', '👻'],
    ['moneybag', 'Geldsack', ['geldsack', 'para çantası', 'money bag'], 'money bag, rich', 'cash', 'money-bag', '💰'],
    ['gift', 'Geschenk', ['ein geschenk', 'hediye geldi', 'a gift'], 'gift, present', 'tada', 'gift', '🎁'],
    ['sparkles', 'Glitzer', ['glitzer', 'pırıl pırıl', 'sparkly'], 'sparkles, shiny', 'sparkle', 'sparkles', '✨'],
    ['eyes', 'Augen', ['ich seh dich', 'gözüm üstünde', 'i see you'], 'eyes, watching', 'tick', 'eyes', '👀'],
    ['popcorn', 'Popcorn', ['popcorn holen', 'mısırları hazırlayın', 'grab the popcorn'], 'popcorn, drama incoming', 'pop', 'popcorn', '🍿'],
    ['sleeping', 'Eingeschlafen', ['eingeschlafen', 'uyuyakaldım', 'fell asleep'], 'sleeping, boring', 'crickets', 'sleeping', '😴'],
    ['cat', 'Katze', ['miau miau', 'miyav miyav', 'meow meow'], 'cat, meow', 'pop', 'cat', '🐱'],
    ['dog', 'Hund', ['wuff wuff', 'hav hav hav', 'woof woof'], 'dog, woof', 'pop', 'dog', '🐶'],
    ['unicorn', 'Einhorn', ['einhorn', 'tek boynuzlu at', 'unicorn'], 'unicorn, magical', 'sparkle', 'unicorn', '🦄'],
    ['seenoevil', 'Nicht hinsehen', ['ich schau nicht hin', 'bakamıyorum', 'cant watch'], 'cannot look, embarrassed', 'boing', 'see-no-evil', '🙈'],
    ['snowflake', 'Schneeflocke', ['schneeflocke', 'kar tanesi', 'snowflake'], 'snowflake, cold', 'bell', 'snowflake', '❄️'],
    ['coffee', 'Kaffee', ['kaffeepause', 'kahve molası', 'coffee break'], 'coffee break', 'pop', 'coffee', '☕'],
    ['pizza', 'Pizza', ['pizzazeit', 'pizza zamanı', 'pizza time'], 'pizza time', 'pop', 'pizza', '🍕'],
  ]);

  const packs = {
    tr: {
      id: 'tr',
      label: 'Türkçe',
      flag: 'TR',
      description: 'Türkische Streamer-Kultur: yok artık, helal olsun, kral, efsane, yıkıldım …',
      triggers: TR.map((r) => row('tr', r)),
    },
    de: {
      id: 'de',
      label: 'Deutsch',
      flag: 'DE',
      description: 'Deutsche Twitch/TikTok-Sprüche: Alter Schwede, Diggi, geil, Ehrenmann, läuft bei dir …',
      triggers: DE.map((r) => row('de', r)),
    },
    en: {
      id: 'en',
      label: 'English',
      flag: 'EN',
      description: 'English internet slang: no cap, sheesh, big W, rizz, GOAT, poggers, F in the chat …',
      triggers: EN.map((r) => row('en', r)),
    },
    family: {
      id: 'family',
      label: '👨‍👩‍👧 Familie & Kinder',
      flag: '👨‍👩‍👧',
      description: 'Sanfte Effekte für Familien-Streams und Vorlesen: gute nacht, aferin, oyun zamanı, bedtime, happy birthday …',
      triggers: FAMILY.map((r) => row('family', r)),
    },
    gaming: {
      id: 'gaming',
      label: '🎮 Gaming',
      flag: '🎮',
      description: 'Gamer-Sprüche DE/TR/EN: headshot, gg wp, rage quit, ace, noob, boss fight, lag, level up, victory …',
      triggers: GAMING.map((r) => row('gaming', r)),
    },
    'story-de': {
      id: 'story-de',
      label: '📖 Geschichten (DE)',
      flag: '📖',
      story: true,
      description: 'Vorlesen: „es regnete“, „in der nacht“, „im wald“, „der drache“ … werden zu Szenen mit Atmosphäre.',
      triggers: STORY_DE.map((r) => row('story-de', r)),
    },
    'story-tr': {
      id: 'story-tr',
      label: '📖 Masal (TR)',
      flag: '📖',
      story: true,
      description: 'Masal okuma: „bir varmış bir yokmuş“, „yağmur yağıyordu“, „ormanda“, „ejderha“ … sahne olur.',
      triggers: STORY_TR.map((r) => row('story-tr', r)),
    },
    'story-en': {
      id: 'story-en',
      label: '📖 Story (EN)',
      flag: '📖',
      story: true,
      description: 'Reading aloud: "once upon a time", "it was raining", "in the forest", "the dragon" … become scenes.',
      triggers: STORY_EN.map((r) => row('story-en', r)),
    },
    'text-tr': {
      id: 'text-tr',
      label: '💬 Yazı Stickerları (TR)',
      flag: '💬',
      description: 'Kendi yazı stickerlarımız: OHA, YOK ARTIK, AYNEN, EYVAH, HELAL, EFSANE, ŞAKA MI, OLUR MU ÖYLE …',
      triggers: TEXT_TR.map((r) => row('text-tr', r)),
    },
    'text-de': {
      id: 'text-de',
      label: '💬 Text-Sticker (DE)',
      flag: '💬',
      description: 'Eigene Text-Sticker: KRASS, LÄUFT, EHRENMANN, EHRENFRAU, DIGGA, NICE, SAFE, MEGA, KEIN PLAN …',
      triggers: TEXT_DE.map((r) => row('text-de', r)),
    },
    'text-en': {
      id: 'text-en',
      label: '💬 Text Stickers (EN)',
      flag: '💬',
      description: "Own text stickers: GG, W, L, LET'S GO, NO WAY, SHEESH, CLUTCH, SLAY, BRUH, GOAT …",
      triggers: TEXT_EN.map((r) => row('text-en', r)),
    },
    reactions: {
      id: 'reactions',
      label: '🎞️ Reaktionen (animiert)',
      flag: '🎞️',
      description: 'Animierte Sticker (Fluent Emoji, MIT): Tränen gelacht, Kopf explodiert, Herzaugen, Daumen hoch, Popcorn … DE/TR/EN.',
      triggers: REACTIONS.map((r) => row('reactions', r)),
    },
  };

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  /** Overview for the panel: [{id, label, flag, count, description, story}]. */
  function list() {
    return Object.keys(packs).map((id) => {
      const p = packs[id];
      return { id: p.id, label: p.label, flag: p.flag, count: p.triggers.length, description: p.description, story: p.story === true };
    });
  }

  /** Story pack id for a BCP-47 language tag ("tr-TR" -> "story-tr"); unknown families fall back to German. */
  function storyPackFor(lang) {
    const family = String(lang || '').toLowerCase().split(/[-_]/)[0];
    const id = `story-${family}`;
    return Object.prototype.hasOwnProperty.call(packs, id) ? id : 'story-de';
  }

  /** Deep copies of a pack's triggers; unknown pack -> []. */
  function get(id) {
    const p = Object.prototype.hasOwnProperty.call(packs, id) ? packs[id] : null;
    return p ? clone(p.triggers) : [];
  }

  global.LiveFXPacks = { packs, list, get, storyPackFor, SCENE_INFO, SCENE_IDS };
})(typeof window !== 'undefined' ? window : globalThis);
