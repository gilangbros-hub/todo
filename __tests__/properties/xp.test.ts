import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateXpReward, calculateLevel, shouldLevelUp } from '@/lib/xp';
import { BASE_XP, PRIORITIES } from '@/lib/types';

/**
 * Feature: rpg-quest-board, Property 1: XP Calculation
 *
 * For any priority, deadline, completedAt, and subtask flag, verify:
 * - Base XP matches priority mapping (10/25/50/100)
 * - Early bonus is +20% floor when completed before deadline
 * - Late penalty is -50% floor when completed after deadline
 * - No-deadline returns base XP
 * - Subtask returns half floor of the applicable XP
 *
 * **Validates: Requirements 2.10, 4.2, 4.3, 4.4, 4.5, 4.6**
 */
describe('Feature: rpg-quest-board, Property 1: XP Calculation', () => {
  const priorityArb = fc.constantFrom(...PRIORITIES);
  const deadlineArb = fc.option(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString())
  );
  const completedAtArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString());
  const isSubtaskArb = fc.boolean();

  it('should return base XP when no deadline is assigned', () => {
    fc.assert(
      fc.property(
        priorityArb,
        completedAtArb,
        isSubtaskArb,
        (priority, completedAt, isSubtask) => {
          const result = calculateXpReward(priority, null, completedAt, isSubtask);
          const expected = isSubtask
            ? Math.floor(BASE_XP[priority] / 2)
            : BASE_XP[priority];
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply +20% early bonus (floor) when completed before deadline', () => {
    fc.assert(
      fc.property(
        priorityArb,
        isSubtaskArb,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (priority, isSubtask, deadlineDate) => {
          // completedAt is 1 day before deadline
          const completedDate = new Date(deadlineDate.getTime() - 86400000);
          if (completedDate < new Date('2020-01-01')) return; // skip invalid dates

          const deadline = deadlineDate.toISOString();
          const completedAt = completedDate.toISOString();

          const result = calculateXpReward(priority, deadline, completedAt, isSubtask);
          const baseWithBonus = Math.floor(BASE_XP[priority] * 1.2);
          const expected = isSubtask ? Math.floor(baseWithBonus / 2) : baseWithBonus;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply -50% late penalty (floor) when completed after deadline', () => {
    fc.assert(
      fc.property(
        priorityArb,
        isSubtaskArb,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (priority, isSubtask, deadlineDate) => {
          // completedAt is 1 day after deadline
          const completedDate = new Date(deadlineDate.getTime() + 86400000);
          if (completedDate > new Date('2030-12-31')) return; // skip invalid dates

          const deadline = deadlineDate.toISOString();
          const completedAt = completedDate.toISOString();

          const result = calculateXpReward(priority, deadline, completedAt, isSubtask);
          const baseWithPenalty = Math.floor(BASE_XP[priority] * 0.5);
          const expected = isSubtask ? Math.floor(baseWithPenalty / 2) : baseWithPenalty;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return base XP when completedAt equals deadline', () => {
    fc.assert(
      fc.property(
        priorityArb,
        isSubtaskArb,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (priority, isSubtask, date) => {
          const isoDate = date.toISOString();
          const result = calculateXpReward(priority, isoDate, isoDate, isSubtask);
          const expected = isSubtask
            ? Math.floor(BASE_XP[priority] / 2)
            : BASE_XP[priority];
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always return a non-negative XP value', () => {
    fc.assert(
      fc.property(
        priorityArb,
        deadlineArb,
        completedAtArb,
        isSubtaskArb,
        (priority, deadline, completedAt, isSubtask) => {
          const result = calculateXpReward(priority, deadline, completedAt, isSubtask);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: rpg-quest-board, Property 2: Level-Up with Carry-Over
 *
 * For any starting level >= 1 and XP >= 0, verify:
 * - Threshold for level N is N * 100
 * - Remaining XP < final_level * 100
 * - Total consumed + remaining = input XP
 * - Final level >= starting level (level >= 1)
 *
 * **Validates: Requirements 5.1, 5.2**
 */
describe('Feature: rpg-quest-board, Property 2: Level-Up with Carry-Over', () => {
  const totalXpArb = fc.nat({ max: 100000 });

  it('should produce a level >= 1', () => {
    fc.assert(
      fc.property(totalXpArb, (totalXp) => {
        const result = calculateLevel(totalXp);
        expect(result.level).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('should have xpInCurrentLevel >= 0', () => {
    fc.assert(
      fc.property(totalXpArb, (totalXp) => {
        const result = calculateLevel(totalXp);
        expect(result.xpInCurrentLevel).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should have xpInCurrentLevel < level * 100 (threshold)', () => {
    fc.assert(
      fc.property(totalXpArb, (totalXp) => {
        const result = calculateLevel(totalXp);
        expect(result.xpInCurrentLevel).toBeLessThan(result.level * 100);
      }),
      { numRuns: 100 }
    );
  });

  it('should have xpForNextLevel equal to level * 100', () => {
    fc.assert(
      fc.property(totalXpArb, (totalXp) => {
        const result = calculateLevel(totalXp);
        expect(result.xpForNextLevel).toBe(result.level * 100);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve total XP: sum of consumed thresholds + remaining = input', () => {
    fc.assert(
      fc.property(totalXpArb, (totalXp) => {
        const result = calculateLevel(totalXp);
        // Sum of thresholds consumed: 1*100 + 2*100 + ... + (level-1)*100
        let consumed = 0;
        for (let i = 1; i < result.level; i++) {
          consumed += i * 100;
        }
        expect(consumed + result.xpInCurrentLevel).toBe(totalXp);
      }),
      { numRuns: 100 }
    );
  });
});
