/**
 * Streak Calculation Module
 *
 * Tracks consecutive days of task completion using UTC calendar days.
 * A streak increments when the user completes at least one task on
 * consecutive UTC days. Same-day completions are idempotent.
 */

export interface StreakResult {
  newStreak: number;
  newLastCompletedDate: string;
}

/**
 * Calculates the updated streak based on the last completed date and the
 * current completion date.
 *
 * @param currentStreak - The player's current streak count (>= 0)
 * @param lastCompletedDate - The last UTC date a task was completed (YYYY-MM-DD), or null if never
 * @param completionDate - The current completion UTC date (YYYY-MM-DD)
 * @returns The new streak count and updated last completed date
 */
export function updateStreak(
  currentStreak: number,
  lastCompletedDate: string | null,
  completionDate: string
): StreakResult {
  // Same-day idempotence: if already completed today, no change
  if (completionDate === lastCompletedDate) {
    return {
      newStreak: currentStreak,
      newLastCompletedDate: lastCompletedDate,
    };
  }

  // Check if lastCompletedDate is the immediately preceding UTC calendar day
  if (lastCompletedDate !== null && isConsecutiveDay(lastCompletedDate, completionDate)) {
    return {
      newStreak: currentStreak + 1,
      newLastCompletedDate: completionDate,
    };
  }

  // Reset streak: lastCompletedDate is null or not the preceding day
  return {
    newStreak: 1,
    newLastCompletedDate: completionDate,
  };
}

/**
 * Determines if `dateB` is exactly one UTC calendar day after `dateA`.
 *
 * @param dateA - Earlier date string in YYYY-MM-DD format
 * @param dateB - Later date string in YYYY-MM-DD format
 * @returns true if dateB is the day immediately following dateA
 */
function isConsecutiveDay(dateA: string, dateB: string): boolean {
  const a = new Date(dateA + "T00:00:00Z");
  const b = new Date(dateB + "T00:00:00Z");

  // Add one day to dateA and compare
  const nextDay = new Date(a.getTime());
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  return (
    nextDay.getUTCFullYear() === b.getUTCFullYear() &&
    nextDay.getUTCMonth() === b.getUTCMonth() &&
    nextDay.getUTCDate() === b.getUTCDate()
  );
}
