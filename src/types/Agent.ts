export interface Agent {
  id: string;
  name: string;
  description?: string;
  defaultContext?: string;
}

export interface AgentsConfig {
  agents: Agent[];
}
