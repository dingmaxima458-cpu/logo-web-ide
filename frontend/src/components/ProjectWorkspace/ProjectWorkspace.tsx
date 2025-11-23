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

const ProjectWorkspace: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    currentProject,
    currentFile,
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

  // Load project from URL
  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      selectProject(projectId).catch((error) => {
        console.error('Failed to load project:', error);
        // Redirect back to launcher if project not found
        navigate('/');
      });
    }
  }, [projectId, currentProject, selectProject, navigate]);

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
      const emptyContent = '; No file open. Create or open a file to start coding.';
      setCode(emptyContent);
      currentCodeRef.current = emptyContent;
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
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      const latestCode = currentCodeRef.current;
      updateFileContent(currentFile.id, { content: latestCode });
      
      try {
        isUserEditingRef.current = false;
        await saveFile(currentFile.id, latestCode);
        await new Promise(resolve => setTimeout(resolve, 100));
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
          onClick={() => navigate('/')}
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
    </>
  );
};

export default ProjectWorkspace;

