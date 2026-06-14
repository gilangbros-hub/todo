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
  { slug: 'mission-control', label: 'Mission Control', icon: 'upload_file', number: 0, description: 'Upload & recent analyses' },
  { slug: 'results', label: 'Results', icon: 'analytics', number: 1, description: 'Analysis dashboard' },
  { slug: 'history', label: 'History', icon: 'history', number: 2, description: 'All past analyses' },
];

export interface FlowStep {
  id: string;
  actor: string;
  action: string;
  type: 'start' | 'process' | 'decision' | 'end';
}

export interface RiskItem {
  risk_event: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'unlikely' | 'possible' | 'likely' | 'certain';
  mitigation_strategy: string;
}

export interface ImprovementItem {
  title: string;
  description: string;
  category: 'missing_requirement' | 'ambiguous_spec' | 'unverified_assumption' | 'traceability_gap' | 'process_bottleneck' | 'compliance_risk' | string;
  priority: 'high' | 'medium' | 'low';
}

export interface QuestionItem {
  question: string;
  context: string;
  category: 'scope' | 'business_rule' | 'edge_case' | 'data_mapping' | 'integration' | 'acceptance_criteria' | string;
  target_stakeholder: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface ImpactedComponent {
  component_name: string;
  description: string;
  impact_type: 'new_integration' | 'process_modification' | 'data_migration' | 'notification_flow' | 'reporting_change' | string;
}

export interface UseCaseScenario {
  use_case_name: string;
  trigger: string;
  actor_action: string;
  system_response: string;
  alternate_flow: string;
}

export interface AnalysisExtras {
  flow_process: FlowStep[];
  improvements: ImprovementItem[];
  questions: QuestionItem[];
  risk_analysis: RiskItem[];
  context_diagram: string;
  impacted_components: ImpactedComponent[];
  use_case_scenarios: UseCaseScenario[];
}
