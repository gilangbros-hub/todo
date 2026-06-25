export type ChapterSlug =
  | 'mission-control' | 'results' | 'history' | 'insights';

export interface ChapterMeta {
  slug: ChapterSlug;
  label: string;
  icon: string;
  number: number;
  description: string;
}

export const CHAPTERS: ChapterMeta[] = [
  { slug: 'mission-control', label: 'Mission Control', icon: 'upload_file', number: 0, description: 'Upload BRD for review' },
  { slug: 'results', label: 'Review Dashboard', icon: 'analytics', number: 1, description: 'Management review results' },
  { slug: 'history', label: 'History', icon: 'history', number: 2, description: 'All past reviews' },
];

export interface FlowStep {
  id: string;
  actor: string;
  action: string;
  type: 'start' | 'process' | 'decision' | 'end' | 'initial' | 'action' | 'merge' | 'fork' | 'join' | 'final';
  condition?: string;
  next?: string[];
}

export interface RiskItem {
  risk_event: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'unlikely' | 'possible' | 'likely' | 'certain';
  business_impact: string;
  mitigation_strategy: string;
  risk_owner: string;
}

export interface ImprovementItem {
  title: string;
  description: string;
  category:
    | 'missing_owner'
    | 'undefined_success_metric'
    | 'scope_not_bounded'
    | 'assumption_not_validated'
    | 'missing_dependency'
    | 'compliance_not_addressed'
    | 'change_impact_ignored'
    | 'process_bottleneck'
    | 'ambiguous_spec'
    | string;
  priority: 'high' | 'medium' | 'low';
}

export interface QuestionItem {
  question: string;
  context: string;
  category:
    | 'strategic_alignment'
    | 'ownership_accountability'
    | 'business_case'
    | 'scope'
    | 'change_readiness'
    | 'business_rule'
    | 'edge_case'
    | 'data_integrity'
    | 'integration'
    | 'acceptance_criteria'
    | 'rollback_plan'
    | 'stakeholder_alignment'
    | string;
  target_stakeholder: string;
  priority?: 'high' | 'medium' | 'low';
  urgency?: 'ask_now' | 'ask_before_kickoff' | 'ask_before_sign_off';
}

export interface ImpactedComponent {
  component_name: string;
  description: string;
  impact_type:
    | 'new_integration'
    | 'process_modification'
    | 'data_migration'
    | 'role_change'
    | 'workflow_disruption'
    | 'reporting_change'
    | 'training_required'
    | string;
}

export interface UseCaseScenario {
  use_case_name: string;
  trigger: string;
  actor_action: string;
  system_response: string;
  alternate_flow: string;
}

export interface EnablementItem {
  feature_id: string;
  feature_name: string;
  business_owner: string;
  change_impact: string;
  readiness_assessment: 'not_ready' | 'partially_ready' | 'ready';
  readiness_notes: string;
  enablement_actions: string[];
  success_metric: string;
  change_complexity: 'low' | 'medium' | 'high';
}

export interface StrategicAlignmentItem {
  title: string;
  description: string;
  category:
    | 'strategic_misalignment'
    | 'roi_unclear'
    | 'scope_creep_risk'
    | 'change_fatigue_risk'
    | 'dependency_risk'
    | 'governance_gap'
    | 'value_realization_risk'
    | 'best_practice'
    | string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
  recommended_action: string;
}

export interface AnalysisExtras {
  flow_process: FlowStep[];
  improvements: ImprovementItem[];
  questions: QuestionItem[];
  risk_analysis: RiskItem[];
  context_diagram: string;
  impacted_components: ImpactedComponent[];
  use_case_scenarios: UseCaseScenario[];
  enablement_recs: EnablementItem[];
  strategic_alignment: StrategicAlignmentItem[];
}
