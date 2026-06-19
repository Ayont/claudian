import {
  type MissionEvent,
  type MissionState,
  MissionStateStorage,
} from '../../../../../src/core/intelligence/multiAgent/MissionStateStorage';
import type { VaultFileAdapter } from '../../../../../src/core/storage/VaultFileAdapter';

function createMemoryAdapter(): VaultFileAdapter {
  const files = new Map<string, string>();
  const folders = new Set<string>();

  const ensureFolder = async (path: string): Promise<void> => {
    const parts = path.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      folders.add(current);
    }
  };

  return {
    exists: async (path: string) => files.has(path) || folders.has(path),
    read: async (path: string) => {
      const content = files.get(path);
      if (content === undefined) throw new Error(`File not found: ${path}`);
      return content;
    },
    write: async (path: string, content: string) => {
      const folder = path.substring(0, path.lastIndexOf('/'));
      if (folder) await ensureFolder(folder);
      files.set(path, content);
    },
    append: async (path: string, content: string) => {
      const folder = path.substring(0, path.lastIndexOf('/'));
      if (folder) await ensureFolder(folder);
      files.set(path, (files.get(path) ?? '') + content);
    },
    delete: async (path: string) => {
      files.delete(path);
    },
    deleteFolder: async () => {},
    listFiles: async (folder: string) =>
      Array.from(files.keys()).filter((p) => p.startsWith(`${folder}/`)),
    listFolders: async () => [],
    listFilesRecursive: async (folder: string) =>
      Array.from(files.keys()).filter((p) => p.startsWith(`${folder}/`)),
    ensureFolder,
    rename: async () => {},
    stat: async () => null,
  } as unknown as VaultFileAdapter;
}

const sampleMission = (): MissionState => ({
  taskId: 'm-1',
  prompt: 'build a feature',
  agentIds: ['a', 'b'],
  status: 'running',
  overall: 50,
  agents: [
    { agentId: 'a', status: 'done', progress: 100, output: 'done-a' },
    { agentId: 'b', status: 'running', progress: 50 },
  ],
  createdAt: 1,
  updatedAt: 2,
});

describe('MissionStateStorage', () => {
  it('saves and loads a mission', async () => {
    const adapter = createMemoryAdapter();
    const storage = new MissionStateStorage(adapter);
    const mission = sampleMission();

    await storage.saveMission(mission);
    const loaded = await storage.loadMission('m-1');

    expect(loaded).toEqual(mission);
  });

  it('returns null for missing mission', async () => {
    const adapter = createMemoryAdapter();
    const storage = new MissionStateStorage(adapter);

    const loaded = await storage.loadMission('missing');
    expect(loaded).toBeNull();
  });

  it('lists missions sorted by updatedAt desc', async () => {
    const adapter = createMemoryAdapter();
    const storage = new MissionStateStorage(adapter);

    await storage.saveMission({ ...sampleMission(), taskId: 'm-old', updatedAt: 1 });
    await storage.saveMission({ ...sampleMission(), taskId: 'm-new', updatedAt: 3 });

    const list = await storage.listMissions();
    expect(list.map((m) => m.taskId)).toEqual(['m-new', 'm-old']);
  });

  it('deletes a mission', async () => {
    const adapter = createMemoryAdapter();
    const storage = new MissionStateStorage(adapter);

    await storage.saveMission(sampleMission());
    await storage.deleteMission('m-1');

    expect(await storage.loadMission('m-1')).toBeNull();
  });

  it('appends and loads events as JSONL', async () => {
    const adapter = createMemoryAdapter();
    const storage = new MissionStateStorage(adapter);

    const event1: MissionEvent = { ts: 1, type: 'started', message: 'Mission started' };
    const event2: MissionEvent = { ts: 2, type: 'agent-done', agentId: 'a', message: 'Agent a done' };

    await storage.appendEvent('m-1', event1);
    await storage.appendEvent('m-1', event2);

    const events = await storage.loadEvents('m-1');
    expect(events).toEqual([event1, event2]);
  });

  it('returns empty events for missing log', async () => {
    const adapter = createMemoryAdapter();
    const storage = new MissionStateStorage(adapter);

    const events = await storage.loadEvents('missing');
    expect(events).toEqual([]);
  });

  it('ignores corrupt event lines', async () => {
    const adapter = createMemoryAdapter();
    const storage = new MissionStateStorage(adapter);

    const event = { ts: 1, type: 'started', message: 'ok' } as MissionEvent;
    await storage.appendEvent('m-1', event);
    await adapter.append(`${storage['basePath']}/m-1.events.jsonl`, 'not-json\n');

    const events = await storage.loadEvents('m-1');
    expect(events).toEqual([event]);
  });
});
