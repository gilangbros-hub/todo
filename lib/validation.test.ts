import { describe, it, expect } from 'vitest';
import { validateTaskTitle, validateName, checkNestingDepth, validateMoveNote } from './validation';
import { Task } from './types';

describe('validateTaskTitle', () => {
  it('accepts a valid title (3-100 chars)', () => {
    expect(validateTaskTitle('Fix bug')).toEqual({ valid: true });
  });

  it('accepts a title with exactly 3 characters', () => {
    expect(validateTaskTitle('abc')).toEqual({ valid: true });
  });

  it('accepts a title with exactly 100 characters', () => {
    const title = 'a'.repeat(100);
    expect(validateTaskTitle(title)).toEqual({ valid: true });
  });

  it('rejects an empty string', () => {
    const result = validateTaskTitle('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects a whitespace-only string', () => {
    const result = validateTaskTitle('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects a title shorter than 3 chars after trimming', () => {
    const result = validateTaskTitle('ab');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 3');
  });

  it('rejects a title longer than 100 chars after trimming', () => {
    const title = 'a'.repeat(101);
    const result = validateTaskTitle(title);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('100');
  });

  it('trims whitespace before validating', () => {
    expect(validateTaskTitle('  hello  ')).toEqual({ valid: true });
  });
});

describe('validateName', () => {
  it('accepts a valid name (1-50 chars)', () => {
    expect(validateName('Development')).toEqual({ valid: true });
  });

  it('accepts a name with exactly 1 character', () => {
    expect(validateName('A')).toEqual({ valid: true });
  });

  it('accepts a name with exactly 50 characters', () => {
    const name = 'a'.repeat(50);
    expect(validateName(name)).toEqual({ valid: true });
  });

  it('rejects an empty string', () => {
    const result = validateName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects a whitespace-only string', () => {
    const result = validateName('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects a name longer than 50 chars after trimming', () => {
    const name = 'a'.repeat(51);
    const result = validateName(name);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('50');
  });

  it('trims whitespace before validating', () => {
    expect(validateName(' Bob ')).toEqual({ valid: true });
  });
});

describe('checkNestingDepth', () => {
  function makeTask(overrides: Partial<Task> & { id: string }): Task {
    return {
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

  it('returns depth 0 and allowed for a root task', () => {
    const tasks = [makeTask({ id: 'root' })];
    const result = checkNestingDepth('root', tasks);
    expect(result).toEqual({ allowed: true, currentDepth: 0 });
  });

  it('returns depth 1 and allowed for a direct child', () => {
    const tasks = [
      makeTask({ id: 'root' }),
      makeTask({ id: 'child', parent_task_id: 'root' }),
    ];
    const result = checkNestingDepth('child', tasks);
    expect(result).toEqual({ allowed: true, currentDepth: 1 });
  });

  it('returns depth 2 and allowed for a grandchild', () => {
    const tasks = [
      makeTask({ id: 'root' }),
      makeTask({ id: 'child', parent_task_id: 'root' }),
      makeTask({ id: 'grandchild', parent_task_id: 'child' }),
    ];
    const result = checkNestingDepth('grandchild', tasks);
    expect(result).toEqual({ allowed: true, currentDepth: 2 });
  });

  it('returns depth 3 and NOT allowed for a great-grandchild', () => {
    const tasks = [
      makeTask({ id: 'root' }),
      makeTask({ id: 'child', parent_task_id: 'root' }),
      makeTask({ id: 'grandchild', parent_task_id: 'child' }),
      makeTask({ id: 'great-grandchild', parent_task_id: 'grandchild' }),
    ];
    const result = checkNestingDepth('great-grandchild', tasks);
    expect(result).toEqual({ allowed: false, currentDepth: 3 });
  });

  it('handles task not found in the list gracefully', () => {
    const tasks = [makeTask({ id: 'root' })];
    const result = checkNestingDepth('nonexistent', tasks);
    expect(result).toEqual({ allowed: true, currentDepth: 0 });
  });
});

describe('validateMoveNote', () => {
  it('accepts a valid note (1-300 chars)', () => {
    expect(validateMoveNote('Attacked the dragon')).toEqual({ valid: true });
  });

  it('accepts a note with exactly 1 character after trim', () => {
    expect(validateMoveNote('a')).toEqual({ valid: true });
  });

  it('accepts a note with exactly 300 characters', () => {
    const note = 'a'.repeat(300);
    expect(validateMoveNote(note)).toEqual({ valid: true });
  });

  it('rejects an empty string', () => {
    const result = validateMoveNote('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Move note cannot be empty');
  });

  it('rejects a whitespace-only string', () => {
    const result = validateMoveNote('   \t\n  ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Move note cannot be empty');
  });

  it('rejects a note exceeding 300 characters after trim', () => {
    const note = 'a'.repeat(301);
    const result = validateMoveNote(note);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Move note must not exceed 300 characters');
  });

  it('trims whitespace before validating', () => {
    expect(validateMoveNote('  hello world  ')).toEqual({ valid: true });
  });

  it('trims whitespace before checking length limit', () => {
    // 300 chars + surrounding whitespace should pass
    const note = '  ' + 'a'.repeat(300) + '  ';
    expect(validateMoveNote(note)).toEqual({ valid: true });
  });
});
