import { describe, it, expect } from 'vitest';
import { calculateSubtaskProgress } from '../../lib/progress';
import { Task } from '../../lib/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-id',
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
    created_at: '2024-01-01T00:00:00Z',
    completed_at: null,
    ...overrides,
  };
}

describe('calculateSubtaskProgress', () => {
  it('returns 0 when subtasks array is empty', () => {
    expect(calculateSubtaskProgress([])).toBe(0);
  });

  it('returns 0 when no subtasks are done', () => {
    const subtasks = [
      makeTask({ status: 'todo' }),
      makeTask({ status: 'in_progress' }),
    ];
    expect(calculateSubtaskProgress(subtasks)).toBe(0);
  });

  it('returns 100 when all subtasks are done', () => {
    const subtasks = [
      makeTask({ status: 'done' }),
      makeTask({ status: 'done' }),
      makeTask({ status: 'done' }),
    ];
    expect(calculateSubtaskProgress(subtasks)).toBe(100);
  });

  it('returns 50 when half the subtasks are done', () => {
    const subtasks = [
      makeTask({ status: 'done' }),
      makeTask({ status: 'todo' }),
    ];
    expect(calculateSubtaskProgress(subtasks)).toBe(50);
  });

  it('returns 33 when 1 of 3 subtasks is done (rounds down)', () => {
    const subtasks = [
      makeTask({ status: 'done' }),
      makeTask({ status: 'todo' }),
      makeTask({ status: 'in_progress' }),
    ];
    expect(calculateSubtaskProgress(subtasks)).toBe(33);
  });

  it('returns 67 when 2 of 3 subtasks are done (rounds up)', () => {
    const subtasks = [
      makeTask({ status: 'done' }),
      makeTask({ status: 'done' }),
      makeTask({ status: 'todo' }),
    ];
    expect(calculateSubtaskProgress(subtasks)).toBe(67);
  });
});
