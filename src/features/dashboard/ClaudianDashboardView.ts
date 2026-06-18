import { ItemView, type WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE_CLAUDIAN_DASHBOARD = 'claudian-dashboard';

export class ClaudianDashboardView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_CLAUDIAN_DASHBOARD;
  }

  getDisplayText(): string {
    return 'Claudian OS Dashboard';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('claudian-dashboard');

    container.createEl('h2', { text: 'Claudian OS Dashboard' });

    const grid = container.createDiv({ cls: 'claudian-dashboard-grid' });

    this.createCard(grid, 'Projects', 'Manage project contexts, memory and skills.');
    this.createCard(grid, 'Memory', 'Review and edit agentic memory facts.');
    this.createCard(grid, 'Workflows', 'Scheduled and event-driven automations.');
    this.createCard(grid, 'Audit Log', 'Recent agent and user actions.');
    this.createCard(grid, 'Usage', 'Token and cost tracking across providers.');
    this.createCard(grid, 'RAG Index', 'Vault knowledge base index status.');
  }

  private createCard(parent: HTMLElement, title: string, description: string): void {
    const card = parent.createDiv({ cls: 'claudian-dashboard-card' });
    card.createEl('h3', { text: title });
    card.createEl('p', { text: description });
  }
}
