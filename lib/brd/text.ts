import { sanitizeImageReferences } from './sanitize';

/** Maximum characters accepted for BRD analysis input. */
export const MAX_INPUT_CHARS = 300_000;

/**
 * Strip control characters and normalize line endings.
 * Shared across analyze, stream, and parse-pdf routes.
 */
export function sanitizeControlChars(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Full BRD text sanitization: control chars + image refs + trim.
 * Used by analyze and stream routes before sending text to LLMs.
 */
export function sanitizeBrdText(text: string): string {
  let cleaned = sanitizeControlChars(text).trim();
  cleaned = sanitizeImageReferences(cleaned);
  return cleaned;
}

/**
 * Validate BRD analysis input. Returns an error object if invalid, or null if valid.
 */
export function validateBrdInput(
  text: string | undefined,
  title: string | undefined,
): { error: string; status: number } | null {
  if (!text || typeof text !== 'string') {
    return { error: 'No document text provided', status: 400 };
  }
  if (!title || typeof title !== 'string') {
    return { error: 'No document title provided', status: 400 };
  }
  return null;
}

/**
 * Validate sanitized text length. Returns an error object if invalid, or null if valid.
 */
export function validateTextLength(
  text: string,
): { error: string; status: number } | null {
  if (text.length < 50) {
    return { error: 'Document text is too short (minimum 50 characters)', status: 400 };
  }
  if (text.length > MAX_INPUT_CHARS) {
    return { error: `Document text exceeds maximum length (${MAX_INPUT_CHARS} characters)`, status: 400 };
  }
  return null;
}

/**
 * Strip markdown code fences from LLM JSON responses.
 */
export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}
