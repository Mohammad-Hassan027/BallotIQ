/**
 * Security module: Input sanitization for all user-provided text
 * and AI-generated content before rendering.
 * Prevents XSS attacks and prompt injection.
 */
// Lazy load DOMPurify only on client-side to prevent Next.js SSR / JSDOM bundle resolution errors
let DOMPurifyInstance: any = null;
if (typeof window !== 'undefined') {
  try {
    const imported = require('isomorphic-dompurify');
    DOMPurifyInstance = imported.default || imported;
  } catch (err) {
    console.error('Failed to load isomorphic-dompurify on client:', err);
  }
}

/** Maximum allowed length for user input */
const MAX_USER_INPUT_LENGTH = 500;

/** Maximum allowed length for AI response content */
const MAX_AI_RESPONSE_LENGTH = 5000;

/** HTML entity mapping for special character escaping */
const HTML_ENTITIES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
};

/**
 * Sanitizes user-provided text input.
 * Strips HTML tags, limits length, removes prompt injection patterns,
 * and escapes special characters.
 * @param input - Raw user input string
 * @returns Sanitized string safe for use in prompts and rendering
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>&"]/g, (char) => HTML_ENTITIES[char] ?? char)
    .replace(/ignore previous instructions/gi, '')
    .replace(/system:/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<<SYS>>/gi, '')
    .replace(/<<\/SYS>>/gi, '')
    .substring(0, MAX_USER_INPUT_LENGTH)
    .trim();
}

/**
 * Validates and sanitizes AI-generated text before rendering.
 * Uses DOMPurify to strip any malicious scripts, iframes, and styling 
 * while safely retaining text operators (like < and >).
 * @param response - Raw AI response string
 * @returns Sanitized string safe for rendering
 */
export function sanitizeAIResponse(response: string): string {
  if (!response || typeof response !== 'string') {
    return '';
  }

  // Use DOMPurify for context-aware HTML sanitization if running on the client
  let safeHTML = response;
  if (DOMPurifyInstance) {
    safeHTML = DOMPurifyInstance.sanitize(response, {
      // Optional: If you want to strictly emulate the original catch-all regex
      // and allow NO html tags at all, uncomment the line below:
      // ALLOWED_TAGS: [] 
    });
  } else {
    // Basic server-side fallback to strip script tags
    safeHTML = response.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  return safeHTML
    .replace(/\*/g, '') // Strip asterisks (markdown bold/italic) for cleaner text
    .substring(0, MAX_AI_RESPONSE_LENGTH)
    .trim();
}

/**
 * Strips markdown code fences from Gemini JSON responses.
 * Gemini often wraps JSON in ```json blocks despite prompt instructions.
 * @param raw - Raw response string potentially wrapped in code fences
 * @returns Clean JSON string ready for parsing
 */
export function sanitizeJSONResponse(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  return raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}