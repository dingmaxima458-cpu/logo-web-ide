/**
 * Projects API Routes (v1) - Database-backed with Auth
 */

import express from 'express';
import * as projectManagerDB from '../../database/projectManagerDB.js';
import { successResponse, errorResponse, ErrorCodes } from '../../utils/responseFormatter.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * List projects for the authenticated user
 * GET /api/v1/projects
 */
router.get('/', async (req, res, next) => {
  try {
    const projects = await projectManagerDB.listProjects(req.user.id, req.accessToken);
    res.json(successResponse(projects, projects.length));
  } catch (error) {
    next(error);
  }
});

/**
 * Get project by ID
 * GET /api/v1/projects/:id?includeFiles=true
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const includeFiles = req.query.includeFiles === 'true';
    
    const project = await projectManagerDB.getProject(id, req.user.id, req.accessToken, includeFiles);
    res.json(successResponse(project));
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('0 rows')) {
      return res.status(404).json(errorResponse('Project not found', ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Create project
 * POST /api/v1/projects
 * Body: { name, description? }
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json(
        errorResponse('Project name is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const project = await projectManagerDB.createProject(req.user.id, req.accessToken, {
      name: name.trim(),
      description: description?.trim() || ''
    });
    
    res.status(201).json(successResponse(project));
  } catch (error) {
    next(error);
  }
});

/**
 * Update project
 * PUT /api/v1/projects/:id
 * Body: { name?, description? }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json(
          errorResponse('Project name must be a non-empty string', ErrorCodes.VALIDATION_ERROR)
        );
      }
      updates.name = name.trim();
    }
    if (description !== undefined) {
      updates.description = description?.trim() || '';
    }
    
    const project = await projectManagerDB.updateProject(id, req.user.id, req.accessToken, updates);
    res.json(successResponse(project));
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('0 rows')) {
      return res.status(404).json(errorResponse('Project not found', ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Delete project
 * DELETE /api/v1/projects/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await projectManagerDB.deleteProject(id, req.user.id, req.accessToken);
    res.json(successResponse({ success: true }));
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('0 rows')) {
      return res.status(404).json(errorResponse('Project not found', ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

export default router;
