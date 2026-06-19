# Multi-Agent Mission Polish — Implementation Plan

## Phase 1: Types & Storage

1. Add `MissionState`, `MissionAgentState`, `MissionSynthesisState`, `MissionEvent` types to `MultiAgentService.ts`.
2. Create `MissionStateStorage` service at `src/core/intelligence/multiAgent/MissionStateStorage.ts` with:
   - `constructor(adapter: VaultFileAdapter, basePath = '.claudian/missions')`
   - `saveMission(state: MissionState): Promise<void>`
   - `loadMission(taskId: string): Promise<MissionState | null>`
   - `listMissions(): Promise<MissionState[]>`
   - `deleteMission(taskId: string): Promise<void>`
   - `appendEvent(taskId: string, event: MissionEvent): Promise<void>`
   - `loadEvents(taskId: string): Promise<MissionEvent[]>`
3. Add `MISSIONS_PATH` constant to `StoragePaths.ts`.
4. Write failing unit tests for `MissionStateStorage` first.
5. Implement and verify tests pass.

## Phase 2: Multi-Agent Service Enhancements

1. Extend `MultiAgentService.runMission` signature:
   - Add optional `options: { storage?: MissionStateStorage; onEvent?: (event: MissionEvent) => void }`.
   - Persist state after each progress update and on completion.
   - Emit `MissionEvent` entries via `onEvent`/`globalEventBus`.
2. Add `resumeMission` method:
   - Validate state matches task.
   - Skip done agents; re-run pending/error agents.
   - Run synthesis if applicable.
   - Persist state and emit events.
3. Extract `buildSynthesisPrompt` helper in `MultiAgentService.ts` (pure, testable).
4. Write failing tests for resume, persistence callbacks, and synthesis helper.
5. Implement and verify tests pass.

## Phase 3: Synthesis Prompt Improvements

1. Update `runSynthesisPrompt` in `src/main.ts` to use a more structured prompt:
   - Conflict resolution.
   - Citation of contributing specialists.
   - De-duplication.
   - Concise actionable output.
2. Keep prompt provider-neutral (still routes through active provider).
3. Add unit test verifying prompt content includes the new instructions.

## Phase 4: Dashboard Mission Timeline Viewer

1. Add `mission:event` to `ClaudianEventType` in `EventBus.ts`.
2. In `MultiAgentModal` and `MultiAgentService`, emit `mission:event` entries at start, per-agent transitions, and synthesis transitions.
3. In `MissionStateStorage`, persist events to `{taskId}.events.jsonl`.
4. Extend `ClaudianDashboardView`:
   - Add "Mission Log" action button.
   - Add `openMissionLogBrowser()` method that generates a markdown note from persisted mission states + events.
5. Add lightweight unit test for markdown generation.

## Phase 5: Integration & Verification

1. Wire `MissionStateStorage` into `ClaudianPlugin.initializeClaudianOSServices`:
   - `this.missionStateStorage = new MissionStateStorage(this.storage.getAdapter())`.
2. Pass storage into `MultiAgentModal` / `MultiAgentService.runMission`.
3. Run after every major change:
   ```bash
   npm run typecheck && npm run lint && npm run test && npm run build
   ```
4. Commit frequently with conventional commit messages.

## Phase 6: Report

1. Write `WORKSTREAM_REPORT.md` with summary, files touched, test results, and follow-ups.
