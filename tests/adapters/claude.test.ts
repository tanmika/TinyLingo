import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TEST_HOME = join(tmpdir(), `tinylingo-test-claude-adapter-${process.pid}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => TEST_HOME };
});

import {
  ClaudeAdapter,
  isTinyLingoHook,
  mergeHooks,
  filterOutHooks,
  type HookEntry,
  type ClaudeSettings,
} from '../../src/adapters/claude.js';

describe('adapters/claude', () => {
  const claudeDir = join(TEST_HOME, '.claude');
  const settingsPath = join(claudeDir, 'settings.json');
  const claudeMdPath = join(claudeDir, 'CLAUDE.md');

  beforeEach(() => {
    mkdirSync(claudeDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_HOME, { recursive: true, force: true });
  });

  describe('isTinyLingoHook', () => {
    it('should return true for TinyLingo hook command', () => {
      expect(
        isTinyLingoHook('node /home/user/.config/tinylingo/scripts/hook.cjs')
      ).toBe(true);
    });

    it('should return false for user hook command', () => {
      expect(isTinyLingoHook('node /home/user/my-custom-hook.js')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isTinyLingoHook('')).toBe(false);
    });

    it('should detect marker in various path formats', () => {
      expect(
        isTinyLingoHook('/Users/me/.config/tinylingo/scripts/entry.cjs')
      ).toBe(true);
      expect(
        isTinyLingoHook('C:\\Users\\me\\.config\\tinylingo\\scripts\\entry.cjs')
      ).toBe(false); // Only forward slash paths
    });
  });

  describe('mergeHooks', () => {
    const userHook: HookEntry = {
      type: 'command',
      command: 'node /home/user/custom-hook.js',
    };
    const oldTinyLingoHook: HookEntry = {
      type: 'command',
      command: 'node /home/user/.config/tinylingo/scripts/old-hook.cjs',
    };
    const newTinyLingoHook: HookEntry = {
      type: 'command',
      command: 'node /home/user/.config/tinylingo/scripts/hook.cjs',
    };

    it('should preserve user hooks and add new TinyLingo hook', () => {
      const result = mergeHooks([userHook], newTinyLingoHook);
      expect(result).toContainEqual(userHook);
      expect(result).toContainEqual(newTinyLingoHook);
    });

    it('should replace existing TinyLingo hook with new one', () => {
      const result = mergeHooks([userHook, oldTinyLingoHook], newTinyLingoHook);
      expect(result).toContainEqual(userHook);
      expect(result).toContainEqual(newTinyLingoHook);
      expect(result).not.toContainEqual(oldTinyLingoHook);
    });

    it('should handle empty existing hooks', () => {
      const result = mergeHooks([], newTinyLingoHook);
      expect(result).toEqual([newTinyLingoHook]);
    });
  });

  describe('filterOutHooks', () => {
    const userHook: HookEntry = {
      type: 'command',
      command: 'node /home/user/custom-hook.js',
    };
    const tinyLingoHook: HookEntry = {
      type: 'command',
      command: 'node /home/user/.config/tinylingo/scripts/hook.cjs',
    };

    it('should remove TinyLingo hooks', () => {
      const result = filterOutHooks([userHook, tinyLingoHook]);
      expect(result).toEqual([userHook]);
    });

    it('should preserve all user hooks', () => {
      const result = filterOutHooks([userHook]);
      expect(result).toEqual([userHook]);
    });

    it('should return empty array when all hooks are TinyLingo', () => {
      const result = filterOutHooks([tinyLingoHook]);
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = filterOutHooks([]);
      expect(result).toEqual([]);
    });
  });

  describe('ClaudeAdapter', () => {
    let adapter: ClaudeAdapter;

    beforeEach(() => {
      adapter = new ClaudeAdapter();
    });

    it('should have name "claude"', () => {
      expect(adapter.name).toBe('claude');
    });

    describe('detect', () => {
      it('should return true when .claude directory exists', () => {
        // .claude dir already created in beforeEach
        expect(adapter.detect()).toBe(true);
      });

      it('should return false when .claude directory does not exist', () => {
        rmSync(claudeDir, { recursive: true, force: true });
        expect(adapter.detect()).toBe(false);
      });
    });

    describe('isInstalled', () => {
      it('should return false when settings.json does not exist', () => {
        expect(adapter.isInstalled()).toBe(false);
      });

      it('should return false when no TinyLingo hooks in settings', () => {
        const settings: ClaudeSettings = {
          hooks: {
            UserPromptSubmit: [
              { type: 'command', command: 'node /some/other/hook.js' },
            ],
          },
        };
        writeFileSync(settingsPath, JSON.stringify(settings));
        expect(adapter.isInstalled()).toBe(false);
      });

      it('should return true when TinyLingo hook exists', () => {
        const settings: ClaudeSettings = {
          hooks: {
            UserPromptSubmit: [
              {
                type: 'command',
                command: 'node /home/user/.config/tinylingo/scripts/hook.cjs',
              },
            ],
          },
        };
        writeFileSync(settingsPath, JSON.stringify(settings));
        expect(adapter.isInstalled()).toBe(true);
      });
    });

    describe('install', () => {
      it('should add hook to settings.json', () => {
        const scriptPath = '/home/user/.config/tinylingo/scripts/hook.cjs';
        adapter.install(scriptPath);

        const settings: ClaudeSettings = JSON.parse(
          readFileSync(settingsPath, 'utf-8')
        );
        expect(settings.hooks).toBeDefined();
        const hooks = settings.hooks!['UserPromptSubmit'] ?? [];
        expect(hooks.some((h) => h.command.includes(scriptPath))).toBe(true);
      });

      it('should inject TINYLINGO block into CLAUDE.md', () => {
        adapter.install('/path/to/hook.cjs');

        expect(existsSync(claudeMdPath)).toBe(true);
        const content = readFileSync(claudeMdPath, 'utf-8');
        expect(content).toContain('<!-- TINYLINGO-START -->');
        expect(content).toContain('<!-- TINYLINGO-END -->');
        expect(content).toContain('TinyLingo');
      });

      it('should not duplicate TINYLINGO block if already exists', () => {
        adapter.install('/path/to/hook.cjs');
        adapter.install('/path/to/hook.cjs');

        const content = readFileSync(claudeMdPath, 'utf-8');
        const startCount = (content.match(/<!-- TINYLINGO-START -->/g) || [])
          .length;
        expect(startCount).toBe(1);
      });

      it('should preserve existing CLAUDE.md content', () => {
        writeFileSync(claudeMdPath, '# My existing config\n\nSome rules here.\n');

        adapter.install('/path/to/hook.cjs');

        const content = readFileSync(claudeMdPath, 'utf-8');
        expect(content).toContain('# My existing config');
        expect(content).toContain('Some rules here.');
        expect(content).toContain('<!-- TINYLINGO-START -->');
      });

      it('should preserve existing settings.json non-hook fields', () => {
        writeFileSync(
          settingsPath,
          JSON.stringify({ someOtherSetting: true })
        );

        adapter.install('/path/to/hook.cjs');

        const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
        expect(settings.someOtherSetting).toBe(true);
        expect(settings.hooks).toBeDefined();
      });

      it('should create settings.json if it does not exist', () => {
        expect(existsSync(settingsPath)).toBe(false);

        adapter.install('/path/to/hook.cjs');

        expect(existsSync(settingsPath)).toBe(true);
      });
    });

    describe('uninstall', () => {
      it('should remove TinyLingo hook from settings.json', () => {
        const settings: ClaudeSettings = {
          hooks: {
            UserPromptSubmit: [
              {
                type: 'command',
                command: 'node /home/user/.config/tinylingo/scripts/hook.cjs',
              },
              { type: 'command', command: 'node /other/hook.js' },
            ],
          },
        };
        writeFileSync(settingsPath, JSON.stringify(settings));

        adapter.uninstall();

        const updated: ClaudeSettings = JSON.parse(
          readFileSync(settingsPath, 'utf-8')
        );
        const hooks = updated.hooks?.['UserPromptSubmit'] ?? [];
        expect(hooks.some((h) => h.command.includes('tinylingo'))).toBe(false);
        expect(hooks.some((h) => h.command.includes('/other/hook.js'))).toBe(
          true
        );
      });

      it('should remove TINYLINGO block from CLAUDE.md', () => {
        writeFileSync(
          claudeMdPath,
          '# Config\n\n<!-- TINYLINGO-START -->\nTinyLingo content\n<!-- TINYLINGO-END -->\n\n# Other stuff\n'
        );

        adapter.uninstall();

        const content = readFileSync(claudeMdPath, 'utf-8');
        expect(content).not.toContain('<!-- TINYLINGO-START -->');
        expect(content).not.toContain('<!-- TINYLINGO-END -->');
        expect(content).not.toContain('TinyLingo content');
        expect(content).toContain('# Config');
        expect(content).toContain('# Other stuff');
      });

      it('should not throw when settings.json does not exist', () => {
        expect(() => adapter.uninstall()).not.toThrow();
      });

      it('should not throw when CLAUDE.md does not exist', () => {
        writeFileSync(settingsPath, JSON.stringify({}));
        expect(() => adapter.uninstall()).not.toThrow();
      });

      it('should clean up empty event key after removing all hooks', () => {
        const settings: ClaudeSettings = {
          hooks: {
            UserPromptSubmit: [
              {
                type: 'command',
                command: 'node /home/user/.config/tinylingo/scripts/hook.cjs',
              },
            ],
          },
        };
        writeFileSync(settingsPath, JSON.stringify(settings));

        adapter.uninstall();

        const updated: ClaudeSettings = JSON.parse(
          readFileSync(settingsPath, 'utf-8')
        );
        // Event key with empty array should be cleaned up
        const hooks = updated.hooks?.['UserPromptSubmit'];
        expect(!hooks || hooks.length === 0).toBe(true);
      });
    });
  });
});
