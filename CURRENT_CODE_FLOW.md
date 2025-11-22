# Current Code Storage & Execution Flow

## 📊 Current State Analysis

### Code Storage: **TEMPORARY** (In-Memory Only)

Currently, code is stored **temporarily** in React component state:

```typescript
// App.tsx - Line 22-38
const [code, setCode] = useState(`; Welcome to Logo Web IDE!...`);
```

**What this means:**
- ✅ Code exists while the app is running
- ❌ Code is **lost on page refresh**
- ❌ Code is **not persisted** to backend
- ❌ No file management in UI

### Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. User types code in Monaco Editor                     │
│    ↓                                                     │
│    Code stored in React state (temporary)               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. User clicks "Run" button                             │
│    ↓                                                     │
│    handleRun() → executeCode(code, true)                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Frontend API Call (api.ts)                           │
│    POST /api/execute                                     │
│    Body: { code: string, reset: boolean }               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Backend receives code (server.js)                    │
│    - Optionally loads from fileId if provided           │
│    - Currently: Uses code string directly               │
│    - Processes Logo code → turtle commands              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Response: Turtle commands array                      │
│    Frontend renders on canvas                           │
└─────────────────────────────────────────────────────────┘
```

### File Storage System (Exists but Unused)

There IS a file storage system (`fileManager.js`), but it's **not integrated** into the UI:

**Backend File APIs:**
- `POST /api/files` - Save file
- `GET /api/files` - List files
- `GET /api/files/:id` - Load file
- `PUT /api/files/:id` - Update file
- `DELETE /api/files/:id` - Delete file

**Backend Execute API supports both:**
- Direct code: `POST /api/execute { code: "..." }`
- From file: `POST /api/execute { fileId: "..." }`

**But the frontend only uses direct code!**

---

## 🎯 What We Need

### Current Problems:
1. ❌ Code is lost on refresh
2. ❌ No way to save/load files in UI
3. ❌ No project organization
4. ❌ No file switching
5. ❌ No persistence

### What We're Building:
1. ✅ Persistent code storage (projects + files)
2. ✅ Save/load projects
3. ✅ Multiple files per project
4. ✅ File tabs for switching
5. ✅ Modern backend API (Supabase-like interface)

---

## 🏗️ Proposed Backend Architecture

### General REST API Interface (Supabase-like)

We'll create a **general, standardized REST API** that follows Supabase patterns but works with any backend:

#### Design Principles:
1. **RESTful** - Standard HTTP methods
2. **Consistent** - Same patterns across all resources
3. **Type-safe** - Clear request/response types
4. **Error handling** - Standardized error responses
5. **Query support** - Filter, sort, paginate (like Supabase)

#### API Structure:

```
/api/v1/
├── projects/              # Project management
│   ├── GET    /           # List projects (with query params)
│   ├── POST   /           # Create project
│   ├── GET    /:id        # Get project
│   ├── PUT    /:id        # Update project
│   ├── DELETE /:id        # Delete project
│   └── POST   /:id/duplicate  # Duplicate project
│
├── files/                 # File management (within projects)
│   ├── GET    /           # List files (with query params)
│   ├── POST   /           # Create file
│   ├── GET    /:id        # Get file
│   ├── PUT    /:id        # Update file
│   ├── DELETE /:id        # Delete file
│   └── PATCH  /:id/rename # Rename file
│
└── execute/               # Code execution
    └── POST   /           # Execute code (from fileId or direct)
```

#### Query Parameters (Supabase-like):

```
GET /api/v1/projects?select=id,name,updatedAt&order=updatedAt.desc&limit=10
GET /api/v1/files?projectId=xxx&select=id,name,path
```

#### Response Format:

```typescript
// Success Response
{
  data: T | T[],
  count?: number,
  error?: null
}

// Error Response
{
  data: null,
  error: {
    message: string,
    code: string,
    details?: any
  }
}
```

---

## 📝 Implementation Plan

### Phase 1: Backend API Layer
1. Create general REST API interface
2. Implement project management
3. Implement file management (project-aware)
4. Standardize error handling
5. Add query parameter support

### Phase 2: Frontend Integration
1. Create API client (Supabase-like)
2. Update state management
3. Integrate save/load
4. Add file tabs
5. Add project switcher

### Phase 3: UI/UX
1. Modern project explorer
2. File management UI
3. Save/load dialogs
4. Auto-save (optional)

---

## 🔄 Migration Path

### Step 1: Keep Current Flow Working
- Maintain `/api/execute` endpoint
- Add new `/api/v1/*` endpoints alongside

### Step 2: Add Persistence
- Save code to files when user clicks "Save"
- Load files when user opens them
- Auto-save on changes (optional)

### Step 3: Add Projects
- Wrap files in projects
- Project switcher in UI
- Save/load entire projects

### Step 4: Full Integration
- Remove old file APIs (if desired)
- Use only v1 APIs
- Modern UI complete

