export type ChapterSlug =
  | 'gatehouse' | 'reveal' | 'scroll' | 'silent-laws'
  | 'flow' | 'tome' | 'realms' | 'trials'
  | 'grand-map' | 'counsel' | 'codex';

export interface ChapterMeta {
  slug: ChapterSlug;
  label: string;
  icon: string;
  number: number;
  description: string;
}

export const CHAPTERS: ChapterMeta[] = [
  { slug: 'gatehouse', label: 'The Gatehouse', icon: 'upload_file', number: 0, description: 'Upload & entry' },
  { slug: 'reveal', label: "Oracle's Reveal", icon: 'visibility', number: 1, description: 'Requirement detail' },
  { slug: 'scroll', label: 'The Scroll', icon: 'history_edu', number: 2, description: 'Functional requirements' },
  { slug: 'silent-laws', label: 'Silent Laws', icon: 'gavel', number: 3, description: 'Non-functional requirements' },
  { slug: 'flow', label: 'Flow of Fate', icon: 'account_tree', number: 4, description: 'User journey' },
  { slug: 'tome', label: 'Tome of Artifacts', icon: 'auto_stories', number: 5, description: 'Feature cards' },
  { slug: 'realms', label: 'Affected Realms', icon: 'lan', number: 6, description: 'System dependencies' },
  { slug: 'trials', label: 'Trials & Tribulations', icon: 'warning', number: 7, description: 'Risk analysis' },
  { slug: 'grand-map', label: 'The Grand Map', icon: 'map', number: 8, description: 'Architecture diagram' },
  { slug: 'counsel', label: "Oracle's Counsel", icon: 'forum', number: 9, description: 'Improvements' },
  { slug: 'codex', label: 'The Codex', icon: 'inventory_2', number: 10, description: 'Summary & synthesis' },
];

export interface FlowStep {
  id: string;
  actor: string;
  action: string;
  type: 'start' | 'process' | 'decision' | 'end';
}

export interface RiskItem {
  risk: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  mitigation: string;
  category?: string;
}

export interface ImprovementItem {
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

export interface QuestionItem {
  question: string;
  context: string;
  category: string;
  target_role: string;
  resolution?: string;
}

export interface ImpactedSystem {
  system_name: string;
  description: string;
  impact_type: string;
}

export interface FsdDesignItem {
  feature_name: string;
  explanation: string;
  user_action: string;
  system_reaction: string;
}

export interface AnalysisExtras {
  flow_process: FlowStep[];
  improvements: ImprovementItem[];
  questions: QuestionItem[];
  risk_analysis: RiskItem[];
  architecture_diagram: string;
  impacted_systems: ImpactedSystem[];
  fsd_design: FsdDesignItem[];
}
