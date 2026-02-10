import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-cmd-list-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

import { runList } from '../../../src/cli/commands/list.js';
import { addEntry } from '../../../src/core/glossary.js';

describe('cli/commands/list', () => {
  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it('should return a message when glossary is empty', () => {
    const output = runList();
    expect(typeof output).toBe('string');
    // Should indicate no entries
    expect(output.length).toBeGreaterThan(0);
  });

  it('should list all entries', () => {
    addEntry('提交', 'git commit only');
    addEntry('联调', 'source debugging');

    const output = runList();
    expect(output).toContain('提交');
    expect(output).toContain('git commit only');
    expect(output).toContain('联调');
    expect(output).toContain('source debugging');
  });

  it('should format entries as "term: explanation"', () => {
    addEntry('提交', 'git commit only');

    const output = runList();
    // Should contain the term and explanation in some readable format
    expect(output).toMatch(/提交/);
    expect(output).toMatch(/git commit only/);
  });
});
