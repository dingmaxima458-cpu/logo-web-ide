# 🐢 Logo Web IDE

A modern, web-based IDE and playground for the Logo programming language. Write Logo code, visualize turtle graphics in real-time, and learn programming through drawing!

![Logo Web IDE](https://img.shields.io/badge/Logo-Web%20IDE-blue)
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ Features

- **🎨 Real-time Turtle Graphics** - Watch your Logo code come to life with beautiful visualizations
- **💻 Modern Code Editor** - Powered by Monaco Editor (VS Code editor) with syntax highlighting
- **🚀 Fast Execution** - Direct integration with Logo interpreter, no subprocess overhead 
- **🔄 Live Updates** - See your drawings update as you modify code

## 🚀 Quick Start

### Prerequisites
- **Node.js 16+** and npm

### Installation & Run

```bash
# Install all dependencies
npm run install:all

# Start both backend and frontend
npm start
```

That's it! Open `http://localhost:3000` in your browser.

For development with auto-reload:
```bash
npm run dev
```

## 📝 Example Code

Try this in the editor:

```logo
; Draw a square
forward 100
right 90
forward 100
right 90
forward 100
right 90
forward 100
```

Or use a loop:

```logo
REPEAT 4 [FD 100 RT 90]
```

Try colors and shapes:

```logo
setcolor 2
setpensize 5
forward 100
right 90
setcolor 4
forward 100

; Draw a circle
CIRCLE 50

; Draw a filled oval
STAMPOVAL 80 50
```

## 🎯 Supported Commands

### Basic Movement
- `FORWARD n` / `FD n` - Move forward
- `BACK n` / `BK n` - Move backward
- `RIGHT n` / `RT n` - Turn right
- `LEFT n` / `LT n` - Turn left
- `HOME` - Return to center
- `SETXY x y` - Move to coordinates

### Pen Control
- `PENDOWN` / `PD` - Start drawing
- `PENUP` / `PU` - Stop drawing
- `SETCOLOR n` / `SETC n` - Set pen color (0-15)
- `SETPENSIZE n` / `SETPS n` - Set pen width

### Shapes (Extended Commands)
- `CIRCLE radius` - Draw a circle
- `SQUARE size` - Draw a square
- `RECTANGLE width height` - Draw a rectangle
- `TRIANGLE size` - Draw a triangle
- `OVAL width height` - Draw an oval
- `STAMPOVAL width height` - Draw a filled oval
- `STAMPCIRCLE radius` - Draw a filled circle
- `STAMPSQUARE size` - Draw a filled square
- `STAMPRECT width height` - Draw a filled rectangle

### Control Flow
- `REPEAT n [commands]` - Repeat commands
- `IF condition [commands]` - Conditional execution
- `TO name :params ... END` - Define procedures

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express
- **Editor**: Monaco Editor (VS Code editor)
- **Graphics**: HTML5 Canvas
- **Logo Interpreter**: `logo` npm package


## 🛠️ Development

### Run Servers Separately

**Backend:**
```bash
cd backend
npm install
npm start        # Production
npm run dev      # Development with auto-reload
```

**Frontend:**
```bash
cd frontend
npm install
npm start        # Development server
npm run build    # Production build
```

---

**Happy Coding! 🐢✨**
