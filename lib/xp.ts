import { BASE_XP, type Priority } from './types';

/**
 * Calculate XP reward for completing a task.
 *
 * - Base XP is determined by priority (normal: 10, rare: 25, epic: 50, legendary: 100)
 * - If deadline exists and completedAt < deadline: +20% bonus (Math.floor)
 * - If deadline exists and completedAt > deadline: -50% penalty (Math.floor)
 * - If no deadline: base XP unchanged
 * - If isSubtask: halve the result (Math.floor)
 */
export function calculateXpReward(
  priority: Priority,
  deadline: string | null,
  completedAt: string,
  isSubtask: boolean
): number {
  let xp = BASE_XP[priority];

  if (deadline !== null) {
    const deadlineTime = new Date(deadline).getTime();
    const completedTime = new Date(completedAt).getTime();

    if (completedTime < deadlineTime) {
      // Early bonus: +20%
      xp = Math.floor(xp * 1.2);
    } else if (completedTime > deadlineTime) {
      // Late penalty: -50%
      xp = Math.floor(xp * 0.5);
    }
  }

  if (isSubtask) {
    xp = Math.floor(xp / 2);
  }

  return xp;
}

/**
 * Calculate level information from total XP.
 *
 * - Starts at level 1
 * - Threshold for level N = N * 100
 * - Iteratively subtracts thresholds until remaining XP < current threshold
 * - Returns current level, XP progress within current level, and XP needed for next level
 */
export function calculateLevel(totalXp: number): {
  level: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
} {
  let level = 1;
  let remaining = totalXp;

  while (remaining >= level * 100) {
    remaining -= level * 100;
    level++;
  }

  return {
    level,
    xpInCurrentLevel: remaining,
    xpForNextLevel: level * 100,
  };
}

/**
 * Determine if the player should level up.
 *
 * Returns true when XP in current level meets or exceeds the threshold (currentLevel * 100).
 */
export function shouldLevelUp(
  currentLevel: number,
  xpInCurrentLevel: number
): boolean {
  return xpInCurrentLevel >= currentLevel * 100;
}
