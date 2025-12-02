# File Save & Execution Flow Analysis

## Current Flow

### 1. **User Types in Monaco Editor**
```
Monaco Editor → handleEditorChange → onChange(newValue)
  ↓
ProjectWorkspace.handleCodeChange:
  - Updates `code` state
  - Updates `currentCodeRef.current` (latest editor content)
  - Calls `updateFileContent(fileId, { content })` → IN-MEMORY UPDATE ONLY
  - Sets auto-save timeout (2 seconds)
```

### 2. **Auto-Save (after 2s delay)**
```
ProjectWorkspace.handleCodeChange (timeout):
  - Gets `currentCodeRef.current`
  - Calls `saveFile(fileId, codeToSave)`
    ↓
ProjectContext.saveFile:
  - Calls `filesApi.update(projectId, fileId, { content })`
    ↓
Backend API: PUT /api/v1/files/:id
  - Calls `projectManagerDB.updateFile()`
    ↓
Backend Storage:
  1. Writes to LOCAL CACHE: `backend/.cache/files/{userId}/{projectId}/{path}`
  2. Uploads to SUPABASE STORAGE: `{userId}/{projectId}/{path}`
  3. Updates database metadata (line_count, updated_at)
```

### 3. **Run Button Clicked**
```
ProjectWorkspace.handleRun:
  1. Gets `latestCode` from `currentCodeRef.current` (Monaco's current content)
  2. Clears auto-save timeout
  3. Calls `saveFile(currentFile.id, latestCode)` → saves to backend
  4. Waits 100ms (⚠️ RACE CONDITION RISK)
  5. Calls `executeApi.execute({ fileId, projectId })` → sends fileId, NOT code
```

### 4. **Backend Execute**
```
Backend: POST /api/v1/execute
  - Receives: { fileId, projectId }
  - Calls `projectManagerDB.getFile(fileId, projectId, userId)`
    ↓
Backend Storage Read:
  1. Tries LOCAL CACHE first: `backend/.cache/files/{userId}/{projectId}/{path}`
  2. If not in cache → Downloads from SUPABASE STORAGE to cache
  3. Returns file with `content` from cache/storage
  ↓
Executes code from database (NOT from frontend)
```

## Storage Layers

1. **Monaco Editor** (Frontend): In-memory editor state
2. **Frontend State** (`currentCodeRef`, `code`): React state + refs
3. **Local Cache** (`backend/.cache/files/`): Temporary filesystem cache
4. **Supabase Storage** (`project-files` bucket): Persistent storage
5. **Supabase Database** (`files` table): Metadata only (no content)

## Issues Identified

### ⚠️ Issue 1: Race Condition in Run Flow
**Problem**: The 100ms wait after `saveFile()` might not be enough for:
- Local cache write
- Supabase Storage upload
- Database metadata update

**Risk**: Execute might read stale content from cache/storage if save hasn't completed.

### ⚠️ Issue 2: Cache Staleness
**Problem**: `getFile()` reads from local cache first. If cache exists but is stale:
- Auto-save might have written new content to cache
- But if cache read happens before write completes → stale content
- Or if Supabase Storage has newer content but cache is old → stale content

### ⚠️ Issue 3: No Cache Invalidation
**Problem**: When `updateFile()` writes to cache, it doesn't invalidate/update existing cache entries. Multiple backend instances could have different cache states.

### ⚠️ Issue 4: Auto-Save vs Manual Save Conflict
**Problem**: 
- User types → auto-save starts (2s timer)
- User clicks Run → clears timer, saves manually
- But if auto-save was about to fire, there could be a race

### ⚠️ Issue 5: No Verification After Save
**Problem**: `handleRun` doesn't verify that the save actually completed successfully before executing. It just waits 100ms and hopes.

## Recommended Fixes

### Fix 1: Make Save Synchronous in Run Flow
```typescript
// In handleRun, wait for save to complete AND verify
await saveFile(currentFile.id, latestCode);
// Wait for backend to confirm save completed
await new Promise(resolve => setTimeout(resolve, 200)); // Increased wait
```

### Fix 2: Always Read from Supabase Storage (Skip Cache on Execute)
```javascript
// In projectManagerDB.getFile(), add a flag:
export async function getFile(fileId, projectId, userId, skipCache = false) {
  if (skipCache) {
    // Always download from Supabase Storage, bypass cache
    content = await downloadToCache(supabase, data.storage_path, cachePath);
  } else {
    // Current logic: try cache first
  }
}
```

### Fix 3: Pass Code Directly to Execute (Bypass Storage Read)
```typescript
// Option A: Send code directly
executeApi.execute({
  code: latestCode,  // Send code directly
  fileId: currentFile.id,  // For logging/tracking
  projectId: currentProject.id
});

// Backend: Use code if provided, otherwise load from storage
if (code) {
  codeToExecute = code;  // Use provided code
} else if (fileId) {
  fileInfo = await getFile(...);  // Load from storage
  codeToExecute = fileInfo.content;
}
```

### Fix 4: Add Save Verification
```typescript
// After saveFile, verify by reading back
const savedFile = await filesApi.get(currentProject.id, currentFile.id);
if (savedFile.content !== latestCode) {
  throw new Error('Save verification failed');
}
```

## Recommended Approach

**Best Solution**: **Fix 3** - Pass code directly to execute API.

**Why?**
- Eliminates race conditions (no need to wait for storage)
- Always executes the exact code user sees in Monaco
- Simpler flow (no cache/storage read needed for execute)
- Still saves to storage for persistence (auto-save continues)

**Implementation**:
1. Modify `handleRun` to send `code` directly
2. Modify backend execute API to accept `code` OR `fileId`
3. If `code` provided → use it directly
4. If only `fileId` provided → load from storage (for API-only calls)

