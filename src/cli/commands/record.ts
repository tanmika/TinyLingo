import { addEntry, updateEntry } from '../../core/glossary.js';

/**
 * Run the 'record' command.
 * Adds a glossary entry. Refuses if already exists unless --force is used.
 *
 * @param args - [--force] <term> <explanation>
 * @returns Output message describing what happened
 * @throws Error if arguments are insufficient
 */
export function runRecord(args: string[]): string {
  const force = args.includes('--force');
  const filtered = args.filter((a) => a !== '--force');

  if (filtered.length < 2) {
    throw new Error('Usage: tinylingo record [--force] <term> <explanation>');
  }
  const [term, ...rest] = filtered;
  const explanation = rest.join(' ');

  if (force) {
    const old = updateEntry(term, explanation);
    if (old !== undefined) {
      return `Updated: ${term}\n  was: ${old}\n  now: ${explanation}`;
    }
    return `Added: ${term}`;
  }

  const result = addEntry(term, explanation);
  if (result.status === 'exists') {
    return `Already exists: ${term} = ${result.oldValue}\nUse --force to overwrite.`;
  }
  return `Added: ${term}`;
}
