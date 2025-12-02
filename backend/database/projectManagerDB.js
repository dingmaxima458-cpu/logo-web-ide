/**
 * Database-backed Project Manager with Supabase Storage
 * Uses Supabase for metadata + file content storage
 * Local filesystem only used as temporary cache during active sessions
 */

import { getSupabaseAdmin } from './supabase.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Temporary cache directory for active sessions
const CACHE_DIR = path.join(__dirname, '..', '.cache', 'files');
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'project-files';

/**
 * Ensure cache directory exists
 */
export async function initializeProjectStorage() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    console.log('✅ File cache initialized at:', CACHE_DIR);
    console.log('📦 Using Supabase Storage bucket:', STORAGE_BUCKET);
  } catch (error) {
    console.error('Failed to initialize file cache:', error);
    throw error;
  }
}

/**
 * Get storage path for Supabase Storage
 * Format: {userId}/{projectId}/{filePath}
 */
function getStoragePath(userId, projectId, filePath) {
  // Remove leading slash if present
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  return `${userId}/${projectId}/${cleanPath}`;
}

/**
 * Get local cache path for temporary storage
 */
function getCachePath(userId, projectId, filePath) {
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  return path.join(CACHE_DIR, userId, projectId, cleanPath);
}

/**
 * Download file from Supabase Storage to local cache
 */
async function downloadToCache(supabase, storagePath, cachePath) {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);
    
    if (error) {
      // File doesn't exist in storage yet (new file)
      return null;
    }
    
    // Ensure cache directory exists
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    
    // Write to cache
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(cachePath, buffer);
    
    return buffer.toString('utf-8');
  } catch (error) {
    console.warn('Failed to download from storage:', error);
    return null;
  }
}

/**
 * Upload file from cache to Supabase Storage (async, fire-and-forget)
 * This is for eventual consistency across devices/sessions
 */
async function uploadFromCache(supabase, cachePath, storagePath) {
  try {
    const content = await fs.readFile(cachePath, 'utf-8');
    const blob = new Blob([content], { type: 'text/plain' });
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, blob, {
        upsert: true,
        contentType: 'text/plain'
      });
    
    if (error) {
      console.warn(`[Storage] Async upload failed (non-blocking): ${error.message}`);
      // Don't throw - this is async for eventual consistency
    }
    
    return true;
  } catch (error) {
    console.warn('[Storage] Async upload error (non-blocking):', error.message);
    // Don't throw - this is async for eventual consistency
    return false;
  }
}

/**
 * Upload file from cache to Supabase Storage (async, fire-and-forget)
 * Returns immediately without waiting for upload
 */
function uploadFromCacheAsync(supabase, cachePath, storagePath) {
  // Fire and forget - don't await
  uploadFromCache(supabase, cachePath, storagePath).catch(err => {
    console.warn('[Storage] Background upload failed:', err.message);
  });
}

/**
 * Delete file from Supabase Storage
 */
async function deleteFromStorage(supabase, storagePath) {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);
    
    if (error) {
      console.warn('Failed to delete from storage:', error);
    }
  } catch (error) {
    console.warn('Failed to delete from storage:', error);
  }
}

/**
 * Clear local cache for a file
 */
async function clearCache(cachePath) {
  try {
    await fs.unlink(cachePath);
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

// ============================================================================
// PROJECTS
// ============================================================================

/**
 * List all projects for a user
 */
export async function listProjects(userId) {
  const supabase = getSupabaseAdmin();
  
  console.log('[ProjectManagerDB] Querying projects for user:', userId);
  console.log('[ProjectManagerDB] userId type:', typeof userId);
  console.log('[ProjectManagerDB] Using admin client:', supabase ? 'YES' : 'NO');
  
  // First, try to get ALL projects to see if admin client works at all
  const { data: allData, error: allError } = await supabase
    .from('projects')
    .select('*')
    .limit(5);
  
  console.log('[ProjectManagerDB] ALL projects query (no filter):', { 
    dataLength: allData?.length, 
    error: allError?.message,
    data: allData 
  });
  
  // Now try with user_id filter
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  
  console.log('[ProjectManagerDB] Filtered query result:', { 
    dataLength: data?.length, 
    error: error?.message,
    data: data 
  });
  
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
  
  console.log('[ProjectManagerDB] Returning projects:', projectsWithCounts.length);
  
  return projectsWithCounts;
}

/**
 * Get project by ID
 */
export async function getProject(projectId, userId, includeFiles = false) {
  const supabase = getSupabaseAdmin();
  
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
export async function createProject(userId, projectData) {
  const supabase = getSupabaseAdmin();
  
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
  
  // No need to create filesystem directories - using Supabase Storage
  return data;
}

/**
 * Update project
 */
export async function updateProject(projectId, userId, updates) {
  const supabase = getSupabaseAdmin();
  
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
export async function deleteProject(projectId, userId) {
  const supabase = getSupabaseAdmin();
  
  // Get all files in project to delete from storage
  const { data: files } = await supabase
    .from('files')
    .select('storage_path')
    .eq('project_id', projectId);
  
  // Delete files from Supabase Storage
  if (files && files.length > 0) {
    const storagePaths = files.map(f => f.storage_path).filter(Boolean);
    if (storagePaths.length > 0) {
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(storagePaths);
    }
  }
  
  // Delete from database (will cascade to files due to FK constraint)
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Failed to delete project: ${error.message}`);
  }
  
  // Clear local cache
  const cacheDir = path.join(CACHE_DIR, userId, projectId);
  try {
    await fs.rm(cacheDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore cache cleanup errors
  }
  
  return { success: true };
}

// ============================================================================
// FILES
// ============================================================================

/**
 * List files in a project
 */
export async function listFiles(projectId, userId) {
  const supabase = getSupabaseAdmin();
  
  // Verify project ownership
  await getProject(projectId, userId);
  
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
 * Always prioritizes local cache (source of truth for active sessions)
 * Only falls back to Supabase Storage if cache miss (for cross-device/session sync)
 */
export async function getFile(fileId, projectId, userId) {
  const supabase = getSupabaseAdmin();
  
  // Verify project ownership
  await getProject(projectId, userId);
  
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .eq('project_id', projectId)
    .single();
  
  if (error) {
    throw new Error(`Failed to get file: ${error.message}`);
  }
  
  // ALWAYS try cache first (local cache is source of truth for active sessions)
  const cachePath = getCachePath(userId, projectId, data.path);
  let content = null;
  
  try {
    content = await fs.readFile(cachePath, 'utf-8');
  } catch (err) {
    // Cache miss - download from Supabase Storage (for cross-device/session sync)
    if (data.storage_path) {
      content = await downloadToCache(supabase, data.storage_path, cachePath);
    }
  }
  
  data.content = content || '';
  return data;
}

/**
 * Create a new file
 */
export async function createFile(userId, fileData) {
  const supabase = getSupabaseAdmin();
  
  // Verify project ownership
  await getProject(fileData.projectId, userId);
  
  const content = fileData.content || '';
  const lineCount = content.split('\n').length;
  const storagePath = getStoragePath(userId, fileData.projectId, fileData.path);
  
  const { data, error } = await supabase
    .from('files')
    .insert({
      project_id: fileData.projectId,
      name: fileData.name,
      path: fileData.path,
      language: fileData.language || 'logo',
      line_count: lineCount,
      storage_path: storagePath
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create file: ${error.message}`);
  }
  
  // Write to local cache first (source of truth for active sessions)
  const cachePath = getCachePath(userId, fileData.projectId, data.path);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, content, 'utf-8');
  
  // Async upload to Supabase Storage (for eventual consistency across devices/sessions)
  uploadFromCacheAsync(supabase, cachePath, storagePath);
  
  data.content = content;
  return data;
}

/**
 * Update file
 */
export async function updateFile(fileId, projectId, userId, updates) {
  const supabase = getSupabaseAdmin();
  
  // Verify project ownership
  await getProject(projectId, userId);
  
  // Get current file info
  const currentFile = await getFile(fileId, projectId, userId);
  
  const updateData = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.path !== undefined) {
    updateData.path = updates.path;
    updateData.storage_path = getStoragePath(userId, projectId, updates.path);
  }
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
    // Write to cache first (source of truth for active sessions)
    const cachePath = getCachePath(userId, projectId, data.path);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, updates.content, 'utf-8');
    
    // Async upload to Supabase Storage (for eventual consistency across devices/sessions)
    uploadFromCacheAsync(supabase, cachePath, data.storage_path);
    
    data.content = updates.content;
  }
  
  // Handle file path rename (move in storage)
  if (updates.path && updates.path !== currentFile.path) {
    const oldCachePath = getCachePath(userId, projectId, currentFile.path);
    const newCachePath = getCachePath(userId, projectId, updates.path);
    
    // Move in cache if exists
    try {
      await fs.mkdir(path.dirname(newCachePath), { recursive: true });
      await fs.rename(oldCachePath, newCachePath);
    } catch (err) {
      // If not in cache, download from old location
      if (currentFile.storage_path) {
        const content = await downloadToCache(supabase, currentFile.storage_path, newCachePath);
        if (content) {
          await uploadFromCache(supabase, newCachePath, data.storage_path);
        }
      }
    }
    
    // Delete old file from storage
    if (currentFile.storage_path) {
      await deleteFromStorage(supabase, currentFile.storage_path);
    }
  }
  
  return data;
}

/**
 * Delete file
 */
export async function deleteFile(fileId, projectId, userId) {
  const supabase = getSupabaseAdmin();
  
  // Verify project ownership and get file info
  const file = await getFile(fileId, projectId, userId);
  
  // Delete from Supabase Storage
  if (file.storage_path) {
    await deleteFromStorage(supabase, file.storage_path);
  }
  
  // Delete from database
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)
    .eq('project_id', projectId);
  
  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
  
  // Clear from cache
  const cachePath = getCachePath(userId, projectId, file.path);
  await clearCache(cachePath);
  
  return { success: true };
}

