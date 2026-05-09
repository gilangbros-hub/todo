import { describe, it, expect } from 'vitest';
import { filterTasks, sortTasks } from '../../lib/filters';
import { Task } from '../../lib/types';

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

describe('filterTasks', () => {
  const tasks: Task[] = [
    makeTask({ id: '1', status: 'todo', priority: 'normal', type_id: 'type-a', pic_id: 'pic-1' }),
    makeTask({ id: '2', status: 'in_progress', priority: 'rare', type_id: 'type-b', pic_id: 'pic-2' }),
    makeTask({ id: '3', status: 'done', priority: 'epic', type_id: 'type-a', pic_id: 'pic-1' }),
    makeTask({ id: '4', status: 'overdue', priority: 'legendary', type_id: null, pic_id: null }),
  ];

  it('returns all tasks when no filters are active', () => {
    const result = filterTasks(tasks, {});
    expect(result).toHaveLength(4);
  });

  it('filters by status', () => {
    const result = filterTasks(tasks, { status: 'todo' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by priority', () => {
    const result = filterTasks(tasks, { priority: 'epic' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('filters by type_id', () => {
    const result = filterTasks(tasks, { type_id: 'type-a' });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['1', '3']);
  });

  it('filters by pic_id', () => {
    const result = filterTasks(tasks, { pic_id: 'pic-2' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('applies AND logic across multiple filters', () => {
    const result = filterTasks(tasks, { status: 'todo', type_id: 'type-a' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty array when no tasks match all filters', () => {
    const result = filterTasks(tasks, { status: 'done', priority: 'normal' });
    expect(result).toHaveLength(0);
  });
});

describe('sortTasks', () => {
  it('sorts by deadline ascending by default', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', deadline: '2024-03-01T00:00:00Z' }),
      makeTask({ id: '2', deadline: '2024-01-01T00:00:00Z' }),
      makeTask({ id: '3', deadline: '2024-02-01T00:00:00Z' }),
    ];
    const result = sortTasks(tasks);
    expect(result.map((t) => t.id)).toEqual(['2', '3', '1']);
  });

  it('sorts by deadline descending', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', deadline: '2024-03-01T00:00:00Z' }),
      makeTask({ id: '2', deadline: '2024-01-01T00:00:00Z' }),
      makeTask({ id: '3', deadline: '2024-02-01T00:00:00Z' }),
    ];
    const result = sortTasks(tasks, 'deadline', 'desc');
    expect(result.map((t) => t.id)).toEqual(['1', '3', '2']);
  });

  it('puts null deadlines at the end regardless of sort order', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', deadline: null }),
      makeTask({ id: '2', deadline: '2024-01-01T00:00:00Z' }),
      makeTask({ id: '3', deadline: null }),
    ];
    const ascResult = sortTasks(tasks, 'deadline', 'asc');
    expect(ascResult.map((t) => t.id)).toEqual(['2', '1', '3']);

    const descResult = sortTasks(tasks, 'deadline', 'desc');
    expect(descResult.map((t) => t.id)).toEqual(['2', '1', '3']);
  });

  it('sorts by priority ascending (normal < rare < epic < legendary)', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', priority: 'legendary' }),
      makeTask({ id: '2', priority: 'normal' }),
      makeTask({ id: '3', priority: 'epic' }),
      makeTask({ id: '4', priority: 'rare' }),
    ];
    const result = sortTasks(tasks, 'priority', 'asc');
    expect(result.map((t) => t.id)).toEqual(['2', '4', '3', '1']);
  });

  it('sorts by priority descending', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', priority: 'normal' }),
      makeTask({ id: '2', priority: 'legendary' }),
      makeTask({ id: '3', priority: 'rare' }),
    ];
    const result = sortTasks(tasks, 'priority', 'desc');
    expect(result.map((t) => t.id)).toEqual(['2', '3', '1']);
  });

  it('sorts by created_at ascending', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', created_at: '2024-03-01T00:00:00Z' }),
      makeTask({ id: '2', created_at: '2024-01-01T00:00:00Z' }),
      makeTask({ id: '3', created_at: '2024-02-01T00:00:00Z' }),
    ];
    const result = sortTasks(tasks, 'created_at', 'asc');
    expect(result.map((t) => t.id)).toEqual(['2', '3', '1']);
  });

  it('does not mutate the original array', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', deadline: '2024-03-01T00:00:00Z' }),
      makeTask({ id: '2', deadline: '2024-01-01T00:00:00Z' }),
    ];
    const original = [...tasks];
    sortTasks(tasks);
    expect(tasks).toEqual(original);
  });
});
