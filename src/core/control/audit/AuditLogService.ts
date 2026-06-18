import { globalEventBus } from '../../events/EventBus';
import type { MetadataStore } from '../../storage/metadata/MetadataStore';

export interface AuditEntry {
  id: string;
  action: string;
  actor: 'user' | 'agent';
  details: Record<string, unknown>;
  timestamp: number;
  [key: string]: unknown;
}

export class AuditLogService {
  constructor(private readonly store: MetadataStore) {
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    globalEventBus.on('agent:run-started', (event) => {
      this.log('agent.run.started', 'agent', event.payload as Record<string, unknown>);
    });
    globalEventBus.on('agent:run-completed', (event) => {
      this.log('agent.run.completed', 'agent', event.payload as Record<string, unknown>);
    });
    globalEventBus.on('agent:run-error', (event) => {
      this.log('agent.run.error', 'agent', event.payload as Record<string, unknown>);
    });
  }

  log(action: string, actor: 'user' | 'agent', details: Record<string, unknown> = {}): void {
    const entry: AuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      actor,
      details,
      timestamp: Date.now(),
    };
    this.store.set('audit', entry);
  }

  query(options: { actor?: 'user' | 'agent'; limit?: number; since?: number } = {}): AuditEntry[] {
    return this.store.query<AuditEntry>(
      'audit',
      (entry) => {
        if (options.actor && entry.actor !== options.actor) return false;
        if (options.since && entry.timestamp < options.since) return false;
        return true;
      },
      { orderBy: 'timestamp', order: 'desc', limit: options.limit },
    );
  }
}
