import { readGlossary } from '../core/glossary.js';
import { readConfig } from '../core/config.js';
import { matchAll } from '../matching/pipeline.js';
import { setDebug } from '../core/logger.js';

/**
 * Process a hook event from stdin.
 *
 * Reads JSON from stdin, extracts the user message from
 * UserPromptSubmit events, runs matching pipeline, and
 * returns formatted JSON for stdout.
 *
 * @param stdinData - Raw JSON string from stdin
 * @returns JSON string for stdout:
 *   - Match found: {"hookSpecificOutput":"<system-reminder>\n[TinyLingo]\n- term: explanation\n</system-reminder>"}
 *   - No match: "{}"
 */
/**
 * Main entry: read stdin, process, write stdout.
 * Only runs when executed directly (not imported for testing).
 */
async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const stdinData = Buffer.concat(chunks).toString('utf-8');
  const result = await processHookEvent(stdinData);
  process.stdout.write(result);
}

// Auto-run when executed as a script (CJS: require.main === module)
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(() => {
    process.stdout.write('{}');
  });
}

export async function processHookEvent(stdinData: string): Promise<string> {
  try {
    const event = JSON.parse(stdinData);

    const eventName = event.hook_event_name ?? event.event;
    if (eventName !== 'UserPromptSubmit') return '{}';

    const prompt = event.prompt ?? event.data?.prompt;
    if (!prompt) return '{}';

    const glossary = readGlossary();
    const config = readConfig();
    setDebug(config.debug);
    const results = await matchAll(prompt, glossary, config);

    if (results.length === 0) return '{}';

    const lines = results.map((r) => `- ${r.term}: ${r.explanation}`).join('\n');
    const context = `<system-reminder>\n[TinyLingo]\n${lines}\n</system-reminder>`;

    return JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: context,
      },
    });
  } catch {
    return '{}';
  }
}
