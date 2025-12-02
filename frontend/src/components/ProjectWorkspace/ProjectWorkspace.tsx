/**
 * Project Workspace - Main editor view for a specific project
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import CodeEditor from '../CodeEditor/CodeEditor';
import TurtleCanvas from '../Canvas/TurtleCanvas';
import Controls from '../Controls/Controls';
import Console, { ConsoleMessage } from '../Console/Console';
import ProjectExplorer from '../ProjectExplorer/ProjectExplorer';
import FileTabs from '../FileTabs/FileTabs';
import UserProfile from '../UserProfile/UserProfile';
import { executeApi } from '../../services/api-v1';

interface TurtleCommand {
  type: string;
  x?: number;
  y?: number;
  angle?: number;
  penDown?: boolean;
  down?: boolean;
  r?: number;
  g?: number;
  b?: number;
}

/**
 * Empty State Component - Shows when no file is open
 */
const EmptyState: React.FC<{ hasFiles: boolean }> = ({ hasFiles }) => {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <div className="empty-state-icon">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Turtle body */}
            <ellipse cx="60" cy="70" rx="35" ry="25" fill="#4CAF50" opacity="0.8"/>
            {/* Turtle head */}
            <ellipse cx="60" cy="45" rx="20" ry="18" fill="#4CAF50"/>
            {/* Turtle shell pattern */}
            <path d="M45 70 Q60 60 75 70 Q60 80 45 70" fill="#2E7D32" opacity="0.6"/>
            <path d="M50 65 Q60 55 70 65 Q60 75 50 65" fill="#2E7D32" opacity="0.4"/>
            {/* Eyes */}
            <circle cx="55" cy="42" r="3" fill="#1B5E20"/>
            <circle cx="65" cy="42" r="3" fill="#1B5E20"/>
            {/* Legs */}
            <ellipse cx="40" cy="80" rx="6" ry="10" fill="#4CAF50"/>
            <ellipse cx="80" cy="80" rx="6" ry="10" fill="#4CAF50"/>
            <ellipse cx="45" cy="90" rx="6" ry="10" fill="#4CAF50"/>
            <ellipse cx="75" cy="90" rx="6" ry="10" fill="#4CAF50"/>
          </svg>
        </div>
        <h2 className="empty-state-title">
          {hasFiles ? 'No file open' : 'No files in project'}
        </h2>
        <p className="empty-state-description">
          {hasFiles 
            ? 'Select a file from the explorer to start editing, or create a new file.'
            : 'Create your first file to start coding in Logo.'}
        </p>
      </div>
    </div>
  );
};

const ProjectWorkspace: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    currentProject,
    currentFile,
    files,
    selectProject,
    updateFile: updateFileContent,
    saveFile,
  } = useProject();

  const [code, setCode] = useState('');
  const [commands, setCommands] = useState<TurtleCommand[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserEditingRef = useRef(false);
  const lastFileIdRef = useRef<string | null>(null);
  const currentCodeRef = useRef<string>('');
  const currentFileIdRef = useRef<string | null>(null);
  const lastSelectedProjectIdRef = useRef<string | null>(null);

  // Load project from URL
  useEffect(() => {
    // Only select project if projectId changes and we haven't already selected it
    if (projectId && lastSelectedProjectIdRef.current !== projectId) {
      lastSelectedProjectIdRef.current = projectId;
      selectProject(projectId).catch((error) => {
        console.error('Failed to load project:', error);
        // Reset ref on error so we can retry
        lastSelectedProjectIdRef.current = null;
        // Redirect back to launcher if project not found
        navigate('/launcher');
      });
    }
    
    // Reset ref when projectId becomes null (navigating away)
    if (!projectId) {
      lastSelectedProjectIdRef.current = null;
    }
  }, [projectId, selectProject, navigate]);

  // Update code when current file changes
  useEffect(() => {
    if (currentFile) {
      if (currentFile.id !== lastFileIdRef.current) {
        const newContent = currentFile.content || '';
        setCode(newContent);
        currentCodeRef.current = newContent;
        currentFileIdRef.current = currentFile.id;
        lastFileIdRef.current = currentFile.id;
        isUserEditingRef.current = false;
      } else if (!isUserEditingRef.current) {
        const newContent = currentFile.content || '';
        setCode(newContent);
        currentCodeRef.current = newContent;
      }
    } else {
      // No file open - clear code state
      setCode('');
      currentCodeRef.current = '';
      currentFileIdRef.current = null;
      lastFileIdRef.current = null;
      isUserEditingRef.current = false;
    }
  }, [currentFile]);

  const handleCodeChange = useCallback((newCode: string) => {
    isUserEditingRef.current = true;
    setCode(newCode);
    currentCodeRef.current = newCode;
    
    if (!currentFile) return;
    
    const fileIdToSave = currentFile.id;
    updateFileContent(fileIdToSave, { content: newCode });
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      const codeToSave = currentCodeRef.current;
      const fileId = currentFileIdRef.current;
      
      if (!fileId) return;
      
      try {
        await saveFile(fileId, codeToSave);
        isUserEditingRef.current = false;
      } catch (error: any) {
        console.error('Auto-save failed:', error);
      }
    }, 2000);
  }, [currentFile, updateFileContent, saveFile]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleRun = async () => {
    if (!currentFile || !currentProject) {
      setConsoleMessages(prev => [...prev, {
        type: 'error',
        message: 'No file or project selected. Please open a file first.',
        timestamp: new Date()
      }]);
      return;
    }
    
    setIsRunning(true);
    setCommands([]);
    setConsoleMessages([]);

    try {
      // Clear any pending auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      const latestCode = currentCodeRef.current;
      updateFileContent(currentFile.id, { content: latestCode });
      
      // Save to cache first (synchronous write to local cache)
      // Backend will write to cache immediately, then async upload to Supabase
      try {
        isUserEditingRef.current = false;
        await saveFile(currentFile.id, latestCode);
        // No delay needed - cache write is synchronous, execute reads from cache
      } catch (saveError: any) {
        console.error('Failed to save before running:', saveError);
        setConsoleMessages(prev => [...prev, {
          type: 'error',
          message: `Failed to save file before running: ${saveError.message}. Please save manually and try again.`,
          timestamp: new Date()
        }]);
        setIsRunning(false);
        return;
      }
      
      // Execute immediately - backend reads from cache (which we just wrote to)
      const response = await executeApi.execute({
        fileId: currentFile.id,
        projectId: currentProject.id,
        reset: true
      });
      
      if (response.success) {
        setCommands(response.commands);
        
        if (response.output && response.output.trim()) {
          setConsoleMessages(prev => [...prev, {
            type: 'output',
            message: response.output,
            timestamp: new Date()
          }]);
        } else if (response.commands.length > 0) {
          setConsoleMessages(prev => [...prev, {
            type: 'info',
            message: `✓ Execution successful. Generated ${response.commands.length} turtle command(s).`,
            timestamp: new Date()
          }]);
        }
      } else {
        const errorMsg = response.error || 'Execution failed';
        setConsoleMessages(prev => [...prev, {
          type: 'error',
          message: errorMsg,
          timestamp: new Date()
        }]);
      }
    } catch (err: any) {
      console.error('[ProjectWorkspace] Exception in handleRun:', err);
      const errorMsg = err.message || 'Failed to execute code';
      setConsoleMessages(prev => [...prev, {
        type: 'error',
        message: errorMsg,
        timestamp: new Date()
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleClear = () => {
    setCommands([]);
    setConsoleMessages([]);
  };

  const handleReset = () => {
    if (currentFile) {
      setCode(currentFile.content || '');
    }
    handleClear();
  };

  if (!currentProject) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#858585' }}>
        Loading project...
      </div>
    );
  }

  return (
    <>
      <header className="App-header">
        <button 
          className="back-to-launcher-button"
          onClick={() => navigate('/launcher')}
          title="Back to Project Launcher"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1L1 8l7 7V9h7V7H8V1z"/>
          </svg>
          Projects
        </button>
        <div className="header-title">
          <h1>🐢 Logo Web IDE</h1>
          <p>Modern Logo Programming Language Playground</p>
        </div>
        <div className="current-project-indicator">
          {currentProject.name}
        </div>
        <div className="header-user-profile">
          <UserProfile />
        </div>
      </header>
      
      <div className="App-container">
        <ProjectExplorer />
        
        <div className="App-editor-panel">
          <FileTabs />
          {currentFile ? (
            <>
              <CodeEditor
                value={code}
                onChange={handleCodeChange}
                language="logo"
              />
              <Controls
                onRun={handleRun}
                onClear={handleClear}
                onReset={handleReset}
                isRunning={isRunning}
              />
              <Console 
                messages={consoleMessages}
                onClear={handleClear}
              />
            </>
          ) : (
            <EmptyState hasFiles={files.length > 0} />
          )}
        </div>
        
        <div className="App-canvas-panel">
          <TurtleCanvas commands={commands} />
        </div>
      </div>
    </>
  );
};

export default ProjectWorkspace;

