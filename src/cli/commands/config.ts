import { readConfig, getConfigValue, setConfigValue } from '../../core/config.js';

/**
 * Run the 'config' command.
 * Supports explicit subcommands and implicit positional mode:
 * - No args: display all config
 * - config get <dotPath>: display specific value
 * - config set <dotPath> <value>: set value
 * - config <dotPath>: display specific value (implicit get)
 * - config <dotPath> <value>: set value (implicit set)
 *
 * @param args - command arguments
 * @returns Output string for display (when reading config)
 */
export function runConfig(args: string[]): string {
  if (args.length === 0) {
    return JSON.stringify(readConfig(), null, 2);
  }

  const sub = args[0];

  if (sub === 'get') {
    if (args.length < 2) return JSON.stringify(readConfig(), null, 2);
    const val = getConfigValue(args[1]);
    return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
  }

  if (sub === 'set') {
    if (args.length < 3) return 'Usage: tinylingo config set <key> <value>';
    setConfigValue(args[1], args[2]);
    return `Set ${args[1]} = ${args[2]}`;
  }

  // Implicit mode: 1 arg = get, 2 args = set
  if (args.length === 1) {
    const val = getConfigValue(args[0]);
    return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
  }
  setConfigValue(args[0], args[1]);
  return `Set ${args[0]} = ${args[1]}`;
}
