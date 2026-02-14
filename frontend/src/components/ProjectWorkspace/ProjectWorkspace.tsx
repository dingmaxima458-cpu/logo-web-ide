/**
 * Project Workspace - Main editor view for a specific project
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Split from 'react-split';
import { useProject } from '../../contexts/ProjectContext';
import CodeEditor from '../CodeEditor/CodeEditor';
import TurtleCanvas from '../Canvas/TurtleCanvas';
import Console, { ConsoleMessage } from '../Console/Console';
import ProjectExplorer from '../ProjectExplorer/ProjectExplorer';
import FileTabs from '../FileTabs/FileTabs';
import UserProfile from '../UserProfile/UserProfile';
import CommandReference from '../CommandReference/CommandReference';
import { executeApi } from '../../services/api-v1';
import './ProjectWorkspace.css';

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
  const saveInProgressRef = useRef<Map<string, Promise<void>>>(new Map()); // Track saves in progress by fileId
  const monacoEditorRef = useRef<any>(null); // Ref to Monaco editor instance

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

  // Update code ONLY when file ID changes (switching files), NOT when content updates
  // This prevents editor refresh when user is typing or when save completes
  useEffect(() => {
    if (currentFile) {
      // Only update editor if file ID changed (user switched files)
      if (currentFile.id !== lastFileIdRef.current) {
        const newContent = currentFile.content || '';
        setCode(newContent);
        currentCodeRef.current = newContent;
        currentFileIdRef.current = currentFile.id;
        lastFileIdRef.current = currentFile.id;
        isUserEditingRef.current = false;
      }
      // DO NOT update editor if same file - user might be editing
      // Editor content is the source of truth while editing
    } else {
      // No file open - clear code state
      setCode('');
      currentCodeRef.current = '';
      currentFileIdRef.current = null;
      lastFileIdRef.current = null;
      isUserEditingRef.current = false;
    }
  }, [currentFile?.id]); // Only depend on file ID, not the entire currentFile object

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
      const fileId = currentFileIdRef.current;
      
      if (!fileId) return;
      
      // CRITICAL: Get code directly from Monaco editor to avoid race conditions
      // Monaco's onChange might not have fired yet if user is actively typing
      let codeToSave: string;
      if (monacoEditorRef.current) {
        // Get the absolute latest value from Monaco editor
        codeToSave = monacoEditorRef.current.getValue() || '';
        // Update ref to keep it in sync
        currentCodeRef.current = codeToSave;
      } else {
        // Fallback to ref if editor not available
        codeToSave = currentCodeRef.current;
      }
      
      // Check if a save is already in progress for this file
      const existingSave = saveInProgressRef.current.get(fileId);
      if (existingSave) {
        // Wait for existing save to complete, then save with latest code
        try {
          await existingSave;
        } catch (err) {
          // Ignore errors from previous save, we'll try again
        }
        // Re-check code from Monaco in case it changed during the wait
        let latestCode: string;
        if (monacoEditorRef.current) {
          latestCode = monacoEditorRef.current.getValue() || '';
          currentCodeRef.current = latestCode;
        } else {
          latestCode = currentCodeRef.current;
        }
        
        if (latestCode !== codeToSave) {
          // Code changed, save the latest version
          const savePromise = saveFile(fileId, latestCode);
          saveInProgressRef.current.set(fileId, savePromise);
          try {
            await savePromise;
            isUserEditingRef.current = false;
          } catch (error: any) {
            console.error('Auto-save failed:', error);
          } finally {
            saveInProgressRef.current.delete(fileId);
          }
        } else {
          // Same code, no need to save again
          isUserEditingRef.current = false;
        }
        return;
      }
      
      // No save in progress, proceed with save
      const savePromise = saveFile(fileId, codeToSave);
      saveInProgressRef.current.set(fileId, savePromise);
      try {
        await savePromise;
        isUserEditingRef.current = false;
      } catch (error: any) {
        console.error('Auto-save failed:', error);
      } finally {
        saveInProgressRef.current.delete(fileId);
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
      
      // CRITICAL: Get code directly from Monaco editor to avoid race conditions
      // Monaco's onChange might not have fired yet if user is actively typing
      let latestCode: string;
      if (monacoEditorRef.current) {
        // Get the absolute latest value from Monaco editor
        latestCode = monacoEditorRef.current.getValue() || '';
        // Update ref to keep it in sync
        currentCodeRef.current = latestCode;
      } else {
        // Fallback to ref if editor not available
        latestCode = currentCodeRef.current;
      }
      
      // Update in-memory state
      updateFileContent(currentFile.id, { content: latestCode });
      
      // Save to cache first (synchronous write to local cache)
      // Backend will write to cache immediately, then async upload to Supabase
      try {
        isUserEditingRef.current = false;
        
        // Check if a save is already in progress for this file
        const existingSave = saveInProgressRef.current.get(currentFile.id);
        if (existingSave) {
          // Wait for existing save to complete first
          try {
            await existingSave;
          } catch (err) {
            // If previous save failed, continue with our save
            console.warn('Previous save failed, continuing with new save:', err);
          }
        }
        
        // Now save with the latest code
        const savePromise = saveFile(currentFile.id, latestCode);
        saveInProgressRef.current.set(currentFile.id, savePromise);
        await savePromise;
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
      } finally {
        // Clean up save tracking
        saveInProgressRef.current.delete(currentFile.id);
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
        <Split
          className="split-horizontal main-split"
          direction="horizontal"
          sizes={[15, 50, 35]}
          minSize={[200, 300, 300]}
          gutterSize={4}
          snapOffset={0}
        >
          <div className="split-pane explorer-pane">
            <ProjectExplorer />
          </div>
          
          <div className="split-pane editor-pane">
            <Split
              className="split-vertical editor-split"
              direction="vertical"
              sizes={[5, 70, 25]}
              minSize={[40, 100, 150]}
              gutterSize={4}
              snapOffset={0}
            >
              <div className="split-pane filetabs-pane">
                <FileTabs />
              </div>
              
              <div className="split-pane codeeditor-pane">
                {currentFile ? (
                  <CodeEditor
                    value={code}
                    onChange={handleCodeChange}
                    language="logo"
                    editorRef={monacoEditorRef}
                  />
                ) : (
                  <EmptyState hasFiles={files.length > 0} />
                )}
              </div>
              
              <div className="split-pane console-pane">
                {currentFile && (
                  <Console 
                    messages={consoleMessages}
                    onClear={handleClear}
                    onRun={handleRun}
                    onReset={handleReset}
                    isRunning={isRunning}
                  />
                )}
              </div>
            </Split>
          </div>
          
          <div className="split-pane canvas-pane">
            <TurtleCanvas commands={commands} />
          </div>
        </Split>
      </div>
      
      <CommandReference />
    </>
  );
};

export default ProjectWorkspace;

