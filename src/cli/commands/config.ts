import { readConfig, getConfigValue, setConfigValue } from '../../core/config.js';

/**
 * Run the 'config' command.
 * - No args: display all config
 * - One arg (dotPath): display specific value
 * - Two args (dotPath, value): set value
 *
 * @param args - [] or [dotPath] or [dotPath, value]
 * @returns Output string for display (when reading config)
 */
export function runConfig(args: string[]): string {
  if (args.length === 0) {
    return JSON.stringify(readConfig(), null, 2);
  }
  if (args.length === 1) {
    const val = getConfigValue(args[0]);
    return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
  }
  setConfigValue(args[0], args[1]);
  return `Set ${args[0]} = ${args[1]}`;
}
