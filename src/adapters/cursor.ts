import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { PlatformAdapter } from './types.js';

/**
 * Cursor platform adapter.
 *
 * Hook registration: ~/.cursor/hooks.json
 * Uses camelCase event names.
 */
export class CursorAdapter implements PlatformAdapter {
  name = 'cursor';

  private get cursorDir(): string {
    return join(homedir(), '.cursor');
  }

  private get hooksPath(): string {
    return join(this.cursorDir, 'hooks.json');
  }

  detect(): boolean {
    return existsSync(this.cursorDir);
  }

  isInstalled(): boolean {
    if (!existsSync(this.hooksPath)) return false;
    return false;
  }

  install(_scriptPath: string): void {
    // TODO: implement Cursor hook registration
  }

  uninstall(): void {
    // TODO: implement Cursor hook removal
  }
}
