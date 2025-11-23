/**
 * Project Explorer - VS Code style sidebar
 */

import React, { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import './ProjectExplorer.css';

const ProjectExplorer: React.FC = () => {
  const {
    projects,
    currentProject,
    files,
    currentFile,
    loading,
    createProject,
    selectProject,
    updateProject,
    deleteProject,
    createFile,
    selectFile,
    updateFile,
    deleteFile
  } = useProject();

  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showRenameProjectDialog, setShowRenameProjectDialog] = useState(false);
  const [showRenameFileDialog, setShowRenameFileDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameFileId, setRenameFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [isFilesExpanded, setIsFilesExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, type: 'project' | 'file', id: string} | null>(null);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const project = await createProject(newProjectName.trim(), newProjectDescription.trim());
      await selectProject(project.id);
      setNewProjectName('');
      setNewProjectDescription('');
      setShowNewProjectDialog(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim() || !currentProject) return;
    try {
      const fileName = newFileName.trim().endsWith('.logo') 
        ? newFileName.trim() 
        : `${newFileName.trim()}.logo`;
      await createFile(fileName, fileName, `; ${fileName}\n; Created on ${new Date().toLocaleDateString()}\n\n`);
      setNewFileName('');
      setShowNewFileDialog(false);
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  const handleRenameProject = async () => {
    if (!renameValue.trim() || !renameProjectId) return;
    try {
      await updateProject(renameProjectId, { name: renameValue.trim() });
      setShowRenameProjectDialog(false);
      setRenameProjectId(null);
      setRenameValue('');
    } catch (error) {
      console.error('Failed to rename project:', error);
    }
  };

  const handleRenameFile = async () => {
    if (!renameValue.trim() || !renameFileId) return;
    try {
      const fileName = renameValue.trim().endsWith('.logo') 
        ? renameValue.trim() 
        : `${renameValue.trim()}.logo`;
      await updateFile(renameFileId, { name: fileName, path: fileName });
      setShowRenameFileDialog(false);
      setRenameFileId(null);
      setRenameValue('');
    } catch (error) {
      console.error('Failed to rename file:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (window.confirm(`Delete project "${project?.name}"?\n\nThis will delete all files in this project. This action cannot be undone.`)) {
      try {
        await deleteProject(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (window.confirm(`Delete file "${file?.name}"?\n\nThis action cannot be undone.`)) {
      try {
        await deleteFile(fileId);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'project' | 'file', id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id });
  };

  const handleContextMenuAction = (action: 'rename' | 'delete') => {
    if (!contextMenu) return;
    
    if (action === 'rename') {
      if (contextMenu.type === 'project') {
        const project = projects.find(p => p.id === contextMenu.id);
        if (project) {
          setRenameProjectId(contextMenu.id);
          setRenameValue(project.name);
          setShowRenameProjectDialog(true);
        }
      } else {
        const file = files.find(f => f.id === contextMenu.id);
        if (file) {
          setRenameFileId(contextMenu.id);
          setRenameValue(file.name.replace('.logo', ''));
          setShowRenameFileDialog(true);
        }
      }
    } else if (action === 'delete') {
      if (contextMenu.type === 'project') {
        handleDeleteProject(contextMenu.id);
      } else {
        handleDeleteFile(contextMenu.id);
      }
    }
    
    setContextMenu(null);
  };

  // Close context menu on click outside
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <div className="project-explorer">
      {/* Projects Section */}
      <div className="explorer-section">
        <div className="section-header" onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}>
          <span className="chevron">{isProjectsExpanded ? '›' : '›'}</span>
          <h3>PROJECTS</h3>
          <button
            className="action-icon"
            onClick={(e) => { e.stopPropagation(); setShowNewProjectDialog(true); }}
            title="New Project"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/>
            </svg>
          </button>
        </div>

        {isProjectsExpanded && (
          <div className="section-content">
            {loading && projects.length === 0 ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                <span>Loading...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <p>No projects</p>
              </div>
            ) : (
              <div className="item-list">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`explorer-item ${currentProject?.id === project.id ? 'active' : ''}`}
                    onClick={() => selectProject(project.id)}
                    onContextMenu={(e) => handleContextMenu(e, 'project', project.id)}
                  >
                    <svg className="item-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M14.5 2H7.71l-.85-.85L6.51 1h-5l-.5.5v11l.5.5h13l.5-.5v-10zm-.51 10h-12V2h4.49l.35.15.86.86H14v9z"/>
                    </svg>
                    <span className="item-name">{project.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Files Section */}
      {currentProject && (
        <div className="explorer-section files-section">
          <div className="section-header" onClick={() => setIsFilesExpanded(!isFilesExpanded)}>
            <span className="chevron">{isFilesExpanded ? '›' : '›'}</span>
            <h3>{currentProject.name.toUpperCase()}</h3>
            <button
              className="action-icon"
              onClick={(e) => { e.stopPropagation(); setShowNewFileDialog(true); }}
              title="New File"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/>
              </svg>
            </button>
          </div>

          {isFilesExpanded && (
            <div className="section-content">
              {files.length === 0 ? (
                <div className="empty-state">
                  <p>No files</p>
                </div>
              ) : (
                <div className="item-list">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`explorer-item ${currentFile?.id === file.id ? 'active' : ''}`}
                      onClick={() => selectFile(file.id)}
                      onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
                    >
                      <svg className="item-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.85 4.44l-3.28-3.3-.35-.14H2.5l-.5.5v13l.5.5h11l.5-.5V4.8zM13 14H3V2h6v3.5l.5.5H13z"/>
                      </svg>
                      <span className="item-name">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="context-menu-item" onClick={() => handleContextMenuAction('rename')}>
            Rename
          </div>
          <div className="context-menu-item delete" onClick={() => handleContextMenuAction('delete')}>
            Delete
          </div>
        </div>
      )}

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <div className="dialog-overlay" onClick={() => setShowNewProjectDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h4>New Project</h4>
              <button className="close-button" onClick={() => setShowNewProjectDialog(false)}>×</button>
            </div>
            <div className="dialog-body">
              <input
                type="text"
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                  if (e.key === 'Escape') setShowNewProjectDialog(false);
                }}
                autoFocus
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                  if (e.key === 'Escape') setShowNewProjectDialog(false);
                }}
              />
            </div>
            <div className="dialog-actions">
              <button className="secondary-button" onClick={() => setShowNewProjectDialog(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="dialog-overlay" onClick={() => setShowNewFileDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h4>New File</h4>
              <button className="close-button" onClick={() => setShowNewFileDialog(false)}>×</button>
            </div>
            <div className="dialog-body">
              <input
                type="text"
                placeholder="filename.logo"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFile();
                  if (e.key === 'Escape') setShowNewFileDialog(false);
                }}
                autoFocus
              />
            </div>
            <div className="dialog-actions">
              <button className="secondary-button" onClick={() => setShowNewFileDialog(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleCreateFile} disabled={!newFileName.trim()}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Project Dialog */}
      {showRenameProjectDialog && (
        <div className="dialog-overlay" onClick={() => setShowRenameProjectDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h4>Rename Project</h4>
              <button className="close-button" onClick={() => setShowRenameProjectDialog(false)}>×</button>
            </div>
            <div className="dialog-body">
              <input
                type="text"
                placeholder="New project name"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameProject();
                  if (e.key === 'Escape') setShowRenameProjectDialog(false);
                }}
                autoFocus
              />
            </div>
            <div className="dialog-actions">
              <button className="secondary-button" onClick={() => setShowRenameProjectDialog(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleRenameProject} disabled={!renameValue.trim()}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename File Dialog */}
      {showRenameFileDialog && (
        <div className="dialog-overlay" onClick={() => setShowRenameFileDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h4>Rename File</h4>
              <button className="close-button" onClick={() => setShowRenameFileDialog(false)}>×</button>
            </div>
            <div className="dialog-body">
              <input
                type="text"
                placeholder="New filename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameFile();
                  if (e.key === 'Escape') setShowRenameFileDialog(false);
                }}
                autoFocus
              />
            </div>
            <div className="dialog-actions">
              <button className="secondary-button" onClick={() => setShowRenameFileDialog(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleRenameFile} disabled={!renameValue.trim()}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectExplorer;

