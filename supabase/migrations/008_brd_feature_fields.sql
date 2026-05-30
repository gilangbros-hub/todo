-- Add BRD-specific fields to brd_features based on BAF BRD template structure.
-- Covers: precondition/postcondition, user roles, impacted process, scope, accounting impact.

ALTER TABLE brd_features
  ADD COLUMN IF NOT EXISTS precondition TEXT,
  ADD COLUMN IF NOT EXISTS postcondition TEXT,
  ADD COLUMN IF NOT EXISTS user_roles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS impacted_process TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'unknown' CHECK (scope IN ('in_scope', 'out_of_scope', 'unknown')),
  ADD COLUMN IF NOT EXISTS accounting_impact TEXT;
