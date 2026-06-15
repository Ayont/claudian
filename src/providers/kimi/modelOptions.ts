import * as fs from 'node:fs';

import { parse as parseToml } from 'smol-toml';

import { getRuntimeEnvironmentVariables } from '../../core/providers/providerEnvironment';
import type { ProviderUIOption } from '../../core/providers/types';
import { getKimiConfigPath } from './history/KimiSessionStore';
import { getKimiProviderSettings } from './settings';
import {
  DEFAULT_KIMI_CONTEXT_WINDOW,
  DEFAULT_KIMI_MODEL_SET,
  DEFAULT_KIMI_MODELS,
  DEFAULT_KIMI_PRIMARY_MODEL,
  formatKimiModelLabel,
} from './types/models';

/** A model discovered from `~/.kimi/config.toml` `[models.*]`. */
export interface KimiConfiguredModel {
  id: string;
  label: string;
  contextWindow: number;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toContextWindow(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_KIMI_CONTEXT_WINDOW;
}

/**
 * Reads `[models.*]` tables and `default_model` from `~/.kimi/config.toml`.
 *
 * Never throws: a missing or malformed config yields an empty list, and the
 * built-in default model carries the dropdown on its own.
 */
export function readKimiConfiguredModels(): {
  models: KimiConfiguredModel[];
  defaultModel: string | null;
} {
  let raw: string;
  try {
    raw = fs.readFileSync(getKimiConfigPath(), 'utf-8');
  } catch {
    return { models: [], defaultModel: null };
  }

  let parsed: Record<string, unknown> | null;
  try {
    parsed = toRecord(parseToml(raw));
  } catch {
    return { models: [], defaultModel: null };
  }
  if (!parsed) {
    return { models: [], defaultModel: null };
  }

  const models: KimiConfiguredModel[] = [];
  const modelsTable = toRecord(parsed.models);
  if (modelsTable) {
    for (const [id, entry] of Object.entries(modelsTable)) {
      const record = toRecord(entry);
      if (!record) {
        continue;
      }
      const displayName = typeof record.display_name === 'string' ? record.display_name.trim() : '';
      models.push({
        id,
        label: displayName ? `Kimi · ${displayName}` : formatKimiModelLabel(id),
        contextWindow: toContextWindow(record.max_context_size),
      });
    }
  }

  const defaultModel = typeof parsed.default_model === 'string' && parsed.default_model.trim()
    ? parsed.default_model.trim()
    : null;

  return { models, defaultModel };
}

/** Context window for a model id, from config when known, else the default. */
export function getKimiModelContextWindow(model: string): number {
  const { models } = readKimiConfiguredModels();
  const match = models.find((entry) => entry.id === model);
  return match?.contextWindow ?? DEFAULT_KIMI_CONTEXT_WINDOW;
}

function getConfiguredEnvModel(settings: Record<string, unknown>): string | null {
  const modelId = getRuntimeEnvironmentVariables(settings, 'kimi').KIMI_MODEL?.trim();
  return modelId ? modelId : null;
}

/** Env-configured model id that is NOT one of the built-in defaults. */
export function getConfiguredEnvCustomModel(settings: Record<string, unknown>): string | null {
  const modelId = getConfiguredEnvModel(settings);
  return modelId && !DEFAULT_KIMI_MODEL_SET.has(modelId) ? modelId : null;
}

/** Parse the newline-separated custom model id list, de-duplicated. */
export function parseConfiguredCustomModelIds(value: string): string[] {
  const modelIds: string[] = [];
  const seen = new Set<string>();
  for (const line of value.split(/\r?\n/)) {
    const modelId = line.trim();
    if (!modelId || seen.has(modelId)) {
      continue;
    }
    seen.add(modelId);
    modelIds.push(modelId);
  }
  return modelIds;
}

function createCustomModelOption(modelId: string, description: string): ProviderUIOption {
  return { value: modelId, label: formatKimiModelLabel(modelId), description };
}

/**
 * Build the model dropdown: built-in defaults + config `[models.*]` + env
 * `KIMI_MODEL` + user `customModels`, de-duplicated, defaults first.
 */
export function getKimiModelOptions(settings: Record<string, unknown>): ProviderUIOption[] {
  const models = [...DEFAULT_KIMI_MODELS];
  const seen = new Set(models.map((model) => model.value));

  for (const configured of readKimiConfiguredModels().models) {
    if (seen.has(configured.id)) {
      continue;
    }
    seen.add(configured.id);
    models.push({ value: configured.id, label: configured.label, description: 'Configured' });
  }

  const envModel = getConfiguredEnvCustomModel(settings);
  if (envModel && !seen.has(envModel)) {
    seen.add(envModel);
    models.unshift(createCustomModelOption(envModel, 'Custom (env)'));
  }

  const kimiSettings = getKimiProviderSettings(settings);
  for (const modelId of parseConfiguredCustomModelIds(kimiSettings.customModels)) {
    if (seen.has(modelId)) {
      continue;
    }
    seen.add(modelId);
    models.push(createCustomModelOption(modelId, 'Custom model'));
  }

  return models;
}

/**
 * Resolve the active model: env override wins, then a still-valid current
 * selection, then config default, then the first option / built-in primary.
 */
export function resolveKimiModelSelection(
  settings: Record<string, unknown>,
  currentModel: string,
): string | null {
  const envModel = getConfiguredEnvModel(settings);
  if (envModel) {
    return envModel;
  }

  const modelOptions = getKimiModelOptions(settings);
  if (currentModel && modelOptions.some((option) => option.value === currentModel)) {
    return currentModel;
  }

  const { defaultModel } = readKimiConfiguredModels();
  if (defaultModel && modelOptions.some((option) => option.value === defaultModel)) {
    return defaultModel;
  }

  return modelOptions[0]?.value ?? DEFAULT_KIMI_PRIMARY_MODEL;
}
