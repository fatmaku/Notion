// Cat Me If You Can – Beschriftungen Русский (ru) für Katzentypen, Zustände, Abzeichen, Level.
// Aufbau: { TABELLE: { schlüssel: 'Text' }, BADGES: { id: { name, desc } }, LEVEL_TITLES: [7 Texte] }
// Tabellen und Schlüssel: siehe core/taxonomy.js (TABLES) und config/game.js (badges, levelTitles).
// Eigenschaften der Katze stehen in der weiblichen Form (кошка). Nie „охота/добыча“ (BRAND.md).
export default {
  PATTERNS: {
    tekir: 'Полосатая',
    sarman: 'Рыжая',
    krem: 'Кремовая',
    siyah: 'Чёрная',
    beyaz: 'Белая',
    gri: 'Серая',
    smokin: 'Чёрно-белая',
    tekir_beyaz: 'Полосатая с белым',
    sarman_beyaz: 'Рыжая с белым',
    gri_beyaz: 'Серая с белым',
    uc_renk: 'Трёхцветная',
    kaplumbaga: 'Черепаховая',
    renk_uclu: 'Сиамский окрас',
    van: 'Окрас ван',
    diger: 'Другая',
  },

  COAT_COLORS: {
    black: 'чёрный',
    white: 'белый',
    gray: 'серый',
    orange: 'рыжий',
    cream: 'кремовый',
    brown: 'коричневый',
  },

  EYE_COLORS: {
    yellow: 'жёлтые/янтарные',
    green: 'зелёные',
    blue: 'голубые',
    copper: 'медные',
    odd: 'разного цвета',
    unknown: 'не видно',
  },

  AGE_GROUPS: {
    kitten: 'Котёнок',
    junior: 'Молодая',
    adult: 'Взрослая',
    senior: 'Пожилая',
    unknown: 'Неизвестно',
  },

  BCS_CLASSES: {
    very_thin: 'Очень худая',
    thin: 'Худая',
    ideal: 'В норме',
    overweight: 'Полная',
    obese: 'Очень полная',
    unknown: 'Не понять по фото',
  },

  SEX: {
    female: 'Девочка',
    male: 'Мальчик',
    unknown: 'Неизвестно',
  },

  EAR_TIP: {
    tipped: 'Метка на ухе (стерилизована)',
    none: 'Нет метки на ухе',
    not_visible: 'Ушей не видно',
  },

  HEALTH_FLAGS: {
    eye_discharge: 'Выделения из глаз',
    eye_injury: 'Травма глаза',
    nasal_discharge: 'Выделения из носа',
    wound: 'Рана',
    skin_issue: 'Проблема с кожей',
    hair_loss: 'Выпадает шерсть',
    limping: 'Хромает',
    very_thin: 'Сильно истощена',
    ear_issue: 'Проблема с ушами',
    mouth_issue: 'Проблема со ртом/зубами',
    matted_coat: 'Колтуны в шерсти',
    pregnant_possible: 'Возможно, беременна',
    nursing: 'Кормит котят',
  },

  SEVERITY: {
    none: 'Здорова на вид',
    mild: 'Не срочно',
    attention: 'Нужно внимание',
    urgent: 'Срочно',
  },

  BEHAVIOR: {
    relaxed: 'Спокойная',
    sleeping: 'Спит',
    curious: 'Любопытная',
    alert: 'Настороже',
    eating: 'Ест',
    playing: 'Играет',
    grooming: 'Умывается',
    fearful: 'Боится',
    defensive: 'Защищается',
    unknown: 'Непонятно',
  },

  SETTINGS: {
    street: 'Улица',
    park: 'Парк',
    coast: 'У моря',
    garden: 'Сад',
    shop_cafe: 'Магазин/кафе',
    market: 'Рынок',
    stairs_wall: 'Лестница/стена',
    car: 'Машина',
    roof: 'Крыша',
    indoor: 'В помещении',
    other: 'Другое',
  },

  OWNERSHIP: {
    street: 'Уличная кошка',
    owned: 'Домашняя кошка',
    unclear: 'Непонятно',
  },

  CAT_STATUS: {
    active: 'На улице, всё хорошо',
    needs_help: 'Нужна помощь',
    in_care: 'На лечении',
    adopted: 'Нашла дом',
    missing: 'Давно не видели',
    deceased: 'Умерла',
  },

  RARITY: {
    common: 'Обычная',
    uncommon: 'Необычная',
    rare: 'Редкая',
    epic: 'Эпическая',
    legendary: 'Легендарная',
  },

  CONDITION_TAGS: {
    healthy: 'Здорова',
    fed: 'Я покормил(а)',
    hungry: 'Голодная',
    thirsty: 'Хочет пить',
    thin: 'Очень худая',
    sick: 'Болеет (глаза, нос, чихает)',
    injured: 'Ранена',
    limping: 'Хромает',
    cold: 'Мёрзнет / мокрая',
    pregnant: 'Беременна',
    kittens: 'С котятами',
    danger: 'В опасности (дорога, застряла)',
    lost_pet: 'Может, потерялась из дома',
  },

  PLACE_TYPES: {
    partner: 'Кафе-партнёр',
    feeding: 'Место кормления',
    water: 'Миска с водой',
    shelter: 'Домик для кошек',
    vet: 'Ветеринар',
  },

  BADGES: {
    first_catch: { name: 'Первая лапка', desc: 'Сфотографируй первую кошку' },
    ten_cats: { name: 'Круглая десятка', desc: '10 разных кошек' },
    fifty_cats: { name: 'Коллекционер', desc: '50 разных кошек' },
    hundred_cats: { name: 'Заклинатель кошек', desc: '100 разных кошек' },
    daily_goal: { name: 'Двадцатка', desc: '20 кошек за один день' },
    goal_5: { name: 'Свой в кафе', desc: 'Выполни цель дня 5 раз' },
    discoverer: { name: 'Открыватель', desc: 'Найди 5 новых кошек' },
    pioneer: { name: 'Пионер', desc: 'Найди 25 новых кошек' },
    districts_5: { name: 'Странник', desc: 'Найди кошек в 5 кварталах' },
    districts_all: { name: 'Весь Кадыкёй', desc: 'Все 21 квартал' },
    night_owl: { name: 'Ночная сова', desc: '3 кошки с 22:00 до 5:00' },
    early_bird: { name: 'Жаворонок', desc: '3 кошки с 5:00 до 8:00' },
    guardian: { name: 'Хранитель здоровья', desc: 'Сообщи о 3 кошках, которым нужна помощь' },
    patterns_8: { name: 'Палитра', desc: '8 разных окрасов' },
    rare_find: { name: 'Редкая находка', desc: 'Найди редкую кошку' },
    legend: { name: 'Искатель легенд', desc: 'Найди легенду Кадыкёя' },
    streak_7: { name: 'Неделя подряд', desc: '7 дней подряд' },
  },

  LEVEL_TITLES: [
    'Новичок',
    'Уличный разведчик',
    'Друг квартала',
    'Кошачий детектив',
    'Исследователь Moda',
    'Заклинатель кошек',
    'Легенда Кадыкёя',
  ],
};
