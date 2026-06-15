import {
  DEFAULT_ANTIGRAVITY_PROVIDER_SETTINGS,
  getAntigravityProviderSettings,
  updateAntigravityProviderSettings,
} from '@/providers/antigravity/settings';

describe('Antigravity settings permissionMode', () => {
  it('defaults to YOLO when nothing is persisted', () => {
    expect(DEFAULT_ANTIGRAVITY_PROVIDER_SETTINGS.permissionMode).toBe('yolo');
    expect(getAntigravityProviderSettings({}).permissionMode).toBe('yolo');
  });

  it('reads an explicit permissionMode of "sandbox"', () => {
    const settings = { providerConfigs: { antigravity: { permissionMode: 'sandbox' } } };
    expect(getAntigravityProviderSettings(settings).permissionMode).toBe('sandbox');
  });

  it('migrates legacy sandbox:true to permissionMode "sandbox"', () => {
    const settings = { providerConfigs: { antigravity: { sandbox: true } } };
    expect(getAntigravityProviderSettings(settings).permissionMode).toBe('sandbox');
  });

  it('migrates legacy sandbox:false to permissionMode "yolo"', () => {
    const settings = { providerConfigs: { antigravity: { sandbox: false } } };
    expect(getAntigravityProviderSettings(settings).permissionMode).toBe('yolo');
  });

  it('prefers an explicit permissionMode over a conflicting legacy sandbox flag', () => {
    const settings = {
      providerConfigs: { antigravity: { permissionMode: 'yolo', sandbox: true } },
    };
    expect(getAntigravityProviderSettings(settings).permissionMode).toBe('yolo');
  });

  it('falls back to YOLO for an unknown permissionMode value', () => {
    const settings = { providerConfigs: { antigravity: { permissionMode: 'bogus' } } };
    expect(getAntigravityProviderSettings(settings).permissionMode).toBe('yolo');
  });

  it('persists permissionMode and drops the legacy sandbox boolean on write', () => {
    const settings: Record<string, unknown> = {
      providerConfigs: { antigravity: { sandbox: true } },
    };

    updateAntigravityProviderSettings(settings, { permissionMode: 'sandbox' });

    const stored = (settings.providerConfigs as Record<string, Record<string, unknown>>).antigravity;
    expect(stored.permissionMode).toBe('sandbox');
    expect('sandbox' in stored).toBe(false);
    expect(getAntigravityProviderSettings(settings).permissionMode).toBe('sandbox');
  });

  it('round-trips a switch back to YOLO without leaking a sandbox field', () => {
    const settings: Record<string, unknown> = {
      providerConfigs: { antigravity: { permissionMode: 'sandbox' } },
    };

    updateAntigravityProviderSettings(settings, { permissionMode: 'yolo' });

    const stored = (settings.providerConfigs as Record<string, Record<string, unknown>>).antigravity;
    expect(stored.permissionMode).toBe('yolo');
    expect('sandbox' in stored).toBe(false);
  });

  it('normalizes an invalid permissionMode update to YOLO', () => {
    const settings: Record<string, unknown> = { providerConfigs: { antigravity: {} } };
    updateAntigravityProviderSettings(settings, {
      permissionMode: 'nonsense' as 'yolo',
    });
    expect(getAntigravityProviderSettings(settings).permissionMode).toBe('yolo');
  });
});
