import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-cursor-adapter-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

import { CursorAdapter } from '../../src/adapters/cursor.js';

describe('adapters/cursor', () => {
  const cursorDir = join(TEST_HOME, '.cursor');

  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  describe('CursorAdapter', () => {
    let adapter: CursorAdapter;

    beforeEach(() => {
      adapter = new CursorAdapter();
    });

    it('should have name "cursor"', () => {
      expect(adapter.name).toBe('cursor');
    });

    describe('detect', () => {
      it('should return true when .cursor directory exists', () => {
        mkdirSync(cursorDir, { recursive: true });
        expect(adapter.detect()).toBe(true);
      });

      it('should return false when .cursor directory does not exist', () => {
        expect(adapter.detect()).toBe(false);
      });
    });

    describe('isInstalled', () => {
      it('should return false when hooks.json does not exist', () => {
        mkdirSync(cursorDir, { recursive: true });
        expect(adapter.isInstalled()).toBe(false);
      });
    });

    describe('install', () => {
      it('should not throw on install', () => {
        mkdirSync(cursorDir, { recursive: true });
        expect(() =>
          adapter.install('/path/to/hook.cjs')
        ).not.toThrow();
      });
    });

    describe('uninstall', () => {
      it('should not throw when nothing is installed', () => {
        mkdirSync(cursorDir, { recursive: true });
        expect(() => adapter.uninstall()).not.toThrow();
      });
    });
  });
});
