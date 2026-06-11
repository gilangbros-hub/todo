-- Add missing UPDATE RLS policy for brd_documents.
-- Without this, the stream route's .update() calls to save advisory extras,
-- flow_process, and analysis_status silently fail (0 rows affected).

CREATE POLICY "Users can update own BRD documents"
  ON brd_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
