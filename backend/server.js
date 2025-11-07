/**
 * Logo Web IDE Backend Server
 * Node.js/Express server with Logo interpreter integration
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { createRequire } from 'module';

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
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
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

// Execute Logo code endpoint
app.post('/api/execute', async (req, res) => {
  try {
    const { code, reset = true } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Code is required and must be a string',
        commands: []
      });
    }

    // Convert Logo code using the logo package
    logo.convert(code, (err, logoCommands) => {
      if (err) {
        return res.json({
          success: false,
          error: err.toString(),
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
          ws.send(JSON.stringify({
            type: 'error',
            message: err.toString()
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

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Logo Web IDE Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws/execute`);
});

