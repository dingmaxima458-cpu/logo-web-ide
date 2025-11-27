-- TEMPORARY TEST: Disable RLS to verify if that's the issue
-- Run this in Supabase SQL Editor
-- WARNING: This removes all security - only for testing!

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE files DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable with:
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE files ENABLE ROW LEVEL SECURITY;

