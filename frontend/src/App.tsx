import React, { useState } from 'react';
import './App.css';
import CodeEditor from './components/CodeEditor/CodeEditor';
import TurtleCanvas from './components/Canvas/TurtleCanvas';
import Controls from './components/Controls/Controls';
import Console, { ConsoleMessage } from './components/Console/Console';
import { executeCode } from './services/api';

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

  const handleRun = async () => {
    setIsRunning(true);
    setCommands([]);
    setConsoleMessages([]);

    try {
      const response = await executeCode(code, true);
      if (response.success) {
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
        // Add error message to console
        const errorMsg = response.error || 'Execution failed';
        setConsoleMessages(prev => [...prev, {
          type: 'error',
          message: errorMsg,
          timestamp: new Date()
        }]);
      }
    } catch (err: any) {
      // Add error message to console
      const errorMsg = err.response?.data?.error || err.message || 'Failed to execute code';
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

