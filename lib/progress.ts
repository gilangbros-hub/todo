// ============================================================
// RPG Quest Board — Subtask Progress Calculation
// ============================================================

import { Task } from './types';

/**
 * Calculates the completion percentage of subtasks.
 *
 * @param subtasks - Array of subtask objects
 * @returns Percentage of completed subtasks (0–100), 0 when empty
 */
export function calculateSubtaskProgress(subtasks: Task[]): number {
  if (subtasks.length === 0) {
    return 0;
  }

  const doneCount = subtasks.filter(
    (subtask) => subtask.status === 'done'
  ).length;

  return Math.round((doneCount / subtasks.length) * 100);
}
