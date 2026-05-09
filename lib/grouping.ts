import { Task, TaskType, Status, STATUSES } from './types';

// --- Grouping Types ---

export interface TypeGroup {
  name: string;
  type: TaskType | null;
  tasks: Task[];
}

/**
 * Group tasks by status into four groups: todo, in_progress, done, overdue.
 * Every task appears in exactly one group matching its status field.
 */
export function groupByStatus(tasks: Task[]): Record<Status, Task[]> {
  const groups: Record<Status, Task[]> = {
    todo: [],
    in_progress: [],
    done: [],
    overdue: [],
  };

  for (const task of tasks) {
    groups[task.status].push(task);
  }

  return groups;
}

/**
 * Group tasks by type_id.
 * - Tasks with a non-null type_id appear in the group matching that type.
 * - Tasks with null type_id appear in the "Unassigned" group (type: null).
 * - Each group has the type name and associated tasks.
 */
export function groupByType(tasks: Task[], types: TaskType[]): TypeGroup[] {
  const typeMap = new Map<string, TaskType>();
  for (const type of types) {
    typeMap.set(type.id, type);
  }

  const groupMap = new Map<string | null, Task[]>();

  for (const task of tasks) {
    const key = task.type_id;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(task);
  }

  const result: TypeGroup[] = [];

  // Add typed groups
  for (const type of types) {
    const groupTasks = groupMap.get(type.id);
    if (groupTasks && groupTasks.length > 0) {
      result.push({
        name: type.name,
        type,
        tasks: groupTasks,
      });
    }
  }

  // Add unassigned group (null type_id)
  const unassignedTasks = groupMap.get(null);
  if (unassignedTasks && unassignedTasks.length > 0) {
    result.push({
      name: 'Unassigned',
      type: null,
      tasks: unassignedTasks,
    });
  }

  return result;
}
