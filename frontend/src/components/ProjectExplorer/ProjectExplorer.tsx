/**
 * Project Explorer - Sidebar for managing projects and files
 */

import React, { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import './ProjectExplorer.css';

const ProjectExplorer: React.FC = () => {
  const {
    projects,
    currentProject,
    files,
    loading,
    createProject,
    selectProject,
    deleteProject,
    createFile,
    selectFile,
    deleteFile
  } = useProject();

  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newFileName, setNewFileName] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const project = await createProject(newProjectName.trim());
      await selectProject(project.id);
      setNewProjectName('');
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
      await createFile(fileName, fileName);
      setNewFileName('');
      setShowNewFileDialog(false);
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteFile(fileId);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  };

  return (
    <div className="project-explorer">
      <div className="project-explorer-header">
        <h3>Projects</h3>
        <button
          className="icon-button"
          onClick={() => setShowNewProjectDialog(true)}
          title="New Project"
        >
          +
        </button>
      </div>

      {showNewProjectDialog && (
        <div className="dialog-overlay" onClick={() => setShowNewProjectDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h4>New Project</h4>
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
            <div className="dialog-actions">
              <button onClick={handleCreateProject}>Create</button>
              <button onClick={() => setShowNewProjectDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="project-list">
        {loading && projects.length === 0 ? (
          <div className="loading">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">No projects yet. Create one to get started!</div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={`project-item ${currentProject?.id === project.id ? 'active' : ''}`}
              onClick={() => selectProject(project.id)}
            >
              <span className="project-name">📁 {project.name}</span>
              <button
                className="delete-button"
                onClick={(e) => handleDeleteProject(project.id, e)}
                title="Delete project"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {currentProject && (
        <>
          <div className="file-explorer-header">
            <h4>Files</h4>
            <button
              className="icon-button"
              onClick={() => setShowNewFileDialog(true)}
              title="New File"
            >
              +
            </button>
          </div>

          {showNewFileDialog && (
            <div className="dialog-overlay" onClick={() => setShowNewFileDialog(false)}>
              <div className="dialog" onClick={(e) => e.stopPropagation()}>
                <h4>New File</h4>
                <input
                  type="text"
                  placeholder="File name (e.g., main.logo)"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFile();
                    if (e.key === 'Escape') setShowNewFileDialog(false);
                  }}
                  autoFocus
                />
                <div className="dialog-actions">
                  <button onClick={handleCreateFile}>Create</button>
                  <button onClick={() => setShowNewFileDialog(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="file-list">
            {files.length === 0 ? (
              <div className="empty-state">No files yet. Create one to start coding!</div>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className="file-item"
                  onClick={() => selectFile(file.id)}
                >
                  <span className="file-name">📄 {file.name}</span>
                  <button
                    className="delete-button"
                    onClick={(e) => handleDeleteFile(file.id, e)}
                    title="Delete file"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectExplorer;

