-- Fix RLS to allow service role to bypass
-- Run this in Supabase SQL Editor

-- The service role should automatically bypass RLS, but if it doesn't,
-- we need to explicitly allow it

-- Option 1: Temporarily disable RLS to verify (TESTING ONLY)
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE files DISABLE ROW LEVEL SECURITY;

-- Option 2: Add explicit service role bypass policy
-- Drop existing policies and recreate with proper service role handling

-- For projects table
DROP POLICY IF EXISTS "Service role can access all projects" ON projects;
CREATE POLICY "Service role can access all projects"
  ON projects
  FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR auth.uid() = user_id
  );

-- For files table  
DROP POLICY IF EXISTS "Service role can access all files" ON files;
CREATE POLICY "Service role can access all files"
  ON files
  FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = files.project_id
      AND projects.user_id = auth.uid()
    )
  );




