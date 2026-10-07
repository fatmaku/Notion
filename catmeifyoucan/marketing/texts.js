// Cat Me If You Can – Texte für die Social-Media-Bilder und Link-Vorschauen (tr · en · de · ru · ar · fa).
// Regeln: docs/BRAND.md. Überschriften höchstens ~8 Wörter, sehr einfache Sätze, Du-Form, Satzanfang groß,
// keine GROSSBUCHSTABEN. Markennamen (Cat Me If You Can, KediDex, HappyTuncay, Happy Overthinking Coffee)
// werden nie übersetzt. Der Slogan „Cat me if you can.“ bleibt überall Englisch (das Wortspiel).
// Prozent: tr %20 · de 20 % · en/ru/ar 20% · fa ۲۰٪ (Persisch mit persischen Ziffern, wie auf der Startseite).
// Ehrlich bleiben: keine erfundenen Zahlen, Partner, Preise oder Adressen.
//   = geschütztes Leerzeichen · ‌ = Halbabstand (ZWNJ) im Persischen.

export const LANGS = ['tr', 'en', 'de', 'ru', 'ar', 'fa'];
export const MOTIFS = ['cat-me', 'twenty', 'name-it', 'every-cat-counts', 'made-in-kadikoy'];
export const FORMATS = {
  post: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920, safeTop: 220, safeBottom: 380 },
  og: { w: 1200, h: 630 },
};

export const NAME = 'Cat Me If You Can';
export const SLOGAN = 'Cat me if you can.';
export const HASHTAG = '#CatMeIfYouCan';
/** Diese Namen bleiben in jeder Sprache gleich, laufen immer links→rechts und brechen nie um. */
export const BRANDS = ['Happy Overthinking Coffee', 'Cat Me If You Can', 'HappyTuncay', 'KediDex', '#CatMeIfYouCan'];
/** Name der neuen Katze auf der Sammelkarte („Zimt“ – passt zur roten Sarman-Katze). */
export const CAT_NAME = 'Tarçın';

export const TEXTS = {
  en: {
    dir: 'ltr',
    place: 'Kadıköy · Istanbul',
    cta: 'Play free in your browser',
    maker: 'A HappyTuncay product · Made at Happy Overthinking Coffee, Kadıköy',
    'cat-me': {
      line: 'A photo game with the street cats of Kadıköy.',
    },
    twenty: {
      head: ['20 cats', '= 20% off'],
      sub: 'Find 20 different cats in one day.',
      note: 'At a partner café · That day only',
      today: 'Today',
      ticket: '20% off',
    },
    'name-it': {
      head: ['Found it first?', 'You name it.'],
      sub: 'A new cat for the KediDex? You choose its name.',
      newCat: 'New cat!',
    },
    'every-cat-counts': {
      kicker: 'The serious side',
      head: ['Every cat counts.'],
      sub: 'We count the street cats of Kadıköy.',
      steps: ['Take a photo', 'Tap how the cat is', 'Volunteers see it and help'],
      ask: 'How is the cat?',
      chips: { healthy: 'Healthy', hungry: 'Hungry', sick: 'Sick', injured: 'Injured' },
      privacy: 'We never show the exact spot. This keeps the cats safe.',
    },
    'made-in-kadikoy': {
      head: ['Made in Kadıköy', 'with love for cats'],
      sub: 'HappyTuncay made this game at Happy Overthinking Coffee.',
      pun: 'Coffee, cats and a lot of overthinking.',
    },
  },

  tr: {
    dir: 'ltr',
    place: 'Kadıköy · İstanbul',
    cta: 'Tarayıcında ücretsiz oyna',
    maker: 'Bir HappyTuncay ürünü · Kadıköy\'deki Happy Overthinking Coffee\'de doğdu',
    'cat-me': {
      line: 'Kadıköy’ün sokak kedileriyle bir fotoğraf oyunu.',
    },
    twenty: {
      head: ['20 kedi', '= %20 indirim'],
      sub: 'Bir günde 20 farklı kedi bul.',
      note: 'Partner kafede · Sadece o gün',
      today: 'Bugün',
      ticket: '%20 indirim',
    },
    'name-it': {
      head: ['İlk sen mi buldun?', 'Adını sen koy.'],
      sub: 'KediDex’te yeni bir kedi mi? Adını sen seçersin.',
      newCat: 'Yeni kedi!',
    },
    'every-cat-counts': {
      kicker: 'İşin ciddi tarafı',
      head: ['Her kedi önemli.'],
      sub: 'Kadıköy’ün sokak kedilerini sayıyoruz.',
      steps: ['Fotoğrafını çek', 'Kedinin durumunu seç', 'Gönüllüler görür ve yardım eder'],
      ask: 'Kedi nasıl?',
      chips: { healthy: 'Sağlıklı', hungry: 'Aç', sick: 'Hasta', injured: 'Yaralı' },
      privacy: 'Tam yeri asla göstermiyoruz. Böylece kediler güvende kalır.',
    },
    'made-in-kadikoy': {
      head: ['Kadıköy’de doğdu', 'kedilere sevgiyle'],
      sub: 'HappyTuncay bu oyunu Happy Overthinking Coffee’de yaptı.',
      pun: 'Kahve, kediler ve bolca overthinking.',
    },
  },

  de: {
    dir: 'ltr',
    place: 'Kadıköy · Istanbul',
    cta: 'Kostenlos im Browser spielen',
    maker: 'Ein Produkt von HappyTuncay · Entstanden im Happy Overthinking Coffee, Kadıköy',
    'cat-me': {
      line: 'Ein Foto-Spiel mit den Straßenkatzen von Kadıköy.',
    },
    twenty: {
      head: ['20 Katzen', '= 20 % Rabatt'],
      sub: 'Finde 20 verschiedene Katzen an einem Tag.',
      note: 'Im Partner-Café · Nur an diesem Tag',
      today: 'Heute',
      ticket: '20 % Rabatt',
    },
    'name-it': {
      head: ['Zuerst gefunden?', 'Du benennst sie.'],
      sub: 'Neue Katze für den KediDex? Du suchst den Namen aus.',
      newCat: 'Neue Katze!',
    },
    'every-cat-counts': {
      kicker: 'Die ernste Seite',
      head: ['Jede Katze zählt.'],
      sub: 'Wir zählen die Straßenkatzen von Kadıköy.',
      steps: ['Mach ein Foto', 'Tipp an, wie es ihr geht', 'Freiwillige sehen es und helfen'],
      ask: 'Wie geht es der Katze?',
      chips: { healthy: 'Gesund', hungry: 'Hungrig', sick: 'Krank', injured: 'Verletzt' },
      privacy: 'Den genauen Ort zeigen wir nie. So bleiben die Katzen sicher.',
    },
    'made-in-kadikoy': {
      head: ['Gemacht in Kadıköy', 'mit Liebe zu Katzen'],
      sub: 'HappyTuncay hat das Spiel im Happy Overthinking Coffee gemacht.',
      pun: 'Kaffee, Katzen und viel zu viel Nachdenken.',
    },
  },

  ru: {
    dir: 'ltr',
    place: 'Кадыкёй · Стамбул',
    cta: 'Играй бесплатно в браузере',
    maker: 'Продукт HappyTuncay · Создано в Happy Overthinking Coffee, Кадыкёй',
    'cat-me': {
      line: 'Фотоигра с уличными кошками Кадыкёя.',
    },
    twenty: {
      head: ['20 кошек', '= скидка 20%'],
      sub: 'Найди 20 разных кошек за один день.',
      note: 'В кафе-партнёре · Только в этот день',
      today: 'Сегодня',
      ticket: 'Скидка 20%',
    },
    'name-it': {
      head: ['Нашёл первым?', 'Дай ей имя.'],
      sub: 'Новая кошка для KediDex? Имя выбираешь ты.',
      newCat: 'Новая кошка!',
    },
    'every-cat-counts': {
      kicker: 'Серьёзная сторона',
      head: ['Каждая кошка на счету.'],
      sub: 'Мы считаем уличных кошек Кадыкёя.',
      steps: ['Сделай фото', 'Отметь её состояние', 'Волонтёры видят и помогают'],
      ask: 'Как дела у кошки?',
      chips: { healthy: 'Здорова', hungry: 'Голодная', sick: 'Болеет', injured: 'Ранена' },
      privacy: 'Мы не показываем точное место. Так кошки в безопасности.',
    },
    'made-in-kadikoy': {
      head: ['Сделано в Кадыкёе', 'с любовью к кошкам'],
      sub: 'HappyTuncay создал эту игру в Happy Overthinking Coffee.',
      pun: 'Кофе, кошки и слишком много мыслей.',
    },
  },

  ar: {
    dir: 'rtl',
    place: 'قاضي كوي · إسطنبول',
    cta: 'العب مجانًا في المتصفح',
    maker: 'منتج من HappyTuncay · وُلد في Happy Overthinking Coffee، قاضي كوي',
    'cat-me': {
      line: 'لعبة تصوير مع قطط الشوارع في قاضي كوي.',
    },
    twenty: {
      head: ['20 قطة', '= خصم 20%'],
      sub: 'اعثر على 20 قطة مختلفة في يوم واحد.',
      note: 'في مقهى شريك · في اليوم نفسه فقط',
      today: 'اليوم',
      ticket: 'خصم 20%',
    },
    'name-it': {
      head: ['وجدتها أولًا؟', 'اختر اسمها أنت.'],
      sub: 'قطة جديدة في KediDex؟ أنت تختار اسمها.',
      newCat: 'قطة جديدة!',
    },
    'every-cat-counts': {
      kicker: 'الجانب الجادّ',
      head: ['كل قطة مهمّة.'],
      sub: 'نحن نعدّ قطط الشوارع في قاضي كوي.',
      steps: ['التقط صورة', 'اختر حالة القطة', 'المتطوعون يرون ذلك ويساعدون'],
      ask: 'كيف حال القطة؟',
      chips: { healthy: 'بصحة جيدة', hungry: 'جائعة', sick: 'مريضة', injured: 'مصابة' },
      privacy: 'لا نُظهر المكان الدقيق أبدًا. هكذا تبقى القطط بأمان.',
    },
    'made-in-kadikoy': {
      head: ['صُنع في قاضي كوي', 'بكلّ حبّ للقطط'],
      sub: 'صنع HappyTuncay هذه اللعبة في Happy Overthinking Coffee.',
      pun: 'قهوة، وقطط، وكثير من التفكير الزائد.',
    },
  },

  fa: {
    dir: 'rtl',
    digits: 'fa',
    place: 'کادیکوی · استانبول',
    cta: 'رایگان در مرورگر بازی کن',
    maker: 'محصولی از HappyTuncay · ساخته‌شده در Happy Overthinking Coffee، کادیکوی',
    'cat-me': {
      line: 'یک بازی عکاسی با گربه‌های خیابانی کادیکوی.',
    },
    twenty: {
      head: ['۲۰ گربه', '= ۲۰٪ تخفیف'],
      sub: 'در یک روز ۲۰ گربهٔ مختلف پیدا کن.',
      note: 'در کافهٔ همکار · فقط همان روز',
      today: 'امروز',
      ticket: '۲۰٪ تخفیف',
    },
    'name-it': {
      head: ['اول پیدایش کردی؟', 'اسمش را تو بگذار.'],
      sub: 'گربهٔ جدید برای KediDex؟ اسمش را تو انتخاب می‌کنی.',
      newCat: 'گربهٔ جدید!',
    },
    'every-cat-counts': {
      kicker: 'روی جدی ماجرا',
      head: ['هر گربه مهم است.'],
      sub: 'ما گربه‌های خیابانی کادیکوی را می‌شماریم.',
      steps: ['عکس بگیر', 'حال گربه را انتخاب کن', 'داوطلب‌ها می‌بینند و کمک می‌کنند'],
      ask: 'حال گربه چطور است؟',
      chips: { healthy: 'سالم', hungry: 'گرسنه', sick: 'بیمار', injured: 'زخمی' },
      privacy: 'جای دقیق را هرگز نشان نمی‌دهیم. این‌طوری گربه‌ها در امان می‌مانند.',
    },
    'made-in-kadikoy': {
      head: ['ساخت کادیکوی', 'با عشق به گربه‌ها'],
      sub: 'HappyTuncay این بازی را در Happy Overthinking Coffee ساخت.',
      pun: 'قهوه، گربه و کلی فکر و خیال.',
    },
  },
};

/** Ziffern in der Landesschreibweise (nur Persisch nutzt eigene Ziffern). */
export function num(lang, n) {
  const s = String(n);
  return TEXTS[lang] && TEXTS[lang].digits === 'fa' ? s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]) : s;
}
