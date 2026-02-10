import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-config-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

import {
  readConfig,
  writeConfig,
  getConfigValue,
  setConfigValue,
  getDefaultConfig,
  type TinyLingoConfig,
} from '../../src/core/config.js';

describe('core/config', () => {
  const configDir = join(TEST_HOME, '.config', 'tinylingo');
  const configPath = join(configDir, 'config.json');

  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  describe('getDefaultConfig', () => {
    it('should return the default configuration', () => {
      const config = getDefaultConfig();
      expect(config).toEqual({
        smart: {
          enabled: false,
          endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
          model: 'qwen3-0.6b',
          fuzzyThreshold: 0.2,
        },
      });
    });

    it('should return a new object each time', () => {
      const a = getDefaultConfig();
      const b = getDefaultConfig();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('readConfig', () => {
    it('should return default config when file does not exist', () => {
      const config = readConfig();
      expect(config).toEqual(getDefaultConfig());
    });

    it('should read existing config file', () => {
      mkdirSync(configDir, { recursive: true });
      const customConfig: TinyLingoConfig = {
        smart: {
          enabled: true,
          endpoint: 'http://custom:8080/v1/chat/completions',
          model: 'custom-model',
          fuzzyThreshold: 0.5,
        },
      };
      writeFileSync(configPath, JSON.stringify(customConfig), 'utf-8');

      const config = readConfig();
      expect(config).toEqual(customConfig);
    });

    it('should merge with defaults for partial config files', () => {
      mkdirSync(configDir, { recursive: true });
      // Only partial config - missing some fields
      writeFileSync(configPath, JSON.stringify({ smart: { enabled: true } }), 'utf-8');

      const config = readConfig();
      expect(config.smart.enabled).toBe(true);
      // Other fields should have default values
      expect(config.smart.endpoint).toBe('http://127.0.0.1:1234/v1/chat/completions');
      expect(config.smart.model).toBe('qwen3-0.6b');
      expect(config.smart.fuzzyThreshold).toBe(0.2);
    });
  });

  describe('writeConfig', () => {
    it('should write config to file', () => {
      const config = getDefaultConfig();
      config.smart.enabled = true;

      writeConfig(config);

      const content = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(content.smart.enabled).toBe(true);
    });

    it('should create directory if it does not exist', () => {
      expect(existsSync(configDir)).toBe(false);
      writeConfig(getDefaultConfig());
      expect(existsSync(configDir)).toBe(true);
    });
  });

  describe('getConfigValue', () => {
    it('should get top-level key', () => {
      writeConfig(getDefaultConfig());

      const smart = getConfigValue('smart');
      expect(smart).toEqual(getDefaultConfig().smart);
    });

    it('should get nested value with dot path', () => {
      writeConfig(getDefaultConfig());

      expect(getConfigValue('smart.enabled')).toBe(false);
      expect(getConfigValue('smart.endpoint')).toBe('http://127.0.0.1:1234/v1/chat/completions');
      expect(getConfigValue('smart.model')).toBe('qwen3-0.6b');
      expect(getConfigValue('smart.fuzzyThreshold')).toBe(0.2);
    });

    it('should return undefined for non-existent path', () => {
      writeConfig(getDefaultConfig());

      expect(getConfigValue('nonexistent')).toBeUndefined();
      expect(getConfigValue('smart.nonexistent')).toBeUndefined();
      expect(getConfigValue('a.b.c.d')).toBeUndefined();
    });

    it('should return undefined for empty path', () => {
      writeConfig(getDefaultConfig());

      expect(getConfigValue('')).toBeUndefined();
    });
  });

  describe('setConfigValue', () => {
    it('should set a nested string value', () => {
      setConfigValue('smart.endpoint', 'http://new:9090/v1/chat/completions');

      expect(getConfigValue('smart.endpoint')).toBe('http://new:9090/v1/chat/completions');
    });

    it('should auto-convert "true" to boolean true', () => {
      setConfigValue('smart.enabled', 'true');

      const val = getConfigValue('smart.enabled');
      expect(val).toBe(true);
      expect(typeof val).toBe('boolean');
    });

    it('should auto-convert "false" to boolean false', () => {
      setConfigValue('smart.enabled', 'false');

      const val = getConfigValue('smart.enabled');
      expect(val).toBe(false);
      expect(typeof val).toBe('boolean');
    });

    it('should auto-convert numeric string "0.2" to number', () => {
      setConfigValue('smart.fuzzyThreshold', '0.5');

      const val = getConfigValue('smart.fuzzyThreshold');
      expect(val).toBe(0.5);
      expect(typeof val).toBe('number');
    });

    it('should auto-convert integer string "42" to number', () => {
      setConfigValue('smart.fuzzyThreshold', '42');

      const val = getConfigValue('smart.fuzzyThreshold');
      expect(val).toBe(42);
      expect(typeof val).toBe('number');
    });

    it('should keep regular strings as strings', () => {
      setConfigValue('smart.model', 'llama-3');

      const val = getConfigValue('smart.model');
      expect(val).toBe('llama-3');
      expect(typeof val).toBe('string');
    });

    it('should not convert strings that look numeric but are not pure numbers', () => {
      setConfigValue('smart.model', '123abc');

      const val = getConfigValue('smart.model');
      expect(val).toBe('123abc');
      expect(typeof val).toBe('string');
    });

    it('should preserve existing config values when setting new one', () => {
      // Start with defaults
      writeConfig(getDefaultConfig());

      setConfigValue('smart.enabled', 'true');

      // Other values should remain unchanged
      expect(getConfigValue('smart.endpoint')).toBe('http://127.0.0.1:1234/v1/chat/completions');
      expect(getConfigValue('smart.model')).toBe('qwen3-0.6b');
      expect(getConfigValue('smart.fuzzyThreshold')).toBe(0.2);
    });

    it('should create config file if it does not exist', () => {
      expect(existsSync(configPath)).toBe(false);

      setConfigValue('smart.enabled', 'true');

      expect(existsSync(configPath)).toBe(true);
    });

    it('should not convert empty string to number', () => {
      setConfigValue('smart.model', '');

      const val = getConfigValue('smart.model');
      expect(val).toBe('');
      expect(typeof val).toBe('string');
    });
  });
});
