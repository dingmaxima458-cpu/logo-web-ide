import React, { useState, useEffect } from 'react';
import './App.css';
import CodeEditor from './components/CodeEditor/CodeEditor';
import TurtleCanvas from './components/Canvas/TurtleCanvas';
import Controls from './components/Controls/Controls';
import Console, { ConsoleMessage } from './components/Console/Console';
import { executeCode, healthCheck } from './services/api';

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
  const [code, setCode] = useState(`; Welcome to Logo Web IDE!
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
`);
  const [commands, setCommands] = useState<TurtleCommand[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);

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

  const handleRun = async () => {
    console.log('[App] handleRun called');
    console.log('[App] Code to execute:', code);
    console.log('[App] Setting isRunning to true');
    setIsRunning(true);
    setCommands([]);
    setConsoleMessages([]);

    try {
      console.log('[App] Calling executeCode...');
      const response = await executeCode(code, true);
      console.log('[App] executeCode response received:', response);
      
      if (response.success) {
        console.log('[App] Response successful, commands count:', response.commands.length);
        console.log('[App] Commands:', JSON.stringify(response.commands, null, 2));
        setCommands(response.commands);
        
        // Add success message if there's output
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
        console.log('[App] Response failed, error:', response.error);
        // Add error message to console
        const errorMsg = response.error || 'Execution failed';
        setConsoleMessages(prev => [...prev, {
          type: 'error',
          message: errorMsg,
          timestamp: new Date()
        }]);
      }
    } catch (err: any) {
      console.error('[App] Exception in handleRun:', err);
      console.error('[App] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code
      });
      // Add error message to console
      const errorMsg = err.response?.data?.error || err.message || 'Failed to execute code';
      setConsoleMessages(prev => [...prev, {
        type: 'error',
        message: errorMsg,
        timestamp: new Date()
      }]);
    } finally {
      console.log('[App] Setting isRunning to false');
      setIsRunning(false);
    }
  };

  const handleClear = () => {
    setCommands([]);
    setConsoleMessages([]);
  };

  const handleReset = () => {
    setCode(`; Logo Web IDE
forward 50
right 90
forward 50
`);
    handleClear();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🐢 Logo Web IDE</h1>
        <p>Modern Logo Programming Language Playground</p>
      </header>
      
      <div className="App-container">
        <div className="App-editor-panel">
          <CodeEditor
            value={code}
            onChange={setCode}
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

