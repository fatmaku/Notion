// Cat Me If You Can – Katzenanalyse mit Claude (Bildverständnis + Structured Outputs).
//
// Zwei Aufgaben:
//   analyze() – ein Foto → Fellmuster, Rasse-Tipp, Alter, Gewicht, Körperzustand (BCS 1–9),
//               Geschlecht (wenn erkennbar), Ohrmarke (Kastration), Gesundheit, Verhalten …
//   compare() – „Ist das dieselbe Katze wie eine dieser bekannten?“ (Wiedererkennung)
//
// Das Anthropic-SDK ist eine OPTIONALE Abhängigkeit (npm install @anthropic-ai/sdk). Fehlt es
// oder fehlt der API-Key, nimmt der Server die einfache Analyse (server/analyzers.js).
// Für Tests lässt sich `create(request, options)` injizieren.

import { ANALYSIS_SCHEMA, normalizeAnalysis } from '../public/core/analysis.js';
import { PATTERNS } from '../public/core/taxonomy.js';

export const DEFAULT_MODEL = 'claude-opus-5-5';

const PATTERN_GUIDE = Object.entries(PATTERNS)
  .map(([k, v]) => `  - ${k}: ${v.label.en} (${v.label.tr})`)
  .join('\n');

export const SYSTEM_PROMPT = `You are the field-vet eye of "Cat Me If You Can", a street-cat census game in Kadıköy, Istanbul.
Players photograph street cats with their phones. You analyse one photo. Your answer feeds a
collectible game card AND a public welfare census that volunteers and vets use, so accuracy and
honesty matter more than entertainment. Never invent details that are not visible – prefer
"unknown" or null.

Images: Image 1 is the full photo. Image 2 (if present) is a crop around the cat the player aimed at
– that is the "main cat". Describe the main cat; use the full photo for context (size relative to
surroundings, setting, people).

Field guide:
- is_cat: true only if a real, living domestic cat is clearly visible. cat_count = number of cats.
- is_live_photo: false if the image shows a screen, monitor, phone display, printed photo, poster,
  toy, statue, drawing or AI-generated picture instead of a real cat in front of the camera (look for
  moiré, pixel grids, bezels, paper edges, glare).
- ownership: only street cats count in this game. "owned" = clearly someone's pet: collar or
  harness, on a leash, indoors (sofa, bed, inside a flat, behind a window from the inside), on a
  private balcony, held by a person, pedigree cat in a home. "street" = outdoors in public space
  (street, park, stairs, cars, shop fronts) – community cats that neighbours feed outdoors and
  ear-tipped cats are street cats. "unclear" otherwise. ownership_reason: one short English phrase.
- main_cat_box: normalised box (0–1) of the main cat in Image 1: x, y = top-left, w, h. All 0 if no cat.
- pattern – pick the closest type:
${PATTERN_GUIDE}
  Tabby = striped/blotched/spotted brown or grey (Turkish "tekir"). Calico = white + orange + black
  patches. Tortoiseshell = brindled orange + black with little or no white. Van pattern = mostly
  white with coloured head patches and tail.
- coat_colors: visible coat colours. long_hair: true for semi-long/long coats.
- eye_color: "odd" for two different eye colours. "unknown" if eyes are closed or not visible.
- breed_guess (English): most Istanbul street cats are "Domestic shorthair (mixed)". Only name a
  breed (Turkish Van, Turkish Angora, British Shorthair mix, Siamese mix, Persian mix …) if the
  features are clear. breed_confidence 0–1.
- Age cues: kitten (<6 months) = big head and ears relative to body, very small, fluffy, blue-grey
  eyes under ~7 weeks; junior (6–24 months) = lanky, slim; adult (2–8 years); senior (8+) = bony
  spine/hips, unkempt coat, cloudy eyes, sagging belly skin. Give a plausible months range.
- Weight: estimate from apparent body size and condition; a typical adult street cat is 3–5 kg,
  a 3-month kitten about 1.5 kg. null if the body is not visible enough.
- body_condition_score: WSAVA 1–9 (1 emaciated, 5 ideal, 9 obese). null if not assessable.
- sex_guess: calico/tortoiseshell → almost always female; intact tom = broad jowls, thick neck,
  scars. Otherwise "unknown". sex_reason: one short English phrase.
- ear_tip: in Istanbul neutered street cats usually carry a clipped/notched ear tip (TNR mark).
  "tipped", "none" (both ear tips visible and intact) or "not_visible".
- health_flags: only what is clearly visible. health_severity:
  none · mild (cosmetic, slight discharge) · attention (a vet should look within days: eye
  infection, skin disease, thin, limping) · urgent (needs help today: open or bleeding wound,
  badly injured eye, extreme emaciation, unable to stand, trapped).
- health_notes: one short factual Turkish sentence for volunteers; empty string if nothing to note.
- behavior and setting: what the cat is doing and where.
- people_visible: true if any person or face is visible in Image 1.
- distinctive_marks (English, concise): features that identify THIS individual later – e.g.
  "white chest blaze, notched right ear, kinked tail, black spot on nose".
- nickname_ideas: 3 short, kind names that suit the cat (Turkish street-cat style: Paşa, Duman,
  Pamuk, Karamel, Zeytin, Fıstık, Tarçın, Boncuk …).
- summary_tr / summary_de / summary_en / summary_ru / summary_ar / summary_fa: the same warm, playful
  sentence (max 140 characters) in Turkish, German, English, Russian, Arabic and Persian, like the
  flavour text on a collectible card; very simple words (many readers are tourists); mention the
  neighbourhood if given. No health speculation.
- confidence: your overall confidence 0–1.
If is_cat is false: neutral values (pattern "diger", unknown, null) and say in the summaries what
the photo shows instead.`;

const COMPARE_SCHEMA = {
  type: 'object',
  properties: {
    match_index: { type: 'integer' },
    confidence: { type: 'number' },
    reason: { type: 'string' },
  },
  required: ['match_index', 'confidence', 'reason'],
  additionalProperties: false,
};

const COMPARE_SYSTEM = `You re-identify individual street cats for a census in Istanbul. You get a NEW photo of a cat
and up to three photos of KNOWN cats seen nearby. Decide whether the new cat is the same individual
as one of the known cats. Compare stable features: coat pattern and patch layout, stripe/spot
placement, facial markings, nose colour, ear notches/tips, tail shape, eye colour, body build.
Ignore pose, lighting and background. Similar-looking tabbies are common – only match when the
individual features agree. match_index: the 1-based number of the matching known cat, or 0 if none.
confidence 0–1. reason: one short English sentence.`;

function textOf(response) {
  for (const block of response.content || []) if (block.type === 'text') return block.text;
  return '';
}

function imageBlock(img) {
  return { type: 'image', source: { type: 'base64', media_type: img.mime || 'image/jpeg', data: img.data } };
}

export class AnalyzerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AnalyzerError';
    this.code = code;
  }
}

/**
 * create(request, options) → Message. Standard: client.beta.messages.create des SDK.
 * Fallbacks: bei einer Ablehnung durch Sicherheitsfilter beantwortet die API die Anfrage
 * serverseitig mit dem empfohlenen Ersatzmodell (fallbacks: "default").
 */
export function createClaudeAnalyzer({ create, model = DEFAULT_MODEL, timeoutMs = 45000, readCrop = null, log = () => {} }) {
  const stats = { calls: 0, errors: 0, lastError: null, compareCalls: 0 };

  function baseRequest(system, schema, content, effort) {
    return {
      model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      output_config: { format: { type: 'json_schema', schema }, effort },
      messages: [{ role: 'user', content }],
    };
  }

  async function call(request, { timeout = timeoutMs, maxRetries = 1 } = {}) {
    let response;
    try {
      response = await create(request, { timeout, maxRetries });
    } catch (e) {
      stats.errors++;
      stats.lastError = e && e.message ? String(e.message).slice(0, 200) : String(e);
      throw new AnalyzerError('upstream', stats.lastError);
    }
    if (response.stop_reason === 'refusal') throw new AnalyzerError('refusal', 'Analyse abgelehnt');
    if (response.stop_reason === 'max_tokens') throw new AnalyzerError('truncated', 'Analyse abgeschnitten');
    const raw = textOf(response);
    try {
      return { data: JSON.parse(raw), model: response.model || model };
    } catch {
      stats.errors++;
      throw new AnalyzerError('bad_json', 'Antwort war kein gültiges JSON');
    }
  }

  return {
    name: 'claude',
    model,
    stats,

    buildAnalyzeRequest({ images, detector, lang, region, district, localTime }) {
      const content = [];
      if (images.full) content.push(imageBlock(images.full));
      if (images.crop && images.crop !== images.full) content.push(imageBlock(images.crop));
      const ctxLines = [
        `Neighbourhood: ${district ? `${district.name}${district.aka ? ` (${district.aka})` : ''}, ` : ''}${region ? region.name : 'Kadıköy'}, İstanbul.`,
        detector && detector.score != null ? `On-device detector: cat score ${Number(detector.score).toFixed(2)}.` : 'No on-device detection available.',
        localTime ? `Local time: ${localTime}.` : null,
        `Player language: ${lang || 'tr'}.`,
        'Analyse the main cat and fill every field.',
      ].filter(Boolean);
      content.push({ type: 'text', text: ctxLines.join('\n') });
      return baseRequest(SYSTEM_PROMPT, ANALYSIS_SCHEMA, content, 'medium');
    },

    async analyze(input) {
      stats.calls++;
      const localTime = new Date().toLocaleString('tr-TR', { timeZone: (input.region && input.region.timezone) || 'Europe/Istanbul' });
      const { data, model: used } = await call(this.buildAnalyzeRequest({ ...input, localTime }));
      return normalizeAnalysis(data, { analyzer: 'claude', model: used });
    },

    /** Wiedererkennung. candidates: [{id, photoId, profile}] → {matchId|null, confidence, reason} */
    async compare({ images, candidates }) {
      if (!readCrop) throw new AnalyzerError('no_photos', 'Kein Fotozugriff für den Vergleich');
      const newImg = images.crop || images.full;
      if (!newImg) throw new AnalyzerError('no_image', 'Kein Bild');
      const known = [];
      for (const c of candidates.slice(0, 3)) {
        const data = c.photoId ? await readCrop(c.photoId) : null;
        if (data) known.push({ c, data });
      }
      if (!known.length) return { matchId: null, confidence: 0, reason: 'no candidate photos' };
      stats.compareCalls++;
      const content = [{ type: 'text', text: 'NEW cat:' }, imageBlock(newImg)];
      known.forEach((k, i) => {
        const p = k.c.profile || {};
        content.push({ type: 'text', text: `KNOWN cat ${i + 1} (${p.pattern || '?'}; ${p.distinctive_marks || 'no notes'}):` });
        content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: k.data } });
      });
      content.push({ type: 'text', text: 'Is the NEW cat one of the KNOWN cats?' });
      const { data } = await call(baseRequest(COMPARE_SYSTEM, COMPARE_SCHEMA, content, 'medium'), { timeout: 30000, maxRetries: 0 });
      const idx = Number.isInteger(data.match_index) ? data.match_index : 0;
      const confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0));
      const hit = idx >= 1 && idx <= known.length && confidence >= 0.6 ? known[idx - 1].c.id : null;
      log(`compare: ${hit ? `match ${hit}` : 'no match'} (${confidence.toFixed(2)}) – ${String(data.reason || '').slice(0, 120)}`);
      return { matchId: hit, confidence, reason: String(data.reason || '').slice(0, 200) };
    },
  };
}

/** Lädt das SDK (optional) und baut den Analyzer – oder gibt {reason} zurück, warum nicht. */
export async function loadClaudeAnalyzer({ model, timeoutMs, readCrop, log }) {
  let Anthropic;
  try {
    Anthropic = (await import('@anthropic-ai/sdk')).default;
  } catch {
    return { analyzer: null, reason: 'no_sdk' };
  }
  const client = new Anthropic();
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) || client.apiKey != null || client.authToken != null;
  if (!hasKey) return { analyzer: null, reason: 'no_key' };
  const create = (request, options) => client.beta.messages.create(request, options);
  const analyzer = createClaudeAnalyzer({ create, model, timeoutMs, readCrop, log });
  return { analyzer, create, reason: null };
}
