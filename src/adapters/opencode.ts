import type { PlatformAdapter } from './types.js';

/**
 * OpenCode platform adapter.
 *
 * Hook registration: OpenCode plugin configuration.
 */
export class OpenCodeAdapter implements PlatformAdapter {
  name = 'opencode';

  detect(): boolean {
    return false;
  }

  isInstalled(): boolean {
    return false;
  }

  install(_scriptPath: string): void {
    // TODO: implement OpenCode hook registration
  }

  uninstall(): void {
    // TODO: implement OpenCode hook removal
  }
}
