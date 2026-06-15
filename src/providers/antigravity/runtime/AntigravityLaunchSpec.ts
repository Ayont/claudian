import type { AntigravityPermissionMode, AntigravityWorkspaceScope } from '../settings';

/**
 * Builds the command/args/cwd for a single-shot `agy --print` run.
 *
 * Verified `agy` v1.0.3 invocation:
 *   agy --print --add-dir <vaultPath> \
 *       (--dangerously-skip-permissions | --sandbox) \
 *       [--print-timeout <v>] [--add-dir <home>] \
 *       [--conversation <id>] -- "<prompt>"
 *
 * Permission posture is mutually exclusive:
 *   - `yolo`    -> `--dangerously-skip-permissions` (default; required for the
 *                  unattended `--print` mode, which cannot answer prompts).
 *   - `sandbox` -> `--sandbox`, and the skip-permissions flag is omitted.
 *
 * `--print` returns the final assistant text on stdout. The structured event
 * stream is read separately from the per-conversation transcript.jsonl.
 */

export interface BuildAntigravityLaunchSpecParams {
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  /** Newline KEY=VALUE list, used only for launch-key hashing. */
  envText?: string;
  prompt: string;
  /** Resume an existing conversation by id, when known. */
  conversationId?: string | null;
  /**
   * Permission posture. `yolo` (default) adds `--dangerously-skip-permissions`;
   * `sandbox` adds `--sandbox` and omits the skip-permissions flag.
   */
  permissionMode?: AntigravityPermissionMode;
  /** `--print-timeout <value>` (e.g. `10m`); empty/undefined leaves it unset. */
  printTimeout?: string;
  /** Filesystem scope; `allow-home` adds `--add-dir <homeDir>`. */
  workspaceScope?: AntigravityWorkspaceScope;
  /** Home directory to add when `workspaceScope === 'allow-home'`. */
  homeDir?: string;
}

export interface AntigravityLaunchSpec {
  args: string[];
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  launchKey: string;
}

export function buildAntigravityLaunchSpec(
  params: BuildAntigravityLaunchSpecParams,
): AntigravityLaunchSpec {
  // Default to YOLO so unattended `--print` runs (and aux one-shots that pass
  // no posture) keep the prior always-on `--dangerously-skip-permissions`.
  const permissionMode: AntigravityPermissionMode = params.permissionMode ?? 'yolo';
  const args = ['--print', '--add-dir', params.cwd];

  // YOLO skips permission prompts; sandbox runs inside agy's OS sandbox and
  // never skips. The two postures are mutually exclusive.
  if (permissionMode === 'sandbox') {
    args.push('--sandbox');
  } else {
    args.push('--dangerously-skip-permissions');
  }

  // allow-home roaming: add the home directory as an extra accessible root.
  // Skip it when home equals the vault (avoids a redundant duplicate flag).
  const homeDir = params.homeDir?.trim();
  if (params.workspaceScope === 'allow-home' && homeDir && homeDir !== params.cwd) {
    args.push('--add-dir', homeDir);
  }

  const printTimeout = params.printTimeout?.trim();
  if (printTimeout) {
    args.push('--print-timeout', printTimeout);
  }

  const conversationId = params.conversationId?.trim();
  if (conversationId) {
    args.push('--conversation', conversationId);
  }

  // Terminate flag parsing so the prompt is never mistaken for a flag.
  args.push('--', params.prompt);

  return {
    args,
    command: params.command,
    cwd: params.cwd,
    env: params.env,
    launchKey: JSON.stringify({
      command: params.command,
      conversationId: conversationId ?? null,
      cwd: params.cwd,
      envText: params.envText ?? '',
      permissionMode,
      printTimeout: printTimeout ?? '',
      workspaceScope: params.workspaceScope ?? 'vault-only',
      homeDir: params.workspaceScope === 'allow-home' ? (homeDir ?? '') : '',
    }),
  };
}
