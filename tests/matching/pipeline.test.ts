import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Glossary } from '../../src/core/glossary.js';
import type { TinyLingoConfig } from '../../src/core/config.js';

// Mock the matching modules
vi.mock('../../src/matching/exact.js', () => ({
  exactMatch: vi.fn(),
}));
vi.mock('../../src/matching/fuzzy.js', () => ({
  fuzzyMatch: vi.fn(),
}));
vi.mock('../../src/matching/smart.js', () => ({
  smartMatch: vi.fn(),
}));

import { matchAll } from '../../src/matching/pipeline.js';
import { exactMatch } from '../../src/matching/exact.js';
import { fuzzyMatch } from '../../src/matching/fuzzy.js';
import { smartMatch } from '../../src/matching/smart.js';

const mockedExactMatch = vi.mocked(exactMatch);
const mockedFuzzyMatch = vi.mocked(fuzzyMatch);
const mockedSmartMatch = vi.mocked(smartMatch);

describe('matching/pipeline', () => {
  const glossary: Glossary = {
    '智能抠图': 'BGRemover module',
    '联调': 'source debugging',
    '提交': 'git commit only',
  };

  const configSmartOff: TinyLingoConfig = {
    smart: {
      enabled: false,
      endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
      model: 'qwen3-0.6b',
      fuzzyThreshold: 0.2,
    },
  };

  const configSmartOn: TinyLingoConfig = {
    smart: {
      enabled: true,
      endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
      model: 'qwen3-0.6b',
      fuzzyThreshold: 0.2,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('smart disabled (exact only)', () => {
    it('should only run exact match when smart is disabled', async () => {
      mockedExactMatch.mockReturnValue([
        { term: '提交', explanation: 'git commit only', source: 'exact' },
      ]);

      const results = await matchAll('帮我提交代码', glossary, configSmartOff);

      expect(mockedExactMatch).toHaveBeenCalledWith('帮我提交代码', glossary);
      expect(mockedFuzzyMatch).not.toHaveBeenCalled();
      expect(mockedSmartMatch).not.toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].term).toBe('提交');
    });

    it('should return empty array when no exact match and smart is off', async () => {
      mockedExactMatch.mockReturnValue([]);

      const results = await matchAll('今天天气真好', glossary, configSmartOff);

      expect(results).toEqual([]);
      expect(mockedFuzzyMatch).not.toHaveBeenCalled();
      expect(mockedSmartMatch).not.toHaveBeenCalled();
    });
  });

  describe('smart enabled (full pipeline)', () => {
    it('should run fuzzy + smart for terms not matched by exact', async () => {
      mockedExactMatch.mockReturnValue([
        { term: '提交', explanation: 'git commit only', source: 'exact' },
      ]);
      mockedFuzzyMatch.mockReturnValue([
        { term: '智能抠图', explanation: 'BGRemover module', score: 0.35 },
      ]);
      mockedSmartMatch.mockResolvedValue([
        { term: '智能抠图', explanation: 'BGRemover module', source: 'smart' },
      ]);

      const results = await matchAll('提交代码后看看抠图', glossary, configSmartOn);

      expect(mockedExactMatch).toHaveBeenCalled();
      expect(mockedFuzzyMatch).toHaveBeenCalled();
      expect(mockedSmartMatch).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    it('should not call smart match when no fuzzy candidates', async () => {
      mockedExactMatch.mockReturnValue([
        { term: '提交', explanation: 'git commit only', source: 'exact' },
      ]);
      mockedFuzzyMatch.mockReturnValue([]);

      const results = await matchAll('帮我提交代码', glossary, configSmartOn);

      expect(mockedSmartMatch).not.toHaveBeenCalled();
      expect(results).toHaveLength(1);
    });

    it('should deduplicate results by term', async () => {
      // Same term matched by both exact and smart
      mockedExactMatch.mockReturnValue([
        { term: '提交', explanation: 'git commit only', source: 'exact' },
      ]);
      mockedFuzzyMatch.mockReturnValue([
        { term: '提交', explanation: 'git commit only', score: 0.8 },
      ]);
      mockedSmartMatch.mockResolvedValue([
        { term: '提交', explanation: 'git commit only', source: 'smart' },
      ]);

      const results = await matchAll('提交', glossary, configSmartOn);

      // Should be deduplicated - exact match takes priority
      const commitResults = results.filter((r) => r.term === '提交');
      expect(commitResults).toHaveLength(1);
      expect(commitResults[0].source).toBe('exact');
    });
  });

  describe('edge cases', () => {
    it('should handle empty glossary', async () => {
      mockedExactMatch.mockReturnValue([]);
      mockedFuzzyMatch.mockReturnValue([]);

      const results = await matchAll('test message', {}, configSmartOn);
      expect(results).toEqual([]);
    });

    it('should handle empty message', async () => {
      mockedExactMatch.mockReturnValue([]);

      const results = await matchAll('', glossary, configSmartOff);
      expect(results).toEqual([]);
    });
  });
});
