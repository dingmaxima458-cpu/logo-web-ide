# Architecture Overview

## System Architecture

This project uses a **pure Node.js stack** - no Python needed!

### Backend: Node.js (Express)
- **Language**: JavaScript (ES Modules)
- **Framework**: Express
- **Logo Interpreter**: `logo` npm package (direct integration)
- **WebSocket**: `ws` package
- **Responsibilities**:
  - Handle HTTP/WebSocket requests from frontend
  - Execute Logo code using `logo` package directly
  - Convert Logo commands to turtle graphics format
  - Return JSON commands to frontend

### Frontend: React (Vite)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Editor**: Monaco Editor (VS Code editor)
- **Graphics**: HTML5 Canvas
- **Responsibilities**:
  - Code editing interface
  - Send Logo code to backend
  - Render turtle graphics from commands
  - User interaction and controls

## Data Flow

```
User Input (Logo Code)
    ↓
Frontend (React)
    ↓ HTTP POST /api/execute
Backend (Node.js/Express)
    ↓ logo.convert()
Logo npm Package
    ↓ JSON commands
Backend (Node.js)
    ↓ JSON response
Frontend (React)
    ↓ Canvas rendering
Turtle Graphics Display
```

## Key Files

- `backend/server.js` - Express server with Logo interpreter
- `backend/package.json` - Node.js dependencies
- `frontend/src/` - React application
- `package.json` (root) - Logo npm package

## Why This Architecture?

✅ **Simplified Stack**: One language (JavaScript/TypeScript) for both frontend and backend  
✅ **No Subprocess Overhead**: Direct integration, no process spawning  
✅ **Packaged Solution**: Uses existing, tested Logo interpreter  
✅ **Easy to Maintain**: Single runtime environment  
✅ **Fast Development**: Hot reload for both frontend and backend  

## Technology Choices

- **Express**: Lightweight, fast, widely used Node.js framework
- **Vite**: Modern build tool, much faster than Webpack/CRA
- **Monaco Editor**: Best-in-class code editing experience
- **`logo` npm package**: Comprehensive Logo interpreter with no native dependencies
