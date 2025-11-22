/**
 * Files API Routes (v1)
 */

import express from 'express';
import * as projectManager from '../../projectManager.js';
import { parseQuery, applyFilters, applyOrder, applySelect, applyPagination } from '../../utils/queryParser.js';
import { successResponse, errorResponse, ErrorCodes } from '../../utils/responseFormatter.js';

const router = express.Router();

/**
 * List files
 * GET /api/v1/files?projectId=proj_xxx&select=id,name&order=path.asc
 */
router.get('/', async (req, res, next) => {
  try {
    const query = parseQuery(req.query);
    
    // projectId filter is required for listing files
    if (!query.filters.projectId) {
      return res.status(400).json(
        errorResponse('projectId filter is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const projectId = query.filters.projectId.value;
    let files = await projectManager.listProjectFiles(projectId);
    
    // Remove projectId from filters (already applied)
    const otherFilters = { ...query.filters };
    delete otherFilters.projectId;
    
    // Apply other filters
    files = applyFilters(files, otherFilters);
    
    // Apply sorting
    files = applyOrder(files, query.order);
    
    // Get total count before pagination
    const totalCount = files.length;
    
    // Apply pagination
    files = applyPagination(files, query.limit, query.offset);
    
    // Apply field selection
    files = applySelect(files, query.select);
    
    res.json(successResponse(files, totalCount));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Get file by ID
 * GET /api/v1/files/:id?projectId=proj_xxx
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const projectId = req.query.projectId;
    
    if (!projectId) {
      return res.status(400).json(
        errorResponse('projectId query parameter is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const file = await projectManager.getFile(projectId, id);
    const query = parseQuery(req.query);
    
    // Apply field selection
    const selected = applySelect(file, query.select);
    
    res.json(successResponse(selected));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Create file
 * POST /api/v1/files
 */
router.post('/', async (req, res, next) => {
  try {
    const { projectId, name, path, content, language } = req.body;
    
    if (!projectId) {
      return res.status(400).json(
        errorResponse('projectId is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json(
        errorResponse('File name is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    if (!path || typeof path !== 'string' || path.trim().length === 0) {
      return res.status(400).json(
        errorResponse('File path is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const file = await projectManager.createFile(projectId, {
      name,
      path,
      content: content || '',
      language: language || 'logo'
    });
    
    res.status(201).json(successResponse(file));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Update file
 * PUT /api/v1/files/:id?projectId=proj_xxx
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const projectId = req.query.projectId;
    const { content, name, path, language } = req.body;
    
    if (!projectId) {
      return res.status(400).json(
        errorResponse('projectId query parameter is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const updates = {};
    if (content !== undefined) {
      updates.content = content;
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json(
          errorResponse('File name must be a non-empty string', ErrorCodes.VALIDATION_ERROR)
        );
      }
      updates.name = name;
    }
    if (path !== undefined) {
      updates.path = path;
    }
    if (language !== undefined) {
      updates.language = language;
    }
    
    const file = await projectManager.updateFile(projectId, id, updates);
    res.json(successResponse(file));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Delete file
 * DELETE /api/v1/files/:id?projectId=proj_xxx
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const projectId = req.query.projectId;
    
    if (!projectId) {
      return res.status(400).json(
        errorResponse('projectId query parameter is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    await projectManager.deleteFile(projectId, id);
    res.json(successResponse({ success: true }));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Rename file
 * PATCH /api/v1/files/:id/rename?projectId=proj_xxx
 */
router.patch('/:id/rename', async (req, res, next) => {
  try {
    const { id } = req.params;
    const projectId = req.query.projectId;
    const { name, path } = req.body;
    
    if (!projectId) {
      return res.status(400).json(
        errorResponse('projectId query parameter is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json(
        errorResponse('File name is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const updates = { name };
    if (path !== undefined) {
      updates.path = path;
    } else {
      updates.path = name; // Default path to name if not provided
    }
    
    const file = await projectManager.updateFile(projectId, id, updates);
    res.json(successResponse(file));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

export default router;

