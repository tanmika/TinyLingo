import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-cmd-install-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

// Mock all adapters
vi.mock('../../../src/adapters/claude.js', () => ({
  ClaudeAdapter: vi.fn().mockImplementation(() => ({
    name: 'claude',
    detect: vi.fn().mockReturnValue(true),
    isInstalled: vi.fn().mockReturnValue(false),
    install: vi.fn(),
    uninstall: vi.fn(),
  })),
}));

import { runInstall } from '../../../src/cli/commands/install.js';

describe('cli/commands/install', () => {
  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it('should not throw on install', () => {
    expect(() => runInstall([])).not.toThrow();
  });

  it('should accept platform argument', () => {
    expect(() => runInstall(['claude'])).not.toThrow();
  });
});
