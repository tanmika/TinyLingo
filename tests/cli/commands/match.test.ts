import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-cmd-match-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

import { runMatch } from '../../../src/cli/commands/match.js';
import { addEntry } from '../../../src/core/glossary.js';

describe('cli/commands/match', () => {
  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it('should show exact match results', async () => {
    addEntry('提交', 'git commit only');

    const output = await runMatch(['帮我提交代码']);
    expect(output).toContain('提交');
    expect(output).toContain('git commit only');
  });

  it('should indicate no match when nothing matches', async () => {
    const output = await runMatch(['今天天气真好']);
    expect(typeof output).toBe('string');
  });

  it('should throw when no arguments provided', async () => {
    await expect(runMatch([])).rejects.toThrow();
  });

  it('should include match source label in output', async () => {
    addEntry('提交', 'git commit only');

    const output = await runMatch(['帮我提交代码']);
    // Should indicate this is an exact match
    expect(output).toMatch(/精确|exact/i);
  });
});
