import type { MatchResult } from './types.js';
import type { Glossary } from '../core/glossary.js';
import type { TinyLingoConfig } from '../core/config.js';
import { exactMatch } from './exact.js';
import { fuzzyMatch } from './fuzzy.js';
import { smartMatch } from './smart.js';
import { debugLog } from '../core/logger.js';

/**
 * Run the full matching pipeline:
 * 1. Exact substring matching (always runs)
 * 2. If smart matching is enabled:
 *    a. Fuzzy pre-filter on terms NOT already matched by exact
 *    b. Send fuzzy candidates to LLM for confirmation
 * 3. Merge exact + smart results, deduplicate by term
 *
 * @param message - The user's message
 * @param glossary - The glossary to match against
 * @param config - Configuration for matching behavior
 * @returns Combined and deduplicated match results
 */
export async function matchAll(
  message: string,
  glossary: Glossary,
  config: TinyLingoConfig
): Promise<MatchResult[]> {
  debugLog('pipeline', { message, glossaryKeys: Object.keys(glossary) });

  const exactResults = exactMatch(message, glossary);
  debugLog('exact', { matches: exactResults.map((r) => r.term) });

  if (!config.smart.enabled) {
    debugLog('pipeline', { mode: 'exact-only', results: exactResults.map((r) => r.term) });
    return exactResults;
  }

  const exactTerms = new Set(exactResults.map((r) => r.term));

  // Build a filtered glossary excluding exact-matched terms
  const remaining: Glossary = {};
  for (const [term, explanation] of Object.entries(glossary)) {
    if (!exactTerms.has(term)) {
      remaining[term] = explanation;
    }
  }

  const fuzzCandidates = fuzzyMatch(message, remaining, config.smart.fuzzyThreshold);
  debugLog('fuzzy', {
    threshold: config.smart.fuzzyThreshold,
    candidates: fuzzCandidates.map((c) => ({ term: c.term, score: c.score })),
  });

  if (fuzzCandidates.length === 0) {
    debugLog('pipeline', { mode: 'exact+smart', results: exactResults.map((r) => r.term) });
    return exactResults;
  }

  const smartResults = await smartMatch(message, fuzzCandidates, config);

  // Merge and deduplicate, exact takes priority
  const seen = new Set(exactResults.map((r) => r.term));
  const merged = [...exactResults];
  for (const r of smartResults) {
    if (!seen.has(r.term)) {
      seen.add(r.term);
      merged.push(r);
    }
  }

  debugLog('pipeline', { mode: 'exact+smart', results: merged.map((r) => `${r.term}(${r.source})`) });
  return merged;
}
