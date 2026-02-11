import { describe, it, expect } from 'vitest';
import { bigramJaccard, slidingWindowJaccard, wordLevelJaccard, isAsciiTerm, termScore, fuzzyMatch } from '../../src/matching/fuzzy.js';
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

  describe('slidingWindowJaccard', () => {
    it('should find high similarity for partial match in long message', () => {
      // "大头类型" contains "大头" which overlaps with "大头贴"
      const score = slidingWindowJaccard('登录区域图片全身和大头类型的认证都有问题', '大头贴');
      expect(score).toBeGreaterThan(0.2);
    });

    it('should find high similarity for "登录区域" vs "登录模块"', () => {
      const score = slidingWindowJaccard('登录区域图片全身和大头类型的认证都有问题', '登录模块');
      expect(score).toBeGreaterThan(0.15);
    });

    it('should return 0 for completely unrelated content', () => {
      const score = slidingWindowJaccard('今天天气真好阳光明媚', '登录模块');
      expect(score).toBe(0);
    });

    it('should fall back to whole-message comparison when message is short', () => {
      const score = slidingWindowJaccard('大头', '大头贴');
      const direct = bigramJaccard('大头', '大头贴');
      expect(score).toBe(direct);
    });
  });

  describe('isAsciiTerm', () => {
    it('should return true for English words', () => {
      expect(isAsciiTerm('godot')).toBe(true);
      expect(isAsciiTerm('React')).toBe(true);
    });

    it('should return true for alphanumeric identifiers', () => {
      expect(isAsciiTerm('h264')).toBe(true);
      expect(isAsciiTerm('utf8')).toBe(true);
      expect(isAsciiTerm('arm64-v8a')).toBe(true);
      expect(isAsciiTerm('node_modules')).toBe(true);
    });

    it('should return false for Chinese terms', () => {
      expect(isAsciiTerm('排查问题')).toBe(false);
      expect(isAsciiTerm('提交')).toBe(false);
    });

    it('should return false for mixed CJK+ASCII terms', () => {
      expect(isAsciiTerm('godot引擎')).toBe(false);
    });
  });

  describe('wordLevelJaccard', () => {
    it('should match exact English word in message', () => {
      const score = wordLevelJaccard('look at godot source code', 'godot');
      expect(score).toBe(1);
    });

    it('should match case-insensitively', () => {
      const score = wordLevelJaccard('check Godot engine', 'godot');
      expect(score).toBe(1);
    });

    it('should NOT match unrelated words sharing a bigram', () => {
      // "undo" shares bigram "do" with "godot" but should get low score
      const score = wordLevelJaccard('484: bhl push undo type 2', 'godot');
      // 1/6 ≈ 0.167 — much lower than sliding window and below practical threshold
      expect(score).toBeLessThan(0.2);
    });

    it('should NOT match "decode" against "godot"', () => {
      const score = wordLevelJaccard('decodeJsonFile 9264', 'godot');
      expect(score).toBeLessThan(0.2);
    });

    it('should return 0 for pure Chinese message against English term', () => {
      const score = wordLevelJaccard('编译通过，我需要测试什么？', 'godot');
      expect(score).toBe(0);
    });

    it('should match similar words (typos)', () => {
      // "godot4" vs "godot" should score high
      const score = wordLevelJaccard('using godot4 engine', 'godot');
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('termScore', () => {
    it('should use word-level matching for ASCII terms', () => {
      // "undo" in message should NOT significantly match "godot"
      const score = termScore('484: bhl push undo type 2', 'godot');
      expect(score).toBeLessThan(0.2);
    });

    it('should use sliding window for CJK terms', () => {
      const score = termScore('登录区域图片全身和大头类型的认证都有问题', '大头贴');
      expect(score).toBeGreaterThan(0.2);
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

    it('should limit candidates to 12', () => {
      // Create a large glossary with many similar CJK terms
      const bigGlossary: Glossary = {};
      for (let i = 0; i < 20; i++) {
        bigGlossary[`抠图功能${i}`] = `explanation ${i}`;
      }
      const results = fuzzyMatch('抠图', bigGlossary, 0.01);
      expect(results.length).toBeLessThanOrEqual(12);
    });

    it('should use word-level matching for English terms in glossary', () => {
      const mixed: Glossary = {
        godot: 'game engine reference at /path/to/godot',
        '提交': 'git commit only',
      };
      // "undo" shares a bigram with "godot" but word-level matching should give low score
      const results = fuzzyMatch('484: bhl push undo type 2', mixed, 0.2);
      const godotResult = results.find((r) => r.term === 'godot');
      expect(godotResult).toBeUndefined();
    });
  });
});
