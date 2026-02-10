# TinyLingo 实现计划

## 技术栈

- **语言**: TypeScript
- **运行时**: Node.js
- **测试**: vitest
- **构建**: tsup (轻量 bundler)
- **无第三方运行时依赖** (匹配逻辑、CLI 解析均手写)

## 项目结构

```
TinyLingo/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── bin.ts                  # CLI 入口 (#!/usr/bin/env node)
│   ├── core/
│   │   ├── paths.ts            # 文件路径常量
│   │   ├── glossary.ts         # 术语表 CRUD
│   │   └── config.ts           # 配置 CRUD (点号路径访问)
│   ├── matching/
│   │   ├── exact.ts            # 精确子串匹配
│   │   ├── fuzzy.ts            # bigram Jaccard 模糊匹配
│   │   ├── smart.ts            # LLM 智能匹配 (API client)
│   │   └── pipeline.ts         # 匹配流水线编排
│   ├── cli/
│   │   ├── parser.ts           # 命令行解析 + --help
│   │   └── commands/
│   │       ├── record.ts
│   │       ├── remove.ts
│   │       ├── list.ts
│   │       ├── config.ts
│   │       ├── match.ts
│   │       ├── install.ts
│   │       └── uninstall.ts
│   ├── hook/
│   │   └── entry.ts            # hook 入口 (stdin→匹配→stdout)
│   └── adapters/
│       ├── types.ts            # adapter 接口定义
│       ├── claude.ts           # Claude Code adapter
│       ├── cursor.ts           # Cursor adapter
│       └── opencode.ts         # OpenCode adapter
├── tests/
│   ├── core/
│   │   ├── glossary.test.ts
│   │   ├── config.test.ts
│   │   └── paths.test.ts
│   ├── matching/
│   │   ├── exact.test.ts
│   │   ├── fuzzy.test.ts
│   │   ├── smart.test.ts
│   │   └── pipeline.test.ts
│   ├── cli/
│   │   ├── parser.test.ts
│   │   └── commands/
│   │       ├── record.test.ts
│   │       ├── remove.test.ts
│   │       ├── list.test.ts
│   │       ├── config.test.ts
│   │       ├── match.test.ts
│   │       ├── install.test.ts
│   │       └── uninstall.test.ts
│   ├── hook/
│   │   └── entry.test.ts
│   └── adapters/
│       ├── claude.test.ts
│       ├── cursor.test.ts
│       └── opencode.test.ts
├── demo/
│   └── smart-match-bench.mjs   # LLM 延迟基准测试 (已有)
└── docs/
    └── plans/
```

## 模块与流水线

按依赖顺序分 6 个模块，每个模块走 A→B→Reviewer 流水线。

### 模块 0: 项目脚手架

**内容**: package.json, tsconfig.json, vitest.config.ts, 目录结构
**执行**: A 直接完成 (无需 TDD)
**验收**: 能 `npm install` 并 `npm test` 运行空测试套件

### 模块 1: Core (数据层)

**文件**: `src/core/paths.ts`, `src/core/glossary.ts`, `src/core/config.ts`
**测试**: `tests/core/*.test.ts`

| 组件 | 接口 | 关键行为 |
|------|------|---------|
| paths | `getConfigDir()`, `getGlossaryPath()`, `getConfigPath()`, `getScriptsDir()` | 返回 `~/.config/tinylingo/` 下的路径, 目录不存在时自动创建 |
| glossary | `readGlossary()`, `writeGlossary()`, `addEntry(key, value)`, `removeEntry(key)`, `listEntries()` | JSON 文件读写, 文件不存在返回空对象, 写入自动创建目录 |
| config | `readConfig()`, `writeConfig()`, `getConfigValue(dotPath)`, `setConfigValue(dotPath, value)`, `getDefaultConfig()` | 点号路径访问嵌套值如 `smart.endpoint`, 自动类型推断 (`"true"`→`true`, `"0.2"`→`0.2`) |

**依赖**: 无
**A 产出**: 接口类型定义 + 测试用例 (覆盖正常/异常/边界)
**B 产出**: 通过所有测试的实现

### 模块 2: Matching (匹配引擎)

**文件**: `src/matching/exact.ts`, `src/matching/fuzzy.ts`, `src/matching/smart.ts`, `src/matching/pipeline.ts`
**测试**: `tests/matching/*.test.ts`

| 组件 | 接口 | 关键行为 |
|------|------|---------|
| exact | `exactMatch(message, glossary): MatchResult[]` | 遍历 key 做 `includes`, 返回所有命中 |
| fuzzy | `bigramJaccard(a, b): number`, `fuzzyMatch(message, glossary, threshold): FuzzCandidate[]` | 字符双字组 Jaccard 相似度, 返回超过阈值的候选 |
| smart | `smartMatch(message, candidates, config): Promise<MatchResult[]>` | 调用本地 LLM API, prompt 包含 `/no_think`, 解析返回的序号 |
| pipeline | `matchAll(message, glossary, config): Promise<MatchResult[]>` | 编排: 精确命中直接收集 → 未命中走智能匹配(如开启) → 合并去重返回 |

**类型定义**:
```typescript
interface MatchResult {
  term: string;
  explanation: string;
  source: 'exact' | 'smart';
}

interface FuzzCandidate {
  term: string;
  explanation: string;
  score: number;
}
```

**依赖**: 模块 1 (读取 glossary 和 config)
**A 产出**: 类型 + 测试 (smart 部分 mock API 调用)
**B 产出**: 通过所有测试的实现

### 模块 3: CLI

**文件**: `src/cli/parser.ts`, `src/cli/commands/*.ts`, `src/bin.ts`
**测试**: `tests/cli/*.test.ts`

| 组件 | 接口 | 关键行为 |
|------|------|---------|
| parser | `parseArgs(argv): ParsedCommand` | 解析命令名 + 参数 + `--help` 标志, 未知命令报错 |
| record | `runRecord(args)` | 参数: term, explanation; 调用 `addEntry` |
| remove | `runRemove(args)` | 参数: term; 调用 `removeEntry` |
| list | `runList()` | 调用 `listEntries`, 格式化输出 |
| config | `runConfig(args)` | 无参显示全部, 有参设置值 |
| match | `runMatch(args)` | 参数: message; 调用 `matchAll`, 格式化输出匹配过程 |
| install | `runInstall(args)` | 检测平台, 调用 adapter 注册 hook + 注入指令 |
| uninstall | `runUninstall(args)` | 调用 adapter 注销 hook + 删除指令 |

**依赖**: 模块 1 + 模块 2
**A 产出**: 类型 + 测试 (mock 文件系统操作)
**B 产出**: 通过所有测试的实现

### 模块 4: Hook Entry

**文件**: `src/hook/entry.ts`
**测试**: `tests/hook/entry.test.ts`

| 接口 | 关键行为 |
|------|---------|
| `processHookEvent(stdin): string` | 从 stdin 读取 JSON → 提取用户消息 → 调用 matchAll → 格式化为 system-reminder → 输出 |

**stdin 输入格式** (Claude Code):
```json
{
  "event": "UserPromptSubmit",
  "data": {
    "prompt": "用户的消息内容"
  }
}
```

**stdout 输出格式**:
```json
{
  "hookSpecificOutput": "<system-reminder>\n[TinyLingo]\n- term: explanation\n</system-reminder>"
}
```

无匹配时输出空:
```json
{}
```

**依赖**: 模块 2
**A 产出**: 类型 + 测试 (模拟 stdin/stdout)
**B 产出**: 通过所有测试的实现

### 模块 5: Platform Adapters + Install/Uninstall

**文件**: `src/adapters/types.ts`, `src/adapters/claude.ts`, `src/adapters/cursor.ts`, `src/adapters/opencode.ts`
**测试**: `tests/adapters/*.test.ts`

| 组件 | 接口 | 关键行为 |
|------|------|---------|
| types | `PlatformAdapter` 接口 | `install()`, `uninstall()`, `isInstalled()`, `detect()` |
| claude | `ClaudeAdapter implements PlatformAdapter` | 操作 `settings.json` + `CLAUDE.md`, marker: `.config/tinylingo/scripts/`, 标记块: `TINYLINGO-START/END` |
| cursor | `CursorAdapter implements PlatformAdapter` | 操作 `~/.cursor/hooks.json`, camelCase 事件名 |
| opencode | `OpenCodeAdapter implements PlatformAdapter` | 操作 OpenCode 插件配置 |

**PlatformAdapter 接口**:
```typescript
interface PlatformAdapter {
  name: string;
  detect(): boolean;              // 检测平台是否已安装
  isInstalled(): boolean;         // 检测 TinyLingo hook 是否已注册
  install(scriptPath: string): void;    // 注册 hook + 注入指令
  uninstall(): void;              // 注销 hook + 删除指令
}
```

**关键安全逻辑**:
- `isTinyLingoHook(entry)`: 通过命令路径 marker 识别
- `mergeHooks()`: 保留用户 hook, 替换 TinyLingo hook
- `filterOutHooks()`: 只删除 TinyLingo hook
- `injectInstruction()`: 检查标记块是否存在, 追加或跳过
- `removeInstruction()`: 正则匹配标记块, 精确删除

**依赖**: 模块 1 (paths)
**A 产出**: 接口 + 测试 (mock 文件系统, 测试合并/过滤/注入/删除逻辑)
**B 产出**: 通过所有测试的实现

### 模块 6: 集成与打包

**内容**:
- `src/bin.ts` 接入所有模块
- package.json `bin` 字段配置
- 构建脚本 (tsup)
- 端到端测试: `npm install -g .` 后验证所有命令可用
- hook 脚本构建为独立 CJS 文件

**执行**: B 完成, Reviewer 做最终审查

## 流水线执行顺序

```
模块0 (A独立完成)
  ↓
模块1: A写测试+接口 → B实现 → Reviewer审查
  ↓
模块2: A写测试+接口 → B实现 → Reviewer审查
  ↓
模块3: A写测试+接口 → B实现 → Reviewer审查 ←─┐
模块4: A写测试+接口 → B实现 → Reviewer审查 ←─┤ 可并行
  ↓                                            │
模块5: A写测试+接口 → B实现 → Reviewer审查 ───┘
  ↓
模块6: B集成打包 → Reviewer最终审查
```

模块 3 和 4 可以并行（互不依赖），模块 5 依赖 1 但不依赖 2/3/4 的实现，所以也有部分并行空间。
