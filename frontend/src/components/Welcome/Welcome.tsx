/**
 * Welcome/Project Launcher - Always shown first to select or create project
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import './Welcome.css';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { projects, loading, createProject } = useProject();
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const project = await createProject(newProjectName.trim(), newProjectDescription.trim());
      setNewProjectName('');
      setNewProjectDescription('');
      setShowNewProjectForm(false);
      // Navigate to the project
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleSelectProject = (projectId: string) => {
    // Navigate to the project route
    navigate(`/project/${projectId}`);
  };

  return (
    <div className="welcome-launcher">
      <div className="launcher-content">
        {/* Hero Section */}
        <div className="launcher-hero">
          <div className="hero-icon">🐢</div>
          <h1>Welcome to Logo Web IDE</h1>
          <p className="hero-subtitle">
            A modern, professional environment for creating and running Logo programs with live turtle graphics
          </p>
        </div>

        {loading ? (
          <div className="launcher-loading">
            <div className="loading-spinner"></div>
            <p>Loading projects...</p>
          </div>
        ) : (
          <>
            {/* Existing Projects */}
            {projects.length > 0 && (
              <div className="launcher-section">
                <h2>Your Projects</h2>
                <div className="project-grid">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="project-card"
                      onClick={() => handleSelectProject(project.id)}
                    >
                      <div className="project-card-icon">
                        <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M14.5 2H7.71l-.85-.85L6.51 1h-5l-.5.5v11l.5.5h13l.5-.5v-10zm-.51 10h-12V2h4.49l.35.15.86.86H14v9z"/>
                        </svg>
                      </div>
                      <div className="project-card-info">
                        <h3>{project.name}</h3>
                        {project.description && <p>{project.description}</p>}
                        <div className="project-card-meta">
                          {project.fileCount || 0} {project.fileCount === 1 ? 'file' : 'files'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create New Project */}
            <div className="launcher-section">
              {!showNewProjectForm ? (
                <button
                  className="create-project-button"
                  onClick={() => setShowNewProjectForm(true)}
                >
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/>
                  </svg>
                  <span>Create New Project</span>
                </button>
              ) : (
                <div className="new-project-form">
                  <h2>New Project</h2>
                  <input
                    type="text"
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProject();
                      if (e.key === 'Escape') setShowNewProjectForm(false);
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
                      if (e.key === 'Escape') setShowNewProjectForm(false);
                    }}
                  />
                  <div className="form-actions">
                    <button
                      className="secondary-button"
                      onClick={() => setShowNewProjectForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="primary-button"
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim()}
                    >
                      Create Project
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Getting Started Tip */}
            {projects.length === 0 && !showNewProjectForm && (
              <div className="getting-started-tip">
                <p>👆 Click "Create New Project" above to start your first Logo program</p>
              </div>
            )}
          </>
        )}

        {/* Features Section */}
        <div className="features-section">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14.5 2H7.71l-.85-.85L6.51 1h-5l-.5.5v11l.5.5h13l.5-.5v-10zm-.51 10h-12V2h4.49l.35.15.86.86H14v9z"/>
              </svg>
            </div>
            <h3>Organize with Projects</h3>
            <p>Create multiple projects to organize your Logo programs and experiments</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.85 4.44l-3.28-3.3-.35-.14H2.5l-.5.5v13l.5.5h11l.5-.5V4.8zM13 14H3V2h6v3.5l.5.5H13z"/>
              </svg>
            </div>
            <h3>Multiple Files</h3>
            <p>Work with multiple files within each project for better code organization</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.5 1L1 8.5l7.5 7.5V11h5V6h-5V1z"/>
              </svg>
            </div>
            <h3>Auto-Save</h3>
            <p>Your work is automatically saved as you code, so you never lose progress</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2v12h12V2H2zm1 1h10v10H3V3z"/>
              </svg>
            </div>
            <h3>Live Execution</h3>
            <p>See your turtle graphics come to life instantly with real-time rendering</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;

