import { Task, Priority, Status } from './types';

// --- Filter Types ---

export interface TaskFilters {
  status?: Status;
  priority?: Priority;
  type_id?: string;
  pic_id?: string;
}

// --- Priority sort order (ascending rarity) ---

const PRIORITY_ORDER: Record<Priority, number> = {
  normal: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

// --- Sort types ---

export type SortBy = 'deadline' | 'priority' | 'created_at';
export type SortOrder = 'asc' | 'desc';

/**
 * Filter tasks using AND logic across all active (non-undefined) filter criteria.
 * A task must match every specified filter to be included in the result.
 */
export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((task) => {
    if (filters.status !== undefined && task.status !== filters.status) {
      return false;
    }
    if (filters.priority !== undefined && task.priority !== filters.priority) {
      return false;
    }
    if (filters.type_id !== undefined && task.type_id !== filters.type_id) {
      return false;
    }
    if (filters.pic_id !== undefined && task.pic_id !== filters.pic_id) {
      return false;
    }
    return true;
  });
}

/**
 * Sort tasks by the given key and order.
 * - For priority: normal < rare < epic < legendary
 * - For deadline: null deadlines go to end regardless of sort order
 * - Default: deadline ascending
 */
export function sortTasks(
  tasks: Task[],
  sortBy: SortBy = 'deadline',
  sortOrder: SortOrder = 'asc'
): Task[] {
  const sorted = [...tasks];
  const direction = sortOrder === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    if (sortBy === 'priority') {
      return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * direction;
    }

    if (sortBy === 'deadline') {
      // Null deadlines always go to end
      if (a.deadline === null && b.deadline === null) return 0;
      if (a.deadline === null) return 1;
      if (b.deadline === null) return -1;
      return (new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) * direction;
    }

    if (sortBy === 'created_at') {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
    }

    return 0;
  });

  return sorted;
}
