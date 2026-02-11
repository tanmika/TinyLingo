import { parseArgs } from './cli/parser.js';
import { runRecord } from './cli/commands/record.js';
import { runRemove } from './cli/commands/remove.js';
import { runList } from './cli/commands/list.js';
import { runConfig } from './cli/commands/config.js';
import { runMatch } from './cli/commands/match.js';
import { runInstall } from './cli/commands/install.js';
import { runUninstall } from './cli/commands/uninstall.js';

const HELP_TEXT: Record<string, string> = {
  record: 'Usage: tinylingo record <term> <explanation>\n  Add or update a glossary entry.',
  remove: 'Usage: tinylingo remove <term>\n  Remove a glossary entry.',
  list: 'Usage: tinylingo list\n  List all glossary entries.',
  config: 'Usage: tinylingo config [key] [value]\n  Show or set configuration.\n  No args: show all config\n  One arg: show specific value\n  Two args: set value',
  match: 'Usage: tinylingo match <message>\n  Test matching against the glossary.',
  install: 'Usage: tinylingo install [platform]\n  Register hooks and inject instructions.\n  Platforms: claude, cursor, opencode',
  uninstall: 'Usage: tinylingo uninstall [platform]\n  Remove hooks and injected instructions.',
};

const GLOBAL_HELP = `tinylingo - A terminology and behavior memory tool for AI assistants

Commands:
  record <term> <explanation>   Add or update a glossary entry
  remove <term>                 Remove a glossary entry
  list                          List all glossary entries
  config [key] [value]          Show or set configuration
  match <message>               Test matching against the glossary
  install [platform]            Register hooks to AI tools
  uninstall [platform]          Remove hooks from AI tools

Options:
  --help                        Show help for a command

Use "tinylingo <command> --help" for more information about a command.`;

async function main(): Promise<void> {
  try {
    const argv = process.argv.slice(2);

    if (argv.length === 0 || (argv.length === 1 && argv[0] === '--help')) {
      console.log(GLOBAL_HELP);
      return;
    }

    const parsed = parseArgs(argv);

    if (parsed.help) {
      console.log(HELP_TEXT[parsed.command] ?? GLOBAL_HELP);
      return;
    }

    switch (parsed.command) {
      case 'record':
        console.log(runRecord(parsed.args));
        break;
      case 'remove':
        runRemove(parsed.args);
        break;
      case 'list':
        console.log(runList());
        break;
      case 'config':
        console.log(runConfig(parsed.args));
        break;
      case 'match':
        console.log(await runMatch(parsed.args));
        break;
      case 'install':
        runInstall(parsed.args);
        break;
      case 'uninstall':
        runUninstall(parsed.args);
        break;
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
