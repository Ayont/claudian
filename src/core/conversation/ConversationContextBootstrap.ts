/**
 * Claudian - Conversation Context Bootstrap
 *
 * Provider-agnostic helper that produces a BOUNDED, framed snapshot of prior
 * conversation turns. It is injected into the FIRST turn after the user switches
 * a conversation to a different provider, so the freshly-started CLI session gets
 * minimal context to continue coherently.
 *
 * Each provider keeps its own native session, so only the single switch turn needs
 * this snapshot — never normal same-provider turns. The output is hard-capped so a
 * provider is never handed a giant prompt (which can make the CLI hang for minutes).
 */

import { buildContextFromHistory } from '../../utils/session';
import type { ChatMessage } from '../types';

/** Hard cap on the framed bootstrap payload (characters). Keep small + bounded. */
export const CONTEXT_BOOTSTRAP_CHAR_CAP = 6000;

/** Note prepended when older turns are dropped to satisfy the char cap. */
const EARLIER_TURNS_OMITTED_NOTE = '[earlier turns omitted]';

const CONTEXT_OPEN_TAG = '<conversation_context>';
const CONTEXT_CLOSE_TAG = '</conversation_context>';

export interface ConversationContextBootstrapOptions {
  /** Hard character cap for the framed body (defaults to CONTEXT_BOOTSTRAP_CHAR_CAP). */
  maxChars?: number;
}

/**
 * Builds a bounded, framed `<conversation_context>` snapshot from prior messages.
 *
 * Behavior:
 * - Formats turns via the shared `buildContextFromHistory` (User:/Assistant: pairs,
 *   skipping interrupts and empty assistant messages), keeping the MOST RECENT turns
 *   with oldest-last ordering.
 * - Hard-caps the body at `maxChars`. When older turns are dropped, an
 *   `[earlier turns omitted]` note is prepended so the model knows context was trimmed.
 * - Returns `''` for empty history or history with no renderable content (so callers
 *   can cheaply skip injection).
 *
 * @param messages Prior conversation messages (NOT including the current turn).
 * @param options Optional overrides (e.g. a smaller cap for tests).
 * @returns A framed bootstrap string, or `''` when there is nothing to carry.
 */
export function buildConversationContextBootstrap(
  messages: ChatMessage[],
  options: ConversationContextBootstrapOptions = {},
): string {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }

  const maxChars = options.maxChars ?? CONTEXT_BOOTSTRAP_CHAR_CAP;
  if (maxChars <= 0) {
    return '';
  }

  const body = buildBoundedBody(messages, maxChars);
  if (!body) {
    return '';
  }

  return `${CONTEXT_OPEN_TAG}\n${body}\n${CONTEXT_CLOSE_TAG}`;
}

/**
 * Produces the bounded body by keeping the most recent renderable turns oldest-last,
 * dropping older turns until the formatted text fits within `maxChars`.
 */
function buildBoundedBody(messages: ChatMessage[], maxChars: number): string {
  const full = buildContextFromHistory(messages).trim();
  if (!full) {
    return '';
  }

  // Fast path: the whole history already fits.
  if (full.length <= maxChars) {
    return full;
  }

  // Drop oldest messages one at a time (keeping the most recent) until the formatted
  // tail fits, reserving room for the omitted-turns note.
  const reserved = EARLIER_TURNS_OMITTED_NOTE.length + 2; // note + blank line
  const budget = Math.max(0, maxChars - reserved);

  for (let start = 1; start < messages.length; start++) {
    const tail = buildContextFromHistory(messages.slice(start)).trim();
    if (!tail) {
      continue;
    }
    if (tail.length <= budget) {
      return `${EARLIER_TURNS_OMITTED_NOTE}\n\n${tail}`;
    }
  }

  // Even the single most-recent renderable turn exceeds the budget: hard-truncate it
  // so the cap is always honored.
  const lastTurn = buildContextFromHistory(messages.slice(-1)).trim();
  const truncated = lastTurn.slice(0, budget).trimEnd();
  return `${EARLIER_TURNS_OMITTED_NOTE}\n\n${truncated}`;
}
