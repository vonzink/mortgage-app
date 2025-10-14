import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaFileAlt, FaList, FaCog } from 'react-icons/fa';

const Header = () => {
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Link to="/apply" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaHome />
            MortgageApp
          </Link>
        </div>
        <nav className="nav" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/apply" className={isActive('/apply') ? 'active' : ''}>
            <FaFileAlt />
            <span>Apply Now</span>
          </Link>
          <Link to="/applications" className={isActive('/applications') ? 'active' : ''}>
            <FaList />
            <span>My Applications</span>
          </Link>
          
          {/* Settings Dropdown */}
          <div ref={settingsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5rem',
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                transition: 'transform 0.3s',
                transform: showSettings ? 'rotate(90deg)' : 'rotate(0deg)'
              }}
              title="Settings"
            >
              <FaCog />
            </button>
            
            {showSettings && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '200px',
                zIndex: 1000,
                overflow: 'hidden'
              }}>
                <div style={{ padding: '0.5rem 0' }}>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      // Placeholder for future settings
                      alert('Settings coming soon!');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    General Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      alert('Preferences coming soon!');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
