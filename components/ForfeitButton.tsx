'use client';

import { useState } from 'react';

interface ForfeitButtonProps {
  taskId: string;
  taskStatus: string;
  isSubtask: boolean;
  xpReward: number;
  onForfeit: () => void;
}

export default function ForfeitButton({
  taskId,
  taskStatus,
  isSubtask,
  xpReward,
  onForfeit,
}: ForfeitButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isDisabled = taskStatus === 'done' || isSubtask;

  const tooltipMessage = taskStatus === 'done'
    ? 'Completed quests cannot be forfeited'
    : isSubtask
      ? 'Subtasks can only be forfeited from the parent quest'
      : '';

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={isDisabled}
        aria-label="Forfeit Quest"
        onClick={() => {
          if (!isDisabled) {
            onForfeit();
          }
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`
          px-4 py-2 font-pixel text-xs
          bg-transparent border-pixel rounded-pixel
          border-red-900 text-red-400
          transition-all duration-100 ease-in-out
          ${isDisabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] focus:shadow-[0_0_12px_rgba(239,68,68,0.5)]'
          }
        `}
      >
        ⚔️ Forfeit Quest
      </button>

      {showTooltip && isDisabled && tooltipMessage && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-rpg-card border border-rpg-border rounded-pixel font-retro text-xs text-gray-300 whitespace-nowrap z-50"
        >
          {tooltipMessage}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-rpg-border" />
        </div>
      )}
    </div>
  );
}
