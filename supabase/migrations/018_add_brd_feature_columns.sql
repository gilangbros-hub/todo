-- Align brd_features schema with the BABOK/PMI-PBA feature structure
-- used by core, stream, and analyze API routes.
-- These columns are expected by mapFeatureRows() and inline feature inserts.

ALTER TABLE brd_features
  ADD COLUMN IF NOT EXISTS feature_id TEXT NOT NULL DEFAULT 'F-UNKNOWN',
  ADD COLUMN IF NOT EXISTS requirement_classification TEXT NOT NULL DEFAULT 'functional_requirement',
  ADD COLUMN IF NOT EXISTS priority_moscow TEXT NOT NULL DEFAULT 'should_have',
  ADD COLUMN IF NOT EXISTS business_value TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS capability_gap TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_rules TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stakeholders TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preconditions TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS postconditions TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dependencies_and_risks TEXT DEFAULT '';
