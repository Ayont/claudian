import { buildAntigravityLaunchSpec } from '@/providers/antigravity/runtime/AntigravityLaunchSpec';

const BASE = {
  command: '/usr/local/bin/agy',
  cwd: '/vault',
  env: {} as NodeJS.ProcessEnv,
  prompt: 'hi',
};

describe('buildAntigravityLaunchSpec', () => {
  it('builds the verified base invocation (vault-only, no extras)', () => {
    const spec = buildAntigravityLaunchSpec(BASE);
    expect(spec.args).toEqual([
      '--print',
      '--add-dir',
      '/vault',
      '--dangerously-skip-permissions',
      '--',
      'hi',
    ]);
  });

  it('defaults to YOLO (--dangerously-skip-permissions, no --sandbox) when no posture is given', () => {
    const spec = buildAntigravityLaunchSpec(BASE);
    expect(spec.args).toContain('--dangerously-skip-permissions');
    expect(spec.args).not.toContain('--sandbox');
  });

  it('permissionMode "yolo" passes --dangerously-skip-permissions and omits --sandbox', () => {
    const spec = buildAntigravityLaunchSpec({ ...BASE, permissionMode: 'yolo' });
    expect(spec.args).toContain('--dangerously-skip-permissions');
    expect(spec.args).not.toContain('--sandbox');
    // The prompt still comes last, after the `--` terminator.
    expect(spec.args[spec.args.length - 1]).toBe('hi');
  });

  it('permissionMode "sandbox" passes --sandbox and NOT --dangerously-skip-permissions', () => {
    const spec = buildAntigravityLaunchSpec({ ...BASE, permissionMode: 'sandbox' });
    expect(spec.args).toContain('--sandbox');
    expect(spec.args).not.toContain('--dangerously-skip-permissions');
    // The prompt still comes last, after the `--` terminator.
    expect(spec.args[spec.args.length - 1]).toBe('hi');
  });

  it('re-launches when the permission posture changes (distinct launch keys)', () => {
    const yolo = buildAntigravityLaunchSpec({ ...BASE, permissionMode: 'yolo' });
    const sandbox = buildAntigravityLaunchSpec({ ...BASE, permissionMode: 'sandbox' });
    expect(yolo.launchKey).not.toBe(sandbox.launchKey);
  });

  it('adds --print-timeout with the configured value, and omits it when empty', () => {
    const withTimeout = buildAntigravityLaunchSpec({ ...BASE, printTimeout: '10m' });
    const idx = withTimeout.args.indexOf('--print-timeout');
    expect(idx).toBeGreaterThan(-1);
    expect(withTimeout.args[idx + 1]).toBe('10m');

    const noTimeout = buildAntigravityLaunchSpec({ ...BASE, printTimeout: '   ' });
    expect(noTimeout.args).not.toContain('--print-timeout');
  });

  it('vault-only passes only the vault --add-dir', () => {
    const spec = buildAntigravityLaunchSpec({
      ...BASE,
      workspaceScope: 'vault-only',
      homeDir: '/Users/me',
    });
    const addDirs = spec.args.filter((_, i) => spec.args[i - 1] === '--add-dir');
    expect(addDirs).toEqual(['/vault']);
  });

  it('allow-home adds the home directory as a second --add-dir', () => {
    const spec = buildAntigravityLaunchSpec({
      ...BASE,
      workspaceScope: 'allow-home',
      homeDir: '/Users/me',
    });
    const addDirs = spec.args.filter((_, i) => spec.args[i - 1] === '--add-dir');
    expect(addDirs).toEqual(['/vault', '/Users/me']);
  });

  it('allow-home does not duplicate --add-dir when home equals the vault', () => {
    const spec = buildAntigravityLaunchSpec({
      ...BASE,
      cwd: '/Users/me',
      workspaceScope: 'allow-home',
      homeDir: '/Users/me',
    });
    const addDirs = spec.args.filter((_, i) => spec.args[i - 1] === '--add-dir');
    expect(addDirs).toEqual(['/Users/me']);
  });

  it('encodes the new controls in the launch key so a settings change re-launches', () => {
    const a = buildAntigravityLaunchSpec(BASE);
    const b = buildAntigravityLaunchSpec({ ...BASE, permissionMode: 'sandbox' });
    const c = buildAntigravityLaunchSpec({ ...BASE, printTimeout: '5m' });
    const d = buildAntigravityLaunchSpec({
      ...BASE,
      workspaceScope: 'allow-home',
      homeDir: '/Users/me',
    });
    expect(a.launchKey).not.toBe(b.launchKey);
    expect(a.launchKey).not.toBe(c.launchKey);
    expect(a.launchKey).not.toBe(d.launchKey);
  });

  it('still resumes a conversation and keeps the prompt last', () => {
    const spec = buildAntigravityLaunchSpec({
      ...BASE,
      conversationId: 'conv-1',
      permissionMode: 'sandbox',
      printTimeout: '2m',
    });
    expect(spec.args).toContain('--conversation');
    expect(spec.args[spec.args.indexOf('--conversation') + 1]).toBe('conv-1');
    expect(spec.args[spec.args.length - 2]).toBe('--');
    expect(spec.args[spec.args.length - 1]).toBe('hi');
  });
});
