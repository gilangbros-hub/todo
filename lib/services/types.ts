import { supabase } from '@/lib/supabase';
import { TaskType } from '@/lib/types';
import { capString, validateHexColor } from '@/lib/security';

export interface TypeServiceResult<T = TaskType> {
  data: T | null;
  error: string | null;
}

export interface TypeListResult {
  data: TaskType[];
  error: string | null;
}

export interface DeleteTypeResult {
  success: boolean;
  error: string | null;
}

/**
 * Fetch all types ordered by created_at ascending.
 */
export async function getTypes(): Promise<TypeListResult> {
  const { data, error } = await supabase
    .from('types')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as TaskType[], error: null };
}

/**
 * Create a new type with name uniqueness check.
 */
export async function createType(data: {
  name: string;
  icon: string;
  color: string;
}): Promise<TypeServiceResult> {
  // Defense-in-depth: enforce length caps and color format before the DB check.
  const name = capString(data.name, 50);
  const icon = capString(data.icon, 100);
  const colorCheck = validateHexColor(data.color);
  if (!name) {
    return { data: null, error: 'Name cannot be empty' };
  }
  if (!icon) {
    return { data: null, error: 'Icon cannot be empty' };
  }
  if (!colorCheck.valid) {
    return { data: null, error: colorCheck.error ?? 'Invalid color' };
  }

  const { data: created, error } = await supabase
    .from('types')
    .insert({ name, icon, color: data.color.trim() })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation on name
    if (error.code === '23505') {
      return { data: null, error: 'A type with this name already exists' };
    }
    return { data: null, error: error.message };
  }

  return { data: created as TaskType, error: null };
}

/**
 * Update an existing type with validation and name uniqueness check.
 */
export async function updateType(
  id: string,
  data: Partial<{ name: string; icon: string; color: string }>
): Promise<TypeServiceResult> {
  const sanitized: Record<string, string> = {};
  if (data.name !== undefined) {
    const name = capString(data.name, 50);
    if (!name) return { data: null, error: 'Name cannot be empty' };
    sanitized.name = name;
  }
  if (data.icon !== undefined) {
    const icon = capString(data.icon, 100);
    if (!icon) return { data: null, error: 'Icon cannot be empty' };
    sanitized.icon = icon;
  }
  if (data.color !== undefined) {
    const colorCheck = validateHexColor(data.color);
    if (!colorCheck.valid) return { data: null, error: colorCheck.error ?? 'Invalid color' };
    sanitized.color = data.color.trim();
  }

  const { data: updated, error } = await supabase
    .from('types')
    .update(sanitized)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation on name
    if (error.code === '23505') {
      return { data: null, error: 'A type with this name already exists' };
    }
    return { data: null, error: error.message };
  }

  return { data: updated as TaskType, error: null };
}

/**
 * Delete a type only if no tasks reference it.
 * Returns an error with the count of referencing tasks if deletion is blocked.
 */
export async function deleteType(id: string): Promise<DeleteTypeResult> {
  // First, count tasks that reference this type
  const { count, error: countError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('type_id', id);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete type: it is assigned to ${count} task${count > 1 ? 's' : ''}`,
    };
  }

  // Safe to delete
  const { error: deleteError } = await supabase
    .from('types')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  return { success: true, error: null };
}
