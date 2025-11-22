/**
 * File Tabs - Tab bar for open files
 */

import React from 'react';
import { useProject } from '../../contexts/ProjectContext';
import './FileTabs.css';

const FileTabs: React.FC = () => {
  const {
    openFiles,
    currentFile,
    unsavedFiles,
    selectFile,
    closeFile,
    saveFile
  } = useProject();

  const handleClose = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If file has unsaved changes, ask to save
    if (unsavedFiles.has(fileId)) {
      if (window.confirm('This file has unsaved changes. Close anyway?')) {
        closeFile(fileId);
      }
    } else {
      closeFile(fileId);
    }
  };

  const handleSave = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await saveFile(fileId);
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  // Always show tabs container, even if empty (for consistent UI)
  // This prevents UI jumping when files are opened/closed

  return (
    <div className="file-tabs">
      {openFiles.length === 0 ? (
        <div className="file-tabs-empty">
          <span>No files open</span>
        </div>
      ) : (
        openFiles.map((file) => {
        const isActive = currentFile?.id === file.id;
        const isUnsaved = unsavedFiles.has(file.id);
        
        return (
          <div
            key={file.id}
            className={`file-tab ${isActive ? 'active' : ''} ${isUnsaved ? 'unsaved' : ''}`}
            onClick={() => selectFile(file.id)}
          >
            <span className="file-tab-name">
              {isUnsaved && <span className="unsaved-indicator">●</span>}
              {file.name}
            </span>
            <div className="file-tab-actions">
              {isUnsaved && (
                <button
                  className="save-button"
                  onClick={(e) => handleSave(file.id, e)}
                  title="Save"
                >
                  💾
                </button>
              )}
              <button
                className="close-button"
                onClick={(e) => handleClose(file.id, e)}
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
        );
      }))}
    </div>
  );
};

export default FileTabs;

