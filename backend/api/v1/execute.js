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
 * Normalize pen commands - convert "pen up" to "penup" and "pen down" to "pendown"
 * This ensures the logo package can properly parse these commands
 */
function normalizePenCommands(code) {
  let normalized = code;
  
  // Replace "pen up" (case-insensitive) with "penup"
  normalized = normalized.replace(/\bpen\s+up\b/gi, 'penup');
  
  // Replace "pen down" (case-insensitive) with "pendown"
  normalized = normalized.replace(/\bpen\s+down\b/gi, 'pendown');
  
  return normalized;
}

/**
 * Normalize movement commands - convert full words to standard Logo abbreviations
 * This ensures the logo package can properly parse these commands
 */
function normalizeMovementCommands(code) {
  let normalized = code;
  
  // Replace "backward" or "back" with "BK" (Logo standard)
  normalized = normalized.replace(/\bbackward\s+(\S+)/gi, 'BK $1');
  normalized = normalized.replace(/\bback\s+(\S+)/gi, 'BK $1');
  
  // Replace "forward" with "FD" (Logo standard)
  normalized = normalized.replace(/\bforward\s+(\S+)/gi, 'FD $1');
  
  // Replace "right" with "RT" (Logo standard)
  normalized = normalized.replace(/\bright\s+(\S+)/gi, 'RT $1');
  
  // Replace "left" with "LT" (Logo standard)
  normalized = normalized.replace(/\bleft\s+(\S+)/gi, 'LT $1');
  
  return normalized;
}

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
  
  const needsProcedures = /\b(STAMPOVAL|STAMPCIRCLE|STAMPSQUARE|OVAL|ARC|POLYGON|SPIRAL|STAR)\s+[0-9]/i.test(expanded);
  if (needsProcedures) {
    expanded = SHAPE_COMMANDS + '\n' + expanded;
  }
  
  return expanded;
}

/**
 * Expand user-defined procedures inline (recursively)
 * This works around the logo package bug where it doesn't execute commands after procedure definitions
 * Handles nested/recursive procedure calls by expanding multiple passes
 */
function expandUserProcedures(code) {
  const lines = code.split('\n');
  const procedures = new Map(); // procedure name -> { params: [], body: [] }
  const executionCode = [];
  let inProcedure = false;
  let currentProcedure = null;
  let currentProcedureBody = [];
  
  // First pass: extract all procedure definitions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const upperTrimmed = trimmed.toUpperCase();
    
    if (upperTrimmed.startsWith('TO ')) {
      // Start of procedure definition
      if (currentProcedure) {
        // Save previous procedure
        procedures.set(currentProcedure.name, {
          params: currentProcedure.params,
          body: currentProcedureBody
        });
      }
      
      // Parse procedure name and parameters
      const match = trimmed.match(/^TO\s+(\w+)(?:\s+(.+))?$/i);
      if (match) {
        const procName = match[1].toUpperCase();
        const paramStr = match[2] || '';
        const params = paramStr.split(/\s+/).filter(p => p.startsWith(':')).map(p => p.substring(1).toUpperCase());
        
        currentProcedure = { name: procName, params };
        currentProcedureBody = [];
        inProcedure = true;
      }
    } else if (upperTrimmed === 'END' && inProcedure) {
      // End of procedure definition
      if (currentProcedure) {
        procedures.set(currentProcedure.name, {
          params: currentProcedure.params,
          body: currentProcedureBody
        });
        currentProcedure = null;
        currentProcedureBody = [];
      }
      inProcedure = false;
    } else if (inProcedure) {
      // Inside procedure body
      currentProcedureBody.push(line);
    } else {
      // Execution code
      executionCode.push(line);
    }
  }
  
  // If we ended while still in a procedure, save it
  if (currentProcedure) {
    procedures.set(currentProcedure.name, {
      params: currentProcedure.params,
      body: currentProcedureBody
    });
  }
  
  // If no procedures, return original code
  if (procedures.size === 0) {
    return code;
  }
  
  // Function to expand a single procedure call
  function expandProcedureCall(line, procName, procDef, args) {
    // Expand the procedure call
    let expandedBody = procDef.body.join('\n');
    
    // Replace parameters with actual arguments
    // In Logo, parameters are defined with :param but referenced as param (without colon) in the body
    for (let i = 0; i < procDef.params.length && i < args.length; i++) {
      const paramName = procDef.params[i]; // e.g., "SIZE" (already uppercase, no colon)
      const argValue = args[i]; // e.g., "50"
      
      // Replace :param (parameter definition) - though this shouldn't appear in body
      const paramWithColonRegex = new RegExp(`:${paramName}\\b`, 'gi');
      expandedBody = expandedBody.replace(paramWithColonRegex, argValue);
      
      // Replace param (variable reference in body) - this is the main case
      // In Logo, parameters are referenced without colon: "size" not ":size"
      // Need to replace whole words only, case-insensitive
      const paramRegex = new RegExp(`\\b${paramName}\\b`, 'gi');
      
      // Split by lines to handle context-aware replacement
      const bodyLines = expandedBody.split('\n');
      const replacedLines = bodyLines.map(bodyLine => {
        // Skip comment lines
        const trimmed = bodyLine.trim();
        if (trimmed.startsWith(';')) {
          return bodyLine;
        }
        
        // Replace parameter references (whole word only, case-insensitive)
        // This handles "size", "SIZE", "Size" all being replaced with the argument value
        return bodyLine.replace(paramRegex, (match) => {
          // Preserve case of first letter if it's uppercase
          if (match[0] === match[0].toUpperCase()) {
            return argValue.charAt(0).toUpperCase() + argValue.slice(1);
          }
          return argValue;
        });
      });
      
      expandedBody = replacedLines.join('\n');
    }
    
    return expandedBody;
  }
  
  // Function to recursively expand all procedure calls in text (works on full text, not just lines)
  function expandRecursively(text, maxDepth = 10) {
    if (maxDepth <= 0) {
      return text; // Prevent infinite recursion
    }
    
    let result = text;
    let changed = true;
    let iterations = 0;
    
    // Keep expanding until no more procedure calls found
    while (changed && iterations < 50) {
      changed = false;
      iterations++;
      
      // Try to expand each procedure call
      for (const [procName, procDef] of procedures.entries()) {
        // Match procedure call: PROCNAME arg1 arg2 ...
        // Handle both "SQ 50" and "SQ size" (where size might be a variable)
        const regex = new RegExp(`\\b${procName}\\s+([^\\n\\[\\]]*)`, 'gi');
        let match;
        
        // Find all matches (process in reverse to preserve indices)
        const matches = [];
        while ((match = regex.exec(result)) !== null) {
          matches.push({
            fullMatch: match[0],
            argsStr: match[1].trim(),
            index: match.index
          });
        }
        
        // Process matches in reverse order (to preserve string indices)
        for (let i = matches.length - 1; i >= 0; i--) {
          const m = matches[i];
          const args = m.argsStr.split(/\s+/).filter(a => a.length > 0);
          
          // Expand this procedure call
          const expanded = expandProcedureCall(result, procName, procDef, args);
          
          // Replace the procedure call with expanded body
          const before = result.substring(0, m.index);
          const after = result.substring(m.index + m.fullMatch.length);
          result = before + expanded + after;
          changed = true;
        }
      }
    }
    
    return result;
  }
  
  // Expand procedure calls in execution code (recursively, on full text)
  const executionText = executionCode.join('\n');
  const result = expandRecursively(executionText);
  
  return result;
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
  
  // ARC - partial circle (angle in degrees, e.g., 180 = semicircle)
  expanded = expanded.replace(/\bARC\s+(\S+)\s+(\S+)/gi, (match, radius, angle) => {
    const r = parseFloat(radius) || 10;
    const a = parseFloat(angle) || 90;
    const steps = Math.max(1, Math.floor(Math.abs(a) / 6));
    const stepAngle = a / steps;
    const circumference = r * 2 * Math.PI;
    const arcLength = circumference * (Math.abs(a) / 360);
    const stepDist = arcLength / steps;
    let result = '';
    for (let i = 0; i < steps; i++) {
      result += `FD ${stepDist.toFixed(3)} RT ${stepAngle.toFixed(2)} `;
    }
    return result.trim();
  });
  
  // POLYGON - n-sided regular polygon
  expanded = expanded.replace(/\bPOLYGON\s+(\S+)\s+(\S+)/gi, (match, sides, size) => {
    const s = parseFloat(sides) || 4;
    const sz = parseFloat(size) || 50;
    const angle = 360 / s;
    let result = '';
    for (let i = 0; i < s; i++) {
      result += `FD ${sz} RT ${angle} `;
    }
    return result.trim();
  });
  
  // SPIRAL - spiral pattern
  expanded = expanded.replace(/\bSPIRAL\s+(\S+)\s+(\S+)/gi, (match, turns, radius) => {
    const t = parseFloat(turns) || 2;
    const r = parseFloat(radius) || 50;
    const totalSteps = Math.floor(t * 60);
    const stepRadius = r / totalSteps;
    let result = '';
    for (let i = 1; i <= totalSteps; i++) {
      const currentRadius = stepRadius * i;
      const stepDist = (currentRadius * 2 * Math.PI) / 60;
      result += `FD ${stepDist.toFixed(3)} RT 6 `;
    }
    return result.trim();
  });
  
  // STAR - star shape
  expanded = expanded.replace(/\bSTAR\s+(\S+)\s+(\S+)/gi, (match, points, size) => {
    const p = parseFloat(points) || 5;
    const sz = parseFloat(size) || 50;
    const angle = 360 / p;
    const turnAngle = 180 - angle;
    let result = '';
    for (let i = 0; i < p; i++) {
      result += `FD ${sz} RT ${turnAngle} `;
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
      // CRITICAL: Process pen commands FIRST before movement commands
      // This ensures pen state is correct when movement occurs
      if (cmd.penup || cmd.pu) {
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
      // Then process movement commands (which depend on pen state)
      else if (cmd.move && Array.isArray(cmd.move) && cmd.move.length > 0) {
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
        fileInfo = await projectManagerDB.getFile(fileId, projectId, req.user.id);
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
    
    const usesExtendedCommands = /\b(STAMPOVAL|STAMPCIRCLE|STAMPSQUARE|STAMPRECT|CIRCLE|SQUARE|RECTANGLE|TRIANGLE|OVAL|ARC|POLYGON|SPIRAL|STAR)\s+[0-9]/i.test(codeWithoutComments);
    
    // Check if user has defined their own procedures (TO ... END)
    const hasUserProcedures = /\bTO\s+\w+/i.test(codeToExecute);
    
    // Normalize commands first (convert "pen up" to "penup", "backward" to "BK", etc.)
    let codeToConvert = normalizePenCommands(codeToExecute);
    codeToConvert = normalizeMovementCommands(codeToConvert);
    
    // Expand user-defined procedures FIRST (before extended commands)
    // This works around the logo package bug where it doesn't execute after procedure definitions
    if (hasUserProcedures) {
      codeToConvert = expandUserProcedures(codeToConvert);
    }
    
    // Then handle extended commands
    if (usesExtendedCommands) {
      codeToConvert = expandExtendedCommands(codeToConvert);
    }
    
    // Normalize commands again after expansions (in case expansions introduced them)
    codeToConvert = normalizePenCommands(codeToConvert);
    codeToConvert = normalizeMovementCommands(codeToConvert);
    
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
        // This happens when the logo package bug occurs: procedures are defined but commands after them don't execute
        const onlyMarkers = logoCommands && logoCommands.length === 2 && 
          logoCommands[0].begin && logoCommands[1].end;
        
        if (onlyMarkers) {
          // The logo package has a bug where it doesn't execute commands after procedure definitions
          // If we have user procedures OR extended commands, we need to handle this
          if (hasUserProcedures || usesExtendedCommands) {
            // For extended commands, try full expansion
            if (usesExtendedCommands) {
              let fullyExpanded = normalizePenCommands(fullyExpandExtendedCommands(codeToExecute));
              fullyExpanded = normalizeMovementCommands(fullyExpanded);
              
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
            } else {
              // For user-defined procedures only, we need to restructure the code
              // Split procedures from execution code, then combine them properly
              const lines = codeToExecute.split('\n');
              const procedures = [];
              const executionCode = [];
              let inProcedure = false;
              let currentProcedure = [];
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.toUpperCase().startsWith('TO ')) {
                  if (currentProcedure.length > 0) {
                    procedures.push(currentProcedure.join('\n'));
                  }
                  currentProcedure = [line];
                  inProcedure = true;
                } else if (trimmed.toUpperCase() === 'END' && inProcedure) {
                  currentProcedure.push(line);
                  procedures.push(currentProcedure.join('\n'));
                  currentProcedure = [];
                  inProcedure = false;
                } else if (inProcedure) {
                  currentProcedure.push(line);
                } else {
                  executionCode.push(line);
                }
              }
              
              // Reconstruct: procedures first, then execution code
              let restructuredCode = normalizePenCommands(procedures.join('\n\n') + '\n\n' + executionCode.join('\n'));
              restructuredCode = normalizeMovementCommands(restructuredCode);
              
              // Try again with restructured code
              logo.convert(restructuredCode, (err2, logoCommands2) => {
                if (err2) {
                  return res.json(successResponse({
                    success: false,
                    commands: [],
                    output: '',
                    error: `Failed to execute user-defined procedures: ${err2.toString()}`
                  }));
                }
                
                // Check again if we still only get markers
                const stillOnlyMarkers = logoCommands2 && logoCommands2.length === 2 && 
                  logoCommands2[0].begin && logoCommands2[1].end;
                
                if (stillOnlyMarkers) {
                  // Last resort: expand user procedures inline
                  let expandedWithProcedures = normalizePenCommands(expandUserProcedures(codeToExecute));
                  expandedWithProcedures = normalizeMovementCommands(expandedWithProcedures);
                  
                  logo.convert(expandedWithProcedures, (err3, logoCommands3) => {
                    if (err3) {
                      return res.json(successResponse({
                        success: false,
                        commands: [],
                        output: '',
                        error: `Failed to execute procedures: ${err3.toString()}`
                      }));
                    }
                    
                    const turtleCommands = convertLogoCommands(logoCommands3);
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
          }
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
