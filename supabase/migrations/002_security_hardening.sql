-- RPG Quest Board — Security Hardening Migration
-- Addresses OWASP A01 (Broken Access Control), A03 (Injection), A05 (Misconfiguration).
--
-- NOTE: This application uses a single-player model with the anon key. There is
-- no per-user ownership, so RLS policies are intentionally permissive for the
-- anon role on these tables. Enabling RLS with an explicit policy is still
-- REQUIRED so that future multi-tenant or auth additions start from a default-
-- deny posture instead of default-allow.

-- ============================================================
-- A01: Enable Row Level Security on all tables
-- ============================================================

ALTER TABLE types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Explicit policies for the anon role (single-player model).
-- Replace these with per-user policies when authentication is introduced.

DROP POLICY IF EXISTS "anon_all_types" ON types;
CREATE POLICY "anon_all_types" ON types
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_pics" ON pics;
CREATE POLICY "anon_all_pics" ON pics
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_tasks" ON tasks;
CREATE POLICY "anon_all_tasks" ON tasks
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_player_stats" ON player_stats;
CREATE POLICY "anon_all_player_stats" ON player_stats
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- A03: Tighten input constraints at the database layer
-- ============================================================

-- Hex-color format check (accepts #abc or #aabbcc). Defense-in-depth against
-- CSS injection via the Type.color field, which is rendered into inline styles.
ALTER TABLE types
  ADD CONSTRAINT types_color_is_hex
  CHECK (color ~ '^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$');

-- Prevent empty / whitespace-only names.
ALTER TABLE types
  ADD CONSTRAINT types_name_not_blank
  CHECK (btrim(name) <> '');

ALTER TABLE pics
  ADD CONSTRAINT pics_name_not_blank
  CHECK (btrim(name) <> '');

ALTER TABLE tasks
  ADD CONSTRAINT tasks_title_not_blank
  CHECK (btrim(title) <> '');

-- xp_reward must be non-negative; negative values would allow XP farming exploits.
ALTER TABLE tasks
  ADD CONSTRAINT tasks_xp_reward_non_negative
  CHECK (xp_reward >= 0);

-- branch_order must be positive when set.
ALTER TABLE tasks
  ADD CONSTRAINT tasks_branch_order_positive
  CHECK (branch_order IS NULL OR branch_order >= 1);

-- Player stats sanity bounds.
ALTER TABLE player_stats
  ADD CONSTRAINT player_stats_xp_non_negative CHECK (xp >= 0);

ALTER TABLE player_stats
  ADD CONSTRAINT player_stats_level_positive CHECK (level >= 1);

ALTER TABLE player_stats
  ADD CONSTRAINT player_stats_streak_non_negative CHECK (streak >= 0);

-- ============================================================
-- A05: Revoke unused privileges from anon role
-- ============================================================

-- Revoke direct sequence/schema access the anon role does not need.
-- Tables remain accessible via the policies above.
REVOKE ALL ON SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON types, pics, tasks, player_stats TO anon;
