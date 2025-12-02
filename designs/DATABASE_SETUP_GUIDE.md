# Database Setup Guide

## ✅ Implementation Complete

A production-ready, database-backed authentication and project management system has been implemented using **Supabase** as the backend database.

---

## 🏗️ Architecture Overview

### Database Layer (Supabase PostgreSQL)
- **Users**: Managed by Supabase Auth (automatic)
- **Projects**: Stored in `projects` table with `user_id` foreign key
- **Files**: Stored in `files` table with `project_id` foreign key
- **Row Level Security (RLS)**: Ensures users can only access their own data

### File Storage Layer
- File **metadata** stored in database
- File **content** stored on filesystem
- Single-layer directory structure: `backend/projects/{projectId}/files/`

### Authentication
- **Supabase JWT tokens** for production
- **Mock tokens** for local development (no Supabase needed)
- Backend validates tokens on every request
- Frontend automatically sends auth tokens with API calls

---

## 📋 Setup Instructions

### 1. Run SQL Schema in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open the file: `SUPABASE_SETUP.sql`
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click **"Run"**

This will create:
- ✅ `projects` table
- ✅ `files` table
- ✅ Indexes for performance
- ✅ Row Level Security policies
- ✅ Triggers for auto-updating timestamps
- ✅ Helper functions and views

### 1b. Set Up Supabase Storage

**IMPORTANT**: After running the SQL schema, also set up Supabase Storage:

1. **Create Storage Bucket**:
   - Go to **Supabase Dashboard** > **Storage**
   - Click **"Create a new bucket"**
   - Name: `project-files`
   - Public: **OFF**
   - Click **"Create bucket"**

2. **Run Storage Setup SQL**:
   - Go to **SQL Editor**
   - Open file: `SUPABASE_STORAGE_SETUP.sql`
   - Copy and paste entire contents
   - Click **"Run"**

This creates storage RLS policies and the `storage_path` column.

**See `STORAGE_MIGRATION_GUIDE.md` for detailed storage setup.**

### 2. Configure Environment Variables

Update your **`.env`** file at the project root:

```env
# Backend Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
WS_PORT=3002

# Supabase Backend Configuration (from Supabase Dashboard > Settings > API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Frontend Configuration
VITE_PORT=5173
VITE_HOST=0.0.0.0
VITE_API_URL=http://localhost:3001
VITE_AUTH_PROVIDER=supabase  # Use 'mock' for local dev without Supabase

# Frontend Supabase (same values as backend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find Supabase keys:**
1. Go to Supabase Dashboard
2. Select your project
3. Go to **Settings** > **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### 3. Start the Application

```bash
# From project root
npm start
```

This will start:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173`

---

## 🔐 Security Features

### Row Level Security (RLS)
All database tables have RLS policies that ensure:
- Users can only view their own projects
- Users can only create/update/delete their own projects
- Users can only access files in their own projects
- Database enforces these rules even if backend code has bugs

### Authentication Flow
1. User signs in via frontend
2. Supabase returns JWT token
3. Frontend stores token and sends with every API request
4. Backend validates JWT and extracts user ID
5. All database queries are automatically filtered by user ID

### Token Validation
- **Production**: Real Supabase JWT validation
- **Development**: Mock token validation (format: `mock-user-{userId}`)
- Backend supports both modes seamlessly

---

## 🧪 Testing User Isolation

### Test with Mock Auth (No Supabase Required)

1. Set in `.env`:
   ```env
   VITE_AUTH_PROVIDER=mock
   ```

2. Sign up as User 1:
   - Email: `user1@test.com`
   - Password: `password123`
   - Creates mock user with ID from email

3. Create a project and files

4. Sign out

5. Sign up as User 2:
   - Email: `user2@test.com`
   - Password: `password123`

6. Verify:
   - ✅ User 2 cannot see User 1's projects
   - ✅ User 2 has their own empty project list
   - ✅ Each user has isolated data

### Test with Real Supabase

1. Set in `.env`:
   ```env
   VITE_AUTH_PROVIDER=supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. Sign up multiple users via the app

3. Verify data isolation in Supabase Dashboard:
   - Go to **Table Editor** > `projects`
   - Each project has correct `user_id`
   - RLS policies prevent cross-user access

---

## 📊 Database Schema

### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Files Table
```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'logo',
  line_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, path)
);
```

### Indexes
- `idx_projects_user_id` - Fast user project lookups
- `idx_projects_updated_at` - Sort by last updated
- `idx_files_project_id` - Fast project file lookups
- `idx_files_path` - Fast file path lookups

---

## 🔄 Migration from Old System

The old file-based system (`projectManager.js`) has been replaced with the new database-backed system (`projectManagerDB.js`).

**Old projects are NOT automatically migrated.** To preserve old data:
1. Export projects manually before switching
2. Or run the backend with both systems temporarily
3. Re-import projects via the new system

---

## 🚨 Troubleshooting

### Backend won't start
**Error:** "Missing Supabase configuration"
**Fix:** Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`

### API returns 401 Unauthorized
**Cause:** Missing or invalid auth token
**Fix:** 
1. Check that user is logged in
2. Verify `VITE_SUPABASE_URL` matches `SUPABASE_URL`
3. Check browser console for auth errors

### Projects not showing up
**Cause:** RLS policies blocking access
**Fix:**
1. Verify RLS policies are created (run `SUPABASE_SETUP.sql` again)
2. Check that projects have correct `user_id` in Supabase Table Editor
3. Verify JWT token has correct user ID

### Mock auth not working
**Cause:** Frontend trying to connect to Supabase
**Fix:** Set `VITE_AUTH_PROVIDER=mock` in `.env` and restart frontend

---

## 📝 API Endpoints

All endpoints require `Authorization: Bearer {token}` header (except health check).

### Projects
- `GET /api/v1/projects` - List user's projects
- `GET /api/v1/projects/:id` - Get project details
- `POST /api/v1/projects` - Create project
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

### Files
- `GET /api/v1/files?projectId=xxx` - List project files
- `GET /api/v1/files/:id?projectId=xxx` - Get file with content
- `POST /api/v1/files` - Create file
- `PUT /api/v1/files/:id?projectId=xxx` - Update file
- `DELETE /api/v1/files/:id?projectId=xxx` - Delete file

### Execute
- `POST /api/v1/execute` - Execute Logo code
  - Body: `{ fileId, projectId }` (requires auth) or `{ code }` (no auth)

---

## ✅ Verification Checklist

After setup, verify:
- [ ] SQL schema runs without errors in Supabase
- [ ] Backend starts with "✅ Supabase database client initialized"
- [ ] Frontend can sign up new users
- [ ] Frontend can create projects
- [ ] Frontend can create files
- [ ] Different users see only their own projects
- [ ] File content is saved and loaded correctly
- [ ] Code execution works with saved files

---

## 🎯 Production Deployment

When deploying to production:
1. ✅ Use Supabase production instance
2. ✅ Set `NODE_ENV=production`
3. ✅ Set `VITE_AUTH_PROVIDER=supabase`
4. ✅ Update `VITE_API_URL` to production backend URL
5. ✅ Secure `SUPABASE_SERVICE_ROLE_KEY` (never expose to frontend)
6. ✅ Enable HTTPS for both frontend and backend
7. ✅ Configure CORS to only allow your frontend domain

---

For questions or issues, check the logs in:
- Backend: Terminal running `npm start`
- Frontend: Browser DevTools Console
- Database: Supabase Dashboard > Logs

