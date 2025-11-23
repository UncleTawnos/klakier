import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with "Copy" text', () => {
    render(<CopyButton content="test" />);
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('has correct title attribute', () => {
    render(<CopyButton content="test" />);
    expect(screen.getByTitle('Copy to clipboard')).toBeInTheDocument();
  });

  it('copies content to clipboard on click', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    render(<CopyButton content="content to copy" />);

    await user.click(screen.getByRole('button'));

    expect(writeTextMock).toHaveBeenCalledWith('content to copy');
  });

  it('shows "Copied!" text after successful copy', async () => {
    const user = userEvent.setup();
    render(<CopyButton content="test" />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('adds "copied" class after successful copy', async () => {
    const user = userEvent.setup();
    render(<CopyButton content="test" />);

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(button).toHaveClass('copied');
    });
  });

  it('does not show "Copied!" when copy fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Failed')) },
      configurable: true,
    });
    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('Failed');
    });

    render(<CopyButton content="test" />);
    const button = screen.getByRole('button');

    // Manually trigger click handler
    button.click();

    // Wait for async operations
    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });
});
