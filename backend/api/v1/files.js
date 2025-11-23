/**
 * Files API Routes (v1) - Database-backed with Auth
 */

import express from 'express';
import * as projectManagerDB from '../../database/projectManagerDB.js';
import { successResponse, errorResponse, ErrorCodes } from '../../utils/responseFormatter.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * List files in a project
 * GET /api/v1/files?projectId=xxx
 */
router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json(
        errorResponse('projectId query parameter is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const files = await projectManagerDB.listFiles(projectId, req.user.id, req.accessToken);
    res.json(successResponse(files, files.length));
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('0 rows')) {
      return res.status(404).json(errorResponse('Project not found', ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Get file by ID
 * GET /api/v1/files/:id?projectId=xxx
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json(
        errorResponse('projectId query parameter is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const file = await projectManagerDB.getFile(id, projectId, req.user.id, req.accessToken);
    res.json(successResponse(file));
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('0 rows')) {
      return res.status(404).json(errorResponse('File not found', ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Create file
 * POST /api/v1/files
 * Body: { projectId, name, path, content?, language? }
 */
router.post('/', async (req, res, next) => {
  try {
    const { projectId, name, path, content, language } = req.body;
    
    if (!projectId || !name || !path) {
      return res.status(400).json(
        errorResponse('projectId, name, and path are required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const file = await projectManagerDB.createFile(req.user.id, req.accessToken, {
      projectId,
      name: name.trim(),
      path: path.trim(),
      content: content || '',
      language: language || 'logo'
    });
    
    res.status(201).json(successResponse(file));
  } catch (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json(
        errorResponse('File with this path already exists', ErrorCodes.DUPLICATE)
      );
    }
    if (error.message.includes('not found') || error.message.includes('0 rows')) {
      return res.status(404).json(errorResponse('Project not found', ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Update file
 * PUT /api/v1/files/:id?projectId=xxx
 * Body: { content?, name?, path?, language? }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;
    const { content, name, path, language } = req.body;
    
    if (!projectId) {
      return res.status(400).json(
        errorResponse('projectId query parameter is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const updates = {};
    if (content !== undefined) updates.content = content;
    if (name !== undefined) updates.name = name.trim();
    if (path !== undefined) updates.path = path.trim();
    if (language !== undefined) updates.language = language;
    
    const file = await projectManagerDB.updateFile(id, projectId, req.user.id, req.accessToken, updates);
    res.json(successResponse(file));
  } catch (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json(
        errorResponse('File with this path already exists', ErrorCodes.DUPLICATE)
      );
    }
    if (error.message.includes('not found') || error.message.includes('0 rows')) {
      return res.status(404).json(errorResponse('File not found', ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Delete file
 * DELETE /api/v1/files/:id?projectId=xxx
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json(
        errorResponse('projectId query parameter is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    await projectManagerDB.deleteFile(id, projectId, req.user.id, req.accessToken);
    res.json(successResponse({ success: true }));
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('0 rows')) {
      return res.status(404).json(errorResponse('File not found', ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Rename file (deprecated - use PUT instead)
 * PATCH /api/v1/files/:id/rename?projectId=xxx
 * Body: { name, path? }
 */
router.patch('/:id/rename', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { projectId } = req.query;
    const { name, path } = req.body;
    
    if (!projectId) {
      return res.status(400).json(
        errorResponse('projectId query parameter is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    if (!name) {
      return res.status(400).json(
        errorResponse('name is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const updates = { name: name.trim() };
    if (path !== undefined) updates.path = path.trim();
    
    const file = await projectManagerDB.updateFile(id, projectId, req.user.id, req.accessToken, updates);
    res.json(successResponse(file));
  } catch (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(409).json(
        errorResponse('File with this path already exists', ErrorCodes.DUPLICATE)
      );
    }
    if (error.message.includes('not found') || error.message.includes('0 rows')) {
      return res.status(404).json(errorResponse('File not found', ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

export default router;
