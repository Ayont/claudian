import type {
  ProviderChatUIConfig,
  ProviderModeSelectorConfig,
  ProviderPermissionModeToggleConfig,
  ProviderReasoningOption,
  ProviderUIOption,
} from '../../../core/providers/types';
import { KIMI_PROVIDER_ICON } from '../../../shared/icons';
import { getKimiModelContextWindow, getKimiModelOptions } from '../modelOptions';
import { applyKimiModelDefaults, getKimiProviderSettings, updateKimiProviderSettings } from '../settings';
import {
  DEFAULT_KIMI_CONTEXT_WINDOW,
  DEFAULT_KIMI_MODEL_SET,
  DEFAULT_KIMI_PRIMARY_MODEL,
} from '../types/models';

/** Thinking on/off, modeled as a two-option `'effort'` reasoning control. */
const KIMI_THINKING_VALUE = 'thinking';
const KIMI_NO_THINKING_VALUE = 'no-thinking';

const KIMI_REASONING_OPTIONS: ProviderReasoningOption[] = [
  { value: KIMI_THINKING_VALUE, label: 'Thinking' },
  { value: KIMI_NO_THINKING_VALUE, label: 'No thinking' },
];

const KIMI_PERMISSION_MODE_TOGGLE: ProviderPermissionModeToggleConfig = {
  inactiveValue: 'normal',
  inactiveLabel: 'Safe',
  activeValue: 'yolo',
  activeLabel: 'YOLO',
  planValue: 'plan',
  planLabel: 'Plan',
};

const KIMI_AGENT_OPTIONS: ProviderUIOption[] = [
  { value: 'default', label: 'Default' },
  { value: 'okabe', label: 'Okabe' },
];

function asSettingsBag(settings: unknown): Record<string, unknown> | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return null;
  }
  return settings as Record<string, unknown>;
}

export const kimiChatUIConfig: ProviderChatUIConfig = {
  getModelOptions(settings: Record<string, unknown>): ProviderUIOption[] {
    return getKimiModelOptions(settings);
  },

  ownsModel(model: string, settings: Record<string, unknown>): boolean {
    if (getKimiModelOptions(settings).some((option) => option.value === model)) {
      return true;
    }
    return DEFAULT_KIMI_MODEL_SET.has(model) || model.startsWith('kimi');
  },

  isAdaptiveReasoningModel(): boolean {
    // Thinking is a binary toggle exposed as a two-option effort control.
    return true;
  },

  getReasoningOptions(): ProviderReasoningOption[] {
    return [...KIMI_REASONING_OPTIONS];
  },

  getDefaultReasoningValue(_model: string, settings: Record<string, unknown>): string {
    return getKimiProviderSettings(settings).thinkingDefault
      ? KIMI_THINKING_VALUE
      : KIMI_NO_THINKING_VALUE;
  },

  getContextWindowSize(
    model: string,
    customLimits?: Record<string, number>,
    _settings?: Record<string, unknown>,
  ): number {
    return customLimits?.[model] ?? getKimiModelContextWindow(model) ?? DEFAULT_KIMI_CONTEXT_WINDOW;
  },

  isDefaultModel(model: string): boolean {
    return DEFAULT_KIMI_MODEL_SET.has(model);
  },

  applyModelDefaults(model: string, settings: unknown): void {
    const bag = asSettingsBag(settings);
    if (bag) {
      applyKimiModelDefaults(model, bag);
    }
  },

  applyReasoningSelection(_model: string, value: string, settings: unknown): void {
    const bag = asSettingsBag(settings);
    if (!bag) {
      return;
    }
    updateKimiProviderSettings(bag, { thinkingDefault: value !== KIMI_NO_THINKING_VALUE });
  },

  normalizeModelVariant(model: string, settings: Record<string, unknown>): string {
    if (getKimiModelOptions(settings).some((option) => option.value === model)) {
      return model;
    }
    return DEFAULT_KIMI_PRIMARY_MODEL;
  },

  getCustomModelIds(envVars: Record<string, string>): Set<string> {
    const ids = new Set<string>();
    const envModel = envVars.KIMI_MODEL?.trim();
    if (envModel && !DEFAULT_KIMI_MODEL_SET.has(envModel)) {
      ids.add(envModel);
    }
    return ids;
  },

  getPermissionModeToggle(): ProviderPermissionModeToggleConfig {
    return KIMI_PERMISSION_MODE_TOGGLE;
  },

  resolvePermissionMode(settings: Record<string, unknown>): string | null {
    return getKimiProviderSettings(settings).permissionMode;
  },

  applyPermissionMode(value: string, settings: unknown): void {
    const bag = asSettingsBag(settings);
    if (!bag) {
      return;
    }
    const mode = value === 'yolo' || value === 'plan' ? value : 'normal';
    bag.permissionMode = mode;
    updateKimiProviderSettings(bag, { permissionMode: mode });
  },

  getModeSelector(settings: Record<string, unknown>): ProviderModeSelectorConfig {
    return {
      label: 'Agent',
      options: [...KIMI_AGENT_OPTIONS],
      value: getKimiProviderSettings(settings).agent,
    };
  },

  applyModeSelection(value: string, settings: unknown): void {
    const bag = asSettingsBag(settings);
    if (!bag) {
      return;
    }
    updateKimiProviderSettings(bag, { agent: value === 'okabe' ? 'okabe' : 'default' });
  },

  getProviderIcon() {
    return KIMI_PROVIDER_ICON;
  },
};
