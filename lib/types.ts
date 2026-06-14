// ============================================================
// BRD Analysis — Document Analysis Types
// ============================================================

// --- Requirement Classification (BABOK) ---
export const REQUIREMENT_CLASSIFICATIONS = [
  'business_requirement',
  'stakeholder_requirement',
  'functional_requirement',
  'non_functional_requirement',
  'transition_requirement'
] as const;
export type RequirementClassification = typeof REQUIREMENT_CLASSIFICATIONS[number];

// --- Priority (MoSCoW - PMI-PBA) ---
export const PRIORITY_MOSCOW = ['must_have', 'should_have', 'could_have', 'wont_have'] as const;
export type PriorityMoscow = typeof PRIORITY_MOSCOW[number];

// --- UML Activity Diagram Types (Satzinger) ---
export const UML_NODE_TYPES = ['initial', 'action', 'decision', 'merge', 'fork', 'join', 'final'] as const;
export type UmlNodeType = typeof UML_NODE_TYPES[number];

export interface FlowProcessNode {
  id: string;
  actor: string;
  action: string;
  type: UmlNodeType;
  condition?: string;
  next: string[];
}

// --- BRD Document ---

export interface BrdDocument {
  id: string;
  user_id: string;
  title: string;
  source_text: string;
  file_name: string | null;
  analysis_status: 'analyzing' | 'completed' | 'partial' | 'failed';
  sections_completed: string[];
  flow_process: unknown[];
  improvements: unknown[];
  questions: unknown[];
  risk_analysis: unknown[];
  context_diagram: string;
  impacted_components: unknown[];
  use_case_scenarios: unknown[];
  created_at: string;
}

// --- BRD Feature (Prophecy) ---

export interface BrdFeature {
  id: string;
  user_id: string;
  document_id: string;
  feature_id: string;
  name: string;
  description: string;
  requirement_classification: RequirementClassification;
  priority_moscow: PriorityMoscow;
  business_value: string;
  capability_gap: string;
  business_rules: string[];
  stakeholders: string[];
  preconditions: string;
  postconditions: string;
  acceptance_criteria: string[];
  dependencies_and_risks: string;
  accounting_impact: string;
  created_at: string;
}
