import { AgentsConfig } from '../types';

export async function loadAgentsConfig(): Promise<AgentsConfig> {
  const response = await fetch('/config/agents.json');
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status}`);
  }
  return await response.json();
}
