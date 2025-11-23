/**
 * Execute API Routes (v1) - Database-backed with Optional Auth
 * Handles Logo code execution
 */

import express from 'express';
import * as projectManagerDB from '../../database/projectManagerDB.js';
import { successResponse, errorResponse, ErrorCodes } from '../../utils/responseFormatter.js';
import { optionalAuthMiddleware } from '../../middleware/auth.js';
import { SHAPE_COMMANDS } from '../../shapeCommands.js';

const router = express.Router();

// Optional auth - allows both authenticated and anonymous execution
router.use(optionalAuthMiddleware);

// logo package uses CommonJS, so we need to use createRequire
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const logo = require('logo');

/**
 * Expand extended commands inline
 */
function expandExtendedCommands(code) {
  let expanded = code;
  
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
  
  expanded = expanded.replace(/\bSTAMPRECT\s+(\S+)\s+(\S+)/gi, (match, width, height) => {
    return `REPEAT 2 [FD ${width} RT 90 FD ${height} RT 90]`;
  });
  
  const needsProcedures = /\b(STAMPOVAL|STAMPCIRCLE|STAMPSQUARE|OVAL)\s+[0-9]/i.test(expanded);
  if (needsProcedures) {
    expanded = SHAPE_COMMANDS + '\n' + expanded;
  }
  
  return expanded;
}

/**
 * Fully expand all extended commands inline
 */
function fullyExpandExtendedCommands(code) {
  let expanded = code;
  
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
  
  // OVAL and STAMPOVAL
  expanded = expanded.replace(/\b(OVAL|STAMPOVAL)\s+(\S+)\s+(\S+)/gi, (match, cmd, xradius, yradius) => {
    const w = parseFloat(xradius) || 10;
    const h = parseFloat(yradius) || 10;
    const steps = 60;
    const stepAngle = 360 / steps;
    let result = '';
    for (let i = 0; i < steps; i++) {
      const angle = (i * stepAngle) * Math.PI / 180;
      const dist = Math.sqrt(w * w * Math.cos(angle) * Math.cos(angle) + h * h * Math.sin(angle) * Math.sin(angle));
      const nextAngle = ((i + 1) * stepAngle) * Math.PI / 180;
      const nextDist = Math.sqrt(w * w * Math.cos(nextAngle) * Math.cos(nextAngle) + h * h * Math.sin(nextAngle) * Math.sin(nextAngle));
      const stepDist = (dist + nextDist) / 2 * (stepAngle * Math.PI / 180);
      result += `FD ${stepDist.toFixed(3)} RT ${stepAngle} `;
    }
    return result.trim();
  });
  
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
  
  expanded = expanded.replace(/\bSTAMPRECT\s+(\S+)\s+(\S+)/gi, (match, width, height) => {
    const w = parseFloat(width) || 10;
    const h = parseFloat(height) || 10;
    const numRects = Math.min(Math.floor(Math.max(w, h) / 3), 5);
    let result = '';
    for (let i = 0; i < numRects; i++) {
      const scale = 1 - (i / (numRects + 1));
      const w2 = w * scale;
      const h2 = h * scale;
      if (w2 > 0.5 && h2 > 0.5) {
        result += `REPEAT 2 [FD ${w2.toFixed(2)} RT 90 FD ${h2.toFixed(2)} RT 90] `;
      }
    }
    return result.trim();
  });
  
  return expanded;
}

/**
 * Convert Logo commands to turtle graphics format
 */
function convertLogoCommands(logoCommands) {
  const turtleCommands = [];
  let x = 0, y = 0, angle = 90;
  let penDown = true;

  if (logoCommands && Array.isArray(logoCommands)) {
    logoCommands.forEach((cmd) => {
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
      else if (cmd.turn && Array.isArray(cmd.turn) && cmd.turn.length > 0) {
        const turnAngle = cmd.turn[0];
        angle -= turnAngle;
        turtleCommands.push({
          type: 'turn',
          angle: angle
        });
      }
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
      else if (cmd.setheading && Array.isArray(cmd.setheading) && cmd.setheading.length > 0) {
        angle = cmd.setheading[0];
        turtleCommands.push({
          type: 'turn',
          angle: angle
        });
      }
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
      else if (cmd.setcolor && Array.isArray(cmd.setcolor) && cmd.setcolor.length > 0) {
        const colorValue = cmd.setcolor[0];
        const colorNum = parseFloat(colorValue);
        let r, g, b;
        
        if (!isNaN(colorNum) && colorNum >= 0 && colorNum <= 15) {
          const colorPalette = [
            [0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 255, 0],
            [0, 0, 255], [255, 255, 0], [255, 0, 255], [0, 255, 255],
            [128, 128, 128], [128, 0, 0], [0, 128, 0], [0, 0, 128],
            [128, 128, 0], [128, 0, 128], [0, 128, 128], [192, 192, 192]
          ];
          const rgb = colorPalette[Math.floor(colorNum)] || [0, 0, 0];
          r = rgb[0];
          g = rgb[1];
          b = rgb[2];
        } else {
          const val = Math.max(0, Math.min(255, Math.floor(colorNum)));
          r = g = b = val;
        }
        
        turtleCommands.push({
          type: 'color',
          r: r,
          g: g,
          b: b
        });
      }
      else if (cmd.setwidth && Array.isArray(cmd.setwidth) && cmd.setwidth.length > 0) {
        const width = parseFloat(cmd.setwidth[0]) || 1;
        turtleCommands.push({
          type: 'width',
          width: Math.max(1, Math.min(99, width))
        });
      }
    });
  }

  return turtleCommands;
}

/**
 * Execute Logo code
 * POST /api/v1/execute
 * Body: { code?, fileId?, projectId?, reset? }
 * 
 * - If fileId+projectId provided: load code from database (requires auth)
 * - Otherwise: execute provided code directly (no auth needed)
 */
router.post('/', async (req, res, next) => {
  try {
    const { fileId, code, reset = true, projectId } = req.body;
    
    let codeToExecute = code;
    let fileInfo = null;
    
    // If fileId is provided, load the file from database
    if (fileId && projectId) {
      if (!req.user) {
        return res.status(401).json(
          errorResponse('Authentication required to execute saved files', ErrorCodes.UNAUTHORIZED)
        );
      }
      
      try {
        fileInfo = await projectManagerDB.getFile(fileId, projectId, req.user.id, req.accessToken);
        codeToExecute = fileInfo.content;
      } catch (error) {
        return res.status(404).json(
          errorResponse(`File not found: ${fileId}`, ErrorCodes.NOT_FOUND)
        );
      }
    }
    
    // Fallback: code must be provided if no fileId
    if (!codeToExecute || typeof codeToExecute !== 'string') {
      return res.status(400).json(
        errorResponse('Either fileId+projectId or code must be provided', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    // Check if user code uses extended commands
    const codeWithoutComments = codeToExecute
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith(';') && !trimmed.startsWith('TO ') && trimmed.length > 0;
      })
      .join('\n');
    
    const usesExtendedCommands = /\b(STAMPOVAL|STAMPCIRCLE|STAMPSQUARE|STAMPRECT|CIRCLE|SQUARE|RECTANGLE|TRIANGLE|OVAL)\s+[0-9]/i.test(codeWithoutComments);
    
    let codeToConvert = codeToExecute;
    if (usesExtendedCommands) {
      codeToConvert = expandExtendedCommands(codeToExecute);
    }
    
    // Convert Logo code using the logo package
    return new Promise((resolve) => {
      logo.convert(codeToConvert, (err, logoCommands) => {
        if (err) {
          let errorMessage = err.toString();
          
          // Try to find line number information
          const codeLines = codeToExecute.split('\n');
          let lineNumber = null;
          
          const unknownCmdMatch = errorMessage.match(/Don't know how to (\w+)/i);
          if (unknownCmdMatch) {
            const unknownCmd = unknownCmdMatch[1];
            for (let i = 0; i < codeLines.length; i++) {
              if (new RegExp(`\\b${unknownCmd}\\b`, 'i').test(codeLines[i])) {
                lineNumber = i + 1;
                break;
              }
            }
          }
          
          if (errorMessage.includes("Expected ']'") && lineNumber === null) {
            for (let i = codeLines.length - 1; i >= 0; i--) {
              if (codeLines[i].includes('[') && !codeLines[i].includes(']')) {
                lineNumber = i + 1;
                break;
              }
            }
          }
          
          if (errorMessage.includes("Unexpected end") && lineNumber === null) {
            lineNumber = codeLines.length;
          }
          
          if (lineNumber !== null) {
            errorMessage = `Error in line ${lineNumber}: ${errorMessage}`;
          }
          
          return res.json(successResponse({
            success: false,
            commands: [],
            output: '',
            error: errorMessage
          }));
        }
        
        // Check if logo.convert() only returned begin/end markers
        const onlyMarkers = logoCommands && logoCommands.length === 2 && 
          logoCommands[0].begin && logoCommands[1].end;
        
        if (onlyMarkers && usesExtendedCommands) {
          // Fallback: expand ALL extended commands inline
          const fullyExpanded = fullyExpandExtendedCommands(codeToExecute);
          
          logo.convert(fullyExpanded, (err2, logoCommands2) => {
            if (err2) {
              return res.json(successResponse({
                success: false,
                commands: [],
                output: '',
                error: err2.toString()
              }));
            }
            
            const turtleCommands = convertLogoCommands(logoCommands2);
            res.json(successResponse({
              success: true,
              commands: turtleCommands,
              output: '',
              error: ''
            }));
            resolve();
          });
          return;
        }
        
        const turtleCommands = convertLogoCommands(logoCommands);
        res.json(successResponse({
          success: true,
          commands: turtleCommands,
          output: '',
          error: ''
        }));
        resolve();
      });
    });
  } catch (error) {
    next(error);
  }
});

export default router;
