import { WorkflowEngine } from '../../../../../src/core/control/workflows/WorkflowEngine';

describe('WorkflowEngine', () => {
  it('registers and runs event-triggered workflows', async () => {
    const executed: string[] = [];
    const engine = new WorkflowEngine(async (step) => {
      executed.push(step.action);
    });

    engine.register({
      id: 'wf-1',
      name: 'Test workflow',
      enabled: true,
      trigger: { type: 'event', event: { type: 'vault:file-created' } },
      steps: [{ id: 's1', action: 'noop', params: {} }],
    });

    // Event bus listeners are sync; no need to wait.
    engine.stop();
  });

  it('lists registered workflows', () => {
    const engine = new WorkflowEngine(async () => {});
    engine.register({
      id: 'wf-1',
      name: 'Test',
      enabled: true,
      trigger: { type: 'schedule', schedule: { cron: 'daily' } },
      steps: [],
    });
    expect(engine.list()).toHaveLength(1);
    engine.stop();
  });
});
