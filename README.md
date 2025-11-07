# Logo Web IDE - Modern Logo Programming Language Playground

A modern web-based IDE and visualization playground for the classic Logo programming language (like Terrapin Logo), featuring a React frontend and Python backend architecture.

## Research Findings

### Available Logo Interpreters

After careful research, we've identified several Logo interpreter options:

1. **Logopy** (Optional - Fallback parser included)
   - Python-based implementation
   - Supports both TK and SVG turtle graphics backends
   - Available on PyPI: `pip install logopy` (versions 0.0.1-0.0.4)
   - Well-suited for web integration with SVG support
   - **Note**: The backend includes a working fallback parser, so logopy is optional
   - Source: https://pypi.org/project/logopy/

2. **PyLogo**
   - Python-based Logo interpreter
   - Closely follows UCBLogo implementation
   - Allows integration with Python environments
   - Source: https://pylogo.sourceforge.net/

3. **PyoLogo**
   - Built on Python
   - Simpler subset of Logo primitives
   - Less feature-complete than other options

### Architecture Decision

The backend includes a **built-in Logo parser** that works immediately without any external dependencies. This parser supports common Logo commands:
- `forward` / `fd` - Move turtle forward
- `back` / `bk` - Move turtle backward  
- `right` / `rt` - Turn turtle right
- `left` / `lt` - Turn turtle left
- `penup` / `pu` - Lift pen (stop drawing)
- `pendown` / `pd` - Lower pen (start drawing)
- `home` - Return turtle to origin

**Logopy** is optional and can be installed for extended Logo support:
- Active PyPI package (versions 0.0.1-0.0.4 available)
- Native SVG support (perfect for web graphics)
- Python-based (matches our backend choice)
- Flexible turtle graphics backend

## Project Structure

```
logoWeb/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── CodeEditor/    # Monaco Editor component
│   │   │   ├── Canvas/        # Turtle graphics canvas
│   │   │   └── Controls/      # Run, Stop, Clear controls
│   │   ├── services/          # API communication
│   │   └── App.tsx
│   └── package.json
├── backend/           # Python Flask/FastAPI backend
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── interpreter/      # Logo interpreter wrapper
│   │   └── main.py           # FastAPI application
│   └── requirements.txt
└── README.md
```

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Modern, fast build tool (replaces Create React App)
- **Monaco Editor** (VS Code editor) for code editing
- **HTML5 Canvas** for turtle graphics visualization
- **Axios** for API communication
- **WebSocket** support for real-time execution

### Backend
- **Python 3.8+**
- **FastAPI** (modern, fast, async Python web framework)
- **Logopy** (Logo interpreter)
- **WebSocket** support for real-time communication
- **Uvicorn** (ASGI server)

## Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Python 3.8-3.12 (Python 3.13 may have compatibility issues - see troubleshooting)
- pip

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# or
npm start  # (alias for npm run dev)
```

**Note**: The frontend now uses **Vite** instead of Create React App for:
- ⚡ Lightning-fast dev server startup
- 🔥 Instant Hot Module Replacement (HMR)
- 📦 Faster production builds
- 🎯 Modern tooling and better DX

The frontend will run on `http://localhost:3000` and the backend on `http://localhost:8000`.

## Features

- [x] Modern code editor with syntax highlighting
- [x] Real-time turtle graphics visualization
- [x] Code execution via REST API
- [x] WebSocket support for live execution
- [ ] Error handling and debugging
- [ ] Code examples and tutorials
- [ ] Save/load programs
- [ ] Export graphics as images

## API Endpoints

- `POST /api/execute` - Execute Logo code and return turtle commands
- `WS /ws/execute` - WebSocket endpoint for real-time execution
- `GET /api/health` - Health check endpoint

## License

MIT

