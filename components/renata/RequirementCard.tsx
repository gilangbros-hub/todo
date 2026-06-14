'use client';

import { BrdFeature } from '@/lib/types';
import { Compass, CheckCircle, ArrowRight } from 'lucide-react';

interface RequirementCardProps {
  feature: BrdFeature;
  index: number;
  variant?: 'compact' | 'expanded';
  onSelect?: (featureId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  must_have: 'bg-sys-primary/20 text-sys-primary border-sys-primary/30',
  should_have: 'bg-sys-secondary/20 text-sys-secondary border-sys-secondary/30',
  could_have: 'bg-sys-warning/20 text-sys-warning border-sys-warning/30',
  wont_have: 'bg-sys-success/20 text-sys-success border-sys-success/30',
};

export function RequirementCard({ feature, index, variant = 'expanded', onSelect }: RequirementCardProps) {
  const priorityClass = PRIORITY_COLORS[feature.priority_moscow] || PRIORITY_COLORS.should_have;

  return (
    <div
      onClick={() => onSelect?.(feature.id)}
      className={`
        group relative bg-sys-elevated border border-sys-border rounded-lg p-5
        hover:border-sys-primary/40 hover:shadow-neo-glow
        transition-all duration-300 cursor-pointer
      `}
      style={{
        animation: `flip-in 0.4s ease-out ${index * 0.08}s both`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 px-2 py-0.5 rounded bg-sys-primary/10 border border-sys-primary/30 text-sys-primary font-mono text-xs">
            {feature.feature_id || `F-${index + 1}`}
          </span>
          <h3 className="font-sans font-semibold text-sys-text text-sm leading-tight truncate">
            {feature.name}
          </h3>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-mono border ${priorityClass}`}>
          {feature.priority_moscow.replace('_', ' ')}
        </span>
      </div>

      {/* Description */}
      {feature.description && (
        <p className="text-sys-muted text-sm font-sans leading-relaxed mb-4 line-clamp-2">
          {feature.description}
        </p>
      )}

      {/* Detail Split (expanded variant) */}
      {variant === 'expanded' && (feature.capability_gap || feature.acceptance_criteria?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-sys-border">
          {feature.capability_gap && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-sys-muted font-mono uppercase tracking-wider">
                <Compass size={14} className="text-sys-secondary shrink-0" />
                Capability Gap
              </div>
              <p className="text-sys-text/80 text-xs font-sans leading-relaxed line-clamp-3">
                {feature.capability_gap}
              </p>
            </div>
          )}
          {feature.acceptance_criteria?.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-sys-muted font-mono uppercase tracking-wider">
                <CheckCircle size={14} className="text-sys-primary shrink-0" />
                Acceptance Criteria
              </div>
              <p className="text-sys-text/80 text-xs font-sans leading-relaxed line-clamp-3">
                {feature.acceptance_criteria[0]} {feature.acceptance_criteria.length > 1 ? `(+${feature.acceptance_criteria.length - 1} more)` : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hover arrow indicator */}
      <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight size={16} className="text-sys-primary/60 shrink-0" />
      </div>
    </div>
  );
}
