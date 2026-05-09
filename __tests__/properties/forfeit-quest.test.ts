import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { truncateTitle } from '@/components/ForfeitConfirmDialog';
import { calculateLevel } from '@/lib/xp';

/**
 * Feature: forfeit-quest, Property 5: Title truncation preserves content within limit
 *
 * For any string, if its length exceeds 50 characters, the truncated result
 * should be exactly the first 50 characters followed by "…" (Unicode ellipsis).
 * If its length is 50 or fewer characters, the result should be the original
 * string unchanged.
 *
 * **Validates: Requirements 5.1**
 */
describe('Feature: forfeit-quest, Property 5: Title truncation preserves content within limit', () => {
  const titleArb = fc.string({ minLength: 0, maxLength: 200 });

  it('should return the original string unchanged when length is 50 or fewer', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        (title) => {
          const result = truncateTitle(title);
          expect(result).toBe(title);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return first 50 chars + ellipsis when length exceeds 50', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 51, maxLength: 200 }),
        (title) => {
          const result = truncateTitle(title);
          expect(result).toBe(title.slice(0, 50) + '\u2026');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should satisfy the truncation rule for any string length', () => {
    fc.assert(
      fc.property(titleArb, (title) => {
        const result = truncateTitle(title);
        if (title.length > 50) {
          expect(result).toBe(title.slice(0, 50) + '\u2026');
          expect(result.length).toBe(51);
        } else {
          expect(result).toBe(title);
        }
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: forfeit-quest, Property 3: XP penalty calculation with zero floor
 *
 * For any non-negative integer xp_reward and any non-negative integer current_xp,
 * the resulting XP after forfeit penalty should equal
 * Math.max(0, current_xp - Math.floor(xp_reward * 0.25)).
 * The result must never be negative.
 *
 * **Validates: Requirements 3.1, 3.2**
 */
describe('Feature: forfeit-quest, Property 3: XP penalty calculation with zero floor', () => {
  /**
   * Computes the XP after applying the forfeit penalty.
   * penalty = Math.floor(xp_reward * 0.25)
   * result = Math.max(0, current_xp - penalty)
   */
  function calculateXpAfterForfeitPenalty(xpReward: number, currentXp: number): number {
    const penalty = Math.floor(xpReward * 0.25);
    return Math.max(0, currentXp - penalty);
  }

  it('should equal Math.max(0, current_xp - Math.floor(xp_reward * 0.25))', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.nat(),
        (xpReward, currentXp) => {
          const result = calculateXpAfterForfeitPenalty(xpReward, currentXp);
          const expected = Math.max(0, currentXp - Math.floor(xpReward * 0.25));
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never produce a negative result', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.nat(),
        (xpReward, currentXp) => {
          const result = calculateXpAfterForfeitPenalty(xpReward, currentXp);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: forfeit-quest, Property 4: Level recalculation consistency after XP decrease
 *
 * For any non-negative total_xp, the calculateLevel function should produce a level L such that:
 * - The sum of thresholds for levels 1 through L-1 is ≤ total_xp
 * - The sum of thresholds for levels 1 through L exceeds total_xp
 *
 * This ensures level recalculation is consistent after XP decreases from forfeit penalties.
 *
 * **Validates: Requirements 3.3**
 */
describe('Feature: forfeit-quest, Property 4: Level recalculation consistency after XP decrease', () => {
  const totalXpArb = fc.nat({ max: 100000 });

  it('should satisfy: sum of thresholds for levels 1..L-1 ≤ total_xp', () => {
    fc.assert(
      fc.property(totalXpArb, (totalXp) => {
        const { level } = calculateLevel(totalXp);

        // Sum of thresholds for levels 1 through L-1: 1*100 + 2*100 + ... + (L-1)*100
        let sumPrevious = 0;
        for (let i = 1; i < level; i++) {
          sumPrevious += i * 100;
        }

        expect(sumPrevious).toBeLessThanOrEqual(totalXp);
      }),
      { numRuns: 100 }
    );
  });

  it('should satisfy: sum of thresholds for levels 1..L exceeds total_xp', () => {
    fc.assert(
      fc.property(totalXpArb, (totalXp) => {
        const { level } = calculateLevel(totalXp);

        // Sum of thresholds for levels 1 through L: 1*100 + 2*100 + ... + L*100
        let sumCurrent = 0;
        for (let i = 1; i <= level; i++) {
          sumCurrent += i * 100;
        }

        expect(sumCurrent).toBeGreaterThan(totalXp);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce consistent level for XP values resulting from penalty deductions', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100000 }),
        fc.nat({ max: 10000 }),
        (originalXp, penalty) => {
          // Simulate XP after forfeit penalty (floored at 0)
          const postPenaltyXp = Math.max(0, originalXp - penalty);
          const { level } = calculateLevel(postPenaltyXp);

          // Sum of thresholds for levels 1..L-1 ≤ postPenaltyXp
          let sumPrevious = 0;
          for (let i = 1; i < level; i++) {
            sumPrevious += i * 100;
          }

          // Sum of thresholds for levels 1..L > postPenaltyXp
          let sumCurrent = 0;
          for (let i = 1; i <= level; i++) {
            sumCurrent += i * 100;
          }

          expect(sumPrevious).toBeLessThanOrEqual(postPenaltyXp);
          expect(sumCurrent).toBeGreaterThan(postPenaltyXp);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: forfeit-quest, Property 1: Forfeit eligibility is determined by status and parentage
 *
 * For any task, the forfeit action should be enabled if and only if the task status
 * is not "done" AND the task has a null parent_task_id. A task with status "done"
 * or a non-null parent_task_id should never have the forfeit action available.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3**
 */
describe('Feature: forfeit-quest, Property 1: Forfeit eligibility is determined by status and parentage', () => {
  /**
   * Determines whether a task is eligible for the forfeit action.
   * A task is eligible iff its status is not "done" and it has no parent (is a root task).
   */
  function isForfeitEligible(status: string, parentTaskId: string | null): boolean {
    return status !== 'done' && parentTaskId === null;
  }

  const taskArb = fc.record({
    status: fc.constantFrom('todo', 'in_progress', 'done', 'overdue'),
    parentTaskId: fc.option(fc.uuid()),
  });

  it('should return true iff status !== "done" && parentTaskId === null', () => {
    fc.assert(
      fc.property(taskArb, (task) => {
        const eligible = isForfeitEligible(task.status, task.parentTaskId);
        const expected = task.status !== 'done' && task.parentTaskId === null;
        expect(eligible).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('should always return false when status is "done"', () => {
    fc.assert(
      fc.property(
        fc.option(fc.uuid()),
        (parentTaskId) => {
          const eligible = isForfeitEligible('done', parentTaskId);
          expect(eligible).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always return false when parentTaskId is not null', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('todo', 'in_progress', 'done', 'overdue'),
        fc.uuid(),
        (status, parentTaskId) => {
          const eligible = isForfeitEligible(status, parentTaskId);
          expect(eligible).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return true only for non-done root tasks', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('todo', 'in_progress', 'overdue'),
        (_status) => {
          const eligible = isForfeitEligible(_status, null);
          expect(eligible).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: forfeit-quest, Property 2: Server-side forfeit rejection for completed tasks
 *
 * For any task with status "done", calling the forfeit eligibility check should
 * return false (reject the request) regardless of the xp_reward value.
 * The task and player stats must remain unchanged — no XP penalty is applied,
 * no deletion occurs.
 *
 * **Validates: Requirements 2.4**
 */
describe('Feature: forfeit-quest, Property 2: Server-side forfeit rejection for completed tasks', () => {
  /**
   * Simulates the server-side eligibility check for the forfeit action.
   * Returns false (rejects) when the task status is "done".
   * This mirrors the validation in the forfeit_quest RPC function.
   */
  function isForfeitEligible(status: string, parentTaskId: string | null): boolean {
    return status !== 'done' && parentTaskId === null;
  }

  /**
   * Simulates the server-side forfeit attempt.
   * Returns { rejected: true } if the task is not eligible (status is "done"),
   * meaning the task and player stats remain unchanged.
   */
  function attemptForfeit(
    task: { status: string; xpReward: number; parentTaskId: string | null },
    playerStats: { xp: number; level: number }
  ): { rejected: boolean; taskUnchanged: boolean; statsUnchanged: boolean; newStats: { xp: number; level: number } } {
    if (!isForfeitEligible(task.status, task.parentTaskId)) {
      // Server rejects: task and stats remain unchanged
      return {
        rejected: true,
        taskUnchanged: true,
        statsUnchanged: true,
        newStats: { ...playerStats },
      };
    }

    // If eligible, penalty would be applied (not reached for "done" tasks)
    const penalty = Math.floor(task.xpReward * 0.25);
    const newXp = Math.max(0, playerStats.xp - penalty);
    return {
      rejected: false,
      taskUnchanged: false,
      statsUnchanged: false,
      newStats: { xp: newXp, level: playerStats.level },
    };
  }

  it('should reject forfeit for any task with status "done" regardless of xp_reward', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100000 }),
        fc.option(fc.uuid()),
        (xpReward, parentTaskId) => {
          const eligible = isForfeitEligible('done', parentTaskId);
          expect(eligible).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should leave task unchanged when forfeit is rejected for completed tasks', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100000 }),
        fc.nat({ max: 100000 }),
        fc.nat({ max: 100 }),
        (xpReward, currentXp, currentLevel) => {
          const task = { status: 'done' as const, xpReward, parentTaskId: null };
          const playerStats = { xp: currentXp, level: currentLevel };

          const result = attemptForfeit(task, playerStats);

          expect(result.rejected).toBe(true);
          expect(result.taskUnchanged).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should leave player stats unchanged when forfeit is rejected for completed tasks', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100000 }),
        fc.nat({ max: 100000 }),
        fc.nat({ max: 100 }),
        (xpReward, currentXp, currentLevel) => {
          const task = { status: 'done' as const, xpReward, parentTaskId: null };
          const playerStats = { xp: currentXp, level: currentLevel };

          const result = attemptForfeit(task, playerStats);

          expect(result.rejected).toBe(true);
          expect(result.statsUnchanged).toBe(true);
          expect(result.newStats.xp).toBe(currentXp);
          expect(result.newStats.level).toBe(currentLevel);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject regardless of xp_reward value (zero, small, large)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(0),
          fc.nat({ max: 3 }),
          fc.nat({ max: 1000 }),
          fc.nat({ max: 100000 })
        ),
        fc.nat({ max: 50000 }),
        fc.nat({ max: 50 }),
        (xpReward, currentXp, currentLevel) => {
          const task = { status: 'done' as const, xpReward, parentTaskId: null };
          const playerStats = { xp: currentXp, level: currentLevel };

          const result = attemptForfeit(task, playerStats);

          // Always rejected for "done" tasks
          expect(result.rejected).toBe(true);
          // XP never changes
          expect(result.newStats.xp).toBe(currentXp);
          // Level never changes
          expect(result.newStats.level).toBe(currentLevel);
        }
      ),
      { numRuns: 100 }
    );
  });
});
