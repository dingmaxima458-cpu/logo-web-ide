import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Auth from './components/Auth/Auth';
import Welcome from './components/Welcome/Welcome';
import ProjectWorkspace from './components/ProjectWorkspace/ProjectWorkspace';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="App" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#1e1e1e'
      }}>
        <div style={{ textAlign: 'center', color: '#cccccc' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #3e3e42',
            borderTopColor: '#007acc',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        {/* Root - redirect based on auth state */}
        <Route 
          path="/" 
          element={<Navigate to={user ? "/launcher" : "/login"} replace />} 
        />

        {/* Public Route - Login/Signup */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/launcher" replace /> : <Auth />} 
        />

        {/* Protected Route - Project Launcher */}
        <Route path="/launcher" element={
          <ProtectedRoute>
            <Welcome />
          </ProtectedRoute>
        } />

        {/* Protected Route - Project Workspace */}
        <Route path="/project/:projectId" element={
          <ProtectedRoute>
            <ProjectWorkspace />
          </ProtectedRoute>
        } />

        {/* Catch all - redirect to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;

