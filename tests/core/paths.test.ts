import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

// We mock os.homedir() to use a temp directory for testing
const TEST_HOME = join(tmpdir(), `tinylingo-test-paths-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

// Import after mocking
import { getConfigDir, getGlossaryPath, getConfigPath, getScriptsDir } from '../../src/core/paths.js';

describe('core/paths', () => {
  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  describe('getConfigDir', () => {
    it('should return ~/.config/tinylingo/', () => {
      const dir = getConfigDir();
      expect(dir).toBe(join(TEST_HOME, '.config', 'tinylingo'));
    });

    it('should create the directory if it does not exist', () => {
      const dir = getConfigDir();
      expect(existsSync(dir)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      getConfigDir();
      expect(() => getConfigDir()).not.toThrow();
    });
  });

  describe('getGlossaryPath', () => {
    it('should return ~/.config/tinylingo/glossary.json', () => {
      const p = getGlossaryPath();
      expect(p).toBe(join(TEST_HOME, '.config', 'tinylingo', 'glossary.json'));
    });
  });

  describe('getConfigPath', () => {
    it('should return ~/.config/tinylingo/config.json', () => {
      const p = getConfigPath();
      expect(p).toBe(join(TEST_HOME, '.config', 'tinylingo', 'config.json'));
    });
  });

  describe('getScriptsDir', () => {
    it('should return ~/.config/tinylingo/scripts/', () => {
      const dir = getScriptsDir();
      expect(dir).toBe(join(TEST_HOME, '.config', 'tinylingo', 'scripts'));
    });

    it('should create the scripts directory if it does not exist', () => {
      const dir = getScriptsDir();
      expect(existsSync(dir)).toBe(true);
    });

    it('should also create the parent config directory', () => {
      const dir = getScriptsDir();
      expect(existsSync(join(TEST_HOME, '.config', 'tinylingo'))).toBe(true);
    });
  });
});
