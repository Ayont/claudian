import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import * as path from 'node:path';

import type { AuxQueryConfig, AuxQueryRunner } from '../../../core/auxiliary/AuxQueryRunner';
import { getRuntimeEnvironmentText } from '../../../core/providers/providerEnvironment';
import type ClaudianPlugin from '../../../main';
import { getEnhancedPath } from '../../../utils/env';
import { getVaultPath } from '../../../utils/path';
import {
  resolveWindowsCmdShimSpawnSpec,
  terminateSpawnedProcess,
} from '../../../utils/windowsCmdShim';
import { ANTIGRAVITY_PROVIDER_ID, getAntigravityProviderSettings } from '../settings';
import { buildAntigravityLaunchSpec } from './AntigravityLaunchSpec';
import { buildAntigravityRuntimeEnv } from './AntigravityRuntimeEnvironment';

/**
 * One-shot `agy --print` runner for auxiliary tasks (title generation,
 * instruction refinement, inline edits).
 *
 * Each call spawns a stateless `agy --print` (no `--conversation` resume, so
 * the auxiliary turn never pollutes a chat conversation), prepends the
 * task-specific system prompt to the user prompt (agy has no system-prompt
 * flag), and resolves the final assistant text from stdout. Mirrors the
 * `AuxQueryRunner` contract used by `OpencodeAuxQueryRunner` / `PiAuxQueryRunner`.
 */
export class AntigravityAuxQueryRunner implements AuxQueryRunner {
  private activeProcess: ChildProcessWithoutNullStreams | null = null;

  constructor(private readonly plugin: ClaudianPlugin) {}

  async query(config: AuxQueryConfig, prompt: string): Promise<string> {
    const settingsBag = this.plugin.settings as unknown as Record<string, unknown>;
    const settings = getAntigravityProviderSettings(settingsBag);
    if (!settings.enabled) {
      throw new Error('Antigravity is disabled.');
    }

    const command = this.plugin.getResolvedProviderCliPath(ANTIGRAVITY_PROVIDER_ID);
    if (!command) {
      throw new Error('Could not find the `agy` binary.');
    }

    if (config.abortController?.signal.aborted) {
      throw new Error('Cancelled');
    }

    const cwd = getVaultPath(this.plugin.app) ?? process.cwd();
    const env = buildAntigravityRuntimeEnv(settingsBag, command);
    const envText = getRuntimeEnvironmentText(settingsBag, ANTIGRAVITY_PROVIDER_ID);
    const fullPrompt = config.systemPrompt.trim()
      ? `${config.systemPrompt.trim()}\n\n${prompt}`
      : prompt;
    const launchSpec = buildAntigravityLaunchSpec({
      command,
      conversationId: null,
      cwd,
      env,
      envText,
      prompt: fullPrompt,
    });

    const resolvedSpawnSpec = resolveWindowsCmdShimSpawnSpec(launchSpec);
    const proc = spawn(resolvedSpawnSpec.command, resolvedSpawnSpec.args, {
      cwd,
      env: {
        ...env,
        PATH: getEnhancedPath(env.PATH, path.isAbsolute(command) ? command : undefined),
      },
      stdio: 'pipe',
      windowsHide: true,
      ...(resolvedSpawnSpec.windowsVerbatimArguments ? { windowsVerbatimArguments: true } : {}),
    });
    this.activeProcess = proc;

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk: Buffer | string) => {
      stdout += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
    });
    proc.stderr.on('data', (chunk: Buffer | string) => {
      stderr += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
    });

    const abortHandler = (): void => {
      if (proc.exitCode === null) {
        terminateSpawnedProcess(proc, 'SIGTERM', spawn, null);
      }
    };
    config.abortController?.signal.addEventListener('abort', abortHandler, { once: true });

    try {
      const code = await new Promise<number | null>((resolve, reject) => {
        proc.on('error', reject);
        proc.on('exit', (exitCode) => resolve(exitCode));
      });

      if (config.abortController?.signal.aborted) {
        throw new Error('Cancelled');
      }

      if (code !== 0 && code !== null) {
        const message = `agy exited with code ${code}`;
        const tail = stderr.trim().slice(-2000);
        throw new Error(tail ? `${message}\n\n${tail}` : message);
      }

      const text = stdout.trim();
      config.onTextChunk?.(text);
      return text;
    } finally {
      config.abortController?.signal.removeEventListener('abort', abortHandler);
      if (this.activeProcess === proc) {
        this.activeProcess = null;
      }
    }
  }

  reset(): void {
    const proc = this.activeProcess;
    this.activeProcess = null;
    if (proc && proc.exitCode === null) {
      terminateSpawnedProcess(proc, 'SIGTERM', spawn, null);
    }
  }
}
