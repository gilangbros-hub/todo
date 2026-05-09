import { Task } from './types';

/**
 * Validation result returned by title and name validators.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Nesting depth check result.
 */
export interface NestingDepthResult {
  allowed: boolean;
  currentDepth: number;
}

/**
 * Validates a task title.
 * - Trims input, checks length 3–100 characters.
 * - Rejects empty, whitespace-only, < 3 chars, or > 100 chars.
 */
export function validateTaskTitle(input: string): ValidationResult {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Task title cannot be empty' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Task title must be at least 3 characters' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Task title must not exceed 100 characters' };
  }

  return { valid: true };
}

/**
 * Validates a Type or PIC name.
 * - Trims input, checks length 1–50 characters.
 * - Rejects empty, whitespace-only, or > 50 chars.
 */
export function validateName(input: string): ValidationResult {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Name must not exceed 50 characters' };
  }

  return { valid: true };
}

/**
 * Checks the nesting depth of a task by traversing the parent_task_id chain.
 * - Counts depth levels from the given task up to the root.
 * - Allows adding a subtask if depth < 3, rejects at depth >= 3.
 */
export function checkNestingDepth(taskId: string, tasks: Task[]): NestingDepthResult {
  const taskMap = new Map<string, Task>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  let currentDepth = 0;
  let currentTask = taskMap.get(taskId);

  while (currentTask && currentTask.parent_task_id) {
    currentDepth++;
    currentTask = taskMap.get(currentTask.parent_task_id);
  }

  return {
    allowed: currentDepth < 3,
    currentDepth,
  };
}
