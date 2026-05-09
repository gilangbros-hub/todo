import { supabase } from '@/lib/supabase';
import { PlayerStats } from '@/lib/types';
import { calculateLevel } from '@/lib/xp';
import { updateStreak } from '@/lib/streak';

/**
 * Fetch the player stats record, or initialize one if none exists.
 * RLS automatically scopes the query to the authenticated user's row,
 * so no explicit user_id filter is needed.
 */
export async function getPlayerStats(): Promise<PlayerStats> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch player stats: ${error.message}`);
  }

  if (!data) {
    return initializePlayerStats();
  }

  return data as PlayerStats;
}

/**
 * Initialize a new player stats record with default values.
 * user_id is automatically set by the database DEFAULT auth.uid().
 * The browser client includes session cookies, so auth.uid() resolves to
 * the authenticated user. RLS INSERT policy validates ownership.
 */
export async function initializePlayerStats(): Promise<PlayerStats> {
  const { data, error } = await supabase
    .from('player_stats')
    .insert({ xp: 0, level: 1, streak: 0, last_completed_date: null })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to initialize player stats: ${error?.message}`);
  }

  return data as PlayerStats;
}

export interface AwardXpResult {
  stats: PlayerStats;
  leveledUp: boolean;
  previousLevel: number;
}

/**
 * Award XP to the player, handle level-up with carry-over, and update streak.
 * RLS UPDATE policy ensures only the authenticated user can update their own stats.
 *
 * @param amount - The XP amount to award (must be > 0)
 * @returns Updated player stats and whether a level-up occurred
 */
export async function awardXp(amount: number): Promise<AwardXpResult> {
  const currentStats = await getPlayerStats();
  const previousLevel = currentStats.level;

  // Calculate new total XP
  const newTotalXp = currentStats.xp + amount;

  // Calculate new level from total XP (handles multi-level-up with carry-over)
  const { level: newLevel } = calculateLevel(newTotalXp);

  // Update streak based on today's UTC date
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
  const { newStreak, newLastCompletedDate } = updateStreak(
    currentStats.streak,
    currentStats.last_completed_date,
    today
  );

  // Persist updated stats
  const { data, error } = await supabase
    .from('player_stats')
    .update({
      xp: newTotalXp,
      level: newLevel,
      streak: newStreak,
      last_completed_date: newLastCompletedDate,
    })
    .eq('id', currentStats.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to award XP: ${error?.message}`);
  }

  return {
    stats: data as PlayerStats,
    leveledUp: newLevel > previousLevel,
    previousLevel,
  };
}
