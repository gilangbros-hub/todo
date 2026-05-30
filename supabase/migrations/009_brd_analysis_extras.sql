-- Store Oracle analysis extras (flow, improvements, questions, risks) on the document.
-- These are generated per-analysis and displayed in the Oracle results tabs.

ALTER TABLE brd_documents
  ADD COLUMN IF NOT EXISTS flow_process JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS improvements JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS risk_analysis JSONB NOT NULL DEFAULT '[]';
