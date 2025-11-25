# EC2 Supabase Connection Debugging Guide

## 🚨 Symptoms

Frontend shows:
```
- timeout of 10000ms exceeded
- Failed to load projects
- Invalid Refresh Token
- AuthApiError
```

**Root Cause**: EC2 backend cannot connect to Supabase database/storage.

---

## 🔍 Diagnosis Steps

### 1. Check Backend Logs

```bash
# View current backend logs
# Look for Supabase connection errors

# Common error messages:
# - "Missing Supabase configuration"
# - "Failed to initialize Supabase"
# - "ETIMEDOUT" or "ECONNREFUSED"
# - "getaddrinfo ENOTFOUND"
```

### 2. Verify Environment Variables

```bash
cd /path/to/logoWeb

# Check if .env exists
ls -la .env

# View Supabase config
cat .env | grep SUPABASE

# Expected output:
# SUPABASE_URL=https://xxxxx.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
# SUPABASE_ANON_KEY=eyJhbG...
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbG...
```

**If empty or missing:**

```bash
nano .env

# Add these lines with your actual values:
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Test Network Connectivity

```bash
# Test if EC2 can reach Supabase
curl -I https://your-project-id.supabase.co

# Expected: HTTP/2 200
# If timeout: Network issue (check security group)
# If 403/404: URL wrong but connection works

# Test with verbose output
curl -v https://your-project-id.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"

# Should return: {"message":"..."}
```

### 4. Test Supabase API Call

```bash
# Test database connection from EC2
curl https://your-project-id.supabase.co/rest/v1/projects \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"

# Expected: {"message":"..."} or []
# If timeout: Backend can't reach Supabase
```

### 5. Check Backend Process

```bash
# Check if backend is running
ps aux | grep node

# Check what port it's listening on
lsof -i :3001

# Check backend startup logs
# Should see:
# ✅ Supabase database client initialized
# ✅ File cache initialized
# 📦 Using Supabase Storage bucket: project-files
```

---

## ✅ Solutions

### Solution 1: Fix Missing Credentials

**Problem**: `.env` file missing or has wrong Supabase credentials

**Fix**:

1. Get credentials from Supabase Dashboard:
   - Go to: https://app.supabase.com
   - Select your project
   - Go to: **Settings** > **API**
   - Copy:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **anon/public key** (starts with `eyJhbG...`)
     - **service_role key** (starts with `eyJhbG...`)

2. Update `.env` on EC2:

```bash
cd /path/to/logoWeb
nano .env

# Update these lines:
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend needs same:
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save and restart:

```bash
# Ctrl+X, Y, Enter to save
# Then restart backend:
lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null
npm start
```

### Solution 2: Fix Security Group (Network Block)

**Problem**: EC2 security group blocks outbound HTTPS to Supabase

**Fix**:

1. Go to **AWS Console** > **EC2** > **Instances**
2. Select your instance
3. Click **Security** tab
4. Click the security group name
5. Go to **Outbound rules** tab
6. Verify/Add rule:
   - **Type**: HTTPS
   - **Protocol**: TCP
   - **Port**: 443
   - **Destination**: 0.0.0.0/0
   - **Description**: Allow HTTPS to Supabase

7. Click **Save rules**

### Solution 3: Backend Not Reading .env

**Problem**: Backend starts but doesn't load environment variables

**Possible causes**:
- `.env` file in wrong directory
- Backend started from wrong directory
- Permission issues

**Fix**:

```bash
# Verify .env location
cd /path/to/logoWeb
pwd
# Should show: /path/to/logoWeb

ls -la .env
# Should show: -rw-r--r-- 1 user user ... .env

# Check file permissions
chmod 644 .env

# Make sure you start from root directory
cd /path/to/logoWeb
npm start

# NOT from backend/ subdirectory
```

### Solution 4: Supabase Project Settings

**Problem**: Supabase project has connection limits or is paused

**Fix**:

1. Go to Supabase Dashboard
2. Check project status (should be "Active")
3. Check: **Settings** > **Database** > **Connection pooling**
4. Verify: **Settings** > **API** > **API settings** are enabled

### Solution 5: DNS Resolution Issues

**Problem**: EC2 can't resolve Supabase domain

**Test**:

```bash
# Test DNS resolution
nslookup your-project-id.supabase.co

# Or
dig your-project-id.supabase.co

# Should return IP addresses
# If fails: DNS issue
```

**Fix**:

```bash
# Update DNS resolver
sudo nano /etc/resolv.conf

# Add Google DNS:
nameserver 8.8.8.8
nameserver 8.8.4.4

# Save and test again
```

---

## 🧪 Verification Tests

### Test 1: Backend Health Check

```bash
curl http://localhost:3001/api/health

# Expected: {"status":"ok"}
```

### Test 2: Projects API (Local)

```bash
# Test from EC2 locally
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer mock-user-test123"

# Expected: {"data":[],"error":null}
# Or projects list if you have data
```

### Test 3: Projects API (External)

```bash
# From your computer, test EC2's public API
curl http://your-ec2-public-dns:3001/api/health

# Expected: {"status":"ok"}
```

### Test 4: Frontend to Backend

```bash
# Check browser console Network tab
# Request to: http://your-ec2:3001/api/v1/projects
# Status should be: 200 OK (not timeout)
```

---

## 📊 Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `timeout of 10000ms exceeded` | Backend can't reach Supabase | Check credentials, network, security group |
| `Missing Supabase configuration` | `.env` missing SUPABASE_URL | Add Supabase credentials to `.env` |
| `Invalid Refresh Token` | Frontend using old/wrong auth token | Clear browser cache, re-login |
| `ETIMEDOUT` | Network connectivity issue | Check security group outbound rules |
| `ENOTFOUND` | DNS can't resolve Supabase domain | Check DNS settings, use 8.8.8.8 |
| `ECONNREFUSED` | Backend not running or wrong port | Check backend process, restart |

---

## 🔧 Full Reset Procedure

If nothing works, do a complete reset:

```bash
# 1. Stop everything
lsof -ti:3000,3001,3002,5173 | xargs kill -9 2>/dev/null
pkill -9 node

# 2. Clear cache
rm -rf backend/.cache/
rm -rf node_modules/
rm -rf backend/node_modules/
rm -rf frontend/node_modules/

# 3. Reinstall dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 4. Verify .env is correct
cat .env | grep -E "(SUPABASE|PORT|HOST|VITE_API)"

# 5. Restart
npm start
```

---

## 📝 Environment File Template

Save this as `.env` on your EC2 with your actual values:

```env
# Backend Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
WS_PORT=3002

# Supabase Backend Configuration (from Dashboard > Settings > API)
SUPABASE_URL=https://ffutedyrhypqiatewzug.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-here>
SUPABASE_ANON_KEY=<your-anon-key-here>

# Frontend Configuration
VITE_PORT=5173
VITE_HOST=0.0.0.0
VITE_API_URL=http://YOUR_EC2_PUBLIC_DNS:3001
VITE_AUTH_PROVIDER=supabase

# Frontend Supabase (same as backend)
VITE_SUPABASE_URL=https://ffutedyrhypqiatewzug.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key-here>
```

**Replace**:
- `<your-service-role-key-here>` with actual service role key
- `<your-anon-key-here>` with actual anon key
- `YOUR_EC2_PUBLIC_DNS` with your EC2 public DNS or IP

---

## ✅ Success Indicators

When fixed, you should see:

**Backend logs:**
```
✅ Supabase database client initialized
✅ File cache initialized at: /path/.cache/files
📦 Using Supabase Storage bucket: project-files
🚀 Logo Web IDE Backend running on http://localhost:3001
```

**Frontend:**
- No timeout errors
- Projects load (empty list or existing projects)
- Can create new projects
- Can save files

**Browser Network tab:**
- `/api/v1/projects` returns 200 OK in < 1 second
- No 400/401/500 errors

---

## 🆘 Still Not Working?

1. **Check Supabase Dashboard Logs**:
   - Go to: Dashboard > Logs
   - Look for failed requests from your EC2 IP

2. **Enable Debug Logging**:
   ```bash
   # In backend/server.js or .env
   DEBUG=*
   NODE_ENV=development
   ```

3. **Test with Minimal Setup**:
   ```bash
   # Create test file: test-supabase.js
   import { createClient } from '@supabase/supabase-js';
   
   const supabase = createClient(
     'https://your-project.supabase.co',
     'your-anon-key'
   );
   
   const { data, error } = await supabase
     .from('projects')
     .select('count');
   
   console.log('Success:', data);
   console.log('Error:', error);
   
   # Run:
   node test-supabase.js
   ```

4. **Contact Support**:
   - Provide: EC2 region, Supabase project region
   - Provide: Error logs from backend
   - Provide: Network tab screenshots from browser

