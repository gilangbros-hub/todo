'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, Network, HelpCircle, Lightbulb, Cpu, Shield, TrendingUp,
  ArrowUpCircle, CheckCircle, AlertTriangle,
  ExternalLink, BookOpen, Map, MessageSquare, FileText, Share, Zap, RotateCcw,
} from 'lucide-react';
import { useRenata } from '@/lib/renata/context';
import { calculateAnalysisProgress } from '@/lib/brd/progress';
import { SectionHeader } from '@/components/renata/SectionHeader';
import { ExpandableCard } from '@/components/renata/ExpandableCard';
import { FlowStepper } from '@/components/renata/FlowStepper';
import { ArchitectureCanvas } from '@/components/renata/ArchitectureCanvas';
import { IntegrationCard } from '@/components/renata/IntegrationCard';
import {
  MOCK_FEATURES, MOCK_DISCOVERY_QUESTIONS, MOCK_OPTIMIZATIONS,
  MOCK_SOLUTIONS, MOCK_RISKS, MOCK_ADVISORY,
} from '@/lib/renata/mock-data';

type TabId = 'requirements' | 'process' | 'discovery' | 'optimization' | 'solutions' | 'deepdive' | 'extraction';

const TABS: { id: TabId; label: string; icon: any; color: string }[] = [
  { id: 'requirements', label: 'Requirements Matrix', icon: ClipboardList, color: 'text-sys-primary' },
  { id: 'process', label: 'Process & Architecture', icon: Network, color: 'text-sys-secondary' },
  { id: 'discovery', label: 'Discovery Questions', icon: HelpCircle, color: 'text-indigo-500' },
  { id: 'optimization', label: 'AI Optimization', icon: Lightbulb, color: 'text-purple-500' },
  { id: 'solutions', label: 'AI Solutions', icon: Cpu, color: 'text-cyan-500' },
  { id: 'extraction', label: 'Source & Extraction', icon: FileText, color: 'text-sys-info' },
  { id: 'deepdive', label: 'BA Deep-Dive', icon: Shield, color: 'text-sys-warning' },
];

const PRIORITY_BADGES: Record<string, string> = {
  must_have: 'bg-rose-100 text-rose-700 border-rose-200',
  should_have: 'bg-amber-100 text-amber-700 border-amber-200',
  could_have: 'bg-blue-100 text-blue-700 border-blue-200',
  wont_have: 'bg-gray-100 text-gray-500 border-gray-200',
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-green-100 text-green-700 border-green-200',
  critical: 'bg-red-200 text-red-800 border-red-300',
  likely: 'bg-orange-100 text-orange-700 border-orange-200',
  possible: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  certain: 'bg-red-100 text-red-700 border-red-200',
  unlikely: 'bg-green-100 text-green-700 border-green-200',
};

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${className}`}>
      {children}
    </span>
  );
}

export default function ResultsPage() {
  const { features, extras, activeDocument } = useRenata();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('requirements');
  const [deepDiveSub, setDeepDiveSub] = useState<'risk' | 'advisory'>('risk');

  const allFeatures = features.length > 0 ? features : MOCK_FEATURES;
  const funcFeatures = allFeatures.filter((f) => f.requirement_classification === 'functional_requirement');
  const nonFuncFeatures = allFeatures.filter((f) => f.requirement_classification === 'non_functional_requirement');
  const [reqSubTab, setReqSubTab] = useState<'functional' | 'non-functional'>('functional');

  const discoveryQs = extras.questions.length > 0 ? extras.questions : MOCK_DISCOVERY_QUESTIONS;
  const improvements = extras.improvements.length > 0 ? extras.improvements : MOCK_OPTIMIZATIONS;
  const risks = extras.risk_analysis.length > 0 ? extras.risk_analysis : MOCK_RISKS;

  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  if (!activeDocument) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText size={64} className="text-sys-faint mb-4" />
        <h2 className="font-outfit font-extrabold text-2xl text-sys-text mb-2">No Document Selected</h2>
        <p className="font-geist text-base text-sys-muted">Upload a BRD in Mission Control to begin analysis.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 bg-sys-bg border-b border-sys-border">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-geist font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-sys-primary text-sys-primary'
                  : 'border-transparent text-sys-muted hover:text-sys-text'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 py-6 space-y-6">
        {activeTab === 'requirements' && (
          <>
            <SectionHeader icon={ClipboardList} title="Requirements Matrix" subtitle="All functional and non-functional requirements extracted from the BRD, with expandable details." />
            <div className="flex gap-2 mb-6">
              <button onClick={() => setReqSubTab('functional')} className={`px-5 py-2.5 rounded-xl font-geist font-bold text-sm transition-all cursor-pointer ${reqSubTab === 'functional' ? 'bg-sys-primary text-white shadow-sm' : 'bg-sys-surface text-sys-muted border border-sys-border hover:bg-sys-bg'}`}>
                Functional ({funcFeatures.length})
              </button>
              <button onClick={() => setReqSubTab('non-functional')} className={`px-5 py-2.5 rounded-xl font-geist font-bold text-sm transition-all cursor-pointer ${reqSubTab === 'non-functional' ? 'bg-sys-primary text-white shadow-sm' : 'bg-sys-surface text-sys-muted border border-sys-border hover:bg-sys-bg'}`}>
                Non-Functional ({nonFuncFeatures.length})
              </button>
            </div>
            <div className="space-y-3">
              {(reqSubTab === 'functional' ? funcFeatures : nonFuncFeatures).map((f) => (
                <ExpandableCard key={f.id} className="hover:border-sys-primary/40" badge={<Badge className={PRIORITY_BADGES[f.priority_moscow] || PRIORITY_BADGES.should_have}>{f.priority_moscow?.replace(/_/g, ' ') || 'should have'}</Badge>}
                  expandedContent={
                    <div className="space-y-4 text-base">
                      <p className="font-geist text-sys-text/90 leading-relaxed">{f.description}</p>
                      {f.business_value && (
                        <div className="bg-sys-surface border border-sys-border rounded-xl p-4">
                          <p className="font-geist font-bold text-sm text-sys-muted uppercase tracking-wider mb-1">Business Value</p>
                          <p className="font-geist text-sys-text">{f.business_value}</p>
                        </div>
                      )}
                      {f.acceptance_criteria && f.acceptance_criteria.length > 0 && (
                        <div>
                          <p className="font-geist font-bold text-sm text-sys-muted uppercase tracking-wider mb-2">Acceptance Criteria</p>
                          <ul className="space-y-1.5">
                            {f.acceptance_criteria.map((c, i) => (
                              <li key={i} className="flex items-start gap-2 font-geist text-sys-text">
                                <CheckCircle size={16} className="text-sys-success shrink-0 mt-0.5" />
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {f.dependencies_and_risks && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="flex items-center gap-1.5 font-geist font-bold text-sm text-amber-700 uppercase tracking-wider mb-1">
                            <AlertTriangle size={14} /> Dependencies & Risks
                          </p>
                          <p className="font-geist text-amber-800">{f.dependencies_and_risks}</p>
                        </div>
                      )}
                      {f.stakeholders && f.stakeholders.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {f.stakeholders.map((s, i) => (
                            <span key={i} className="px-3 py-1 rounded-lg bg-sys-secondary/10 text-sys-secondary font-geist font-bold text-xs border border-sys-secondary/20">{s}</span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => router.push(`/renata/insights/${f.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-sys-primary text-white rounded-xl font-geist font-bold text-sm hover:bg-sys-primary/90 transition-colors cursor-pointer"
                      >
                        <ExternalLink size={14} /> Full Details
                      </button>
                    </div>
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sys-primary-container/20 flex items-center justify-center shrink-0">
                      <BookOpen size={16} className="text-sys-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-geist font-bold text-base text-sys-text truncate">{f.name}</p>
                      <p className="font-geist text-sm text-sys-muted truncate">{f.feature_id}</p>
                    </div>
                  </div>
                </ExpandableCard>
              ))}
            </div>
          </>
        )}

        {activeTab === 'process' && (
          <>
            <SectionHeader icon={Network} title="Process Flow & System Architecture" subtitle="Business process flow with corresponding system architecture diagram and integration points." />

            <div className="space-y-2 mb-8">
              <h3 className="font-outfit font-extrabold text-xl text-sys-text">Business Process Flow</h3>
              {extras.flow_process.length > 0
                ? <FlowStepper steps={extras.flow_process} />
                : <div className="bg-sys-surface border border-sys-border rounded-2xl p-6 text-center">
                    <p className="font-geist text-sys-muted">Upload a BRD and run analysis to see the process flow.</p>
                  </div>
              }
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-outfit font-extrabold text-xl text-sys-text">System Architecture</h3>
                {extras.context_diagram
                  ? <ArchitectureCanvas diagramCode={extras.context_diagram} />
                  : <div className="bg-sys-surface border border-sys-border rounded-2xl p-6 text-center">
                      <Map size={48} className="text-sys-faint mx-auto mb-3" />
                      <p className="font-geist text-sys-muted">Run analysis to generate system architecture diagram.</p>
                    </div>
                }
              </div>
              <div className="space-y-3">
                <h3 className="font-outfit font-extrabold text-xl text-sys-text">Impacted Systems</h3>
                {extras.impacted_components.length > 0
                  ? <div className="space-y-3">{extras.impacted_components.map((sys, i) => (
                      <IntegrationCard key={`${sys.component_name}-${i}`} system={sys} index={i} />
                    ))}</div>
                  : <div className="bg-sys-surface border border-sys-border rounded-2xl p-6 text-center">
                      <Share size={48} className="text-sys-faint mx-auto mb-3" />
                      <p className="font-geist text-sys-muted">No impacted systems identified yet.</p>
                    </div>
                }
              </div>
            </div>
          </>
        )}

        {activeTab === 'discovery' && (
          <>
            <SectionHeader icon={HelpCircle} title="Discovery Questionnaire" subtitle="Targeted questions to gather missing requirements and clarify ambiguities with stakeholders." />
            <div className="space-y-3">
              {discoveryQs.map((q, i) => (
                <ExpandableCard key={i}
                  badge={<Badge className={`${q.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' : q.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{q.priority}</Badge>}
                  expandedContent={
                    <div className="space-y-3 text-base">
                      <div className="bg-white border border-sys-border rounded-xl p-4">
                        <p className="font-geist font-bold text-sm text-sys-muted uppercase tracking-wider mb-1">Context</p>
                        <p className="font-geist text-sys-text">{q.context}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-lg bg-sys-primary-container/20 text-sys-primary font-geist font-bold text-xs border border-sys-primary-container/30">{q.category?.replace(/_/g, ' ') || 'general'}</span>
                        <span className="px-3 py-1 rounded-lg bg-sys-secondary/10 text-sys-secondary font-geist font-bold text-xs border border-sys-secondary/20">{q.target_stakeholder}</span>
                      </div>
                    </div>
                  }
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare size={18} className="text-sys-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-geist font-bold text-base text-sys-text">{q.question}</p>
                      <p className="font-geist text-sm text-sys-muted mt-0.5">{q.category?.replace(/_/g, ' ') || 'General'} · {q.target_stakeholder}</p>
                    </div>
                  </div>
                </ExpandableCard>
              ))}
            </div>
          </>
        )}

        {activeTab === 'optimization' && (
          <>
            <SectionHeader icon={Lightbulb} title="AI Optimization Suggestions" subtitle="AI-driven recommendations to improve, clarify, and optimize requirements for better delivery outcomes." />
            <div className="space-y-3">
              {improvements.map((opt, i) => (
                <ExpandableCard key={i} className="hover:border-purple-300"
                  badge={<Badge className={PRIORITY_BADGES[opt.priority] || PRIORITY_BADGES.medium}>{opt.priority}</Badge>}
                  expandedContent={
                    <div className="space-y-3 text-base">
                      <p className="font-geist text-sys-text/90 leading-relaxed">{opt.description}</p>
                      {(opt as any).impact && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                          <p className="flex items-center gap-1.5 font-geist font-bold text-sm text-indigo-700 uppercase tracking-wider mb-1">
                            <TrendingUp size={14} /> Business Impact
                          </p>
                          <p className="font-geist text-indigo-800">{(opt as any).impact}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-700 font-geist font-bold text-xs border border-purple-200">{opt.category?.replace(/_/g, ' ') || 'general'}</span>
                      </div>
                    </div>
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                      <Zap size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="font-geist font-bold text-base text-sys-text">{opt.title}</p>
                      <p className="font-geist text-sm text-sys-muted mt-0.5 line-clamp-1">{opt.description}</p>
                    </div>
                  </div>
                </ExpandableCard>
              ))}
            </div>
          </>
        )}

        {activeTab === 'solutions' && (
          <>
            <SectionHeader icon={Cpu} title="AI Technical Solutions" subtitle="Mapping specific AI and technical solutions to each requirement with recommended tech stacks." />
            <div className="space-y-3">
              {MOCK_SOLUTIONS.map((sol, i) => (
                <ExpandableCard key={i} className="hover:border-cyan-300"
                  badge={<Badge className={`${sol.complexity === 'high' ? 'bg-red-100 text-red-700 border-red-200' : sol.complexity === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{sol.complexity}</Badge>}
                  expandedContent={
                    <div className="space-y-4 text-base">
                      <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-xl p-4">
                        <p className="font-geist font-bold text-sm text-cyan-700 uppercase tracking-wider mb-2">Solution Recommendation</p>
                        <p className="font-geist text-cyan-900 leading-relaxed">{sol.recommendation}</p>
                      </div>
                      <div>
                        <p className="font-geist font-bold text-sm text-sys-muted uppercase tracking-wider mb-2">Recommended Tech Stack</p>
                        <div className="flex flex-wrap gap-2">
                          {sol.tech_stack.map((t, ti) => (
                            <span key={ti} className="px-3 py-1.5 rounded-lg bg-sys-bg border border-sys-border font-mono font-bold text-xs text-sys-text">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-sys-bg border border-sys-border rounded-xl p-3">
                          <p className="font-geist text-xs text-sys-muted uppercase tracking-wider font-bold">Complexity</p>
                          <p className="font-geist font-bold text-sys-text mt-0.5 capitalize">{sol.complexity}</p>
                        </div>
                        <div className="bg-sys-bg border border-sys-border rounded-xl p-3">
                          <p className="font-geist text-xs text-sys-muted uppercase tracking-wider font-bold">Est. Effort</p>
                          <p className="font-geist font-bold text-sys-text mt-0.5">{sol.estimated_effort}</p>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
                      <Cpu size={16} className="text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-geist font-bold text-base text-sys-text">{sol.feature_name}</p>
                      <p className="font-geist text-sm text-sys-muted">{sol.feature_id} · {sol.solution_type?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </ExpandableCard>
              ))}
            </div>
          </>
        )}

        {activeTab === 'extraction' && (
          <>
            <SectionHeader icon={FileText} title="Source & Extraction" subtitle="Original BRD content and AI-extracted key information for analysis." />
            <div className="space-y-6">
              <div>
                <h3 className="font-outfit font-extrabold text-lg text-sys-text mb-3">Original Source Text</h3>
                <div className="bg-sys-bg border border-sys-border rounded-xl p-4 max-h-96 overflow-y-auto">
                  <pre className="font-geist text-sm text-sys-text whitespace-pre-wrap break-words">
                    {activeDocument?.source_text || 'No source text available'}
                  </pre>
                </div>
              </div>
              
              <div>
                <h3 className="font-outfit font-extrabold text-lg text-sys-text mb-3">AI-Extracted Content</h3>
                <div className="bg-sys-bg border border-sys-border rounded-xl p-4 max-h-96 overflow-y-auto">
                  <pre className="font-geist text-sm text-sys-text whitespace-pre-wrap break-words">
                    {activeDocument?.extracted_text || 'No extracted content available (extraction may not have been needed or failed)'}
                  </pre>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-sys-surface border border-sys-border rounded-xl p-4">
                  <h4 className="font-geist font-bold text-sys-muted uppercase tracking-wider text-xs mb-2">Document Info</h4>
                  <ul className="font-geist text-sm space-y-1">
                    <li><span className="text-sys-faint">Title:</span> <span className="text-sys-text">{activeDocument?.title}</span></li>
                    <li><span className="text-sys-faint">File:</span> <span className="text-sys-text">{activeDocument?.file_name || 'Uploaded text'}</span></li>
                    <li><span className="text-sys-faint">Source chars:</span> <span className="text-sys-text">{activeDocument?.source_text?.length?.toLocaleString() || 0}</span></li>
                    <li><span className="text-sys-faint">Extracted chars:</span> <span className="text-sys-text">{activeDocument?.extracted_text?.length?.toLocaleString() || 0}</span></li>
                  </ul>
                </div>
                
                <div className="bg-sys-surface border border-sys-border rounded-xl p-4">
                  <h4 className="font-geist font-bold text-sys-muted uppercase tracking-wider text-xs mb-2">Analysis Status</h4>
                  <ul className="font-geist text-sm space-y-1">
                    <li><span className="text-sys-faint">Status:</span> <span className="text-sys-text capitalize">{activeDocument?.analysis_status}</span></li>
                    <li><span className="text-sys-faint">Sections completed:</span> <span className="text-sys-text">{activeDocument?.sections_completed?.join(', ') || 'None'}</span></li>
                    <li><span className="text-sys-faint">Created:</span> <span className="text-sys-text">{new Date(activeDocument?.created_at || '').toLocaleString()}</span></li>
                  </ul>
                  {activeDocument?.analysis_status !== 'completed' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs font-geist mb-1">
                        <span className="text-sys-muted">Progress</span>
                        <span className="text-sys-text font-semibold">
                          {calculateAnalysisProgress(activeDocument?.sections_completed || [], activeDocument?.analysis_status || '')}%
                        </span>
                      </div>
                      <div className="w-full bg-sys-border rounded-full h-1.5 mb-3">
                        <div
                          className="bg-sys-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${calculateAnalysisProgress(activeDocument?.sections_completed || [], activeDocument?.analysis_status || '')}%` }}
                        />
                      </div>
                      <button
                        onClick={() => router.push(`/renata/mission-control?resume=${activeDocument?.id}`)}
                        className="flex items-center gap-1.5 text-sys-primary text-xs font-geist font-semibold hover:underline cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        Continue Analysis
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'deepdive' && (
          <>
            <SectionHeader icon={Shield} title="BA Deep-Dive" subtitle="Separated Risk Analysis and Strategic Advisory for comprehensive project assessment." />
            <div className="flex gap-2 mb-6">
              <button onClick={() => setDeepDiveSub('risk')} className={`px-5 py-2.5 rounded-xl font-geist font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${deepDiveSub === 'risk' ? 'bg-sys-error text-white shadow-sm' : 'bg-sys-surface text-sys-muted border border-sys-border hover:bg-sys-bg'}`}>
                <AlertTriangle size={16} /> Risk Watchlist ({risks.length})
              </button>
              <button onClick={() => setDeepDiveSub('advisory')} className={`px-5 py-2.5 rounded-xl font-geist font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${deepDiveSub === 'advisory' ? 'bg-sys-success text-white shadow-sm' : 'bg-sys-surface text-sys-muted border border-sys-border hover:bg-sys-bg'}`}>
                <TrendingUp size={16} /> Strategic Advisory ({MOCK_ADVISORY.length})
              </button>
            </div>

            {deepDiveSub === 'risk' ? (
              <div className="space-y-3">
                {risks.map((risk, i) => (
                  <ExpandableCard key={i} className="border-l-4 border-l-sys-error hover:shadow-red-100/50"
                    badge={
                      <div className="flex gap-1.5">
                        <Badge className={PRIORITY_BADGES[risk.impact] || PRIORITY_BADGES.medium}>{risk.impact}</Badge>
                        <Badge className={PRIORITY_BADGES[risk.likelihood] || PRIORITY_BADGES.medium}>{risk.likelihood}</Badge>
                      </div>
                    }
                    expandedContent={
                      <div className="space-y-4 text-base">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <p className="font-geist font-bold text-sm text-red-700 uppercase tracking-wider mb-1">Mitigation Strategy</p>
                          <p className="font-geist text-red-800">{risk.mitigation_strategy}</p>
                        </div>
                        {(risk as any).deep_dive && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="flex items-center gap-1.5 font-geist font-bold text-sm text-amber-700 uppercase tracking-wider mb-1">
                              <ArrowUpCircle size={14} /> BA Deep-Dive Notes
                            </p>
                            <p className="font-geist text-amber-800 leading-relaxed">{(risk as any).deep_dive}</p>
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-sys-error shrink-0 mt-0.5" />
                      <div>
                        <p className="font-geist font-bold text-base text-sys-text">{risk.risk_event}</p>
                      </div>
                    </div>
                  </ExpandableCard>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {MOCK_ADVISORY.map((adv, i) => (
                  <ExpandableCard key={i} className="border-l-4 border-l-sys-success hover:shadow-green-100/50"
                    badge={<Badge className={PRIORITY_BADGES[adv.priority] || PRIORITY_BADGES.medium}>{adv.priority}</Badge>}
                    expandedContent={
                      <div className="space-y-4 text-base">
                        <p className="font-geist text-sys-text/90 leading-relaxed">{adv.description}</p>
                        {adv.impact && (
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                            <p className="flex items-center gap-1.5 font-geist font-bold text-sm text-green-700 uppercase tracking-wider mb-1">
                              <TrendingUp size={14} /> Expected Impact
                            </p>
                            <p className="font-geist text-green-800">{adv.impact}</p>
                          </div>
                        )}
                        <span className="inline-block px-3 py-1 rounded-lg bg-green-100 text-green-700 font-geist font-bold text-xs border border-green-200">{adv.category?.replace(/_/g, ' ')}</span>
                      </div>
                    }
                  >
                    <div className="flex items-start gap-3">
                      <TrendingUp size={20} className="text-sys-success shrink-0 mt-0.5" />
                      <div>
                        <p className="font-geist font-bold text-base text-sys-text">{adv.title}</p>
                        <p className="font-geist text-sm text-sys-muted mt-0.5 line-clamp-1">{adv.description}</p>
                      </div>
                    </div>
                  </ExpandableCard>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
