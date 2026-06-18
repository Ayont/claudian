import { AuditLogService } from '../../../../../src/core/control/audit/AuditLogService';
import { globalEventBus } from '../../../../../src/core/events/EventBus';
import { MetadataStore } from '../../../../../src/core/storage/metadata/MetadataStore';

async function createStore(): Promise<MetadataStore> {
  let content = '{}';
  return new MetadataStore(
    async () => content,
    async (value) => { content = value; },
  );
}

describe('AuditLogService', () => {
  it('logs user actions', async () => {
    const store = await createStore();
    await store.initialize();
    const audit = new AuditLogService(store);
    audit.log('file.edit', 'user', { path: 'note.md' });
    const entries = audit.query({ actor: 'user' });
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('file.edit');
  });

  it('logs agent run events from event bus', async () => {
    const store = await createStore();
    await store.initialize();
    const audit = new AuditLogService(store);
    globalEventBus.emit('agent:run-started', { runId: '1' });
    // Event bus handlers are async-ish but emit is sync; give it a tick.
    await new Promise(resolve => window.setTimeout(resolve, 10));
    const entries = audit.query({ actor: 'agent' });
    expect(entries.length).toBeGreaterThan(0);
  });
});
