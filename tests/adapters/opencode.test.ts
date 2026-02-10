import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-opencode-adapter-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

import { OpenCodeAdapter } from '../../src/adapters/opencode.js';

describe('adapters/opencode', () => {
  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  describe('OpenCodeAdapter', () => {
    let adapter: OpenCodeAdapter;

    beforeEach(() => {
      adapter = new OpenCodeAdapter();
    });

    it('should have name "opencode"', () => {
      expect(adapter.name).toBe('opencode');
    });

    describe('detect', () => {
      it('should return false when OpenCode is not installed', () => {
        expect(adapter.detect()).toBe(false);
      });
    });

    describe('isInstalled', () => {
      it('should return false when nothing is installed', () => {
        expect(adapter.isInstalled()).toBe(false);
      });
    });

    describe('install', () => {
      it('should not throw on install', () => {
        expect(() =>
          adapter.install('/path/to/hook.cjs')
        ).not.toThrow();
      });
    });

    describe('uninstall', () => {
      it('should not throw when nothing is installed', () => {
        expect(() => adapter.uninstall()).not.toThrow();
      });
    });
  });
});
