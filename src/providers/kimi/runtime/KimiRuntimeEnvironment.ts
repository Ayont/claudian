import { getRuntimeEnvironmentText } from '../../../core/providers/providerEnvironment';
import { getEnhancedPath, parseEnvironmentVariables } from '../../../utils/env';
import { KIMI_PROVIDER_ID } from '../settings';

/**
 * Builds the spawn environment for the `kimi-cli` CLI.
 *
 * Mirrors `buildAntigravityRuntimeEnv`: layer the process env, then the
 * user-configured provider/shared environment variables (`KIMI_*` / `MOONSHOT_*`),
 * then an enhanced PATH so the CLI and its child tools can be located.
 */
export function buildKimiRuntimeEnv(
  settings: Record<string, unknown>,
  cliPath: string,
): NodeJS.ProcessEnv {
  const envText = getRuntimeEnvironmentText(settings, KIMI_PROVIDER_ID);
  const envVars = parseEnvironmentVariables(envText);
  return {
    ...process.env,
    ...envVars,
    PATH: getEnhancedPath(envVars.PATH, cliPath || undefined),
  };
}
