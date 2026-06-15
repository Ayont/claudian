## Antigravity Provider — Implementation Spec

Adds Google **Antigravity CLI** (`agy`) as a selectable coding-agent backend in Claudian,
alongside `claude`, `codex`, `opencode`, `pi`.

### Verified CLI facts (agy v1.0.3, June 2026)

`agy --help` flags (NO `--output-format` / `--json` / `--acp` — confirmed by probe
`flags provided but not defined: -output-format`):

| Flag | Meaning |
| --- | --- |
| `-p` / `--print` / `--prompt` | Run single prompt non-interactively, print response (text) |
| `--print-timeout` | Print-mode wait timeout (default 5m0s) |
| `--add-dir` | Add directory to workspace (repeatable) → set vault as cwd |
| `-c` / `--continue` | Continue most recent conversation |
| `--conversation <id>` | Resume a previous conversation by ID |
| `--dangerously-skip-permissions` | Auto-approve tool calls (agentic, like Claude `--dangerously…`) |
| `--sandbox` | Sandbox with terminal restrictions |
| `--log-file` | Override CLI log file path |

- **No model-selection CLI flag.** Model tier lives in config (`MODEL_TIER_FLASH`,
  e.g. `gemini-2.5-flash`) under `~/.gemini/antigravity-cli/`. v1: no model dropdown.
- Binary name is **`agy`** (not `antigravity`). Installed at `~/.local/bin/agy`.
- Data dir: `~/.gemini/antigravity-cli/` → `conversations/<id>.pb` (protobuf),
  `history.jsonl`, `brain/<id>/`, `log/`.

### Structured event stream (the "output parser" source)

`agy` writes a JSONL transcript per conversation:

```
~/.gemini/antigravity-cli/brain/<conversationId>/.system_generated/logs/transcript.jsonl
```

Each line = one event. Verified schema (synthetic example):

```jsonc
{ "step_index": 0, "source": "USER_EXPLICIT", "type": "USER_INPUT",
  "status": "DONE", "created_at": "2026-05-20T11:38:18Z",
  "content": "<USER_REQUEST>\nhi\n</USER_REQUEST>..." }
{ "step_index": 1, "source": "SYSTEM", "type": "CONVERSATION_HISTORY", "status": "DONE" }
{ "step_index": 2, "source": "MODEL", "type": "PLANNER_RESPONSE",
  "status": "DONE", "content": "Hello! I am Antigravity..." }
```

- `source`: `USER_EXPLICIT` | `SYSTEM` | `MODEL` | (TOOL — to confirm with tool runs)
- `type`: `USER_INPUT` | `CONVERSATION_HISTORY` | `PLANNER_RESPONSE` |
  (tool/subagent types e.g. `INVOKE_SUBAGENT` seen in binary strings — confirm live)
- `status`: `DONE` | (RUNNING/PENDING expected while streaming)

### Architecture

No JSON stdout mode → integration = **command-mode + transcript tail**
(mirrors codex `CodexSessionFileTail`, not opencode ACP):

1. **Spawn**: `agy --print --add-dir <vaultPath> --dangerously-skip-permissions
   [--conversation <id>] -- "<prompt>"`
2. **stdout** → final assistant text (fallback / primary text).
3. **Tail** `transcript.jsonl` of active conversation → emit structured chunks:
   `PLANNER_RESPONSE` (MODEL) → assistant text; tool events → tool call/result.
4. **Conversation id discovery**: detect newest `brain/<id>/` dir after spawn; persist.
5. **Session continuity**: store conversation id per chat tab → reuse via `--conversation`.
6. **Binary auto-detect**: `findCliBinaryPath('agy', PATH)` + settings `cliPath`
   (+ hostname-keyed `cliPathsByHost`, like opencode).

### Provider contract (`src/core/providers/types.ts`)

`ProviderRegistration` requires: `displayName`, `blankTabOrder`, `isEnabled`,
`capabilities`, `chatUIConfig`, `settingsReconciler`, `createRuntime`,
`createTitleGenerationService`, `createInstructionRefineService`,
`createInlineEditService`, `historyService`, `taskResultInterpreter`
(+ optional `environmentKeyPatterns`, `subagentLifecycleAdapter`).

`ProviderId = string` (no union to edit). Registration in
`src/providers/index.ts` → `registerBuiltInProviders()`:
`ProviderRegistry.register('antigravity', antigravityProviderRegistration)` +
`ProviderWorkspaceRegistry.register('antigravity', antigravityWorkspaceRegistration)`.
Defaults in `src/providers/defaultProviderConfigs.ts`.

### Capabilities (planned)

```ts
{ providerId: 'antigravity', supportsPersistentRuntime: true,
  supportsNativeHistory: true,
  supportsPlanMode: false, supportsRewind: false, supportsFork: false,
  supportsProviderCommands: false, supportsImageAttachments: false,
  supportsInstructionMode: false, supportsMcpTools: false,
  supportsTurnSteer: false, reasoningControl: 'none' }
```

### File map

Create under `src/providers/antigravity/`:
- `capabilities.ts` ✅
- `settings.ts` ✅
- `runtime/AntigravityCliResolver.ts` ✅
- `normalization/transcript.ts` ✅
- `runtime/AntigravityChatRuntime.ts` ⏳
- `runtime/AntigravityRuntimeEnvironment.ts` ⏳
- `env/AntigravitySettingsReconciler.ts` ⏳
- `ui/AntigravityChatUIConfig.ts` ⏳
- `ui/AntigravitySettingsTab.ts` ⏳
- `auxiliary/{TitleGeneration,InstructionRefine,InlineEdit,TaskResultInterpreter}.ts` ⏳
- `history/AntigravityConversationHistoryService.ts` ⏳
- `app/AntigravityWorkspaceServices.ts` ⏳
- `registration.ts` ⏳

Modify: `src/providers/index.ts`, `src/providers/defaultProviderConfigs.ts`,
`src/i18n/locales/*.json` (`settings.tabs.antigravity`).

### Build / deploy

- `npm run typecheck` after each step.
- `npm run build` → `main.js` (+ `manifest.json`, `styles.css`).
- Deploy: copy outputs → vault `.obsidian/plugins/realclaudian/`.

### Open items to confirm live (tool-use run)

- Exact `type`/`source` values for tool calls + subagent events in transcript.jsonl.
- Whether `--print` blocks until done or streams partials we can tail.
- Conversation-id surfacing (stdout vs only brain dir).
