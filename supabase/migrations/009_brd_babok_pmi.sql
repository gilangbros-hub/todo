-- Upgrade BRD features table to align with BABOK v3 and PMI-PBA fields

ALTER TABLE brd_features
  -- Drop old columns
  DROP COLUMN IF EXISTS pilot_status,
  DROP COLUMN IF EXISTS retention,
  DROP COLUMN IF EXISTS business_flow,
  DROP COLUMN IF EXISTS as_is,
  DROP COLUMN IF EXISTS to_be,
  DROP COLUMN IF EXISTS risks,
  DROP COLUMN IF EXISTS suggested_priority,
  DROP COLUMN IF EXISTS requirement_type,
  DROP COLUMN IF EXISTS impacted_process,
  DROP COLUMN IF EXISTS scope,
  -- Add new columns
  ADD COLUMN IF NOT EXISTS feature_id TEXT,
  ADD COLUMN IF NOT EXISTS requirement_classification TEXT CHECK (requirement_classification IN ('business_requirement', 'stakeholder_requirement', 'functional_requirement', 'non_functional_requirement', 'transition_requirement')),
  ADD COLUMN IF NOT EXISTS priority_moscow TEXT CHECK (priority_moscow IN ('must_have', 'should_have', 'could_have', 'wont_have')),
  ADD COLUMN IF NOT EXISTS business_value TEXT,
  ADD COLUMN IF NOT EXISTS capability_gap TEXT,
  ADD COLUMN IF NOT EXISTS business_rules TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stakeholders TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preconditions TEXT,
  ADD COLUMN IF NOT EXISTS postconditions TEXT,
  ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dependencies_and_risks TEXT;

-- Note: accounting_impact remains from the previous schema.
