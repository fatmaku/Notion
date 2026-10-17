// Shared, translated domain texts: status names, problem reasons, note shortcuts and the
// push/in-app notification templates. Used by the engine (notifications are written in the
// recipient's language) and by the UI. Languages: de, en, pl, ro, cs, tr, ru, uk.
// Missing entries fall back to German (see pickLang / the helpers below).

export const LANGS = ['de', 'en', 'pl', 'ro', 'cs', 'tr', 'ru', 'uk'];
export const LANG_NAMES = {
  de: 'Deutsch', en: 'English', pl: 'Polski', ro: 'Română', cs: 'Čeština', tr: 'Türkçe', ru: 'Русский', uk: 'Українська',
};

export const STATUS_TEXT = {
  de: { open: 'Offen', accepted: 'Bestätigt', arrived_pickup: 'An Ladestelle', loaded: 'Beladen · unterwegs', arrived_dropoff: 'An Entladestelle', unloaded: 'Entladen', delivered: 'Zugestellt', cancelled: 'Storniert' },
  en: { open: 'Open', accepted: 'Confirmed', arrived_pickup: 'At pickup', loaded: 'Loaded · on the way', arrived_dropoff: 'At drop-off', unloaded: 'Unloaded', delivered: 'Delivered', cancelled: 'Cancelled' },
  pl: { open: 'Otwarte', accepted: 'Potwierdzone', arrived_pickup: 'Na załadunku', loaded: 'Załadowane · w drodze', arrived_dropoff: 'Na rozładunku', unloaded: 'Rozładowane', delivered: 'Dostarczone', cancelled: 'Anulowane' },
  ro: { open: 'Deschisă', accepted: 'Confirmată', arrived_pickup: 'La încărcare', loaded: 'Încărcată · pe drum', arrived_dropoff: 'La descărcare', unloaded: 'Descărcată', delivered: 'Livrată', cancelled: 'Anulată' },
  cs: { open: 'Otevřeno', accepted: 'Potvrzeno', arrived_pickup: 'Na nakládce', loaded: 'Naloženo · na cestě', arrived_dropoff: 'Na vykládce', unloaded: 'Vyloženo', delivered: 'Doručeno', cancelled: 'Zrušeno' },
  tr: { open: 'Açık', accepted: 'Onaylandı', arrived_pickup: 'Yükleme yerinde', loaded: 'Yüklendi · yolda', arrived_dropoff: 'Boşaltma yerinde', unloaded: 'Boşaltıldı', delivered: 'Teslim edildi', cancelled: 'İptal edildi' },
  ru: { open: 'Открыт', accepted: 'Подтверждён', arrived_pickup: 'На погрузке', loaded: 'Загружен · в пути', arrived_dropoff: 'На выгрузке', unloaded: 'Выгружен', delivered: 'Доставлен', cancelled: 'Отменён' },
  uk: { open: 'Відкрито', accepted: 'Підтверджено', arrived_pickup: 'На завантаженні', loaded: 'Завантажено · в дорозі', arrived_dropoff: 'На розвантаженні', unloaded: 'Розвантажено', delivered: 'Доставлено', cancelled: 'Скасовано' },
};

// What the big button says for the step that leads INTO a status.
export const STEP_TEXT = {
  de: { accepted: 'Buchung bestätigen', arrived_pickup: 'Angekommen – Ladestelle', loaded: 'Aufgeladen', arrived_dropoff: 'Angekommen – Entladestelle', unloaded: 'Abgeladen', delivered: 'Bestätigen & abschließen' },
  en: { accepted: 'Confirm booking', arrived_pickup: 'Arrived – pickup', loaded: 'Loaded', arrived_dropoff: 'Arrived – drop-off', unloaded: 'Unloaded', delivered: 'Confirm & finish' },
  pl: { accepted: 'Potwierdź zlecenie', arrived_pickup: 'Na miejscu – załadunek', loaded: 'Załadowane', arrived_dropoff: 'Na miejscu – rozładunek', unloaded: 'Rozładowane', delivered: 'Potwierdź i zakończ' },
  ro: { accepted: 'Confirmă comanda', arrived_pickup: 'Am ajuns – încărcare', loaded: 'Încărcat', arrived_dropoff: 'Am ajuns – descărcare', unloaded: 'Descărcat', delivered: 'Confirmă și finalizează' },
  cs: { accepted: 'Potvrdit zakázku', arrived_pickup: 'Na místě – nakládka', loaded: 'Naloženo', arrived_dropoff: 'Na místě – vykládka', unloaded: 'Vyloženo', delivered: 'Potvrdit a dokončit' },
  tr: { accepted: 'Siparişi onayla', arrived_pickup: 'Vardım – yükleme', loaded: 'Yüklendi', arrived_dropoff: 'Vardım – boşaltma', unloaded: 'Boşaltıldı', delivered: 'Onayla ve bitir' },
  ru: { accepted: 'Подтвердить заказ', arrived_pickup: 'Прибыл – погрузка', loaded: 'Загружено', arrived_dropoff: 'Прибыл – выгрузка', unloaded: 'Выгружено', delivered: 'Подтвердить и завершить' },
  uk: { accepted: 'Підтвердити замовлення', arrived_pickup: 'Прибув – завантаження', loaded: 'Завантажено', arrived_dropoff: 'Прибув – розвантаження', unloaded: 'Розвантажено', delivered: 'Підтвердити й завершити' },
};

export const PROBLEMS = ['delay', 'breakdown', 'accident', 'damaged', 'refused', 'address', 'waiting', 'other'];
export const PROBLEM_TEXT = {
  de: { delay: 'Stau / Verspätung', breakdown: 'Panne', accident: 'Unfall', damaged: 'Ware beschädigt', refused: 'Annahme verweigert', address: 'Adresse falsch', waiting: 'Lange Wartezeit', other: 'Sonstiges' },
  en: { delay: 'Traffic / delay', breakdown: 'Breakdown', accident: 'Accident', damaged: 'Goods damaged', refused: 'Delivery refused', address: 'Wrong address', waiting: 'Long waiting time', other: 'Other' },
  pl: { delay: 'Korek / opóźnienie', breakdown: 'Awaria', accident: 'Wypadek', damaged: 'Towar uszkodzony', refused: 'Odmowa przyjęcia', address: 'Zły adres', waiting: 'Długie czekanie', other: 'Inne' },
  ro: { delay: 'Trafic / întârziere', breakdown: 'Defecțiune', accident: 'Accident', damaged: 'Marfă deteriorată', refused: 'Recepție refuzată', address: 'Adresă greșită', waiting: 'Așteptare lungă', other: 'Altceva' },
  cs: { delay: 'Kolona / zpoždění', breakdown: 'Porucha', accident: 'Nehoda', damaged: 'Poškozené zboží', refused: 'Převzetí odmítnuto', address: 'Špatná adresa', waiting: 'Dlouhé čekání', other: 'Jiné' },
  tr: { delay: 'Trafik / gecikme', breakdown: 'Arıza', accident: 'Kaza', damaged: 'Mal hasarlı', refused: 'Teslim alınmadı', address: 'Adres yanlış', waiting: 'Uzun bekleme', other: 'Diğer' },
  ru: { delay: 'Пробка / опоздание', breakdown: 'Поломка', accident: 'Авария', damaged: 'Груз повреждён', refused: 'Отказ в приёмке', address: 'Неверный адрес', waiting: 'Долгое ожидание', other: 'Другое' },
  uk: { delay: 'Затор / запізнення', breakdown: 'Поломка', accident: 'Аварія', damaged: 'Вантаж пошкоджено', refused: 'Відмова в прийманні', address: 'Неправильна адреса', waiting: 'Довге очікування', other: 'Інше' },
};

export const NOTE_SHORTCUTS = {
  de: ['Stau, ca. 30 Min. später', 'Warte an der Rampe', 'Kunde nicht erreichbar', 'Paletten getauscht', 'Ladung gesichert', 'Pause (Lenkzeit)'],
  en: ['Traffic, about 30 min late', 'Waiting at the ramp', 'Customer not reachable', 'Pallets exchanged', 'Load secured', 'Break (driving time)'],
  pl: ['Korek, ok. 30 min później', 'Czekam przy rampie', 'Klient nieosiągalny', 'Palety wymienione', 'Ładunek zabezpieczony', 'Przerwa (czas jazdy)'],
  ro: ['Trafic, cca. 30 min întârziere', 'Aștept la rampă', 'Client de negăsit', 'Paleți schimbați', 'Marfă asigurată', 'Pauză (timp de condus)'],
  cs: ['Kolona, cca 30 min zpoždění', 'Čekám u rampy', 'Zákazník nedostupný', 'Palety vyměněny', 'Náklad zajištěn', 'Přestávka (doba řízení)'],
  tr: ['Trafik, ~30 dk gecikme', 'Rampada bekliyorum', 'Müşteriye ulaşılamıyor', 'Paletler değiştirildi', 'Yük sabitlendi', 'Mola (sürüş süresi)'],
  ru: ['Пробка, опоздание ~30 мин', 'Жду у рампы', 'Клиент недоступен', 'Поддоны обменяны', 'Груз закреплён', 'Перерыв (время вождения)'],
  uk: ['Затор, запізнення ~30 хв', 'Чекаю біля рампи', 'Клієнт недоступний', 'Піддони обміняно', 'Вантаж закріплено', 'Перерва (час керування)'],
};

// Notification templates. {placeholders} are filled by fill().
export const NOTIFY_TEXT = {
  de: {
    assigned: ['Neuer Auftrag {no}', '{route} · Laden {date} – bitte bestätigen.'],
    open: ['Offener Auftrag', '{route} · Laden {date} – jetzt übernehmen?'],
    changed: ['Auftrag geändert', '{no} · {route}: Bitte Details prüfen.'],
    cancelled: ['Auftrag storniert', '{no} · {route}{note}'],
    status: ['{driver}: {status}', '{route} · {no}'],
    delivered: ['Zugestellt · {no}', '{route} · Lieferschein liegt vor ({driver})'],
    delivered_nopod: ['Zugestellt · {no}', '{route} · ohne Lieferschein ({driver})'],
    problem: ['Problem: {problem}', '{driver} · {no} · {route}{note}'],
    resolved: ['Problem erledigt', '{no}: Die Disposition hat das Problem abgeschlossen.'],
    note: ['Notiz von {from}', '{no}: {text}'],
    returned: ['Auftrag zurückgegeben', '{driver} · {no}: {text}'],
    undo: ['Schritt zurückgenommen', '{driver} · {no}: wieder „{status}“'],
    lockout: ['Zugang gesperrt: {name}', 'Zu viele falsche Anmeldeversuche. Gesperrt für 24 Stunden – neuer PIN bzw. neues Passwort hebt die Sperre auf.'],
    storage80: ['Speicher zu 80 % belegt', 'Bitte alte Lieferscheine exportieren und löschen oder den Tarif wechseln.'],
    storage100: ['Speicher voll', 'Neue Fotos und Lieferscheine können nicht mehr hochgeladen werden. Bitte alte Lieferscheine exportieren und löschen oder den Tarif wechseln.'],
    cancelRequest: ['Kündigungswunsch: {name}', '{name} ({code}) möchte kündigen.{reason}'],
    planRequest: ['Tarifwunsch: {name}', '{name} ({code}) möchte in den Tarif {plan} wechseln.{note}'],
  },
  en: {
    assigned: ['New job {no}', '{route} · loading {date} – please confirm.'],
    open: ['Open job', '{route} · loading {date} – take it?'],
    changed: ['Job changed', '{no} · {route}: please check the details.'],
    cancelled: ['Job cancelled', '{no} · {route}{note}'],
    status: ['{driver}: {status}', '{route} · {no}'],
    delivered: ['Delivered · {no}', '{route} · delivery note received ({driver})'],
    delivered_nopod: ['Delivered · {no}', '{route} · no delivery note ({driver})'],
    problem: ['Problem: {problem}', '{driver} · {no} · {route}{note}'],
    resolved: ['Problem solved', '{no}: dispatch has closed the problem.'],
    note: ['Note from {from}', '{no}: {text}'],
    returned: ['Job returned', '{driver} · {no}: {text}'],
    undo: ['Step undone', '{driver} · {no}: back to “{status}”'],
    lockout: ['Login locked: {name}', 'Too many failed sign-in attempts. Locked for 24 hours – a new PIN or password lifts the lock.'],
    storage80: ['Storage 80 % full', 'Please export and delete old delivery notes or change your plan.'],
    storage100: ['Storage full', 'New photos and delivery notes can no longer be uploaded. Please export and delete old delivery notes or change your plan.'],
    cancelRequest: ['Cancellation request: {name}', '{name} ({code}) wants to cancel.{reason}'],
    planRequest: ['Plan request: {name}', '{name} ({code}) wants to switch to the {plan} plan.{note}'],
  },
  pl: {
    assigned: ['Nowe zlecenie {no}', '{route} · załadunek {date} – potwierdź.'],
    open: ['Wolne zlecenie', '{route} · załadunek {date} – bierzesz?'],
    changed: ['Zlecenie zmienione', '{no} · {route}: sprawdź szczegóły.'],
    cancelled: ['Zlecenie anulowane', '{no} · {route}{note}'],
    status: ['{driver}: {status}', '{route} · {no}'],
    delivered: ['Dostarczone · {no}', '{route} · jest dokument dostawy ({driver})'],
    delivered_nopod: ['Dostarczone · {no}', '{route} · bez dokumentu dostawy ({driver})'],
    problem: ['Problem: {problem}', '{driver} · {no} · {route}{note}'],
    resolved: ['Problem rozwiązany', '{no}: dyspozytor zamknął problem.'],
    note: ['Notatka od {from}', '{no}: {text}'],
    returned: ['Zlecenie zwrócone', '{driver} · {no}: {text}'],
    undo: ['Krok cofnięty', '{driver} · {no}: znów „{status}”'],
    lockout: ['Dostęp zablokowany: {name}', 'Zbyt wiele nieudanych prób logowania. Blokada na 24 godziny – nowy PIN lub nowe hasło ją znosi.'],
    storage80: ['Pamięć zajęta w 80 %', 'Proszę wyeksportować i usunąć stare WZ albo zmienić pakiet.'],
    storage100: ['Pamięć pełna', 'Nie można już przesyłać nowych zdjęć ani WZ. Proszę wyeksportować i usunąć stare WZ albo zmienić pakiet.'],
  },
  ro: {
    assigned: ['Comandă nouă {no}', '{route} · încărcare {date} – te rog confirmă.'],
    open: ['Comandă liberă', '{route} · încărcare {date} – o preiei?'],
    changed: ['Comandă modificată', '{no} · {route}: verifică detaliile.'],
    cancelled: ['Comandă anulată', '{no} · {route}{note}'],
    status: ['{driver}: {status}', '{route} · {no}'],
    delivered: ['Livrată · {no}', '{route} · avizul de livrare a sosit ({driver})'],
    delivered_nopod: ['Livrată · {no}', '{route} · fără aviz de livrare ({driver})'],
    problem: ['Problemă: {problem}', '{driver} · {no} · {route}{note}'],
    resolved: ['Problemă rezolvată', '{no}: dispeceratul a închis problema.'],
    note: ['Notă de la {from}', '{no}: {text}'],
    returned: ['Comandă returnată', '{driver} · {no}: {text}'],
    undo: ['Pas anulat', '{driver} · {no}: din nou „{status}”'],
    lockout: ['Acces blocat: {name}', 'Prea multe încercări greșite de autentificare. Blocat 24 de ore – un PIN nou sau o parolă nouă ridică blocarea.'],
    storage80: ['Spațiu de stocare ocupat 80 %', 'Vă rugăm să exportați și să ștergeți avizele vechi sau să schimbați planul.'],
    storage100: ['Spațiu de stocare plin', 'Nu se mai pot încărca fotografii și avize noi. Vă rugăm să exportați și să ștergeți avizele vechi sau să schimbați planul.'],
  },
  cs: {
    assigned: ['Nová zakázka {no}', '{route} · nakládka {date} – prosím potvrďte.'],
    open: ['Volná zakázka', '{route} · nakládka {date} – převezmete ji?'],
    changed: ['Zakázka změněna', '{no} · {route}: zkontrolujte prosím detaily.'],
    cancelled: ['Zakázka zrušena', '{no} · {route}{note}'],
    status: ['{driver}: {status}', '{route} · {no}'],
    delivered: ['Doručeno · {no}', '{route} · dodací list je k dispozici ({driver})'],
    delivered_nopod: ['Doručeno · {no}', '{route} · bez dodacího listu ({driver})'],
    problem: ['Problém: {problem}', '{driver} · {no} · {route}{note}'],
    resolved: ['Problém vyřešen', '{no}: dispečink problém uzavřel.'],
    note: ['Poznámka od {from}', '{no}: {text}'],
    returned: ['Zakázka vrácena', '{driver} · {no}: {text}'],
    undo: ['Krok vrácen', '{driver} · {no}: opět „{status}“'],
    lockout: ['Přístup zablokován: {name}', 'Příliš mnoho chybných pokusů o přihlášení. Blokace na 24 hodin – nový PIN nebo nové heslo ji zruší.'],
    storage80: ['Úložiště z 80 % plné', 'Prosím exportujte a smažte staré dodací listy nebo změňte tarif.'],
    storage100: ['Úložiště plné', 'Nové fotky a dodací listy už nelze nahrát. Prosím exportujte a smažte staré dodací listy nebo změňte tarif.'],
  },
  tr: {
    assigned: ['Yeni sipariş {no}', '{route} · yükleme {date} – lütfen onayla.'],
    open: ['Açık sipariş', '{route} · yükleme {date} – almak ister misin?'],
    changed: ['Sipariş değişti', '{no} · {route}: lütfen detayları kontrol et.'],
    cancelled: ['Sipariş iptal edildi', '{no} · {route}{note}'],
    status: ['{driver}: {status}', '{route} · {no}'],
    delivered: ['Teslim edildi · {no}', '{route} · irsaliye geldi ({driver})'],
    delivered_nopod: ['Teslim edildi · {no}', '{route} · irsaliye yok ({driver})'],
    problem: ['Sorun: {problem}', '{driver} · {no} · {route}{note}'],
    resolved: ['Sorun çözüldü', '{no}: Sevkiyat sorunu kapattı.'],
    note: ['{from} notu', '{no}: {text}'],
    returned: ['Sipariş geri verildi', '{driver} · {no}: {text}'],
    undo: ['Adım geri alındı', '{driver} · {no}: tekrar „{status}“'],
    lockout: ['Erişim kilitlendi: {name}', 'Çok fazla hatalı giriş denemesi. 24 saat kilitli – yeni PIN veya yeni şifre kilidi kaldırır.'],
    storage80: ['Depolama %80 dolu', 'Lütfen eski irsaliyeleri dışa aktarıp silin veya paketinizi değiştirin.'],
    storage100: ['Depolama dolu', 'Yeni fotoğraf ve irsaliye yüklenemiyor. Lütfen eski irsaliyeleri dışa aktarıp silin veya paketinizi değiştirin.'],
    cancelRequest: ['İptal talebi: {name}', '{name} ({code}) sözleşmeyi feshetmek istiyor.{reason}'],
    planRequest: ['Paket talebi: {name}', '{name} ({code}) {plan} paketine geçmek istiyor.{note}'],
  },
  ru: {
    assigned: ['Новый заказ {no}', '{route} · погрузка {date} – подтвердите.'],
    open: ['Свободный заказ', '{route} · погрузка {date} – возьмёте?'],
    changed: ['Заказ изменён', '{no} · {route}: проверьте детали.'],
    cancelled: ['Заказ отменён', '{no} · {route}{note}'],
    status: ['{driver}: {status}', '{route} · {no}'],
    delivered: ['Доставлен · {no}', '{route} · накладная получена ({driver})'],
    delivered_nopod: ['Доставлен · {no}', '{route} · без накладной ({driver})'],
    problem: ['Проблема: {problem}', '{driver} · {no} · {route}{note}'],
    resolved: ['Проблема решена', '{no}: диспетчер закрыл проблему.'],
    note: ['Заметка от {from}', '{no}: {text}'],
    returned: ['Заказ возвращён', '{driver} · {no}: {text}'],
    undo: ['Шаг отменён', '{driver} · {no}: снова «{status}»'],
    lockout: ['Доступ заблокирован: {name}', 'Слишком много неудачных попыток входа. Блокировка на 24 часа – новый PIN или новый пароль снимает её.'],
    storage80: ['Хранилище заполнено на 80 %', 'Пожалуйста, экспортируйте и удалите старые накладные или смените тариф.'],
    storage100: ['Хранилище заполнено', 'Новые фото и накладные больше нельзя загрузить. Пожалуйста, экспортируйте и удалите старые накладные или смените тариф.'],
  },
  uk: {
    assigned: ['Нове замовлення {no}', '{route} · завантаження {date} – підтвердіть.'],
    open: ['Вільне замовлення', '{route} · завантаження {date} – берете?'],
    changed: ['Замовлення змінено', '{no} · {route}: перевірте деталі.'],
    cancelled: ['Замовлення скасовано', '{no} · {route}{note}'],
    status: ['{driver}: {status}', '{route} · {no}'],
    delivered: ['Доставлено · {no}', '{route} · накладну отримано ({driver})'],
    delivered_nopod: ['Доставлено · {no}', '{route} · без накладної ({driver})'],
    problem: ['Проблема: {problem}', '{driver} · {no} · {route}{note}'],
    resolved: ['Проблему вирішено', '{no}: диспетчер закрив проблему.'],
    note: ['Нотатка від {from}', '{no}: {text}'],
    returned: ['Замовлення повернуто', '{driver} · {no}: {text}'],
    undo: ['Крок скасовано', '{driver} · {no}: знову «{status}»'],
    lockout: ['Доступ заблоковано: {name}', 'Забагато невдалих спроб входу. Блокування на 24 години – новий PIN або новий пароль знімає його.'],
    storage80: ['Сховище заповнене на 80 %', 'Будь ласка, експортуйте й видаліть старі накладні або змініть тариф.'],
    storage100: ['Сховище заповнене', 'Нові фото й накладні більше не можна завантажити. Будь ласка, експортуйте й видаліть старі накладні або змініть тариф.'],
  },
};

export function fill(tpl, params) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (params[k] == null ? '' : String(params[k])));
}

export const pickLang = (lang) => (LANGS.includes(lang) ? lang : 'de');
export const statusText = (lang, s) => (STATUS_TEXT[pickLang(lang)] || STATUS_TEXT.de)[s] || STATUS_TEXT.de[s] || s;
export const stepText = (lang, s) => (STEP_TEXT[pickLang(lang)] || STEP_TEXT.de)[s] || STEP_TEXT.de[s] || s;
export const problemText = (lang, p) => (PROBLEM_TEXT[pickLang(lang)] || PROBLEM_TEXT.de)[p] || PROBLEM_TEXT.de[p] || p;
