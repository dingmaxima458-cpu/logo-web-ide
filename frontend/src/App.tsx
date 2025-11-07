import React, { useState } from 'react';
import './App.css';
import CodeEditor from './components/CodeEditor/CodeEditor';
import TurtleCanvas from './components/Canvas/TurtleCanvas';
import Controls from './components/Controls/Controls';
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
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const handleRun = async () => {
    setIsRunning(true);
    setError('');
    setOutput('');
    setCommands([]);

    try {
      const response = await executeCode(code, true);
      if (response.success) {
        setCommands(response.commands);
        setOutput(response.output);
      } else {
        setError(response.error || 'Execution failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute code');
    } finally {
      setIsRunning(false);
    }
  };

  const handleClear = () => {
    setCommands([]);
    setOutput('');
    setError('');
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
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
          {output && (
            <div className="output-message">
              <strong>Output:</strong> {output}
            </div>
          )}
        </div>
        
        <div className="App-canvas-panel">
          <TurtleCanvas commands={commands} />
        </div>
      </div>
    </div>
  );
}

export default App;

