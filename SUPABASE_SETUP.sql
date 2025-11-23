-- ============================================================================
-- Logo Web IDE - Supabase Database Schema
-- ============================================================================
-- Run this script in your Supabase SQL Editor to set up the database
-- 
-- Instructions:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Projects Table
-- Stores user projects with metadata
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT projects_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT projects_name_length CHECK (LENGTH(name) <= 255)
);

-- Files Table
-- Stores file metadata (actual content stored in filesystem)
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'logo',
  line_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT files_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT files_name_length CHECK (LENGTH(name) <= 255),
  CONSTRAINT files_path_not_empty CHECK (LENGTH(TRIM(path)) > 0),
  CONSTRAINT files_unique_path_per_project UNIQUE (project_id, path)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for fast user project lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON projects(user_id, updated_at DESC);

-- Index for fast project file lookups
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(project_id, path);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Projects Policies
-- Users can only see their own projects
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own projects
CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Files Policies
-- Users can view files in their own projects
CREATE POLICY "Users can view files in their own projects"
  ON files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = files.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can insert files in their own projects
CREATE POLICY "Users can insert files in their own projects"
  ON files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = files.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can update files in their own projects
CREATE POLICY "Users can update files in their own projects"
  ON files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = files.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = files.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete files in their own projects
CREATE POLICY "Users can delete files in their own projects"
  ON files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = files.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get project file count
CREATE OR REPLACE FUNCTION get_project_file_count(project_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM files WHERE project_id = project_uuid;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- VIEWS (Optional - for easier querying)
-- ============================================================================

-- View: Projects with file count
CREATE OR REPLACE VIEW projects_with_counts AS
SELECT 
  p.*,
  COUNT(f.id)::INTEGER as file_count
FROM projects p
LEFT JOIN files f ON f.project_id = p.id
GROUP BY p.id;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment below to insert sample data for testing
-- Note: Replace 'YOUR_USER_ID' with an actual user ID from auth.users

/*
-- Sample project
INSERT INTO projects (id, user_id, name, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'YOUR_USER_ID', 'My First Logo Project', 'A simple turtle graphics project');

-- Sample files
INSERT INTO files (project_id, name, path, language, line_count) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'main.logo', '/main.logo', 'logo', 10),
  ('550e8400-e29b-41d4-a716-446655440000', 'shapes.logo', '/shapes.logo', 'logo', 25);
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the setup
-- SELECT * FROM projects;
-- SELECT * FROM files;
-- SELECT * FROM projects_with_counts;

-- ============================================================================
-- CLEANUP (if needed)
-- ============================================================================

-- Uncomment below to drop everything (WARNING: DESTRUCTIVE)
/*
DROP VIEW IF EXISTS projects_with_counts;
DROP TRIGGER IF EXISTS update_files_updated_at ON files;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_project_file_count(UUID);
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
*/

