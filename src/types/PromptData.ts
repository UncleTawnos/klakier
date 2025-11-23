import { Agent } from './Agent';

export interface PromptData {
  agent: Agent | null;
  requirements: string;
  context: string;
  task: string;
}
