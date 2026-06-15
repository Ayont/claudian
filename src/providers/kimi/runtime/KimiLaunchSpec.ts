import type { KimiAgent, KimiPermissionMode } from '../settings';

/**
 * Builds the command/args/cwd for a single-turn `kimi-cli --print` run with
 * line-delimited JSON streaming.
 *
 * Verified `kimi-cli` v1.47 invocation:
 *   kimi-cli --print --output-format stream-json -m <model> \
 *     [--thinking | --no-thinking] [--agent <a>] [--agent-file <f>] \
 *     [--mcp-config-file <f>] [--continue | --session <id>] \
 *     --add-dir <vaultPath> --work-dir <vaultPath> [--yolo | --plan] -p <prompt>
 *
 * `--print` is non-interactive (auto-dismisses questions). `--output-format
 * stream-json` emits one complete chat message per stdout line.
 */

export interface BuildKimiLaunchSpecParams {
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  /** Newline KEY=VALUE list, used only for launch-key hashing. */
  envText?: string;
  prompt: string;
  /** Real `-m` model id. */
  model: string;
  /** `--thinking` (true) vs `--no-thinking` (false). */
  thinking: boolean;
  /** Builtin `--agent` preset. */
  agent: KimiAgent;
  /** Optional `--agent-file` path. */
  agentFile?: string;
  /** Optional `--mcp-config-file` path. */
  mcpConfigFile?: string;
  /** `--yolo` / `--plan` posture; `'normal'` adds neither (print auto-approves). */
  permissionMode: KimiPermissionMode;
  /** Resume a specific session by id (`--session <id>`). */
  sessionId?: string | null;
  /** Resume the most recent session for the cwd (`--continue`) when no id. */
  resume?: boolean;
  /** Suppress reasoning regardless of `thinking` (used by aux one-shots). */
  forceNoThinking?: boolean;
}

export interface KimiLaunchSpec {
  args: string[];
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  launchKey: string;
}

export function buildKimiLaunchSpec(params: BuildKimiLaunchSpecParams): KimiLaunchSpec {
  const args = ['--print', '--output-format', 'stream-json'];

  const model = params.model?.trim();
  if (model) {
    args.push('-m', model);
  }

  if (params.forceNoThinking || !params.thinking) {
    args.push('--no-thinking');
  } else {
    args.push('--thinking');
  }

  args.push('--agent', params.agent);

  const agentFile = params.agentFile?.trim();
  if (agentFile) {
    args.push('--agent-file', agentFile);
  }

  const mcpConfigFile = params.mcpConfigFile?.trim();
  if (mcpConfigFile) {
    args.push('--mcp-config-file', mcpConfigFile);
  }

  const sessionId = params.sessionId?.trim();
  if (sessionId) {
    args.push('--session', sessionId);
  } else if (params.resume) {
    args.push('--continue');
  }

  args.push('--add-dir', params.cwd, '--work-dir', params.cwd);

  if (params.permissionMode === 'yolo') {
    args.push('--yolo');
  } else if (params.permissionMode === 'plan') {
    args.push('--plan');
  }

  // `-p <prompt>` is the non-interactive prompt; passing it last keeps the
  // prompt from being mistaken for a flag value.
  args.push('-p', params.prompt);

  return {
    args,
    command: params.command,
    cwd: params.cwd,
    env: params.env,
    launchKey: JSON.stringify({
      agent: params.agent,
      command: params.command,
      cwd: params.cwd,
      envText: params.envText ?? '',
      model: model ?? '',
      permissionMode: params.permissionMode,
      sessionId: sessionId ?? null,
      thinking: params.forceNoThinking ? false : params.thinking,
    }),
  };
}
