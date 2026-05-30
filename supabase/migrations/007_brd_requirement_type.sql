-- Add requirement_type column to brd_features
-- Classifies features as functional or non-functional requirements.

ALTER TABLE brd_features
  ADD COLUMN IF NOT EXISTS requirement_type TEXT NOT NULL DEFAULT 'functional'
  CHECK (requirement_type IN ('functional', 'non_functional'));
