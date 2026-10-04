// Cat Me If You Can – Auswahl der Analyse: Claude (wenn verfügbar) mit Rückfall auf die einfache Analyse.
//
// CATME_AI = auto (Standard) | claude | off | mock
//   auto   – Claude, wenn SDK + API-Key da sind, sonst einfache Analyse
//   claude – wie auto, aber ohne Key/SDK bricht der Start ab
//   off    – immer die einfache Analyse (Fellfarben aus dem Foto, keine Alters-/Gesundheitsschätzung)
//   mock   – Testbetrieb: einfache Analyse mit festen Beispielwerten für Alter/Gewicht

import { heuristicAnalysis, normalizeAnalysis } from '../public/core/analysis.js';
import { loadClaudeAnalyzer, DEFAULT_MODEL } from './analyzer-claude.js';
import { createClaudeModerator } from './moderator-claude.js';

export const heuristicAnalyzer = {
  name: 'heuristic',
  async analyze(input) {
    return heuristicAnalysis(input);
  },
};

export const mockAnalyzer = {
  name: 'mock',
  async analyze(input) {
    const base = heuristicAnalysis(input);
    if (input && input.detector && input.detector.score === 0) return normalizeAnalysis({ is_cat: false }, { analyzer: 'mock' });
    return normalizeAnalysis(
      {
        ...base,
        coat_colors: base.coat_colors,
        age_group: 'adult',
        age_months_min: 24,
        age_months_max: 60,
        weight_kg_min: 3.5,
        weight_kg_max: 4.5,
        body_condition_score: 5,
        ear_tip: 'tipped',
        breed_guess: 'Domestic shorthair (mixed)',
        breed_confidence: 0.7,
        behavior: 'relaxed',
        setting: 'street',
        health_severity: 'none',
        health_assessed: true,
        summary_tr: 'Test kedisi – sakin ve keyifli.',
        summary_de: 'Testkatze – ruhig und zufrieden.',
        summary_en: 'Test cat – calm and content.',
        nickname_ideas: ['Duman', 'Pamuk', 'Fıstık'],
        confidence: 0.6,
      },
      { analyzer: 'mock' },
    );
  },
};

/** Claude zuerst; bei Fehler (Netz, Zeitüberschreitung, Ablehnung) die einfache Analyse. */
export function withFallback(primary, fallback, log = () => {}) {
  return {
    name: primary.name,
    primary,
    async analyze(input) {
      try {
        return await primary.analyze(input);
      } catch (e) {
        log(`analyse: ${primary.name} fehlgeschlagen (${e && e.code ? e.code : ''} ${e && e.message ? e.message : e}) – einfache Analyse`);
        const a = await fallback.analyze(input);
        a.aiError = (e && e.code) || 'error';
        return a;
      }
    },
  };
}

export async function chooseAnalyzer({ mode = 'auto', model = DEFAULT_MODEL, timeoutMs = 45000, readCrop, log = () => {} } = {}) {
  if (mode === 'off') return { analyzer: heuristicAnalyzer, verifier: null, info: 'einfache Analyse (CATME_AI=off)' };
  if (mode === 'mock') return { analyzer: mockAnalyzer, verifier: null, info: 'Mock-Analyse (Tests)' };
  const { analyzer, create, reason } = await loadClaudeAnalyzer({ model, timeoutMs, readCrop, log });
  if (!analyzer) {
    const why = reason === 'no_sdk' ? 'Anthropic-SDK fehlt (npm install @anthropic-ai/sdk)' : 'kein ANTHROPIC_API_KEY';
    if (mode === 'claude') throw new Error(`CATME_AI=claude, aber ${why}`);
    return { analyzer: heuristicAnalyzer, verifier: null, info: `einfache Analyse – ${why}` };
  }
  return {
    analyzer: withFallback(analyzer, heuristicAnalyzer, log),
    verifier: { compare: (args) => analyzer.compare(args) },
    moderator: createClaudeModerator({ create, model, log }),
    info: `Claude (${model})`,
    claude: analyzer,
  };
}
