/**
 * Utility functions for clipboard interactions.
 */

/**
 * Copies the provided text to the clipboard.
 * Attempts to use the modern navigator.clipboard API first,
 * falling back to document.execCommand('copy') in environments where
 * the async Clipboard API is unavailable (e.g. non-secure origins, WebViews).
 *
 * @param text The string content to copy.
 * @returns A promise that resolves to true if the text was successfully copied, otherwise false.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn('Modern clipboard API failed, attempting legacy fallback.', error);
    }
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Prevent scrolling and keep it off-screen
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (error) {
    console.error('Legacy clipboard fallback failed:', error);
    return false;
  }
}
