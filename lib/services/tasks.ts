import { supabase } from '@/lib/supabase';
import { Task, Priority, BASE_XP } from '@/lib/types';
import { checkNestingDepth } from '@/lib/validation';
import { capString } from '@/lib/security';

/**
 * Fetch all tasks with their related type and pic data.
 */
export async function getTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, types(*), pics(*)');

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return data;
}

/**
 * Fetch a single task by ID, including its subtasks.
 */
export async function getTaskById(id: string) {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*, types(*), pics(*)')
    .eq('id', id)
    .single();

  if (taskError) {
    throw new Error(`Failed to fetch task: ${taskError.message}`);
  }

  const { data: subtasks, error: subtasksError } = await supabase
    .from('tasks')
    .select('*, types(*), pics(*)')
    .eq('parent_task_id', id)
    .order('branch_order', { ascending: true });

  if (subtasksError) {
    throw new Error(`Failed to fetch subtasks: ${subtasksError.message}`);
  }

  return { ...task, subtasks };
}

/**
 * Create a new task with XP reward calculated from priority.
 */
export async function createTask(data: {
  title: string;
  description?: string | null;
  type_id?: string | null;
  pic_id?: string | null;
  deadline?: string | null;
  priority?: Priority;
  parent_task_id?: string | null;
  branch_type?: 'sequential' | 'parallel' | null;
  branch_order?: number | null;
}) {
  const priority = data.priority ?? 'normal';
  const xp_reward = BASE_XP[priority];

  // Length caps (defense-in-depth against DB column truncation/abuse).
  const title = capString(data.title, 100);
  if (!title) {
    throw new Error('Task title cannot be empty');
  }
  const description = data.description ? capString(data.description, 500) || null : null;

  // user_id is automatically set by the database DEFAULT auth.uid().
  // The browser client includes session cookies, so auth.uid() resolves to
  // the authenticated user. RLS INSERT policy validates ownership.
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      type_id: data.type_id ?? null,
      pic_id: data.pic_id ?? null,
      deadline: data.deadline ?? null,
      status: 'todo',
      priority,
      parent_task_id: data.parent_task_id ?? null,
      branch_type: data.branch_type ?? null,
      branch_order: data.branch_order ?? null,
      xp_reward,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return task;
}

/**
 * Update an existing task's fields.
 */
export async function updateTask(
  id: string,
  data: Partial<Pick<Task, 'title' | 'description' | 'type_id' | 'pic_id' | 'deadline' | 'status' | 'priority' | 'branch_type' | 'branch_order'>>
) {
  const { data: task, error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return task;
}

/**
 * Complete a task: set status to "done" and completed_at timestamp.
 * Guards against double-completion — no-op if already done.
 */
export async function completeTask(id: string) {
  // Fetch current task to check status
  const { data: existing, error: fetchError } = await supabase
    .from('tasks')
    .select('id, status, completed_at')
    .eq('id', id)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch task for completion: ${fetchError.message}`);
  }

  // Guard against double-completion
  if (existing.status === 'done') {
    return existing;
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete task: ${error.message}`);
  }

  return task;
}

/**
 * Create a subtask under a parent task.
 * Validates nesting depth before insertion.
 */
export async function createSubtask(
  parentId: string,
  data: {
    title: string;
    description?: string | null;
    priority?: Priority;
    branch_order?: number | null;
  }
) {
  // Fetch all tasks to check nesting depth
  const { data: allTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title, description, type_id, pic_id, deadline, status, priority, parent_task_id, branch_type, branch_order, xp_reward, created_at, completed_at');

  if (fetchError) {
    throw new Error(`Failed to fetch tasks for nesting check: ${fetchError.message}`);
  }

  const nestingResult = checkNestingDepth(parentId, allTasks as Task[]);

  if (!nestingResult.allowed) {
    throw new Error('Maximum nesting depth of 3 levels has been reached');
  }

  const priority = data.priority ?? 'normal';
  const xp_reward = BASE_XP[priority];

  const title = capString(data.title, 100);
  if (!title) {
    throw new Error('Subtask title cannot be empty');
  }
  const description = data.description ? capString(data.description, 500) || null : null;

  // user_id is automatically set by the database DEFAULT auth.uid().
  const { data: subtask, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      parent_task_id: parentId,
      status: 'todo',
      priority,
      branch_order: data.branch_order ?? null,
      xp_reward,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create subtask: ${error.message}`);
  }

  return subtask;
}

/**
 * Batch update tasks to "overdue" status for the given IDs.
 */
export async function updateOverdueTasks(taskIds: string[]) {
  if (taskIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'overdue' })
    .in('id', taskIds)
    .select();

  if (error) {
    throw new Error(`Failed to update overdue tasks: ${error.message}`);
  }

  return data;
}
