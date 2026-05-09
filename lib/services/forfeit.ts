import { supabase } from '@/lib/supabase';

export interface ForfeitResult {
  success: boolean;
  penaltyAmount: number;
  newXp: number;
  newLevel: number;
  previousLevel: number;
}

/**
 * Forfeit (permanently delete) a quest with XP penalty.
 * Calls the forfeit_quest RPC which handles eligibility, penalty, and deletion atomically.
 *
 * @param taskId - The UUID of the task to forfeit
 * @returns ForfeitResult with penalty details and updated player stats
 * @throws Error on failure (not found, already completed, is subtask, connection error, timeout)
 */
export async function forfeitQuest(taskId: string): Promise<ForfeitResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const { data, error } = await supabase
      .rpc('forfeit_quest', { p_task_id: taskId })
      .abortSignal(controller.signal);

    if (error) {
      if (error.message?.includes('AbortError') || controller.signal.aborted) {
        throw new Error('Operation timed out. Please try again.');
      }
      throw new Error(`Could not connect to the quest board. Please try again.`);
    }

    if (!data) {
      throw new Error('Quest not found.');
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      const errorMessage = result.error ?? 'Unknown error';

      if (errorMessage.includes('not found') || errorMessage.includes('not exist')) {
        throw new Error('Quest not found.');
      }
      if (errorMessage.includes('completed') || errorMessage.includes('done')) {
        throw new Error('Completed quests cannot be forfeited.');
      }
      if (errorMessage.includes('subtask') || errorMessage.includes('parent')) {
        throw new Error('Subtasks can only be forfeited from the parent quest.');
      }

      throw new Error(errorMessage);
    }

    return {
      success: true,
      penaltyAmount: result.penalty_amount,
      newXp: result.new_xp,
      newLevel: result.new_level,
      previousLevel: result.previous_level,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      // Re-throw our own descriptive errors
      if (
        err.message.includes('timed out') ||
        err.message.includes('Quest not found') ||
        err.message.includes('cannot be forfeited') ||
        err.message.includes('only be forfeited from') ||
        err.message.includes('quest board')
      ) {
        throw err;
      }
    }

    // Handle AbortError from the signal
    if (controller.signal.aborted) {
      throw new Error('Operation timed out. Please try again.');
    }

    // Generic connection/unknown error
    throw new Error('Could not connect to the quest board. Please try again.');
  } finally {
    clearTimeout(timeoutId);
  }
}
