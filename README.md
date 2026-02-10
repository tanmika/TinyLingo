# TinyLingo

A terminology and behavior memory tool for AI assistants.

AI 助手的术语与行为记忆工具。录入一次，所有后续会话自动理解。

## Problem

AI assistants lack project-specific terminology context. When you say "人脸挑图" but the code uses `AICulling`, the AI can't make the connection. Every new session requires re-explanation.

## Solution

TinyLingo maintains a glossary of term mappings and behavioral rules. A hook automatically injects matched entries into AI conversations via `<system-reminder>` annotations.

## Install

```bash
npm install -g tinylingo
tinylingo install
```

## Usage

### Record terms

```bash
# Terminology mapping
tinylingo record "智能抠图" "ProjectA background removal module, class BGRemover, at src/modules/bgremove/"

# Behavioral correction
tinylingo record "commit" "Do not run git push after git commit, let the user decide"
```

AI assistants can also call `tinylingo record` automatically when they detect misunderstandings.

### Manage entries

```bash
tinylingo list              # List all entries
tinylingo remove "智能抠图"  # Remove an entry
```

### Test matching

```bash
tinylingo match "抠图功能有bug"
# [exact] 智能抠图 → ProjectA background removal module...
```

### Configuration

```bash
tinylingo config                           # Show all config
tinylingo config smart.enabled true        # Enable LLM smart matching
tinylingo config smart.endpoint "http://127.0.0.1:1234/v1/chat/completions"
```

## Matching Modes

**Exact substring match** (default, always on):
- Zero latency, zero dependencies
- Matches glossary keys as substrings in user messages

**Smart match** (optional, requires local LLM):
- Fuzzy pre-filter using bigram Jaccard similarity
- Local LLM (e.g. qwen3-0.6b via LMStudio) judges relevance
- ~110ms latency per message

## Multi-platform Support

TinyLingo supports multiple AI tools through platform adapters:

| Platform | Status |
|----------|--------|
| Claude Code | Supported |
| Cursor | Stub (planned) |
| OpenCode | Stub (planned) |

```bash
tinylingo install            # Auto-detect and install
tinylingo install claude     # Install for specific platform
tinylingo uninstall          # Remove hooks and instructions
```

## Data Storage

All data is stored in `~/.config/tinylingo/`:

```
~/.config/tinylingo/
├── config.json      # Configuration
├── glossary.json    # Term mappings and behavioral rules
└── scripts/         # Hook scripts (installed by tinylingo install)
```

## Development

```bash
npm install
npm test            # Run 170 tests
npm run build       # Build with tsup
```

## License

MIT
