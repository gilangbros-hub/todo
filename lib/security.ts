/**
 * Security utilities for input sanitization and validation.
 *
 * OWASP A03 (Injection) / XSS defense-in-depth:
 * React escapes text content by default, but several fields in this app
 * flow into inline styles (e.g. Type color, PIC avatar). Inline style values
 * are a known CSS-injection vector, and avatar emoji flows into image-like
 * positions where unexpected characters can break layout or embed content.
 *
 * These helpers enforce strict whitelists before values reach the DOM.
 */

/**
 * Matches a 3- or 6-digit hex color (with leading #).
 * Accepts: #abc, #AABBCC. Rejects: rgb(), url(), expression(), CSS keywords.
 */
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Returns the color if it is a safe hex value, otherwise a safe fallback.
 * Use this anywhere a user-controlled color is written into a `style` prop.
 */
export function safeHexColor(value: string | null | undefined, fallback = "#6b7280"): string {
  if (typeof value !== "string") return fallback;
  return HEX_COLOR_RE.test(value.trim()) ? value.trim() : fallback;
}

/**
 * Validates a hex color for input forms. Returns a validation result.
 */
export function validateHexColor(value: string): { valid: boolean; error?: string } {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { valid: false, error: "Color is required" };
  }
  if (!HEX_COLOR_RE.test(value.trim())) {
    return { valid: false, error: "Color must be a hex value like #4a9eff" };
  }
  return { valid: true };
}

/**
 * Caps string length before persistence to match DB column widths and prevent
 * storage abuse. Trims whitespace and returns null for empty results when
 * allowEmpty is false.
 */
export function capString(value: string | null | undefined, maxLength: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/**
 * Strips characters that are not safe in emoji/sprite identifiers.
 * Keeps letters, digits, unicode emoji-range characters, spaces, hyphens,
 * underscores, and forward slashes (for sprite paths). Rejects control chars,
 * angle brackets, and quotes.
 */
export function sanitizeIdentifier(value: string, maxLength = 100): string {
  if (typeof value !== "string") return "";
  // Remove control characters, angle brackets, quotes, backticks, and null bytes.
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\x00-\x1F\x7F<>"'`]/g, "");
  return capString(cleaned, maxLength);
}

/**
 * Validates that a string is a UUID v4-ish identifier. Supabase generates UUIDs
 * via gen_random_uuid(); anywhere we accept an ID from outside code (e.g. URL
 * params) we should check it first to avoid malformed queries.
 */
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
