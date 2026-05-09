import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { detectOverdueTasks } from "@/lib/overdue";
import { Task } from "@/lib/types";

/**
 * Feature: rpg-quest-board, Property 4: Overdue Detection
 *
 * Validates: Requirements 7.1, 7.5
 *
 * For any set of tasks with various deadlines (some past, some future, some null)
 * and various statuses (todo, in_progress, done, overdue), the overdue detection
 * function SHALL:
 * - Mark as "overdue" only tasks where deadline < now AND status is NOT "done"
 *   AND status is NOT already "overdue"
 * - Never mark a task with no deadline as "overdue"
 * - Never modify tasks already in "done" status
 * - Leave tasks with future deadlines unchanged
 */

const taskArb = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 3, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  type_id: fc.option(fc.uuid(), { nil: null }),
  pic_id: fc.option(fc.uuid(), { nil: null }),
  deadline: fc.option(
    fc
      .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
      .map((d) => d.toISOString()),
    { nil: null }
  ),
  status: fc.constantFrom("todo" as const, "in_progress" as const, "done" as const, "overdue" as const),
  priority: fc.constantFrom("normal" as const, "rare" as const, "epic" as const, "legendary" as const),
  parent_task_id: fc.constant(null),
  branch_type: fc.option(fc.constantFrom("sequential" as const, "parallel" as const), { nil: null }),
  branch_order: fc.option(fc.nat({ max: 100 }), { nil: null }),
  xp_reward: fc.nat({ max: 100 }),
  created_at: fc.date().map((d) => d.toISOString()),
  completed_at: fc.option(fc.date().map((d) => d.toISOString()), { nil: null }),
});

const nowArb = fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") });

describe("Feature: rpg-quest-board, Property 4: Overdue Detection", () => {
  it("every returned ID belongs to a task with non-null past deadline and non-done/non-overdue status", () => {
    /**
     * Validates: Requirements 7.1
     *
     * Every ID in the result must correspond to a task where:
     * - deadline is not null
     * - deadline < now
     * - status is NOT 'done'
     * - status is NOT 'overdue'
     */
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 0, maxLength: 20 }),
        nowArb,
        (tasks, now) => {
          const result = detectOverdueTasks(tasks as Task[], now);
          const taskMap = new Map(tasks.map((t) => [t.id, t]));

          for (const id of result) {
            const task = taskMap.get(id);
            expect(task).toBeDefined();
            expect(task!.deadline).not.toBeNull();
            expect(new Date(task!.deadline!).getTime()).toBeLessThan(now.getTime());
            expect(task!.status).not.toBe("done");
            expect(task!.status).not.toBe("overdue");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no task with null deadline appears in the result", () => {
    /**
     * Validates: Requirements 7.5
     *
     * Tasks without a deadline should never be marked as overdue.
     */
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 0, maxLength: 20 }),
        nowArb,
        (tasks, now) => {
          const result = detectOverdueTasks(tasks as Task[], now);
          const resultSet = new Set(result);

          const nullDeadlineTasks = tasks.filter((t) => t.deadline === null);
          for (const task of nullDeadlineTasks) {
            expect(resultSet.has(task.id)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no task with status 'done' appears in the result", () => {
    /**
     * Validates: Requirements 7.1
     *
     * Tasks already marked as done should never be flagged as overdue.
     */
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 0, maxLength: 20 }),
        nowArb,
        (tasks, now) => {
          const result = detectOverdueTasks(tasks as Task[], now);
          const resultSet = new Set(result);

          const doneTasks = tasks.filter((t) => t.status === "done");
          for (const task of doneTasks) {
            expect(resultSet.has(task.id)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no task with status 'overdue' appears in the result", () => {
    /**
     * Validates: Requirements 7.1
     *
     * Tasks already in overdue status should not be re-flagged.
     */
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 0, maxLength: 20 }),
        nowArb,
        (tasks, now) => {
          const result = detectOverdueTasks(tasks as Task[], now);
          const resultSet = new Set(result);

          const overdueTasks = tasks.filter((t) => t.status === "overdue");
          for (const task of overdueTasks) {
            expect(resultSet.has(task.id)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no task with deadline >= now appears in the result", () => {
    /**
     * Validates: Requirements 7.1
     *
     * Tasks with future or current deadlines should not be marked overdue.
     */
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 0, maxLength: 20 }),
        nowArb,
        (tasks, now) => {
          const result = detectOverdueTasks(tasks as Task[], now);
          const resultSet = new Set(result);

          const futureDeadlineTasks = tasks.filter(
            (t) => t.deadline !== null && new Date(t.deadline).getTime() >= now.getTime()
          );
          for (const task of futureDeadlineTasks) {
            expect(resultSet.has(task.id)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("completeness: every qualifying task IS in the result", () => {
    /**
     * Validates: Requirements 7.1, 7.5
     *
     * Every task that satisfies ALL conditions (non-null deadline, past deadline,
     * non-done, non-overdue) must appear in the result.
     */
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 0, maxLength: 20 }),
        nowArb,
        (tasks, now) => {
          const result = detectOverdueTasks(tasks as Task[], now);
          const resultSet = new Set(result);

          const qualifyingTasks = tasks.filter(
            (t) =>
              t.deadline !== null &&
              new Date(t.deadline).getTime() < now.getTime() &&
              t.status !== "done" &&
              t.status !== "overdue"
          );

          for (const task of qualifyingTasks) {
            expect(resultSet.has(task.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
