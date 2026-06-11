'use client';

import { RiskItem } from '@/lib/oracle/types';
import { OracleIcon } from './OracleIcon';

interface RiskCardProps {
  risk: RiskItem;
  index: number;
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-oracle-critical',
  high: 'border-l-oracle-high',
  medium: 'border-l-oracle-medium',
  low: 'border-l-oracle-low',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-oracle-critical/20 text-oracle-critical border-oracle-critical/30',
  high: 'bg-oracle-high/20 text-oracle-high border-oracle-high/30',
  medium: 'bg-oracle-medium/20 text-oracle-medium border-oracle-medium/30',
  low: 'bg-oracle-low/20 text-oracle-low border-oracle-low/30',
};

const SEVERITY_ICON: Record<string, string> = {
  critical: 'warning',
  high: 'error',
  medium: 'info',
  low: 'check_circle',
};

const SEVERITY_GLOW: Record<string, string> = {
  critical: 'hover:shadow-[0_0_12px_rgba(231,76,60,0.2)]',
  high: 'hover:shadow-[0_0_12px_rgba(230,126,34,0.2)]',
  medium: 'hover:shadow-[0_0_12px_rgba(243,156,18,0.2)]',
  low: 'hover:shadow-[0_0_12px_rgba(39,174,96,0.2)]',
};

export function RiskCard({ risk, index }: RiskCardProps) {
  const borderClass = SEVERITY_BORDER[risk.impact] || SEVERITY_BORDER.medium;
  const badgeClass = SEVERITY_BADGE[risk.impact] || SEVERITY_BADGE.medium;
  const iconName = SEVERITY_ICON[risk.impact] || SEVERITY_ICON.medium;
  const glowClass = SEVERITY_GLOW[risk.impact] || SEVERITY_GLOW.medium;

  return (
    <div
      className={`
        bg-oracle-stone border border-oracle-border rounded overflow-hidden
        border-l-4 ${borderClass}
        transition-all duration-300 ${glowClass}
        break-inside-avoid mb-4
      `}
    >
      {/* Header */}
      <div className="bg-oracle-card p-4 border-b border-oracle-border flex items-center justify-between gap-3">
        <span className="font-oracle-mono text-oracle-label-mono text-oracle-muted">
          RSK-{index + 1}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-oracle-mono border ${badgeClass}`}>
          <OracleIcon name={iconName} size={14} />
          {risk.impact}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Risk Description */}
        <p className="text-oracle-text text-sm font-oracle-body leading-relaxed mb-4">
          {risk.risk}
        </p>

        {/* Category badge (if present) */}
        {risk.category && (
          <div className="mb-4">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-oracle-panel text-oracle-muted text-xs font-oracle-mono border border-oracle-border">
              <OracleIcon name="category" size={12} />
              {risk.category}
            </span>
          </div>
        )}

        {/* Mitigation Protocol */}
        <div className="bg-oracle-panel p-3 rounded border-l-2 border-oracle-gold">
          <div className="flex items-center gap-1.5 mb-2">
            <OracleIcon name="shield" className="text-oracle-gold" size={14} />
            <span className="font-oracle-mono text-xs text-oracle-gold uppercase tracking-wider">
              Mitigation Protocol
            </span>
          </div>
          <p className="text-oracle-text/80 text-xs font-oracle-body leading-relaxed">
            {risk.mitigation}
          </p>
        </div>
      </div>
    </div>
  );
}
