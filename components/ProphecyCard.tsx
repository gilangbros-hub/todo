'use client';

import { useState } from 'react';
import { Priority, PilotStatus, PILOT_STATUS_CONFIG } from '@/lib/types';

interface ProphecyCardProps {
  name: string;
  description: string | null;
  pilotStatus: PilotStatus;
  retention: string | null;
  businessFlow: string | null;
  asIs: string | null;
  toBe: string | null;
  risks: string | null;
  suggestedPriority: Priority;
}

const PRIORITY_STYLES: Record<Priority, { border: string; glow: string; label: string }> = {
  normal: { border: 'border-rpg-normal', glow: 'shadow-normal', label: 'Normal' },
  rare: { border: 'border-rpg-rare', glow: 'shadow-rare', label: 'Rare' },
  epic: { border: 'border-rpg-epic', glow: 'shadow-epic', label: 'Epic' },
  legendary: { border: 'border-rpg-legendary', glow: 'shadow-legendary', label: 'Legendary' },
};

export default function ProphecyCard({
  name,
  description,
  pilotStatus,
  retention,
  businessFlow,
  asIs,
  toBe,
  risks,
  suggestedPriority,
}: ProphecyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = PRIORITY_STYLES[suggestedPriority];
  const pilotConfig = PILOT_STATUS_CONFIG[pilotStatus];

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
          {name}
        </h3>
        <span className={`font-retro text-xs px-2 py-0.5 pixel-border ${style.border}`}>
          {style.label}
        </span>
      </div>

      {/* Description */}
      {description && (
        <p className="font-retro text-sm text-gray-300 mb-3">{description}</p>
      )}

      {/* Pilot Status Badge */}
      <div className="mb-3">
        <span className={`font-retro text-xs ${pilotConfig.color}`}>
          ⚑ {pilotConfig.label}
        </span>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-3 mt-3 pt-3 border-t border-rpg-border animate-slide-in">
          {businessFlow && (
            <Section title="The Ritual (Business Flow)" content={businessFlow} />
          )}
          {asIs && (
            <Section title="The Old Ways (As-Is)" content={asIs} />
          )}
          {toBe && (
            <Section title="The Vision (To-Be)" content={toBe} />
          )}
          {retention && (
            <Section title="Lasting Power (Retention)" content={retention} />
          )}
          {risks && (
            <Section title="Omens (Risks)" content={risks} emoji="⚠" />
          )}
        </div>
      )}

      {/* Expand hint */}
      <p className="font-retro text-xs text-gray-500 mt-2 text-center">
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
      <p className="font-retro text-sm text-gray-300 whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}
