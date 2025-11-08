import React from 'react';
import './Console.css';

export interface ConsoleMessage {
  type: 'error' | 'output' | 'info';
  message: string;
  timestamp?: Date;
}

interface ConsoleProps {
  messages: ConsoleMessage[];
  onClear?: () => void;
}

const Console: React.FC<ConsoleProps> = ({ messages, onClear }) => {
  const formatMessage = (msg: ConsoleMessage, index: number) => {
    const timestamp = msg.timestamp || new Date();
    const timeStr = timestamp.toLocaleTimeString();
    
    return (
      <div key={index} className={`console-line console-${msg.type}`}>
        <span className="console-timestamp">[{timeStr}]</span>
        <span className="console-prefix">
          {msg.type === 'error' ? '❌ ERROR:' : msg.type === 'output' ? '📝 OUTPUT:' : 'ℹ️ INFO:'}
        </span>
        <span className="console-message">{msg.message}</span>
      </div>
    );
  };

  return (
    <div className="console-container">
      <div className="console-header">
        <span className="console-title">Console</span>
        {onClear && (
          <button className="console-clear-btn" onClick={onClear} title="Clear console">
            Clear
          </button>
        )}
      </div>
      <div className="console-content">
        {messages.length === 0 ? (
          <div className="console-empty">
            <span>No messages. Run your Logo code to see output and errors here.</span>
          </div>
        ) : (
          messages.map((msg, index) => formatMessage(msg, index))
        )}
      </div>
    </div>
  );
};

export default Console;

