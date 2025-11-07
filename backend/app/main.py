"""
FastAPI backend for Logo Web IDE
Handles code execution, interpretation, and turtle graphics state management
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import asyncio

from app.interpreter.logo_interpreter import LogoInterpreter

app = FastAPI(title="Logo Web IDE API", version="1.0.0")

# CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global interpreter instance (in production, use per-session instances)
interpreter = LogoInterpreter()


class CodeRequest(BaseModel):
    code: str
    reset: bool = True  # Reset turtle state before execution


class ExecutionResponse(BaseModel):
    success: bool
    commands: List[Dict[str, Any]]  # Turtle drawing commands
    output: str = ""  # Text output from Logo code
    error: str = ""


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "logo-web-ide-backend"}


@app.post("/api/execute", response_model=ExecutionResponse)
async def execute_code(request: CodeRequest):
    """
    Execute Logo code and return turtle graphics commands
    
    Returns a list of drawing commands that the frontend can render:
    - move: {x, y, penDown}
    - turn: {angle}
    - pen: {down: bool}
    - color: {r, g, b}
    """
    try:
        if request.reset:
            interpreter.reset()
        
        # Execute code and get turtle commands
        commands, output = interpreter.execute(request.code)
        
        return ExecutionResponse(
            success=True,
            commands=commands,
            output=output,
            error=""
        )
    except Exception as e:
        return ExecutionResponse(
            success=False,
            commands=[],
            output="",
            error=str(e)
        )


@app.websocket("/ws/execute")
async def websocket_execute(websocket: WebSocket):
    """
    WebSocket endpoint for real-time code execution
    Streams turtle commands as they are generated
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive code from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            code = message.get("code", "")
            reset = message.get("reset", True)
            
            if reset:
                interpreter.reset()
            
            # Execute code and stream commands
            async for command in interpreter.execute_stream(code):
                await websocket.send_json(command)
            
            # Send completion signal
            await websocket.send_json({"type": "complete"})
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

