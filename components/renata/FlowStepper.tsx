'use client';

import { useState } from 'react';
import { FlowStep } from '@/lib/renata/types';
import { Circle, Play, StopCircle, Diamond, GitMerge, GitFork, GitPullRequest, HelpCircle, User, ArrowRight, CheckCircle } from 'lucide-react';

interface FlowStepperProps {
  steps: FlowStep[];
}

const STEP_TYPE_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  initial: {
    border: 'border-sys-success',
    bg: 'bg-sys-success/20',
    text: 'text-sys-success',
  },
  final: {
    border: 'border-sys-error',
    bg: 'bg-sys-error/20',
    text: 'text-sys-error',
  },
  decision: {
    border: 'border-sys-warning',
    bg: 'bg-sys-warning/20',
    text: 'text-sys-warning',
  },
  merge: {
    border: 'border-sys-warning/50',
    bg: 'bg-sys-warning/10',
    text: 'text-sys-warning/80',
  },
  action: {
    border: 'border-sys-primary/50',
    bg: 'bg-sys-primary/10',
    text: 'text-sys-primary',
  },
  fork: {
    border: 'border-sys-secondary/50',
    bg: 'bg-sys-secondary/10',
    text: 'text-sys-secondary',
  },
  join: {
    border: 'border-sys-secondary/50',
    bg: 'bg-sys-secondary/10',
    text: 'text-sys-secondary',
  },
};

const STEP_TYPE_ICON_MAP: Record<string, (props: { size?: number; className?: string }) => JSX.Element> = {
  initial: (p) => <Play {...p} />,
  final: (p) => <StopCircle {...p} />,
  decision: (p) => <GitFork {...p} />,
  merge: (p) => <GitMerge {...p} />,
  action: (p) => <Circle {...p} />,
  fork: (p) => <GitFork {...p} />,
  join: (p) => <GitPullRequest {...p} />,
};

export function FlowStepper({ steps }: FlowStepperProps) {
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const handleStepClick = (stepId: string) => {
    setActiveStepId((prev) => (prev === stepId ? null : stepId));
  };

  return (
    <div className="relative">
      {/* Gold thread connector line */}
      <div
        className="absolute left-3 top-0 bottom-0 w-px"
        style={{
          background: 'linear-gradient(to bottom, rgba(236, 193, 79, 0.1), rgba(236, 193, 79, 0.4), rgba(236, 193, 79, 0.1))',
        }}
      />

      {/* Steps */}
      <div className="flex flex-col gap-2">
        {steps.map((step: any) => {
          const isActive = activeStepId === step.id;
          const colors = STEP_TYPE_COLORS[step.type] || STEP_TYPE_COLORS.action;
          const isUserActor = step.actor?.toLowerCase().includes('user') || step.actor?.toLowerCase().includes('pengguna');

          return (
            <div
              key={step.id}
              className="relative flex items-start gap-4 group cursor-pointer"
              onClick={() => handleStepClick(step.id)}
            >
              {/* Node indicator */}
              <div className="relative z-10 flex-shrink-0">
                {isActive ? (
                  <div className="w-6 h-6 rounded-full bg-sys-primary shadow-neo-glow ring-4 ring-sys-surface flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-sys-bg" />
                  </div>
                ) : isUserActor ? (
                  <div className={`w-6 h-6 rounded-full bg-sys-surface border ${colors.border} flex items-center justify-center transition-all`}>
                    <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                  </div>
                ) : (
                  <div className={`w-6 h-6 rounded bg-sys-surface border border-sys-secondary/50 flex items-center justify-center transition-all`}>
                    <div className="w-2 h-2 rounded-sm bg-sys-secondary/30" />
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0 pb-2">
                {isActive ? (
                  /* Expanded state */
                  <div className={`bg-sys-surface border ${colors.border}/60 rounded shadow-neo-glow overflow-hidden transition-all duration-300 ease-in-out`}>
                    {/* Gold left border accent */}
                    <div className="flex">
                      <div className={`w-1 ${colors.bg} flex-shrink-0`} />
                      <div className="flex-1 p-4">
                        {/* Header with ID and status */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono border ${colors.border} ${colors.bg} ${colors.text}`}>
                            {step.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-mono ${colors.bg} ${colors.text} capitalize`}>
                            {step.type}
                          </span>
                        </div>

                        {/* Full action description */}
                        <p className="font-sans text-sys-text text-sm leading-relaxed mb-4">
                          {step.action}
                        </p>

                        {/* Condition (if Decision) */}
                        {step.condition && (
                          <div className="mb-4 bg-sys-warning/10 border border-sys-warning/30 p-3 rounded">
                            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sys-warning mb-1">
                              <HelpCircle size={14} className="text-sys-warning shrink-0" />
                              CONDITION
                            </div>
                            <p className="text-sys-text/90 text-sm font-sans">
                              {step.condition}
                            </p>
                          </div>
                        )}

                        {/* Actor split */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-sys-border">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sys-primary">
                              <User size={14} className="text-sys-primary shrink-0" />
                              ACTOR
                            </div>
                            <p className="text-sys-text/70 text-xs font-sans leading-relaxed">
                              {step.actor || 'System'}
                            </p>
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sys-secondary">
                              <ArrowRight size={14} className="text-sys-secondary shrink-0" />
                              NEXT STEPS
                            </div>
                            <p className="text-sys-text/70 text-xs font-sans leading-relaxed">
                              {step.next && step.next.length > 0 ? step.next.join(', ') : 'None'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Collapsed state */
                  <div className="flex items-center gap-3 py-1.5 group-hover:translate-x-2 transition-transform duration-200">
                    <span className="font-mono text-neo-small text-sys-faint flex-shrink-0">
                      {step.id}
                    </span>
                    <span className="font-sans text-lg font-semibold text-sys-faint truncate group-hover:text-sys-muted transition-colors">
                      {step.action}
                    </span>
                    {(() => {
                      const IconEl = STEP_TYPE_ICON_MAP[step.type] || Circle;
                      return <IconEl size={14} className={`shrink-0 ${colors.text} opacity-60`} />;
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
