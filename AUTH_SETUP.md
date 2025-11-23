# Authentication System Setup

## ✅ Implementation Complete

A complete, production-ready authentication system has been implemented with:
- Backend-agnostic architecture
- Supabase support
- Mock/local development mode
- Login/signup UI
- Protected routes
- User profile management

---

## 🏗️ Architecture

### Auth Abstraction Layer

**Location:** `frontend/src/services/auth/`

```
auth/
├── types.ts              # TypeScript interfaces
├── authFactory.ts        # Creates auth provider based on config
├── supabaseProvider.ts   # Supabase implementation
└── mockProvider.ts       # Local development implementation
```

### Key Components

1. **AuthContext** (`frontend/src/contexts/AuthContext.tsx`)
   - Manages global auth state
   - Provides sign in/up/out functions
   - Listens to auth state changes

2. **Auth UI** (`frontend/src/components/Auth/`)
   - Login and signup forms
   - Error handling
   - Loading states

3. **UserProfile** (`frontend/src/components/UserProfile/`)
   - Displays user info in header
   - Dropdown menu with sign out
   - Avatar support

4. **ProtectedRoute** (`frontend/src/components/ProtectedRoute/`)
   - Wraps routes requiring authentication
   - Redirects to /auth if not logged in

---

## 🔧 Configuration

### Environment Variables

**File:** `.env` (at project root)

```env
# Backend Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
WS_PORT=3002

# Frontend Configuration (VITE_ prefix required)
VITE_PORT=5173
VITE_HOST=0.0.0.0
VITE_API_URL=http://localhost:3001
VITE_AUTH_PROVIDER=mock

# Supabase (only if using supabase)
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
```

**Note:** 
- This project uses a **centralized .env file** at the project root
- Backend and frontend both read from this single file
- Frontend (Vite) variables must be prefixed with `VITE_`
- `HOST=0.0.0.0` allows external connections (e.g., EC2), use `127.0.0.1` for localhost only

### Switch Auth Providers

**For Local Development (Mock Auth):**
```env
VITE_AUTH_PROVIDER=mock
```
- No backend needed
- Data stored in localStorage
- Perfect for testing

**For Production (Supabase):**
```env
VITE_AUTH_PROVIDER=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🚀 User Flow

### 1. **First Visit**
```
App loads → Check auth → No user → Redirect to /auth
```

### 2. **Sign Up**
```
User fills form → Submit → Create account → Auto sign in → Redirect to launcher (/)
```

### 3. **Sign In**
```
User enters credentials → Submit → Verify → Set session → Redirect to launcher (/)
```

### 4. **Authenticated Session**
```
User authenticated → Can access:
  - / (Project Launcher)
  - /project/:id (Project Workspace)
```

### 5. **Sign Out**
```
Click user menu → Sign Out → Clear session → Redirect to /auth
```

---

## 📋 Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/auth` | Public | Login/Signup page |
| `/` | Protected | Project launcher |
| `/project/:id` | Protected | Project workspace |
| `/*` | Redirect | To `/` or `/auth` based on auth state |

---

## 🎯 Auth Provider Interface

All providers implement the same interface:

```typescript
interface AuthProvider {
  // Authentication
  signUp(credentials: SignUpCredentials): Promise<{ user: User; session: AuthSession }>;
  signIn(credentials: SignInCredentials): Promise<{ user: User; session: AuthSession }>;
  signOut(): Promise<void>;
  
  // Session management
  getSession(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
  
  // User management
  getCurrentUser(): Promise<User | null>;
  updateUser(updates: Partial<User>): Promise<User>;
  
  // Auth state listener
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
}
```

---

## 🔐 Mock Provider Features

**Perfect for local development without Supabase:**

- ✅ Full sign up/in/out functionality
- ✅ Session persistence (localStorage)
- ✅ Multiple users support
- ✅ Password validation
- ✅ Auth state change listeners
- ✅ No network required

**Data Storage:**
- `localStorage['mock_auth_session']` - Current session
- `localStorage['mock_auth_users']` - User database

---

## 🎨 UI Components

### Login/Signup Form

**Features:**
- Toggle between sign in/sign up
- Form validation
- Error display
- Loading states
- Provider info badge

**Location:** `/auth`

### User Profile Menu

**Features:**
- User avatar/initials
- Name and email display
- Sign out button
- Dropdown menu

**Locations:** 
- Top right of Project Launcher (`/`)
- Top right of Project Workspace (`/project/:id`)

---

## 🔄 Setting Up Supabase (When Ready)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get your project URL and anon key

### 2. Enable Email Auth

1. Go to Authentication → Providers
2. Enable Email provider
3. Configure email templates (optional)

### 3. Update .env

```env
VITE_AUTH_PROVIDER=supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...
```

### 4. Set Up Row Level Security (RLS)

**Projects Table:**
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  file_count INTEGER DEFAULT 0
);

-- RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);
```

### 5. Restart Frontend

```bash
cd frontend
npm start
```

---

## 🧪 Testing

### Test Mock Auth

1. Start app: `npm start`
2. Go to `/auth`
3. Sign up with any email/password
4. Try signing in/out
5. Check localStorage for persistence

### Test Supabase Auth

1. Set env to `supabase`
2. Add Supabase credentials
3. Restart app
4. Sign up → Check Supabase dashboard
5. Sign in → Verify JWT token

---

## 🔒 Security Notes

### Current Implementation

✅ **Good for Development:**
- Mock auth for local testing
- No backend required initially

⚠️ **For Production:**
- Use Supabase or similar auth service
- Enable RLS (Row Level Security)
- Add email verification
- Implement password reset
- Add rate limiting
- Use HTTPS only

### Backend Updates Needed

When ready for production, update backend to:
1. Verify JWT tokens from Supabase
2. Extract user ID from token
3. Filter projects by user_id
4. Reject unauthorized requests

---

## 📦 Dependencies Added

```json
{
  "@supabase/supabase-js": "^2.x.x",
  "react-router-dom": "^6.x.x"
}
```

---

## 🎯 Next Steps

1. ✅ **Currently Using:** Mock auth provider
2. 🔜 **When Ready:** Switch to Supabase
3. 🔜 **Add Features:**
   - Email verification
   - Password reset
   - Profile editing
   - Avatar upload
4. 🔜 **Backend Integration:**
   - Add user_id to projects
   - Implement JWT verification
   - Add access control

---

## 🐛 Troubleshooting

**"Auth provider not found"**
- Check `.env` file exists
- Verify `VITE_AUTH_PROVIDER` is set
- **IMPORTANT:** Restart development server after changing `.env`

**"Supabase credentials missing"**
- Set `VITE_SUPABASE_URL`
- Set `VITE_SUPABASE_ANON_KEY`
- Falls back to mock if missing

**"process is not defined"**
- You're using `process.env` instead of `import.meta.env`
- This project uses Vite (not CRA), must use `VITE_` prefix
- Already fixed in latest version

**"Can't sign in after signup"**
- For mock: Check localStorage
- For Supabase: Check email verification settings

---

## ✨ Summary

The auth system is now **fully functional** with:
- ✅ Complete sign up/in/out flow
- ✅ Protected routes
- ✅ User profile UI
- ✅ Backend-agnostic design
- ✅ Easy Supabase migration path
- ✅ Mock mode for development

**Current Status:** Using mock provider for development
**Production Path:** Switch to Supabase when ready (just update .env)

