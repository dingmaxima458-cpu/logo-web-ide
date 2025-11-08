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
import { SHAPE_COMMANDS } from './shapeCommands.js';

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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[Server] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[Server] Request body keys:', Object.keys(req.body));
  }
  next();
});

// Expand simple extended command calls to inline Logo code
// Complex commands (STAMPOVAL, STAMPCIRCLE, etc.) still need procedure definitions
function expandExtendedCommands(code) {
  let expanded = code;
  
  // Expand SQUARE :size -> REPEAT 4 [FD :size RT 90]
  expanded = expanded.replace(/\bSQUARE\s+(\S+)/gi, (match, size) => {
    return `REPEAT 4 [FD ${size} RT 90]`;
  });
  
  // Expand RECTANGLE :width :height
  expanded = expanded.replace(/\bRECTANGLE\s+(\S+)\s+(\S+)/gi, (match, width, height) => {
    return `REPEAT 2 [FD ${width} RT 90 FD ${height} RT 90]`;
  });
  
  // Expand TRIANGLE :size -> REPEAT 3 [FD :size RT 120]
  expanded = expanded.replace(/\bTRIANGLE\s+(\S+)/gi, (match, size) => {
    return `REPEAT 3 [FD ${size} RT 120]`;
  });
  
  // Expand CIRCLE :radius (approximate with many small steps)
  expanded = expanded.replace(/\bCIRCLE\s+(\S+)/gi, (match, radius) => {
    // Use a fixed number of steps for smooth circle
    return `REPEAT 60 [FD ${radius} * 6.28318 / 60 RT 6]`;
  });
  
  // For complex commands (STAMPOVAL, STAMPCIRCLE, STAMPSQUARE, OVAL), we need procedures
  // Check if any of these are used
  const needsProcedures = /\b(STAMPOVAL|STAMPCIRCLE|STAMPSQUARE|OVAL)\s+[0-9]/i.test(expanded);
  
  if (needsProcedures) {
    // Prepend procedure definitions, but structure code to force execution
    // The trick: wrap user code in a way that ensures it executes
    expanded = SHAPE_COMMANDS + '\n' + expanded;
    // Add a dummy command at the end to force execution context
    // Actually, let's try a different approach - execute in two stages won't work
    // So we'll keep the procedures but ensure execution by checking the result
  }
  
  return expanded;
}

// Fully expand ALL extended commands inline (fallback when procedure approach fails)
function fullyExpandExtendedCommands(code) {
  let expanded = code;
  
  // Expand all commands inline with simplified implementations
  expanded = expanded.replace(/\bSQUARE\s+(\S+)/gi, (match, size) => {
    return `REPEAT 4 [FD ${size} RT 90]`;
  });
  
  expanded = expanded.replace(/\bRECTANGLE\s+(\S+)\s+(\S+)/gi, (match, width, height) => {
    return `REPEAT 2 [FD ${width} RT 90 FD ${height} RT 90]`;
  });
  
  expanded = expanded.replace(/\bTRIANGLE\s+(\S+)/gi, (match, size) => {
    return `REPEAT 3 [FD ${size} RT 120]`;
  });
  
  expanded = expanded.replace(/\bCIRCLE\s+(\S+)/gi, (match, radius) => {
    return `REPEAT 60 [FD ${radius} * 6.28318 / 60 RT 6]`;
  });
  
  // Simplified OVAL (ellipse approximation using basic Logo commands)
  // Draws a SINGLE oval outline
  expanded = expanded.replace(/\bOVAL\s+(\S+)\s+(\S+)/gi, (match, width, height) => {
    const w = parseFloat(width) || 10;
    const h = parseFloat(height) || 10;
    const steps = 60; // Number of steps for smooth oval
    const stepAngle = 360 / steps;
    let result = '';
    for (let i = 0; i < steps; i++) {
      const angle = (i * stepAngle) * Math.PI / 180;
      // Ellipse parametric form: calculate distance for this angle
      const dist = Math.sqrt(w * w * Math.cos(angle) * Math.cos(angle) + h * h * Math.sin(angle) * Math.sin(angle));
      // Calculate step size based on arc length
      const nextAngle = ((i + 1) * stepAngle) * Math.PI / 180;
      const nextDist = Math.sqrt(w * w * Math.cos(nextAngle) * Math.cos(nextAngle) + h * h * Math.sin(nextAngle) * Math.sin(nextAngle));
      // Approximate step distance
      const stepDist = (dist + nextDist) / 2 * (stepAngle * Math.PI / 180);
      result += `FD ${stepDist.toFixed(3)} RT ${stepAngle} `;
    }
    return result.trim();
  });
  
  // STAMPOVAL draws a SINGLE oval (according to Terrapin Logo spec)
  // Syntax: STAMPOVAL xradius yradius
  // The filled version uses: (STAMPOVAL xradius yradius "TRUE)
  // For now, we'll implement the basic outline version
  expanded = expanded.replace(/\bSTAMPOVAL\s+(\S+)\s+(\S+)/gi, (match, xradius, yradius) => {
    const w = parseFloat(xradius) || 10;
    const h = parseFloat(yradius) || 10;
    // Draw a single oval outline - same as OVAL
    const steps = 60; // Number of steps for smooth oval
    const stepAngle = 360 / steps;
    let result = '';
    for (let i = 0; i < steps; i++) {
      const angle = (i * stepAngle) * Math.PI / 180;
      // Ellipse parametric form: calculate distance for this angle
      const dist = Math.sqrt(w * w * Math.cos(angle) * Math.cos(angle) + h * h * Math.sin(angle) * Math.sin(angle));
      // Calculate step size based on arc length
      const nextAngle = ((i + 1) * stepAngle) * Math.PI / 180;
      const nextDist = Math.sqrt(w * w * Math.cos(nextAngle) * Math.cos(nextAngle) + h * h * Math.sin(nextAngle) * Math.sin(nextAngle));
      // Approximate step distance
      const stepDist = (dist + nextDist) / 2 * (stepAngle * Math.PI / 180);
      result += `FD ${stepDist.toFixed(3)} RT ${stepAngle} `;
    }
    return result.trim();
  });
  
  // Simplified STAMPCIRCLE (draw multiple circles)
  expanded = expanded.replace(/\bSTAMPCIRCLE\s+(\S+)/gi, (match, radius) => {
    const r = parseFloat(radius) || 10;
    let result = '';
    for (let i = 0; i < r; i++) {
      const currentR = r - i;
      if (currentR > 0) {
        result += `REPEAT 60 [FD ${currentR} * 6.28318 / 60 RT 6] `;
      }
    }
    return result.trim();
  });
  
  // Simplified STAMPSQUARE
  expanded = expanded.replace(/\bSTAMPSQUARE\s+(\S+)/gi, (match, size) => {
    const s = parseFloat(size) || 10;
    let result = '';
    for (let i = 0; i < s; i++) {
      const currentSize = s - i * 2;
      if (currentSize > 0) {
        result += `REPEAT 4 [FD ${currentSize} RT 90] `;
      }
    }
    return result.trim();
  });
  
  return expanded;
}

// Convert Logo commands to turtle graphics format
function convertLogoCommands(logoCommands) {
  console.log('[convertLogoCommands] Input:', JSON.stringify(logoCommands, null, 2));
  const turtleCommands = [];
  let x = 0, y = 0, angle = 90; // Logo convention: start facing up
  let penDown = true;

  if (logoCommands && Array.isArray(logoCommands)) {
    console.log('[convertLogoCommands] Processing', logoCommands.length, 'commands');
    logoCommands.forEach((cmd, index) => {
      console.log(`[convertLogoCommands] Command ${index}:`, JSON.stringify(cmd));
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
      // Handle setposition/setxy command: {"setposition": [x, y]}
      else if (cmd.setposition && Array.isArray(cmd.setposition) && cmd.setposition.length >= 2) {
        x = cmd.setposition[0];
        y = cmd.setposition[1];
        turtleCommands.push({
          type: 'move',
          x: x,
          y: y,
          penDown: penDown
        });
      }
      // Handle setheading/seth command: {"setheading": [angle]}
      else if (cmd.setheading && Array.isArray(cmd.setheading) && cmd.setheading.length > 0) {
        angle = cmd.setheading[0];
        turtleCommands.push({
          type: 'turn',
          angle: angle
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
      else {
        console.log(`[convertLogoCommands] Unhandled command type:`, Object.keys(cmd));
      }
    });
  } else {
    console.log('[convertLogoCommands] logoCommands is not an array:', typeof logoCommands, logoCommands);
  }

  console.log('[convertLogoCommands] Returning', turtleCommands.length, 'turtle commands');
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
  console.log('[Server] /api/execute endpoint hit');
  console.log('[Server] Request body:', {
    hasFileId: !!req.body.fileId,
    hasCode: !!req.body.code,
    codeLength: req.body.code?.length || 0,
    reset: req.body.reset,
    codePreview: req.body.code?.substring(0, 100) || 'N/A'
  });
  
  try {
    const { fileId, code, reset = true } = req.body;
    
    let codeToExecute = code;
    let fileInfo = null;
    
    // If fileId is provided, load the file
    if (fileId) {
      console.log('[Server] Loading file with ID:', fileId);
      fileInfo = await fileManager.loadFile(fileId);
      codeToExecute = fileInfo.content;
      console.log('[Server] File loaded, content length:', codeToExecute.length);
    }
    
    // Fallback: code must be provided if no fileId
    if (!codeToExecute || typeof codeToExecute !== 'string') {
      console.error('[Server] Error: No code provided');
      return res.status(400).json({
        success: false,
        error: 'Either fileId or code must be provided',
        commands: []
      });
    }
    
    console.log('[Server] Code to execute (length):', codeToExecute.length);
    console.log('[Server] Code to execute (first 200 chars):', codeToExecute.substring(0, 200));

    // Check if user code actually CALLS extended shape commands (not just mentions them)
    // Remove comments and check for actual command calls (not procedure definitions)
    const codeWithoutComments = codeToExecute
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith(';') && !trimmed.startsWith('TO ') && trimmed.length > 0;
      })
      .join('\n');
    
    // Check for actual command calls (not procedure definitions)
    // Look for patterns like "SQUARE 50" or "CIRCLE 100" (command with argument)
    const usesExtendedCommands = /\b(STAMPOVAL|STAMPCIRCLE|STAMPSQUARE|CIRCLE|SQUARE|RECTANGLE|TRIANGLE|OVAL)\s+[0-9]/i.test(codeWithoutComments);
    console.log('[Server] Uses extended commands:', usesExtendedCommands);
    console.log('[Server] Code without comments (first 200 chars):', codeWithoutComments.substring(0, 200));
    
    // IMPORTANT: The logo package has a bug where it doesn't execute commands after procedure definitions
    // Solution: Instead of prepending procedure definitions, we'll expand extended command calls inline
    let codeToConvert = codeToExecute;
    if (usesExtendedCommands) {
      console.log('[Server] Expanding extended commands inline...');
      // Expand extended command calls to their basic Logo equivalents
      codeToConvert = expandExtendedCommands(codeToExecute);
      console.log('[Server] Expanded code length:', codeToConvert.length);
    } else {
      console.log('[Server] Not using extended commands, executing code directly');
    }

    console.log('[Server] Code to convert length:', codeToConvert.length);
    console.log('[Server] Code to convert preview (first 500 chars):', codeToConvert.substring(0, 500));
    console.log('[Server] Calling logo.convert()...');
    // Convert Logo code using the logo package
    logo.convert(codeToConvert, (err, logoCommands) => {
      if (err) {
        console.error('[Server] logo.convert() error:', err);
        console.error('[Server] Error message:', err.toString());
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
        
        console.log('[Server] Sending error response');
        return res.json({
          success: false,
          error: errorMessage,
          commands: [],
          output: ''
        });
      }

      console.log('[Server] logo.convert() successful');
      console.log('[Server] Logo commands received:', logoCommands?.length || 0);
      console.log('[Server] Logo commands structure:', JSON.stringify(logoCommands, null, 2));
      
      // Check if logo.convert() only returned begin/end markers (bug when procedures are defined)
      const onlyMarkers = logoCommands && logoCommands.length === 2 && 
        logoCommands[0].begin && logoCommands[1].end;
      
      if (onlyMarkers && usesExtendedCommands) {
        console.log('[Server] Detected logo package bug - only begin/end returned');
        console.log('[Server] Falling back to inline expansion of all extended commands...');
        
        // Fallback: expand ALL extended commands inline (including complex ones)
        // Use original code, not the already-expanded version
        const fullyExpanded = fullyExpandExtendedCommands(codeToExecute);
        console.log('[Server] Fully expanded code length:', fullyExpanded.length);
        
        // Try again with fully expanded code
        logo.convert(fullyExpanded, (err2, logoCommands2) => {
          if (err2) {
            console.error('[Server] logo.convert() error on retry:', err2);
            return res.json({
              success: false,
              error: err2.toString(),
              commands: [],
              output: ''
            });
          }
          
          console.log('[Server] Retry successful, commands:', logoCommands2?.length || 0);
          const turtleCommands = convertLogoCommands(logoCommands2);
          res.json({
            success: true,
            commands: turtleCommands,
            output: '',
            error: ''
          });
        });
        return; // Don't continue with original response
      }
      
      // Convert to turtle graphics format
      const turtleCommands = convertLogoCommands(logoCommands);
      console.log('[Server] Converted to turtle commands:', turtleCommands.length);
      console.log('[Server] First few commands:', turtleCommands.slice(0, 3));

      console.log('[Server] Sending success response');
      res.json({
        success: true,
        commands: turtleCommands,
        output: '',
        error: ''
      });
    });
  } catch (error) {
    console.error('[Server] Exception in /api/execute:', error);
    console.error('[Server] Error stack:', error.stack);
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

      // Check if user code actually CALLS extended shape commands (same logic as HTTP endpoint)
      const codeWithoutComments = code
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return !trimmed.startsWith(';') && !trimmed.startsWith('TO ') && trimmed.length > 0;
        })
        .join('\n');
      
      const usesExtendedCommands = /\b(STAMPOVAL|STAMPCIRCLE|STAMPSQUARE|CIRCLE|SQUARE|RECTANGLE|TRIANGLE|OVAL)\s+[0-9]/i.test(codeWithoutComments);
      
      // Only prepend shape commands if they're actually CALLED
      let codeToConvert = code;
      if (usesExtendedCommands) {
        codeToConvert = SHAPE_COMMANDS + '\n' + code;
      }
      
      // Convert Logo code
      logo.convert(codeToConvert, (err, logoCommands) => {
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
  // Listen on 0.0.0.0 to accept connections from any interface (needed for EC2)
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Logo Web IDE Backend running on http://0.0.0.0:${PORT}`);
    console.log(`📡 WebSocket available at ws://0.0.0.0:${PORT}/ws/execute`);
    console.log(`📁 File storage initialized`);
    console.log(`🌐 Accessible from external IPs (EC2 compatible)`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

