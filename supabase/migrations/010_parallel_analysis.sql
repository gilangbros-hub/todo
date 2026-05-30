-- Support parallel analysis: track per-section completion status.

-- Add status tracking columns
ALTER TABLE brd_documents
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'completed'
    CHECK (analysis_status IN ('analyzing', 'completed', 'partial', 'failed')),
  ADD COLUMN IF NOT EXISTS sections_completed TEXT[] NOT NULL DEFAULT '{}';

-- Atomic function to append a section name without race conditions
CREATE OR REPLACE FUNCTION append_section_completed(doc_id UUID, section_name TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE brd_documents
  SET sections_completed = array_append(sections_completed, section_name)
  WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
