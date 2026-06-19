# Multi-Agent Mission Polish — Design Document

## Workstream

- **Scope:** Multi-Agent Mission Polish (worktree-4)
- **Goal:** Make multi-agent missions recoverable after a crash, improve synthesis quality, and expose a mission timeline / event log viewer in the dashboard.
- **Version target:** 4.0.0

## Current State

`MultiAgentService` (`src/core/intelligence/multiAgent/MultiAgentService.ts`) already supports:

- Specialist registration.
- Parallel task execution with per-agent progress callbacks.
- Optional synthesis pass that combines all specialist outputs.
- Per-agent token and wall-clock duration metrics.

`MultiAgentModal` (`src/features/multiAgent/MultiAgentModal.ts`) provides a UI to launch missions and stream progress.

`ClaudianDashboardView` (`src/features/dashboard/ClaudianDashboardView.ts`) shows a live activity feed and a mission counter via `mission:started`, `mission:progress`, and `mission:completed` events.

## Gaps Addressed in This Workstream

1. **No crash recovery.** A mission that is interrupted (Obsidian reload, provider crash, window close) is lost. There is no persisted state to resume from.
2. **Synthesis prompt is basic.** It asks for a coherent answer but does not explicitly request conflict resolution, citations, or de-duplication.
3. **No mission timeline viewer.** Dashboard activity feed is a flat, transient list. Users cannot inspect a per-mission event log.

## Design Decisions

### 1. Mission State Persistence

Introduce a `MissionState` type and a `MissionStateStorage` service.

- Storage path: `.claudian/missions/{missionId}.json`
- A mission is persisted on every significant progress change and on completion.
- Persisted fields:
  - `taskId`, `prompt`, `agentIds`
  - `agents`: per-agent state (status, output, progress, tokens, durationMs, error)
  - `synthesis`: status, output, error
  - `status`: `pending | running | synthesizing | completed | error`
  - `overall`, `createdAt`, `updatedAt`, `completedAt`
- Storage is **optional** for `MultiAgentService`. If no storage is supplied, behavior is unchanged.

### 2. Resume Semantics

Add `resumeMission` to `MultiAgentService`:

- Accepts a `MissionState` and the same executor/synthesizer/callback.
- Already `done` agents are skipped; their stored output is reused.
- `error` and `pending` agents are re-run.
- After all agents finish, synthesis runs exactly as in `runMission`.
- Progress events are emitted normally so the UI can refresh.
- The resumed mission writes back to the same storage key.

### 3. Synthesis Improvements

Update the synthesis prompt in `main.ts` (`runSynthesisPrompt`) to:

- Explicitly request conflict resolution.
- Ask for a concise, actionable final answer.
- Request that the synthesizer note which specialist contributed key points.
- De-duplicate repeated facts or actions.
- Remain provider-neutral (uses the active chat provider runtime).

### 4. Mission Timeline / Event Log Viewer

Extend the dashboard:

- Add a `mission:event` event type to the global event bus for finer-grained timeline entries.
- Persist a lightweight event log alongside mission state: `.claudian/missions/{missionId}.events.jsonl`.
- Add a dashboard action button "Mission Log" that opens a generated note containing:
  - Mission metadata.
  - Per-agent start/done/error timestamps and outputs.
  - Synthesis start/done/error.
  - Overall duration.

### 5. Testing Strategy

- Write failing tests first for `MissionStateStorage` (save/load/list/delete, missing file handling).
- Extend `MultiAgentService` tests for resume behavior, persistence callbacks, and synthesis error handling.
- Add tests for the new synthesis prompt builder.
- Keep dashboard viewer tests lightweight (verify markdown generation from events).

## Files to Touch

- `src/core/intelligence/multiAgent/MultiAgentService.ts`
- `src/core/intelligence/multiAgent/MissionStateStorage.ts` (new)
- `src/core/events/EventBus.ts`
- `src/features/dashboard/ClaudianDashboardView.ts`
- `src/features/multiAgent/MultiAgentModal.ts`
- `src/main.ts`
- `src/core/bootstrap/StoragePaths.ts`
- `tests/unit/core/intelligence/multiAgent/MultiAgentService.test.ts`
- `tests/unit/core/intelligence/multiAgent/MissionStateStorage.test.ts` (new)
- `tests/unit/features/dashboard/ClaudianDashboardView.test.ts` (new, lightweight)
- `WORKSTREAM_REPORT.md` (root)

## Non-Goals

- No UI redesign of the multi-agent modal.
- No new provider-specific mission behavior.
- No changes to the subagent / swarm lifecycle (out of scope; belongs to other workstreams).

## Constraints

- Keep changes minimal and focused (YAGNI).
- Follow existing TypeScript patterns; no `any` unless unavoidable.
- No `console.log` in production code.
- Do not break existing tests.
