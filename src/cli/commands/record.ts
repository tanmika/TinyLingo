import { addEntry } from '../../core/glossary.js';

/**
 * Run the 'record' command.
 * Adds or updates a glossary entry.
 *
 * @param args - [term, explanation]
 * @throws Error if arguments are insufficient
 */
export function runRecord(args: string[]): void {
  if (args.length < 2) {
    throw new Error('Usage: tinylingo record <term> <explanation>');
  }
  const [term, ...rest] = args;
  addEntry(term, rest.join(' '));
}
