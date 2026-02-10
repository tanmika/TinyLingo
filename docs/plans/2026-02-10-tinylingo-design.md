# TinyLingo 设计文档

## 问题

AI 助手缺乏项目领域术语的上下文。用户说"人脸挑图"，代码里叫 `AICulling`，AI 无法建立映射，导致反复误解。每次新会话都要重新解释。此外 AI 可能重复犯同样的操作错误，缺乏从纠正中学习的机制。

## 解决方案

一个术语与行为记忆工具，录入一次，所有后续会话自动生效。支持术语映射和行为纠正两类记忆。

## 架构

```
┌──────────────────┐     ┌───────────────────────────────┐
│  tinylingo CLI   │────▶│  ~/.config/tinylingo/         │
│  record/list/rm  │     │  ├── config.json  (配置)      │
│  config/install  │     │  ├── glossary.json (术语表)    │
│  match           │     │  └── scripts/     (hook脚本)  │
└──────────────────┘     └───────────────┬───────────────┘
                                         │ 读取
┌──────────────────┐     ┌───────────────▼───────────────┐
│  用户发送消息     │────▶│  hook adapter (多平台)         │
│                  │     │  ┌─ 精确子串匹配               │
└──────────────────┘     │  └─ 智能匹配 (本地LLM, 可选)  │
                         └───────────────┬───────────────┘
                                         │ 命中时注入
                         ┌───────────────▼───────────────┐
                         │  平台对应的上下文注入格式       │
                         │  (如 Claude 的 system-reminder)│
                         └───────────────────────────────┘
```

## 交付件

### 1. `tinylingo` CLI（Node.js npm 包）

全局安装的命令行工具。

```bash
tinylingo record <term> <explanation>   # 添加/更新记录
tinylingo remove <term>                 # 删除记录
tinylingo list                          # 列出所有记录
tinylingo config                        # 显示全部配置
tinylingo config <key> <value>          # 设置配置项（点号路径）
tinylingo match <message>               # 手动测试匹配（调试用）
tinylingo install                       # 注册 hook 到 AI 工具
tinylingo uninstall                     # 清理 hook 注册和注入的指令
tinylingo --help                        # 全局帮助
tinylingo <command> --help              # 子命令帮助
```

- 语言：Node.js
- 安装方式：`npm install -g`
- 包名：`tinylingo`
- 所有命令均支持 `--help`

### 2. 数据与配置文件

路径：`~/.config/tinylingo/`

**glossary.json（记忆表）：**

```json
{
  "智能抠图": "ProjectA 中背景移除模块，类名 BGRemover，位于 src/modules/bgremove/",
  "联调": "在 ProjectA 的 localConfig.cmake 中设置 USE_SOURCE 选项控制是否联合源码调试",
  "提交": "git commit 后不要执行 git push，由用户决定是否推送及推送时机",
  "依赖更新": "禁止运行初始化脚本，必须使用指定的包管理命令更新依赖"
}
```

- 简单 key-value 结构
- key：触发词（用户惯用术语或操作关键词）
- value：尽可能密集的上下文信息（项目名、模块位置、实际标识符、行为说明等）
- 全局共享，不做项目隔离

**config.json（配置）：**

```json
{
  "smart": {
    "enabled": false,
    "endpoint": "http://127.0.0.1:1234/v1/chat/completions",
    "model": "qwen3-0.6b",
    "fuzzyThreshold": 0.2
  }
}
```

- `smart.enabled`：是否开启智能匹配（模糊预过滤 + LLM 判断）
- `smart.endpoint`：本地 LLM API 地址（OpenAI 兼容格式）
- `smart.model`：模型名称
- `smart.fuzzyThreshold`：模糊预过滤的 bigram Jaccard 阈值

`smart.enabled = false` 时只跑精确子串匹配；`true` 时精确匹配 + 模糊预过滤 + LLM 判断。

通过 CLI 设置：

```bash
tinylingo config smart.enabled true
tinylingo config smart.endpoint "http://127.0.0.1:1234/v1/chat/completions"
```

### 3. Hook 脚本（消息预处理）

安装到 `~/.config/tinylingo/scripts/`，通过 `tinylingo install` 注册到 AI 工具。

#### 匹配模式

**精确子串匹配（默认，始终启用）：**
- 遍历所有 key，`message.includes(key)`
- 零延迟，零依赖
- 命中直接输出

**智能匹配（可选，`smart.enabled: true` 时启用）：**
- 对未精确命中的术语，用 bigram Jaccard 相似度筛出候选（阈值可配置）
- 候选 + 用户消息发送给本地 LLM，LLM 判断哪些真正相关
- 使用 `/no_think` 关闭推理过程，延迟 ~110ms（qwen3-0.6b 实测）
- LLM 确认相关的才输出

两种模式结果合并后统一输出。

#### 注入格式

以 Claude Code 为例，命中时输出（多个命中合并为一个块）：

```
<system-reminder>
[TinyLingo]
- 智能抠图: ProjectA 中背景移除模块，类名 BGRemover，位于 src/modules/bgremove/
- 提交: git commit 后不要执行 git push，由用户决定是否推送及推送时机
</system-reminder>
```

未命中则不输出任何内容。

#### `match` 命令调试输出

```bash
tinylingo match "帮我提交一下代码"
# [精确] 提交 → git commit 后不要执行 git push，由用户决定是否推送及推送时机

tinylingo match "抠图功能有bug"
# [精确] 无
# [智能] 智能抠图 (模糊 jaccard: 0.25, LLM 确认) → ProjectA 中背景移除模块...
```

### 4. 多 AI 平台支持

参照 TanmiWorkspace 的适配器模式：

- 核心匹配逻辑与平台无关，独立模块
- 每个平台一个 adapter，处理 hook 注册、事件格式和上下文注入格式
- `tinylingo install` 自动检测已安装的平台，支持选择安装目标

**平台 adapter：**

| 平台 | Hook 注册 | 事件格式 | 注入格式 |
|------|----------|---------|---------|
| Claude Code | `~/.claude/settings.json` | stdin/stdout JSON | `<system-reminder>` |
| Cursor | `~/.cursor/hooks.json` | camelCase 事件名 | 平台对应格式 |
| OpenCode | TypeScript 插件接口 | 事件驱动 | 平台对应格式 |

**Hook 安装/卸载安全机制：**

- 用 marker 标识 TinyLingo 管理的 hook（命令路径包含 `.config/tinylingo/scripts/`）
- 安装时：读取现有配置 → 过滤掉旧的 TinyLingo hook → 保留用户 hook → 追加新的 TinyLingo hook
- 卸载时：只删除 TinyLingo 标记的 hook，保留所有用户自定义 hook
- 事件类型为空时清理整个事件 key，避免留下空数组

### 5. AI 指令注入

`tinylingo install` 时在对应平台的全局指令文件中注入指令块（如 Claude Code 的 `~/.claude/CLAUDE.md`），`tinylingo uninstall` 时精确删除。

使用标记块包裹，确保只操作自己的内容：

```markdown
<!-- TINYLINGO-START -->
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

```bash
tinylingo record "<触发词>" "<尽可能密集的上下文信息>"
```

value 部分应包含项目名、模块位置、实际标识符、具体行为说明等，越密集越好。

术语映射示例：
```bash
tinylingo record "智能抠图" "ProjectA 中背景移除模块，类名 BGRemover，位于 src/modules/bgremove/"
tinylingo record "联调" "在 ProjectA 的 localConfig.cmake 中设置 USE_SOURCE 选项控制是否联合源码调试"
```

行为纠正示例：
```bash
tinylingo record "提交" "git commit 后不要执行 git push，由用户决定是否推送及推送时机"
tinylingo record "依赖更新" "禁止运行初始化脚本，必须使用指定的包管理命令更新依赖"
```

### 注意

- 不要猜测，只在有明确依据时记录（用户告知、搜索验证、被纠正）
- 记录后简要告知用户已保存
<!-- TINYLINGO-END -->
```

**安装/卸载逻辑：**
- `install`：检查标记块是否已存在，不存在则追加到文件末尾
- `uninstall`：匹配 `<!-- TINYLINGO-START -->` 到 `<!-- TINYLINGO-END -->` 之间的内容（含标记行），精确删除，不碰其余内容
- 其他平台（Cursor、OpenCode）在对应的全局指令文件中执行相同逻辑

## 录入方式

1. **AI 自动录入** — AI 在对话中根据指令块描述的场景，自行通过 Bash 调用 `tinylingo record`
2. **用户手动** — 终端执行 `tinylingo record "术语" "解释"`

## 不做的事情

- 不做项目级隔离（跨目录场景无法可靠判断项目归属）
- 不做 skill（标准 CLI 工具，不依赖特定 AI 平台的 skill 体系）
