import { ClaudeAdapter } from '../../adapters/claude.js';
import type { PlatformAdapter } from '../../adapters/types.js';

/**
 * Run the 'uninstall' command.
 * Removes hooks and injected instructions for the platform.
 *
 * @param args - Optional: [platform] to force a specific platform
 */
export function runUninstall(args: string[]): void {
  const adapters: PlatformAdapter[] = [new ClaudeAdapter()];

  const targetPlatform = args[0];

  for (const adapter of adapters) {
    if (targetPlatform && adapter.name !== targetPlatform) continue;
    if (!targetPlatform && !adapter.detect()) continue;
    adapter.uninstall();
  }
}
