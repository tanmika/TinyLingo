import type { MatchResult, FuzzCandidate } from './types.js';
import type { TinyLingoConfig } from '../core/config.js';

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

  const prompt = `用户消息: "${message}"

以下是候选术语:
${candidateList}

哪些术语与用户消息相关？只回复相关术语的序号（逗号分隔），如果都不相关则回复空。 /no_think`;

  try {
    const res = await fetch(config.smart.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.smart.model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    if (!content.trim()) return [];

    const indices = content
      .split(/[,，\s]+/)
      .map((s: string) => parseInt(s.trim(), 10))
      .filter((n: number) => !isNaN(n) && n >= 1 && n <= candidates.length);

    return indices.map((i: number) => ({
      term: candidates[i - 1].term,
      explanation: candidates[i - 1].explanation,
      source: 'smart' as const,
    }));
  } catch {
    return [];
  }
}
