'use client';

import { useState } from 'react';
import { Priority } from '@/lib/types';

interface ProphecyCardProps {
  featureNumber?: number;
  name: string;
  description: string | null;
  businessFlow: string | null;
  asIs: string | null;
  toBe: string | null;
  risks: string | null;
  suggestedPriority: Priority;
  precondition?: string | null;
  postcondition?: string | null;
  userRoles?: string[];
  impactedProcess?: string | null;
  scope?: 'in_scope' | 'out_of_scope' | 'unknown';
  accountingImpact?: string | null;
}

const PRIORITY_STYLES: Record<Priority, { border: string; glow: string; label: string }> = {
  normal: { border: 'border-rpg-normal', glow: 'shadow-normal', label: 'Normal' },
  rare: { border: 'border-rpg-rare', glow: 'shadow-rare', label: 'Rare' },
  epic: { border: 'border-rpg-epic', glow: 'shadow-epic', label: 'Epic' },
  legendary: { border: 'border-rpg-legendary', glow: 'shadow-legendary', label: 'Legendary' },
};

export default function ProphecyCard({
  featureNumber,
  name,
  description,
  businessFlow,
  asIs,
  toBe,
  risks,
  suggestedPriority,
  precondition,
  postcondition,
  userRoles,
  impactedProcess,
  scope,
  accountingImpact,
}: ProphecyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = PRIORITY_STYLES[suggestedPriority];

  const hasTransformation = asIs || toBe;
  const hasContract = precondition || postcondition;

  return (
    <div
      className={`rpg-card ${style.border} ${style.glow} p-4 cursor-pointer transition-all hover:translate-y-[-2px]`}
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
      aria-expanded={expanded}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-pixel text-[10px] text-white leading-relaxed flex-1">
          {featureNumber !== undefined && (
            <span className="text-rpg-rare mr-1">#{featureNumber}</span>
          )}
          {name}
        </h3>
        <span className={`font-retro text-xs px-2 py-0.5 pixel-border ${style.border} flex-shrink-0`}>
          {style.label}
        </span>
      </div>

      {/* Summary (description) */}
      {description && (
        <p className="font-retro text-sm text-gray-200 mb-3 leading-relaxed">{description}</p>
      )}

      {/* Badges row: scope + roles */}
      <div className="mb-1 flex flex-wrap gap-1.5 items-center">
        {scope && scope !== 'unknown' && (
          <span className={`font-retro text-xs px-1.5 py-0.5 rounded ${
            scope === 'in_scope' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {scope === 'in_scope' ? '✓ In Scope' : '✗ Out of Scope'}
          </span>
        )}
        {userRoles && userRoles.length > 0 && userRoles.map((role, i) => (
          <span key={i} className="font-retro text-[11px] px-1.5 py-0.5 bg-rpg-dark border border-rpg-border rounded text-gray-300">
            {role}
          </span>
        ))}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-4 mt-3 pt-3 border-t border-rpg-border animate-slide-in">

          {/* Business Transformation: As-Is → To-Be */}
          {hasTransformation && (
            <div>
              <p className="font-pixel text-[8px] text-rpg-epic mb-2">
                ⚒ Business Transformation
              </p>
              <div className="space-y-2">
                {asIs && (
                  <div className="bg-rpg-dark/50 border-l-2 border-gray-500 pl-3 py-1.5">
                    <p className="font-retro text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Before — As-Is</p>
                    <p className="font-retro text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{asIs}</p>
                  </div>
                )}
                {toBe && (
                  <div className="bg-green-500/5 border-l-2 border-green-500 pl-3 py-1.5">
                    <p className="font-retro text-[11px] text-green-400 uppercase tracking-wide mb-0.5">After — To-Be</p>
                    <p className="font-retro text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{toBe}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Execution Contract: Precondition → Postcondition */}
          {hasContract && (
            <div>
              <p className="font-pixel text-[8px] text-rpg-rare mb-2">
                🔗 Execution Contract
              </p>
              <div className="space-y-2">
                {precondition && (
                  <div className="bg-rpg-dark/50 border-l-2 border-blue-500 pl-3 py-1.5">
                    <p className="font-retro text-[11px] text-blue-400 uppercase tracking-wide mb-0.5">🔑 Requires (Precondition)</p>
                    <p className="font-retro text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{precondition}</p>
                  </div>
                )}
                {postcondition && (
                  <div className="bg-rpg-dark/50 border-l-2 border-purple-500 pl-3 py-1.5">
                    <p className="font-retro text-[11px] text-purple-400 uppercase tracking-wide mb-0.5">🎯 Guarantees (Postcondition)</p>
                    <p className="font-retro text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{postcondition}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* How it works */}
          {businessFlow && (
            <Section title="How It Works (Flow)" content={businessFlow} emoji="📖" />
          )}
          {impactedProcess && (
            <Section title="Part Of Process" content={impactedProcess} emoji="⚙" />
          )}
          {accountingImpact && (
            <Section title="Accounting Impact" content={accountingImpact} emoji="💰" />
          )}
          {risks && (
            <Section title="Risks & Dependencies" content={risks} emoji="⚠" />
          )}
        </div>
      )}

      {/* Expand hint */}
      <p className="font-retro text-xs text-gray-500 mt-3 text-center">
        {expanded ? '▲ Collapse' : '▼ Tap to reveal prophecy details'}
      </p>
    </div>
  );
}

function Section({ title, content, emoji = '📖' }: { title: string; content: string; emoji?: string }) {
  return (
    <div>
      <p className="font-pixel text-[8px] text-rpg-rare mb-1">
        {emoji} {title}
      </p>
      <p className="font-retro text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </div>
  );
}
