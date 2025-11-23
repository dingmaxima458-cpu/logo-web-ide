/**
 * User Profile Menu - Displays in header
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './UserProfile.css';

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (!user) return null;

  const displayName = user.name || user.email.split('@')[0];
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="user-profile" ref={menuRef}>
      <button 
        className="user-profile-button"
        onClick={() => setShowMenu(!showMenu)}
        title={user.email}
      >
        <div className="user-avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={displayName} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <span className="user-name">{displayName}</span>
        <svg className="chevron" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.5 6L8 9.5 11.5 6z"/>
        </svg>
      </button>

      {showMenu && (
        <div className="user-profile-menu">
          <div className="menu-section">
            <div className="menu-user-info">
              <div className="menu-user-name">{displayName}</div>
              <div className="menu-user-email">{user.email}</div>
            </div>
          </div>
          <div className="menu-divider"></div>
          <div className="menu-section">
            <button className="menu-item" onClick={handleSignOut}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11 3h2v10h-2V3zM6 3v3H1v4h5v3l6-5-6-5z"/>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;

