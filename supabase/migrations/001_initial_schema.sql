-- RPG Quest Board — Initial Database Schema
-- Creates all tables, constraints, indexes, and enables real-time

-- Create types table
CREATE TABLE types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pics table
CREATE TABLE pics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  avatar VARCHAR(255) NOT NULL,
  rpg_class VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  type_id UUID REFERENCES types(id) ON DELETE RESTRICT,
  pic_id UUID REFERENCES pics(id) ON DELETE RESTRICT,
  deadline TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done', 'overdue')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'rare', 'epic', 'legendary')),
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  branch_type VARCHAR(20)
    CHECK (branch_type IN ('sequential', 'parallel') OR branch_type IS NULL),
  branch_order INTEGER,
  xp_reward INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create player_stats table
CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE
);

-- Indexes for common queries
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_type_id ON tasks(type_id);
CREATE INDEX idx_tasks_pic_id ON tasks(pic_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE types;
ALTER PUBLICATION supabase_realtime ADD TABLE pics;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE player_stats;
