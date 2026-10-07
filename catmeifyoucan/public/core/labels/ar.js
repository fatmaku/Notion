// Cat Me If You Can – Beschriftungen العربية (ar) für Katzentypen, Zustände, Abzeichen, Level.
// Aufbau: { TABELLE: { schlüssel: 'Text' }, BADGES: { id: { name, desc } }, LEVEL_TITLES: [7 Texte] }
// Tabellen und Schlüssel: siehe core/taxonomy.js (TABLES) und config/game.js (badges, levelTitles).
// Eigenschaften der Katze stehen in der weiblichen Form (قطة). Nie „صيد/فريسة“ (BRAND.md).
// Kadıköy = قاضي كوي (BRAND.md Abschnitt 2), Viertelnamen bleiben in Lateinschrift (Moda …).
export default {
  PATTERNS: {
    tekir: 'مخططة',
    sarman: 'برتقالية',
    krem: 'كريمية',
    siyah: 'سوداء',
    beyaz: 'بيضاء',
    gri: 'رمادية',
    smokin: 'سوداء وبيضاء',
    tekir_beyaz: 'مخططة وبيضاء',
    sarman_beyaz: 'برتقالية وبيضاء',
    gri_beyaz: 'رمادية وبيضاء',
    uc_renk: 'ثلاثية الألوان',
    kaplumbaga: 'صدف السلحفاة',
    renk_uclu: 'شبه سيامية',
    van: 'نقش فان',
    diger: 'أخرى',
  },

  COAT_COLORS: {
    black: 'أسود',
    white: 'أبيض',
    gray: 'رمادي',
    orange: 'برتقالي',
    cream: 'كريمي',
    brown: 'بني',
  },

  EYE_COLORS: {
    yellow: 'أصفر/كهرماني',
    green: 'أخضر',
    blue: 'أزرق',
    copper: 'نحاسي',
    odd: 'لونان مختلفان',
    unknown: 'لا تظهران',
  },

  AGE_GROUPS: {
    kitten: 'قطة صغيرة',
    junior: 'شابة',
    adult: 'بالغة',
    senior: 'كبيرة في السن',
    unknown: 'غير معروف',
  },

  BCS_CLASSES: {
    very_thin: 'نحيفة جدًا',
    thin: 'نحيفة',
    ideal: 'مثالية',
    overweight: 'ممتلئة',
    obese: 'سمينة جدًا',
    unknown: 'لا يتضح من الصورة',
  },

  SEX: {
    female: 'أنثى',
    male: 'ذكر',
    unknown: 'غير معروف',
  },

  EAR_TIP: {
    tipped: 'علامة في الأذن (معقّمة)',
    none: 'لا علامة في الأذن',
    not_visible: 'الأذنان لا تظهران',
  },

  HEALTH_FLAGS: {
    eye_discharge: 'إفرازات من العين',
    eye_injury: 'إصابة في العين',
    nasal_discharge: 'إفرازات من الأنف',
    wound: 'جرح',
    skin_issue: 'مشكلة في الجلد',
    hair_loss: 'تساقط الفرو',
    limping: 'تعرج',
    very_thin: 'نحافة شديدة',
    ear_issue: 'مشكلة في الأذن',
    mouth_issue: 'مشكلة في الفم أو الأسنان',
    matted_coat: 'فرو متلبّد',
    pregnant_possible: 'ربما حامل',
    nursing: 'ترضع صغارها',
  },

  SEVERITY: {
    none: 'تبدو بصحة جيدة',
    mild: 'بسيط',
    attention: 'تحتاج انتباهًا',
    urgent: 'عاجل',
  },

  BEHAVIOR: {
    relaxed: 'هادئة',
    sleeping: 'نائمة',
    curious: 'فضولية',
    alert: 'منتبهة',
    eating: 'تأكل',
    playing: 'تلعب',
    grooming: 'تنظف نفسها',
    fearful: 'خائفة',
    defensive: 'تدافع عن نفسها',
    unknown: 'غير واضح',
  },

  SETTINGS: {
    street: 'شارع',
    park: 'حديقة عامة',
    coast: 'قرب البحر',
    garden: 'حديقة',
    shop_cafe: 'متجر/مقهى',
    market: 'سوق',
    stairs_wall: 'درج/جدار',
    car: 'سيارة',
    roof: 'سطح',
    indoor: 'داخل مبنى',
    other: 'غير ذلك',
  },

  OWNERSHIP: {
    street: 'قطة شارع',
    owned: 'قطة منزلية',
    unclear: 'غير واضح',
  },

  CAT_STATUS: {
    active: 'في الشارع، بخير',
    needs_help: 'تحتاج مساعدة',
    in_care: 'تحت الرعاية',
    adopted: 'وجدت بيتًا',
    missing: 'لم تُشاهد مؤخرًا',
    deceased: 'فارقت الحياة',
  },

  RARITY: {
    common: 'عادية',
    uncommon: 'غير شائعة',
    rare: 'نادرة',
    epic: 'ملحمية',
    legendary: 'أسطورية',
  },

  CONDITION_TAGS: {
    healthy: 'بصحة جيدة',
    fed: 'أطعمتها',
    hungry: 'جائعة',
    thirsty: 'عطشى',
    thin: 'نحيفة جدًا',
    sick: 'مريضة (عين، أنف، عطس)',
    injured: 'مصابة',
    limping: 'تعرج',
    cold: 'تشعر بالبرد / مبللة',
    pregnant: 'حامل',
    kittens: 'معها صغار',
    danger: 'في خطر (سيارات، عالقة)',
    lost_pet: 'ربما قطة منزلية ضائعة',
  },

  PLACE_TYPES: {
    partner: 'مقهى شريك',
    feeding: 'مكان إطعام',
    water: 'وعاء ماء',
    shelter: 'بيت للقطط',
    vet: 'طبيب بيطري',
  },

  BADGES: {
    first_catch: { name: 'أول بصمة', desc: 'صوّر أول قطة لك' },
    ten_cats: { name: 'العشرة الكاملة', desc: '10 قطط مختلفة' },
    fifty_cats: { name: 'جامع القطط', desc: '50 قطة مختلفة' },
    hundred_cats: { name: 'هامس القطط', desc: '100 قطة مختلفة' },
    daily_goal: { name: 'العشرون', desc: '20 قطة في يوم واحد' },
    goal_5: { name: 'زبون المقهى الدائم', desc: 'حقّق هدف اليوم في 5 أيام' },
    discoverer: { name: 'المكتشف', desc: 'اكتشف 5 قطط جديدة' },
    pioneer: { name: 'الرائد', desc: 'اكتشف 25 قطة جديدة' },
    districts_5: { name: 'الجوّال', desc: 'اعثر على قطط في 5 مناطق' },
    districts_all: { name: 'كل قاضي كوي', desc: 'كل المناطق الـ21' },
    night_owl: { name: 'بومة الليل', desc: '3 قطط بين 10 مساءً و5 صباحًا' },
    early_bird: { name: 'طائر الصباح', desc: '3 قطط بين 5 و8 صباحًا' },
    guardian: { name: 'حارس الصحة', desc: 'أبلغ عن 3 قطط تحتاج مساعدة' },
    patterns_8: { name: 'لوحة الألوان', desc: '8 أنواع فرو مختلفة' },
    rare_find: { name: 'اكتشاف نادر', desc: 'اعثر على قطة نادرة' },
    legend: { name: 'مكتشف الأساطير', desc: 'اعثر على إحدى أساطير قاضي كوي' },
    streak_7: { name: 'أسبوع كامل', desc: '7 أيام متتالية' },
  },

  LEVEL_TITLES: [
    'مبتدئ',
    'كشّاف الشارع',
    'صديق الحي',
    'محقق القطط',
    'مستكشف Moda',
    'هامس القطط',
    'أسطورة قاضي كوي',
  ],
};
