# Setup Guide

## Quick Start

### Prerequisites

- **Python 3.8-3.12 recommended** (Python 3.13 may have compatibility issues with some packages)
- If you're using Python 3.13 and encounter build errors, consider using Python 3.11 or 3.12

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Upgrade pip first (helps with Python 3.13 compatibility)
pip install --upgrade pip

# Option 1: Install with logopy (optional, may fail if package unavailable)
pip install -r requirements.txt

# Option 2: Install minimal requirements (works without logopy)
pip install -r requirements-minimal.txt
```

**Note about Logopy**: The `logopy` package is optional. The backend includes a working basic Logo parser that supports common commands (no installation needed):
- `forward` / `fd` - Move forward
- `back` / `bk` - Move backward
- `right` / `rt` - Turn right
- `left` / `lt` - Turn left
- `penup` / `pu` - Lift pen
- `pendown` / `pd` - Lower pen
- `home` - Return to origin

If you want to use a full Logo interpreter, you may need to:
1. Check if `logopy` is available: `pip install logopy`
2. Or use `PyLogo` from source: https://pylogo.sourceforge.net/
3. Or implement a more complete parser based on your needs

### 2. Start Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Clean install (if migrating from Create React App)
rm -rf node_modules package-lock.json build
npm cache clean --force

# Install dependencies
npm install
```

**Note**: The project now uses **Vite** (modern build tool) instead of Create React App:
- Much faster dev server and HMR
- TypeScript 5.3.3 support
- Better performance and developer experience

### 4. Start Frontend

```bash
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

## Architecture Overview

### Frontend (React + TypeScript)
- **CodeEditor**: Monaco Editor for code editing with syntax highlighting
- **TurtleCanvas**: HTML5 Canvas for rendering turtle graphics
- **Controls**: Run, Clear, and Reset buttons
- **API Service**: Axios-based HTTP client for backend communication

### Backend (Python + FastAPI)
- **FastAPI**: Modern async web framework
- **LogoInterpreter**: Wrapper around Logo interpreter (Logopy or fallback parser)
- **REST API**: `/api/execute` endpoint for code execution
- **WebSocket**: `/ws/execute` endpoint for real-time execution streaming

## Development Notes

### Adding More Logo Commands

To extend the basic parser, edit `backend/app/interpreter/logo_interpreter.py` and add new command handlers in the `_parse_basic_logo` method.

### Integrating Full Logo Interpreter

If you find a working Logo interpreter (like PyLogo), you can integrate it by:
1. Installing the package
2. Updating `LogoInterpreter.__init__()` to use it
3. Implementing `_extract_commands_from_logopy()` to convert interpreter output to drawing commands

### Customizing the UI

- Editor theme: Modify Monaco Editor options in `CodeEditor.tsx`
- Canvas styling: Edit `TurtleCanvas.css`
- Colors: Update CSS variables in component stylesheets

## Troubleshooting

### Python 3.13 Build Errors (pydantic-core)

If you encounter build errors with `pydantic-core` on Python 3.13:

**Solution 1: Use Python 3.11 or 3.12 (Recommended)**
```bash
# Create venv with specific Python version
python3.12 -m venv venv  # or python3.11
source venv/bin/activate
pip install -r requirements-minimal.txt
```

**Solution 2: Install pre-built wheels**
```bash
pip install --upgrade pip
pip install --only-binary :all: -r requirements-minimal.txt
```

**Solution 3: Use latest pydantic**
```bash
pip install "pydantic>=2.9.0" --upgrade
pip install -r requirements-minimal.txt
```

### Backend won't start
- Ensure Python 3.8-3.12 is installed (3.13 may have issues)
- Check that all dependencies are installed: `pip install -r requirements-minimal.txt`
- Verify port 8000 is not in use
- Try upgrading pip: `pip install --upgrade pip`

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
- Verify backend is running and accessible
- Check backend logs for error messages
- Ensure CORS is properly configured

### Turtle graphics not showing
- Check browser console for canvas errors
- Verify commands are being received from backend
- Try clearing the canvas and running again

