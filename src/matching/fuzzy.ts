import type { FuzzCandidate } from './types.js';
import type { Glossary } from '../core/glossary.js';

const MAX_CANDIDATES = 12;

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
 * Check if a term is ASCII-based (English words, alphanumeric identifiers).
 * These terms should be matched at word level, not character level.
 */
export function isAsciiTerm(term: string): boolean {
  return /^[a-zA-Z0-9_\-.]+$/.test(term);
}

/**
 * Extract word tokens from a message (English words, alphanumeric sequences).
 */
function extractWords(message: string): string[] {
  return message.match(/[a-zA-Z0-9_\-.]+/g) || [];
}

/**
 * Minimum number of shared bigrams required for a positive score in word-level
 * matching. Prevents single-bigram accidents (e.g. "undo" matching "godot" via "do").
 */
const MIN_BIGRAM_OVERLAP = 2;

/**
 * For ASCII terms: compare against individual words extracted from the message.
 * Uses case-insensitive bigramJaccard comparison.
 * Requires at least MIN_BIGRAM_OVERLAP shared bigrams to produce a positive score.
 */
export function wordLevelJaccard(message: string, term: string): number {
  const words = extractWords(message);
  if (words.length === 0) return 0;
  const termLower = term.toLowerCase();
  const termBigrams = getBigrams(termLower);
  let maxScore = 0;
  for (const word of words) {
    const wordLower = word.toLowerCase();
    const wordBigrams = getBigrams(wordLower);
    let overlap = 0;
    for (const [key, count] of termBigrams) {
      overlap += Math.min(count, wordBigrams.get(key) || 0);
    }
    if (overlap < MIN_BIGRAM_OVERLAP) continue;
    const score = bigramJaccard(wordLower, termLower);
    if (score > maxScore) maxScore = score;
  }
  return maxScore;
}

/**
 * Compute the best bigram Jaccard score between a term and any
 * sliding window of the message. Window sizes range from
 * term.length to term.length + 2 to allow slight length variation.
 *
 * Used for CJK terms where character-level bigrams are meaningful.
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
 * Compute fuzzy similarity between a message and a term.
 * Automatically selects matching strategy based on term type:
 * - ASCII terms (English/alphanumeric): word-level comparison
 * - CJK terms: character-level sliding window bigram
 */
export function termScore(message: string, term: string): number {
  return isAsciiTerm(term)
    ? wordLevelJaccard(message, term)
    : slidingWindowJaccard(message, term);
}

/**
 * Perform fuzzy matching against the glossary.
 * Uses word-level matching for ASCII terms and sliding-window
 * bigram Jaccard for CJK terms.
 * Returns up to MAX_CANDIDATES candidates whose score exceeds the threshold,
 * sorted descending.
 */
export function fuzzyMatch(
  message: string,
  glossary: Glossary,
  threshold: number
): FuzzCandidate[] {
  if (!message) return [];
  const results: FuzzCandidate[] = [];
  for (const [term, explanation] of Object.entries(glossary)) {
    const score = termScore(message, term);
    if (score > threshold) {
      results.push({ term, explanation, score });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, MAX_CANDIDATES);
}
