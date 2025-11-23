import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const mockAgentsConfig = {
  agents: [
    {
      id: 'general-purpose',
      name: 'General Purpose',
      description: 'For complex tasks',
      defaultContext: '',
    },
    {
      id: 'architect',
      name: 'Architect',
      description: 'For design tasks',
      defaultContext: 'Default architect context',
    },
  ],
};

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAgentsConfig),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows loading state initially', () => {
    render(<App />);
    expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
  });

  it('renders main UI after loading', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    expect(screen.queryByText('Loading configuration...')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Klakier - the XML Prompt Generator' })).toBeInTheDocument();
  });

  it('shows error state when config fails to load', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load agent configuration')).toBeInTheDocument();
    });
  });

  it('renders agent selector with agents', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('renders context input', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/context/i)).toBeInTheDocument();
    });
  });

  it('renders requirements input', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/requirements/i)).toBeInTheDocument();
    });
  });

  it('renders task input', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/task/i)).toBeInTheDocument();
    });
  });

  it('updates XML output when typing in context with task', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/context/i)).toBeInTheDocument();
    });

    // Need to add task or requirement for XML to generate (context alone doesn't trigger generation)
    const taskInput = screen.getByLabelText(/task/i);
    await user.type(taskInput, 'Some task');

    const contextInput = screen.getByLabelText(/context/i);
    await user.type(contextInput, 'UniqueContextText');

    await waitFor(() => {
      const outputPanel = document.querySelector('.output-panel');
      expect(outputPanel?.textContent).toContain('UniqueContextText');
    });
  });

  it('updates XML output when typing requirements', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/requirements/i)).toBeInTheDocument();
    });

    const reqInput = screen.getByLabelText(/requirements/i);
    await user.type(reqInput, 'UniqueRequirement');

    await waitFor(() => {
      const outputPanel = document.querySelector('.output-panel');
      expect(outputPanel?.textContent).toContain('UniqueRequirement');
    });
  });

  it('selects agent and updates XML output', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'general-purpose');

    await waitFor(() => {
      const outputPanel = document.querySelector('.output-panel');
      expect(outputPanel?.textContent).toContain('use general-purpose');
    });
  });

  it('applies default context when selecting agent with defaultContext', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'architect');

    const contextInput = screen.getByLabelText(/context/i) as HTMLTextAreaElement;

    await waitFor(() => {
      expect(contextInput.value).toBe('Default architect context');
    });
  });
});
