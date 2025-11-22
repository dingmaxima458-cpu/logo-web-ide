/**
 * Projects API Routes (v1)
 */

import express from 'express';
import * as projectManager from '../../projectManager.js';
import { parseQuery, applyFilters, applyOrder, applySelect, applyPagination } from '../../utils/queryParser.js';
import { successResponse, errorResponse, ErrorCodes } from '../../utils/responseFormatter.js';

const router = express.Router();

/**
 * List projects
 * GET /api/v1/projects?select=id,name&order=updatedAt.desc&limit=10
 */
router.get('/', async (req, res, next) => {
  try {
    const query = parseQuery(req.query);
    let projects = await projectManager.listProjects();
    
    // Apply filters
    projects = applyFilters(projects, query.filters);
    
    // Apply sorting
    projects = applyOrder(projects, query.order);
    
    // Get total count before pagination
    const totalCount = projects.length;
    
    // Apply pagination
    projects = applyPagination(projects, query.limit, query.offset);
    
    // Apply field selection
    projects = applySelect(projects, query.select);
    
    res.json(successResponse(projects, totalCount));
  } catch (error) {
    next(error);
  }
});

/**
 * Get project by ID
 * GET /api/v1/projects/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const includeFiles = req.query.includeFiles === 'true';
    
    const project = await projectManager.getProject(id, includeFiles);
    const query = parseQuery(req.query);
    
    // Apply field selection
    const selected = applySelect(project, query.select);
    
    res.json(successResponse(selected));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Create project
 * POST /api/v1/projects
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json(
        errorResponse('Project name is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const project = await projectManager.createProject(name, description || '');
    res.status(201).json(successResponse(project));
  } catch (error) {
    next(error);
  }
});

/**
 * Update project
 * PUT /api/v1/projects/:id
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
      updates.name = name;
    }
    if (description !== undefined) {
      updates.description = description;
    }
    
    const project = await projectManager.updateProject(id, updates);
    res.json(successResponse(project));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
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
    await projectManager.deleteProject(id);
    res.json(successResponse({ success: true }));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Duplicate project
 * POST /api/v1/projects/:id/duplicate
 */
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const project = await projectManager.duplicateProject(id, name);
    res.status(201).json(successResponse(project));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Export project
 * GET /api/v1/projects/:id/export
 */
router.get('/:id/export', async (req, res, next) => {
  try {
    const { id } = req.params;
    const exportData = await projectManager.exportProject(id);
    res.json(successResponse(exportData));
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(errorResponse(error.message, ErrorCodes.NOT_FOUND));
    }
    next(error);
  }
});

/**
 * Import project
 * POST /api/v1/projects/import
 */
router.post('/import', async (req, res, next) => {
  try {
    const { project, files } = req.body;
    
    if (!project || !project.name) {
      return res.status(400).json(
        errorResponse('Project name is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json(
        errorResponse('Files array is required', ErrorCodes.VALIDATION_ERROR)
      );
    }
    
    const importedProject = await projectManager.importProject({ project, files });
    res.status(201).json(successResponse(importedProject));
  } catch (error) {
    next(error);
  }
});

export default router;

