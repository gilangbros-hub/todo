import { REQUIREMENT_CLASSIFICATIONS, PRIORITY_MOSCOW } from '@/lib/types';

export interface FeatureRow {
  document_id: string;
  feature_id: string;
  name: string;
  description: string;
  requirement_classification: string;
  priority_moscow: string;
  business_value: string;
  capability_gap: string;
  business_rules: string[];
  stakeholders: string[];
  preconditions: string;
  postconditions: string;
  acceptance_criteria: string[];
  dependencies_and_risks: string;
  accounting_impact: string;
}

function normalizeClassification(raw: unknown): string {
  const normalized = String(raw || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  if ((REQUIREMENT_CLASSIFICATIONS as readonly string[]).includes(normalized)) {
    return normalized;
  }
  return 'functional_requirement';
}

function normalizePriority(raw: unknown): string {
  const value = String(raw || '');
  if ((PRIORITY_MOSCOW as readonly string[]).includes(value)) {
    return value;
  }
  return 'should_have';
}

function safeString(value: unknown, maxLen?: number): string {
  const s = typeof value === 'string' ? value : '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((r: unknown) => typeof r === 'string') : [];
}

/**
 * Map raw LLM feature objects into validated DB rows.
 */
export function mapFeatureRows(features: unknown[], documentId: string): FeatureRow[] {
  return (features as Record<string, unknown>[]).map((f) => ({
    document_id: documentId,
    feature_id: safeString(f.feature_id, 50) || 'F-UNKNOWN',
    name: safeString(f.name, 100) || 'Unnamed',
    description: safeString(f.description, 800),
    requirement_classification: normalizeClassification(f.requirement_classification),
    priority_moscow: normalizePriority(f.priority_moscow),
    business_value: safeString(f.business_value),
    capability_gap: safeString(f.capability_gap),
    business_rules: safeStringArray(f.business_rules),
    stakeholders: safeStringArray(f.stakeholders),
    preconditions: safeString(f.preconditions),
    postconditions: safeString(f.postconditions),
    acceptance_criteria: safeStringArray(f.acceptance_criteria),
    dependencies_and_risks: safeString(f.dependencies_and_risks),
    accounting_impact: safeString(f.accounting_impact),
  }));
}
