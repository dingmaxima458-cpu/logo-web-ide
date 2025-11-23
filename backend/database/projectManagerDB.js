/**
 * Database-backed Project Manager
 * Uses Supabase for metadata storage, filesystem for file content
 */

import { getSupabaseForUser } from './supabase.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECTS_BASE_DIR = path.join(__dirname, '..', 'projects');

/**
 * Ensure projects directory exists
 */
export async function initializeProjectStorage() {
  try {
    await fs.mkdir(PROJECTS_BASE_DIR, { recursive: true });
    console.log('✅ File storage initialized at:', PROJECTS_BASE_DIR);
  } catch (error) {
    console.error('Failed to initialize file storage:', error);
    throw error;
  }
}

/**
 * Get project directory path
 */
function getProjectDir(projectId) {
  return path.join(PROJECTS_BASE_DIR, projectId);
}

/**
 * Get file path
 */
function getFilePath(projectId, filePath) {
  return path.join(PROJECTS_BASE_DIR, projectId, 'files', filePath);
}

// ============================================================================
// PROJECTS
// ============================================================================

/**
 * List all projects for a user
 */
export async function listProjects(userId, accessToken) {
  const supabase = getSupabaseForUser(accessToken);
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to list projects: ${error.message}`);
  }
  
  // Get file counts for each project
  const projectsWithCounts = await Promise.all(
    data.map(async (project) => {
      const { count } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id);
      
      return {
        ...project,
        fileCount: count || 0
      };
    })
  );
  
  return projectsWithCounts;
}

/**
 * Get project by ID
 */
export async function getProject(projectId, userId, accessToken, includeFiles = false) {
  const supabase = getSupabaseForUser(accessToken);
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  
  if (error) {
    throw new Error(`Failed to get project: ${error.message}`);
  }
  
  if (includeFiles) {
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId);
    
    if (filesError) {
      throw new Error(`Failed to get project files: ${filesError.message}`);
    }
    
    data.files = files;
  }
  
  return data;
}

/**
 * Create a new project
 */
export async function createProject(userId, accessToken, projectData) {
  const supabase = getSupabaseForUser(accessToken);
  
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: projectData.name,
      description: projectData.description || null
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }
  
  // Create project directory
  const projectDir = getProjectDir(data.id);
  await fs.mkdir(path.join(projectDir, 'files'), { recursive: true });
  
  return data;
}

/**
 * Update project
 */
export async function updateProject(projectId, userId, accessToken, updates) {
  const supabase = getSupabaseForUser(accessToken);
  
  const { data, error } = await supabase
    .from('projects')
    .update({
      name: updates.name,
      description: updates.description
    })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update project: ${error.message}`);
  }
  
  return data;
}

/**
 * Delete project
 */
export async function deleteProject(projectId, userId, accessToken) {
  const supabase = getSupabaseForUser(accessToken);
  
  // Delete from database (will cascade to files due to FK constraint)
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Failed to delete project: ${error.message}`);
  }
  
  // Delete project directory
  const projectDir = getProjectDir(projectId);
  try {
    await fs.rm(projectDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Failed to delete project directory ${projectDir}:`, err);
  }
  
  return { success: true };
}

// ============================================================================
// FILES
// ============================================================================

/**
 * List files in a project
 */
export async function listFiles(projectId, userId, accessToken) {
  const supabase = getSupabaseForUser(accessToken);
  
  // Verify project ownership
  await getProject(projectId, userId, accessToken);
  
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('project_id', projectId)
    .order('path');
  
  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }
  
  return data;
}

/**
 * Get file by ID
 */
export async function getFile(fileId, projectId, userId, accessToken) {
  const supabase = getSupabaseForUser(accessToken);
  
  // Verify project ownership
  await getProject(projectId, userId, accessToken);
  
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .eq('project_id', projectId)
    .single();
  
  if (error) {
    throw new Error(`Failed to get file: ${error.message}`);
  }
  
  // Read file content from filesystem
  const filePath = getFilePath(projectId, data.path);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    data.content = content;
  } catch (err) {
    if (err.code === 'ENOENT') {
      data.content = '';
    } else {
      throw err;
    }
  }
  
  return data;
}

/**
 * Create a new file
 */
export async function createFile(userId, accessToken, fileData) {
  const supabase = getSupabaseForUser(accessToken);
  
  // Verify project ownership
  await getProject(fileData.projectId, userId, accessToken);
  
  const content = fileData.content || '';
  const lineCount = content.split('\n').length;
  
  const { data, error } = await supabase
    .from('files')
    .insert({
      project_id: fileData.projectId,
      name: fileData.name,
      path: fileData.path,
      language: fileData.language || 'logo',
      line_count: lineCount
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create file: ${error.message}`);
  }
  
  // Write file content to filesystem
  const filePath = getFilePath(fileData.projectId, data.path);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
  
  data.content = content;
  return data;
}

/**
 * Update file
 */
export async function updateFile(fileId, projectId, userId, accessToken, updates) {
  const supabase = getSupabaseForUser(accessToken);
  
  // Verify project ownership
  await getProject(projectId, userId, accessToken);
  
  // Get current file info
  const currentFile = await getFile(fileId, projectId, userId, accessToken);
  
  const updateData = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.path !== undefined) updateData.path = updates.path;
  if (updates.language !== undefined) updateData.language = updates.language;
  
  // If content is being updated, calculate line count
  if (updates.content !== undefined) {
    updateData.line_count = updates.content.split('\n').length;
  }
  
  const { data, error } = await supabase
    .from('files')
    .update(updateData)
    .eq('id', fileId)
    .eq('project_id', projectId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update file: ${error.message}`);
  }
  
  // Handle file content update
  if (updates.content !== undefined) {
    const filePath = getFilePath(projectId, data.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, updates.content, 'utf-8');
    data.content = updates.content;
  }
  
  // Handle file path rename (move file on filesystem)
  if (updates.path && updates.path !== currentFile.path) {
    const oldPath = getFilePath(projectId, currentFile.path);
    const newPath = getFilePath(projectId, updates.path);
    
    try {
      await fs.mkdir(path.dirname(newPath), { recursive: true });
      await fs.rename(oldPath, newPath);
    } catch (err) {
      console.warn('Failed to move file on filesystem:', err);
    }
  }
  
  return data;
}

/**
 * Delete file
 */
export async function deleteFile(fileId, projectId, userId, accessToken) {
  const supabase = getSupabaseForUser(accessToken);
  
  // Verify project ownership and get file info
  const file = await getFile(fileId, projectId, userId, accessToken);
  
  // Delete from database
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)
    .eq('project_id', projectId);
  
  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
  
  // Delete file from filesystem
  const filePath = getFilePath(projectId, file.path);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    console.warn(`Failed to delete file ${filePath}:`, err);
  }
  
  return { success: true };
}

