import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { smartMatch } from '../../src/matching/smart.js';
import type { FuzzCandidate } from '../../src/matching/types.js';
import type { TinyLingoConfig } from '../../src/core/config.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('matching/smart', () => {
  const config: TinyLingoConfig = {
    smart: {
      enabled: true,
      endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
      model: 'qwen3-0.6b',
      fuzzyThreshold: 0.2,
    },
  };

  const candidates: FuzzCandidate[] = [
    { term: '智能抠图', explanation: 'BGRemover module', score: 0.45 },
    { term: '背景移除', explanation: 'background removal', score: 0.3 },
    { term: '提交', explanation: 'git commit only', score: 0.25 },
  ];

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call the LLM endpoint with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '1' } }],
      }),
    });

    await smartMatch('抠图功能有问题', candidates, config);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(config.smart.endpoint);
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.model).toBe(config.smart.model);
    expect(body.messages).toBeDefined();
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it('should include /no_think in the prompt', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '1' } }],
      }),
    });

    await smartMatch('test message', candidates, config);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const allContent = body.messages.map((m: { content: string }) => m.content).join(' ');
    expect(allContent).toContain('/no_think');
  });

  it('should parse LLM response and return confirmed matches', async () => {
    // LLM returns indices "1,2" meaning candidates[0] and candidates[1]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '1,2' } }],
      }),
    });

    const results = await smartMatch('抠图功能有问题', candidates, config);
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) {
      expect(r.source).toBe('smart');
    }
  });

  it('should return empty array when LLM says no match', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '' } }],
      }),
    });

    const results = await smartMatch('完全无关', candidates, config);
    expect(results).toEqual([]);
  });

  it('should return empty array when candidates list is empty', async () => {
    const results = await smartMatch('test', [], config);
    expect(results).toEqual([]);
    // Should not call fetch when there are no candidates
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle API error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const results = await smartMatch('test', candidates, config);
    expect(results).toEqual([]);
  });

  it('should handle network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    const results = await smartMatch('test', candidates, config);
    expect(results).toEqual([]);
  });

  it('should handle malformed LLM response gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'invalid response text' } }],
      }),
    });

    const results = await smartMatch('test', candidates, config);
    // Should not throw, return empty or partial results
    expect(Array.isArray(results)).toBe(true);
  });
});
