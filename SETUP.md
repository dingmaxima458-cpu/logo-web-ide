# Setup Guide

## Quick Start

### Prerequisites

- **Node.js 16+** (check with `node --version`)
- npm (comes with Node.js)

### 1. Backend Setup

```bash
cd backend
npm install
```

The backend uses:
- **Express** - Web framework
- **`logo` npm package** - Logo interpreter (installed automatically)
- **WebSocket (ws)** - Real-time communication

### 2. Start Backend

```bash
cd backend
npm start
# or for development with auto-reload:
npm run dev
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# or simply
npm start
```

The frontend will run on `http://localhost:3000` with Vite's fast dev server.

## Testing the Application

1. Open `http://localhost:3000` in your browser
2. Try this Logo code in the editor:

```
forward 100
right 90
forward 100
right 90
forward 100
right 90
forward 100
```

3. Click "Run" to see the turtle draw a square!

Or try a REPEAT loop:

```
REPEAT 4 [FD 100 RT 90]
```

## Architecture Overview

### Frontend (React + TypeScript)
- **CodeEditor**: Monaco Editor for code editing with syntax highlighting
- **TurtleCanvas**: HTML5 Canvas for rendering turtle graphics
- **Controls**: Run, Clear, and Reset buttons
- **API Service**: Axios-based HTTP client for backend communication

### Backend (Node.js + Express)
- **Express**: Web framework for REST API and WebSocket
- **Logo Package**: Direct integration of `logo` npm package
- **REST API**: `/api/execute` endpoint for code execution
- **WebSocket**: `/ws/execute` endpoint for real-time execution streaming

## Development Notes

### Logo Interpreter

The Logo interpreter uses the `logo` npm package directly:
- Logo code is parsed and executed by the `logo` package
- Commands are converted to turtle graphics format
- JSON commands are returned to the frontend for rendering

To modify Logo command handling, edit `backend/server.js` in the `convertLogoCommands` function.

### Customizing the UI

- Editor theme: Modify Monaco Editor options in `CodeEditor.tsx`
- Canvas styling: Edit `TurtleCanvas.css`
- Colors: Update CSS variables in component stylesheets

## Troubleshooting

### Backend won't start
- Ensure Node.js 16+ is installed: `node --version`
- Check that all dependencies are installed: `npm install`
- Verify port 8000 is not in use
- Check for errors in the console

### Frontend won't start / npm install errors

**Dependency conflicts:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**If issues persist, try:**
```bash
# Option 1: Use legacy peer deps
npm install --legacy-peer-deps

# Option 2: Use yarn instead
npm install -g yarn
yarn install
```

**Other issues:**
- Ensure Node.js 16+ is installed (check with `node --version`)
- Check that port 3000 is not in use
- Verify npm version: `npm --version` (should be 7+)

### Code execution fails
- Check browser console for errors
- Verify backend is running and accessible: `curl http://localhost:8000/api/health`
- Check backend logs for error messages
- Ensure CORS is properly configured (should work by default)

### Turtle graphics not showing
- Check browser console for canvas errors
- Verify commands are being received from backend
- Try clearing the canvas and running again
- Check that Logo code syntax is correct (use uppercase: FORWARD, RIGHT, etc.)
