'use client';

import { useState, useMemo } from 'react';
import { useOracle } from '@/lib/oracle/context';
import { OracleIcon } from '@/components/oracle/OracleIcon';
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

function FeatureCard({ feature, index }: { feature: BrdFeature; index: number }) {
  const priorityClass = PRIORITY_COLORS[feature.suggested_priority] || PRIORITY_COLORS.normal;
  const scopeClass = SCOPE_COLORS[feature.scope] || SCOPE_COLORS.unknown;

  return (
    <div
      className="bg-oracle-card border border-oracle-border rounded-lg p-6 hover:border-oracle-gold/40 hover:shadow-oracle-glow-sm transition-all duration-300"
      style={{ animation: `flip-in 0.4s ease-out ${index * 0.06}s both` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-oracle-display text-oracle-text text-base leading-tight">
          {feature.name}
        </h3>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-oracle-mono border ${priorityClass}`}>
          {feature.suggested_priority}
        </span>
      </div>

      {/* Description */}
      {feature.description && (
        <p className="text-oracle-muted text-sm font-oracle-body leading-relaxed mb-4">
          {feature.description}
        </p>
      )}

      {/* Aksi User panel */}
      {feature.as_is && (
        <div className="border-l-2 border-oracle-gold pl-4 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-oracle-muted font-oracle-mono uppercase tracking-wider mb-1">
            <OracleIcon name="person" className="text-oracle-gold" size={14} />
            Aksi User
          </div>
          <p className="text-oracle-text/80 text-sm font-oracle-body leading-relaxed">
            {feature.as_is}
          </p>
        </div>
      )}

      {/* Reaksi Sistem panel */}
      {feature.to_be && (
        <div className="border-l-2 border-oracle-sapphire pl-4 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-oracle-muted font-oracle-mono uppercase tracking-wider mb-1">
            <OracleIcon name="memory" className="text-oracle-sapphire" size={14} />
            Reaksi Sistem
          </div>
          <p className="text-oracle-text/80 text-sm font-oracle-body leading-relaxed">
            {feature.to_be}
          </p>
        </div>
      )}

      {/* Footer: Scope badge + user_roles tags */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-oracle-border">
        <span className={`px-2 py-0.5 rounded-full text-xs font-oracle-mono border ${scopeClass}`}>
          {feature.scope.replace('_', ' ')}
        </span>
        {feature.user_roles?.map((role) => (
          <span
            key={role}
            className="px-2 py-0.5 rounded-full text-xs font-oracle-mono bg-oracle-panel text-oracle-muted border border-oracle-border"
          >
            {role}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TomePage() {
  const { features } = useOracle();
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 6;

  const allFeatures = useMemo(() => features, [features]);
  const totalPages = Math.ceil(allFeatures.length / pageSize);
  const pagedFeatures = useMemo(
    () => allFeatures.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [allFeatures, currentPage]
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-oracle-display text-oracle-hero text-oracle-gold mb-2">
          Tome of Artifacts
        </h1>
        <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
          Complete Feature Compendium — Functional &amp; Non-Functional
        </p>
      </div>

      {/* Feature Cards or Empty State */}
      {allFeatures.length > 0 ? (
        <>
          <div className="flex flex-col gap-6">
            {pagedFeatures.map((feature, index) => (
              <FeatureCard key={feature.id} feature={feature} index={index} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm font-oracle-mono text-oracle-muted hover:text-oracle-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <OracleIcon name="chevron_left" size={16} />
                Prev
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                      i === currentPage
                        ? 'bg-oracle-gold scale-125'
                        : 'bg-oracle-faint hover:bg-oracle-muted'
                    }`}
                    aria-label={`Page ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-oracle-mono text-oracle-muted hover:text-oracle-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
                <OracleIcon name="chevron_right" size={16} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <OracleIcon name="auto_stories" size={64} className="text-oracle-faint mb-4" />
          <p className="font-oracle-body text-oracle-body-lg text-oracle-muted">
            No features identified
          </p>
          <p className="font-oracle-body text-oracle-body-md text-oracle-faint mt-2">
            Upload a BRD document in The Gatehouse to begin analysis.
          </p>
        </div>
      )}
    </div>
  );
}
