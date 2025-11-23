import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import Welcome from './components/Welcome/Welcome';
import ProjectWorkspace from './components/ProjectWorkspace/ProjectWorkspace';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/project/:projectId" element={<ProjectWorkspace />} />
      </Routes>
    </div>
  );
}

export default App;

