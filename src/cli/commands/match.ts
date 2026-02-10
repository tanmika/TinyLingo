import { readGlossary } from '../../core/glossary.js';
import { readConfig } from '../../core/config.js';
import { matchAll } from '../../matching/pipeline.js';

/**
 * Run the 'match' command.
 * Performs matching against the glossary and outputs results.
 *
 * @param args - [message]
 * @returns Formatted match output string
 * @throws Error if arguments are insufficient
 */
export async function runMatch(args: string[]): Promise<string> {
  if (args.length < 1) {
    throw new Error('Usage: tinylingo match <message>');
  }
  const message = args.join(' ');
  const glossary = readGlossary();
  const config = readConfig();
  const results = await matchAll(message, glossary, config);

  if (results.length === 0) {
    return 'No matches found.';
  }

  return results
    .map((r) => {
      const label = r.source === 'exact' ? '精确' : '智能';
      return `[${label}] ${r.term} → ${r.explanation}`;
    })
    .join('\n');
}
