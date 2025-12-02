# Project & File Management System - Implementation Plan

## 🎯 Overview
Build a modern, user-friendly file and project management system for the Logo Web IDE, enabling users to create multiple files, organize them into projects, and seamlessly switch between projects.

## 🏗️ Architecture Decision: Backend Framework

### Option 1: Enhanced Node.js/Express (Recommended for MVP)
**Pros:**
- ✅ Full control over data structure
- ✅ No vendor lock-in
- ✅ Simpler deployment (single server)
- ✅ Lower cost (no external services)
- ✅ Faster development for MVP
- ✅ Can migrate to Supabase later if needed

**Cons:**
- ❌ Need to implement auth ourselves (if needed later)
- ❌ No built-in real-time sync
- ❌ Manual database management

### Option 2: Supabase
**Pros:**
- ✅ Built-in authentication
- ✅ Real-time database sync
- ✅ File storage service
- ✅ PostgreSQL database
- ✅ Easy scaling

**Cons:**
- ❌ Vendor lock-in
- ❌ Additional complexity
- ❌ Cost at scale
- ❌ Overkill for MVP

### **Recommendation: Start with Enhanced Node.js/Express**
- Build MVP with file-based storage (JSON for projects)
- Structure code to easily migrate to database later
- Add Supabase if we need auth, real-time, or scale requirements

---

## 📐 System Architecture

### Data Model

```
Project
├── id: string (UUID)
├── name: string
├── description: string (optional)
├── createdAt: ISO timestamp
├── updatedAt: ISO timestamp
├── files: File[]
└── settings: ProjectSettings

File
├── id: string (UUID)
├── projectId: string
├── name: string
├── path: string (e.g., "src/main.logo", "utils/helper.logo")
├── content: string
├── language: string (default: "logo")
├── createdAt: ISO timestamp
└── updatedAt: ISO timestamp
```

### Storage Structure
```
backend/
├── projects/
│   ├── {projectId}.json (project metadata + file references)
│   └── files/
│       ├── {projectId}/
│       │   ├── {fileId}.logo
│       │   └── ...
│       └── ...
```

---

## 🎨 Frontend UI/UX Design

### Modern Design Principles
1. **Clean, Minimal Interface** - Inspired by VS Code, Replit, CodeSandbox
2. **Intuitive Navigation** - Clear visual hierarchy
3. **Smooth Animations** - Subtle transitions for state changes
4. **Responsive Layout** - Works on different screen sizes
5. **Dark Theme** - Modern dark theme with good contrast

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo Web IDE | Project: [Current Project ▼]   │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Project  │  ┌──────────────────────────────────────┐   │
│ Explorer │  │ File Tabs: [main.logo] [helper.logo]│   │
│          │  ├──────────────────────────────────────┤   │
│ [📁] My  │  │                                      │   │
│ Projects │  │      Code Editor (Monaco)            │   │
│          │  │                                      │   │
│  • Proj1 │  │                                      │   │
│  • Proj2 │  │                                      │   │
│  • Proj3 │  │                                      │   │
│          │  └──────────────────────────────────────┘   │
│ [+ New]  │  ┌──────────────────────────────────────┐   │
│          │  │ Controls: [▶ Run] [🗑 Clear] [💾 Save]│   │
│          │  └──────────────────────────────────────┘   │
│          │  ┌──────────────────────────────────────┐   │
│          │  │ Console Output                       │   │
│          │  └──────────────────────────────────────┘   │
│          │                                              │
├──────────┴──────────────────────────────────────────────┤
│          Canvas Panel (Turtle Graphics)                 │
└─────────────────────────────────────────────────────────┘
```

### Key UI Components

1. **Project Explorer Sidebar**
   - Collapsible panel (left side)
   - List of projects with icons
   - Active project highlighted
   - Quick actions: New, Rename, Delete, Duplicate
   - Search/filter projects

2. **File Tabs**
   - Tab bar above editor
   - Active tab highlighted
   - Close button on hover
   - Unsaved indicator (dot or asterisk)
   - Drag to reorder

3. **Project Switcher**
   - Dropdown in header
   - Search projects
   - Recent projects
   - Create new project option

4. **File Tree (within project)**
   - Expandable folder structure
   - File icons by type
   - Context menu (rename, delete, duplicate)
   - Drag & drop to organize

5. **Modern Dialogs**
   - Create Project dialog
   - Save Project dialog
   - Load Project dialog
   - File creation dialog

---

## 🔧 Implementation Plan

### Phase 1: Backend Foundation (Core APIs)

#### 1.1 Project Management APIs
- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project metadata
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/duplicate` - Duplicate project

#### 1.2 File Management APIs (within projects)
- `POST /api/projects/:projectId/files` - Create file
- `GET /api/projects/:projectId/files` - List files in project
- `GET /api/projects/:projectId/files/:fileId` - Get file content
- `PUT /api/projects/:projectId/files/:fileId` - Update file
- `DELETE /api/projects/:projectId/files/:fileId` - Delete file
- `POST /api/projects/:projectId/files/:fileId/rename` - Rename file

#### 1.3 Project Save/Load
- `POST /api/projects/:id/save` - Save entire project (all files)
- `GET /api/projects/:id/export` - Export project as JSON
- `POST /api/projects/import` - Import project from JSON

### Phase 2: Backend Implementation

#### 2.1 Project Manager Module (`projectManager.js`)
```javascript
- initializeProjectStorage()
- createProject(name, description)
- getProject(id)
- listProjects()
- updateProject(id, updates)
- deleteProject(id)
- duplicateProject(id)
- saveProject(id) // Save all files
- exportProject(id) // Export as JSON
- importProject(projectData) // Import from JSON
```

#### 2.2 Enhanced File Manager
- Integrate with project system
- Support file paths within projects
- Handle file organization

### Phase 3: Frontend State Management

#### 3.1 State Structure
```typescript
interface AppState {
  projects: Project[]
  currentProject: Project | null
  currentFile: File | null
  openFiles: File[] // Tabs
  unsavedChanges: Set<string> // File IDs with unsaved changes
}
```

#### 3.2 Context/Store
- Create React Context for project/file state
- Or use Zustand/Redux for state management
- Handle auto-save (optional)

### Phase 4: Frontend Components

#### 4.1 Project Explorer Component
- Sidebar with project list
- Project actions (new, delete, rename)
- Active project indicator

#### 4.2 File Tabs Component
- Tab bar with file names
- Active tab styling
- Close button
- Unsaved indicator

#### 4.3 Project Switcher Component
- Header dropdown
- Search functionality
- Recent projects

#### 4.4 File Tree Component
- Hierarchical file structure
- Context menu
- Drag & drop

#### 4.5 Dialog Components
- CreateProjectDialog
- SaveProjectDialog
- LoadProjectDialog
- CreateFileDialog

### Phase 5: Modern UI Styling

#### 5.1 Design System
- Color palette (modern dark theme)
- Typography scale
- Spacing system
- Component library

#### 5.2 Animations
- Smooth transitions
- Loading states
- Hover effects
- Micro-interactions

---

## 🎨 Design System

### Color Palette (Dark Theme)
```css
--bg-primary: #1e1e1e
--bg-secondary: #252526
--bg-tertiary: #2d2d30
--border: #3e3e42
--text-primary: #cccccc
--text-secondary: #858585
--accent: #007acc
--accent-hover: #005a9e
--success: #4ec9b0
--error: #f48771
--warning: #dcdcaa
```

### Typography
- Font Family: 'Inter', 'Segoe UI', system-ui, sans-serif
- Code Font: 'Fira Code', 'Consolas', monospace
- Headings: 600 weight
- Body: 400 weight

### Spacing
- Base unit: 8px
- Scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px

---

## 📦 Technology Stack

### Backend
- Node.js + Express (current)
- File system storage (JSON + files)
- UUID for IDs

### Frontend
- React + TypeScript (current)
- Monaco Editor (current)
- State management: React Context or Zustand
- UI components: Custom (modern design)
- Icons: Lucide React or Heroicons

### Future Considerations
- Database: SQLite or PostgreSQL (if needed)
- Authentication: JWT or Supabase Auth (if needed)
- Real-time: WebSockets (already have) or Supabase Realtime

---

## 🚀 Implementation Steps

### Step 1: Backend Project Management
1. Create `projectManager.js`
2. Implement project CRUD APIs
3. Update `server.js` with new routes
4. Test with Postman/curl

### Step 2: Backend File Management (Project-aware)
1. Update `fileManager.js` to work with projects
2. Implement file APIs within projects
3. Test file operations

### Step 3: Frontend API Service
1. Update `api.ts` with project/file endpoints
2. Add TypeScript interfaces
3. Error handling

### Step 4: Frontend State Management
1. Create project/file context
2. Implement state management logic
3. Connect to API service

### Step 5: UI Components
1. Project Explorer sidebar
2. File tabs component
3. Project switcher
4. Dialogs

### Step 6: Integration
1. Connect all components
2. Handle file switching
3. Auto-save functionality
4. Error handling

### Step 7: Polish
1. Modern styling
2. Animations
3. Loading states
4. Error messages
5. User feedback

---

## ✅ Success Criteria

1. ✅ Users can create multiple projects
2. ✅ Users can create multiple files within a project
3. ✅ Users can switch between files using tabs
4. ✅ Users can switch between projects
5. ✅ Users can save and load entire projects
6. ✅ Modern, intuitive UI
7. ✅ Smooth user experience
8. ✅ No data loss (auto-save or clear save prompts)

---

## 🔮 Future Enhancements

1. **Auto-save** - Automatically save changes
2. **File search** - Search within and across files
3. **Code snippets** - Reusable code templates
4. **Project templates** - Starter project templates
5. **Version history** - Track file changes over time
6. **Collaboration** - Real-time collaboration (Supabase)
7. **Cloud sync** - Sync projects across devices
8. **Export options** - Export to ZIP, GitHub, etc.

---

## 📝 Notes

- Start simple, iterate based on feedback
- Focus on core functionality first
- Modern UI can be refined over time
- Keep code modular for easy migration to Supabase if needed
- Consider user onboarding (tutorial, welcome screen)

