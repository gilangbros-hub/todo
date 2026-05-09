import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { updateStreak } from "@/lib/streak";

/**
 * Feature: rpg-quest-board, Property 3: Streak Update Logic
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 *
 * For any current streak count >= 0, any last_completed_date (null or valid date),
 * and any completion date, the updateStreak function SHALL return:
 * - Streak incremented by 1 when last_completed_date is the immediately preceding UTC calendar day
 * - Streak reset to 1 when last_completed_date is null or is not the immediately preceding UTC calendar day
 * - Streak unchanged when last_completed_date equals the current completion date (same-day idempotence)
 */

/** Helper: format a Date to YYYY-MM-DD string */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Helper: add days to a date and return new Date */
function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Arbitrary: YYYY-MM-DD date string from fc.date() */
const dateStringArb = fc
  .date({
    min: new Date("2000-01-01T00:00:00Z"),
    max: new Date("2100-12-31T00:00:00Z"),
  })
  .map(formatDate);

/** Arbitrary: current streak >= 0, max 1000 */
const currentStreakArb = fc.nat({ max: 1000 });

describe("Feature: rpg-quest-board, Property 3: Streak Update Logic", () => {
  it("same-day idempotence: streak unchanged when completionDate === lastCompletedDate", () => {
    /**
     * Validates: Requirements 6.3
     *
     * When completionDate equals lastCompletedDate, the streak should not change.
     */
    fc.assert(
      fc.property(currentStreakArb, dateStringArb, (currentStreak, date) => {
        const result = updateStreak(currentStreak, date, date);

        expect(result.newStreak).toBe(currentStreak);
        expect(result.newLastCompletedDate).toBe(date);
      }),
      { numRuns: 100 }
    );
  });

  it("consecutive day increment: streak incremented by 1 when lastCompletedDate is exactly 1 day before completionDate", () => {
    /**
     * Validates: Requirements 6.1
     *
     * When lastCompletedDate is the immediately preceding UTC calendar day,
     * the streak should increment by 1.
     */
    fc.assert(
      fc.property(
        currentStreakArb,
        dateStringArb,
        (currentStreak, lastDateStr) => {
          const lastDate = new Date(lastDateStr + "T00:00:00Z");
          const nextDate = addDays(lastDate, 1);
          const completionDateStr = formatDate(nextDate);

          const result = updateStreak(
            currentStreak,
            lastDateStr,
            completionDateStr
          );

          expect(result.newStreak).toBe(currentStreak + 1);
          expect(result.newLastCompletedDate).toBe(completionDateStr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("gap reset: streak resets to 1 when lastCompletedDate is null", () => {
    /**
     * Validates: Requirements 6.2
     *
     * When lastCompletedDate is null, the streak should reset to 1.
     */
    fc.assert(
      fc.property(currentStreakArb, dateStringArb, (currentStreak, date) => {
        const result = updateStreak(currentStreak, null, date);

        expect(result.newStreak).toBe(1);
        expect(result.newLastCompletedDate).toBe(date);
      }),
      { numRuns: 100 }
    );
  });

  it("gap reset: streak resets to 1 when lastCompletedDate is not the preceding day and not same day", () => {
    /**
     * Validates: Requirements 6.2
     *
     * When lastCompletedDate is not the immediately preceding day (and not same day),
     * the streak should reset to 1.
     */
    fc.assert(
      fc.property(
        currentStreakArb,
        dateStringArb,
        fc.integer({ min: 2, max: 365 }),
        (currentStreak, lastDateStr, gapDays) => {
          const lastDate = new Date(lastDateStr + "T00:00:00Z");
          const completionDate = addDays(lastDate, gapDays);
          const completionDateStr = formatDate(completionDate);

          const result = updateStreak(
            currentStreak,
            lastDateStr,
            completionDateStr
          );

          expect(result.newStreak).toBe(1);
          expect(result.newLastCompletedDate).toBe(completionDateStr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("general invariants: newStreak >= 1 unless same-day idempotence, and newLastCompletedDate is always a valid date string", () => {
    /**
     * Validates: Requirements 6.1, 6.2, 6.3
     *
     * For any inputs:
     * - newStreak >= 1 (unless same-day where it equals currentStreak which could be 0)
     * - newLastCompletedDate is always a valid YYYY-MM-DD date string
     */
    const lastCompletedDateArb = fc.oneof(
      fc.constant(null),
      dateStringArb
    );

    fc.assert(
      fc.property(
        currentStreakArb,
        lastCompletedDateArb,
        dateStringArb,
        (currentStreak, lastCompletedDate, completionDate) => {
          const result = updateStreak(
            currentStreak,
            lastCompletedDate,
            completionDate
          );

          // newStreak >= 1 unless same-day idempotence (where it equals currentStreak)
          if (completionDate === lastCompletedDate) {
            expect(result.newStreak).toBe(currentStreak);
          } else {
            expect(result.newStreak).toBeGreaterThanOrEqual(1);
          }

          // newLastCompletedDate is always a valid YYYY-MM-DD date string
          expect(result.newLastCompletedDate).toMatch(
            /^\d{4}-\d{2}-\d{2}$/
          );

          // Verify it parses to a valid date
          const parsed = new Date(
            result.newLastCompletedDate + "T00:00:00Z"
          );
          expect(parsed.getTime()).not.toBeNaN();
        }
      ),
      { numRuns: 100 }
    );
  });
});
