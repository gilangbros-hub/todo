-- Forfeit Quest — RPC function for atomic quest forfeiture with XP penalty
-- Validates eligibility, applies XP penalty, recalculates level, and deletes the task.
-- Cascades handle subtask and battle_log_moves cleanup automatically.

CREATE OR REPLACE FUNCTION forfeit_quest(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_stats RECORD;
  v_penalty INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_previous_level INTEGER;
  v_remaining INTEGER;
BEGIN
  -- 1. Fetch the task
  SELECT id, user_id, status, xp_reward, parent_task_id
    INTO v_task
    FROM tasks
   WHERE id = p_task_id;

  -- Validate: task exists
  IF v_task IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest not found');
  END IF;

  -- Validate: task belongs to the current user
  IF v_task.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest not found');
  END IF;

  -- Validate: task is not completed
  IF v_task.status = 'done' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Completed quests cannot be forfeited');
  END IF;

  -- Validate: task is not a subtask (must be a root-level quest)
  IF v_task.parent_task_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subtasks can only be forfeited from the parent quest');
  END IF;

  -- 2. Calculate penalty: floor(xp_reward * 0.25)
  v_penalty := floor(v_task.xp_reward * 0.25);

  -- 3. Fetch player_stats for the current user
  SELECT xp, level
    INTO v_stats
    FROM player_stats
   WHERE user_id = auth.uid();

  -- If no player_stats record exists, treat as 0 XP / level 1
  IF v_stats IS NULL THEN
    v_stats.xp := 0;
    v_stats.level := 1;
  END IF;

  v_previous_level := v_stats.level;

  -- 4. Compute new XP (floor at 0)
  v_new_xp := greatest(0, v_stats.xp - v_penalty);

  -- 5. Recalculate level from new XP using iterative threshold subtraction
  -- Level N threshold = N * 100
  v_new_level := 1;
  v_remaining := v_new_xp;

  WHILE v_remaining >= v_new_level * 100 LOOP
    v_remaining := v_remaining - v_new_level * 100;
    v_new_level := v_new_level + 1;
  END LOOP;

  -- 6. Update player_stats with new XP and level
  UPDATE player_stats
     SET xp = v_new_xp,
         level = v_new_level
   WHERE user_id = auth.uid();

  -- 7. Delete the task (ON DELETE CASCADE handles subtasks and battle_log_moves)
  DELETE FROM tasks WHERE id = p_task_id;

  -- 8. Return success result
  RETURN jsonb_build_object(
    'success', true,
    'penalty_amount', v_penalty,
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'previous_level', v_previous_level
  );
END;
$$;
