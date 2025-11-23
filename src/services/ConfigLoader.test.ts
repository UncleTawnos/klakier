import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadAgentsConfig } from './ConfigLoader';

describe('loadAgentsConfig', () => {
  const mockAgentsConfig = {
    agents: [
      {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test description',
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches config from correct URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAgentsConfig),
    });
    global.fetch = fetchMock;

    await loadAgentsConfig();

    expect(fetchMock).toHaveBeenCalledWith('/config/agents.json');
  });

  it('returns agents config on successful fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAgentsConfig),
    });

    const result = await loadAgentsConfig();

    expect(result).toEqual(mockAgentsConfig);
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].id).toBe('test-agent');
  });

  it('throws error on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(loadAgentsConfig()).rejects.toThrow('Failed to load config: 404');
  });

  it('throws error on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(loadAgentsConfig()).rejects.toThrow('Network error');
  });

  it('throws error on JSON parse error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON')),
    });

    await expect(loadAgentsConfig()).rejects.toThrow('Invalid JSON');
  });

  it('handles multiple agents in config', async () => {
    const multiAgentConfig = {
      agents: [
        { id: 'agent-1', name: 'Agent 1' },
        { id: 'agent-2', name: 'Agent 2' },
        { id: 'agent-3', name: 'Agent 3' },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(multiAgentConfig),
    });

    const result = await loadAgentsConfig();

    expect(result.agents).toHaveLength(3);
  });

  it('throws the original error on fetch failure', async () => {
    const testError = new Error('Test error');
    global.fetch = vi.fn().mockRejectedValue(testError);

    await expect(loadAgentsConfig()).rejects.toThrow('Test error');
  });
});
