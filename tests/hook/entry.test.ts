import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-hook-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

import { processHookEvent } from '../../src/hook/entry.js';
import { addEntry } from '../../src/core/glossary.js';

describe('hook/entry', () => {
  beforeEach(() => {
    mkdirSync(TEST_HOME, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  it('should return system-reminder JSON when there are matches', async () => {
    addEntry('提交', 'git commit only, no push');

    const input = JSON.stringify({
      event: 'UserPromptSubmit',
      data: { prompt: '帮我提交代码' },
    });

    const output = await processHookEvent(input);
    const parsed = JSON.parse(output);

    expect(parsed).toHaveProperty('hookSpecificOutput');
    expect(parsed.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('[TinyLingo]');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('提交');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('git commit only, no push');
  });

  it('should return empty JSON when no matches', async () => {
    const input = JSON.stringify({
      event: 'UserPromptSubmit',
      data: { prompt: '今天天气真好' },
    });

    const output = await processHookEvent(input);
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({});
  });

  it('should merge multiple matches into one system-reminder block', async () => {
    addEntry('提交', 'git commit only');
    addEntry('联调', 'source debugging');

    const input = JSON.stringify({
      event: 'UserPromptSubmit',
      data: { prompt: '提交后联调一下' },
    });

    const output = await processHookEvent(input);
    const parsed = JSON.parse(output);

    expect(parsed.hookSpecificOutput.additionalContext).toContain('提交');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('联调');
    // Should be a single system-reminder block
    const reminderCount = (parsed.hookSpecificOutput.additionalContext.match(/<system-reminder>/g) || []).length;
    expect(reminderCount).toBe(1);
  });

  it('should handle invalid JSON input gracefully', async () => {
    const output = await processHookEvent('not valid json {{{');
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({});
  });

  it('should ignore non-UserPromptSubmit events', async () => {
    addEntry('提交', 'git commit only');

    const input = JSON.stringify({
      event: 'SomeOtherEvent',
      data: { prompt: '帮我提交代码' },
    });

    const output = await processHookEvent(input);
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({});
  });

  it('should handle empty prompt gracefully', async () => {
    const input = JSON.stringify({
      event: 'UserPromptSubmit',
      data: { prompt: '' },
    });

    const output = await processHookEvent(input);
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({});
  });

  it('should handle missing data field gracefully', async () => {
    const input = JSON.stringify({
      event: 'UserPromptSubmit',
    });

    const output = await processHookEvent(input);
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({});
  });

  it('should format output as "- term: explanation" lines', async () => {
    addEntry('提交', 'git commit only');

    const input = JSON.stringify({
      event: 'UserPromptSubmit',
      data: { prompt: '提交代码' },
    });

    const output = await processHookEvent(input);
    const parsed = JSON.parse(output);

    expect(parsed.hookSpecificOutput.additionalContext).toMatch(/- 提交: git commit only/);
  });

  it('should handle Claude Code actual stdin format (hook_event_name + top-level prompt)', async () => {
    addEntry('提交', 'git commit only');

    const input = JSON.stringify({
      session_id: 'abc-123',
      hook_event_name: 'UserPromptSubmit',
      prompt: '帮我提交代码',
      cwd: '/some/path',
    });

    const output = await processHookEvent(input);
    const parsed = JSON.parse(output);

    expect(parsed).toHaveProperty('hookSpecificOutput');
    expect(parsed.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('提交');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('git commit only');
  });

  it('should ignore non-UserPromptSubmit with hook_event_name format', async () => {
    addEntry('提交', 'git commit only');

    const input = JSON.stringify({
      hook_event_name: 'SessionStart',
      prompt: '帮我提交代码',
    });

    const output = await processHookEvent(input);
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({});
  });
});
