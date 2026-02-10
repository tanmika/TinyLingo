import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { PlatformAdapter } from './types.js';

const TINYLINGO_MARKER = '.config/tinylingo/scripts/';
const HOOK_EVENT = 'UserPromptSubmit';
const START_MARKER = '<!-- TINYLINGO-START -->';
const END_MARKER = '<!-- TINYLINGO-END -->';

const INSTRUCTION_BLOCK = `${START_MARKER}
## TinyLingo 术语与行为记忆

本机已安装 tinylingo，用于记录项目术语映射和行为纠正，避免重复犯错。

### 何时记录

以下任何场景发生时，使用 tinylingo record 记录：

1. **用户纠正了你的理解**：如"不是，我说的是 XXX"、"那个功能叫 YYY"
2. **用户主动解释含义**：如"我们项目里把 XXX 叫做 YYY"
3. **你询问某个词的含义**：用户给出了回答
4. **你经过多次搜索才找到正确对应**：如用户提到某个术语，你尝试了多个关键词搜索才定位到实际代码，此时应主动记录
5. **用户纠正了你的行为**：如用户指出你不该执行某个操作、流程顺序错误等
6. **用户主动要求记住**：如"记住 XXX 就是 YYY"、"以后 XXX 要这样做"

### 如何记录

\`\`\`bash
tinylingo record "<触发词>" "<尽可能密集的上下文信息>"
\`\`\`

### 注意

- 不要猜测，只在有明确依据时记录
- 记录后简要告知用户已保存
${END_MARKER}`;

/**
 * Hook entry structure in Claude's settings.json.
 */
export interface HookEntry {
  type: string;
  command: string;
}

/**
 * Claude settings.json hook configuration structure.
 */
export interface ClaudeSettings {
  hooks?: {
    [eventName: string]: HookEntry[];
  };
  [key: string]: unknown;
}

/**
 * Check if a hook entry belongs to TinyLingo.
 * Identifies by checking if the command path contains the TinyLingo scripts marker.
 */
export function isTinyLingoHook(command: string): boolean {
  return command.includes(TINYLINGO_MARKER);
}

/**
 * Merge hooks: preserve user hooks, replace TinyLingo hooks.
 */
export function mergeHooks(
  existingHooks: HookEntry[],
  newTinyLingoHook: HookEntry
): HookEntry[] {
  const filtered = existingHooks.filter((h) => !isTinyLingoHook(h.command));
  return [...filtered, newTinyLingoHook];
}

/**
 * Filter out TinyLingo hooks, keeping only user hooks.
 */
export function filterOutHooks(hooks: HookEntry[]): HookEntry[] {
  return hooks.filter((h) => !isTinyLingoHook(h.command));
}

/**
 * Claude Code platform adapter.
 *
 * Hook registration: ~/.claude/settings.json
 * Instruction injection: ~/.claude/CLAUDE.md (TINYLINGO-START/END markers)
 * Hook marker: command path contains `.config/tinylingo/scripts/`
 */
export class ClaudeAdapter implements PlatformAdapter {
  name = 'claude';

  private get claudeDir(): string {
    return join(homedir(), '.claude');
  }

  private get settingsPath(): string {
    return join(this.claudeDir, 'settings.json');
  }

  private get claudeMdPath(): string {
    return join(this.claudeDir, 'CLAUDE.md');
  }

  detect(): boolean {
    return existsSync(this.claudeDir);
  }

  isInstalled(): boolean {
    if (!existsSync(this.settingsPath)) return false;
    try {
      const settings: ClaudeSettings = JSON.parse(
        readFileSync(this.settingsPath, 'utf-8')
      );
      const hooks = settings.hooks?.[HOOK_EVENT] ?? [];
      return hooks.some((h) => isTinyLingoHook(h.command));
    } catch {
      return false;
    }
  }

  install(scriptPath: string): void {
    mkdirSync(this.claudeDir, { recursive: true });

    // Update settings.json
    let settings: ClaudeSettings = {};
    if (existsSync(this.settingsPath)) {
      try {
        settings = JSON.parse(readFileSync(this.settingsPath, 'utf-8'));
      } catch {
        // ignore parse errors
      }
    }

    if (!settings.hooks) settings.hooks = {};
    const existing = settings.hooks[HOOK_EVENT] ?? [];
    const newHook: HookEntry = {
      type: 'command',
      command: `node ${scriptPath}`,
    };
    settings.hooks[HOOK_EVENT] = mergeHooks(existing, newHook);
    writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

    // Inject instruction block into CLAUDE.md
    let mdContent = '';
    if (existsSync(this.claudeMdPath)) {
      mdContent = readFileSync(this.claudeMdPath, 'utf-8');
    }
    if (!mdContent.includes(START_MARKER)) {
      mdContent = mdContent + (mdContent.length > 0 ? '\n' : '') + INSTRUCTION_BLOCK + '\n';
      writeFileSync(this.claudeMdPath, mdContent, 'utf-8');
    }
  }

  uninstall(): void {
    // Clean settings.json
    if (existsSync(this.settingsPath)) {
      try {
        const settings: ClaudeSettings = JSON.parse(
          readFileSync(this.settingsPath, 'utf-8')
        );
        if (settings.hooks?.[HOOK_EVENT]) {
          const filtered = filterOutHooks(settings.hooks[HOOK_EVENT]);
          if (filtered.length === 0) {
            delete settings.hooks[HOOK_EVENT];
          } else {
            settings.hooks[HOOK_EVENT] = filtered;
          }
          writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        }
      } catch {
        // ignore
      }
    }

    // Remove instruction block from CLAUDE.md
    if (existsSync(this.claudeMdPath)) {
      let content = readFileSync(this.claudeMdPath, 'utf-8');
      const startIdx = content.indexOf(START_MARKER);
      const endIdx = content.indexOf(END_MARKER);
      if (startIdx !== -1 && endIdx !== -1) {
        const before = content.slice(0, startIdx);
        const after = content.slice(endIdx + END_MARKER.length);
        content = (before + after).replace(/\n{3,}/g, '\n\n').trim() + '\n';
        writeFileSync(this.claudeMdPath, content, 'utf-8');
      }
    }
  }
}
