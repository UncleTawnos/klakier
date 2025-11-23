import { Agent } from '../types';

interface Props {
  agents: Agent[];
  selectedAgent: Agent | null;
  onAgentChange: (agent: Agent | null) => void;
}

export function AgentSelector({ agents, selectedAgent, onAgentChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const agent = agents.find(a => a.id === e.target.value) || null;
    onAgentChange(agent);
  };

  return (
    <div className="form-group">
      <label htmlFor="agent-select">Agent</label>
      <select
        id="agent-select"
        value={selectedAgent?.id || ''}
        onChange={handleChange}
      >
        <option value="">Select an agent...</option>
        {agents.map(agent => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
      {selectedAgent?.description && (
        <p className="field-description">{selectedAgent.description}</p>
      )}
    </div>
  );
}
