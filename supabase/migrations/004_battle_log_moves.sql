-- Quest Battle Log — Battle Log Moves table and pending XP support
-- Adds the battle_log_moves table for tracking RPG-style progress moves
-- and a pending_xp column on tasks for accumulated move XP.

-- Add pending_xp column to tasks table
ALTER TABLE tasks ADD COLUMN pending_xp INTEGER NOT NULL DEFAULT 0;

-- Create battle_log_moves table
CREATE TABLE battle_log_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  move_type TEXT NOT NULL CHECK (move_type IN ('attack', 'dodge', 'defense', 'use_item', 'magic', 'rest')),
  note TEXT NOT NULL CHECK (char_length(note) > 0 AND char_length(note) <= 300),
  pending_xp INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient retrieval by task
CREATE INDEX idx_battle_log_moves_task_id ON battle_log_moves(task_id);

-- Row Level Security
ALTER TABLE battle_log_moves ENABLE ROW LEVEL SECURITY;

-- Users can only read moves for their own tasks
CREATE POLICY "Users can read own task moves"
  ON battle_log_moves FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert moves for their own tasks
CREATE POLICY "Users can insert own task moves"
  ON battle_log_moves FOR INSERT
  WITH CHECK (user_id = auth.uid());
