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
  isTinyLingoHookGroup,
  mergeHookGroups,
  filterOutHookGroups,
  type HookCommand,
  type HookGroup,
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

  describe('isTinyLingoHookGroup', () => {
    it('should return true for TinyLingo hook group', () => {
      const group: HookGroup = {
        hooks: [
          { type: 'command', command: 'node /home/user/.config/tinylingo/scripts/hook.cjs' },
        ],
      };
      expect(isTinyLingoHookGroup(group)).toBe(true);
    });

    it('should return false for user hook group', () => {
      const group: HookGroup = {
        hooks: [
          { type: 'command', command: 'node /home/user/my-custom-hook.js' },
        ],
      };
      expect(isTinyLingoHookGroup(group)).toBe(false);
    });

    it('should return false for empty hooks array', () => {
      const group: HookGroup = { hooks: [] };
      expect(isTinyLingoHookGroup(group)).toBe(false);
    });

    it('should detect marker in various path formats', () => {
      const group: HookGroup = {
        hooks: [
          { type: 'command', command: '/Users/me/.config/tinylingo/scripts/entry.cjs' },
        ],
      };
      expect(isTinyLingoHookGroup(group)).toBe(true);
    });

    it('should handle group with matcher', () => {
      const group: HookGroup = {
        matcher: 'some-matcher',
        hooks: [
          { type: 'command', command: 'node /home/user/.config/tinylingo/scripts/hook.cjs' },
        ],
      };
      expect(isTinyLingoHookGroup(group)).toBe(true);
    });
  });

  describe('mergeHookGroups', () => {
    const userGroup: HookGroup = {
      hooks: [
        { type: 'command', command: 'node /home/user/custom-hook.js' },
      ],
    };
    const oldTinyLingoGroup: HookGroup = {
      hooks: [
        { type: 'command', command: 'node /home/user/.config/tinylingo/scripts/old-hook.cjs' },
      ],
    };
    const newTinyLingoGroup: HookGroup = {
      hooks: [
        { type: 'command', command: 'node /home/user/.config/tinylingo/scripts/hook.cjs' },
      ],
    };

    it('should preserve user groups and add new TinyLingo group', () => {
      const result = mergeHookGroups([userGroup], newTinyLingoGroup);
      expect(result).toContainEqual(userGroup);
      expect(result).toContainEqual(newTinyLingoGroup);
    });

    it('should replace existing TinyLingo group with new one', () => {
      const result = mergeHookGroups([userGroup, oldTinyLingoGroup], newTinyLingoGroup);
      expect(result).toContainEqual(userGroup);
      expect(result).toContainEqual(newTinyLingoGroup);
      expect(result).not.toContainEqual(oldTinyLingoGroup);
    });

    it('should handle empty existing groups', () => {
      const result = mergeHookGroups([], newTinyLingoGroup);
      expect(result).toEqual([newTinyLingoGroup]);
    });
  });

  describe('filterOutHookGroups', () => {
    const userGroup: HookGroup = {
      hooks: [
        { type: 'command', command: 'node /home/user/custom-hook.js' },
      ],
    };
    const tinyLingoGroup: HookGroup = {
      hooks: [
        { type: 'command', command: 'node /home/user/.config/tinylingo/scripts/hook.cjs' },
      ],
    };

    it('should remove TinyLingo groups', () => {
      const result = filterOutHookGroups([userGroup, tinyLingoGroup]);
      expect(result).toEqual([userGroup]);
    });

    it('should preserve all user groups', () => {
      const result = filterOutHookGroups([userGroup]);
      expect(result).toEqual([userGroup]);
    });

    it('should return empty array when all groups are TinyLingo', () => {
      const result = filterOutHookGroups([tinyLingoGroup]);
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = filterOutHookGroups([]);
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
              {
                hooks: [
                  { type: 'command', command: 'node /some/other/hook.js' },
                ],
              },
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
                hooks: [
                  {
                    type: 'command',
                    command: 'node /home/user/.config/tinylingo/scripts/hook.cjs',
                  },
                ],
              },
            ],
          },
        };
        writeFileSync(settingsPath, JSON.stringify(settings));
        expect(adapter.isInstalled()).toBe(true);
      });

      it('should handle mixed groups with existing hooks', () => {
        const settings: ClaudeSettings = {
          hooks: {
            UserPromptSubmit: [
              {
                matcher: 'some-matcher',
                hooks: [
                  { type: 'command', command: 'node /other/hook.js', timeout: 5000 },
                ],
              },
              {
                hooks: [
                  {
                    type: 'command',
                    command: 'node /home/user/.config/tinylingo/scripts/hook.cjs',
                  },
                ],
              },
            ],
          },
        };
        writeFileSync(settingsPath, JSON.stringify(settings));
        expect(adapter.isInstalled()).toBe(true);
      });
    });

    describe('install', () => {
      it('should add hook group to settings.json', () => {
        const scriptPath = '/home/user/.config/tinylingo/scripts/hook.cjs';
        adapter.install(scriptPath);

        const settings: ClaudeSettings = JSON.parse(
          readFileSync(settingsPath, 'utf-8')
        );
        expect(settings.hooks).toBeDefined();
        const groups = settings.hooks!['UserPromptSubmit'] ?? [];
        expect(
          groups.some((g) => g.hooks.some((h) => h.command.includes(scriptPath)))
        ).toBe(true);
      });

      it('should preserve existing hook groups from other tools', () => {
        const existingSettings: ClaudeSettings = {
          hooks: {
            UserPromptSubmit: [
              {
                hooks: [
                  { type: 'command', command: 'node /other/tool/hook.cjs', timeout: 5000 },
                ],
              },
            ],
          },
        };
        writeFileSync(settingsPath, JSON.stringify(existingSettings));

        adapter.install('/home/user/.config/tinylingo/scripts/hook.cjs');

        const settings: ClaudeSettings = JSON.parse(
          readFileSync(settingsPath, 'utf-8')
        );
        const groups = settings.hooks!['UserPromptSubmit'];
        expect(groups.length).toBe(2);
        expect(groups.some((g) => g.hooks.some((h) => h.command.includes('/other/tool/')))).toBe(true);
        expect(groups.some((g) => g.hooks.some((h) => h.command.includes('tinylingo')))).toBe(true);
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

      it('should include timeout in hook command', () => {
        const scriptPath = '/home/user/.config/tinylingo/scripts/hook.cjs';
        adapter.install(scriptPath);

        const settings: ClaudeSettings = JSON.parse(
          readFileSync(settingsPath, 'utf-8')
        );
        const groups = settings.hooks!['UserPromptSubmit'];
        const tinyLingoGroup = groups.find((g) =>
          g.hooks.some((h) => h.command.includes(scriptPath))
        );
        expect(tinyLingoGroup).toBeDefined();
        expect(tinyLingoGroup!.hooks[0].timeout).toBe(5000);
      });
    });

    describe('uninstall', () => {
      it('should remove TinyLingo hook group from settings.json', () => {
        const settings: ClaudeSettings = {
          hooks: {
            UserPromptSubmit: [
              {
                hooks: [
                  {
                    type: 'command',
                    command: 'node /home/user/.config/tinylingo/scripts/hook.cjs',
                  },
                ],
              },
              {
                hooks: [
                  { type: 'command', command: 'node /other/hook.js' },
                ],
              },
            ],
          },
        };
        writeFileSync(settingsPath, JSON.stringify(settings));

        adapter.uninstall();

        const updated: ClaudeSettings = JSON.parse(
          readFileSync(settingsPath, 'utf-8')
        );
        const groups = updated.hooks?.['UserPromptSubmit'] ?? [];
        expect(
          groups.some((g) => g.hooks.some((h) => h.command.includes('tinylingo')))
        ).toBe(false);
        expect(
          groups.some((g) => g.hooks.some((h) => h.command.includes('/other/hook.js')))
        ).toBe(true);
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

      it('should clean up empty event key after removing all hook groups', () => {
        const settings: ClaudeSettings = {
          hooks: {
            UserPromptSubmit: [
              {
                hooks: [
                  {
                    type: 'command',
                    command: 'node /home/user/.config/tinylingo/scripts/hook.cjs',
                  },
                ],
              },
            ],
          },
        };
        writeFileSync(settingsPath, JSON.stringify(settings));

        adapter.uninstall();

        const updated: ClaudeSettings = JSON.parse(
          readFileSync(settingsPath, 'utf-8')
        );
        const groups = updated.hooks?.['UserPromptSubmit'];
        expect(!groups || groups.length === 0).toBe(true);
      });
    });
  });
});
