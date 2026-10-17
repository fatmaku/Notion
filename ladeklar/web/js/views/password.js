// First sign-in with a start password (office and licensor): the own password comes before anything
// else. The engine refuses every other call until it is set, so this screen is not just a hint.
import { icon, esc } from './common.js';
import { t } from '../i18n.js';

export const routes = [];
export const defaultRoute = () => '';

export function render(app) {
  const u = app.me.user;
  const err = app.ui.pwErr;
  return `<div class="login pwfirst" data-key="pwfirst"><div class="login-in">
    <div class="panel-glass">
      <div class="stack" style="--gap:6px"><span class="eyebrow" style="color:var(--on-ink-2)">${t('Erste Anmeldung')}</span>
        <h2 style="color:#fff">${t('Bitte vergeben Sie jetzt ein eigenes Passwort.')}</h2>
        <p class="small muted">${t('Das Startpasswort gilt nur für die erste Anmeldung. Danach öffnet sich Ihr Arbeitsbereich.')}</p></div>
      <form class="stack" style="--gap:14px" data-form="firstPassword" autocomplete="on">
        <input type="text" name="username" autocomplete="username" value="${esc(u.email || '')}" hidden>
        <label class="field"><span>${t('Startpasswort')}</span><input class="input" type="password" name="current" autocomplete="current-password" required></label>
        <label class="field"><span>${t('Neues Passwort (mind. 10 Zeichen)')}</span><input class="input" type="password" name="next" minlength="10" autocomplete="new-password" required></label>
        <label class="field"><span>${t('Neues Passwort wiederholen')}</span><input class="input" type="password" name="again" minlength="10" autocomplete="new-password" required></label>
        ${err ? `<p class="small" style="color:#ffb4b4" role="alert">${esc(err)}</p>` : ''}
        <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('key-round')}${t('Passwort speichern und weiter')}</button>
      </form>
      <button class="btn btn-ghost" data-act="logout">${icon('log-out')}${t('Abmelden')}</button>
    </div></div></div>`;
}

export const forms = {
  async firstPassword(fd, form, app) {
    if (fd.get('next') !== fd.get('again')) { app.ui.pwErr = t('Die beiden neuen Passwörter sind nicht gleich.'); app.render(); return; }
    try { await app.api.call('changePassword', { current: fd.get('current'), next: fd.get('next') }); }
    catch (e) { app.ui.pwErr = t(e.message); app.render(); return; }
    app.ui.pwErr = '';
    const me = await app.api.session();
    if (me) app.setMe(me);
    app.toast({ title: t('Passwort geändert'), plain: true, icon: 'key-round' });
  },
};
