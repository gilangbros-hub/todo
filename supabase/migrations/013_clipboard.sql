-- Online Clipboard — personal sessions with timestamped entries.

-- Sessions table
CREATE TABLE IF NOT EXISTS clipboard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Session',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Entries table
CREATE TABLE IF NOT EXISTS clipboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES clipboard_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_clipboard_sessions_user ON clipboard_sessions(user_id);
CREATE INDEX idx_clipboard_entries_session ON clipboard_entries(session_id);
CREATE INDEX idx_clipboard_entries_user ON clipboard_entries(user_id);

-- RLS
ALTER TABLE clipboard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clipboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own clipboard sessions" ON clipboard_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own clipboard entries" ON clipboard_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE clipboard_entries;
