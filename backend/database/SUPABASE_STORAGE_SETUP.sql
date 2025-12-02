-- ============================================================================
-- Supabase Storage Setup for Logo Web IDE
-- ============================================================================
-- Run this in Supabase Dashboard > Storage
-- This sets up storage buckets and access policies for file content
-- ============================================================================

-- NOTE: Storage buckets are created via the Supabase Dashboard UI, not SQL
-- Go to: Dashboard > Storage > Create a new bucket
-- Bucket name: "project-files"
-- Public: No (private)

-- However, we can create RLS policies for storage using SQL:

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Allow users to upload files to their own project folders
CREATE POLICY "Users can upload files to their own projects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  -- Path format: {userId}/{projectId}/{filePath}
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read files from their own projects
CREATE POLICY "Users can read files from their own projects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update files in their own projects
CREATE POLICY "Users can update files in their own projects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete files from their own projects
CREATE POLICY "Users can delete files from their own projects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- HELPER FUNCTION: Get storage path for a file
-- ============================================================================

CREATE OR REPLACE FUNCTION get_file_storage_path(
  p_user_id UUID,
  p_project_id UUID,
  p_file_path TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- Format: {userId}/{projectId}/{filePath}
  RETURN p_user_id::text || '/' || p_project_id::text || '/' || p_file_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- UPDATE FILES TABLE: Add storage_path column
-- ============================================================================

-- Add storage_path column to track where file is stored in Supabase Storage
ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create index for faster storage path lookups
CREATE INDEX IF NOT EXISTS idx_files_storage_path ON files(storage_path);

-- ============================================================================
-- FUNCTION: Auto-generate storage_path on file insert
-- ============================================================================

CREATE OR REPLACE FUNCTION set_file_storage_path()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from the project
  SELECT user_id INTO v_user_id
  FROM projects
  WHERE id = NEW.project_id;
  
  -- Set storage path: {userId}/{projectId}/{filePath}
  NEW.storage_path := get_file_storage_path(v_user_id, NEW.project_id, NEW.path);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set storage_path
DROP TRIGGER IF EXISTS trigger_set_file_storage_path ON files;
CREATE TRIGGER trigger_set_file_storage_path
  BEFORE INSERT OR UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION set_file_storage_path();

-- ============================================================================
-- BACKFILL: Set storage_path for existing files
-- ============================================================================

UPDATE files f
SET storage_path = (
  SELECT get_file_storage_path(p.user_id, f.project_id, f.path)
  FROM projects p
  WHERE p.id = f.project_id
)
WHERE storage_path IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check storage policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check files with storage paths
-- SELECT id, name, path, storage_path FROM files LIMIT 10;

-- ============================================================================
-- MANUAL STEPS REQUIRED
-- ============================================================================

/*
1. Go to Supabase Dashboard > Storage
2. Click "Create bucket"
3. Bucket name: "project-files"
4. Set "Public" to OFF (private bucket)
5. Click "Create bucket"

Then run this SQL script to set up policies.
*/

