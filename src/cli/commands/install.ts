import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getScriptsDir } from '../../core/paths.js';
import { ClaudeAdapter } from '../../adapters/claude.js';
import type { PlatformAdapter } from '../../adapters/types.js';

const HOOK_FILENAME = 'hook-entry.cjs';

/**
 * Get the path to the bundled hook entry script.
 * Looks relative to the install command's location in dist/.
 */
function getBundledHookPath(): string {
  // When running from dist/bin.js, hook is at dist/hook/entry.cjs
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return join(currentDir, 'hook', 'entry.cjs');
}

/**
 * Run the 'install' command.
 * Copies hook script to ~/.config/tinylingo/scripts/,
 * then registers hooks and injects instructions per platform.
 *
 * @param args - Optional: [platform] to force a specific platform
 */
export function runInstall(args: string[]): void {
  const scriptsDir = getScriptsDir();
  const targetScriptPath = join(scriptsDir, HOOK_FILENAME);

  // Copy bundled hook script to scripts directory
  const bundledPath = getBundledHookPath();
  if (existsSync(bundledPath)) {
    mkdirSync(scriptsDir, { recursive: true });
    copyFileSync(bundledPath, targetScriptPath);
  }

  const adapters: PlatformAdapter[] = [new ClaudeAdapter()];
  const targetPlatform = args[0];

  for (const adapter of adapters) {
    if (targetPlatform && adapter.name !== targetPlatform) continue;
    if (!targetPlatform && !adapter.detect()) continue;
    adapter.install(targetScriptPath);
  }
}
