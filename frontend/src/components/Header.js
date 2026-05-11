import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaFileAlt, FaList, FaCog, FaFileDownload, FaFileUpload, FaUserShield } from 'react-icons/fa';
import { toast } from 'react-toastify';
import AuthControls from './AuthControls';
import mortgageService from '../services/mortgageService';
import useRoles from '../hooks/useRoles';

/**
 * Detect "I'm currently looking at a specific loan" from the URL — used to enable the
 * loan-context cog menu items (Download/Upload MISMO).
 *
 * Matches both `/applications/:id` and `/applications/:id/...`.
 */
function useCurrentLoanId() {
  const { pathname } = useLocation();
  const m = pathname.match(/^\/applications\/(\d+)/);
  return m ? m[1] : null;
}

const Header = () => {
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [busyMismo, setBusyMismo] = useState(false);
  const settingsRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentLoanId = useCurrentLoanId();
  const { isAdmin } = useRoles();

  const isActive = (path) => location.pathname === path;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── MISMO download ──────────────────────────────────────────────
  const handleDownloadMismo = async () => {
    setShowSettings(false);
    if (!currentLoanId) return;
    try {
      setBusyMismo(true);
      const filename = await mortgageService.exportMismo(currentLoanId);
      toast.success(`Downloaded ${filename}`);
    } catch (e) {
      toast.error(`MISMO export failed: ${e.message || e}`);
    } finally {
      setBusyMismo(false);
    }
  };

  // ── MISMO upload (with drift check + force-retry confirmation) ─────
  const handleUploadClick = () => {
    setShowSettings(false);
    if (!currentLoanId) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || !currentLoanId) return;
    await runImport(file, false);
  };

  const runImport = async (file, force) => {
    try {
      setBusyMismo(true);
      const result = await mortgageService.importMismo(currentLoanId, file, { force });
      toast.success(`MISMO imported. ${result.changeCount} field${result.changeCount === 1 ? '' : 's'} updated.`);
      // Soft refresh — let the route's data fetcher reload
      window.dispatchEvent(new CustomEvent('mismo:imported', { detail: { loanId: currentLoanId } }));
    } catch (e) {
      if (e.message === 'drift_detected') {
        const drift = e.drift || {};
        const fileTime = drift.fileCreatedDatetime ? new Date(drift.fileCreatedDatetime).toLocaleString() : 'unknown';
        const appTime  = drift.applicationUpdatedDate ? new Date(drift.applicationUpdatedDate).toLocaleString() : 'unknown';
        const proceed = window.confirm(
          `This MISMO file was generated at:\n  ${fileTime}\n\nThe application was last modified at:\n  ${appTime}\n\nImporting will overwrite changes made since the file was generated.\n\nContinue?`
        );
        if (proceed) {
          await runImport(file, true);
        } else {
          toast.info('MISMO import cancelled.');
        }
      } else {
        toast.error(`MISMO import failed: ${e.message || e}`);
      }
    } finally {
      setBusyMismo(false);
    }
  };

  // Repeated styles for the dropdown items
  const itemStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.2s',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };
  const itemDisabledStyle = { ...itemStyle, color: 'var(--text-secondary, #999)', cursor: 'not-allowed' };

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

          {/* Sign-in / sign-out + current user */}
          <AuthControls />

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
                transform: showSettings ? 'rotate(90deg)' : 'rotate(0deg)',
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
                minWidth: '240px',
                zIndex: 1000,
                overflow: 'hidden',
              }}>
                <div style={{ padding: '0.5rem 0' }}>
                  {/* MISMO actions — only enabled when viewing a specific loan */}
                  {currentLoanId ? (
                    <>
                      <button
                        onClick={handleDownloadMismo}
                        disabled={busyMismo}
                        style={itemStyle}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <FaFileDownload /> Download MISMO
                      </button>
                      <button
                        onClick={handleUploadClick}
                        disabled={busyMismo}
                        style={itemStyle}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        title="Upload a MISMO 3.4 XML file from LendingPad to update this loan"
                      >
                        <FaFileUpload /> Upload MISMO
                      </button>
                      <hr style={{ border: 0, borderTop: '1px solid var(--border-color, #eee)', margin: '0.25rem 0' }} />
                    </>
                  ) : (
                    <button disabled style={itemDisabledStyle} title="Open a specific loan to use these actions">
                      <FaFileUpload /> MISMO actions (open a loan first)
                    </button>
                  )}

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setShowSettings(false)}
                      style={{ ...itemStyle, textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <FaUserShield /> Admin
                    </Link>
                  )}
                  <button
                    onClick={() => { setShowSettings(false); alert('Settings coming soon!'); }}
                    style={itemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    General Settings
                  </button>
                  <button
                    onClick={() => { setShowSettings(false); alert('Preferences coming soon!'); }}
                    style={itemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    Preferences
                  </button>
                </div>
              </div>
            )}

            {/* Hidden file input — triggered by the Upload MISMO menu item */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,application/xml,text/xml"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
