import type { MatchResult } from './types.js';
import type { Glossary } from '../core/glossary.js';

/**
 * Perform exact substring matching against the glossary.
 * Iterates over all glossary keys and checks if the message contains each key.
 * Returns all matches found.
 */
export function exactMatch(message: string, glossary: Glossary): MatchResult[] {
  const results: MatchResult[] = [];
  for (const [term, explanation] of Object.entries(glossary)) {
    if (message.includes(term)) {
      results.push({ term, explanation, source: 'exact' });
    }
  }
  return results;
}
