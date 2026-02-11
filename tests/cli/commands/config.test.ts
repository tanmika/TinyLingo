import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-cmd-config-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

import { runConfig } from '../../../src/cli/commands/config.js';
import { getConfigValue, writeConfig, getDefaultConfig } from '../../../src/core/config.js';

describe('cli/commands/config', () => {
  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it('should display all config when no arguments', () => {
    const output = runConfig([]);
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
    // Should contain config keys
    expect(output).toContain('smart');
  });

  it('should display specific value with one argument', () => {
    writeConfig(getDefaultConfig());

    const output = runConfig(['smart.enabled']);
    expect(output).toContain('false');
  });

  it('should set value with two arguments', () => {
    const output = runConfig(['smart.enabled', 'true']);

    const val = getConfigValue('smart.enabled');
    expect(val).toBe(true);
  });

  it('should set string value', () => {
    runConfig(['smart.model', 'llama-3']);

    const val = getConfigValue('smart.model');
    expect(val).toBe('llama-3');
  });

  it('should set numeric value with auto-conversion', () => {
    runConfig(['smart.fuzzyThreshold', '0.5']);

    const val = getConfigValue('smart.fuzzyThreshold');
    expect(val).toBe(0.5);
  });

  it('should get value with explicit "get" subcommand', () => {
    writeConfig(getDefaultConfig());

    const output = runConfig(['get', 'smart.model']);
    expect(output).toBe('qwen3-0.6b');
  });

  it('should display all config with "get" and no path', () => {
    const output = runConfig(['get']);
    expect(output).toContain('smart');
  });

  it('should set value with explicit "set" subcommand', () => {
    runConfig(['set', 'smart.enabled', 'true']);

    const val = getConfigValue('smart.enabled');
    expect(val).toBe(true);
  });

  it('should return usage when "set" has no value', () => {
    const output = runConfig(['set', 'smart.enabled']);
    expect(output).toContain('Usage');
  });

  it('should not write "get" as a config key', () => {
    writeConfig(getDefaultConfig());

    runConfig(['get', 'smart.prompt']);

    const val = getConfigValue('get');
    expect(val).toBeUndefined();
  });
});
