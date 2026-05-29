/**
 * BRD Oracle — Prompt engineering and response validation.
 * Pure functions for building the structured prompt and validating LLM output.
 */

import { Priority, PilotStatus, PRIORITIES, PILOT_STATUSES } from '@/lib/types';

// --- Types for raw LLM response ---

export interface RawFeatureAnalysis {
  name: string;
  description: string;
  pilot_status: string;
  retention: string;
  business_flow: string;
  as_is: string;
  to_be: string;
  risks: string;
  suggested_priority: string;
}

export interface ValidatedFeature {
  name: string;
  description: string | null;
  pilot_status: PilotStatus;
  retention: string | null;
  business_flow: string | null;
  as_is: string | null;
  to_be: string | null;
  risks: string | null;
  suggested_priority: Priority;
}

// --- Prompt Builder ---

export function buildAnalysisPrompt(brdText: string): string {
  return `You are "The Oracle" — an expert business analyst who deciphers Business Requirement Documents (BRDs) into structured feature breakdowns.

Analyze the following BRD document and extract EVERY distinct feature or capability described. For each feature, provide:

1. **name**: A concise feature name (max 80 chars)
2. **description**: Brief description of what this feature does (max 200 chars)
3. **pilot_status**: Is this feature being piloted or fully rolled out? One of: "pilot", "full_rollout", "phased", "unknown"
4. **retention**: What retention or engagement strategy does this feature support? How does it keep users coming back?
5. **business_flow**: Describe the business process flow — who does what, in what order, with what systems
6. **as_is**: Current state / existing condition before this feature (pain points, manual processes)
7. **to_be**: Target state after implementation (improvements, new capabilities)
8. **risks**: Key risks, assumptions, or dependencies
9. **suggested_priority**: Based on complexity and business impact, one of: "normal" (simple/low impact), "rare" (moderate), "epic" (complex/high impact), "legendary" (critical/transformative)

IMPORTANT RULES:
- Return ONLY a valid JSON array of objects. No markdown, no explanation, no wrapping.
- If a field cannot be determined from the document, use an empty string "".
- Extract ALL features mentioned, even minor ones.
- Be specific and concise in each field.
- Maximum 20 features per document.

BRD DOCUMENT:
---
${brdText}
---

Respond with ONLY the JSON array:`;
}

// --- Response Validator ---

export function validateAnalysisResponse(raw: unknown): ValidatedFeature[] {
  if (!Array.isArray(raw)) {
    throw new Error('LLM response is not an array');
  }

  if (raw.length === 0) {
    throw new Error('LLM returned no features');
  }

  // Cap at 20 features
  const capped = raw.slice(0, 20);

  return capped.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Feature at index ${index} is not an object`);
    }

    const obj = item as Record<string, unknown>;

    // Name is required
    const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 100) : '';
    if (!name) {
      throw new Error(`Feature at index ${index} has no name`);
    }

    return {
      name,
      description: sanitizeField(obj.description, 500),
      pilot_status: validateEnum(obj.pilot_status, PILOT_STATUSES, 'unknown') as PilotStatus,
      retention: sanitizeField(obj.retention, 1000),
      business_flow: sanitizeField(obj.business_flow, 2000),
      as_is: sanitizeField(obj.as_is, 2000),
      to_be: sanitizeField(obj.to_be, 2000),
      risks: sanitizeField(obj.risks, 1000),
      suggested_priority: validateEnum(obj.suggested_priority, PRIORITIES, 'normal') as Priority,
    };
  });
}

// --- Helpers ---

function sanitizeField(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function validateEnum(value: unknown, allowed: readonly string[], fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const lower = value.trim().toLowerCase();
  return (allowed as readonly string[]).includes(lower) ? lower : fallback;
}
