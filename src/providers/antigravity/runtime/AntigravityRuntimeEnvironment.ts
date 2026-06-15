import { getRuntimeEnvironmentText } from '../../../core/providers/providerEnvironment';
import { getEnhancedPath, parseEnvironmentVariables } from '../../../utils/env';
import { ANTIGRAVITY_PROVIDER_ID } from '../settings';

/**
 * Builds the spawn environment for the `agy` CLI.
 *
 * Mirrors `buildOpencodeRuntimeEnv`: layer the process env, then the
 * user-configured provider/shared environment variables, then an enhanced
 * PATH so the CLI and its child tools can be located.
 */
export function buildAntigravityRuntimeEnv(
  settings: Record<string, unknown>,
  cliPath: string,
): NodeJS.ProcessEnv {
  const envText = getRuntimeEnvironmentText(settings, ANTIGRAVITY_PROVIDER_ID);
  const envVars = parseEnvironmentVariables(envText);
  return {
    ...process.env,
    ...envVars,
    PATH: getEnhancedPath(envVars.PATH, cliPath || undefined),
  };
}
