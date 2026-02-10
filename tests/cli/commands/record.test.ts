import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-cmd-record-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

import { runRecord } from '../../../src/cli/commands/record.js';
import { readGlossary } from '../../../src/core/glossary.js';

describe('cli/commands/record', () => {
  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it('should add a new glossary entry', () => {
    runRecord(['提交', 'git commit only']);

    const glossary = readGlossary();
    expect(glossary['提交']).toBe('git commit only');
  });

  it('should update an existing glossary entry', () => {
    runRecord(['提交', 'old']);
    runRecord(['提交', 'new']);

    const glossary = readGlossary();
    expect(glossary['提交']).toBe('new');
  });

  it('should throw when no arguments provided', () => {
    expect(() => runRecord([])).toThrow();
  });

  it('should throw when only term provided without explanation', () => {
    expect(() => runRecord(['提交'])).toThrow();
  });
});
