# Backend API Specification
## General REST API Interface (Supabase-like)

This document defines a **general, standardized REST API** that follows Supabase patterns but is backend-agnostic. It can work with file-based storage, SQLite, PostgreSQL, or any other backend.

---

## 🎯 Design Principles

1. **RESTful** - Standard HTTP methods and status codes
2. **Consistent** - Same patterns across all resources
3. **Type-safe** - Clear request/response schemas
4. **Queryable** - Filter, sort, paginate like Supabase
5. **Error handling** - Standardized error responses
6. **Versioned** - `/api/v1/` prefix for future compatibility

---

## 📋 API Base Structure

```
Base URL: /api/v1
Content-Type: application/json
```

---

## 🔐 Authentication (Future)

Currently: No authentication (single-user mode)
Future: JWT tokens in `Authorization: Bearer <token>` header

---

## 📦 Response Format

### Success Response
```typescript
{
  data: T | T[],           // Single resource or array
  count?: number,          // Total count (for pagination)
  error: null
}
```

### Error Response
```typescript
{
  data: null,
  error: {
    message: string,       // Human-readable error message
    code: string,          // Error code (e.g., "NOT_FOUND", "VALIDATION_ERROR")
    details?: any          // Additional error details
  }
}
```

### HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## 🔍 Query Parameters (Supabase-like)

### Select Fields
```
?select=id,name,updatedAt
?select=*  (all fields)
```

### Filtering
```
?projectId=eq.abc123
?name=ilike.*test*
?createdAt=gte.2024-01-01
```

### Sorting
```
?order=updatedAt.desc
?order=name.asc,createdAt.desc
```

### Pagination
```
?limit=10
?offset=20
```

### Operators
- `eq` - equals
- `neq` - not equals
- `gt` - greater than
- `gte` - greater than or equal
- `lt` - less than
- `lte` - less than or equal
- `like` - case-sensitive like
- `ilike` - case-insensitive like
- `in` - in array

---

## 📁 Projects API

### List Projects
```http
GET /api/v1/projects
```

**Query Parameters:**
- `select` - Fields to return
- `order` - Sort order
- `limit` - Max results
- `offset` - Pagination offset

**Response:**
```json
{
  "data": [
    {
      "id": "proj_abc123",
      "name": "My Project",
      "description": "A Logo project",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:45:00Z",
      "fileCount": 3
    }
  ],
  "count": 1,
  "error": null
}
```

### Get Project
```http
GET /api/v1/projects/:id
```

**Response:**
```json
{
  "data": {
    "id": "proj_abc123",
    "name": "My Project",
    "description": "A Logo project",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:45:00Z",
    "fileCount": 3,
    "files": [
      {
        "id": "file_xyz789",
        "name": "main.logo",
        "path": "main.logo"
      }
    ]
  },
  "error": null
}
```

### Create Project
```http
POST /api/v1/projects
```

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "data": {
    "id": "proj_abc123",
    "name": "New Project",
    "description": "Optional description",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "fileCount": 0
  },
  "error": null
}
```

### Update Project
```http
PUT /api/v1/projects/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Project
```http
DELETE /api/v1/projects/:id
```

**Response:**
```json
{
  "data": { "success": true },
  "error": null
}
```

### Duplicate Project
```http
POST /api/v1/projects/:id/duplicate
```

**Request Body (optional):**
```json
{
  "name": "Copy of My Project"
}
```

---

## 📄 Files API

### List Files
```http
GET /api/v1/files?projectId=proj_abc123
```

**Query Parameters:**
- `projectId` (required) - Filter by project
- `select` - Fields to return
- `order` - Sort order

**Response:**
```json
{
  "data": [
    {
      "id": "file_xyz789",
      "projectId": "proj_abc123",
      "name": "main.logo",
      "path": "main.logo",
      "language": "logo",
      "lineCount": 25,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:45:00Z"
    }
  ],
  "count": 1,
  "error": null
}
```

### Get File
```http
GET /api/v1/files/:id
```

**Response:**
```json
{
  "data": {
    "id": "file_xyz789",
    "projectId": "proj_abc123",
    "name": "main.logo",
    "path": "main.logo",
    "content": "forward 100\nright 90\n...",
    "language": "logo",
    "lineCount": 25,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:45:00Z"
  },
  "error": null
}
```

### Create File
```http
POST /api/v1/files
```

**Request Body:**
```json
{
  "projectId": "proj_abc123",
  "name": "main.logo",
  "path": "main.logo",
  "content": "forward 100\nright 90",
  "language": "logo"
}
```

**Response:**
```json
{
  "data": {
    "id": "file_xyz789",
    "projectId": "proj_abc123",
    "name": "main.logo",
    "path": "main.logo",
    "content": "forward 100\nright 90",
    "language": "logo",
    "lineCount": 2,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "error": null
}
```

### Update File
```http
PUT /api/v1/files/:id
```

**Request Body:**
```json
{
  "content": "forward 200\nright 90\nforward 200",
  "name": "main.logo"  // optional
}
```

### Delete File
```http
DELETE /api/v1/files/:id
```

### Rename File
```http
PATCH /api/v1/files/:id/rename
```

**Request Body:**
```json
{
  "name": "new-name.logo",
  "path": "new-name.logo"  // optional, defaults to name
}
```

---

## ▶️ Execute API

### Execute Code
```http
POST /api/v1/execute
```

**Request Body (Option 1: Direct Code):**
```json
{
  "code": "forward 100\nright 90",
  "reset": true
}
```

**Request Body (Option 2: From File):**
```json
{
  "fileId": "file_xyz789",
  "reset": true
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "commands": [
      { "type": "move", "x": 0, "y": 100, "penDown": true },
      { "type": "turn", "angle": 0 }
    ],
    "output": "",
    "error": ""
  },
  "error": null
}
```

**Error Response:**
```json
{
  "data": {
    "success": false,
    "commands": [],
    "output": "",
    "error": "Error in line 3: Don't know how to FORWRD"
  },
  "error": null
}
```

---

## 🔄 Project Export/Import

### Export Project
```http
GET /api/v1/projects/:id/export
```

**Response:**
```json
{
  "data": {
    "project": {
      "id": "proj_abc123",
      "name": "My Project",
      "description": "...",
      "createdAt": "...",
      "updatedAt": "..."
    },
    "files": [
      {
        "id": "file_xyz789",
        "name": "main.logo",
        "path": "main.logo",
        "content": "...",
        "language": "logo"
      }
    ]
  },
  "error": null
}
```

### Import Project
```http
POST /api/v1/projects/import
```

**Request Body:**
```json
{
  "project": {
    "name": "Imported Project",
    "description": "..."
  },
  "files": [
    {
      "name": "main.logo",
      "path": "main.logo",
      "content": "...",
      "language": "logo"
    }
  ]
}
```

---

## 🛠️ Implementation Notes

### Backend Structure
```
backend/
├── api/
│   ├── v1/
│   │   ├── projects.js      # Project routes
│   │   ├── files.js         # File routes
│   │   └── execute.js       # Execute route
│   └── middleware/
│       ├── errorHandler.js  # Standardized error handling
│       ├── queryParser.js   # Parse query parameters
│       └── validator.js     # Request validation
├── services/
│   ├── projectService.js    # Project business logic
│   ├── fileService.js       # File business logic
│   └── storage/
│       ├── fileStorage.js   # File-based storage
│       └── dbStorage.js     # Database storage (future)
└── utils/
    ├── queryBuilder.js      # Build queries from params
    └── responseFormatter.js # Format responses
```

### Query Parser Example
```javascript
// ?projectId=eq.abc123&order=updatedAt.desc&limit=10
{
  filters: {
    projectId: { operator: 'eq', value: 'abc123' }
  },
  order: [{ field: 'updatedAt', direction: 'desc' }],
  limit: 10,
  offset: 0
}
```

### Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ENTRY` - Resource already exists
- `EXECUTION_ERROR` - Code execution failed
- `STORAGE_ERROR` - Storage operation failed

---

## 🚀 Migration Strategy

### Phase 1: Add v1 APIs alongside existing
- Keep `/api/execute` working
- Add `/api/v1/*` endpoints
- Test both in parallel

### Phase 2: Frontend migration
- Update frontend to use v1 APIs
- Keep old APIs for backward compatibility

### Phase 3: Deprecation (optional)
- Mark old APIs as deprecated
- Eventually remove if not needed

---

## 📝 TypeScript Types

```typescript
// Response wrapper
interface ApiResponse<T> {
  data: T | null;
  error: {
    message: string;
    code: string;
    details?: any;
  } | null;
}

// Project
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
  files?: File[];
}

// File
interface File {
  id: string;
  projectId: string;
  name: string;
  path: string;
  content?: string;
  language: string;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
}

// Query parameters
interface QueryParams {
  select?: string;
  order?: string;
  limit?: number;
  offset?: number;
  [key: string]: any; // Filters
}
```

---

This API specification provides a **general, standardized interface** that can work with any backend implementation (file-based, SQLite, PostgreSQL, Supabase, etc.).

