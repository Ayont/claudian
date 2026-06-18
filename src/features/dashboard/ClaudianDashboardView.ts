import { ItemView, Notice, setIcon, type WorkspaceLeaf } from 'obsidian';

import type ClaudianPlugin from '../../main';

export const VIEW_TYPE_CLAUDIAN_DASHBOARD = 'claudian-dashboard';

interface DashboardCard {
  id: string;
  title: string;
  icon: string;
  value: string;
  subtitle: string;
  status: 'ok' | 'info' | 'warning' | 'accent';
  action: string;
  onClick: () => void | Promise<void>;
}

export class ClaudianDashboardView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private readonly plugin: ClaudianPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_CLAUDIAN_DASHBOARD;
  }

  getDisplayText(): string {
    return 'Claudian OS Dashboard';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('claudian-dashboard');

    this.renderHeader(container);
    await this.renderCards(container);
    this.renderActions(container);
  }

  private renderHeader(parent: HTMLElement): void {
    const header = parent.createDiv({ cls: 'claudian-dashboard-header' });
    const titleGroup = header.createDiv({ cls: 'claudian-dashboard-title-group' });

    const icon = titleGroup.createSpan({ cls: 'claudian-dashboard-logo' });
    setIcon(icon, 'bot');

    const textGroup = titleGroup.createDiv({ cls: 'claudian-dashboard-text-group' });
    textGroup.createEl('h2', { text: 'Claudian OS' });
    textGroup.createEl('p', { text: 'Agent operating system for your vault' });

    const status = header.createDiv({ cls: 'claudian-dashboard-status' });
    const statusDot = status.createSpan({ cls: 'claudian-dashboard-status-dot' });
    statusDot.addClass('claudian-dashboard-status-dot--active');
    status.createSpan({ text: 'Active' });
  }

  private async renderCards(parent: HTMLElement): Promise<void> {
    const grid = parent.createDiv({ cls: 'claudian-dashboard-grid' });

    const projects = await this.plugin.projectService.listProjects();
    const memories = await this.plugin.agenticMemoryService.recall({ limit: 1 });
    const usage = this.plugin.tokenBudgetTracker.getState();
    const ragSize = this.plugin.vectorStore.size();
    const workflows = this.plugin.workflowEngine.list();
    const agents = this.plugin.multiAgentService.listAgents();

    const cards: DashboardCard[] = [
      {
        id: 'projects',
        title: 'Projects',
        icon: 'folder-kanban',
        value: String(projects.length),
        subtitle: projects[0] ? `Latest: ${projects[0].name}` : 'No projects yet',
        status: projects.length > 0 ? 'ok' : 'info',
        action: 'Create',
        onClick: () => this.plugin.createClaudianProject(),
      },
      {
        id: 'memory',
        title: 'Memory',
        icon: 'brain-circuit',
        value: `${memories.length}+`,
        subtitle: memories[0] ? `Latest: ${memories[0].topic}` : 'No memories yet',
        status: memories.length > 0 ? 'ok' : 'info',
        action: 'Recall',
        onClick: () => this.openMemoryBrowser(),
      },
      {
        id: 'usage',
        title: 'Token Usage',
        icon: 'gauge',
        value: usage.dailyTotal.toLocaleString(),
        subtitle: `Session: ${usage.sessionTotal.toLocaleString()} tokens`,
        status: usage.dailyTotal > 100_000 ? 'warning' : 'ok',
        action: 'Reset',
        onClick: () => {
          this.plugin.tokenBudgetTracker.resetSession();
          this.plugin.tokenBudgetTracker.resetDaily();
          new Notice('Token budget reset.');
          void this.onOpen();
        },
      },
      {
        id: 'rag',
        title: 'RAG Index',
        icon: 'search',
        value: String(ragSize),
        subtitle: ragSize > 0 ? 'Vault chunks indexed' : 'Not indexed yet',
        status: ragSize > 0 ? 'ok' : 'warning',
        action: 'Index',
        onClick: () => this.plugin.indexVaultRAG(),
      },
      {
        id: 'workflows',
        title: 'Workflows',
        icon: 'workflow',
        value: String(workflows.length),
        subtitle: workflows.length > 0 ? 'Scheduled automations' : 'No workflows yet',
        status: workflows.length > 0 ? 'ok' : 'info',
        action: 'View',
        onClick: () => this.openWorkflowBrowser(),
      },
      {
        id: 'agents',
        title: 'Agents',
        icon: 'users',
        value: String(agents.length),
        subtitle: 'Specialist agents available',
        status: 'accent',
        action: 'Run',
        onClick: () => this.plugin.runMultiAgentTask(),
      },
    ];

    for (const card of cards) {
      this.createCard(grid, card);
    }
  }

  private renderActions(parent: HTMLElement): void {
    const actions = parent.createDiv({ cls: 'claudian-dashboard-actions' });

    const indexBtn = actions.createEl('button', { cls: 'claudian-dashboard-action-btn' });
    setIcon(indexBtn.createSpan(), 'search');
    indexBtn.createSpan({ text: 'Index Vault RAG' });
    indexBtn.addEventListener('click', () => {
      void this.plugin.indexVaultRAG();
    });

    const multiBtn = actions.createEl('button', { cls: 'claudian-dashboard-action-btn claudian-dashboard-action-btn--primary' });
    setIcon(multiBtn.createSpan(), 'users');
    multiBtn.createSpan({ text: 'Run Multi-Agent' });
    multiBtn.addEventListener('click', () => {
      void this.plugin.runMultiAgentTask();
    });

    const projectBtn = actions.createEl('button', { cls: 'claudian-dashboard-action-btn' });
    setIcon(projectBtn.createSpan(), 'folder-kanban');
    projectBtn.createSpan({ text: 'New Project' });
    projectBtn.addEventListener('click', () => {
      void this.plugin.createClaudianProject();
    });
  }

  private createCard(parent: HTMLElement, card: DashboardCard): void {
    const el = parent.createDiv({ cls: 'claudian-dashboard-card' });
    el.addClass(`claudian-dashboard-card--${card.status}`);
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    const header = el.createDiv({ cls: 'claudian-dashboard-card-header' });
    const icon = header.createSpan({ cls: 'claudian-dashboard-card-icon' });
    setIcon(icon, card.icon);
    header.createEl('span', { cls: 'claudian-dashboard-card-action', text: card.action });

    el.createEl('div', { cls: 'claudian-dashboard-card-value', text: card.value });
    el.createEl('h3', { cls: 'claudian-dashboard-card-title', text: card.title });
    el.createEl('p', { cls: 'claudian-dashboard-card-subtitle', text: card.subtitle });

    el.addEventListener('click', () => {
      void (async (): Promise<void> => {
        try {
          await card.onClick();
        } catch (error) {
          new Notice(`Dashboard action failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      })();
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  }

  private openMemoryBrowser(): void {
    void this.plugin.agenticMemoryService.recall({ limit: 20 }).then((facts) => {
      const lines = facts.map(f => `- **${f.topic}** (${(f.confidence * 100).toFixed(0)}% confidence)\n  ${f.content.slice(0, 200)}`);
      const content = `# Memory Browser\n\n${lines.join('\n\n') || '_No memories yet._'}`;
      const path = `.claudian/memory-browser-${Date.now()}.md`;
      void this.plugin.app.vault.create(path, content);
      new Notice(`Memory browser written to ${path}`);
    });
  }

  private openWorkflowBrowser(): void {
    const workflows = this.plugin.workflowEngine.list();
    const lines = workflows.map(w => `- **${w.name}** (${w.enabled ? 'enabled' : 'disabled'})\n  Trigger: ${w.trigger.type}`);
    const content = `# Workflow Browser\n\n${lines.join('\n\n') || '_No workflows yet._'}`;
    const path = `.claudian/workflow-browser-${Date.now()}.md`;
    void this.plugin.app.vault.create(path, content);
    new Notice(`Workflow browser written to ${path}`);
  }
}
