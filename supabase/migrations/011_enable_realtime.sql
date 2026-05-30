-- Enable Supabase Realtime on brd_documents so the frontend receives
-- live UPDATE events as each analysis section completes.

ALTER PUBLICATION supabase_realtime ADD TABLE brd_documents;

-- Ensure REPLICA IDENTITY FULL so UPDATE payloads include all columns
-- (needed for the frontend to read flow_process, improvements, etc.).
ALTER TABLE brd_documents REPLICA IDENTITY FULL;
