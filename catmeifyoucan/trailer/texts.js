// Cat Me If You Can – Trailer-Texte in 6 Sprachen (tr · en · de · ru · ar · fa).
// Regeln: docs/BRAND.md. Höchstens 6 Wörter pro Zeile (außer Verhaltensregeln/Macher-Zeile), Satzanfang groß, keine GROSSBUCHSTABEN,
// Du-Form. Markennamen (Cat Me If You Can, KediDex, HappyTuncay, Happy Overthinking Coffee) nie
// übersetzen. Der Slogan „Cat me if you can.“ bleibt überall Englisch.
// Arabisch: westliche Ziffern (20%) · Persisch: persische Ziffern (۲۰٪) – wie auf der Startseite.
// ‌ = Halbabstand (ZWNJ) im Persischen,   = geschütztes Leerzeichen.

export const SLOGAN = 'Cat me if you can.';
export const NAME = 'Cat Me If You Can';
export const CAT_NAME = 'Duman'; // „Rauch“ – passt zur grauen Katze auf der Karte

export const TEXTS = {
  en: {
    dir: 'ltr',
    s1: ['Kadıköy is full', 'of street cats.'],
    s2: ['Take a photo.'],
    s2sub: 'It joins your KediDex.',
    newCat: 'New cat!',
    s3: ['Found it first?', 'You name it.'],
    today: 'Today',
    s4a: ['20 cats', 'in one day'],
    s4b: ['= 20% off'],
    s4sub: 'Partner café. Same day only.',
    pct: '20%',
    s5: ['Every photo helps.', 'We count. We help.'],
    s5sub: 'Volunteers see it and help.',
    chips: { healthy: 'Healthy', hungry: 'Hungry', sick: 'Sick', injured: 'Injured' },
    play: 'Kadıköy · Play in your browser',
    rules: 'Photos only · No touching, no chasing · No flash',
    maker: 'A HappyTuncay product · Made at Happy Overthinking Coffee, Kadıköy',
  },
  tr: {
    dir: 'ltr',
    s1: ['Kadıköy sokak', 'kedileriyle dolu.'],
    s2: ['Fotoğrafını çek.'],
    s2sub: 'Kedi, KediDex’ine eklenir.',
    newCat: 'Yeni kedi!',
    s3: ['İlk sen mi buldun?', 'Adını sen koy.'],
    today: 'Bugün',
    s4a: ['Bir günde', '20 kedi'],
    s4b: ['= %20 indirim'],
    s4sub: 'Partner kafede. Sadece o gün.',
    pct: '%20',
    s5: ['Her fotoğraf yardım eder.', 'Sayıyoruz. Yardım ediyoruz.'],
    s5sub: 'Gönüllüler görür ve yardım eder.',
    chips: { healthy: 'Sağlıklı', hungry: 'Aç', sick: 'Hasta', injured: 'Yaralı' },
    play: 'Kadıköy · Tarayıcında oyna',
    rules: 'Sadece fotoğraf · Dokunma, kovalama · Flaş yok',
    maker: 'Bir HappyTuncay ürünü · Kadıköy\'deki Happy Overthinking Coffee\'de doğdu',
  },
  de: {
    dir: 'ltr',
    s1: ['Kadıköy ist voller', 'Straßenkatzen.'],
    s2: ['Mach ein Foto.'],
    s2sub: 'Sie landet in deinem KediDex.',
    newCat: 'Neue Katze!',
    s3: ['Zuerst gefunden?', 'Du gibst ihr den Namen.'],
    today: 'Heute',
    s4a: ['20 Katzen', 'an einem Tag'],
    s4b: ['= 20 % Rabatt'],
    s4sub: 'Im Partner-Café. Nur an diesem Tag.',
    pct: '20 %',
    s5: ['Jedes Foto hilft.', 'Wir zählen. Wir helfen.'],
    s5sub: 'Freiwillige sehen es und helfen.',
    chips: { healthy: 'Gesund', hungry: 'Hungrig', sick: 'Krank', injured: 'Verletzt' },
    play: 'Kadıköy · Spiel im Browser',
    rules: 'Nur Fotos · Nicht anfassen, nicht jagen · Kein Blitz',
    maker: 'Ein Produkt von HappyTuncay · Entstanden im Happy Overthinking Coffee, Kadıköy',
  },
  ru: {
    dir: 'ltr',
    s1: ['Кадыкёй полон', 'уличных кошек.'],
    s2: ['Сделай фото.'],
    s2sub: 'Кошка попадёт в твой KediDex.',
    newCat: 'Новая кошка!',
    s3: ['Нашёл первым?', 'Дай ей имя.'],
    today: 'Сегодня',
    s4a: ['20 кошек', 'за один день'],
    s4b: ['= скидка 20%'],
    s4sub: 'В кафе-партнёре. Только в этот день.',
    pct: '20%',
    s5: ['Каждое фото помогает.', 'Мы считаем. Мы помогаем.'],
    s5sub: 'Волонтёры видят это и помогают.',
    chips: { healthy: 'Здорова', hungry: 'Голодная', sick: 'Болеет', injured: 'Ранена' },
    play: 'Кадыкёй · Играй в браузере',
    rules: 'Только фото · Не трогай, не гоняйся · Без вспышки',
    maker: 'Продукт HappyTuncay · Создано в Happy Overthinking Coffee, Кадыкёй',
  },
  ar: {
    dir: 'rtl',
    s1: ['قاضي كوي مليئة', 'بقطط الشوارع.'],
    s2: ['التقط صورة.'],
    s2sub: 'تنضم القطة إلى KediDex الخاص بك.',
    newCat: 'قطة جديدة!',
    s3: ['وجدتها أولًا؟', 'اختر اسمها أنت.'],
    today: 'اليوم',
    s4a: ['20 قطة', 'في يوم واحد'],
    s4b: ['= خصم \u206620%\u2069'], // LRI…PDI: „20%“ bleibt wie auf der Tasse
    s4sub: 'في مقهى شريك. اليوم نفسه فقط.',
    pct: '20%',
    s5: ['كل صورة تساعد.', 'نعدّ القطط. ونساعدها.'],
    s5sub: 'المتطوعون يرون ذلك ويساعدون.',
    chips: { healthy: 'بصحة جيدة', hungry: 'جائعة', sick: 'مريضة', injured: 'مصابة' },
    play: 'قاضي كوي · العب في المتصفح',
    rules: 'صوّر فقط · لا تلمس، لا تطارد · بلا فلاش',
    maker: 'منتج من HappyTuncay · وُلد في Happy Overthinking Coffee، قاضي كوي',
  },
  fa: {
    dir: 'rtl',
    s1: ['کادیکوی پر از', 'گربه‌های خیابانی است.'],
    s2: ['عکس بگیر.'],
    s2sub: 'گربه به KediDex تو اضافه می‌شود.',
    newCat: 'گربهٔ جدید!',
    s3: ['اول پیدایش کردی؟', 'اسمش را تو بگذار.'],
    today: 'امروز',
    s4a: ['۲۰ گربه', 'در یک روز'],
    s4b: ['= ۲۰٪ تخفیف'],
    s4sub: 'در کافهٔ همکار. فقط همان روز.',
    pct: '۲۰٪',
    s5: ['هر عکس کمک می‌کند.', 'می‌شماریم. کمک می‌کنیم.'],
    s5sub: 'داوطلب‌ها می‌بینند و کمک می‌کنند.',
    chips: { healthy: 'سالم', hungry: 'گرسنه', sick: 'بیمار', injured: 'زخمی' },
    play: 'کادیکوی · در مرورگر بازی کن',
    rules: 'فقط عکس · دست نزن، دنبالشان نکن · بدون فلاش',
    maker: 'محصولی از HappyTuncay · ساخته‌شده در Happy Overthinking Coffee، کادیکوی',
    digits: 'fa',
  },
};

export const LANGS = ['tr', 'en', 'de', 'ru', 'ar', 'fa'];

/** Ziffern in der Landesschreibweise (nur Persisch nutzt eigene Ziffern). */
export function num(lang, n) {
  const s = String(n);
  if (TEXTS[lang] && TEXTS[lang].digits === 'fa') return s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  return s;
}
