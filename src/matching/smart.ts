import type { MatchResult, FuzzCandidate } from './types.js';
import type { TinyLingoConfig } from '../core/config.js';
import { debugLog } from '../core/logger.js';

/**
 * Perform smart matching using a local LLM API.
 * Sends fuzzy candidates + user message to the LLM, which decides
 * which candidates are truly relevant.
 *
 * The prompt includes `/no_think` to disable reasoning for faster response.
 * Parses the LLM response to extract confirmed candidate indices.
 *
 * @param message - The user's message
 * @param candidates - Fuzzy match candidates to evaluate
 * @param config - Configuration containing LLM endpoint, model, etc.
 * @returns Confirmed matches from the LLM
 */
export async function smartMatch(
  message: string,
  candidates: FuzzCandidate[],
  config: TinyLingoConfig
): Promise<MatchResult[]> {
  if (candidates.length === 0) return [];

  const candidateList = candidates
    .map((c, i) => `${i + 1}. ${c.term}: ${c.explanation}`)
    .join('\n');

  const prompt = config.smart.prompt
    .replace(/\{message\}/g, message)
    .replace(/\{candidates\}/g, candidateList);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.smart.apiKey) {
      headers['Authorization'] = `Bearer ${config.smart.apiKey}`;
    }

    const t0 = Date.now();
    const res = await fetch(config.smart.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.smart.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 32,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - t0;

    if (!res.ok) {
      debugLog('smart', { error: `HTTP ${res.status}`, latencyMs });
      return [];
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';

    debugLog('smart', {
      fuzzyCandidates: candidates.map((c) => ({ term: c.term, score: c.score })),
      llmResponse: content,
      latencyMs,
    });

    if (!content.trim()) return [];

    const indices = parseIndices(content, candidates.length);

    return indices.map((i: number) => ({
      term: candidates[i - 1].term,
      explanation: candidates[i - 1].explanation,
      source: 'smart' as const,
    }));
  } catch (err) {
    debugLog('smart', { error: String(err) });
    return [];
  }
}

/**
 * Parse LLM response to extract candidate indices.
 * Tries JSON format first ({"relevant": [1, 2]}),
 * falls back to extracting numbers from plain text.
 */
export function parseIndices(content: string, maxIndex: number): number[] {
  // Strip <think> blocks and markdown code fences
  let cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '');
  cleaned = cleaned.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();

  // Try JSON: {"relevant": [1, 2]}
  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*"relevant"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.relevant)) {
        return parsed.relevant
          .map((n: unknown) => typeof n === 'number' ? n : parseInt(String(n), 10))
          .filter((n: number) => !isNaN(n) && n >= 1 && n <= maxIndex);
      }
    }
  } catch {
    // fall through to plain text parsing
  }

  // Fallback: extract numbers from text
  return cleaned
    .split(/[,，\s]+/)
    .map((s: string) => parseInt(s.trim(), 10))
    .filter((n: number) => !isNaN(n) && n >= 1 && n <= maxIndex);
}
