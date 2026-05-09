'use client';

import { BattleLogMove, MOVE_TYPE_CONFIG } from '@/lib/types';

interface BattleLogEntryProps {
  move: BattleLogMove;
}

/**
 * Formats a timestamp as relative time (e.g., "2 min ago") if recent,
 * or as a readable date string if older than 24 hours.
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

export default function BattleLogEntry({ move }: BattleLogEntryProps) {
  const config = MOVE_TYPE_CONFIG[move.move_type];

  return (
    <div className="bg-rpg-card border border-rpg-border rounded-[2px] p-3 flex items-start gap-3">
      {/* Move type emoji */}
      <span className="text-2xl flex-shrink-0" role="img" aria-label={config.label}>
        {config.emoji}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Move type label */}
        <span className="font-pixel text-[10px] text-yellow-300 uppercase tracking-wide">
          {config.label}
        </span>

        {/* Note text */}
        <p className="font-retro text-lg text-gray-200 mt-1 break-words leading-snug">
          {move.note}
        </p>
      </div>

      {/* Timestamp */}
      <span className="font-retro text-sm text-gray-500 flex-shrink-0 whitespace-nowrap">
        {formatTimestamp(move.created_at)}
      </span>
    </div>
  );
}
