import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR_NAME = 'tinylingo';

/**
 * Get the TinyLingo config directory path: ~/.config/tinylingo/
 * Creates the directory if it doesn't exist.
 */
export function getConfigDir(): string {
  const dir = join(homedir(), '.config', CONFIG_DIR_NAME);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Get the glossary file path: ~/.config/tinylingo/glossary.json
 */
export function getGlossaryPath(): string {
  return join(getConfigDir(), 'glossary.json');
}

/**
 * Get the config file path: ~/.config/tinylingo/config.json
 */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

/**
 * Get the debug log file path: ~/.config/tinylingo/debug.log
 */
export function getLogPath(): string {
  return join(getConfigDir(), 'debug.log');
}

/**
 * Get the scripts directory path: ~/.config/tinylingo/scripts/
 * Creates the directory if it doesn't exist.
 */
export function getScriptsDir(): string {
  const dir = join(getConfigDir(), 'scripts');
  mkdirSync(dir, { recursive: true });
  return dir;
}
