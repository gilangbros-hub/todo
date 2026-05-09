import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatDeadlineCountdown } from '@/lib/formatting';
import { calculateSubtaskProgress } from '@/lib/progress';
import { Task, STATUSES, PRIORITIES, Status, Priority } from '@/lib/types';

/**
 * Feature: rpg-quest-board, Property 9: Deadline Countdown Formatting
 *
 * For any task deadline timestamp and any current timestamp, the countdown
 * format function SHALL:
 * - Return a string in "Xd Xh" format when the deadline is in the future
 * - Return "OVERDUE" when the deadline is in the past
 * - Correctly calculate days and hours as the floor of the time difference
 *
 * **Validates: Requirements 1.6**
 */
describe('Feature: rpg-quest-board, Property 9: Deadline Countdown Formatting', () => {
  const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });

  it('should return "Xd Xh" format when deadline is in the future', () => {
    fc.assert(
      fc.property(dateArb, dateArb, (now, deadline) => {
        // Only test when deadline > now
        fc.pre(deadline.getTime() > now.getTime());

        const result = formatDeadlineCountdown(deadline, now);
        expect(result).toMatch(/^\d+d \d+h$/);
      }),
      { numRuns: 100 }
    );
  });

  it('should return "OVERDUE" when deadline is in the past or equal to now', () => {
    fc.assert(
      fc.property(dateArb, dateArb, (now, deadline) => {
        // Only test when deadline <= now
        fc.pre(deadline.getTime() <= now.getTime());

        const result = formatDeadlineCountdown(deadline, now);
        expect(result).toBe('OVERDUE');
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly calculate days and hours as floor values when deadline is in the future', () => {
    fc.assert(
      fc.property(dateArb, dateArb, (now, deadline) => {
        // Only test when deadline > now
        fc.pre(deadline.getTime() > now.getTime());

        const diffMs = deadline.getTime() - now.getTime();
        const expectedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const expectedHours = Math.floor(
          (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );

        const result = formatDeadlineCountdown(deadline, now);
        expect(result).toBe(`${expectedDays}d ${expectedHours}h`);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: rpg-quest-board, Property 12: Subtask Progress Calculation
 *
 * For any list of subtasks with various statuses, the progress calculation
 * function SHALL:
 * - Return 0 when the subtask list is empty
 * - Return (count of "done" subtasks / total subtasks) × 100, as a percentage
 * - Return 100 when all subtasks are "done"
 * - Return a value between 0 and 100 inclusive
 *
 * **Validates: Requirements 3.9**
 */
describe('Feature: rpg-quest-board, Property 12: Subtask Progress Calculation', () => {
  // Arbitrary for generating Task objects with random statuses
  const taskArb: fc.Arbitrary<Task> = fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    type_id: fc.option(fc.uuid(), { nil: null }),
    pic_id: fc.option(fc.uuid(), { nil: null }),
    deadline: fc.option(
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
      { nil: null }
    ),
    status: fc.constantFrom(...STATUSES) as fc.Arbitrary<Status>,
    priority: fc.constantFrom(...PRIORITIES) as fc.Arbitrary<Priority>,
    parent_task_id: fc.option(fc.uuid(), { nil: null }),
    branch_type: fc.option(fc.constantFrom('sequential' as const, 'parallel' as const), { nil: null }),
    branch_order: fc.option(fc.nat({ max: 100 }), { nil: null }),
    xp_reward: fc.nat({ max: 100 }),
    created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
    completed_at: fc.option(
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
      { nil: null }
    ),
  });

  it('should return 0 when the subtask list is empty', () => {
    const result = calculateSubtaskProgress([]);
    expect(result).toBe(0);
  });

  it('should return 100 when all subtasks are done', () => {
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 1, maxLength: 20 }),
        (tasks) => {
          const allDone = tasks.map(t => ({ ...t, status: 'done' as Status }));
          const result = calculateSubtaskProgress(allDone);
          expect(result).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return a value between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 1, maxLength: 20 }),
        (tasks) => {
          const result = calculateSubtaskProgress(tasks);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should equal Math.round((doneCount / total) * 100)', () => {
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 1, maxLength: 20 }),
        (tasks) => {
          const doneCount = tasks.filter(t => t.status === 'done').length;
          const expected = Math.round((doneCount / tasks.length) * 100);
          const result = calculateSubtaskProgress(tasks);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
