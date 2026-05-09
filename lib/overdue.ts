import { Task } from './types';

/**
 * Detect tasks that should be marked as overdue.
 *
 * A task is overdue when:
 * - It has a deadline (not null)
 * - The deadline is in the past (deadline < now)
 * - Its status is NOT "done"
 * - Its status is NOT already "overdue"
 *
 * @param tasks - Array of tasks to check
 * @param now - Current date/time as Date object or ISO string
 * @returns Array of task IDs that should be marked as overdue
 */
export function detectOverdueTasks(tasks: Task[], now: Date | string): string[] {
  const currentTime = new Date(now).getTime();

  return tasks
    .filter((task) => {
      if (task.deadline === null) return false;
      if (task.status === 'done') return false;
      if (task.status === 'overdue') return false;

      const deadlineTime = new Date(task.deadline).getTime();
      return deadlineTime < currentTime;
    })
    .map((task) => task.id);
}
