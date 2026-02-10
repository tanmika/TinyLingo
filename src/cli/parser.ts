/**
 * Known command names.
 */
export type CommandName =
  | 'record'
  | 'remove'
  | 'list'
  | 'config'
  | 'match'
  | 'install'
  | 'uninstall';

/**
 * Parsed command result.
 */
export interface ParsedCommand {
  command: CommandName;
  args: string[];
  help: boolean;
}

/**
 * Parse CLI arguments into a structured command.
 *
 * @param argv - Process arguments (typically process.argv.slice(2))
 * @returns Parsed command with name, arguments, and help flag
 * @throws Error if command is unknown or missing
 */
const VALID_COMMANDS: CommandName[] = [
  'record', 'remove', 'list', 'config', 'match', 'install', 'uninstall',
];

export function parseArgs(argv: string[]): ParsedCommand {
  if (argv.length === 0) {
    throw new Error('No command provided. Use --help for usage information.');
  }

  const help = argv.includes('--help');
  const filtered = argv.filter((a) => a !== '--help');

  let commandIndex = -1;
  for (let i = 0; i < filtered.length; i++) {
    if (VALID_COMMANDS.includes(filtered[i] as CommandName)) {
      commandIndex = i;
      break;
    }
  }

  if (commandIndex === -1) {
    if (help && filtered.length === 0) {
      return { command: 'list', args: [], help: true };
    }
    throw new Error(`Unknown command: "${filtered[0]}". Valid commands: ${VALID_COMMANDS.join(', ')}`);
  }

  const command = filtered[commandIndex] as CommandName;
  const args = filtered.slice(commandIndex + 1);

  return { command, args, help };
}
