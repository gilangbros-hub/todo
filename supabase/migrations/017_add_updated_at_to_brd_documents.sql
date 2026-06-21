-- Add updated_at column to brd_documents for tracking modification time.
-- This column is used by the status API to return the last-updated timestamp.

ALTER TABLE brd_documents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Automatically update updated_at whenever the row changes.
CREATE OR REPLACE FUNCTION update_brd_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brd_documents_updated_at ON brd_documents;

CREATE TRIGGER trg_brd_documents_updated_at
  BEFORE UPDATE ON brd_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_brd_documents_updated_at();
