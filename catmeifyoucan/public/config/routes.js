// Cat Me If You Can – Katzen-Spaziergänge („Kedi rotaları“): kuratierte Wege durch Kadıköy, die
// an einem Partner-Café enden. Live-Zahlen dazu rechnet public/core/routes.js aus.
//
// Ein Weg ist ein neuer Eintrag in WALKS – kein Code nötig. Regeln (geprüft in test/routes.test.js):
//   • 3–5 Wegpunkte [lat, lon] an bekannten ÖFFENTLICHEN Orten (Anleger, Plätze, Parks, große
//     Straßenkreuzungen) – nie an Futterstellen oder Höfen, wo Katzen wohnen.
//   • jeder Punkt liegt im Polygon seiner Region (config/regions.js), zwei Punkte < 900 m auseinander.
//   • höchstens 3 Zwischenpunkte: so viele nimmt Google Maps auf dem Handy (Start + 3 + Ziel).
//   • Die Linie in der App heißt nur „ungefähr hier lang“ – die echte Wegführung macht die Karten-App.
//   • Texte in allen 6 Sprachen, sehr einfach und ehrlich. Viertel- und Parknamen bleiben in
//     Lateinschrift (wie auf den Straßenschildern), auch auf ru/ar/fa.
//
// Die Koordinaten sind auf ±100 m genau gewählt (Ortskenntnis, nicht vermessen). Vor dem echten
// Betrieb einmal vor Ort ablaufen oder mit OpenStreetMap abgleichen.

/** Rechenregeln für Länge, Dauer und Live-Zahlen. */
export const WALK_RULES = {
  /** Gehgeschwindigkeit (km/h) für die Dauer. */
  speedKmh: 4,
  /** Pause pro Zwischenstopp (Minuten) – Katzen fotografieren braucht Zeit. */
  stopMin: 5,
  /** Straßen sind nicht gerade: Luftlinie × Faktor ≈ echter Fußweg. */
  streetFactor: 1.2,
  /** Katzen zählen, die höchstens so weit (m) von der Linie gesehen wurden (gerundete Positionen). */
  catRadiusM: 200,
  /** Partner-Cafés höchstens so weit (m) von der Linie. */
  cafeRadiusM: 250,
  /** „Café am Ende“: höchstens so weit (m) vom Ziel. */
  cafeEndM: 400,
  /** Hitzeflecken auf der Wegkarte: Sichtungen bis so weit (m) von der Linie. */
  heatRadiusM: 300,
  /** Zeitraum für „diese Woche“ (Tage). */
  days: 7,
  /** Zwei Wegpunkte höchstens so weit auseinander (m). */
  maxLegM: 900,
  /** Zwischenpunkte im Google-Maps-Link (Handy: höchstens 3). */
  mapsWaypoints: 3,
  /** Katzen in der Wegansicht („diese Woche hier gesehen“). */
  maxCats: 12,
};

const PIER = {
  tr: 'Kadıköy İskelesi',
  en: 'Kadıköy ferry pier',
  de: 'Fähranleger Kadıköy',
  ru: 'Пристань Кадыкёй',
  ar: 'رصيف عبّارات قاضي كوي',
  fa: 'اسکلهٔ کشتی کادیکوی',
};

export const WALKS = [
  {
    id: 'moda-coast',
    regionId: 'kadikoy',
    icon: '🌊',
    name: {
      tr: 'Moda sahili',
      en: 'Moda by the sea',
      de: 'Moda am Meer',
      ru: 'Moda у моря',
      ar: 'Moda بجانب البحر',
      fa: 'Moda کنار دریا',
    },
    story: {
      tr: 'İskeleden Moda’ya deniz kenarından yürü. Kediler parkı ve çay bahçelerini çok sever.',
      en: 'Walk by the sea from the ferry to Moda. Cats love the park and the tea gardens.',
      de: 'Geh vom Fähranleger am Meer entlang nach Moda. Katzen lieben den Park und die Teegärten.',
      ru: 'Иди вдоль моря от пристани до Moda. Кошки любят парк и чайные сады.',
      ar: 'امشِ بجانب البحر من رصيف العبّارات إلى Moda. القطط تحب الحديقة وحدائق الشاي.',
      fa: 'از اسکلهٔ کشتی، کنار دریا تا Moda قدم بزن. گربه‌ها پارک و چای‌خانه‌ها را دوست دارند.',
    },
    start: PIER,
    finish: { tr: 'Moda', en: 'Moda', de: 'Moda', ru: 'Moda', ar: 'Moda', fa: 'Moda' },
    waypoints: [
      [40.9927, 29.0230], // Kadıköy İskelesi
      [40.9880, 29.0236], // Uferweg Richtung Moda
      [40.9826, 29.0234], // Moda-Ufer (alter Moda-Anleger)
      [40.9790, 29.0252], // Moda Parkı (Moda Burnu)
      [40.9836, 29.0268], // Moda Caddesi
    ],
  },
  {
    id: 'yeldegirmeni',
    regionId: 'kadikoy',
    icon: '🎨',
    name: {
      tr: 'Yeldeğirmeni: duvar resimleri ve kediler',
      en: 'Yeldeğirmeni: wall art & cats',
      de: 'Yeldeğirmeni: Wandbilder und Katzen',
      ru: 'Yeldeğirmeni: рисунки на стенах и кошки',
      ar: 'Yeldeğirmeni: رسوم على الجدران وقطط',
      fa: 'Yeldeğirmeni: نقاشی‌های دیواری و گربه‌ها',
    },
    story: {
      tr: 'Eski evler ve kocaman duvar resimleri. Sakin sokaklarda çok kedi yaşıyor.',
      en: 'Old houses and big paintings on the walls. Many cats live in the quiet streets.',
      de: 'Alte Häuser und große Bilder an den Wänden. In den ruhigen Straßen leben viele Katzen.',
      ru: 'Старые дома и большие рисунки на стенах. На тихих улицах живёт много кошек.',
      ar: 'بيوت قديمة ورسوم كبيرة على الجدران. تعيش قطط كثيرة في الشوارع الهادئة.',
      fa: 'خانه‌های قدیمی و نقاشی‌های بزرگ روی دیوارها. گربه‌های زیادی در کوچه‌های آرام زندگی می‌کنند.',
    },
    start: PIER,
    finish: { tr: 'Yeldeğirmeni', en: 'Yeldeğirmeni', de: 'Yeldeğirmeni', ru: 'Yeldeğirmeni', ar: 'Yeldeğirmeni', fa: 'Yeldeğirmeni' },
    waypoints: [
      [40.9927, 29.0230], // Kadıköy İskelesi
      [40.9952, 29.0242], // Rıhtım / Anfang Karakolhane Caddesi
      [40.9980, 29.0250], // Yeldeğirmeni, Westteil
      [40.9988, 29.0274], // Yeldeğirmeni, Nordteil
      [40.9968, 29.0263], // Yeldeğirmeni, Mitte
    ],
  },
  {
    id: 'carsi-bahariye',
    regionId: 'kadikoy',
    icon: '🐟',
    name: {
      tr: 'Çarşı ve Bahariye',
      en: 'Market streets & Bahariye',
      de: 'Marktstraßen und Bahariye',
      ru: 'Рынок и улица Bahariye',
      ar: 'شوارع السوق وشارع Bahariye',
      fa: 'بازار و خیابان Bahariye',
    },
    story: {
      tr: 'Balıkçılar, fırınlar ve ünlü boğa heykeli. Dükkân önlerinde çok kedi uyur.',
      en: 'Fish shops, bakeries and the famous bull statue. Many cats nap by the shops.',
      de: 'Fischläden, Bäckereien und der berühmte Stier. Viele Katzen schlafen vor den Läden.',
      ru: 'Рыбные лавки, пекарни и знаменитый бык. У магазинов спит много кошек.',
      ar: 'محلات سمك ومخابز وتمثال الثور الشهير. قطط كثيرة تنام أمام المحلات.',
      fa: 'ماهی‌فروشی‌ها، نانوایی‌ها و مجسمهٔ معروف گاو. گربه‌های زیادی جلوی مغازه‌ها چرت می‌زنند.',
    },
    start: PIER,
    finish: {
      tr: 'Bahariye (Süreyya Operası)',
      en: 'Bahariye (opera house)',
      de: 'Bahariye (Oper)',
      ru: 'Bahariye (оперный театр)',
      ar: 'شارع Bahariye (دار الأوبرا)',
      fa: 'خیابان Bahariye (ساختمان اپرا)',
    },
    waypoints: [
      [40.9927, 29.0230], // Kadıköy İskelesi
      [40.9906, 29.0253], // Kadıköy Çarşı (Fischmarkt)
      [40.9899, 29.0290], // Altıyol (Stier-Statue)
      [40.9877, 29.0300], // Bahariye Caddesi, Süreyya Operası
    ],
  },
  {
    id: 'kalamis-fenerbahce',
    regionId: 'kadikoy',
    icon: '🌳',
    name: {
      tr: 'Kalamış ve Fenerbahçe Parkı',
      en: 'Kalamış & Fenerbahçe Park',
      de: 'Kalamış und Fenerbahçe-Park',
      ru: 'Kalamış и парк Fenerbahçe',
      ar: 'Kalamış وحديقة Fenerbahçe',
      fa: 'Kalamış و پارک Fenerbahçe',
    },
    story: {
      tr: 'Tekneler, deniz havası ve kocaman yeşil bir park. Burada çok kedi yaşar.',
      en: 'Boats, sea air and a big green park. Many cats live here.',
      de: 'Boote, Meeresluft und ein großer grüner Park. Hier leben viele Katzen.',
      ru: 'Лодки, морской воздух и большой зелёный парк. Здесь живёт много кошек.',
      ar: 'قوارب وهواء البحر وحديقة خضراء كبيرة. تعيش هنا قطط كثيرة.',
      fa: 'قایق‌ها، هوای دریا و یک پارک سبز بزرگ. اینجا گربه‌های زیادی زندگی می‌کنند.',
    },
    start: {
      tr: 'Yoğurtçu Parkı',
      en: 'Yoğurtçu Park',
      de: 'Yoğurtçu-Park',
      ru: 'Парк Yoğurtçu',
      ar: 'حديقة Yoğurtçu',
      fa: 'پارک Yoğurtçu',
    },
    finish: {
      tr: 'Fenerbahçe Parkı',
      en: 'Fenerbahçe Park',
      de: 'Fenerbahçe-Park',
      ru: 'Парк Fenerbahçe',
      ar: 'حديقة Fenerbahçe',
      fa: 'پارک Fenerbahçe',
    },
    waypoints: [
      [40.9855, 29.0356], // Yoğurtçu Parkı
      [40.9785, 29.0383], // Kalamış Parkı
      [40.9730, 29.0398], // Kalamış, am Yachthafen
      [40.9672, 29.0372], // Fenerbahçe Parkı
    ],
  },
];
