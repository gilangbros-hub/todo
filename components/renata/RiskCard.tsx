'use client';

import { RiskItem } from '@/lib/renata/types';
import { AlertTriangle, BarChart3, Shield } from 'lucide-react';

interface RiskCardProps {
  risk: RiskItem;
  index: number;
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-sys-error',
  high: 'border-l-sys-warning',
  medium: 'border-l-sys-warning',
  low: 'border-l-sys-success',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-sys-error/20 text-sys-error border-sys-error/30',
  high: 'bg-sys-warning/20 text-sys-warning border-sys-warning/30',
  medium: 'bg-sys-warning/20 text-sys-warning border-sys-warning/30',
  low: 'bg-sys-success/20 text-sys-success border-sys-success/30',
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
        bg-sys-surface border border-sys-border rounded overflow-hidden
        border-l-4 ${borderClass}
        transition-all duration-300 ${glowClass}
        break-inside-avoid mb-4
      `}
    >
      {/* Header */}
      <div className="bg-sys-elevated p-4 border-b border-sys-border flex items-center justify-between gap-3">
        <span className="font-mono text-neo-small text-sys-muted">
          RSK-{index + 1}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono border ${badgeClass}`}>
          <AlertTriangle size={14} />
          {risk.impact}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Risk Description */}
        <p className="text-sys-text text-sm font-sans leading-relaxed mb-4">
          {risk.risk_event}
        </p>

        {/* Likelihood badge */}
        {risk.likelihood && (
          <div className="mb-4">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sys-surface text-sys-muted text-xs font-mono border border-sys-border">
              <BarChart3 size={12} />
              Likelihood: {risk.likelihood}
            </span>
          </div>
        )}

        {/* Mitigation Protocol */}
        <div className="bg-sys-surface p-3 rounded border-l-2 border-sys-primary">
          <div className="flex items-center gap-1.5 mb-2">
            <Shield size={14} className="text-sys-primary" />
            <span className="font-mono text-xs text-sys-primary uppercase tracking-wider">
              Mitigation Protocol
            </span>
          </div>
          <p className="text-sys-text/80 text-xs font-sans leading-relaxed">
            {risk.mitigation_strategy}
          </p>
        </div>
      </div>
    </div>
  );
}
