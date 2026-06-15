import type { ProviderSettingsReconciler } from '../../../core/providers/types';
import type { Conversation } from '../../../core/types';

/**
 * Antigravity exposes a single non-selectable model (no model dropdown, no
 * env-driven model variants), so model reconciliation is a no-op. The shared
 * coordinator still calls these methods for every provider, hence the inert
 * implementations.
 */
export const antigravitySettingsReconciler: ProviderSettingsReconciler = {
  reconcileModelWithEnvironment(
    _settings: Record<string, unknown>,
    _conversations: Conversation[],
  ): { changed: boolean; invalidatedConversations: Conversation[] } {
    return { changed: false, invalidatedConversations: [] };
  },

  normalizeModelVariantSettings(_settings: Record<string, unknown>): boolean {
    return false;
  },
};
