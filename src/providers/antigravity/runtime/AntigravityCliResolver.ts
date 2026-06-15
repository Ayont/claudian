import { findCliBinaryPath, resolveConfiguredCliPath } from '../../../utils/cliBinaryLocator';
import {
  getAntigravityProviderSettings,
  getConfiguredAntigravityCliPath,
  type PersistedAntigravityProviderSettings,
} from '../settings';

/** The Antigravity CLI binary name (Go binary `agy`, not `antigravity`). */
export const ANTIGRAVITY_CLI_BINARY = 'agy';

/**
 * Locates the `agy` executable.
 *
 * Resolution order:
 *   1. Host-keyed / explicit `cliPath` from settings (if the file exists).
 *   2. `agy` discovered on PATH (PATH enhanced with common bin dirs).
 *
 * Returns the absolute path, or `null` when the binary cannot be found.
 */
export class AntigravityCliResolver {
  resolve(settings: PersistedAntigravityProviderSettings, additionalPath?: string): string | null {
    const configured = resolveConfiguredCliPath(getConfiguredAntigravityCliPath(settings));
    if (configured) {
      return configured;
    }
    return findCliBinaryPath(ANTIGRAVITY_CLI_BINARY, additionalPath);
  }

  /** Convenience overload resolving straight from the global settings record. */
  resolveFromSettings(settings: Record<string, unknown>, additionalPath?: string): string | null {
    return this.resolve(getAntigravityProviderSettings(settings), additionalPath);
  }

  /** True when an `agy` binary is reachable from the given settings. */
  isAvailable(settings: Record<string, unknown>, additionalPath?: string): boolean {
    return this.resolveFromSettings(settings, additionalPath) !== null;
  }

  /**
   * Satisfies the `ProviderCliResolver` contract. This resolver holds no
   * cached state, so resetting is a no-op.
   */
  reset(): void {}
}
