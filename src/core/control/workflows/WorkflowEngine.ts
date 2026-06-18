import { type ClaudianEventType,globalEventBus } from '../../events/EventBus';

export interface WorkflowTrigger {
  type: 'schedule' | 'event';
  schedule?: { cron: string }; // simplified: just hourly/daily for now
  event?: { type: ClaudianEventType };
}

export interface WorkflowStep {
  id: string;
  action: string;
  params: Record<string, unknown>;
}

export interface ScheduledWorkflow {
  id: string;
  name: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  lastRun?: number;
  nextRun?: number;
}

export class WorkflowEngine {
  private workflows = new Map<string, ScheduledWorkflow>();
  private checkInterval: number | null = null;

  constructor(private readonly executor: (step: WorkflowStep) => Promise<void>) {}

  start(): void {
    if (this.checkInterval) return;
    this.checkInterval = window.setInterval(() => {
      void this.checkScheduledWorkflows();
    }, 60_000);
  }

  stop(): void {
    if (this.checkInterval) {
      window.clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  register(workflow: ScheduledWorkflow): void {
    this.workflows.set(workflow.id, workflow);
    if (workflow.trigger.type === 'event' && workflow.trigger.event) {
      globalEventBus.on(workflow.trigger.event.type, () => {
        if (workflow.enabled) {
          void this.runWorkflow(workflow);
        }
      });
    }
  }

  unregister(id: string): void {
    this.workflows.delete(id);
  }

  list(): ScheduledWorkflow[] {
    return Array.from(this.workflows.values());
  }

  private async checkScheduledWorkflows(): Promise<void> {
    const now = Date.now();
    for (const workflow of this.workflows.values()) {
      if (!workflow.enabled) continue;
      if (workflow.trigger.type !== 'schedule') continue;
      if (workflow.nextRun && workflow.nextRun > now) continue;
      await this.runWorkflow(workflow);
    }
  }

  private async runWorkflow(workflow: ScheduledWorkflow): Promise<void> {
    workflow.lastRun = Date.now();
    workflow.nextRun = this.computeNextRun(workflow.trigger);
    globalEventBus.emit('workflow:trigger', { workflowId: workflow.id });

    for (const step of workflow.steps) {
      try {
        await this.executor(step);
      } catch (error) {
        globalEventBus.emit('agent:run-error', { workflowId: workflow.id, stepId: step.id, error });
      }
    }
  }

  private computeNextRun(trigger: WorkflowTrigger): number {
    if (trigger.schedule?.cron === 'hourly') return Date.now() + 60 * 60 * 1000;
    if (trigger.schedule?.cron === 'daily') return Date.now() + 24 * 60 * 60 * 1000;
    return Date.now() + 24 * 60 * 60 * 1000;
  }
}
