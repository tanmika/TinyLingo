import { describe, it, expect } from 'vitest';
import { bigramJaccard, fuzzyMatch } from '../../src/matching/fuzzy.js';
import type { Glossary } from '../../src/core/glossary.js';

describe('matching/fuzzy', () => {
  describe('bigramJaccard', () => {
    it('should return 1 for identical strings', () => {
      expect(bigramJaccard('hello', 'hello')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      const score = bigramJaccard('abc', 'xyz');
      expect(score).toBe(0);
    });

    it('should return a value between 0 and 1 for partially similar strings', () => {
      const score = bigramJaccard('night', 'nacht');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should be symmetric (a,b) === (b,a)', () => {
      const ab = bigramJaccard('hello', 'hallo');
      const ba = bigramJaccard('hallo', 'hello');
      expect(ab).toBe(ba);
    });

    it('should handle Chinese characters', () => {
      const score = bigramJaccard('智能抠图', '抠图功能');
      expect(score).toBeGreaterThan(0);
    });

    it('should return 1 for two identical single characters', () => {
      expect(bigramJaccard('a', 'a')).toBe(1);
    });

    it('should return 0 for two different single characters', () => {
      expect(bigramJaccard('a', 'b')).toBe(0);
    });

    it('should return 0 for empty strings', () => {
      expect(bigramJaccard('', '')).toBe(0);
    });

    it('should return 0 when one string is empty', () => {
      expect(bigramJaccard('hello', '')).toBe(0);
      expect(bigramJaccard('', 'hello')).toBe(0);
    });

    it('should compute bigrams correctly for "abcd" vs "bcde"', () => {
      // "abcd" bigrams: {ab, bc, cd} (3)
      // "bcde" bigrams: {bc, cd, de} (3)
      // intersection: {bc, cd} (2)
      // union: {ab, bc, cd, de} (4)
      // Jaccard = 2/4 = 0.5
      expect(bigramJaccard('abcd', 'bcde')).toBeCloseTo(0.5, 5);
    });
  });

  describe('fuzzyMatch', () => {
    const glossary: Glossary = {
      '智能抠图': 'BGRemover module',
      '联调': 'source debugging',
      '提交': 'git commit only',
      '背景移除': 'background removal feature',
    };

    it('should return candidates above threshold, sorted by score descending', () => {
      const results = fuzzyMatch('抠图', glossary, 0.1);
      expect(results.length).toBeGreaterThan(0);
      // Should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should return empty array when no candidate exceeds threshold', () => {
      const results = fuzzyMatch('完全无关的内容', glossary, 0.99);
      expect(results).toEqual([]);
    });

    it('should return empty array for empty glossary', () => {
      const results = fuzzyMatch('抠图', {}, 0.1);
      expect(results).toEqual([]);
    });

    it('should return empty array for empty message', () => {
      const results = fuzzyMatch('', glossary, 0.1);
      expect(results).toEqual([]);
    });

    it('should include term, explanation, and score in results', () => {
      const results = fuzzyMatch('抠图', glossary, 0.01);
      if (results.length > 0) {
        const first = results[0];
        expect(first).toHaveProperty('term');
        expect(first).toHaveProperty('explanation');
        expect(first).toHaveProperty('score');
        expect(typeof first.score).toBe('number');
      }
    });

    it('should respect threshold boundary', () => {
      const results = fuzzyMatch('抠图', glossary, 0.1);
      for (const r of results) {
        expect(r.score).toBeGreaterThan(0.1);
      }
    });
  });
});
