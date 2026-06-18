export interface SpecialistAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  model?: string;
}

export interface MultiAgentTask {
  id: string;
  prompt: string;
  agents: string[];
}

export interface AgentResult {
  agentId: string;
  output: string;
}

export class MultiAgentService {
  private agents = new Map<string, SpecialistAgent>();

  registerAgent(agent: SpecialistAgent): void {
    this.agents.set(agent.id, agent);
  }

  listAgents(): SpecialistAgent[] {
    return Array.from(this.agents.values());
  }

  async runTask(task: MultiAgentTask, executor: (agent: SpecialistAgent, prompt: string) => Promise<string>): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (const agentId of task.agents) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;
      const output = await executor(agent, task.prompt);
      results.push({ agentId, output });
    }
    return results;
  }
}
