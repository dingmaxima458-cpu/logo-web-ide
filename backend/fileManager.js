/**
 * File Manager for Logo Web IDE
 * Handles file storage, retrieval, and management
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File storage directory (relative to backend/)
const FILES_DIR = join(__dirname, 'files');

// In-memory file cache (for quick access)
const fileCache = new Map();

/**
 * Initialize file storage directory
 */
export async function initializeFileStorage() {
  try {
    await fs.mkdir(FILES_DIR, { recursive: true });
    console.log(`📁 File storage initialized at: ${FILES_DIR}`);
  } catch (error) {
    console.error('Failed to initialize file storage:', error);
    throw error;
  }
}

/**
 * Save a file
 * @param {string} filename - Name of the file
 * @param {string} content - File content
 * @returns {Promise<{id: string, filename: string, content: string, lineCount: number}>}
 */
export async function saveFile(filename, content) {
  try {
    // Generate unique ID from filename + timestamp
    const id = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const filePath = join(FILES_DIR, `${id}.logo`);
    
    // Save to filesystem
    await fs.writeFile(filePath, content, 'utf8');
    
    // Calculate line count
    const lineCount = content.split('\n').length;
    
    // Store in cache
    const fileInfo = {
      id,
      filename,
      content,
      lineCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    fileCache.set(id, fileInfo);
    
    return fileInfo;
  } catch (error) {
    console.error('Failed to save file:', error);
    throw error;
  }
}

/**
 * Load a file by ID
 * @param {string} id - File ID
 * @returns {Promise<{id: string, filename: string, content: string, lineCount: number}>}
 */
export async function loadFile(id) {
  try {
    // Check cache first
    if (fileCache.has(id)) {
      return fileCache.get(id);
    }
    
    // Load from filesystem
    const filePath = join(FILES_DIR, `${id}.logo`);
    const content = await fs.readFile(filePath, 'utf8');
    
    // Extract filename from metadata or use ID
    const filename = id.split('-').slice(1).join('-').replace(/_/g, ' ') || `file-${id}`;
    const lineCount = content.split('\n').length;
    
    const fileInfo = {
      id,
      filename,
      content,
      lineCount,
      updatedAt: new Date().toISOString()
    };
    
    // Cache it
    fileCache.set(id, fileInfo);
    
    return fileInfo;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${id}`);
    }
    console.error('Failed to load file:', error);
    throw error;
  }
}

/**
 * List all files
 * @returns {Promise<Array<{id: string, filename: string, lineCount: number, updatedAt: string}>>}
 */
export async function listFiles() {
  try {
    const files = await fs.readdir(FILES_DIR);
    const fileList = [];
    
    for (const file of files) {
      if (file.endsWith('.logo')) {
        const id = file.replace('.logo', '');
        try {
          const fileInfo = await loadFile(id);
          fileList.push({
            id: fileInfo.id,
            filename: fileInfo.filename,
            lineCount: fileInfo.lineCount,
            updatedAt: fileInfo.updatedAt
          });
        } catch (error) {
          console.warn(`Failed to load file ${id}:`, error);
        }
      }
    }
    
    // Sort by updatedAt (newest first)
    fileList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    return fileList;
  } catch (error) {
    console.error('Failed to list files:', error);
    throw error;
  }
}

/**
 * Delete a file
 * @param {string} id - File ID
 */
export async function deleteFile(id) {
  try {
    const filePath = join(FILES_DIR, `${id}.logo`);
    await fs.unlink(filePath);
    fileCache.delete(id);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${id}`);
    }
    console.error('Failed to delete file:', error);
    throw error;
  }
}

/**
 * Update a file
 * @param {string} id - File ID
 * @param {string} content - New content
 * @returns {Promise<{id: string, filename: string, content: string, lineCount: number}>}
 */
export async function updateFile(id, content) {
  try {
    const existing = await loadFile(id);
    const filePath = join(FILES_DIR, `${id}.logo`);
    
    await fs.writeFile(filePath, content, 'utf8');
    
    const lineCount = content.split('\n').length;
    const fileInfo = {
      ...existing,
      content,
      lineCount,
      updatedAt: new Date().toISOString()
    };
    
    fileCache.set(id, fileInfo);
    
    return fileInfo;
  } catch (error) {
    console.error('Failed to update file:', error);
    throw error;
  }
}

