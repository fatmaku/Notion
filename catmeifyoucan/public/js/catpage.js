// Cat Me If You Can – öffentliche Katzenseite /c/<id>: „Teilen“ und „Link kopieren“ (nur mit JavaScript
// sichtbar), Sprachwahl merken. Die Seite selbst kommt fertig vom Server; Texte stehen als data-*.

const LS_KEY = 'catme.lang';
const LANGS = ['tr', 'en', 'de', 'ru', 'ar', 'fa'];

function storedLang() {
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}
function storeLang(l) {
  try {
    if (LANGS.includes(l)) localStorage.setItem(LS_KEY, l);
  } catch {
    /* privater Modus */
  }
}

/** Text in die Zwischenablage; ohne Clipboard-API über ein verstecktes Textfeld. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* weiter mit dem alten Weg */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.append(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

function init() {
  const box = document.querySelector('[data-share]');
  const lang = document.documentElement.lang;

  // Sprachwahl hier = Sprache auch im Spiel und auf der Startseite
  document.querySelectorAll('.cp-lang a[data-lang]').forEach((a) => a.addEventListener('click', () => storeLang(a.dataset.lang)));
  // Sprachmenü schließt mit Escape und beim Tippen daneben
  const menu = document.querySelector('.cp-lang');
  if (menu) {
    document.addEventListener('click', (e) => {
      if (menu.open && !menu.contains(e.target)) menu.open = false;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
  }
  // Wer von hier ins Spiel geht und noch keine Sprache gewählt hat, spielt in der Sprache der Seite weiter
  document.querySelectorAll('[data-play]').forEach((a) => a.addEventListener('click', () => {
    if (!storedLang()) storeLang(lang);
  }));

  if (!box) return;
  const url = box.dataset.url && /^https?:/.test(box.dataset.url) ? box.dataset.url : location.href.split('#')[0];
  const msg = box.querySelector('[data-msg]');
  const say = (text) => {
    msg.textContent = '';
    // kurz leeren, damit Screenreader dieselbe Meldung erneut vorlesen
    setTimeout(() => {
      msg.textContent = text;
    }, 30);
  };
  const shareBtn = box.querySelector('[data-act="share"]');
  if (!navigator.share) shareBtn.remove();
  box.hidden = false;
  if (!navigator.share) box.style.gridTemplateColumns = '1fr';

  shareBtn.addEventListener('click', async () => {
    try {
      await navigator.share({ title: box.dataset.title, text: box.dataset.text, url });
    } catch {
      /* abgebrochen */
    }
  });
  box.querySelector('[data-act="copy"]').addEventListener('click', async () => {
    if (await copyText(url)) {
      say(box.dataset.copied);
      return;
    }
    // Letzter Ausweg: Link zum Markieren zeigen
    if (!box.querySelector('.cp-copybox')) {
      const wrap = document.createElement('label');
      wrap.className = 'cp-copybox';
      wrap.textContent = box.dataset.hint;
      const input = document.createElement('input');
      input.readOnly = true;
      input.value = url;
      wrap.append(input);
      box.append(wrap);
      input.focus();
      input.select();
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
