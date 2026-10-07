// Cat Me If You Can – Zustand melden: Auswahl-Chips (gesund, hungrig, krank, verletzt …) + Notiz.
// Wird auf der Sammelkarte nach dem Fang und im Katzenprofil benutzt.

import { t, L } from '../i18n.js';
import { esc, sep } from '../ui.js';
import { CONDITION_TAGS } from '../../core/taxonomy.js';

/** HTML der Auswahl. Die Werte liest readConditionForm() wieder aus. */
export function conditionFormHtml({ withNote = true, compact = false } = {}) {
  return `<div class="cond ${compact ? 'compact' : ''}" role="group" aria-label="${esc(t('report.title'))}">
    ${Object.entries(CONDITION_TAGS).map(([key, c]) => `
      <label class="cond-chip sev-${esc(c.severity)}"><input type="checkbox" name="tag" value="${esc(key)}"><span aria-hidden="true">${c.icon}</span> ${esc(L(CONDITION_TAGS, key))}</label>`).join('')}
  </div>
  ${withNote ? `<input class="cond-note" name="note" maxlength="300" placeholder="${esc(t('report.notePh'))}" autocomplete="off">` : ''}`;
}

/** „Gesund“ und Probleme schließen sich aus – die Auswahl korrigiert sich selbst. */
export function bindConditionForm(root) {
  root.addEventListener('change', (e) => {
    const box = e.target.closest('input[name="tag"]');
    if (!box || !box.checked) return;
    const all = [...root.querySelectorAll('input[name="tag"]')];
    if (CONDITION_TAGS[box.value].severity === 'none' && box.value === 'healthy') {
      for (const b of all) if (b !== box && CONDITION_TAGS[b.value].severity !== 'none') b.checked = false;
    } else if (CONDITION_TAGS[box.value].severity !== 'none') {
      const healthy = all.find((b) => b.value === 'healthy');
      if (healthy) healthy.checked = false;
    }
  });
}

export function readConditionForm(root) {
  const tags = [...root.querySelectorAll('input[name="tag"]:checked')].map((b) => b.value);
  const noteEl = root.querySelector('input[name="note"], textarea[name="note"]');
  return { tags, note: noteEl ? noteEl.value.trim() : '' };
}

/** Kurztext der gemeldeten Zustände, z. B. „🍽️ Hungrig · 🤒 Krank“. */
export function conditionText(tags) {
  return (tags || []).filter((k) => CONDITION_TAGS[k]).map((k) => `${CONDITION_TAGS[k].icon} ${L(CONDITION_TAGS, k)}`).join(sep());
}
