import type { FuzzCandidate } from './types.js';
import type { Glossary } from '../core/glossary.js';

function getBigrams(s: string): Map<string, number> {
  const bigrams = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
  }
  return bigrams;
}

/**
 * Compute the bigram (character 2-gram) Jaccard similarity between two strings.
 * Returns a value between 0 and 1.
 * For strings shorter than 2 characters, returns 0 if they differ, 1 if equal.
 */
export function bigramJaccard(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) {
    if (a.length === 0 || b.length === 0) return 0;
    return a === b ? 1 : 0;
  }
  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  const allKeys = new Set([...bigramsA.keys(), ...bigramsB.keys()]);
  let intersection = 0;
  let union = 0;
  for (const key of allKeys) {
    const countA = bigramsA.get(key) || 0;
    const countB = bigramsB.get(key) || 0;
    intersection += Math.min(countA, countB);
    union += Math.max(countA, countB);
  }
  if (union === 0) return 0;
  return intersection / union;
}

/**
 * Perform fuzzy matching against the glossary using bigram Jaccard similarity.
 * Returns candidates whose similarity score exceeds the given threshold.
 * Results are sorted by score descending.
 */
export function fuzzyMatch(
  message: string,
  glossary: Glossary,
  threshold: number
): FuzzCandidate[] {
  if (!message) return [];
  const results: FuzzCandidate[] = [];
  for (const [term, explanation] of Object.entries(glossary)) {
    const score = bigramJaccard(message, term);
    if (score > threshold) {
      results.push({ term, explanation, score });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}
