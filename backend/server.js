/**
 * Logo Web IDE Backend Server
 * Node.js/Express server with Logo interpreter integration
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { createRequire } from 'module';
import * as fileManager from './fileManager.js';

// logo package uses CommonJS, so we need to use createRequire
const require = createRequire(import.meta.url);
const logo = require('logo');
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
// CORS configuration - allow EC2 and localhost
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  // Allow EC2 public DNS (with and without port)
  /^https?:\/\/ec2-.*\.compute\.amazonaws\.com(:.*)?$/,
  /^https?:\/\/.*\.amazonaws\.com(:.*)?$/,
  // Allow any origin in development (you may want to restrict in production)
  ...(process.env.NODE_ENV !== 'production' ? [true] : [])
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'boolean' && allowed) return true;
      if (typeof allowed === 'string') return origin === allowed;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));
app.use(express.json());

// Convert Logo commands to turtle graphics format
function convertLogoCommands(logoCommands) {
  const turtleCommands = [];
  let x = 0, y = 0, angle = 90; // Logo convention: start facing up
  let penDown = true;

  if (logoCommands && Array.isArray(logoCommands)) {
    logoCommands.forEach(cmd => {
      // Handle move command: {"move": [distance]}
      if (cmd.move && Array.isArray(cmd.move) && cmd.move.length > 0) {
        const distance = cmd.move[0];
        const angleRad = (angle * Math.PI) / 180;
        x += distance * Math.cos(angleRad);
        y += distance * Math.sin(angleRad);
        turtleCommands.push({
          type: 'move',
          x: x,
          y: y,
          penDown: penDown
        });
      }
      // Handle turn command: {"turn": [angle]} (positive = right, negative = left)
      else if (cmd.turn && Array.isArray(cmd.turn) && cmd.turn.length > 0) {
        const turnAngle = cmd.turn[0];
        angle -= turnAngle; // Logo: right turn decreases angle
        turtleCommands.push({
          type: 'turn',
          angle: angle
        });
      }
      // Handle pen commands
      else if (cmd.penup || cmd.pu) {
        penDown = false;
        turtleCommands.push({
          type: 'pen',
          down: false
        });
      }
      else if (cmd.pendown || cmd.pd) {
        penDown = true;
        turtleCommands.push({
          type: 'pen',
          down: true
        });
      }
      // Handle home
      else if (cmd.home) {
        x = 0;
        y = 0;
        angle = 90;
        turtleCommands.push({
          type: 'move',
          x: 0,
          y: 0,
          penDown: penDown
        });
      }
      // Ignore begin/end markers
    });
  }

  return turtleCommands;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'logo-web-ide-backend',
    runtime: 'node.js'
  });
});

// File management endpoints
app.post('/api/files', async (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: 'filename and content are required' });
    }
    const file = await fileManager.saveFile(filename, content);
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const files = await fileManager.listFiles();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/:id', async (req, res) => {
  try {
    const file = await fileManager.loadFile(req.params.id);
    res.json(file);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.put('/api/files/:id', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }
    const file = await fileManager.updateFile(req.params.id, content);
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  try {
    await fileManager.deleteFile(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute Logo code endpoint - supports both fileId and direct code
app.post('/api/execute', async (req, res) => {
  try {
    const { fileId, code, reset = true } = req.body;
    
    let codeToExecute = code;
    let fileInfo = null;
    
    // If fileId is provided, load the file
    if (fileId) {
      fileInfo = await fileManager.loadFile(fileId);
      codeToExecute = fileInfo.content;
    }
    
    // Fallback: code must be provided if no fileId
    if (!codeToExecute || typeof codeToExecute !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Either fileId or code must be provided',
        commands: []
      });
    }

    // Convert Logo code using the logo package
    logo.convert(codeToExecute, (err, logoCommands) => {
      if (err) {
        // Get the raw error message from the compiler
        let errorMessage = err.toString();
        
        // Try to find line number information
        // Use file's line numbers if available, otherwise use code string
        const codeLines = codeToExecute.split('\n');
        let lineNumber = null;
        
        // For "Don't know how to X" errors, find which line contains X
        const unknownCmdMatch = errorMessage.match(/Don't know how to (\w+)/i);
        if (unknownCmdMatch) {
          const unknownCmd = unknownCmdMatch[1];
          // Search for the command in the code (case-insensitive)
          for (let i = 0; i < codeLines.length; i++) {
            const line = codeLines[i].toUpperCase();
            // Check if line contains the unknown command (as a word, not substring)
            if (new RegExp(`\\b${unknownCmd}\\b`, 'i').test(codeLines[i])) {
              lineNumber = i + 1; // Line numbers are 1-based
              break;
            }
          }
        }
        
        // For syntax errors like "Expected ']'", try to find the problematic line
        if (errorMessage.includes("Expected ']'") && lineNumber === null) {
          // Find the last line with an opening bracket
          for (let i = codeLines.length - 1; i >= 0; i--) {
            if (codeLines[i].includes('[') && !codeLines[i].includes(']')) {
              lineNumber = i + 1;
              break;
            }
          }
        }
        
        // For "Unexpected end" errors, it's likely the last line
        if (errorMessage.includes("Unexpected end") && lineNumber === null) {
          lineNumber = codeLines.length;
        }
        
        // Prepend line number to error message if found
        if (lineNumber !== null) {
          errorMessage = `Error in line ${lineNumber}: ${errorMessage}`;
        }
        
        return res.json({
          success: false,
          error: errorMessage,
          commands: [],
          output: ''
        });
      }

      // Convert to turtle graphics format
      const turtleCommands = convertLogoCommands(logoCommands);

      res.json({
        success: true,
        commands: turtleCommands,
        output: '',
        error: ''
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      commands: [],
      output: ''
    });
  }
});

// WebSocket endpoint for real-time execution
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/execute' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { code, reset = true } = data;

      if (!code || typeof code !== 'string') {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Code is required and must be a string'
        }));
        return;
      }

      // Convert Logo code
      logo.convert(code, (err, logoCommands) => {
        if (err) {
          // Get the raw error message from the compiler
          let errorMessage = err.toString();
          
          // Try to find line number information
          const codeLines = code.split('\n');
          let lineNumber = null;
          
          // For "Don't know how to X" errors, find which line contains X
          const unknownCmdMatch = errorMessage.match(/Don't know how to (\w+)/i);
          if (unknownCmdMatch) {
            const unknownCmd = unknownCmdMatch[1];
            // Search for the command in the code (case-insensitive)
            for (let i = 0; i < codeLines.length; i++) {
              const line = codeLines[i].toUpperCase();
              // Check if line contains the unknown command (as a word, not substring)
              if (new RegExp(`\\b${unknownCmd}\\b`, 'i').test(codeLines[i])) {
                lineNumber = i + 1; // Line numbers are 1-based
                break;
              }
            }
          }
          
          // For syntax errors like "Expected ']'", try to find the problematic line
          if (errorMessage.includes("Expected ']'") && lineNumber === null) {
            // Find the last line with an opening bracket
            for (let i = codeLines.length - 1; i >= 0; i--) {
              if (codeLines[i].includes('[') && !codeLines[i].includes(']')) {
                lineNumber = i + 1;
                break;
              }
            }
          }
          
          // For "Unexpected end" errors, it's likely the last line
          if (errorMessage.includes("Unexpected end") && lineNumber === null) {
            lineNumber = codeLines.length;
          }
          
          // Prepend line number to error message if found
          if (lineNumber !== null) {
            errorMessage = `Error in line ${lineNumber}: ${errorMessage}`;
          }
          
          ws.send(JSON.stringify({
            type: 'error',
            message: errorMessage
          }));
          return;
        }

        // Convert and stream commands
        const turtleCommands = convertLogoCommands(logoCommands);
        
        turtleCommands.forEach((cmd, index) => {
          setTimeout(() => {
            ws.send(JSON.stringify(cmd));
          }, index * 10); // Small delay for animation
        });

        // Send completion signal
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'complete' }));
        }, turtleCommands.length * 10);
      });
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Initialize file storage and start server
fileManager.initializeFileStorage().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Logo Web IDE Backend running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws/execute`);
    console.log(`📁 File storage initialized`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

