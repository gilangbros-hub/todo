// ============================================================
// RPG Quest Board — Deadline Formatting Utilities
// ============================================================

/**
 * Formats the countdown to a deadline as "Xd Xh" or "OVERDUE".
 *
 * @param deadline - The deadline timestamp (ISO string or Date)
 * @param now - The current timestamp (ISO string or Date)
 * @returns "Xd Xh" for future deadlines, "OVERDUE" for past deadlines
 */
export function formatDeadlineCountdown(
  deadline: string | Date,
  now: string | Date
): string {
  const deadlineDate = new Date(deadline);
  const nowDate = new Date(now);

  const diffMs = deadlineDate.getTime() - nowDate.getTime();

  if (diffMs <= 0) {
    return 'OVERDUE';
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  return `${days}d ${hours}h`;
}
