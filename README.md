# Logo Web IDE - Modern Logo Programming Language Playground

A modern web-based IDE and visualization playground for the classic Logo programming language (like Terrapin Logo), featuring a React frontend and Node.js backend architecture.

## Logo Interpreter

The backend uses the **`logo` npm package** - a well-maintained, comprehensive Logo interpreter written in JavaScript. This approach provides:

✅ **Packaged Solution** - Uses existing, tested Logo interpreter  
✅ **Comprehensive Logo Support** - Full Logo language implementation  
✅ **Simple Architecture** - Pure Node.js, no subprocess overhead  
✅ **Wide Language Coverage** - Supports all standard Logo commands  
✅ **Procedure & Loop Support** - Handles `TO ... END` procedures and `REPEAT` loops  

**Supported Logo Commands:**
All standard Logo commands including:
- **Movement**: `FORWARD`/`FD`, `BACK`/`BK`
- **Rotation**: `RIGHT`/`RT`, `LEFT`/`LT`
- **Control Flow**: `REPEAT`, `IF`, `WHILE`
- **Procedures**: `TO name ... END` definitions
- **And many more!**

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
├── backend/           # Node.js/Express backend
│   ├── server.js              # Express server with Logo interpreter
│   └── package.json
└── README.md
```

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Modern, fast build tool
- **Monaco Editor** (VS Code editor) for code editing
- **HTML5 Canvas** for turtle graphics visualization
- **Axios** for API communication
- **WebSocket** support for real-time execution

### Backend
- **Node.js** with Express
- **`logo` npm package** - Comprehensive Logo interpreter
- **WebSocket** support for real-time communication

## Getting Started

### Prerequisites
- **Node.js 16+** and npm
- That's it! No Python needed.

### Backend Setup

```bash
cd backend
npm install
npm start
# or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# or
npm start
```

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
