// Cat Me If You Can – Beschriftungen فارسی (fa) für Katzentypen, Zustände, Abzeichen, Level.
// Aufbau: { TABELLE: { schlüssel: 'Text' }, BADGES: { id: { name, desc } }, LEVEL_TITLES: [7 Texte] }
// Tabellen und Schlüssel: siehe core/taxonomy.js (TABLES) und config/game.js (badges, levelTitles).
// PATTERNS sind Adjektive, sie stehen auch in „{n} گربهٔ {pattern} پیدا کن“ (quest.pattern).
// Fell-Wörter wie im Iran üblich: ببری = Tabby, نارنجی = Ginger, سه‌رنگ = Calico, لاک‌پشتی = Schildpatt.
// Ziffern persisch (۰–۹) wie in js/lang/fa.js. Keine Emoji – die Symbole kommen aus dem Code.
// Nie „شکار/شکارچی“ (jagen/Jäger) – BRAND.md. کادیکوی = Kadıköy, Viertelnamen in Lateinschrift (Moda …).
export default {
  PATTERNS: {
    tekir: 'ببری',
    sarman: 'نارنجی',
    krem: 'کرم‌رنگ',
    siyah: 'سیاه',
    beyaz: 'سفید',
    gri: 'خاکستری',
    smokin: 'سیاه و سفید',
    tekir_beyaz: 'ببری و سفید',
    sarman_beyaz: 'نارنجی و سفید',
    gri_beyaz: 'خاکستری و سفید',
    uc_renk: 'سه‌رنگ',
    kaplumbaga: 'لاک‌پشتی',
    renk_uclu: 'شبیه سیامی',
    van: 'طرح وان',
    diger: 'دیگر',
  },

  COAT_COLORS: {
    black: 'سیاه',
    white: 'سفید',
    gray: 'خاکستری',
    orange: 'نارنجی',
    cream: 'کرم',
    brown: 'قهوه‌ای',
  },

  EYE_COLORS: {
    yellow: 'زرد/کهربایی',
    green: 'سبز',
    blue: 'آبی',
    copper: 'مسی',
    odd: 'هر چشم یک رنگ',
    unknown: 'دیده نمی‌شود',
  },

  AGE_GROUPS: {
    kitten: 'بچه‌گربه',
    junior: 'جوان',
    adult: 'بالغ',
    senior: 'مسن',
    unknown: 'نامعلوم',
  },

  BCS_CLASSES: {
    very_thin: 'خیلی لاغر',
    thin: 'لاغر',
    ideal: 'متناسب',
    overweight: 'کمی چاق',
    obese: 'خیلی چاق',
    unknown: 'از روی عکس معلوم نیست',
  },

  SEX: {
    female: 'ماده',
    male: 'نر',
    unknown: 'نامعلوم',
  },

  EAR_TIP: {
    tipped: 'گوش علامت‌دار (عقیم‌شده)',
    none: 'بدون علامت گوش',
    not_visible: 'گوش‌ها دیده نمی‌شوند',
  },

  HEALTH_FLAGS: {
    eye_discharge: 'ترشح چشم',
    eye_injury: 'آسیب چشم',
    nasal_discharge: 'آبریزش بینی',
    wound: 'زخم',
    skin_issue: 'مشکل پوستی',
    hair_loss: 'ریزش مو',
    limping: 'لنگیدن',
    very_thin: 'لاغری شدید',
    ear_issue: 'مشکل گوش',
    mouth_issue: 'مشکل دهان یا دندان',
    matted_coat: 'موهای گره‌خورده',
    pregnant_possible: 'شاید باردار است',
    nursing: 'به بچه‌هایش شیر می‌دهد',
  },

  SEVERITY: {
    none: 'سالم به نظر می‌رسد',
    mild: 'خفیف',
    attention: 'نیاز به توجه',
    urgent: 'فوری',
  },

  BEHAVIOR: {
    relaxed: 'آرام',
    sleeping: 'خواب',
    curious: 'کنجکاو',
    alert: 'گوش‌به‌زنگ',
    eating: 'غذا می‌خورد',
    playing: 'بازی می‌کند',
    grooming: 'خودش را تمیز می‌کند',
    fearful: 'ترسیده',
    defensive: 'حالت دفاعی',
    unknown: 'نامشخص',
  },

  SETTINGS: {
    street: 'خیابان',
    park: 'پارک',
    coast: 'کنار دریا',
    garden: 'باغچه',
    shop_cafe: 'مغازه/کافه',
    market: 'بازار',
    stairs_wall: 'پله/دیوار',
    car: 'ماشین',
    roof: 'پشت‌بام',
    indoor: 'داخل ساختمان',
    other: 'جای دیگر',
  },

  OWNERSHIP: {
    street: 'گربهٔ خیابانی',
    owned: 'گربهٔ خانگی',
    unclear: 'نامشخص',
  },

  CAT_STATUS: {
    active: 'در خیابان، حالش خوب است',
    needs_help: 'به کمک نیاز دارد',
    in_care: 'تحت مراقبت',
    adopted: 'صاحب پیدا کرد',
    missing: 'مدتی است دیده نشده',
    deceased: 'از دنیا رفته',
  },

  RARITY: {
    common: 'معمولی',
    uncommon: 'کم‌پیدا',
    rare: 'کمیاب',
    epic: 'حماسی',
    legendary: 'افسانه‌ای',
  },

  CONDITION_TAGS: {
    healthy: 'سالم',
    fed: 'غذا دادم',
    hungry: 'گرسنه',
    thirsty: 'تشنه',
    thin: 'خیلی لاغر',
    sick: 'بیمار (چشم، بینی، عطسه)',
    injured: 'زخمی',
    limping: 'می‌لنگد',
    cold: 'سردش است / خیس شده',
    pregnant: 'باردار',
    kittens: 'بچه دارد',
    danger: 'در خطر (ماشین، گیر افتاده)',
    lost_pet: 'شاید گربهٔ خانگیِ گم‌شده',
  },

  PLACE_TYPES: {
    partner: 'کافهٔ همکار',
    feeding: 'جای غذا',
    water: 'ظرف آب',
    shelter: 'خانهٔ گربه',
    vet: 'دامپزشک',
  },

  BADGES: {
    first_catch: { name: 'اولین پنجه', desc: 'از اولین گربه‌ات عکس بگیر' },
    ten_cats: { name: 'ده‌تایی', desc: '۱۰ گربهٔ مختلف' },
    fifty_cats: { name: 'کلکسیونر', desc: '۵۰ گربهٔ مختلف' },
    hundred_cats: { name: 'هم‌زبان گربه‌ها', desc: '۱۰۰ گربهٔ مختلف' },
    daily_goal: { name: 'بیست‌تایی', desc: '۲۰ گربه در یک روز' },
    goal_5: { name: 'مشتری ثابت کافه', desc: 'در ۵ روز به هدف روزانه برس' },
    discoverer: { name: 'کاشف', desc: '۵ گربهٔ جدید کشف کن' },
    pioneer: { name: 'پیشگام', desc: '۲۵ گربهٔ جدید کشف کن' },
    districts_5: { name: 'محله‌گرد', desc: 'در ۵ محله گربه پیدا کن' },
    districts_all: { name: 'همهٔ کادیکوی', desc: 'همهٔ ۲۱ محله' },
    night_owl: { name: 'شب‌زنده‌دار', desc: '۳ گربه بین ساعت ۱۰ شب و ۵ صبح' },
    early_bird: { name: 'سحرخیز', desc: '۳ گربه بین ساعت ۵ و ۸ صبح' },
    guardian: { name: 'نگهبان سلامت', desc: '۳ گربه را که به کمک نیاز دارند گزارش کن' },
    patterns_8: { name: 'جعبهٔ رنگ', desc: '۸ نوع گربهٔ مختلف' },
    rare_find: { name: 'یافتهٔ کمیاب', desc: 'یک گربهٔ کمیاب پیدا کن' },
    legend: { name: 'اسطوره‌یاب', desc: 'یک اسطورهٔ کادیکوی پیدا کن' },
    streak_7: { name: '۷ روز پیاپی', desc: '۷ روز پشت سر هم' },
  },

  LEVEL_TITLES: [
    'تازه‌کار',
    'دیده‌بان خیابان',
    'رفیق محله',
    'کارآگاه گربه‌ها',
    'کاوشگر Moda',
    'هم‌زبان گربه‌ها',
    'اسطورهٔ کادیکوی',
  ],
};
