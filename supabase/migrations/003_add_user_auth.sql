-- RPG Quest Board — User Authentication Migration
-- Adds user_id columns to all tables, replaces permissive anon policies with
-- user-scoped RLS policies, and creates indexes for RLS performance.

-- ============================================================
-- 1. Add user_id columns referencing auth.users
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE player_stats
  ADD COLUMN user_id UUID NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE types
  ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE pics
  ADD COLUMN user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id);

-- ============================================================
-- 2. Create indexes on user_id for RLS performance
-- ============================================================

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX idx_types_user_id ON types(user_id);
CREATE INDEX idx_pics_user_id ON pics(user_id);

-- ============================================================
-- 3. Drop old permissive anon policies
-- ============================================================

DROP POLICY IF EXISTS "anon_all_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_all_player_stats" ON player_stats;
DROP POLICY IF EXISTS "anon_all_types" ON types;
DROP POLICY IF EXISTS "anon_all_pics" ON pics;

-- ============================================================
-- 4. RLS policies — Tasks: full CRUD for owner
-- ============================================================

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. RLS policies — Player Stats: SELECT, INSERT, UPDATE for owner
-- ============================================================

CREATE POLICY "Users can view own stats"
  ON player_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON player_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON player_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. RLS policies — Types: full CRUD for owner
-- ============================================================

CREATE POLICY "Users can view own types"
  ON types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own types"
  ON types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own types"
  ON types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own types"
  ON types FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 7. RLS policies — Pics: full CRUD for owner
-- ============================================================

CREATE POLICY "Users can view own pics"
  ON pics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pics"
  ON pics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pics"
  ON pics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pics"
  ON pics FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 8. Grant privileges to authenticated role
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks, types, pics, player_stats TO authenticated;
