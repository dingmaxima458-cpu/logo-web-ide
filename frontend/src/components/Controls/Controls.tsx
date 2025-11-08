import React from 'react';
import './Controls.css';

interface ControlsProps {
  onRun: () => void;
  onClear: () => void;
  onReset: () => void;
  isRunning: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onRun, onClear, onReset, isRunning }) => {
  const handleRunClick = () => {
    console.log('[Controls] Run button clicked');
    onRun();
  };

  return (
    <div className="controls-container">
      <button
        className="control-button control-button-primary"
        onClick={handleRunClick}
        disabled={isRunning}
      >
        {isRunning ? '⏳ Running...' : '▶️ Run'}
      </button>
      <button
        className="control-button control-button-secondary"
        onClick={onClear}
        disabled={isRunning}
      >
        🗑️ Clear Canvas
      </button>
      <button
        className="control-button control-button-secondary"
        onClick={onReset}
        disabled={isRunning}
      >
        🔄 Reset Code
      </button>
    </div>
  );
};

export default Controls;

