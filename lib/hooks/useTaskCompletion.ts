'use client';

import { useState, useCallback } from 'react';
import { Task } from '@/lib/types';
import { calculateXpReward } from '@/lib/xp';
import { completeTask } from '@/lib/services/tasks';
import { awardXp } from '@/lib/services/player-stats';

export interface XpToastState {
  amount: number;
}

export interface LevelUpState {
  newLevel: number;
}

export interface UseTaskCompletionOptions {
  onStatsUpdated?: () => void;
}

export interface UseTaskCompletionReturn {
  completeTaskWithRewards: (task: Task) => Promise<void>;
  xpToast: XpToastState | null;
  levelUp: LevelUpState | null;
  dismissXpToast: () => void;
  dismissLevelUp: () => void;
  isCompleting: boolean;
}

/**
 * Custom hook that encapsulates the full task completion flow:
 * 1. Completes the task (marks as done)
 * 2. Calculates XP reward with early/late/subtask modifiers
 * 3. Awards XP to player stats and updates streak
 * 4. Triggers XP toast notification
 * 5. Triggers level-up overlay if applicable
 * 6. Calls onStatsUpdated callback to refresh sidebar
 *
 * Guards against double-completion (no-op if task is already done).
 */
export function useTaskCompletion(
  options?: UseTaskCompletionOptions
): UseTaskCompletionReturn {
  const [xpToast, setXpToast] = useState<XpToastState | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpState | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const dismissXpToast = useCallback(() => {
    setXpToast(null);
  }, []);

  const dismissLevelUp = useCallback(() => {
    setLevelUp(null);
  }, []);

  const completeTaskWithRewards = useCallback(
    async (task: Task) => {
      // Guard against double-completion
      if (task.status === 'done') {
        return;
      }

      // Guard against concurrent completions
      if (isCompleting) {
        return;
      }

      setIsCompleting(true);

      try {
        // Step 1: Complete the task (set status to "done", set completed_at)
        const completedTask = await completeTask(task.id);

        // Step 2: Calculate XP reward with modifiers
        const completedAt = completedTask.completed_at ?? new Date().toISOString();
        const isSubtask = task.parent_task_id !== null;
        const xpAmount = calculateXpReward(
          task.priority,
          task.deadline,
          completedAt,
          isSubtask
        );

        // Step 3: Award XP to player stats (also updates streak)
        const result = await awardXp(xpAmount);

        // Step 4: Show XP toast
        setXpToast({ amount: xpAmount });

        // Step 5: Check for level-up and show overlay if triggered
        if (result.leveledUp) {
          setLevelUp({ newLevel: result.stats.level });
        }

        // Step 6: Notify that stats have been updated (for sidebar refresh)
        if (options?.onStatsUpdated) {
          options.onStatsUpdated();
        }
      } finally {
        setIsCompleting(false);
      }
    },
    [isCompleting, options]
  );

  return {
    completeTaskWithRewards,
    xpToast,
    levelUp,
    dismissXpToast,
    dismissLevelUp,
    isCompleting,
  };
}
