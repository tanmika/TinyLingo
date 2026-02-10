/**
 * Shared types for the matching engine.
 */

export interface MatchResult {
  term: string;
  explanation: string;
  source: 'exact' | 'smart';
}

export interface FuzzCandidate {
  term: string;
  explanation: string;
  score: number;
}
