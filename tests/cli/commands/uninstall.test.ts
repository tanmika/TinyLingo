import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-cmd-uninstall-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

// Mock all adapters
vi.mock('../../../src/adapters/claude.js', () => ({
  ClaudeAdapter: vi.fn().mockImplementation(() => ({
    name: 'claude',
    detect: vi.fn().mockReturnValue(true),
    isInstalled: vi.fn().mockReturnValue(true),
    install: vi.fn(),
    uninstall: vi.fn(),
  })),
}));

import { runUninstall } from '../../../src/cli/commands/uninstall.js';

describe('cli/commands/uninstall', () => {
  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it('should not throw on uninstall', () => {
    expect(() => runUninstall([])).not.toThrow();
  });

  it('should accept platform argument', () => {
    expect(() => runUninstall(['claude'])).not.toThrow();
  });
});
