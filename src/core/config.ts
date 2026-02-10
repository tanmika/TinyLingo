import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { getConfigPath, getConfigDir } from './paths.js';

/**
 * TinyLingo configuration structure.
 */
export interface TinyLingoConfig {
  smart: {
    enabled: boolean;
    endpoint: string;
    model: string;
    fuzzyThreshold: number;
  };
}

/**
 * Get the default configuration.
 */
export function getDefaultConfig(): TinyLingoConfig {
  return {
    smart: {
      enabled: false,
      endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
      model: 'qwen3-0.6b',
      fuzzyThreshold: 0.2,
    },
  };
}

/**
 * Read configuration from disk.
 * Returns default config if file doesn't exist.
 * Merges with defaults for partial config files.
 */
export function readConfig(): TinyLingoConfig {
  const defaults = getDefaultConfig();
  const p = getConfigPath();
  if (!existsSync(p)) return defaults;
  const stored = JSON.parse(readFileSync(p, 'utf-8'));
  return {
    smart: { ...defaults.smart, ...stored.smart },
  };
}

/**
 * Write configuration to disk.
 * Creates the directory if it doesn't exist.
 */
export function writeConfig(config: TinyLingoConfig): void {
  getConfigDir(); // ensure directory exists
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Get a config value by dot-separated path (e.g., "smart.enabled").
 * Returns undefined if the path doesn't exist.
 */
export function getConfigValue(dotPath: string): unknown {
  if (!dotPath) return undefined;
  const config = readConfig();
  const keys = dotPath.split('.');
  let current: unknown = config;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Infer the type of a string value:
 * - "true" / "false" → boolean
 * - Numeric strings → number
 * - Otherwise → string
 */
function inferType(value: string): string | boolean | number {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && !isNaN(Number(value))) return Number(value);
  return value;
}

/**
 * Set a config value by dot-separated path (e.g., "smart.endpoint", "http://...").
 * Performs automatic type inference:
 * - "true" / "false" → boolean
 * - Numeric strings (e.g., "0.2") → number
 * - Otherwise → string
 */
export function setConfigValue(dotPath: string, value: string): void {
  const config = readConfig();
  const keys = dotPath.split('.');
  let current: Record<string, unknown> = config as unknown as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current) || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = inferType(value);
  writeConfig(config);
}
