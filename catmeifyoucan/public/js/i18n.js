// Cat Me If You Can – Oberflächentexte TR (Standard) / DE / EN.
// Neue Sprache: Block in STRINGS ergänzen + LANGS in core/taxonomy.js. Fehlende Schlüssel fallen auf TR zurück.

import { label as enumLabel } from '../core/taxonomy.js';

const STRINGS = {
  tr: {
    'app.name': 'Cat Me If You Can',
    'app.slogan': 'Yakalayabilirsen yakala!',
    'app.region': 'Kadıköy',
    'nav.today': 'Bugün', 'nav.dex': 'KediDex', 'nav.catch': 'Yakala', 'nav.map': 'Harita', 'nav.stats': 'Kadıköy',
    'onb.title': 'Kadıköy’ün sokak kedilerini topla',
    'onb.lead': 'Fotoğrafla, yakala, KediDex’ini doldur. Bir günde 20 farklı kedi = partner kafede %20 indirim. Her fotoğraf aynı zamanda kedilerin sağlık kaydına katkı.',
    'onb.rule1': '📸 Sadece fotoğraf: kovalamak, dokunmak, korkutmak yok.',
    'onb.rule2': '🐾 Sadece sokak kedileri sayılır – ev kedileri değil.',
    'onb.rule3': '🙈 İnsanları ve evlerin içini çekme.',
    'onb.rule4': '🩹 Hasta bir kedi mi gördün? Bildir – gönüllüler görsün.',
    'onb.nick': 'Takma adın', 'onb.nickPh': 'ör. ModaKaşifi', 'onb.start': 'Başla', 'onb.lang': 'Dil',
    'onb.demo': 'Demo modu: veriler sadece bu cihazda saklanır.',
    'home.goal': '{n} / {goal} kedi', 'home.left': 'İndirime {n} kedi kaldı', 'home.reached': 'Hedef tamam! İndirimin hazır ☕',
    'home.showVoucher': 'Kuponu göster', 'home.claimVoucher': 'Kuponu al', 'home.quests': 'Günün görevleri',
    'home.todayCats': 'Bugün yakaladıkların', 'home.none': 'Bugün henüz kedi yok. Hadi sokağa! 🐾', 'home.cafes': 'Partner kafeler',
    'home.help': '{n} kedi yardım bekliyor', 'home.level': 'Seviye {n}',
    'quest.count': '{n} farklı kedi yakala', 'quest.pattern': '{n} × {pattern} yakala', 'quest.district': '{district}’da bir kedi yakala',
    'quest.districts': '{n} farklı mahallede yakala', 'quest.new': 'Yeni bir kedi keşfet', 'quest.early': 'Saat 9’dan önce bir kedi', 'quest.evening': 'Akşam 19’dan sonra {n} kedi',
    'catch.searching': 'Kedi aranıyor…', 'catch.found': 'Kedi! {p}%', 'catch.noAr': 'AR kapalı', 'catch.locating': 'Konum alınıyor…',
    'catch.gpsWeak': 'GPS zayıf (±{m} m)', 'catch.simulated': 'Konum simülasyonu', 'catch.shoot': 'Yakala!', 'catch.gallery': 'Galeri',
    'catch.galleryHint': 'Galeriden yüklenen fotoğraflar kayda geçer ama oyunda sayılmaz.', 'catch.analyzing': 'Analiz ediliyor…',
    'catch.fun1': 'Bıyıklar sayılıyor…', 'catch.fun2': 'Patiler ölçülüyor…', 'catch.fun3': 'Mırlama frekansı hesaplanıyor…', 'catch.fun4': 'KediDex karıştırılıyor…',
    'catch.noCamera': 'Kameraya erişilemedi. Telefonunun kamerasıyla çek:', 'catch.nativeCamera': 'Kamerayı aç',
    'catch.https': 'Kamera için HTTPS gerekli.', 'catch.cooldown': 'Kedileri biraz rahat bırak 😺 {s} sn',
    'card.new': 'YENİ KEDİ!', 'card.firstFinder': 'Bu kediyi ilk sen buldun – ona bir isim ver!', 'card.again': 'Tekrar görüldü',
    'card.namePh': 'İsim ver…', 'card.saveName': 'Kaydet', 'card.unnamed': 'İsimsiz', 'card.age': 'Yaş', 'card.weight': 'Kilo', 'card.condition': 'Kondisyon',
    'card.sex': 'Cinsiyet', 'card.ear': 'Kulak', 'card.health': 'Sağlık', 'card.behavior': 'Davranış', 'card.place': 'Yer', 'card.type': 'Tür',
    'card.breed': 'Irk tahmini', 'card.eyes': 'Gözler', 'card.marks': 'Belirgin özellikler', 'card.disclaimer': 'Fotoğraftan tahmin – veteriner muayenesinin yerini tutmaz.',
    'card.simple': 'Basit analiz (yapay zekâ kapalı): yaş, kilo ve sağlık değerlendirilmedi.', 'card.continue': 'Yakalamaya devam', 'card.profile': 'Kedi profili',
    'card.notThis': 'Bu o kedi değil', 'card.notCounted': 'Kayda geçti, oyunda sayılmadı: {why}', 'card.xp': '+{n} XP', 'card.progress': 'Bugün {n}/{goal}',
    'card.ideas': 'Öneriler', 'card.levelUp': 'Seviye atladın! {n}', 'card.badge': 'Yeni rozet: {name}', 'card.quest': 'Görev tamam: {name}',
    'card.namedBy': 'İsmi veren: {name}', 'card.discoveredBy': 'Keşfeden: {name}', 'card.years': 'yaş', 'card.months': 'ay',
    'why.gallery': 'galeriden', 'why.gps_inaccurate': 'GPS çok zayıf', 'why.stale_photo': 'fotoğraf eski', 'why.impossible_travel': 'imkânsız hız',
    'err.no_cat': 'Hmm… burada kedi göremedim 🤔', 'err.pet_cat': 'Bu bir ev kedisi gibi görünüyor 🏠 Sadece sokak kedileri sayılır.',
    'err.not_live_photo': 'Ekran ya da çıktı değil, gerçek bir kedi çek 😉', 'err.duplicate_photo': 'Bu fotoğraf zaten kullanıldı.',
    'err.outside_region': 'Oyun alanının dışındasın (şimdilik sadece Kadıköy).', 'err.cooldown': 'Biraz bekle: {s} sn', 'err.daily_limit': 'Bugünlük yeter – yarın devam!',
    'err.name_not_allowed': 'Bu isim uygun değil. Lütfen kibar bir isim seç.', 'err.name_reserved': 'Bu isim ayrılmış.', 'err.nickname_taken': 'Bu takma ad alınmış.',
    'err.invalid_nickname': 'Takma ad 2–20 karakter olmalı.', 'err.invalid_name': 'İsim 2–20 karakter olmalı.', 'err.already_named': 'Bu kedinin zaten bir ismi var.',
    'err.not_allowed': 'İsmi sadece kâşif verebilir (ilk 24 saat).', 'err.goal_not_reached': 'Kupon için {n} kedi daha.', 'err.network': 'Bağlantı yok. Tekrar dene.',
    'err.location': 'Konum gerekli. Lütfen konum iznini aç.', 'err.text_not_allowed': 'Lütfen kaba ifadeler kullanma.', 'err.generic': 'Bir şeyler ters gitti.',
    'err.rate_limited': 'Çok hızlı – biraz bekle.', 'err.already_reported': 'Bugün zaten bildirdin.', 'err.login_required': 'Önce takma ad seç.',
    'dex.mine': 'Benim', 'dex.all': 'Tüm Kadıköy', 'dex.types': 'Türler', 'dex.empty': 'KediDex’in boş. İlk kediyi yakala!',
    'dex.filter.district': 'Mahalle', 'dex.filter.status': 'Durum', 'dex.filter.pattern': 'Tür', 'dex.filter.any': 'Hepsi', 'dex.sort': 'Sırala',
    'sort.recent': 'Son görülen', 'sort.popular': 'En çok görülen', 'sort.newest': 'En yeni', 'sort.rarity': 'Nadirlik', 'sort.name': 'İsim',
    'dex.caught': '{n}× yakalandı', 'dex.lastSeen': 'Son: {t}', 'dex.count': '{n} kedi',
    'cat.facts': 'Bilgiler', 'cat.history': 'Kondisyon geçmişi', 'cat.sightings': 'Görülmeler', 'cat.catchers': 'Avcılar', 'cat.log': 'Kayıt',
    'cat.reportHelp': 'Yardım bildir', 'cat.helpPh': 'Ne gördün? (ör. sol gözü kapalı, topallıyor)', 'cat.send': 'Gönder', 'cat.setStatus': 'Durumu değiştir',
    'cat.statusNote': 'Not (ör. veterinere götürüldü)', 'cat.firstSeen': 'İlk görülme', 'cat.lastSeen': 'Son görülme', 'cat.seenTimes': '{n} kez görüldü',
    'cat.byPlayers': '{n} avcı', 'cat.discoverer': 'Kâşif', 'cat.namer': 'İsim babası/annesi', 'cat.helpSent': 'Teşekkürler! Gönüllüler bilgilendirildi.',
    'cat.legend': 'Kadıköy Efsanesi', 'cat.demo': 'DEMO', 'cat.review': 'İnceleniyor',
    'ev.named': 'isim verildi', 'ev.status': 'durum', 'ev.help_report': 'yardım bildirimi', 'ev.auto_flag': 'sağlık uyarısı (yapay zekâ)', 'ev.merged': 'birleştirildi',
    'ev.split': 'ayrıldı', 'ev.legend': 'efsane oldu', 'ev.renamed': 'yeniden adlandırıldı',
    'map.cats': 'Kediler', 'map.cafes': 'Kafeler', 'map.food': 'Mama/su', 'map.heat': 'Yoğunluk', 'map.suggest': 'Mama noktası öner',
    'map.tapToPlace': 'Haritada yere dokun', 'map.suggestSent': 'Teşekkürler! Moderasyon onaylayınca görünür.', 'map.offline': 'Harita yüklenemedi – liste görünümü:',
    'map.fuzzy': 'Kedileri korumak için konumlar ~100 m yuvarlanmıştır.',
    'stats.title': 'Kadıköy’ün kedileri', 'stats.cats': 'Kayıtlı kedi', 'stats.seen7': 'Son 7 günde görülen', 'stats.help': 'Yardım bekliyor',
    'stats.tnr': 'Kısırlaştırılmış (kulak)', 'stats.bcs': 'Ort. kondisyon (1–9)', 'stats.obs': 'Gözlem', 'stats.active': 'Bugün aktif avcı', 'stats.vouchers': 'Kullanılan kupon',
    'stats.perDay': 'Günlük gözlemler (30 gün)', 'stats.patterns': 'Türlere göre', 'stats.ages': 'Yaş grupları', 'stats.health': 'Sağlık durumu',
    'stats.hours': 'Günün saatine göre', 'stats.bcsDist': 'Kondisyon', 'stats.districts': 'Mahalleler', 'stats.flags': 'Görülen sağlık sorunları',
    'stats.table': 'Tablo', 'stats.chart': 'Grafik', 'stats.export': 'Açık veri', 'stats.leaderboard': 'Sıralama', 'stats.helpRadar': 'Yardım radarı',
    'stats.col.district': 'Mahalle', 'stats.col.cats': 'Kedi', 'stats.col.obs': 'Gözlem', 'stats.col.help': 'Yardım', 'stats.col.tnr': 'TNR %', 'stats.col.bcs': 'Kond.',
    'lb.day': 'Bugün', 'lb.week': 'Bu hafta', 'lb.all': 'Tüm zamanlar', 'lb.xp': 'XP', 'lb.discoveries': 'Keşifler', 'lb.cats': 'Kediler', 'lb.empty': 'Henüz kimse yok.',
    'help.empty': 'Şu an yardım bekleyen kedi yok 💚', 'help.lead': 'Gönüllüler ve veterinerler için: yardım gerektiğine dair işaret olan kediler.',
    'v.title': 'Kedi kuponu', 'v.discount': '%{n} İNDİRİM', 'v.show': 'Kasada göster – personel kodu tarar.', 'v.validUntil': 'Bugün {t}’e kadar geçerli',
    'v.cats': 'Bugün {n} kedi', 'v.redeemed': 'Kullanıldı ✓', 'v.expired': 'Süresi doldu', 'v.partners': 'Geçerli olduğu yerler', 'v.notYet': 'Henüz kupon yok',
    'v.demoRedeem': 'Demo: kafe olarak onayla', 'v.needs': '{n} kedi', 'v.code': 'Kod',
    'p.badges': 'Rozetler', 'p.stats': 'İstatistiklerim', 'p.recent': 'Son yakalamalar', 'p.settings': 'Ayarlar', 'p.lang': 'Dil', 'p.nick': 'Takma ad',
    'p.ar': 'AR kedi algılama (cihazda)', 'p.reset': 'Bu cihazdaki hesabı sil', 'p.resetConfirm': 'Emin misin? Bu cihazdaki giriş silinir.', 'p.save': 'Kaydet',
    'p.rules': 'Kurallar & gizlilik', 'p.partner': 'Kafe girişi', 'p.admin': 'Moderasyon', 'p.role.volunteer': 'Gönüllü', 'p.role.admin': 'Moderatör',
    'm.catches': 'Yakalama', 'm.uniqueCats': 'Farklı kedi', 'm.discoveries': 'Keşif', 'm.districts': 'Mahalle', 'm.goalDays': 'Hedef günü', 'm.maxStreak': 'En uzun seri', 'm.currentStreak': 'Seri',
    'rules.title': 'Kediye dost kurallar',
    'rules.body': 'Cat Me If You Can bir fotoğraf oyunudur. Kediler ödül değil, komşularımız.\n• Mesafeni koru: kovalama, sıkıştırma, kucaklama yok.\n• Uyuyan ya da yemek yiyen kediyi rahatsız etme; flaş kullanma.\n• Beslemek istersen sadece kedi maması ve temiz su ver.\n• Ev kedileri ve iç mekânlar sayılmaz.\n• İnsanları, plakaları, ev içlerini çekme.',
    'rules.privacy': 'Gizlilik',
    'rules.privacyBody': 'Kaydettiğimiz: takma adın, yakaladığın kedilerin fotoğrafları ve konumları. Herkese açık sayfada sadece kedinin kesilmiş fotoğrafı ve ~100 m’ye yuvarlanmış konum görünür. Tam fotoğraf yalnızca moderasyon içindir. Hesabını silmek istersen bize yaz.',
    'rules.ai': 'Analiz yapay zekâ ile yapılır ve hata yapabilir. Yaş, kilo ve sağlık birer tahmindir.',
    'common.back': 'Geri', 'common.close': 'Kapat', 'common.cancel': 'Vazgeç', 'common.ok': 'Tamam', 'common.loading': 'Yükleniyor…', 'common.retry': 'Tekrar dene',
    'common.km': '{n} km', 'common.m': '{n} m', 'common.now': 'şimdi', 'common.minAgo': '{n} dk önce', 'common.hAgo': '{n} sa önce', 'common.dAgo': '{n} gün önce',
    'common.demo': 'Demo', 'common.unknown': 'bilinmiyor', 'common.more': 'Daha fazla', 'common.yes': 'Evet', 'common.no': 'Hayır',
    'status.icon.active': '🟢', 'status.icon.needs_help': '🆘', 'status.icon.in_care': '🩺', 'status.icon.adopted': '🏡', 'status.icon.missing': '❔', 'status.icon.deceased': '🕊️',
  },
  de: {
    'app.slogan': 'Fang mich, wenn du kannst!',
    'nav.today': 'Heute', 'nav.dex': 'KediDex', 'nav.catch': 'Fangen', 'nav.map': 'Karte', 'nav.stats': 'Kadıköy',
    'onb.title': 'Sammle die Straßenkatzen von Kadıköy',
    'onb.lead': 'Fotografieren, fangen, KediDex füllen. 20 verschiedene Katzen an einem Tag = 20 % Rabatt im Partner-Café. Jedes Foto hilft gleichzeitig, den Zustand der Katzen zu erfassen.',
    'onb.rule1': '📸 Nur Fotos: nicht jagen, nicht anfassen, nicht erschrecken.',
    'onb.rule2': '🐾 Nur Straßenkatzen zählen – keine Hauskatzen.',
    'onb.rule3': '🙈 Keine Menschen und keine Wohnungen fotografieren.',
    'onb.rule4': '🩹 Kranke Katze gesehen? Melden – Freiwillige sehen es.',
    'onb.nick': 'Dein Spitzname', 'onb.nickPh': 'z. B. ModaEntdecker', 'onb.start': 'Los geht’s', 'onb.lang': 'Sprache',
    'onb.demo': 'Demo-Modus: Daten bleiben nur auf diesem Gerät.',
    'home.goal': '{n} / {goal} Katzen', 'home.left': 'Noch {n} Katze bis zum Rabatt|Noch {n} Katzen bis zum Rabatt', 'home.reached': 'Tagesziel geschafft! Dein Rabatt wartet ☕',
    'home.showVoucher': 'Gutschein zeigen', 'home.claimVoucher': 'Gutschein holen', 'home.quests': 'Tagesaufgaben',
    'home.todayCats': 'Heute gefangen', 'home.none': 'Heute noch keine Katze. Raus auf die Straße! 🐾', 'home.cafes': 'Partner-Cafés',
    'home.help': '{n} Katze braucht Hilfe|{n} Katzen brauchen Hilfe', 'home.level': 'Level {n}',
    'quest.count': 'Fange {n} Katze|Fange {n} verschiedene Katzen', 'quest.pattern': 'Fange {n} × {pattern}', 'quest.district': 'Fange eine Katze in {district}',
    'quest.districts': 'Fange in {n} Mahalle|Fange in {n} verschiedenen Mahalle', 'quest.new': 'Entdecke eine neue Katze', 'quest.early': 'Eine Katze vor 9 Uhr', 'quest.evening': '{n} Katze nach 19 Uhr|{n} Katzen nach 19 Uhr',
    'catch.searching': 'Suche Katze…', 'catch.found': 'Katze! {p} %', 'catch.noAr': 'AR aus', 'catch.locating': 'Standort wird ermittelt…',
    'catch.gpsWeak': 'GPS schwach (±{m} m)', 'catch.simulated': 'Standort simuliert', 'catch.shoot': 'Fangen!', 'catch.gallery': 'Galerie',
    'catch.galleryHint': 'Fotos aus der Galerie werden erfasst, zählen aber nicht im Spiel.', 'catch.analyzing': 'Wird analysiert…',
    'catch.fun1': 'Schnurrhaare werden gezählt…', 'catch.fun2': 'Pfoten werden vermessen…', 'catch.fun3': 'Schnurrfrequenz wird berechnet…', 'catch.fun4': 'KediDex wird durchblättert…',
    'catch.noCamera': 'Kein Kamerazugriff. Mit der Handykamera fotografieren:', 'catch.nativeCamera': 'Kamera öffnen',
    'catch.https': 'Die Kamera braucht HTTPS.', 'catch.cooldown': 'Lass die Katzen kurz in Ruhe 😺 {s} s',
    'card.new': 'NEUE KATZE!', 'card.firstFinder': 'Du hast sie als Erste:r gefunden – gib ihr einen Namen!', 'card.again': 'Wiedergesehen',
    'card.namePh': 'Name…', 'card.saveName': 'Speichern', 'card.unnamed': 'Namenlos', 'card.age': 'Alter', 'card.weight': 'Gewicht', 'card.condition': 'Ernährungszustand',
    'card.sex': 'Geschlecht', 'card.ear': 'Ohr', 'card.health': 'Gesundheit', 'card.behavior': 'Verhalten', 'card.place': 'Ort', 'card.type': 'Typ',
    'card.breed': 'Rasse (Tipp)', 'card.eyes': 'Augen', 'card.marks': 'Erkennungsmerkmale', 'card.disclaimer': 'Schätzung aus dem Foto – ersetzt keine Untersuchung beim Tierarzt.',
    'card.simple': 'Einfache Analyse (KI aus): Alter, Gewicht und Gesundheit nicht bewertet.', 'card.continue': 'Weiter fangen', 'card.profile': 'Katzenprofil',
    'card.notThis': 'Das ist nicht diese Katze', 'card.notCounted': 'Erfasst, zählt aber nicht: {why}', 'card.xp': '+{n} XP', 'card.progress': 'Heute {n}/{goal}',
    'card.ideas': 'Vorschläge', 'card.levelUp': 'Level aufgestiegen! {n}', 'card.badge': 'Neues Abzeichen: {name}', 'card.quest': 'Aufgabe erledigt: {name}',
    'card.namedBy': 'Benannt von {name}', 'card.discoveredBy': 'Entdeckt von {name}', 'card.years': 'Jahre', 'card.months': 'Monate',
    'why.gallery': 'aus der Galerie', 'why.gps_inaccurate': 'GPS zu ungenau', 'why.stale_photo': 'Foto zu alt', 'why.impossible_travel': 'unmögliche Geschwindigkeit',
    'err.no_cat': 'Hmm… hier sehe ich keine Katze 🤔', 'err.pet_cat': 'Das sieht nach einer Hauskatze aus 🏠 Hier zählen nur Straßenkatzen.',
    'err.not_live_photo': 'Bitte eine echte Katze fotografieren, keinen Bildschirm 😉', 'err.duplicate_photo': 'Dieses Foto wurde schon verwendet.',
    'err.outside_region': 'Du bist außerhalb des Spielgebiets (vorerst nur Kadıköy).', 'err.cooldown': 'Kurz warten: {s} s', 'err.daily_limit': 'Genug für heute – morgen geht’s weiter!',
    'err.name_not_allowed': 'Dieser Name ist nicht erlaubt. Bitte wähle einen freundlichen Namen.', 'err.name_reserved': 'Dieser Name ist reserviert.', 'err.nickname_taken': 'Spitzname schon vergeben.',
    'err.invalid_nickname': 'Spitzname: 2–20 Zeichen.', 'err.invalid_name': 'Name: 2–20 Zeichen.', 'err.already_named': 'Die Katze hat schon einen Namen.',
    'err.not_allowed': 'Nur wer sie entdeckt hat, darf sie benennen (erste 24 h).', 'err.goal_not_reached': 'Noch {n} Katze bis zum Gutschein.|Noch {n} Katzen bis zum Gutschein.', 'err.network': 'Keine Verbindung. Nochmal versuchen.',
    'err.location': 'Standort nötig. Bitte Standortfreigabe erlauben.', 'err.text_not_allowed': 'Bitte ohne Schimpfwörter.', 'err.generic': 'Da ist etwas schiefgelaufen.',
    'err.rate_limited': 'Zu schnell – kurz warten.', 'err.already_reported': 'Heute schon gemeldet.', 'err.login_required': 'Bitte erst einen Spitznamen wählen.',
    'dex.mine': 'Meine', 'dex.all': 'Ganz Kadıköy', 'dex.types': 'Typen', 'dex.empty': 'Dein KediDex ist leer. Fang deine erste Katze!',
    'dex.filter.district': 'Mahalle', 'dex.filter.status': 'Status', 'dex.filter.pattern': 'Typ', 'dex.filter.any': 'Alle', 'dex.sort': 'Sortieren',
    'sort.recent': 'Zuletzt gesehen', 'sort.popular': 'Am häufigsten', 'sort.newest': 'Neueste', 'sort.rarity': 'Seltenheit', 'sort.name': 'Name',
    'dex.caught': '{n}× gefangen', 'dex.lastSeen': 'Zuletzt: {t}', 'dex.count': '{n} Katze|{n} Katzen',
    'cat.facts': 'Steckbrief', 'cat.history': 'Verlauf Ernährungszustand', 'cat.sightings': 'Sichtungen', 'cat.catchers': 'Fänger:innen', 'cat.log': 'Protokoll',
    'cat.reportHelp': 'Hilfe melden', 'cat.helpPh': 'Was hast du gesehen? (z. B. linkes Auge zu, humpelt)', 'cat.send': 'Senden', 'cat.setStatus': 'Status ändern',
    'cat.statusNote': 'Notiz (z. B. zum Tierarzt gebracht)', 'cat.firstSeen': 'Erstmals gesehen', 'cat.lastSeen': 'Zuletzt gesehen', 'cat.seenTimes': '{n}× gesehen',
    'cat.byPlayers': '{n} Fänger:in|{n} Fänger:innen', 'cat.discoverer': 'Entdecker:in', 'cat.namer': 'Namensgeber:in', 'cat.helpSent': 'Danke! Freiwillige wurden informiert.',
    'cat.legend': 'Kadıköy-Legende', 'cat.demo': 'DEMO', 'cat.review': 'Wird geprüft',
    'ev.named': 'benannt', 'ev.status': 'Status', 'ev.help_report': 'Hilfe gemeldet', 'ev.auto_flag': 'Gesundheitshinweis (KI)', 'ev.merged': 'zusammengeführt',
    'ev.split': 'abgetrennt', 'ev.legend': 'zur Legende ernannt', 'ev.renamed': 'umbenannt',
    'map.cats': 'Katzen', 'map.cafes': 'Cafés', 'map.food': 'Futter/Wasser', 'map.heat': 'Dichte', 'map.suggest': 'Futterstelle vorschlagen',
    'map.tapToPlace': 'Tippe auf die Karte', 'map.suggestSent': 'Danke! Sichtbar, sobald die Moderation zustimmt.', 'map.offline': 'Karte nicht geladen – Liste:',
    'map.fuzzy': 'Zum Schutz der Katzen sind Positionen auf ~100 m gerundet.',
    'stats.title': 'Die Katzen von Kadıköy', 'stats.cats': 'Erfasste Katzen', 'stats.seen7': 'In 7 Tagen gesehen', 'stats.help': 'Brauchen Hilfe',
    'stats.tnr': 'Kastriert (Ohrmarke)', 'stats.bcs': 'Ø Ernährungszustand (1–9)', 'stats.obs': 'Sichtungen', 'stats.active': 'Heute aktiv', 'stats.vouchers': 'Eingelöste Gutscheine',
    'stats.perDay': 'Sichtungen pro Tag (30 Tage)', 'stats.patterns': 'Nach Typ', 'stats.ages': 'Altersgruppen', 'stats.health': 'Gesundheitszustand',
    'stats.hours': 'Nach Tageszeit', 'stats.bcsDist': 'Ernährungszustand', 'stats.districts': 'Mahalle', 'stats.flags': 'Gesehene Gesundheitsprobleme',
    'stats.table': 'Tabelle', 'stats.chart': 'Diagramm', 'stats.export': 'Offene Daten', 'stats.leaderboard': 'Rangliste', 'stats.helpRadar': 'Hilfe-Radar',
    'stats.col.district': 'Mahalle', 'stats.col.cats': 'Katzen', 'stats.col.obs': 'Sichtungen', 'stats.col.help': 'Hilfe', 'stats.col.tnr': 'TNR %', 'stats.col.bcs': 'BCS',
    'lb.day': 'Heute', 'lb.week': 'Diese Woche', 'lb.all': 'Gesamt', 'lb.xp': 'XP', 'lb.discoveries': 'Entdeckungen', 'lb.cats': 'Katzen', 'lb.empty': 'Noch niemand.',
    'help.empty': 'Gerade braucht keine Katze Hilfe 💚', 'help.lead': 'Für Freiwillige und Tierärzt:innen: Katzen mit Hinweisen auf Hilfebedarf.',
    'v.title': 'Katzen-Gutschein', 'v.discount': '{n} % RABATT', 'v.show': 'An der Kasse zeigen – das Personal scannt den Code.', 'v.validUntil': 'Gültig heute bis {t}',
    'v.cats': 'Heute {n} Katze|Heute {n} Katzen', 'v.redeemed': 'Eingelöst ✓', 'v.expired': 'Abgelaufen', 'v.partners': 'Gültig bei', 'v.notYet': 'Noch kein Gutschein',
    'v.demoRedeem': 'Demo: als Café einlösen', 'v.needs': '{n} Katze|{n} Katzen', 'v.code': 'Code',
    'p.badges': 'Abzeichen', 'p.stats': 'Meine Zahlen', 'p.recent': 'Letzte Fänge', 'p.settings': 'Einstellungen', 'p.lang': 'Sprache', 'p.nick': 'Spitzname',
    'p.ar': 'AR-Katzenerkennung (auf dem Gerät)', 'p.reset': 'Konto auf diesem Gerät löschen', 'p.resetConfirm': 'Sicher? Die Anmeldung auf diesem Gerät wird gelöscht.', 'p.save': 'Speichern',
    'p.rules': 'Regeln & Datenschutz', 'p.partner': 'Café-Login', 'p.admin': 'Moderation', 'p.role.volunteer': 'Freiwillige:r', 'p.role.admin': 'Moderation',
    'm.catches': 'Fänge', 'm.uniqueCats': 'Verschiedene Katzen', 'm.discoveries': 'Entdeckungen', 'm.districts': 'Mahalle', 'm.goalDays': 'Zieltage', 'm.maxStreak': 'Längste Serie', 'm.currentStreak': 'Serie',
    'rules.title': 'Katzenfreundliche Regeln',
    'rules.body': 'Cat Me If You Can ist ein Fotospiel. Katzen sind keine Beute, sondern unsere Nachbarn.\n• Abstand halten: nicht jagen, nicht in die Enge treiben, nicht hochheben.\n• Schlafende oder fressende Katzen nicht stören; kein Blitz.\n• Wer füttern will: nur Katzenfutter und frisches Wasser.\n• Hauskatzen und Innenräume zählen nicht.\n• Keine Menschen, Kennzeichen oder Wohnungen fotografieren.',
    'rules.privacy': 'Datenschutz',
    'rules.privacyBody': 'Wir speichern: deinen Spitznamen, Fotos und Standorte der Katzen, die du fängst. Öffentlich sichtbar sind nur der Katzen-Ausschnitt und auf ~100 m gerundete Positionen. Das ganze Foto sieht nur die Moderation. Löschung auf Anfrage.',
    'rules.ai': 'Die Analyse macht eine KI und kann sich irren. Alter, Gewicht und Gesundheit sind Schätzungen.',
    'common.back': 'Zurück', 'common.close': 'Schließen', 'common.cancel': 'Abbrechen', 'common.ok': 'OK', 'common.loading': 'Lädt…', 'common.retry': 'Nochmal',
    'common.km': '{n} km', 'common.m': '{n} m', 'common.now': 'gerade', 'common.minAgo': 'vor {n} Min.', 'common.hAgo': 'vor {n} Std.', 'common.dAgo': 'vor {n} Tag|vor {n} Tagen',
    'common.demo': 'Demo', 'common.unknown': 'unbekannt', 'common.more': 'Mehr', 'common.yes': 'Ja', 'common.no': 'Nein',
  },
  en: {
    'app.slogan': 'Cat me if you can!',
    'nav.today': 'Today', 'nav.dex': 'KediDex', 'nav.catch': 'Catch', 'nav.map': 'Map', 'nav.stats': 'Kadıköy',
    'onb.title': 'Collect the street cats of Kadıköy',
    'onb.lead': 'Snap, catch, fill your KediDex. 20 different cats in one day = 20% off at a partner café. Every photo also feeds a welfare record of the cats.',
    'onb.rule1': '📸 Photos only: no chasing, touching or scaring.',
    'onb.rule2': '🐾 Only street cats count – no pets.',
    'onb.rule3': '🙈 Don’t photograph people or the inside of homes.',
    'onb.rule4': '🩹 Seen a sick cat? Report it so volunteers can help.',
    'onb.nick': 'Your nickname', 'onb.nickPh': 'e.g. ModaExplorer', 'onb.start': 'Let’s go', 'onb.lang': 'Language',
    'onb.demo': 'Demo mode: data stays on this device only.',
    'home.goal': '{n} / {goal} cats', 'home.left': '{n} cat to go for your discount|{n} cats to go for your discount', 'home.reached': 'Goal reached! Your discount is ready ☕',
    'home.showVoucher': 'Show voucher', 'home.claimVoucher': 'Get voucher', 'home.quests': 'Daily quests',
    'home.todayCats': 'Caught today', 'home.none': 'No cats yet today. Hit the streets! 🐾', 'home.cafes': 'Partner cafés',
    'home.help': '{n} cat needs help|{n} cats need help', 'home.level': 'Level {n}',
    'quest.count': 'Catch {n} cat|Catch {n} different cats', 'quest.pattern': 'Catch {n} × {pattern}', 'quest.district': 'Catch a cat in {district}',
    'quest.districts': 'Catch in {n} neighbourhood|Catch in {n} different neighbourhoods', 'quest.new': 'Discover a new cat', 'quest.early': 'A cat before 9 am', 'quest.evening': '{n} cat after 7 pm|{n} cats after 7 pm',
    'catch.searching': 'Looking for a cat…', 'catch.found': 'Cat! {p}%', 'catch.noAr': 'AR off', 'catch.locating': 'Getting location…',
    'catch.gpsWeak': 'Weak GPS (±{m} m)', 'catch.simulated': 'Simulated location', 'catch.shoot': 'Catch!', 'catch.gallery': 'Gallery',
    'catch.galleryHint': 'Gallery photos are recorded but don’t count in the game.', 'catch.analyzing': 'Analysing…',
    'catch.fun1': 'Counting whiskers…', 'catch.fun2': 'Measuring paws…', 'catch.fun3': 'Calculating purr frequency…', 'catch.fun4': 'Flipping through the KediDex…',
    'catch.noCamera': 'No camera access. Take a photo with your phone camera:', 'catch.nativeCamera': 'Open camera',
    'catch.https': 'The camera needs HTTPS.', 'catch.cooldown': 'Give the cats a break 😺 {s} s',
    'card.new': 'NEW CAT!', 'card.firstFinder': 'You found this cat first – give it a name!', 'card.again': 'Seen again',
    'card.namePh': 'Name…', 'card.saveName': 'Save', 'card.unnamed': 'Unnamed', 'card.age': 'Age', 'card.weight': 'Weight', 'card.condition': 'Body condition',
    'card.sex': 'Sex', 'card.ear': 'Ear', 'card.health': 'Health', 'card.behavior': 'Behaviour', 'card.place': 'Place', 'card.type': 'Type',
    'card.breed': 'Breed guess', 'card.eyes': 'Eyes', 'card.marks': 'Distinctive marks', 'card.disclaimer': 'Estimated from a photo – not a substitute for a vet check.',
    'card.simple': 'Basic analysis (AI off): age, weight and health not assessed.', 'card.continue': 'Keep catching', 'card.profile': 'Cat profile',
    'card.notThis': 'That’s not this cat', 'card.notCounted': 'Recorded, but doesn’t count: {why}', 'card.xp': '+{n} XP', 'card.progress': 'Today {n}/{goal}',
    'card.ideas': 'Ideas', 'card.levelUp': 'Level up! {n}', 'card.badge': 'New badge: {name}', 'card.quest': 'Quest done: {name}',
    'card.namedBy': 'Named by {name}', 'card.discoveredBy': 'Discovered by {name}', 'card.years': 'years', 'card.months': 'months',
    'why.gallery': 'from gallery', 'why.gps_inaccurate': 'GPS too weak', 'why.stale_photo': 'photo too old', 'why.impossible_travel': 'impossible speed',
    'err.no_cat': 'Hmm… I can’t see a cat here 🤔', 'err.pet_cat': 'That looks like a pet cat 🏠 Only street cats count.',
    'err.not_live_photo': 'Photograph a real cat, not a screen 😉', 'err.duplicate_photo': 'This photo was already used.',
    'err.outside_region': 'You’re outside the play area (Kadıköy only for now).', 'err.cooldown': 'Wait a moment: {s} s', 'err.daily_limit': 'That’s enough for today – see you tomorrow!',
    'err.name_not_allowed': 'That name isn’t allowed. Please pick a kind one.', 'err.name_reserved': 'That name is reserved.', 'err.nickname_taken': 'Nickname already taken.',
    'err.invalid_nickname': 'Nickname: 2–20 characters.', 'err.invalid_name': 'Name: 2–20 characters.', 'err.already_named': 'This cat already has a name.',
    'err.not_allowed': 'Only the discoverer can name it (first 24 h).', 'err.goal_not_reached': '{n} more cat for the voucher.|{n} more cats for the voucher.', 'err.network': 'No connection. Try again.',
    'err.location': 'Location needed. Please allow location access.', 'err.text_not_allowed': 'Please keep it clean.', 'err.generic': 'Something went wrong.',
    'err.rate_limited': 'Too fast – wait a moment.', 'err.already_reported': 'Already reported today.', 'err.login_required': 'Pick a nickname first.',
    'dex.mine': 'Mine', 'dex.all': 'All of Kadıköy', 'dex.types': 'Types', 'dex.empty': 'Your KediDex is empty. Catch your first cat!',
    'dex.filter.district': 'Neighbourhood', 'dex.filter.status': 'Status', 'dex.filter.pattern': 'Type', 'dex.filter.any': 'All', 'dex.sort': 'Sort',
    'sort.recent': 'Recently seen', 'sort.popular': 'Most seen', 'sort.newest': 'Newest', 'sort.rarity': 'Rarity', 'sort.name': 'Name',
    'dex.caught': 'caught {n}×', 'dex.lastSeen': 'Last: {t}', 'dex.count': '{n} cat|{n} cats',
    'cat.facts': 'Facts', 'cat.history': 'Body condition history', 'cat.sightings': 'Sightings', 'cat.catchers': 'Catchers', 'cat.log': 'Log',
    'cat.reportHelp': 'Report help needed', 'cat.helpPh': 'What did you see? (e.g. left eye closed, limping)', 'cat.send': 'Send', 'cat.setStatus': 'Change status',
    'cat.statusNote': 'Note (e.g. taken to the vet)', 'cat.firstSeen': 'First seen', 'cat.lastSeen': 'Last seen', 'cat.seenTimes': 'seen {n}×',
    'cat.byPlayers': '{n} catcher|{n} catchers', 'cat.discoverer': 'Discoverer', 'cat.namer': 'Named it', 'cat.helpSent': 'Thank you! Volunteers have been notified.',
    'cat.legend': 'Kadıköy legend', 'cat.demo': 'DEMO', 'cat.review': 'Under review',
    'ev.named': 'named', 'ev.status': 'status', 'ev.help_report': 'help reported', 'ev.auto_flag': 'health flag (AI)', 'ev.merged': 'merged',
    'ev.split': 'split', 'ev.legend': 'became a legend', 'ev.renamed': 'renamed',
    'map.cats': 'Cats', 'map.cafes': 'Cafés', 'map.food': 'Food/water', 'map.heat': 'Density', 'map.suggest': 'Suggest feeding point',
    'map.tapToPlace': 'Tap the map', 'map.suggestSent': 'Thanks! Visible once moderation approves.', 'map.offline': 'Map didn’t load – list view:',
    'map.fuzzy': 'Positions are rounded to ~100 m to protect the cats.',
    'stats.title': 'The cats of Kadıköy', 'stats.cats': 'Cats recorded', 'stats.seen7': 'Seen in last 7 days', 'stats.help': 'Need help',
    'stats.tnr': 'Neutered (ear tip)', 'stats.bcs': 'Avg body condition (1–9)', 'stats.obs': 'Sightings', 'stats.active': 'Active today', 'stats.vouchers': 'Vouchers redeemed',
    'stats.perDay': 'Sightings per day (30 days)', 'stats.patterns': 'By type', 'stats.ages': 'Age groups', 'stats.health': 'Health status',
    'stats.hours': 'By time of day', 'stats.bcsDist': 'Body condition', 'stats.districts': 'Neighbourhoods', 'stats.flags': 'Health issues seen',
    'stats.table': 'Table', 'stats.chart': 'Chart', 'stats.export': 'Open data', 'stats.leaderboard': 'Leaderboard', 'stats.helpRadar': 'Help radar',
    'stats.col.district': 'Neighbourhood', 'stats.col.cats': 'Cats', 'stats.col.obs': 'Sightings', 'stats.col.help': 'Help', 'stats.col.tnr': 'TNR %', 'stats.col.bcs': 'BCS',
    'lb.day': 'Today', 'lb.week': 'This week', 'lb.all': 'All time', 'lb.xp': 'XP', 'lb.discoveries': 'Discoveries', 'lb.cats': 'Cats', 'lb.empty': 'Nobody yet.',
    'help.empty': 'No cat needs help right now 💚', 'help.lead': 'For volunteers and vets: cats showing signs they need help.',
    'v.title': 'Cat voucher', 'v.discount': '{n}% OFF', 'v.show': 'Show it at the counter – staff scan the code.', 'v.validUntil': 'Valid today until {t}',
    'v.cats': '{n} cat today|{n} cats today', 'v.redeemed': 'Redeemed ✓', 'v.expired': 'Expired', 'v.partners': 'Valid at', 'v.notYet': 'No voucher yet',
    'v.demoRedeem': 'Demo: redeem as café', 'v.needs': '{n} cat|{n} cats', 'v.code': 'Code',
    'p.badges': 'Badges', 'p.stats': 'My numbers', 'p.recent': 'Recent catches', 'p.settings': 'Settings', 'p.lang': 'Language', 'p.nick': 'Nickname',
    'p.ar': 'AR cat detection (on device)', 'p.reset': 'Remove account from this device', 'p.resetConfirm': 'Sure? The login on this device will be removed.', 'p.save': 'Save',
    'p.rules': 'Rules & privacy', 'p.partner': 'Café login', 'p.admin': 'Moderation', 'p.role.volunteer': 'Volunteer', 'p.role.admin': 'Moderator',
    'm.catches': 'Catches', 'm.uniqueCats': 'Different cats', 'm.discoveries': 'Discoveries', 'm.districts': 'Neighbourhoods', 'm.goalDays': 'Goal days', 'm.maxStreak': 'Longest streak', 'm.currentStreak': 'Streak',
    'rules.title': 'Cat-friendly rules',
    'rules.body': 'Cat Me If You Can is a photo game. Cats aren’t prey, they’re our neighbours.\n• Keep your distance: no chasing, cornering or picking up.\n• Don’t disturb sleeping or eating cats; no flash.\n• If you feed: cat food and fresh water only.\n• Pets and indoor cats don’t count.\n• Don’t photograph people, number plates or homes.',
    'rules.privacy': 'Privacy',
    'rules.privacyBody': 'We store your nickname and the photos and locations of cats you catch. Publicly visible are only the cat crop and positions rounded to ~100 m. Only moderators see the full photo. Ask us to delete your data any time.',
    'rules.ai': 'Analysis is done by AI and can be wrong. Age, weight and health are estimates.',
    'common.back': 'Back', 'common.close': 'Close', 'common.cancel': 'Cancel', 'common.ok': 'OK', 'common.loading': 'Loading…', 'common.retry': 'Retry',
    'common.km': '{n} km', 'common.m': '{n} m', 'common.now': 'just now', 'common.minAgo': '{n} min ago', 'common.hAgo': '{n} h ago', 'common.dAgo': '{n} day ago|{n} days ago',
    'common.demo': 'Demo', 'common.unknown': 'unknown', 'common.more': 'More', 'common.yes': 'Yes', 'common.no': 'No',
  },
};

let lang = 'tr';
try {
  const saved = localStorage.getItem('catme.lang');
  if (saved && STRINGS[saved]) lang = saved;
  else {
    const nav = (navigator.language || 'tr').slice(0, 2);
    if (STRINGS[nav]) lang = nav;
  }
} catch {
  /* kein Storage */
}

export function getLang() {
  return lang;
}

export function setLang(l) {
  if (!STRINGS[l]) return;
  lang = l;
  try {
    localStorage.setItem('catme.lang', l);
  } catch {
    /* egal */
  }
  document.documentElement.lang = l;
}

export function t(key, vars) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.tr[key] ?? key;
  // Singular|Plural: „{n} Katze|{n} Katzen“ – gewählt nach vars.n
  if (s.includes('|') && vars && vars.n != null) {
    const [one, other] = s.split('|');
    s = Number(vars.n) === 1 ? one : other;
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
  return s;
}

/** Enum-Beschriftung aus core/taxonomy.js in der aktuellen Sprache. */
export function L(table, key) {
  return enumLabel(table, key, lang);
}

/** Übersetzbare Objekte {tr, de, en} → aktuelle Sprache. */
export function tx(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.tr || obj.en || '';
}

export const LANGS = Object.keys(STRINGS);
