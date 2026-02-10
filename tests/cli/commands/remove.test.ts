import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-cmd-remove-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

import { runRemove } from '../../../src/cli/commands/remove.js';
import { addEntry, readGlossary } from '../../../src/core/glossary.js';

describe('cli/commands/remove', () => {
  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it('should remove an existing entry', () => {
    addEntry('提交', 'git commit only');

    runRemove(['提交']);

    const glossary = readGlossary();
    expect(glossary).not.toHaveProperty('提交');
  });

  it('should not throw when removing non-existent entry', () => {
    expect(() => runRemove(['nonexistent'])).not.toThrow();
  });

  it('should throw when no arguments provided', () => {
    expect(() => runRemove([])).toThrow();
  });
});
