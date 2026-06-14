'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRenata } from '@/lib/renata/context';
import {
  AlertCircle, ArrowLeft, ArrowRight, BookOpen, AlertTriangle,
  ArrowUpCircle, Lightbulb, HelpCircle, Network, Route, ChevronUp, ChevronDown,
} from 'lucide-react';
import { FlowStepper } from '@/components/renata/FlowStepper';
import { BrdFeature } from '@/lib/types';

const PRIORITY_COLORS: Record<string, string> = {
  must_have: 'bg-sys-primary/20 text-sys-primary border-sys-primary/30',
  should_have: 'bg-sys-secondary/20 text-sys-secondary border-sys-secondary/30',
  could_have: 'bg-sys-warning/20 text-sys-warning border-sys-warning/30',
  wont_have: 'bg-sys-success/20 text-sys-success border-sys-success/30',
};

const REQUIREMENT_COLORS: Record<string, string> = {
  business_requirement: 'bg-sys-primary/20 text-sys-primary border-sys-primary/30',
  stakeholder_requirement: 'bg-sys-secondary/20 text-sys-secondary border-sys-secondary/30',
  functional_requirement: 'bg-sys-surface border-sys-border text-sys-muted',
  non_functional_requirement: 'bg-sys-warning/20 text-sys-warning border-sys-warning/30',
  transition_requirement: 'bg-sys-success/20 text-sys-success border-sys-success/30',
};

export default function InsightsPage() {
  const params = useParams();
  const router = useRouter();
  const { features, extras } = useRenata();
  const featureId = params.featureId as string;

  const [improvementsOpen, setImprovementsOpen] = useState(true);
  const [questionsOpen, setQuestionsOpen] = useState(true);

  // Find the feature and its index
  const { feature, featureIndex } = useMemo(() => {
    const idx = features.findIndex((f) => f.id === featureId);
    return { feature: idx >= 0 ? features[idx] : null, featureIndex: idx };
  }, [features, featureId]);

  // Previous/Next navigation
  const prevFeature = featureIndex > 0 ? features[featureIndex - 1] : null;
  const nextFeature = featureIndex < features.length - 1 ? features[featureIndex + 1] : null;

  const relevantSteps = useMemo(() => {
    if (!feature || !extras.flow_process.length) return [];
    return extras.flow_process;
  }, [feature, extras.flow_process]);

  // Error state: feature not found
  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 rounded-full bg-sys-error/10 border border-sys-error/30 flex items-center justify-center mb-6">
          <AlertCircle size={40} className="text-sys-error" />
        </div>
        <h1 className="font-sans font-semibold text-neo-title text-sys-text mb-3">
          Requirement Not Found
        </h1>
        <p className="font-sans text-neo-body text-sys-muted mb-6 max-w-md">
          The requirement you are looking for does not exist or has been removed from this analysis.
        </p>
        <Link
          href="/renata/requirements"
          className="flex items-center gap-2 px-6 py-3 bg-sys-primary text-sys-bg font-sans font-semibold rounded hover:bg-sys-elevated transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
          Back to Requirements
        </Link>
      </div>
    );
  }

  const priorityClass = PRIORITY_COLORS[feature.priority_moscow] || PRIORITY_COLORS.should_have;
  const requirementClass = REQUIREMENT_COLORS[feature.requirement_classification] || REQUIREMENT_COLORS.functional_requirement;

  return (
    <div className="p-4 lg:p-6">
      {/* 3-Panel Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel — Flow Process Context */}
        <aside className="w-full lg:w-1/4 flex-shrink-0">
          <div className="bg-sys-elevated border border-sys-border rounded-lg p-4 sticky top-20">
            {/* Panel Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-sys-border">
              <Network size={20} className="text-sys-primary" />
              <h2 className="font-sans font-semibold text-sm text-sys-text">Flow Process</h2>
            </div>

            {/* Flow Steps */}
            {relevantSteps.length > 0 ? (
              <FlowStepper steps={relevantSteps} />
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <Route size={32} className="text-sys-faint mb-2" />
                <p className="text-sys-faint text-xs font-sans">
                  No flow process data available
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Center Panel — Main Requirement Content */}
        <main className="w-full lg:w-2/4 min-w-0">
          <div className="bg-sys-elevated border border-sys-border rounded-lg p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded bg-sys-primary/10 border border-sys-primary/30 text-sys-primary font-mono text-xs">
                  {feature.feature_id || `F-${featureIndex + 1}`}
                </span>
                <span className={`px-2 py-0.5 rounded border font-mono text-xs ${requirementClass}`}>
                  {feature.requirement_classification?.replace(/_/g, ' ') || 'functional requirement'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono border ${priorityClass}`}>
                  {feature.priority_moscow?.replace(/_/g, ' ') || 'should have'}
                </span>
              </div>

              {/* Feature Name */}
              <h1 className="font-sans font-semibold text-neo-title text-sys-text mb-2">
                {feature.name}
              </h1>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2">
                {feature.stakeholders && feature.stakeholders.length > 0 && (
                  feature.stakeholders.map((role) => (
                    <span
                      key={role}
                      className="px-2 py-0.5 rounded bg-sys-secondary/10 border border-sys-secondary/30 text-sys-secondary font-mono text-xs"
                    >
                      {role}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Description */}
            {feature.description && (
              <div className="mb-6">
                <p className="font-sans text-neo-body text-sys-text/90 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )}

            <div className="space-y-5">
              <DetailField
                icon="trending_up"
                label="Business Value"
                value={feature.business_value}
              />
              <DetailField
                icon="explore"
                label="Capability Gap"
                value={feature.capability_gap}
              />
              <DetailField
                icon="gavel"
                label="Business Rules"
                value={feature.business_rules?.length ? feature.business_rules.join('\n• ') : null}
              />
              <DetailField
                icon="check_circle"
                label="Preconditions"
                value={feature.preconditions}
              />
              <DetailField
                icon="flag"
                label="Postconditions"
                value={feature.postconditions}
              />
              <DetailField
                icon="checklist"
                label="Acceptance Criteria"
                value={feature.acceptance_criteria?.length ? feature.acceptance_criteria.join('\n• ') : null}
              />
              <DetailField
                icon="account_balance"
                label="Accounting Impact"
                value={feature.accounting_impact}
              />
            </div>

            {/* Navigation: Previous / Next */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-sys-border">
              {prevFeature ? (
                <button
                  onClick={() => router.push(`/renata/insights/${prevFeature.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-sys-surface border border-sys-border rounded hover:border-sys-primary/40 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} className="text-sys-primary" />
                  <span className="font-sans text-sm text-sys-muted">Previous</span>
                </button>
              ) : (
                <div />
              )}
              {nextFeature ? (
                <button
                  onClick={() => router.push(`/renata/insights/${nextFeature.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-sys-surface border border-sys-border rounded hover:border-sys-primary/40 transition-colors cursor-pointer"
                >
                  <span className="font-sans text-sm text-sys-muted">Next</span>
                  <ArrowRight size={16} className="text-sys-primary" />
                </button>
              ) : (
                <div />
              )}
            </div>
          </div>
        </main>

        {/* Right Panel — Analysis Notes */}
        <aside className="w-full lg:w-1/4 flex-shrink-0">
          <div className="bg-sys-elevated border border-sys-border rounded-lg p-4 sticky top-20">
            {/* Panel Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-sys-border">
              <BookOpen size={20} className="text-sys-primary" />
              <h2 className="font-sans font-semibold text-sm text-sys-text">Analysis Notes</h2>
            </div>

            {/* Risk */}
            {feature.dependencies_and_risks && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={14} className="text-sys-warning" />
                  <span className="font-mono text-xs text-sys-muted uppercase tracking-wider">
                    Risks & Dependencies
                  </span>
                </div>
                <p className="text-sys-text/80 text-sm font-sans leading-relaxed bg-sys-surface border border-sys-border rounded p-3">
                  {feature.dependencies_and_risks}
                </p>
              </div>
            )}

            {/* Priority */}
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                  <ArrowUpCircle size={14} className="text-sys-primary" />
                <span className="font-mono text-xs text-sys-muted uppercase tracking-wider">
                  MoSCoW Priority
                </span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-mono border ${priorityClass}`}>
                {feature.priority_moscow?.replace(/_/g, ' ') || 'should have'}
              </span>
            </div>

            {/* Improvements Section */}
            {extras.improvements.length > 0 && (
              <div className="mb-4 border-t border-sys-border pt-4">
                <button
                  onClick={() => setImprovementsOpen(!improvementsOpen)}
                  className="flex items-center justify-between w-full mb-2 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Lightbulb size={14} className="text-sys-primary" />
                    <span className="font-mono text-xs text-sys-muted uppercase tracking-wider">
                      Improvements
                    </span>
                  </div>
                  {improvementsOpen ? <ChevronUp size={16} className="text-sys-faint" /> : <ChevronDown size={16} className="text-sys-faint" />}
                </button>
                {improvementsOpen && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {extras.improvements.map((item, i) => (
                      <div
                        key={i}
                        className="bg-sys-surface border border-sys-border rounded p-2"
                      >
                        <p className="text-sys-text text-xs font-sans font-medium">
                          {item.title}
                        </p>
                        <p className="text-sys-faint text-xs font-sans mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Questions Section */}
            {extras.questions.length > 0 && (
              <div className="border-t border-sys-border pt-4">
                <button
                  onClick={() => setQuestionsOpen(!questionsOpen)}
                  className="flex items-center justify-between w-full mb-2 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-sys-secondary" />
                    <span className="font-mono text-xs text-sys-muted uppercase tracking-wider">
                      Questions
                    </span>
                  </div>
                  <ChevronUp size={14} className="text-sys-faint" />
                </button>
                {questionsOpen && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {extras.questions.map((item, i) => (
                      <div
                        key={i}
                        className="bg-sys-surface border border-sys-border rounded p-2"
                      >
                        <p className="text-sys-text text-xs font-sans">
                          {item.question}
                        </p>
                        <p className="text-sys-faint text-xs font-sans mt-0.5">
                          {item.category} · {item.target_stakeholder}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Helper component for displaying a labeled detail field */
function DetailField({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <div className="bg-sys-surface border border-sys-border rounded p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-sys-primary shrink-0" />
        <span className="font-mono text-xs text-sys-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="font-sans text-sm text-sys-text/90 leading-relaxed">
        {value}
      </p>
    </div>
  );
}
