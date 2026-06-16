/**
 * Tests for clipboard helper utility.
 */

import { copyToClipboard } from '@/lib/utils/clipboard';

describe('copyToClipboard', () => {
  let originalClipboard: any;
  let originalExecCommand: any;

  beforeAll(() => {
    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
    document.execCommand = originalExecCommand;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset clipboard on navigator
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    // Reset execCommand
    document.execCommand = jest.fn().mockReturnValue(true);
    // Suppress expected warnings/errors in console during testing
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('uses navigator.clipboard.writeText if available and resolves true', async () => {
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });

    const result = await copyToClipboard('hello world');

    expect(result).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith('hello world');
    expect(document.execCommand).not.toHaveBeenCalled();
  });

  it('falls back to document.execCommand if navigator.clipboard throws an error', async () => {
    const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard error'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });

    const result = await copyToClipboard('hello legacy');

    expect(result).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith('hello legacy');
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('falls back to document.execCommand if navigator.clipboard is not supported', async () => {
    const result = await copyToClipboard('hello legacy 2');

    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns false if both writeText and execCommand fail', async () => {
    const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard error'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });
    document.execCommand = jest.fn().mockReturnValue(false);

    const result = await copyToClipboard('hello fail');

    expect(result).toBe(false);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns false if document.execCommand throws an error', async () => {
    document.execCommand = jest.fn().mockImplementation(() => {
      throw new Error('execCommand error');
    });

    const result = await copyToClipboard('hello throw');

    expect(result).toBe(false);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });
});
