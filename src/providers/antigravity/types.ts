/**
 * Provider-owned persisted state for the Antigravity (`agy`) provider.
 *
 * `agy` has native conversation resume (`--conversation <id>`), so the only
 * durable state Claudian needs is the conversation id discovered after the
 * first run plus the resolved transcript file path (an optimization so we do
 * not have to re-scan the brain directory on every hydrate/tail).
 */
export interface AntigravityProviderState {
  /** Conversation id (the `~/.gemini/antigravity-cli/brain/<id>` directory name). */
  conversationId?: string;
  /** Absolute path to the conversation's transcript.jsonl, when known. */
  transcriptPath?: string;
}

export function getAntigravityState(
  providerState?: Record<string, unknown>,
): AntigravityProviderState {
  if (!providerState || typeof providerState !== 'object' || Array.isArray(providerState)) {
    return {};
  }
  const record = providerState as Record<string, unknown>;
  const state: AntigravityProviderState = {};
  if (typeof record.conversationId === 'string' && record.conversationId.trim()) {
    state.conversationId = record.conversationId.trim();
  }
  if (typeof record.transcriptPath === 'string' && record.transcriptPath.trim()) {
    state.transcriptPath = record.transcriptPath.trim();
  }
  return state;
}

export function buildPersistedAntigravityState(
  state: AntigravityProviderState,
): Record<string, unknown> | undefined {
  const entries: Record<string, unknown> = {};
  if (state.conversationId) {
    entries.conversationId = state.conversationId;
  }
  if (state.transcriptPath) {
    entries.transcriptPath = state.transcriptPath;
  }
  return Object.keys(entries).length > 0 ? entries : undefined;
}
