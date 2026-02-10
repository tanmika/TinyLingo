import { listEntries } from '../../core/glossary.js';

/**
 * Run the 'list' command.
 * Lists all glossary entries formatted to stdout.
 *
 * @returns Output string for display
 */
export function runList(): string {
  const entries = listEntries();
  const keys = Object.keys(entries);
  if (keys.length === 0) {
    return 'No entries recorded.';
  }
  return keys.map((k) => `${k}: ${entries[k]}`).join('\n');
}
