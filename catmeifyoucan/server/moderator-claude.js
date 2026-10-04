// Cat Me If You Can – KI-Namensprüfung (Stufe 2 des Namensfilters, siehe public/core/moderation.js).
//
// Die lokale Wortliste kennt nicht jede Sprache und keine Anspielungen. Claude prüft Katzennamen
// und Spitznamen deshalb zusätzlich – in jeder Sprache und Schrift, auch verschleiert. Namen werden
// selten vergeben, die Kosten sind vernachlässigbar. Ergebnisse werden 24 h zwischengespeichert.

import { DEFAULT_MODEL } from './analyzer-claude.js';

const SCHEMA = {
  type: 'object',
  properties: {
    allowed: { type: 'boolean' },
    category: { type: 'string', enum: ['ok', 'profanity', 'sexual', 'hate_or_slur', 'insult', 'violence', 'impersonation', 'personal_data', 'spam'] },
    language: { type: 'string' },
  },
  required: ['allowed', 'category', 'language'],
  additionalProperties: false,
};

const SYSTEM = `You moderate names in a family-friendly street-cat game in Istanbul. Players name cats they
discovered and choose public nicknames. Decide whether the name is acceptable.
Reject (allowed=false) names that are, in ANY language or script (Turkish, Kurdish, Arabic, Persian,
German, English, Russian, Balkan languages, …), including leetspeak, misspellings, spacing tricks
and phonetic puns: profanity, sexual terms or innuendo, slurs or hate (ethnic, religious, LGBTQ+,
disability), insults aimed at people or groups, glorification of violence or extremist figures,
impersonation of staff/officials/brands, phone numbers/addresses/URLs, or spam.
Allow ordinary names, cute or funny cat names, food words, place names, and normal words that only
look similar to a bad word (e.g. Turkish "sıkı", "Işık", "klasik"; Spanish "computadora").
language: the language you think the name is in (English name of the language), or "none".`;

export function createClaudeModerator({ create, model = DEFAULT_MODEL, timeoutMs = 15000, log = () => {} }) {
  const cache = new Map();
  return {
    async check(name, kind) {
      const key = `${kind}:${String(name).toLocaleLowerCase('tr')}`;
      const hit = cache.get(key);
      if (hit && hit.exp > Date.now()) return hit.value;
      const response = await create(
        {
          model,
          max_tokens: 4000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: [{ type: 'text', text: SYSTEM }],
          output_config: { format: { type: 'json_schema', schema: SCHEMA }, effort: 'low' },
          messages: [{ role: 'user', content: `Kind: ${kind === 'player' ? 'player nickname' : 'cat name'}\nName: ${JSON.stringify(String(name).slice(0, 40))}` }],
        },
        { timeout: timeoutMs, maxRetries: 1 },
      );
      let value;
      if (response.stop_reason === 'refusal') {
        value = { ok: false, reason: 'refused' };
      } else {
        const text = (response.content || []).find((b) => b.type === 'text');
        const data = JSON.parse(text ? text.text : '{}');
        value = { ok: data.allowed === true, reason: data.category || 'unknown', language: data.language || null };
      }
      if (!value.ok) log(`moderation: „${name}“ abgelehnt (${value.reason})`);
      if (cache.size > 5000) cache.clear();
      cache.set(key, { value, exp: Date.now() + 86400000 });
      return value;
    },
  };
}
