/**
 * Project Manager for Logo Web IDE
 * Handles project storage, retrieval, and management using file-based storage
 * Structure: projects/{projectId}/project.json + projects/{projectId}/files/{fileId}.logo
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage directories
const PROJECTS_DIR = join(__dirname, 'projects');
const FILES_DIR_NAME = 'files';

/**
 * Initialize project storage directory
 */
export async function initializeProjectStorage() {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    console.log(`📁 Project storage initialized at: ${PROJECTS_DIR}`);
  } catch (error) {
    console.error('Failed to initialize project storage:', error);
    throw error;
  }
}

/**
 * Get project directory path
 */
function getProjectDir(projectId) {
  return join(PROJECTS_DIR, projectId);
}

/**
 * Get project metadata file path
 */
function getProjectMetaPath(projectId) {
  return join(getProjectDir(projectId), 'project.json');
}

/**
 * Get project files directory
 */
function getProjectFilesDir(projectId) {
  return join(getProjectDir(projectId), FILES_DIR_NAME);
}

/**
 * Get file path within project
 */
function getFilePath(projectId, fileId) {
  return join(getProjectFilesDir(projectId), `${fileId}.logo`);
}

/**
 * Create a new project
 * @param {string} name - Project name
 * @param {string} description - Project description (optional)
 * @returns {Promise<Project>}
 */
export async function createProject(name, description = '') {
  try {
    const projectId = `proj_${randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    
    const project = {
      id: projectId,
      name: name.trim(),
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
      fileCount: 0
    };
    
    // Create project directory
    const projectDir = getProjectDir(projectId);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(getProjectFilesDir(projectId), { recursive: true });
    
    // Save project metadata
    await fs.writeFile(
      getProjectMetaPath(projectId),
      JSON.stringify(project, null, 2),
      'utf8'
    );
    
    console.log(`✅ Created project: ${projectId} - ${name}`);
    return project;
  } catch (error) {
    console.error('Failed to create project:', error);
    throw error;
  }
}

/**
 * Get a project by ID
 * @param {string} projectId - Project ID
 * @param {boolean} includeFiles - Include file list in response
 * @returns {Promise<Project>}
 */
export async function getProject(projectId, includeFiles = false) {
  try {
    const metaPath = getProjectMetaPath(projectId);
    const metaContent = await fs.readFile(metaPath, 'utf8');
    const project = JSON.parse(metaContent);
    
    if (includeFiles) {
      const files = await listProjectFiles(projectId);
      project.files = files.map(f => ({
        id: f.id,
        name: f.name,
        path: f.path
      }));
    }
    
    // Update file count
    const files = await listProjectFiles(projectId);
    project.fileCount = files.length;
    
    return project;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Project not found: ${projectId}`);
    }
    console.error('Failed to get project:', error);
    throw error;
  }
}

/**
 * List all projects
 * @returns {Promise<Project[]>}
 */
export async function listProjects() {
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects = [];
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('proj_')) {
        try {
          const project = await getProject(entry.name, false);
          projects.push(project);
        } catch (error) {
          console.warn(`Failed to load project ${entry.name}:`, error);
        }
      }
    }
    
    // Sort by updatedAt (newest first)
    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    return projects;
  } catch (error) {
    console.error('Failed to list projects:', error);
    throw error;
  }
}

/**
 * Update project metadata
 * @param {string} projectId - Project ID
 * @param {object} updates - Fields to update
 * @returns {Promise<Project>}
 */
export async function updateProject(projectId, updates) {
  try {
    const project = await getProject(projectId);
    
    // Update allowed fields
    if (updates.name !== undefined) {
      project.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      project.description = updates.description.trim();
    }
    
    project.updatedAt = new Date().toISOString();
    
    // Save updated metadata
    await fs.writeFile(
      getProjectMetaPath(projectId),
      JSON.stringify(project, null, 2),
      'utf8'
    );
    
    return project;
  } catch (error) {
    console.error('Failed to update project:', error);
    throw error;
  }
}

/**
 * Delete a project
 * @param {string} projectId - Project ID
 */
export async function deleteProject(projectId) {
  try {
    const projectDir = getProjectDir(projectId);
    await fs.rm(projectDir, { recursive: true, force: true });
    console.log(`🗑️  Deleted project: ${projectId}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Project not found: ${projectId}`);
    }
    console.error('Failed to delete project:', error);
    throw error;
  }
}

/**
 * Duplicate a project
 * @param {string} projectId - Project ID to duplicate
 * @param {string} newName - Name for the duplicate (optional)
 * @returns {Promise<Project>}
 */
export async function duplicateProject(projectId, newName = null) {
  try {
    const sourceProject = await getProject(projectId, true);
    const sourceFiles = await listProjectFiles(projectId);
    
    // Create new project
    const duplicateName = newName || `Copy of ${sourceProject.name}`;
    const newProject = await createProject(duplicateName, sourceProject.description);
    
    // Copy all files
    for (const file of sourceFiles) {
      await createFile(newProject.id, {
        name: file.name,
        path: file.path,
        content: file.content,
        language: file.language || 'logo'
      });
    }
    
    return newProject;
  } catch (error) {
    console.error('Failed to duplicate project:', error);
    throw error;
  }
}

/**
 * List files in a project
 * @param {string} projectId - Project ID
 * @returns {Promise<File[]>}
 */
export async function listProjectFiles(projectId) {
  try {
    const filesDir = getProjectFilesDir(projectId);
    const entries = await fs.readdir(filesDir, { withFileTypes: true });
    const files = [];
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.logo')) {
        const fileId = entry.name.replace('.logo', '');
        try {
          const file = await getFile(projectId, fileId);
          files.push(file);
        } catch (error) {
          console.warn(`Failed to load file ${fileId}:`, error);
        }
      }
    }
    
    // Sort by path/name
    files.sort((a, b) => a.path.localeCompare(b.path));
    
    return files;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Project files directory doesn't exist yet, return empty array
      return [];
    }
    console.error('Failed to list project files:', error);
    throw error;
  }
}

/**
 * Create a file in a project
 * @param {string} projectId - Project ID
 * @param {object} fileData - File data
 * @returns {Promise<File>}
 */
export async function createFile(projectId, fileData) {
  try {
    const { name, path, content = '', language = 'logo' } = fileData;
    
    if (!name || !path) {
      throw new Error('File name and path are required');
    }
    
    // Ensure project exists
    await getProject(projectId);
    
    // Ensure files directory exists
    await fs.mkdir(getProjectFilesDir(projectId), { recursive: true });
    
    const fileId = `file_${randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    const lineCount = content.split('\n').length;
    
    const file = {
      id: fileId,
      projectId,
      name: name.trim(),
      path: path.trim(),
      content,
      language,
      lineCount,
      createdAt: now,
      updatedAt: now
    };
    
    // Save file
    await fs.writeFile(
      getFilePath(projectId, fileId),
      content,
      'utf8'
    );
    
    // Save file metadata
    const metaPath = getFilePath(projectId, fileId).replace('.logo', '.meta.json');
    await fs.writeFile(
      metaPath,
      JSON.stringify({
        id: fileId,
        projectId,
        name: file.name,
        path: file.path,
        language: file.language,
        lineCount: file.lineCount,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      }, null, 2),
      'utf8'
    );
    
    // Update project timestamp
    await updateProject(projectId, {});
    
    console.log(`✅ Created file: ${fileId} - ${name} in project ${projectId}`);
    return file;
  } catch (error) {
    console.error('Failed to create file:', error);
    throw error;
  }
}

/**
 * Get a file by ID
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @returns {Promise<File>}
 */
export async function getFile(projectId, fileId) {
  try {
    // Load metadata
    const metaPath = getFilePath(projectId, fileId).replace('.logo', '.meta.json');
    const metaContent = await fs.readFile(metaPath, 'utf8');
    const metadata = JSON.parse(metaContent);
    
    // Load content
    const filePath = getFilePath(projectId, fileId);
    const content = await fs.readFile(filePath, 'utf8');
    
    return {
      ...metadata,
      content
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${fileId}`);
    }
    console.error('Failed to get file:', error);
    throw error;
  }
}

/**
 * Update a file
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @param {object} updates - Fields to update
 * @returns {Promise<File>}
 */
export async function updateFile(projectId, fileId, updates) {
  try {
    const file = await getFile(projectId, fileId);
    
    // Update content if provided
    if (updates.content !== undefined) {
      file.content = updates.content;
      file.lineCount = updates.content.split('\n').length;
      
      // Save content
      await fs.writeFile(
        getFilePath(projectId, fileId),
        updates.content,
        'utf8'
      );
    }
    
    // Update name/path if provided
    if (updates.name !== undefined) {
      file.name = updates.name.trim();
    }
    if (updates.path !== undefined) {
      file.path = updates.path.trim();
    }
    if (updates.language !== undefined) {
      file.language = updates.language;
    }
    
    file.updatedAt = new Date().toISOString();
    
    // Save metadata
    const metaPath = getFilePath(projectId, fileId).replace('.logo', '.meta.json');
    await fs.writeFile(
      metaPath,
      JSON.stringify({
        id: file.id,
        projectId: file.projectId,
        name: file.name,
        path: file.path,
        language: file.language,
        lineCount: file.lineCount,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      }, null, 2),
      'utf8'
    );
    
    // Update project timestamp
    await updateProject(projectId, {});
    
    return file;
  } catch (error) {
    console.error('Failed to update file:', error);
    throw error;
  }
}

/**
 * Delete a file
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 */
export async function deleteFile(projectId, fileId) {
  try {
    const filePath = getFilePath(projectId, fileId);
    const metaPath = filePath.replace('.logo', '.meta.json');
    
    await fs.unlink(filePath);
    await fs.unlink(metaPath).catch(() => {}); // Ignore if meta doesn't exist
    
    // Update project timestamp
    await updateProject(projectId, {});
    
    console.log(`🗑️  Deleted file: ${fileId} from project ${projectId}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${fileId}`);
    }
    console.error('Failed to delete file:', error);
    throw error;
  }
}

/**
 * Export project (for backup/import)
 * @param {string} projectId - Project ID
 * @returns {Promise<object>}
 */
export async function exportProject(projectId) {
  try {
    const project = await getProject(projectId, false);
    const files = await listProjectFiles(projectId);
    
    return {
      project: {
        name: project.name,
        description: project.description
      },
      files: files.map(f => ({
        name: f.name,
        path: f.path,
        content: f.content,
        language: f.language
      }))
    };
  } catch (error) {
    console.error('Failed to export project:', error);
    throw error;
  }
}

/**
 * Import project
 * @param {object} projectData - Project data from export
 * @returns {Promise<Project>}
 */
export async function importProject(projectData) {
  try {
    const { project, files } = projectData;
    
    // Create new project
    const newProject = await createProject(project.name, project.description || '');
    
    // Import files
    for (const fileData of files) {
      await createFile(newProject.id, fileData);
    }
    
    return newProject;
  } catch (error) {
    console.error('Failed to import project:', error);
    throw error;
  }
}

