import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import CodeEditor from './components/CodeEditor/CodeEditor';
import TurtleCanvas from './components/Canvas/TurtleCanvas';
import Controls from './components/Controls/Controls';
import Console, { ConsoleMessage } from './components/Console/Console';
import ProjectExplorer from './components/ProjectExplorer/ProjectExplorer';
import FileTabs from './components/FileTabs/FileTabs';
import { executeApi, healthCheck } from './services/api-v1';
import { useProject } from './contexts/ProjectContext';

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

function App() {
  const {
    currentProject,
    currentFile,
    updateFile: updateFileContent,
    saveFile,
    markFileUnsaved
  } = useProject();
  
  const [code, setCode] = useState('');
  const [commands, setCommands] = useState<TurtleCommand[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserEditingRef = useRef(false); // Track if user is actively editing
  const lastFileIdRef = useRef<string | null>(null); // Track which file is loaded
  const currentCodeRef = useRef<string>(''); // Track the latest code for saving
  const currentFileIdRef = useRef<string | null>(null); // Track current file ID
  
  // Update code when current file changes
  useEffect(() => {
    // Only update if it's a different file, or if user is not actively editing
    if (currentFile) {
      if (currentFile.id !== lastFileIdRef.current) {
        // Different file - always update
        const newContent = currentFile.content || '';
        setCode(newContent);
        currentCodeRef.current = newContent;
        currentFileIdRef.current = currentFile.id;
        lastFileIdRef.current = currentFile.id;
        isUserEditingRef.current = false;
      } else if (!isUserEditingRef.current) {
        // Same file but user is not editing - sync from backend
        // This happens after save completes
        const newContent = currentFile.content || '';
        setCode(newContent);
        currentCodeRef.current = newContent;
      }
    } else {
      const emptyContent = '; No file open. Create or open a file to start coding.';
      setCode(emptyContent);
      currentCodeRef.current = emptyContent;
      currentFileIdRef.current = null;
      lastFileIdRef.current = null;
      isUserEditingRef.current = false;
    }
  }, [currentFile]); // Depend on the whole file object to catch content changes

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthCheck();
        // Backend is available - no message needed, it's working
      } catch (error: any) {
        // Backend is not available - show warning
        setConsoleMessages([{
          type: 'error',
          message: `⚠️ Backend connection failed: ${error.message}. Make sure the backend server is running.`,
          timestamp: new Date()
        }]);
      }
    };
    
    checkBackend();
  }, []);

  // Handle code changes with auto-save (debounced)
  const handleCodeChange = useCallback((newCode: string) => {
    // Mark that user is actively editing - prevent file updates from resetting editor
    isUserEditingRef.current = true;
    setCode(newCode);
    // Store the latest code in ref for auto-save (avoids stale closure)
    currentCodeRef.current = newCode;
    
    if (!currentFile) return;
    
    // Capture file ID in closure to avoid stale reference
    const fileIdToSave = currentFile.id;
    
    // Update file content in context (marks as unsaved)
    updateFileContent(fileIdToSave, newCode);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Auto-save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      // Get the latest code from ref (not from closure or state)
      const codeToSave = currentCodeRef.current;
      const fileId = currentFileIdRef.current;
      
      if (!fileId) return;
      
      try {
        // CRITICAL: Pass the content directly to avoid stale state
        await saveFile(fileId, codeToSave);
        // After save completes, allow file updates again
        isUserEditingRef.current = false;
      } catch (error: any) {
        console.error('Auto-save failed:', error);
        // Don't show error for auto-save failures
      }
    }, 2000);
  }, [currentFile, updateFileContent, saveFile]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleRun = async () => {
    // CRITICAL: Must have a file and project to run
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
      // STEP 1: Cancel any pending auto-save to avoid conflicts
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // STEP 2: Get the absolute latest code (from ref, not state)
      const latestCode = currentCodeRef.current;
      
      // STEP 3: Update in-memory file content with current editor state
      updateFileContent(currentFile.id, latestCode);
      
      // STEP 4: Save to backend FIRST - pass content directly to avoid race conditions
      // We MUST save before running to ensure backend has the latest code
      try {
        // Mark that we're saving (prevent editor updates during save)
        isUserEditingRef.current = false;
        // Save with the latest code directly - don't rely on state
        await saveFile(currentFile.id, latestCode);
        // Wait a moment to ensure save is fully persisted
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (saveError: any) {
        console.error('Failed to save before running:', saveError);
        setConsoleMessages(prev => [...prev, {
          type: 'error',
          message: `Failed to save file before running: ${saveError.message}. Please save manually and try again.`,
          timestamp: new Date()
        }]);
        setIsRunning(false);
        return; // STOP - don't run if save failed
      }
      
      // STEP 3: Execute using ONLY fileId and projectId
      // Backend will load the saved file from storage
      // DO NOT pass code from frontend - always use backend file
      const response = await executeApi.execute({
        fileId: currentFile.id,
        projectId: currentProject.id,
        reset: true
        // NOTE: We explicitly do NOT pass 'code' - backend loads from file
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
      console.error('[App] Exception in handleRun:', err);
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
    } else {
      setCode(`; Logo Web IDE
forward 50
right 90
forward 50
`);
    }
    handleClear();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🐢 Logo Web IDE</h1>
        <p>Modern Logo Programming Language Playground</p>
        {currentProject && (
          <div className="current-project-indicator">
            Project: {currentProject.name}
          </div>
        )}
      </header>
      
      <div className="App-container">
        <ProjectExplorer />
        
        <div className="App-editor-panel">
          <FileTabs />
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
        </div>
        
        <div className="App-canvas-panel">
          <TurtleCanvas commands={commands} />
        </div>
      </div>
    </div>
  );
}

export default App;

