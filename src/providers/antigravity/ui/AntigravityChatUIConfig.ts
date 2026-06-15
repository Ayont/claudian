import type {
  ProviderChatUIConfig,
  ProviderPermissionModeToggleConfig,
  ProviderReasoningOption,
  ProviderUIOption,
} from '../../../core/providers/types';
import { ANTIGRAVITY_PROVIDER_ICON } from '../../../shared/icons';
import { getAntigravityProviderSettings, updateAntigravityProviderSettings } from '../settings';

/**
 * Single-model, no-reasoning chat UI config for Antigravity.
 *
 * `agy` has no model-selection or reasoning-effort flags, so the selector
 * shows one synthetic default entry and the reasoning control is empty
 * (capabilities.reasoningControl === 'none').
 */
export const ANTIGRAVITY_DEFAULT_MODEL_ID = 'antigravity-default';

// agy v1.0.3 has no model-selection flag; the active tier (Gemini 3.5 Flash and
// its reasoning effort) is chosen in Antigravity's interactive model selector
// and cannot be switched per-invocation from the CLI. One honest entry only.
const ANTIGRAVITY_MODEL_OPTIONS: ProviderUIOption[] = [
  { value: ANTIGRAVITY_DEFAULT_MODEL_ID, label: 'Antigravity · Gemini 3.5 Flash' },
];

const DEFAULT_CONTEXT_WINDOW = 1_000_000;

// agy has no plan mode, so the toolbar control is a two-state YOLO <-> Sandbox
// toggle (no `planValue`). YOLO is the active/default posture because `--print`
// is non-interactive and cannot answer permission prompts; Sandbox is opt-in.
const ANTIGRAVITY_PERMISSION_MODE_TOGGLE: ProviderPermissionModeToggleConfig = {
  inactiveValue: 'sandbox',
  inactiveLabel: 'Sandbox',
  activeValue: 'yolo',
  activeLabel: 'YOLO',
};

function asSettingsBag(settings: unknown): Record<string, unknown> | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return null;
  }
  return settings as Record<string, unknown>;
}

export const antigravityChatUIConfig: ProviderChatUIConfig = {
  getModelOptions(_settings: Record<string, unknown>): ProviderUIOption[] {
    return [...ANTIGRAVITY_MODEL_OPTIONS];
  },

  getProviderIcon() {
    return ANTIGRAVITY_PROVIDER_ICON;
  },

  ownsModel(model: string): boolean {
    return model === ANTIGRAVITY_DEFAULT_MODEL_ID;
  },

  isAdaptiveReasoningModel(): boolean {
    return false;
  },

  getReasoningOptions(): ProviderReasoningOption[] {
    return [];
  },

  getDefaultReasoningValue(): string {
    return '';
  },

  getContextWindowSize(): number {
    return DEFAULT_CONTEXT_WINDOW;
  },

  isDefaultModel(model: string): boolean {
    return model === ANTIGRAVITY_DEFAULT_MODEL_ID;
  },

  applyModelDefaults(_model: string, _settings: unknown): void {},

  normalizeModelVariant(_model: string): string {
    return ANTIGRAVITY_DEFAULT_MODEL_ID;
  },

  getCustomModelIds(): Set<string> {
    return new Set<string>();
  },

  getPermissionModeToggle(): ProviderPermissionModeToggleConfig {
    return ANTIGRAVITY_PERMISSION_MODE_TOGGLE;
  },

  resolvePermissionMode(settings: Record<string, unknown>): string | null {
    return getAntigravityProviderSettings(settings).permissionMode;
  },

  applyPermissionMode(value: string, settings: unknown): void {
    const bag = asSettingsBag(settings);
    if (!bag) {
      return;
    }
    const mode = value === 'sandbox' ? 'sandbox' : 'yolo';
    bag.permissionMode = mode;
    updateAntigravityProviderSettings(bag, { permissionMode: mode });
  },
};
