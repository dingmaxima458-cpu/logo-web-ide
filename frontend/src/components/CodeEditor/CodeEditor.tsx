import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  editorRef?: React.RefObject<any>; // Expose editor ref to parent
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language = 'logo', editorRef: externalEditorRef }) => {
  const internalEditorRef = useRef<any>(null);
  // Use external ref if provided, otherwise use internal ref
  const editorRef = externalEditorRef ?? internalEditorRef;
  const isInternalUpdateRef = useRef(false);
  const lastValueRef = useRef<string>(value);

  // Only update editor if value changed externally (file switch), not from user edits
  useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current && !isInternalUpdateRef.current) {
      const editor = editorRef.current;
      const currentValue = editor.getValue();
      
      // Only update if the value is actually different (file was switched)
      if (currentValue !== value) {
        editor.setValue(value);
        lastValueRef.current = value;
      }
    }
    isInternalUpdateRef.current = false;
  }, [value]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    // Set the ref (either internal or external)
    if (editorRef) {
      editorRef.current = editor;
    }
    lastValueRef.current = value;
  };

  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      isInternalUpdateRef.current = true; // Mark as internal update
      lastValueRef.current = newValue;
      onChange(newValue);
    }
  };

  return (
    <div className="code-editor-container">
      <div className="code-editor-header">
        <span>Logo Code Editor</span>
      </div>
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;

