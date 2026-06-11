'use client';

import { BrdFeature } from '@/lib/types';
import { OracleIcon } from './OracleIcon';

interface RequirementCardProps {
  feature: BrdFeature;
  index: number;
  variant?: 'compact' | 'expanded';
  onSelect?: (featureId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  normal: 'bg-oracle-low/20 text-oracle-low border-oracle-low/30',
  rare: 'bg-oracle-sapphire/20 text-oracle-sapphire border-oracle-sapphire/30',
  epic: 'bg-oracle-medium/20 text-oracle-medium border-oracle-medium/30',
  legendary: 'bg-oracle-gold/20 text-oracle-gold border-oracle-gold/30',
};

export function RequirementCard({ feature, index, variant = 'expanded', onSelect }: RequirementCardProps) {
  const priorityClass = PRIORITY_COLORS[feature.suggested_priority] || PRIORITY_COLORS.normal;

  return (
    <div
      onClick={() => onSelect?.(feature.id)}
      className={`
        group relative bg-oracle-card border border-oracle-border rounded-lg p-5
        hover:border-oracle-gold/40 hover:shadow-oracle-glow-sm
        transition-all duration-300 cursor-pointer
      `}
      style={{
        animation: `flip-in 0.4s ease-out ${index * 0.08}s both`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-oracle-gold/10 border border-oracle-gold/30 flex items-center justify-center text-oracle-gold font-oracle-mono text-xs">
            {index + 1}
          </span>
          <h3 className="font-oracle-display text-oracle-text text-sm leading-tight truncate">
            {feature.name}
          </h3>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-oracle-mono border ${priorityClass}`}>
          {feature.suggested_priority}
        </span>
      </div>

      {/* Description */}
      {feature.description && (
        <p className="text-oracle-muted text-sm font-oracle-body leading-relaxed mb-4 line-clamp-2">
          {feature.description}
        </p>
      )}

      {/* Action / Reaction Split (expanded variant) */}
      {variant === 'expanded' && (feature.as_is || feature.to_be) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-oracle-border">
          {feature.as_is && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-oracle-muted font-oracle-mono uppercase tracking-wider">
                <OracleIcon name="person" className="text-oracle-sapphire" size={14} />
                Aksi User
              </div>
              <p className="text-oracle-text/80 text-xs font-oracle-body leading-relaxed line-clamp-3">
                {feature.as_is}
              </p>
            </div>
          )}
          {feature.to_be && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-oracle-muted font-oracle-mono uppercase tracking-wider">
                <OracleIcon name="memory" className="text-oracle-gold" size={14} />
                Reaksi Sistem
              </div>
              <p className="text-oracle-text/80 text-xs font-oracle-body leading-relaxed line-clamp-3">
                {feature.to_be}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hover arrow indicator */}
      <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <OracleIcon name="arrow_forward" className="text-oracle-gold/60" size={16} />
      </div>
    </div>
  );
}
