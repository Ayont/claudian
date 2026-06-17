import '@/providers';

import { getEnabledProviderForModel, getProviderForModel } from '@/core/providers/modelRouting';
import { ProviderRegistry } from '@/core/providers/ProviderRegistry';
import { DEFAULT_CODEX_PRIMARY_MODEL } from '@/providers/codex/types/models';

describe('ProviderRegistry.getAggregatedModelOptions (unified model dropdown)', () => {
  it('returns only the single provider\'s options when one provider is enabled', () => {
    const settings = { providerConfigs: { codex: { enabled: false } } };

    const aggregated = ProviderRegistry.getAggregatedModelOptions(settings);
    const claudeOnly = ProviderRegistry.getChatUIConfig('claude').getModelOptions(settings);

    // Same set of model values as Claude alone, now sorted alphabetically by label.
    expect(new Set(aggregated.map(o => o.value))).toEqual(new Set(claudeOnly.map(o => o.value)));
    expect(aggregated.map(o => o.value)).toEqual(
      [...claudeOnly.map(o => o.value)].sort((a, b) => a.localeCompare(b)),
    );
    // All options carry exactly one group (the Claude display name).
    const groups = new Set(aggregated.map(o => o.group));
    expect(groups.size).toBe(1);
    expect(groups.has(ProviderRegistry.getProviderDisplayName('claude'))).toBe(true);
  });

  it('aggregates options across all enabled providers, tagging group + icon', () => {
    const settings = { providerConfigs: { codex: { enabled: true } } };

    const aggregated = ProviderRegistry.getAggregatedModelOptions(settings);
    const groups = new Set(aggregated.map(o => o.group));

    expect(groups.has(ProviderRegistry.getProviderDisplayName('claude'))).toBe(true);
    expect(groups.has(ProviderRegistry.getProviderDisplayName('codex'))).toBe(true);

    // Codex's primary model is present and tagged with the Codex group + icon.
    const codexOption = aggregated.find(o => o.value === DEFAULT_CODEX_PRIMARY_MODEL);
    expect(codexOption).toBeDefined();
    expect(codexOption?.group).toBe(ProviderRegistry.getProviderDisplayName('codex'));

    // The tagged icon matches the owning provider's icon (undefined when none).
    const codexIcon = ProviderRegistry.getChatUIConfig('codex').getProviderIcon?.() ?? undefined;
    expect(codexOption?.providerIcon).toEqual(codexIcon);
  });

  it('orders aggregated options by enabled-provider order', () => {
    const settings = { providerConfigs: { codex: { enabled: true } } };

    const aggregated = ProviderRegistry.getAggregatedModelOptions(settings);
    const enabledOrder = ProviderRegistry.getEnabledProviderIds(settings)
      .map(id => ProviderRegistry.getProviderDisplayName(id));

    // Group labels appear in the same relative order as the enabled providers.
    const seenGroups: string[] = [];
    for (const opt of aggregated) {
      if (opt.group && seenGroups[seenGroups.length - 1] !== opt.group) {
        seenGroups.push(opt.group);
      }
    }
    expect(seenGroups).toEqual(enabledOrder.filter(g => seenGroups.includes(g)));
  });
});

describe('resolveProviderForModel for the unified dropdown', () => {
  it('routes each provider\'s model to its owning provider', () => {
    expect(getProviderForModel('sonnet')).toBe('claude');
    expect(getProviderForModel('opus')).toBe('claude');
    expect(getProviderForModel(DEFAULT_CODEX_PRIMARY_MODEL)).toBe('codex');
    expect(getProviderForModel('gpt-4o')).toBe('codex');
  });

  it('resolves a model from another provider when both are enabled', () => {
    const settings = { providerConfigs: { codex: { enabled: true } } };

    // From a Claude conversation, picking the Codex model resolves to codex.
    expect(getEnabledProviderForModel(DEFAULT_CODEX_PRIMARY_MODEL, settings)).toBe('codex');
    // And a Claude model still resolves to claude.
    expect(getEnabledProviderForModel('sonnet', settings)).toBe('claude');
  });

  it('every aggregated option resolves to a provider that owns it', () => {
    const settings = { providerConfigs: { codex: { enabled: true } } };
    const aggregated = ProviderRegistry.getAggregatedModelOptions(settings);

    for (const option of aggregated) {
      const owner = getEnabledProviderForModel(option.value, settings);
      expect(ProviderRegistry.getChatUIConfig(owner).ownsModel(option.value, settings)).toBe(true);
    }
  });
});
