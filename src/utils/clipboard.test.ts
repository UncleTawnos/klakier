import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard } from './clipboard';

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses navigator.clipboard.writeText when available', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const result = await copyToClipboard('test text');

    expect(writeTextMock).toHaveBeenCalledWith('test text');
    expect(result).toBe(true);
  });

  it('returns true on successful clipboard write', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    const result = await copyToClipboard('some content');
    expect(result).toBe(true);
  });

  it('falls back to execCommand when clipboard API fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Not allowed')) },
      configurable: true,
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    const result = await copyToClipboard('fallback text');

    expect(appendChildSpy).toHaveBeenCalled();
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(removeChildSpy).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when both methods fail', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Not allowed')) },
      configurable: true,
    });

    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand failed');
    });

    const result = await copyToClipboard('will fail');
    expect(result).toBe(false);
  });

  it('cleans up textarea element after fallback', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Not allowed')) },
      configurable: true,
    });

    document.execCommand = vi.fn().mockReturnValue(true);

    const initialChildCount = document.body.childNodes.length;
    await copyToClipboard('cleanup test');

    expect(document.body.childNodes.length).toBe(initialChildCount);
  });
});
