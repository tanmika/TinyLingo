import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-glossary-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    homedir: () => TEST_HOME,
  };
});

import {
  readGlossary,
  writeGlossary,
  addEntry,
  updateEntry,
  removeEntry,
  listEntries,
  type Glossary,
} from '../../src/core/glossary.js';

describe('core/glossary', () => {
  const configDir = join(TEST_HOME, '.config', 'tinylingo');
  const glossaryPath = join(configDir, 'glossary.json');

  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  describe('readGlossary', () => {
    it('should return empty object when glossary file does not exist', () => {
      const glossary = readGlossary();
      expect(glossary).toEqual({});
    });

    it('should read existing glossary file', () => {
      mkdirSync(configDir, { recursive: true });
      const data: Glossary = { '智能抠图': 'BGRemover module' };
      writeFileSync(glossaryPath, JSON.stringify(data), 'utf-8');

      const glossary = readGlossary();
      expect(glossary).toEqual(data);
    });

    it('should return empty object for empty JSON file', () => {
      mkdirSync(configDir, { recursive: true });
      writeFileSync(glossaryPath, '{}', 'utf-8');

      const glossary = readGlossary();
      expect(glossary).toEqual({});
    });
  });

  describe('writeGlossary', () => {
    it('should write glossary to file', () => {
      const data: Glossary = { '联调': 'source debugging' };
      writeGlossary(data);

      const content = JSON.parse(readFileSync(glossaryPath, 'utf-8'));
      expect(content).toEqual(data);
    });

    it('should create directory if it does not exist', () => {
      expect(existsSync(configDir)).toBe(false);

      writeGlossary({ test: 'value' });
      expect(existsSync(configDir)).toBe(true);
    });

    it('should overwrite existing file', () => {
      writeGlossary({ old: 'value' });
      writeGlossary({ new: 'value' });

      const content = JSON.parse(readFileSync(glossaryPath, 'utf-8'));
      expect(content).toEqual({ new: 'value' });
      expect(content).not.toHaveProperty('old');
    });
  });

  describe('addEntry', () => {
    it('should add a new entry and return added status', () => {
      const result = addEntry('提交', 'git commit only');

      expect(result.status).toBe('added');
      const glossary = readGlossary();
      expect(glossary['提交']).toBe('git commit only');
    });

    it('should refuse to overwrite existing entry', () => {
      addEntry('提交', 'old explanation');
      const result = addEntry('提交', 'new explanation');

      expect(result.status).toBe('exists');
      expect(result.oldValue).toBe('old explanation');
      const glossary = readGlossary();
      expect(glossary['提交']).toBe('old explanation');
    });

    it('should preserve existing entries when adding new one', () => {
      addEntry('A', 'value A');
      addEntry('B', 'value B');

      const glossary = readGlossary();
      expect(glossary['A']).toBe('value A');
      expect(glossary['B']).toBe('value B');
    });

    it('should handle empty string key', () => {
      addEntry('', 'empty key');
      const glossary = readGlossary();
      expect(glossary['']).toBe('empty key');
    });

    it('should handle empty string value', () => {
      addEntry('term', '');
      const glossary = readGlossary();
      expect(glossary['term']).toBe('');
    });
  });

  describe('updateEntry', () => {
    it('should add new entry and return undefined', () => {
      const old = updateEntry('提交', 'value');
      expect(old).toBeUndefined();
      expect(readGlossary()['提交']).toBe('value');
    });

    it('should overwrite existing entry and return old value', () => {
      addEntry('提交', 'old');
      const old = updateEntry('提交', 'new');
      expect(old).toBe('old');
      expect(readGlossary()['提交']).toBe('new');
    });
  });

  describe('removeEntry', () => {
    it('should remove an existing entry and return true', () => {
      addEntry('提交', 'value');

      const result = removeEntry('提交');
      expect(result).toBe(true);
      expect(readGlossary()).not.toHaveProperty('提交');
    });

    it('should return false when entry does not exist', () => {
      const result = removeEntry('nonexistent');
      expect(result).toBe(false);
    });

    it('should not affect other entries when removing one', () => {
      addEntry('A', 'value A');
      addEntry('B', 'value B');

      removeEntry('A');
      const glossary = readGlossary();
      expect(glossary).not.toHaveProperty('A');
      expect(glossary['B']).toBe('value B');
    });
  });

  describe('listEntries', () => {
    it('should return empty object when no entries exist', () => {
      const entries = listEntries();
      expect(entries).toEqual({});
    });

    it('should return all entries', () => {
      addEntry('A', 'value A');
      addEntry('B', 'value B');
      addEntry('C', 'value C');

      const entries = listEntries();
      expect(entries).toEqual({
        A: 'value A',
        B: 'value B',
        C: 'value C',
      });
    });
  });
});
