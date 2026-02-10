import { removeEntry } from '../../core/glossary.js';

/**
 * Run the 'remove' command.
 * Removes a glossary entry by term.
 *
 * @param args - [term]
 * @throws Error if arguments are insufficient
 */
export function runRemove(args: string[]): void {
  if (args.length < 1) {
    throw new Error('Usage: tinylingo remove <term>');
  }
  removeEntry(args[0]);
}
