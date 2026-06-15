import { ProviderWorkspaceRegistry } from '../../../core/providers/ProviderWorkspaceRegistry';
import type {
  ProviderWorkspaceRegistration,
  ProviderWorkspaceServices,
} from '../../../core/providers/types';
import { AntigravityCliResolver } from '../runtime/AntigravityCliResolver';
import { antigravitySettingsTabRenderer } from '../ui/AntigravitySettingsTab';

export type AntigravityWorkspaceServices = ProviderWorkspaceServices;

export async function createAntigravityWorkspaceServices(): Promise<AntigravityWorkspaceServices> {
  return {
    cliResolver: new AntigravityCliResolver(),
    settingsTabRenderer: antigravitySettingsTabRenderer,
  };
}

export const antigravityWorkspaceRegistration: ProviderWorkspaceRegistration<AntigravityWorkspaceServices> = {
  initialize: async () => createAntigravityWorkspaceServices(),
};

export function maybeGetAntigravityWorkspaceServices(): AntigravityWorkspaceServices | null {
  return ProviderWorkspaceRegistry.getServices('antigravity') as AntigravityWorkspaceServices | null;
}
