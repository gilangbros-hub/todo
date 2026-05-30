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
  requirement_type: string;
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
  requirement_type: 'functional' | 'non_functional';
  precondition: string | null;
  postcondition: string | null;
  user_roles: string[];
  impacted_process: string | null;
  scope: 'in_scope' | 'out_of_scope' | 'unknown';
  accounting_impact: string | null;
}

export interface OracleAnalysis {
  features: ValidatedFeature[];
  flow_process: FlowStep[];
  improvements: string[];
  questions: string[];
  risk_analysis: RiskItem[];
}

export interface FlowStep {
  id: number;
  actor: string;
  action: string;
  type: 'start' | 'process' | 'decision' | 'end';
  next: number[];
}

export interface RiskItem {
  risk: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

// --- Prompt Builder ---

export function buildAnalysisPrompt(brdText: string): string {
  return `You are "The Oracle" — an expert business analyst who deciphers Business Requirement Documents (BRDs) into structured analysis.

Analyze the following BRD document and produce a comprehensive analysis with these sections:

## SECTION 1: FEATURES
Extract EVERY distinct feature or capability described. For each feature, provide the following fields. Each text field should be a COMPLETE, well-written explanation — write in full sentences, not fragments. Do NOT repeat the same information across different fields; each field answers a DIFFERENT question.

1. **name**: A concise feature name (max 80 chars)
2. **description**: A thorough 2-4 sentence summary of what this feature does, who it serves, and why it matters. This is the headline explanation — make it informative and self-contained (max 600 chars).
3. **requirement_type**: Either "functional" (what the system does) or "non_functional" (quality attributes like performance, security, scalability, auditability)
4. **suggested_priority**: One of: "normal" (simple/low impact), "rare" (moderate), "epic" (complex/high impact), "legendary" (critical/transformative)
5. **user_roles**: Array of user roles that interact with this feature (e.g., ["OPSI", "Finance HQ", "Acc Cost Co"])
6. **scope**: One of "in_scope", "out_of_scope", or "unknown"

BUSINESS TRANSFORMATION (project-level — the WHY). These describe the change in the business process over time:
7. **as_is**: Describe the CURRENT business reality in detail — how the work is done today, the manual steps, the tools used, and the specific pain points or risks. Tell the story of the old way (2-4 sentences).
8. **to_be**: Describe the FUTURE business reality after this feature ships — the new capability, what becomes automated or easier, and the concrete benefit gained. Tell the story of the new way (2-4 sentences). Do NOT just restate the feature name; explain the transformation versus as_is.

EXECUTION CONTRACT (feature-level — the WHEN/WHAT). These describe a single run of the feature, NOT the business transformation:
9. **precondition**: The system/data state that MUST already exist for this feature to be triggered (e.g., "A refund record with status 'approved' exists and the customer's bank account is verified"). This is a technical entry gate, not a business background. (1-2 sentences)
10. **postcondition**: The guaranteed system/data state AFTER one successful execution (e.g., "A disbursement journal entry is created and the refund status changes to 'disbursed'"). This is the technical result of one run. (1-2 sentences)

ADDITIONAL DETAIL:
11. **business_flow**: A detailed step-by-step narrative of how this specific feature is operated — who does what, in what order, with which screens or systems (3-6 sentences).
12. **impacted_process**: The broader business process this feature plugs into (one phrase, e.g., "TLO refund disbursement to customer").
13. **risks**: Concrete risks, assumptions, or dependencies specific to this feature, with enough detail to be actionable (2-3 sentences).
14. **accounting_impact**: Journal entry or accounting logic if applicable (debit/credit accounts, COA codes, description field content). Use empty string "" if this feature has no accounting impact.

CRITICAL DISTINCTION — do not confuse these:
- as_is/to_be = the BUSINESS story over time (before the project vs after the project). Narrative, why-focused.
- precondition/postcondition = the TECHNICAL contract of ONE execution (state required to start vs state guaranteed at end). Specific, data-focused.
If a feature is non-functional or has no meaningful value for a field, use an empty string "" rather than repeating another field's content.

## SECTION 2: FLOW PROCESS
Generate a structured flow process as an array of steps. Each step must have:
- **id**: Sequential number starting from 1
- **actor**: Who performs this step (e.g., "User", "System", "Admin", "Bank", specific role name)
- **action**: What happens in this step (concise, max 60 chars)
- **type**: One of "start" (first step), "process" (normal step), "decision" (branching point), "end" (final step)
- **next**: Array of step IDs that follow this step (e.g., [2] for linear, [3, 4] for decisions)

Keep it to 8-20 steps maximum. Capture the main happy path with key decision points.

## SECTION 3: POINTS FOR IMPROVEMENT
List specific improvements, gaps, or enhancements that could make this BRD stronger or the system better. Be actionable and specific.

## SECTION 4: QUESTIONS TO ASK
List clarifying questions that a business analyst should ask the stakeholders to fill gaps in the BRD. Focus on ambiguities, missing details, and unstated assumptions.

## SECTION 5: RISK ANALYSIS
Provide a structured risk assessment with each risk having:
- **risk**: Description of the risk
- **impact**: One of "low", "medium", "high", "critical"
- **mitigation**: Suggested mitigation strategy

IMPORTANT RULES:
- Return ONLY a valid JSON object with this exact structure. No markdown, no explanation, no wrapping.
- If a field cannot be determined from the document, use an empty string "".
- Extract ALL features mentioned, even minor ones. Maximum 20 features.
- Be specific and concise in each field.

RESPONSE FORMAT:
{
  "features": [ { ...feature objects... } ],
  "flow_process": [{ "id": 1, "actor": "User", "action": "Submits request", "type": "start", "next": [2] }, ...],
  "improvements": ["improvement 1", "improvement 2", ...],
  "questions": ["question 1", "question 2", ...],
  "risk_analysis": [{ "risk": "...", "impact": "high", "mitigation": "..." }, ...]
}

BRD DOCUMENT:
---
${brdText}
---

Respond with ONLY the JSON object:`;
}

// --- Response Validator ---

export function validateAnalysisResponse(raw: unknown): OracleAnalysis {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('LLM response is not an object');
  }

  const obj = raw as Record<string, unknown>;

  // Validate features array
  const rawFeatures = Array.isArray(obj.features) ? obj.features : [];
  if (rawFeatures.length === 0) {
    throw new Error('LLM returned no features');
  }

  const features = rawFeatures.slice(0, 20).map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Feature at index ${index} is not an object`);
    }

    const f = item as Record<string, unknown>;
    const name = typeof f.name === 'string' ? f.name.trim().slice(0, 100) : '';
    if (!name) {
      throw new Error(`Feature at index ${index} has no name`);
    }

    const reqType = typeof f.requirement_type === 'string' && f.requirement_type.trim().toLowerCase() === 'non_functional'
      ? 'non_functional' as const
      : 'functional' as const;

    return {
      name,
      description: sanitizeField(f.description, 800),
      pilot_status: validateEnum(f.pilot_status, PILOT_STATUSES, 'unknown') as PilotStatus,
      retention: sanitizeField(f.retention, 1000),
      business_flow: sanitizeField(f.business_flow, 2000),
      as_is: sanitizeField(f.as_is, 2000),
      to_be: sanitizeField(f.to_be, 2000),
      risks: sanitizeField(f.risks, 1500),
      suggested_priority: validateEnum(f.suggested_priority, PRIORITIES, 'normal') as Priority,
      requirement_type: reqType,
      precondition: sanitizeField(f.precondition, 800),
      postcondition: sanitizeField(f.postcondition, 800),
      user_roles: Array.isArray(f.user_roles)
        ? f.user_roles.filter((r): r is string => typeof r === 'string').slice(0, 10)
        : [],
      impacted_process: sanitizeField(f.impacted_process, 500),
      scope: typeof f.scope === 'string' && ['in_scope', 'out_of_scope'].includes(f.scope.trim().toLowerCase())
        ? f.scope.trim().toLowerCase() as 'in_scope' | 'out_of_scope'
        : 'unknown' as const,
      accounting_impact: sanitizeField(f.accounting_impact, 1000),
    };
  });

  // Validate flow_process
  const flowProcess: FlowStep[] = Array.isArray(obj.flow_process)
    ? obj.flow_process.slice(0, 25).map((step) => {
        if (typeof step !== 'object' || step === null) {
          return { id: 0, actor: 'System', action: 'Unknown', type: 'process' as const, next: [] };
        }
        const s = step as Record<string, unknown>;
        const validTypes = ['start', 'process', 'decision', 'end'] as const;
        const stepType = typeof s.type === 'string' && validTypes.includes(s.type as typeof validTypes[number])
          ? s.type as typeof validTypes[number]
          : 'process' as const;
        return {
          id: typeof s.id === 'number' ? s.id : 0,
          actor: typeof s.actor === 'string' ? s.actor.trim().slice(0, 50) : 'System',
          action: typeof s.action === 'string' ? s.action.trim().slice(0, 100) : 'Unknown step',
          type: stepType,
          next: Array.isArray(s.next) ? s.next.filter((n): n is number => typeof n === 'number') : [],
        };
      })
    : [];

  // Validate improvements
  const improvements = Array.isArray(obj.improvements)
    ? obj.improvements.filter((i): i is string => typeof i === 'string' && i.trim().length > 0).slice(0, 15)
    : [];

  // Validate questions
  const questions = Array.isArray(obj.questions)
    ? obj.questions.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).slice(0, 15)
    : [];

  // Validate risk_analysis
  const riskAnalysis = Array.isArray(obj.risk_analysis)
    ? obj.risk_analysis.slice(0, 15).map((r) => {
        if (typeof r !== 'object' || r === null) return { risk: 'Unknown risk', impact: 'medium' as const, mitigation: '' };
        const rObj = r as Record<string, unknown>;
        const impact = typeof rObj.impact === 'string' && ['low', 'medium', 'high', 'critical'].includes(rObj.impact.toLowerCase())
          ? rObj.impact.toLowerCase() as 'low' | 'medium' | 'high' | 'critical'
          : 'medium' as const;
        return {
          risk: typeof rObj.risk === 'string' ? rObj.risk.trim().slice(0, 500) : 'Unknown risk',
          impact,
          mitigation: typeof rObj.mitigation === 'string' ? rObj.mitigation.trim().slice(0, 500) : '',
        };
      })
    : [];

  return {
    features,
    flow_process: flowProcess,
    improvements,
    questions,
    risk_analysis: riskAnalysis,
  };
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
