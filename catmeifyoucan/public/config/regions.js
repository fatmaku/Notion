// Cat Me If You Can – Spielregionen.
//
// Eine Region ist ein Stadtteil, in dem gefangen werden darf. Kadıköy ist die erste; weitere
// (Beşiktaş, Cihangir, Üsküdar …) kommen als neuer Eintrag in REGIONS dazu – Engine, Karte,
// Statistik und Gutscheine arbeiten pro Region.
//
// Geometrie: `polygon` ist eine vereinfachte Bezirksgrenze (lat, lon), `bufferM` gleicht
// GPS-Ungenauigkeit am Rand aus. Die Mahalle-Zuordnung nimmt das nächste Mahalle-Zentrum
// (Voronoi-Näherung). Für den Produktivbetrieb die offiziellen Mahalle-Polygone
// (OSM admin_level=8 / Kadıköy Belediyesi Açık Veri) als `polygon` je Mahalle eintragen –
// `findDistrict` nutzt sie dann automatisch statt der Zentren.

export const REGIONS = [
  {
    id: 'kadikoy',
    name: 'Kadıköy',
    city: 'İstanbul',
    timezone: 'Europe/Istanbul',
    center: [40.9845, 29.0570],
    zoom: 14,
    bufferM: 250,
    polygon: [
      [41.0040, 29.0135], [41.0105, 29.0250], [41.0170, 29.0390], [41.0160, 29.0520],
      [41.0100, 29.0640], [41.0040, 29.0760], [40.9965, 29.0860], [40.9880, 29.0975],
      [40.9810, 29.1080], [40.9700, 29.1120], [40.9600, 29.1085], [40.9530, 29.0990],
      [40.9560, 29.0830], [40.9605, 29.0660], [40.9635, 29.0480], [40.9640, 29.0360],
      [40.9700, 29.0300], [40.9775, 29.0220], [40.9850, 29.0200], [40.9905, 29.0185],
      [40.9975, 29.0140],
    ],
    districts: [
      { id: 'caferaga', name: 'Caferağa', aka: 'Moda', center: [40.9845, 29.0265] },
      { id: 'osmanaga', name: 'Osmanağa', aka: 'Çarşı · Bahariye', center: [40.9905, 29.0295] },
      { id: 'rasimpasa', name: 'Rasimpaşa', aka: 'Yeldeğirmeni', center: [40.9975, 29.0235] },
      { id: 'hasanpasa', name: 'Hasanpaşa', center: [40.9960, 29.0390] },
      { id: 'zuhtupasa', name: 'Zühtüpaşa', center: [40.9790, 29.0420] },
      { id: 'fenerbahce', name: 'Fenerbahçe', aka: 'Fener · Kalamış', center: [40.9705, 29.0385] },
      { id: 'kosuyolu', name: 'Koşuyolu', center: [41.0105, 29.0420] },
      { id: 'acibadem', name: 'Acıbadem', center: [41.0055, 29.0520] },
      { id: 'egitim', name: 'Eğitim', center: [40.9930, 29.0500] },
      { id: 'feneryolu', name: 'Feneryolu', center: [40.9790, 29.0555] },
      { id: 'fikirtepe', name: 'Fikirtepe', center: [40.9965, 29.0600] },
      { id: 'dumlupinar', name: 'Dumlupınar', center: [41.0000, 29.0680] },
      { id: 'merdivenkoy', name: 'Merdivenköy', center: [40.9925, 29.0740] },
      { id: 'ondokuzmayis', name: '19 Mayıs', center: [40.9850, 29.0735] },
      { id: 'goztepe', name: 'Göztepe', center: [40.9765, 29.0645] },
      { id: 'caddebostan', name: 'Caddebostan', center: [40.9640, 29.0690] },
      { id: 'erenkoy', name: 'Erenköy', center: [40.9715, 29.0790] },
      { id: 'sahrayicedit', name: 'Sahrayıcedit', center: [40.9800, 29.0880] },
      { id: 'suadiye', name: 'Suadiye', center: [40.9605, 29.0840] },
      { id: 'kozyatagi', name: 'Kozyatağı', center: [40.9745, 29.0985] },
      { id: 'bostanci', name: 'Bostancı', center: [40.9580, 29.0980] },
    ],
  },
];

export function regionById(id) {
  return REGIONS.find((r) => r.id === id) || null;
}
