'use client';

import { useMemo, useState } from 'react';
import { useOracle } from '@/lib/oracle/context';
import { RiskCard } from '@/components/oracle/RiskCard';
import { OracleIcon } from '@/components/oracle/OracleIcon';
import { RiskItem } from '@/lib/oracle/types';

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const FILTER_BUTTONS: { level: SeverityLevel; label: string; color: string; activeColor: string }[] = [
  { level: 'critical', label: 'CRITICAL', color: 'text-oracle-critical border-oracle-critical/30', activeColor: 'bg-oracle-critical/20 text-oracle-critical border-oracle-critical' },
  { level: 'high', label: 'HIGH', color: 'text-oracle-high border-oracle-high/30', activeColor: 'bg-oracle-high/20 text-oracle-high border-oracle-high' },
  { level: 'medium', label: 'MEDIUM', color: 'text-oracle-medium border-oracle-medium/30', activeColor: 'bg-oracle-medium/20 text-oracle-medium border-oracle-medium' },
  { level: 'low', label: 'LOW', color: 'text-oracle-low border-oracle-low/30', activeColor: 'bg-oracle-low/20 text-oracle-low border-oracle-low' },
];

function sortBySeverity(risks: RiskItem[]): RiskItem[] {
  return [...risks].sort((a, b) => {
    const orderA = SEVERITY_ORDER[a.impact] ?? 4;
    const orderB = SEVERITY_ORDER[b.impact] ?? 4;
    return orderA - orderB;
  });
}

export default function TrialsPage() {
  const { extras } = useOracle();
  const [activeFilters, setActiveFilters] = useState<Set<SeverityLevel>>(new Set());

  const risks = extras.risk_analysis;

  const filteredAndSortedRisks = useMemo(() => {
    let filtered = risks;
    if (activeFilters.size > 0) {
      filtered = risks.filter((r) => activeFilters.has(r.impact));
    }
    return sortBySeverity(filtered);
  }, [risks, activeFilters]);

  const toggleFilter = (level: SeverityLevel) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const isAllActive = activeFilters.size === 0;

  const clearFilters = () => {
    setActiveFilters(new Set());
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-oracle-display text-oracle-hero text-oracle-gold mb-2">
          Trials &amp; Tribulations
        </h1>
        <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
          Strategic Risk Analysis and Mitigation Protocols
        </p>
      </div>

      {/* Severity Filter Buttons */}
      {risks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            onClick={clearFilters}
            className={`
              px-3 py-1.5 rounded text-xs font-oracle-mono uppercase tracking-wider border
              transition-all duration-200 cursor-pointer
              ${isAllActive
                ? 'bg-oracle-gold/20 text-oracle-gold border-oracle-gold'
                : 'text-oracle-muted border-oracle-border hover:border-oracle-gold/40'
              }
            `}
          >
            ALL
          </button>
          {FILTER_BUTTONS.map(({ level, label, color, activeColor }) => (
            <button
              key={level}
              onClick={() => toggleFilter(level)}
              className={`
                px-3 py-1.5 rounded text-xs font-oracle-mono uppercase tracking-wider border
                transition-all duration-200 cursor-pointer
                ${activeFilters.has(level) ? activeColor : `${color} hover:opacity-80`}
              `}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Masonry Grid */}
      {filteredAndSortedRisks.length > 0 ? (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
          {filteredAndSortedRisks.map((risk, index) => (
            <RiskCard key={index} risk={risk} index={index} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <OracleIcon name="verified_user" size={64} className="text-oracle-faint mb-4" />
          <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
            No risks identified
          </p>
          <p className="font-oracle-body text-oracle-body-md text-oracle-faint mt-2">
            {risks.length === 0
              ? 'Upload a BRD document in The Gatehouse to begin analysis.'
              : 'No risks match the selected severity filters.'}
          </p>
        </div>
      )}
    </div>
  );
}
