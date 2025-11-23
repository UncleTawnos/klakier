import { useState, useEffect, useMemo } from 'react';
import { Agent, PromptData } from './types';
import { loadAgentsConfig } from './services/ConfigLoader';
import { generateXml } from './services/XmlGenerator';
import { AgentSelector } from './components/AgentSelector';
import { RequirementsInput } from './components/RequirementsInput';
import { ContextInput } from './components/ContextInput';
import { TaskInput } from './components/TaskInput';
import { XmlOutput } from './components/XmlOutput';
import './styles/App.css';

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PromptData>({
    agent: null,
    requirements: '',
    context: '',
    task: ''
  });

  useEffect(() => {
    loadAgentsConfig()
      .then(config => {
        setAgents(config.agents);
        setError(null);
      })
      .catch(() => {
        setError('Failed to load agent configuration');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const xmlOutput = useMemo(() => {
    if (!formData.agent && !formData.requirements && !formData.task) {
      return '';
    }
    return generateXml(formData);
  }, [formData]);

  const handleAgentChange = (agent: Agent | null) => {
    setFormData(prev => ({
      ...prev,
      agent,
      context: agent?.defaultContext || prev.context
    }));
  };

  if (loading) {
    return (
      <div className="app">
        <header>
          <h1>Klakier - the XML Prompt Generator</h1>
        </header>
        <main>
          <div className="loading">Loading configuration...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header>
          <h1>Klakier - the XML Prompt Generator</h1>
        </header>
        <main>
          <div className="error">{error}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Klakier - the XML Prompt Generator</h1>
      </header>
      <main>
        <div className="form-panel">
          <AgentSelector
            agents={agents}
            selectedAgent={formData.agent}
            onAgentChange={handleAgentChange}
          />
          <ContextInput
            value={formData.context}
            onChange={v => setFormData(prev => ({ ...prev, context: v }))}
          />
          <RequirementsInput
            value={formData.requirements}
            onChange={v => setFormData(prev => ({ ...prev, requirements: v }))}
          />
          <TaskInput
            value={formData.task}
            onChange={v => setFormData(prev => ({ ...prev, task: v }))}
          />
        </div>
        <div className="output-panel">
          <XmlOutput xmlContent={xmlOutput} />
        </div>
      </main>
    </div>
  );
}
