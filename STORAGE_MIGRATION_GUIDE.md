# Supabase Storage Migration Guide

## ✅ Implementation Complete

The file storage system has been migrated from **local filesystem** to **Supabase Storage** for production-ready, scalable cloud storage.

---

## 🏗️ New Architecture

### Before (Filesystem-based):
```
❌ Database metadata → Supabase (cloud)
❌ File content → EC2 filesystem (local, not scalable)
❌ Problem: Timeouts, EC2 coupling, no scalability
```

### After (Cloud-based):
```
✅ Database metadata → Supabase PostgreSQL (cloud)
✅ File content → Supabase Storage (cloud, scalable)
✅ Local cache → Temporary session storage only
```

---

## 📦 Storage Architecture

### Primary Storage: **Supabase Storage**
- Bucket name: `project-files`
- Path format: `{userId}/{projectId}/{filePath}`
- Persistent, scalable, distributed
- Automatic backups and CDN

### Secondary Storage: **Local Cache**
- Location: `backend/.cache/files/`
- Purpose: Temporary storage during active editing
- Cleared on server restart
- Not backed up (cache only)

### Data Flow:
1. **Read file**: Check cache → Download from Supabase Storage → Cache locally
2. **Write file**: Save to cache → Upload to Supabase Storage
3. **Delete file**: Delete from Supabase Storage → Clear cache
4. **Execute code**: Uses cached file (or downloads if needed)

---

## 📋 Setup Instructions

### Step 1: Create Storage Bucket in Supabase

1. Go to **Supabase Dashboard**
2. Navigate to **Storage**
3. Click **"Create a new bucket"**
4. Settings:
   - **Name**: `project-files`
   - **Public**: **OFF** (private bucket)
   - **File size limit**: 50MB (recommended)
   - **Allowed MIME types**: Leave empty (allow all)
5. Click **"Create bucket"**

### Step 2: Run Storage Setup SQL

1. Go to **Supabase Dashboard** > **SQL Editor**
2. Open: `SUPABASE_STORAGE_SETUP.sql`
3. Copy the entire file
4. Paste into SQL Editor
5. Click **"Run"**

This will create:
- ✅ RLS policies for storage access control
- ✅ `storage_path` column in `files` table
- ✅ Auto-trigger to generate storage paths
- ✅ Helper functions

### Step 3: Update .env Configuration

No changes needed! The storage bucket name is hardcoded in the backend (`project-files`).

### Step 4: Restart Backend

```bash
cd /path/to/logoWeb
npm start
```

You should see:
```
✅ File cache initialized at: /path/to/backend/.cache/files
📦 Using Supabase Storage bucket: project-files
```

---

## 🔒 Security Features

### Row Level Security (RLS)
Storage policies ensure:
- Users can only upload files to their own folders (`{userId}/...`)
- Users can only read/update/delete files in their own folders
- Path structure enforced: `{userId}/{projectId}/{filePath}`

### Access Control
- All storage operations require authentication
- JWT token validated on every request
- User ID extracted from token, not user input
- Database + Storage double security layer

---

## 🧪 Testing

### Test File Upload
```bash
# Create a project and file via the UI
# Check in Supabase Dashboard > Storage > project-files
# Should see: {userId}/{projectId}/filename.logo
```

### Test File Download
```bash
# Open an existing file in the editor
# Backend logs should show:
# "Downloaded from storage: {userId}/{projectId}/filename.logo"
```

### Test Cache Behavior
```bash
# 1. Open a file (downloads to cache)
# 2. Edit and save (uploads to storage)
# 3. Restart backend
# 4. Open same file (downloads from storage again)
```

### Test User Isolation
```bash
# 1. User A creates file
# 2. User B tries to access User A's storage path
# Result: 403 Forbidden (RLS policy blocks)
```

---

## 📊 Storage Paths

### Database Schema
```sql
-- files table
CREATE TABLE files (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT,
  path TEXT,  -- Logical path: /main.logo
  storage_path TEXT,  -- Physical path: userId/projectId/main.logo
  ...
);
```

### Path Examples
```
Logical path:  /main.logo
Storage path:  abc123-user-id/def456-project-id/main.logo

Logical path:  /utils/helpers.logo
Storage path:  abc123-user-id/def456-project-id/utils/helpers.logo
```

---

## 🔄 Migration from Old System

### Automatic Migration
There is NO automatic migration. The old filesystem-based storage is deprecated.

### Manual Migration Steps

If you have existing projects on the old system:

1. **Export projects** via old system:
   ```bash
   # Backup old projects directory
   tar -czf projects-backup.tar.gz backend/projects/
   ```

2. **Create projects** in new system via UI

3. **Upload files** manually or via API:
   ```bash
   # Use the UI to create and save files
   # Or use API to bulk upload
   ```

### Clean Up Old Storage
```bash
# After migration is complete
rm -rf backend/projects/
rm -rf backend/files/
```

---

## 🚀 Benefits

### Scalability
✅ No disk space limits (Supabase handles storage)
✅ Multiple backend servers can share same storage
✅ No EC2 instance dependency

### Performance
✅ CDN-backed file delivery
✅ Local cache for active editing (fast)
✅ No timeouts from local filesystem issues

### Reliability
✅ Automatic backups by Supabase
✅ Redundant storage
✅ High availability

### DevOps
✅ Easy to deploy multiple backend instances
✅ Stateless backend (no persistent local storage)
✅ Easy to switch/scale EC2 instances

---

## 🔧 Advanced Configuration

### Change Cache Directory
In `backend/database/projectManagerDB.js`:
```javascript
const CACHE_DIR = path.join(__dirname, '..', '.cache', 'files');
```

### Change Storage Bucket
In `backend/database/projectManagerDB.js`:
```javascript
const STORAGE_BUCKET = 'project-files';
```

Then update Supabase bucket name and RLS policies accordingly.

### Adjust Cache Strategy
Current: Cache on first read, clear on server restart

Optional strategies:
- **LRU cache**: Clear old files automatically
- **Persistent cache**: Keep cache across restarts
- **Eager cache**: Pre-download frequently used files

---

## 🐛 Troubleshooting

### "Storage bucket not found"
**Solution**: Create `project-files` bucket in Supabase Dashboard > Storage

### "Permission denied" on storage upload
**Solution**: Run `SUPABASE_STORAGE_SETUP.sql` to create RLS policies

### Files not appearing after save
**Check**: 
1. Supabase Dashboard > Storage > project-files
2. Look for file at: `{userId}/{projectId}/{filename}`
3. Check backend logs for upload errors

### Cache directory permission errors
**Solution**:
```bash
chmod -R 755 backend/.cache
```

### Large files timing out
**Check**: Supabase bucket file size limit
**Solution**: Increase in Supabase Dashboard > Storage > Bucket settings

---

## 📈 Monitoring

### Check Storage Usage
```sql
-- In Supabase SQL Editor
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_bytes,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
GROUP BY bucket_id;
```

### Check Cache Size
```bash
du -sh backend/.cache/files
```

### View Storage in Dashboard
Supabase Dashboard > Storage > project-files

---

## ✅ Verification Checklist

After setup, verify:
- [ ] `project-files` bucket created in Supabase
- [ ] RLS policies active (run `SUPABASE_STORAGE_SETUP.sql`)
- [ ] `files` table has `storage_path` column
- [ ] Backend starts with "Using Supabase Storage bucket: project-files"
- [ ] Can create and save files via UI
- [ ] Files visible in Supabase Storage browser
- [ ] Can load saved files after backend restart
- [ ] Different users cannot access each other's files

---

## 🎯 Production Checklist

Before going to production:
- [ ] Storage bucket created and configured
- [ ] RLS policies enabled and tested
- [ ] File size limits configured
- [ ] CORS configured if using direct uploads
- [ ] Monitoring and alerts set up
- [ ] Backup strategy verified
- [ ] Cache directory excluded from backups
- [ ] Environment variables properly set

---

For questions or issues:
- Check backend logs for storage operation errors
- Check Supabase Dashboard > Logs for storage access logs
- Verify RLS policies in SQL Editor
- Test with curl or Postman for API debugging

