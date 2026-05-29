-- BRD Oracle — Document analysis tables
-- Stores uploaded BRD documents and their AI-extracted feature breakdowns.

-- 1. BRD Documents table
CREATE TABLE IF NOT EXISTS brd_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_text TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. BRD Features (Prophecies) table
CREATE TABLE IF NOT EXISTS brd_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES brd_documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pilot_status TEXT NOT NULL DEFAULT 'unknown' CHECK (pilot_status IN ('pilot', 'full_rollout', 'phased', 'unknown')),
  retention TEXT,
  business_flow TEXT,
  as_is TEXT,
  to_be TEXT,
  risks TEXT,
  suggested_priority TEXT NOT NULL DEFAULT 'normal' CHECK (suggested_priority IN ('normal', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_brd_documents_user_id ON brd_documents(user_id);
CREATE INDEX idx_brd_features_document_id ON brd_features(document_id);
CREATE INDEX idx_brd_features_user_id ON brd_features(user_id);

-- 4. RLS Policies
ALTER TABLE brd_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE brd_features ENABLE ROW LEVEL SECURITY;

-- brd_documents: users can only access their own documents
CREATE POLICY "Users can view own BRD documents"
  ON brd_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own BRD documents"
  ON brd_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own BRD documents"
  ON brd_documents FOR DELETE
  USING (auth.uid() = user_id);

-- brd_features: users can only access their own features
CREATE POLICY "Users can view own BRD features"
  ON brd_features FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own BRD features"
  ON brd_features FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own BRD features"
  ON brd_features FOR DELETE
  USING (auth.uid() = user_id);
