import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterTasks, sortTasks, TaskFilters, SortBy, SortOrder } from '@/lib/filters';
import { groupByStatus, groupByType } from '@/lib/grouping';
import { Task, TaskType, Status, Priority, STATUSES, PRIORITIES } from '@/lib/types';

// --- Task generator helper ---

const taskArb = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 3, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  type_id: fc.option(fc.uuid(), { nil: null }),
  pic_id: fc.option(fc.uuid(), { nil: null }),
  deadline: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
  status: fc.constantFrom<Status>('todo', 'in_progress', 'done', 'overdue'),
  priority: fc.constantFrom<Priority>('normal', 'rare', 'epic', 'legendary'),
  parent_task_id: fc.constant(null),
  branch_type: fc.option(fc.constantFrom('sequential' as const, 'parallel' as const), { nil: null }),
  branch_order: fc.option(fc.nat({ max: 100 }), { nil: null }),
  xp_reward: fc.nat({ max: 100 }),
  created_at: fc.date().map(d => d.toISOString()),
  completed_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
});

const taskListArb = fc.array(taskArb, { minLength: 0, maxLength: 30 });

// --- Filter criteria generator ---

const filtersArb = fc.record({
  status: fc.option(fc.constantFrom<Status>('todo', 'in_progress', 'done', 'overdue'), { nil: undefined }),
  priority: fc.option(fc.constantFrom<Priority>('normal', 'rare', 'epic', 'legendary'), { nil: undefined }),
  type_id: fc.option(fc.uuid(), { nil: undefined }),
  pic_id: fc.option(fc.uuid(), { nil: undefined }),
});

// --- Sort key generators ---

const sortByArb = fc.constantFrom<SortBy>('deadline', 'priority', 'created_at');
const sortOrderArb = fc.constantFrom<SortOrder>('asc', 'desc');

// --- TaskType generator for groupByType ---

const taskTypeArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.string({ minLength: 1, maxLength: 100 }),
  color: fc.string({ minLength: 1, maxLength: 20 }),
  created_at: fc.date().map(d => d.toISOString()),
});

// ============================================================
// Property 5: Task Filter Logic
// ============================================================

describe('Feature: rpg-quest-board, Property 5: Task Filter Logic', () => {
  /**
   * Validates: Requirements 1.8
   *
   * For any list of tasks and any combination of filter criteria,
   * the filter function returns a list where:
   * - Every returned task matches ALL active filter criteria (AND logic)
   * - No task matching all active criteria is excluded from the result
   * - The result is a subset of the input list
   */

  it('every returned task matches ALL active filter criteria', () => {
    fc.assert(
      fc.property(taskListArb, filtersArb, (tasks, filters) => {
        const result = filterTasks(tasks, filters as TaskFilters);

        for (const task of result) {
          if (filters.status !== undefined) {
            expect(task.status).toBe(filters.status);
          }
          if (filters.priority !== undefined) {
            expect(task.priority).toBe(filters.priority);
          }
          if (filters.type_id !== undefined) {
            expect(task.type_id).toBe(filters.type_id);
          }
          if (filters.pic_id !== undefined) {
            expect(task.pic_id).toBe(filters.pic_id);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('no task matching all criteria is excluded from the result', () => {
    fc.assert(
      fc.property(taskListArb, filtersArb, (tasks, filters) => {
        const result = filterTasks(tasks, filters as TaskFilters);
        const resultIds = new Set(result.map(t => t.id));

        for (const task of tasks) {
          const matchesAll =
            (filters.status === undefined || task.status === filters.status) &&
            (filters.priority === undefined || task.priority === filters.priority) &&
            (filters.type_id === undefined || task.type_id === filters.type_id) &&
            (filters.pic_id === undefined || task.pic_id === filters.pic_id);

          if (matchesAll) {
            expect(resultIds.has(task.id)).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('result is a subset of the input list (result.length <= input.length)', () => {
    fc.assert(
      fc.property(taskListArb, filtersArb, (tasks, filters) => {
        const result = filterTasks(tasks, filters as TaskFilters);
        expect(result.length).toBeLessThanOrEqual(tasks.length);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 6: Task Sort Ordering
// ============================================================

describe('Feature: rpg-quest-board, Property 6: Task Sort Ordering', () => {
  /**
   * Validates: Requirements 1.9
   *
   * For any list of tasks and any sort key, the sort function returns a list where:
   * - Every adjacent pair of elements is correctly ordered by the sort key
   * - The output contains exactly the same elements as the input
   * - Default sort is deadline ascending
   */

  const PRIORITY_ORDER: Record<Priority, number> = {
    normal: 0,
    rare: 1,
    epic: 2,
    legendary: 3,
  };

  it('adjacent pairs are correctly ordered for the sort key', () => {
    fc.assert(
      fc.property(taskListArb, sortByArb, sortOrderArb, (tasks, sortBy, sortOrder) => {
        const result = sortTasks(tasks, sortBy, sortOrder);
        const direction = sortOrder === 'asc' ? 1 : -1;

        for (let i = 0; i < result.length - 1; i++) {
          const a = result[i];
          const b = result[i + 1];

          if (sortBy === 'priority') {
            const diff = (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * direction;
            expect(diff).toBeLessThanOrEqual(0);
          } else if (sortBy === 'deadline') {
            // Null deadlines always go to end
            if (a.deadline === null && b.deadline === null) {
              // Both null — any order is fine
            } else if (a.deadline === null) {
              // a is null, b is not — a should be at end, so this is wrong unless b is also null
              // Actually null goes to end, so if a is null and b is not, a should come AFTER b
              // This means we should NOT see a null before a non-null
              expect(b.deadline).toBeNull();
            } else if (b.deadline === null) {
              // b is null, a is not — correct (null goes to end)
            } else {
              const diff = (new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) * direction;
              expect(diff).toBeLessThanOrEqual(0);
            }
          } else if (sortBy === 'created_at') {
            const diff = (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
            expect(diff).toBeLessThanOrEqual(0);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('result contains the same elements as input (by id)', () => {
    fc.assert(
      fc.property(taskListArb, sortByArb, sortOrderArb, (tasks, sortBy, sortOrder) => {
        const result = sortTasks(tasks, sortBy, sortOrder);

        expect(result.length).toBe(tasks.length);

        const inputIds = tasks.map(t => t.id).sort();
        const resultIds = result.map(t => t.id).sort();
        expect(resultIds).toEqual(inputIds);
      }),
      { numRuns: 100 }
    );
  });

  it('default sort is deadline ascending', () => {
    fc.assert(
      fc.property(taskListArb, (tasks) => {
        const result = sortTasks(tasks);

        for (let i = 0; i < result.length - 1; i++) {
          const a = result[i];
          const b = result[i + 1];

          if (a.deadline === null && b.deadline === null) {
            // Both null — fine
          } else if (a.deadline === null) {
            // Null goes to end — if a is null, b must also be null
            expect(b.deadline).toBeNull();
          } else if (b.deadline === null) {
            // b is null, a is not — correct
          } else {
            expect(new Date(a.deadline).getTime()).toBeLessThanOrEqual(new Date(b.deadline).getTime());
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 7: Kanban Grouping by Status
// ============================================================

describe('Feature: rpg-quest-board, Property 7: Kanban Grouping by Status', () => {
  /**
   * Validates: Requirements 1.5
   *
   * For any list of tasks with various statuses, the kanban grouping function
   * produces four groups (todo, in_progress, done, overdue) where:
   * - Every task appears in exactly one group
   * - Each task's group matches its status field
   * - The total count across all groups equals the input list length
   */

  it('total count across all groups equals input list length', () => {
    fc.assert(
      fc.property(taskListArb, (tasks) => {
        const groups = groupByStatus(tasks);
        const totalCount = groups.todo.length + groups.in_progress.length + groups.done.length + groups.overdue.length;
        expect(totalCount).toBe(tasks.length);
      }),
      { numRuns: 100 }
    );
  });

  it('every task appears in exactly one group', () => {
    fc.assert(
      fc.property(taskListArb, (tasks) => {
        const groups = groupByStatus(tasks);
        const allGroupedTasks = [
          ...groups.todo,
          ...groups.in_progress,
          ...groups.done,
          ...groups.overdue,
        ];

        // Every task from input appears in the grouped output
        const groupedIds = allGroupedTasks.map(t => t.id);
        const inputIds = tasks.map(t => t.id);
        expect(groupedIds.sort()).toEqual(inputIds.sort());
      }),
      { numRuns: 100 }
    );
  });

  it("each task's group key matches its status field", () => {
    fc.assert(
      fc.property(taskListArb, (tasks) => {
        const groups = groupByStatus(tasks);

        for (const task of groups.todo) {
          expect(task.status).toBe('todo');
        }
        for (const task of groups.in_progress) {
          expect(task.status).toBe('in_progress');
        }
        for (const task of groups.done) {
          expect(task.status).toBe('done');
        }
        for (const task of groups.overdue) {
          expect(task.status).toBe('overdue');
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 8: Folder Grouping by Type
// ============================================================

describe('Feature: rpg-quest-board, Property 8: Folder Grouping by Type', () => {
  /**
   * Validates: Requirements 1.4
   *
   * For any list of tasks with various type_id values (including null),
   * the folder grouping function produces groups where:
   * - Every task appears in exactly one group
   * - Tasks with a non-null type_id appear in the group matching that type
   * - Tasks with null type_id appear in the "Unassigned" group
   * - The total count across all groups equals the input list length
   */

  // Generate tasks that reference some of the generated types
  const tasksWithTypesArb = fc.array(taskTypeArb, { minLength: 1, maxLength: 5 }).chain((types) => {
    const typeIds = types.map(t => t.id);
    const taskWithKnownTypeArb = fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 3, maxLength: 100 }),
      description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
      type_id: fc.option(fc.constantFrom(...typeIds), { nil: null }),
      pic_id: fc.option(fc.uuid(), { nil: null }),
      deadline: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
      status: fc.constantFrom<Status>('todo', 'in_progress', 'done', 'overdue'),
      priority: fc.constantFrom<Priority>('normal', 'rare', 'epic', 'legendary'),
      parent_task_id: fc.constant(null),
      branch_type: fc.option(fc.constantFrom('sequential' as const, 'parallel' as const), { nil: null }),
      branch_order: fc.option(fc.nat({ max: 100 }), { nil: null }),
      xp_reward: fc.nat({ max: 100 }),
      created_at: fc.date().map(d => d.toISOString()),
      completed_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
    });

    return fc.tuple(
      fc.array(taskWithKnownTypeArb, { minLength: 0, maxLength: 20 }),
      fc.constant(types)
    );
  });

  it('total count across all groups equals input list length', () => {
    fc.assert(
      fc.property(tasksWithTypesArb, ([tasks, types]) => {
        const groups = groupByType(tasks, types);
        const totalCount = groups.reduce((sum, g) => sum + g.tasks.length, 0);
        expect(totalCount).toBe(tasks.length);
      }),
      { numRuns: 100 }
    );
  });

  it('tasks with null type_id are in the "Unassigned" group', () => {
    fc.assert(
      fc.property(tasksWithTypesArb, ([tasks, types]) => {
        const groups = groupByType(tasks, types);
        const unassignedGroup = groups.find(g => g.name === 'Unassigned');
        const nullTypeTasks = tasks.filter(t => t.type_id === null);

        if (nullTypeTasks.length > 0) {
          expect(unassignedGroup).toBeDefined();
          expect(unassignedGroup!.type).toBeNull();
          const unassignedIds = new Set(unassignedGroup!.tasks.map(t => t.id));
          for (const task of nullTypeTasks) {
            expect(unassignedIds.has(task.id)).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('tasks with non-null type_id are in the matching type group', () => {
    fc.assert(
      fc.property(tasksWithTypesArb, ([tasks, types]) => {
        const groups = groupByType(tasks, types);
        const typedTasks = tasks.filter(t => t.type_id !== null);

        for (const task of typedTasks) {
          const matchingType = types.find(t => t.id === task.type_id);
          if (matchingType) {
            const group = groups.find(g => g.type?.id === task.type_id);
            expect(group).toBeDefined();
            const groupIds = new Set(group!.tasks.map(t => t.id));
            expect(groupIds.has(task.id)).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('every task appears in exactly one group', () => {
    fc.assert(
      fc.property(tasksWithTypesArb, ([tasks, types]) => {
        const groups = groupByType(tasks, types);
        const allGroupedTasks = groups.flatMap(g => g.tasks);
        const groupedIds = allGroupedTasks.map(t => t.id);

        // Check no duplicates
        expect(groupedIds.length).toBe(new Set(groupedIds).size);

        // Check all tasks are accounted for
        // Note: tasks with type_ids not in the types array won't be in typed groups
        // but they also won't be in unassigned (since type_id is not null)
        // The implementation groups by type_id key — tasks with unknown type_ids
        // won't appear in any group from the types list, but also won't be unassigned
        // Actually looking at the implementation: groupMap uses type_id as key,
        // and only types in the types array get their own group. Tasks with type_ids
        // not in the types array are simply not included in any group.
        // For our test, we generate tasks that only reference known type_ids or null,
        // so all tasks should be accounted for.
        expect(groupedIds.length).toBe(tasks.length);
      }),
      { numRuns: 100 }
    );
  });
});
