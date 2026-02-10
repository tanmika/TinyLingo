import { describe, it, expect } from 'vitest';
import { exactMatch } from '../../src/matching/exact.js';
import type { Glossary } from '../../src/core/glossary.js';

describe('matching/exact', () => {
  const glossary: Glossary = {
    '智能抠图': 'BGRemover module in ProjectA',
    '联调': 'source debugging with localConfig.cmake',
    '提交': 'git commit only, no push',
    '依赖更新': 'use package manager, no init scripts',
  };

  describe('exactMatch', () => {
    it('should find a single exact match', () => {
      const results = exactMatch('帮我提交一下代码', glossary);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        term: '提交',
        explanation: 'git commit only, no push',
        source: 'exact',
      });
    });

    it('should find multiple matches in one message', () => {
      const results = exactMatch('提交代码后需要更新依赖更新', glossary);
      const terms = results.map((r) => r.term);
      expect(terms).toContain('提交');
      expect(terms).toContain('依赖更新');
    });

    it('should return empty array when no match', () => {
      const results = exactMatch('今天天气不错', glossary);
      expect(results).toEqual([]);
    });

    it('should return empty array for empty message', () => {
      const results = exactMatch('', glossary);
      expect(results).toEqual([]);
    });

    it('should return empty array for empty glossary', () => {
      const results = exactMatch('提交代码', {});
      expect(results).toEqual([]);
    });

    it('should match when message equals key exactly', () => {
      const results = exactMatch('提交', glossary);
      expect(results).toHaveLength(1);
      expect(results[0].term).toBe('提交');
    });

    it('should match Chinese terms correctly', () => {
      const results = exactMatch('智能抠图功能有bug', glossary);
      expect(results).toHaveLength(1);
      expect(results[0].term).toBe('智能抠图');
    });

    it('should set source to "exact" for all results', () => {
      const results = exactMatch('提交后联调', glossary);
      for (const r of results) {
        expect(r.source).toBe('exact');
      }
    });

    it('should match all occurrences even when key appears multiple times in message', () => {
      // Key appears twice but should only produce one match result per key
      const results = exactMatch('提交代码再提交一次', glossary);
      expect(results).toHaveLength(1);
      expect(results[0].term).toBe('提交');
    });
  });
});
