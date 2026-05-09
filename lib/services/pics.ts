import { supabase } from '@/lib/supabase';
import { PIC } from '@/lib/types';
import { capString, sanitizeIdentifier } from '@/lib/security';

export interface PicServiceResult<T = PIC> {
  data: T | null;
  error: string | null;
}

export interface PicListResult {
  data: PIC[];
  error: string | null;
}

export interface DeletePicResult {
  success: boolean;
  error: string | null;
}

/**
 * Fetch all PICs sorted by created_at descending.
 */
export async function getPics(): Promise<PicListResult> {
  const { data, error } = await supabase
    .from('pics')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as PIC[], error: null };
}

/**
 * Create a new PIC with validation.
 */
export async function createPic(data: {
  name: string;
  avatar: string;
  rpg_class: string;
}): Promise<PicServiceResult> {
  const name = capString(data.name, 50);
  const avatar = sanitizeIdentifier(data.avatar, 255);
  const rpg_class = capString(data.rpg_class, 30);
  if (!name) return { data: null, error: 'Name cannot be empty' };
  if (!avatar) return { data: null, error: 'Avatar cannot be empty' };
  if (!rpg_class) return { data: null, error: 'RPG class cannot be empty' };

  const { data: created, error } = await supabase
    .from('pics')
    .insert({ name, avatar, rpg_class })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: created as PIC, error: null };
}

/**
 * Update an existing PIC with validation.
 */
export async function updatePic(
  id: string,
  data: Partial<{ name: string; avatar: string; rpg_class: string }>
): Promise<PicServiceResult> {
  const sanitized: Record<string, string> = {};
  if (data.name !== undefined) {
    const name = capString(data.name, 50);
    if (!name) return { data: null, error: 'Name cannot be empty' };
    sanitized.name = name;
  }
  if (data.avatar !== undefined) {
    const avatar = sanitizeIdentifier(data.avatar, 255);
    if (!avatar) return { data: null, error: 'Avatar cannot be empty' };
    sanitized.avatar = avatar;
  }
  if (data.rpg_class !== undefined) {
    const rpg_class = capString(data.rpg_class, 30);
    if (!rpg_class) return { data: null, error: 'RPG class cannot be empty' };
    sanitized.rpg_class = rpg_class;
  }

  const { data: updated, error } = await supabase
    .from('pics')
    .update(sanitized)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: updated as PIC, error: null };
}

/**
 * Delete a PIC only if no tasks reference it.
 * Returns an error with the count of referencing tasks if deletion is blocked.
 */
export async function deletePic(id: string): Promise<DeletePicResult> {
  // First, count tasks that reference this PIC
  const { count, error: countError } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('pic_id', id);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete PIC: it is assigned to ${count} task${count > 1 ? 's' : ''}`,
    };
  }

  // Safe to delete
  const { error: deleteError } = await supabase
    .from('pics')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  return { success: true, error: null };
}
