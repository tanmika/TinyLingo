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
 * Compute the best bigram Jaccard score between a term and any
 * sliding window of the message. Window sizes range from
 * term.length to term.length + 2 to allow slight length variation.
 */
export function slidingWindowJaccard(message: string, term: string): number {
  const termLen = term.length;
  if (message.length <= termLen + 2) {
    return bigramJaccard(message, term);
  }
  let maxScore = 0;
  const minSize = Math.max(2, termLen);
  const maxSize = termLen + 2;
  for (let size = minSize; size <= maxSize; size++) {
    for (let i = 0; i <= message.length - size; i++) {
      const window = message.slice(i, i + size);
      const score = bigramJaccard(window, term);
      if (score > maxScore) maxScore = score;
    }
  }
  return maxScore;
}

/**
 * Perform fuzzy matching against the glossary using sliding-window
 * bigram Jaccard similarity. For each glossary term, slides a window
 * across the message to find the best local match.
 * Returns candidates whose score exceeds the threshold, sorted descending.
 */
export function fuzzyMatch(
  message: string,
  glossary: Glossary,
  threshold: number
): FuzzCandidate[] {
  if (!message) return [];
  const results: FuzzCandidate[] = [];
  for (const [term, explanation] of Object.entries(glossary)) {
    const score = slidingWindowJaccard(message, term);
    if (score > threshold) {
      results.push({ term, explanation, score });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}
