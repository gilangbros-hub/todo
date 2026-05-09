import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateTaskTitle, validateName, checkNestingDepth } from '@/lib/validation';
import { Task } from '@/lib/types';

/**
 * Feature: rpg-quest-board, Property 10: Name Validation
 * Validates: Requirements 2.2, 8.2, 8.3, 9.2, 9.6
 *
 * For any string input, the name validation functions SHALL:
 * - Accept strings with length between 3 and 100 characters (for Task titles)
 * - Accept strings with length between 1 and 50 characters (for Type and PIC names)
 * - Reject empty strings and strings exceeding the maximum length
 * - Reject strings composed entirely of whitespace
 */
describe('Property 10: Name Validation', () => {
  describe('validateTaskTitle', () => {
    it('accepts strings with trimmed length between 3 and 100', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const trimmed = input.trim();
          const result = validateTaskTitle(input);

          if (trimmed.length >= 3 && trimmed.length <= 100) {
            expect(result.valid).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('rejects empty or whitespace-only strings (trimmed length === 0)', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const trimmed = input.trim();
          const result = validateTaskTitle(input);

          if (trimmed.length === 0) {
            expect(result.valid).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('rejects strings with trimmed length less than 3', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const trimmed = input.trim();
          const result = validateTaskTitle(input);

          if (trimmed.length > 0 && trimmed.length < 3) {
            expect(result.valid).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('rejects strings with trimmed length greater than 100', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const trimmed = input.trim();
          const result = validateTaskTitle(input);

          if (trimmed.length > 100) {
            expect(result.valid).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('validates correctly for any arbitrary string', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const trimmed = input.trim();
          const result = validateTaskTitle(input);

          if (trimmed.length >= 3 && trimmed.length <= 100) {
            expect(result.valid).toBe(true);
          } else {
            expect(result.valid).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('validateName', () => {
    it('accepts strings with trimmed length between 1 and 50', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const trimmed = input.trim();
          const result = validateName(input);

          if (trimmed.length >= 1 && trimmed.length <= 50) {
            expect(result.valid).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('rejects empty or whitespace-only strings (trimmed length === 0)', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const trimmed = input.trim();
          const result = validateName(input);

          if (trimmed.length === 0) {
            expect(result.valid).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('rejects strings with trimmed length greater than 50', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const trimmed = input.trim();
          const result = validateName(input);

          if (trimmed.length > 50) {
            expect(result.valid).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('validates correctly for any arbitrary string', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const trimmed = input.trim();
          const result = validateName(input);

          if (trimmed.length >= 1 && trimmed.length <= 50) {
            expect(result.valid).toBe(true);
          } else {
            expect(result.valid).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Feature: rpg-quest-board, Property 11: Nesting Depth Validation
 * Validates: Requirements 3.8
 *
 * For any task tree structure, the nesting depth check function SHALL:
 * - Allow adding a subtask when the current depth is less than 3
 * - Reject adding a subtask when the current depth is already 3
 * - Correctly calculate depth by traversing parent_task_id references up to the root
 */
describe('Property 11: Nesting Depth Validation', () => {
  function makeTask(id: string, parentId: string | null): Task {
    return {
      id,
      user_id: 'test-user-id',
      title: `Task ${id}`,
      description: null,
      type_id: null,
      pic_id: null,
      deadline: null,
      status: 'todo',
      priority: 'normal',
      parent_task_id: parentId,
      branch_type: null,
      branch_order: null,
      xp_reward: 10,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
  }

  it('correctly calculates depth and allows/rejects based on depth < 3 rule', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        (chainLength) => {
          // Build a chain of tasks: task-0 (root) → task-1 → task-2 → ... → task-N
          const tasks: Task[] = [];
          for (let i = 0; i <= chainLength; i++) {
            const parentId = i === 0 ? null : `task-${i - 1}`;
            tasks.push(makeTask(`task-${i}`, parentId));
          }

          // Check each task in the chain
          for (let i = 0; i <= chainLength; i++) {
            const result = checkNestingDepth(`task-${i}`, tasks);

            // Depth of task-i is i (number of ancestors)
            expect(result.currentDepth).toBe(i);

            // Allowed if depth < 3
            if (i < 3) {
              expect(result.allowed).toBe(true);
            } else {
              expect(result.allowed).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('root tasks always have depth 0 and are allowed', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (taskId) => {
          const tasks: Task[] = [makeTask(taskId, null)];
          const result = checkNestingDepth(taskId, tasks);

          expect(result.currentDepth).toBe(0);
          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('depth equals the number of parent_task_id hops to root', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        (depth) => {
          // Build a chain of exactly `depth + 1` tasks (root + depth children)
          const tasks: Task[] = [];
          for (let i = 0; i <= depth; i++) {
            const parentId = i === 0 ? null : `node-${i - 1}`;
            tasks.push(makeTask(`node-${i}`, parentId));
          }

          // The leaf task at position `depth` should have currentDepth === depth
          const result = checkNestingDepth(`node-${depth}`, tasks);
          expect(result.currentDepth).toBe(depth);
        }
      ),
      { numRuns: 100 }
    );
  });
});
