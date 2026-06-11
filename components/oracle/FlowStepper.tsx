'use client';

import { useState } from 'react';
import { FlowStep } from '@/lib/oracle/types';
import { OracleIcon } from './OracleIcon';

interface FlowStepperProps {
  steps: FlowStep[];
}

const STEP_TYPE_COLORS: Record<FlowStep['type'], { border: string; bg: string; text: string }> = {
  start: {
    border: 'border-oracle-low',
    bg: 'bg-oracle-low/20',
    text: 'text-oracle-low',
  },
  end: {
    border: 'border-oracle-critical',
    bg: 'bg-oracle-critical/20',
    text: 'text-oracle-critical',
  },
  decision: {
    border: 'border-oracle-medium',
    bg: 'bg-oracle-medium/20',
    text: 'text-oracle-medium',
  },
  process: {
    border: 'border-oracle-gold/50',
    bg: 'bg-oracle-gold/10',
    text: 'text-oracle-gold',
  },
};

const STEP_TYPE_ICONS: Record<FlowStep['type'], string> = {
  start: 'play_circle',
  end: 'stop_circle',
  decision: 'diamond',
  process: 'circle',
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
        {steps.map((step) => {
          const isActive = activeStepId === step.id;
          const colors = STEP_TYPE_COLORS[step.type] || STEP_TYPE_COLORS.process;
          const isUserActor = step.actor.toLowerCase().includes('user') || step.actor.toLowerCase().includes('pengguna');

          return (
            <div
              key={step.id}
              className="relative flex items-start gap-4 group cursor-pointer"
              onClick={() => handleStepClick(step.id)}
            >
              {/* Node indicator */}
              <div className="relative z-10 flex-shrink-0">
                {isActive ? (
                  <div className="w-6 h-6 rounded-full bg-oracle-gold shadow-oracle-glow ring-4 ring-oracle-stone flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-oracle-deepest" />
                  </div>
                ) : isUserActor ? (
                  <div className={`w-6 h-6 rounded-full bg-oracle-stone border ${colors.border} flex items-center justify-center transition-all`}>
                    <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                  </div>
                ) : (
                  <div className={`w-6 h-6 rounded bg-oracle-stone border border-oracle-sapphire/50 flex items-center justify-center transition-all`}>
                    <div className="w-2 h-2 rounded-sm bg-oracle-sapphire/30" />
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0 pb-2">
                {isActive ? (
                  /* Expanded state */
                  <div className={`bg-oracle-stone border ${colors.border}/60 rounded shadow-oracle-glow-sm overflow-hidden transition-all duration-300 ease-in-out`}>
                    {/* Gold left border accent */}
                    <div className="flex">
                      <div className={`w-1 ${colors.bg} flex-shrink-0`} />
                      <div className="flex-1 p-4">
                        {/* Header with ID and status */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-oracle-mono border ${colors.border} ${colors.bg} ${colors.text}`}>
                            {step.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-oracle-mono ${colors.bg} ${colors.text} capitalize`}>
                            {step.type}
                          </span>
                        </div>

                        {/* Full action description */}
                        <p className="font-oracle-body text-oracle-text text-sm leading-relaxed mb-4">
                          {step.action}
                        </p>

                        {/* Two-column split: AKSI USER / REAKSI SISTEM */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-oracle-border">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-oracle-mono uppercase tracking-wider text-oracle-gold">
                              <OracleIcon name="person" size={14} className="text-oracle-gold" />
                              AKSI USER
                            </div>
                            <p className="text-oracle-text/70 text-xs font-oracle-body leading-relaxed">
                              {step.actor}
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-oracle-mono uppercase tracking-wider text-oracle-sapphire">
                              <OracleIcon name="memory" size={14} className="text-oracle-sapphire" />
                              REAKSI SISTEM
                            </div>
                            <p className="text-oracle-text/70 text-xs font-oracle-body leading-relaxed">
                              {step.action}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Collapsed state */
                  <div className="flex items-center gap-3 py-1.5 group-hover:translate-x-2 transition-transform duration-200">
                    <span className="font-oracle-mono text-oracle-label-mono text-oracle-faint flex-shrink-0">
                      {step.id}
                    </span>
                    <span className="font-oracle-body text-oracle-headline-md text-oracle-faint truncate group-hover:text-oracle-muted transition-colors">
                      {step.action}
                    </span>
                    <OracleIcon
                      name={STEP_TYPE_ICONS[step.type]}
                      size={14}
                      className={`flex-shrink-0 ${colors.text} opacity-60`}
                    />
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
