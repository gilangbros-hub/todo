import { supabase } from '@/lib/supabase';
import { BattleLogMove, MoveType, PENDING_XP_PER_MOVE } from '@/lib/types';
import { validateMoveNote } from '@/lib/validation';

export interface CreateMoveInput {
  taskId: string;
  moveType: MoveType;
  note: string;
}

export interface CreateMoveResult {
  move: BattleLogMove;
  newPendingXp: number;
}

/**
 * Create a new battle log move for a task.
 * Validates the note, inserts the move into battle_log_moves,
 * and increments the task's pending_xp by PENDING_XP_PER_MOVE.
 */
export async function createMove(input: CreateMoveInput): Promise<CreateMoveResult> {
  const { taskId, moveType, note } = input;

  // Validate note
  const validation = validateMoveNote(note);
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid move note');
  }

  const trimmedNote = note.trim();

  // Insert the move into battle_log_moves
  // user_id is set by the database via DEFAULT auth.uid()
  const { data: move, error: moveError } = await supabase
    .from('battle_log_moves')
    .insert({
      task_id: taskId,
      move_type: moveType,
      note: trimmedNote,
      pending_xp: PENDING_XP_PER_MOVE,
    })
    .select()
    .single();

  if (moveError || !move) {
    throw new Error(`Failed to create move: ${moveError?.message}`);
  }

  // Fetch current pending_xp from the task
  const { data: currentTask, error: fetchError } = await supabase
    .from('tasks')
    .select('pending_xp')
    .eq('id', taskId)
    .single();

  if (fetchError || !currentTask) {
    throw new Error(`Failed to fetch task pending XP: ${fetchError?.message}`);
  }

  const newPendingXp = (currentTask.pending_xp as number) + PENDING_XP_PER_MOVE;

  // Increment the task's pending_xp
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ pending_xp: newPendingXp })
    .eq('id', taskId);

  if (updateError) {
    throw new Error(`Failed to update task pending XP: ${updateError.message}`);
  }

  return {
    move: move as BattleLogMove,
    newPendingXp,
  };
}

/**
 * Retrieve all moves for a task, ordered by created_at ascending.
 */
export async function getMovesByTaskId(taskId: string): Promise<BattleLogMove[]> {
  const { data, error } = await supabase
    .from('battle_log_moves')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch moves: ${error.message}`);
  }

  return (data ?? []) as BattleLogMove[];
}

/**
 * Get the total pending XP for a task (from the tasks table cache).
 */
export async function getPendingXp(taskId: string): Promise<number> {
  const { data, error } = await supabase
    .from('tasks')
    .select('pending_xp')
    .eq('id', taskId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch pending XP: ${error?.message}`);
  }

  return data.pending_xp as number;
}
