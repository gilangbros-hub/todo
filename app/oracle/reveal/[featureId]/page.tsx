'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOracle } from '@/lib/oracle/context';
import { OracleIcon } from '@/components/oracle/OracleIcon';
import { FlowStepper } from '@/components/oracle/FlowStepper';
import { BrdFeature } from '@/lib/types';

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-oracle-low/20 text-oracle-low border-oracle-low/30',
  rare: 'bg-oracle-sapphire/20 text-oracle-sapphire border-oracle-sapphire/30',
  epic: 'bg-oracle-medium/20 text-oracle-medium border-oracle-medium/30',
  legendary: 'bg-oracle-gold/20 text-oracle-gold border-oracle-gold/30',
};

const SCOPE_COLORS: Record<string, string> = {
  in_scope: 'bg-oracle-low/20 text-oracle-low border-oracle-low/30',
  out_of_scope: 'bg-oracle-critical/20 text-oracle-critical border-oracle-critical/30',
  unknown: 'bg-oracle-faint/20 text-oracle-faint border-oracle-faint/30',
};

const PILOT_LABELS: Record<string, string> = {
  pilot: 'Trial Quest',
  full_rollout: 'Full Campaign',
  phased: 'Phased Assault',
  unknown: 'Uncharted',
};

export default function RevealPage() {
  const params = useParams();
  const router = useRouter();
  const { features, extras } = useOracle();
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

  // Filter flow steps relevant to this feature (match by actor containing user_roles)
  const relevantSteps = useMemo(() => {
    if (!feature || !extras.flow_process.length) return [];
    const roles = feature.user_roles || [];
    if (roles.length === 0) return extras.flow_process;
    return extras.flow_process;
  }, [feature, extras.flow_process]);

  // Error state: feature not found
  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 rounded-full bg-oracle-critical/10 border border-oracle-critical/30 flex items-center justify-center mb-6">
          <OracleIcon name="error" size={40} className="text-oracle-critical" />
        </div>
        <h1 className="font-oracle-display text-oracle-headline-lg text-oracle-text mb-3">
          Requirement Not Found
        </h1>
        <p className="font-oracle-body text-oracle-body-md text-oracle-muted mb-6 max-w-md">
          The requirement you are looking for does not exist or has been removed from this analysis.
        </p>
        <Link
          href="/oracle/scroll"
          className="flex items-center gap-2 px-6 py-3 bg-oracle-gold text-oracle-deepest font-oracle-body font-semibold rounded hover:bg-oracle-gold-container transition-colors cursor-pointer"
        >
          <OracleIcon name="arrow_back" size={20} />
          Return to The Scroll
        </Link>
      </div>
    );
  }

  const priorityClass = PRIORITY_COLORS[feature.suggested_priority] || PRIORITY_COLORS.normal;
  const scopeClass = SCOPE_COLORS[feature.scope] || SCOPE_COLORS.unknown;

  return (
    <div className="p-4 lg:p-6">
      {/* 3-Panel Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel — Flow Process Context */}
        <aside className="w-full lg:w-1/4 flex-shrink-0">
          <div className="bg-oracle-card border border-oracle-border rounded-lg p-4 sticky top-20">
            {/* Panel Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-oracle-border">
              <OracleIcon name="account_tree" size={20} className="text-oracle-gold" />
              <h2 className="font-oracle-display text-sm text-oracle-text">Flow Process</h2>
            </div>

            {/* Flow Steps */}
            {relevantSteps.length > 0 ? (
              <FlowStepper steps={relevantSteps} />
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <OracleIcon name="route" size={32} className="text-oracle-faint mb-2" />
                <p className="text-oracle-faint text-xs font-oracle-body">
                  No flow process data available
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Center Panel — Main Requirement Content */}
        <main className="w-full lg:w-2/4 min-w-0">
          <div className="bg-oracle-card border border-oracle-border rounded-lg p-6">
            {/* Header */}
            <div className="mb-6">
              {/* Badge row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded bg-oracle-gold/10 border border-oracle-gold/30 text-oracle-gold font-oracle-mono text-xs">
                  REQ-{featureIndex + 1}
                </span>
                <span className="px-2 py-0.5 rounded bg-oracle-panel border border-oracle-border text-oracle-muted font-oracle-mono text-xs capitalize">
                  {feature.requirement_type === 'functional' ? 'Functional' : 'Non-Functional'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-oracle-mono border ${priorityClass}`}>
                  {feature.suggested_priority}
                </span>
              </div>

              {/* Feature Name */}
              <h1 className="font-oracle-display text-oracle-headline-lg text-oracle-text mb-2">
                {feature.name}
              </h1>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2">
                {feature.scope && (
                  <span className={`px-2 py-0.5 rounded text-xs font-oracle-mono border ${scopeClass}`}>
                    {feature.scope.replace('_', ' ')}
                  </span>
                )}
                {feature.user_roles && feature.user_roles.length > 0 && (
                  feature.user_roles.map((role) => (
                    <span
                      key={role}
                      className="px-2 py-0.5 rounded bg-oracle-sapphire/10 border border-oracle-sapphire/30 text-oracle-sapphire font-oracle-mono text-xs"
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
                <p className="font-oracle-body text-oracle-body-md text-oracle-text/90 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )}

            {/* Detail Fields */}
            <div className="space-y-5">
              <DetailField
                icon="swap_horiz"
                label="Business Flow"
                value={feature.business_flow}
              />
              <DetailField
                icon="check_circle"
                label="Precondition"
                value={feature.precondition}
              />
              <DetailField
                icon="flag"
                label="Postcondition"
                value={feature.postcondition}
              />
              <DetailField
                icon="group"
                label="User Roles"
                value={feature.user_roles?.length ? feature.user_roles.join(', ') : null}
              />
              <DetailField
                icon="settings"
                label="Impacted Process"
                value={feature.impacted_process}
              />
              <DetailField
                icon="target"
                label="Scope"
                value={feature.scope ? feature.scope.replace('_', ' ') : null}
              />
              <DetailField
                icon="account_balance"
                label="Accounting Impact"
                value={feature.accounting_impact}
              />
            </div>

            {/* Navigation: Previous / Next */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-oracle-border">
              {prevFeature ? (
                <button
                  onClick={() => router.push(`/oracle/reveal/${prevFeature.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-oracle-panel border border-oracle-border rounded hover:border-oracle-gold/40 transition-colors cursor-pointer"
                >
                  <OracleIcon name="arrow_back" size={16} className="text-oracle-gold" />
                  <span className="font-oracle-body text-sm text-oracle-muted">Previous</span>
                </button>
              ) : (
                <div />
              )}
              {nextFeature ? (
                <button
                  onClick={() => router.push(`/oracle/reveal/${nextFeature.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-oracle-panel border border-oracle-border rounded hover:border-oracle-gold/40 transition-colors cursor-pointer"
                >
                  <span className="font-oracle-body text-sm text-oracle-muted">Next</span>
                  <OracleIcon name="arrow_forward" size={16} className="text-oracle-gold" />
                </button>
              ) : (
                <div />
              )}
            </div>
          </div>
        </main>

        {/* Right Panel — Oracle's Notes */}
        <aside className="w-full lg:w-1/4 flex-shrink-0">
          <div className="bg-oracle-card border border-oracle-border rounded-lg p-4 sticky top-20">
            {/* Panel Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-oracle-border">
              <OracleIcon name="menu_book" size={20} className="text-oracle-gold" />
              <h2 className="font-oracle-display text-sm text-oracle-text">Oracle&apos;s Notes</h2>
            </div>

            {/* Risk */}
            {feature.risks && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <OracleIcon name="warning" size={14} className="text-oracle-high" />
                  <span className="font-oracle-mono text-xs text-oracle-muted uppercase tracking-wider">
                    Risks
                  </span>
                </div>
                <p className="text-oracle-text/80 text-sm font-oracle-body leading-relaxed bg-oracle-panel border border-oracle-border rounded p-3">
                  {feature.risks}
                </p>
              </div>
            )}

            {/* Priority */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <OracleIcon name="priority_high" size={14} className="text-oracle-gold" />
                <span className="font-oracle-mono text-xs text-oracle-muted uppercase tracking-wider">
                  Priority
                </span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-oracle-mono border ${priorityClass}`}>
                {feature.suggested_priority}
              </span>
            </div>

            {/* Pilot Status */}
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <OracleIcon name="science" size={14} className="text-oracle-sapphire" />
                <span className="font-oracle-mono text-xs text-oracle-muted uppercase tracking-wider">
                  Pilot Status
                </span>
              </div>
              <span className="inline-block px-3 py-1 rounded bg-oracle-panel border border-oracle-border text-oracle-text text-xs font-oracle-mono">
                {PILOT_LABELS[feature.pilot_status] || feature.pilot_status}
              </span>
            </div>

            {/* Improvements Section */}
            {extras.improvements.length > 0 && (
              <div className="mb-4 border-t border-oracle-border pt-4">
                <button
                  onClick={() => setImprovementsOpen(!improvementsOpen)}
                  className="flex items-center justify-between w-full mb-2 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <OracleIcon name="lightbulb" size={14} className="text-oracle-gold" />
                    <span className="font-oracle-mono text-xs text-oracle-muted uppercase tracking-wider">
                      Improvements
                    </span>
                  </div>
                  <OracleIcon
                    name={improvementsOpen ? 'expand_less' : 'expand_more'}
                    size={16}
                    className="text-oracle-faint"
                  />
                </button>
                {improvementsOpen && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {extras.improvements.map((item, i) => (
                      <div
                        key={i}
                        className="bg-oracle-panel border border-oracle-border rounded p-2"
                      >
                        <p className="text-oracle-text text-xs font-oracle-body font-medium">
                          {item.title}
                        </p>
                        <p className="text-oracle-faint text-xs font-oracle-body mt-0.5 line-clamp-2">
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
              <div className="border-t border-oracle-border pt-4">
                <button
                  onClick={() => setQuestionsOpen(!questionsOpen)}
                  className="flex items-center justify-between w-full mb-2 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <OracleIcon name="help" size={14} className="text-oracle-sapphire" />
                    <span className="font-oracle-mono text-xs text-oracle-muted uppercase tracking-wider">
                      Questions
                    </span>
                  </div>
                  <OracleIcon
                    name={questionsOpen ? 'expand_less' : 'expand_more'}
                    size={16}
                    className="text-oracle-faint"
                  />
                </button>
                {questionsOpen && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {extras.questions.map((item, i) => (
                      <div
                        key={i}
                        className="bg-oracle-panel border border-oracle-border rounded p-2"
                      >
                        <p className="text-oracle-text text-xs font-oracle-body">
                          {item.question}
                        </p>
                        <p className="text-oracle-faint text-xs font-oracle-body mt-0.5">
                          {item.category} · {item.target_role}
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
    <div className="bg-oracle-panel border border-oracle-border rounded p-4">
      <div className="flex items-center gap-2 mb-2">
        <OracleIcon name={icon} size={16} className="text-oracle-gold" />
        <span className="font-oracle-mono text-xs text-oracle-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="font-oracle-body text-sm text-oracle-text/90 leading-relaxed">
        {value}
      </p>
    </div>
  );
}
