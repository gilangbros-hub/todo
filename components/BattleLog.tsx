'use client';

import { useEffect, useState, useCallback } from 'react';
import { Status, BattleLogMove, MoveType, PENDING_XP_PER_MOVE } from '@/lib/types';
import { getMovesByTaskId, createMove } from '@/lib/services/battle-log';
import BattleLogEntry from '@/components/BattleLogEntry';
import MoveForm from '@/components/MoveForm';
import XpGainAnimation from '@/components/XpGainAnimation';

interface BattleLogProps {
  taskId: string;
  taskStatus: Status;
  pendingXp: number;
  onPendingXpChange: (newTotal: number) => void;
}

export default function BattleLog({
  taskId,
  taskStatus,
  pendingXp,
  onPendingXpChange,
}: BattleLogProps) {
  const [moves, setMoves] = useState<BattleLogMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [showXpAnimation, setShowXpAnimation] = useState(false);

  // Fetch moves on mount
  useEffect(() => {
    async function fetchMoves() {
      try {
        const data = await getMovesByTaskId(taskId);
        setMoves(data);
      } catch (error) {
        console.error('Failed to fetch battle log moves:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMoves();
  }, [taskId]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (moveType: MoveType, note: string) => {
      const result = await createMove({ taskId, moveType, note });

      // Optimistic update: append new move to local state
      setMoves((prev) => [...prev, result.move]);

      // Trigger XP animation
      setShowXpAnimation(true);

      // Notify parent of new pending XP total
      onPendingXpChange(result.newPendingXp);
    },
    [taskId, onPendingXpChange]
  );

  const handleXpAnimationComplete = useCallback(() => {
    setShowXpAnimation(false);
  }, []);

  const isDone = taskStatus === 'done';

  return (
    <div className="space-y-4">
      {/* Pending XP Display */}
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[10px] text-yellow-300">
          {isDone ? '🏆 XP Awarded' : '⚡ Pending XP'}:{' '}
          <span className="text-white">{pendingXp}</span>
        </span>

        {/* XP Gain Animation */}
        {showXpAnimation && (
          <XpGainAnimation
            amount={PENDING_XP_PER_MOVE}
            onComplete={handleXpAnimationComplete}
          />
        )}
      </div>

      {/* Scrollable Move List */}
      <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <p className="font-retro text-sm text-gray-500 text-center py-4">
            Loading battle log...
          </p>
        ) : moves.length === 0 ? (
          <p className="font-retro text-sm text-gray-500 text-center py-4">
            No battle actions recorded yet
          </p>
        ) : (
          moves.map((move) => (
            <BattleLogEntry key={move.id} move={move} />
          ))
        )}
      </div>

      {/* Move Form */}
      <MoveForm onSubmit={handleSubmit} disabled={isDone} />
    </div>
  );
}
