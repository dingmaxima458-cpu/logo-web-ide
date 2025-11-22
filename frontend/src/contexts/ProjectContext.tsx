/**
 * Project Context - Manages projects and files state
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectsApi, filesApi, Project, File } from '../services/api-v1';

interface ProjectContextType {
  // Projects
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  
  // Files
  files: File[];
  currentFile: File | null;
  openFiles: File[];
  unsavedFiles: Set<string>; // File IDs with unsaved changes
  
  // Project actions
  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  selectProject: (projectId: string) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // File actions
  loadFiles: (projectId: string) => Promise<void>;
  createFile: (name: string, path: string, content?: string) => Promise<File>;
  selectFile: (fileId: string) => Promise<void>;
  updateFile: (fileId: string, content: string) => void; // In-memory update, not async
  saveFile: (fileId: string, content?: string) => Promise<void>; // Optional content to save directly
  deleteFile: (fileId: string) => Promise<void>;
  closeFile: (fileId: string) => void;
  
  // Utility
  markFileUnsaved: (fileId: string) => void;
  clearError: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [openFiles, setOpenFiles] = useState<File[]>([]);
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all projects
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const projectList = await projectsApi.list({ order: 'updatedAt.desc' });
      setProjects(projectList);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new project
  const createProject = useCallback(async (name: string, description?: string) => {
    try {
      setError(null);
      const project = await projectsApi.create({ name, description });
      setProjects(prev => [project, ...prev]);
      return project;
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
      throw err;
    }
  }, []);

  // Select project
  const selectProject = useCallback(async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);
      const project = await projectsApi.get(projectId);
      setCurrentProject(project);
      await loadFiles(projectId);
      // Clear current file and open files when switching projects
      setCurrentFile(null);
      setOpenFiles([]);
      setUnsavedFiles(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
      console.error('Failed to select project:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update project
  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      setError(null);
      const updated = await projectsApi.update(id, updates);
      setProjects(prev => prev.map(p => p.id === id ? updated : p));
      if (currentProject?.id === id) {
        setCurrentProject(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
      throw err;
    }
  }, [currentProject]);

  // Delete project
  const deleteProject = useCallback(async (id: string) => {
    try {
      setError(null);
      await projectsApi.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProject?.id === id) {
        setCurrentProject(null);
        setFiles([]);
        setCurrentFile(null);
        setOpenFiles([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
      throw err;
    }
  }, [currentProject]);

  // Load files for a project
  const loadFiles = useCallback(async (projectId: string) => {
    try {
      setError(null);
      const fileList = await filesApi.list(projectId, { order: 'path.asc' });
      setFiles(fileList);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
      console.error('Failed to load files:', err);
    }
  }, []);

  // Create new file
  const createFile = useCallback(async (name: string, path: string, content = '') => {
    if (!currentProject) {
      throw new Error('No project selected');
    }
    try {
      setError(null);
      const file = await filesApi.create({
        projectId: currentProject.id,
        name,
        path,
        content,
        language: 'logo'
      });
      setFiles(prev => [...prev, file]);
      // Open the new file
      await selectFile(file.id);
      return file;
    } catch (err: any) {
      setError(err.message || 'Failed to create file');
      throw err;
    }
  }, [currentProject]);

  // Select file (load and open)
  const selectFile = useCallback(async (fileId: string) => {
    if (!currentProject) {
      throw new Error('No project selected');
    }
    try {
      setError(null);
      // Check if file is already open
      const existingFile = openFiles.find(f => f.id === fileId);
      if (existingFile) {
        setCurrentFile(existingFile);
        return;
      }
      
      // Load file from API
      const file = await filesApi.get(currentProject.id, fileId);
      setCurrentFile(file);
      
      // Add to open files if not already there
      setOpenFiles(prev => {
        if (prev.find(f => f.id === fileId)) {
          return prev;
        }
        return [...prev, file];
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load file');
      console.error('Failed to select file:', err);
    }
  }, [currentProject, openFiles]);

  // Update file content (in-memory, marks as unsaved)
  const updateFile = useCallback((fileId: string, content: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, content, lineCount: content.split('\n').length } : f
    ));
    setOpenFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, content, lineCount: content.split('\n').length } : f
    ));
    if (currentFile?.id === fileId) {
      setCurrentFile(prev => prev ? { ...prev, content, lineCount: content.split('\n').length } : null);
    }
    markFileUnsaved(fileId);
  }, [currentFile]);

  // Save file to backend
  const saveFile = useCallback(async (fileId: string, contentToSave?: string) => {
    if (!currentProject) {
      throw new Error('No project selected');
    }
    
    // Use provided content, or get from state
    let content = contentToSave;
    if (content === undefined) {
      const file = openFiles.find(f => f.id === fileId) || files.find(f => f.id === fileId);
      if (!file) {
        throw new Error('File not found');
      }
      content = file.content || '';
    }
    
    try {
      setError(null);
      // Save to backend with the content
      const updated = await filesApi.update(currentProject.id, fileId, {
        content: content
      });
      
      // Update all state with the saved version from backend
      setFiles(prev => prev.map(f => f.id === fileId ? updated : f));
      setOpenFiles(prev => prev.map(f => f.id === fileId ? updated : f));
      
      // Update currentFile to sync with backend
      if (currentFile?.id === fileId) {
        setCurrentFile(updated);
      }
      
      // Remove from unsaved
      setUnsavedFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save file');
      throw err;
    }
  }, [currentProject, openFiles, files, currentFile]);

  // Delete file
  const deleteFile = useCallback(async (fileId: string) => {
    if (!currentProject) {
      throw new Error('No project selected');
    }
    try {
      setError(null);
      await filesApi.delete(currentProject.id, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setOpenFiles(prev => prev.filter(f => f.id !== fileId));
      setUnsavedFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      if (currentFile?.id === fileId) {
        const remaining = openFiles.filter(f => f.id !== fileId);
        setCurrentFile(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete file');
      throw err;
    }
  }, [currentProject, openFiles, currentFile]);

  // Close file tab
  const closeFile = useCallback((fileId: string) => {
    setOpenFiles(prev => {
      const remaining = prev.filter(f => f.id !== fileId);
      // If closing current file, select another one
      if (currentFile?.id === fileId) {
        setCurrentFile(remaining.length > 0 ? remaining[0] : null);
      }
      return remaining;
    });
    // Remove from unsaved
    setUnsavedFiles(prev => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  }, [currentFile]);

  // Mark file as unsaved
  const markFileUnsaved = useCallback((fileId: string) => {
    setUnsavedFiles(prev => new Set(prev).add(fileId));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize default project and file on mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeDefault = async () => {
      try {
        // Load existing projects
        const projectList = await projectsApi.list({ order: 'updatedAt.desc' });
        
        if (!isMounted) return;
        
        setProjects(projectList);
        
        // If no projects exist, create a default one
        if (projectList.length === 0) {
          const defaultProject = await projectsApi.create({ 
            name: 'My First Project', 
            description: 'Default project for Logo Web IDE' 
          });
          
          if (!isMounted) return;
          
          setProjects([defaultProject]);
          setCurrentProject(defaultProject);
          
          // Load files for the new project
          const fileList = await filesApi.list(defaultProject.id, { order: 'path.asc' });
          setFiles(fileList);
          
          // Create a default file
          const defaultFile = await filesApi.create({
            projectId: defaultProject.id,
            name: 'main.logo',
            path: 'main.logo',
            content: `; Welcome to Logo Web IDE!
; Try these commands:

forward 100
right 90
forward 100
right 90
forward 100
right 90
forward 100

; Or try a square procedure:
; to square
;   repeat 4 [forward 100 right 90]
; end
; square
`,
            language: 'logo'
          });
          
          if (!isMounted) return;
          
          // Update files list and select the file
          setFiles(prev => [...prev, defaultFile]);
          setCurrentFile(defaultFile);
          setOpenFiles([defaultFile]);
        } else {
          // If projects exist, select the most recent one
          const mostRecent = projectList[0];
          setCurrentProject(mostRecent);
          
          // Load files for the project
          const fileList = await filesApi.list(mostRecent.id, { order: 'path.asc' });
          
          if (!isMounted) return;
          
          setFiles(fileList);
          
          if (fileList.length > 0) {
            // Open the first file
            const firstFile = fileList[0];
            setCurrentFile(firstFile);
            setOpenFiles([firstFile]);
          } else {
            // Create a default file if project has no files
            const defaultFile = await filesApi.create({
              projectId: mostRecent.id,
              name: 'main.logo',
              path: 'main.logo',
              content: `; Welcome to Logo Web IDE!
; Try these commands:

forward 100
right 90
forward 100
right 90
forward 100
right 90
forward 100
`,
              language: 'logo'
            });
            
            if (!isMounted) return;
            
            setFiles(prev => [...prev, defaultFile]);
            setCurrentFile(defaultFile);
            setOpenFiles([defaultFile]);
          }
        }
      } catch (error) {
        console.error('Failed to initialize default project/file:', error);
        setError('Failed to initialize. Please refresh the page.');
      }
    };
    
    initializeDefault();
    
    return () => {
      isMounted = false;
    };
  }, []); // Only run once on mount

  const value: ProjectContextType = {
    projects,
    currentProject,
    loading,
    error,
    files,
    currentFile,
    openFiles,
    unsavedFiles,
    loadProjects,
    createProject,
    selectProject,
    updateProject,
    deleteProject,
    loadFiles,
    createFile,
    selectFile,
    updateFile,
    saveFile,
    deleteFile,
    closeFile,
    markFileUnsaved,
    clearError
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

