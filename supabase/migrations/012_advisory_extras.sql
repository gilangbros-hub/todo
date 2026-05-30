-- Add architecture diagram, impacted systems, and FSD design columns to brd_documents.

ALTER TABLE brd_documents
  ADD COLUMN IF NOT EXISTS architecture_diagram TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS impacted_systems JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fsd_design JSONB NOT NULL DEFAULT '[]';
