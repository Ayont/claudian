# 4.0.0 — Stability, Resilience & Multi-Agent Polish

## Overview

This release makes ayontclaudian significantly more stable and production-ready. It introduces centralized error recovery, provider health checks, unified config validation, model-config synchronization, resumable multi-agent missions, and chat bookmark persistence.

## What's New

### 🛡️ Runtime Stability & Error Recovery

- **Centralized error recovery service** (`ProviderErrorRecoveryService`) tracks provider errors, classifies them, and exposes restart/clear actions.
- **Shared singleton** exported as `providerErrorRecoveryService` for use across the chat sidebar and dashboard.
- **Error chunks** route streaming failures through `StreamController.handleStreamChunk` so the UI renders them consistently.
- **Plugin logger** (`src/utils/logger.ts`) replaces ad-hoc `console.*` calls in the touched code paths.
- New tests: `errorRecovery.test.ts`, `logger.test.ts`, updated `InputController.test.ts`.

### 🔌 Provider Resilience & Config Hardening

- **Pre-flight health checks** (`ensureProviderHealthy`) probe the provider CLI before every chat turn and show an inline Notice if unreachable.
- **Unified provider-config validator** (`providerConfigValidator.ts`) detects missing fields, type mismatches, and unknown fields.
- **Auto-repair on load** (`repairAllProviderConfigs`) merges missing defaults and coerces invalid types when settings are loaded.
- **Model-config sync registry** (`modelConfigSync.ts`) abstracts provider-specific model persistence. Kimi is the first registered syncer, building on the 3.0.6 fix.
- `ProviderRegistry.getProviderRegistration` is now public; `ProviderRegistration` gained an optional `defaultConfig` field.
- New tests: `providerConfigValidator.test.ts`, `modelConfigSync.test.ts`, extended `providerHealthCheck.test.ts`.

### 🤖 Multi-Agent Mission Polish

- **Resumable missions** (`MultiAgentService.resumeMission`) skip completed agents, re-run errored ones, and re-run synthesis.
- **Mission state persistence** (`MissionStateStorage`) saves mission state and append-only event logs under `.claudian/missions/`.
- **Improved synthesis** with conflict resolution, de-duplication, specialist citations, and a concise actionable answer.
- **Mission timeline / event log viewer** in the dashboard exports the last 50 missions with event timelines to a markdown note.
- New tests: `MissionStateStorage.test.ts`, `formatMissionLogMarkdown.test.ts`, extended `MultiAgentService.test.ts`.

### 💬 Chat Productivity Foundation

- **Bookmark persistence** for messages: `ChatState.bookmarkedMessageIds` is saved to conversation/session metadata and restored on load.
- New tests: `ChatState.bookmarks.test.ts`.

## Quality

- **6210 tests passed** (up from ~6170 in 3.0.6)
- TypeScript typecheck: **0 errors**
- ESLint: **0 errors** (61 pre-existing warnings)
- Production build: **success**

## Migration

No user action required. Existing settings and conversations are preserved. On first load after update, provider configs are auto-repaired if they are missing fields or have invalid types.
