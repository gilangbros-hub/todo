import { describe, it, expect } from 'vitest';
import { groupByStatus, groupByType } from '../../lib/grouping';
import { Task, TaskType } from '../../lib/types';

// --- Test Helpers ---

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'test-user-id',
    title: 'Test Task',
    description: null,
    type_id: null,
    pic_id: null,
    deadline: null,
    status: 'todo',
    priority: 'normal',
    parent_task_id: null,
    branch_type: null,
    branch_order: null,
    xp_reward: 10,
    pending_xp: 0,
    created_at: '2024-01-01T00:00:00Z',
    completed_at: null,
    ...overrides,
  };
}

function makeType(overrides: Partial<TaskType> = {}): TaskType {
  return {
    id: 'type-1',
    user_id: 'test-user-id',
    name: 'Development',
    icon: '⚔️',
    color: '#4a9eff',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('groupByStatus', () => {
  it('returns four empty groups when no tasks provided', () => {
    const result = groupByStatus([]);
    expect(result).toEqual({
      todo: [],
      in_progress: [],
      done: [],
      overdue: [],
    });
  });

  it('groups tasks by their status field', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'todo' }),
      makeTask({ id: '2', status: 'in_progress' }),
      makeTask({ id: '3', status: 'done' }),
      makeTask({ id: '4', status: 'overdue' }),
      makeTask({ id: '5', status: 'todo' }),
    ];
    const result = groupByStatus(tasks);
    expect(result.todo).toHaveLength(2);
    expect(result.in_progress).toHaveLength(1);
    expect(result.done).toHaveLength(1);
    expect(result.overdue).toHaveLength(1);
  });

  it('preserves total count across all groups', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'todo' }),
      makeTask({ id: '2', status: 'done' }),
      makeTask({ id: '3', status: 'done' }),
    ];
    const result = groupByStatus(tasks);
    const totalCount =
      result.todo.length + result.in_progress.length + result.done.length + result.overdue.length;
    expect(totalCount).toBe(tasks.length);
  });

  it('places each task in the correct group', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'overdue' }),
      makeTask({ id: '2', status: 'in_progress' }),
    ];
    const result = groupByStatus(tasks);
    expect(result.overdue[0].id).toBe('1');
    expect(result.in_progress[0].id).toBe('2');
  });
});

describe('groupByType', () => {
  const types: TaskType[] = [
    makeType({ id: 'type-a', name: 'Development' }),
    makeType({ id: 'type-b', name: 'Design' }),
  ];

  it('groups tasks by their type_id', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', type_id: 'type-a' }),
      makeTask({ id: '2', type_id: 'type-b' }),
      makeTask({ id: '3', type_id: 'type-a' }),
    ];
    const result = groupByType(tasks, types);
    const devGroup = result.find((g) => g.name === 'Development');
    const designGroup = result.find((g) => g.name === 'Design');
    expect(devGroup?.tasks).toHaveLength(2);
    expect(designGroup?.tasks).toHaveLength(1);
  });

  it('puts tasks with null type_id into "Unassigned" group', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', type_id: null }),
      makeTask({ id: '2', type_id: 'type-a' }),
      makeTask({ id: '3', type_id: null }),
    ];
    const result = groupByType(tasks, types);
    const unassigned = result.find((g) => g.name === 'Unassigned');
    expect(unassigned).toBeDefined();
    expect(unassigned?.type).toBeNull();
    expect(unassigned?.tasks).toHaveLength(2);
  });

  it('preserves total task count across all groups', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', type_id: 'type-a' }),
      makeTask({ id: '2', type_id: null }),
      makeTask({ id: '3', type_id: 'type-b' }),
    ];
    const result = groupByType(tasks, types);
    const totalCount = result.reduce((sum, g) => sum + g.tasks.length, 0);
    expect(totalCount).toBe(tasks.length);
  });

  it('returns empty array when no tasks provided', () => {
    const result = groupByType([], types);
    expect(result).toHaveLength(0);
  });

  it('includes type reference in each group', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', type_id: 'type-a' }),
    ];
    const result = groupByType(tasks, types);
    const devGroup = result.find((g) => g.name === 'Development');
    expect(devGroup?.type).toEqual(types[0]);
  });

  it('does not include groups for types with no tasks', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', type_id: 'type-a' }),
    ];
    const result = groupByType(tasks, types);
    const designGroup = result.find((g) => g.name === 'Design');
    expect(designGroup).toBeUndefined();
  });
});
