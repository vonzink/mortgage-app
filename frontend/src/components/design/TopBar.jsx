import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { toast } from 'react-toastify';
import Icon from './Icon';
import useRoles from '../../hooks/useRoles';
import mortgageService from '../../services/mortgageService';
import { buildCognitoLogoutUrl } from '../../auth/cognitoConfig';

/**
 * Design-system TopBar — replaces the legacy Header. Preserves all auth +
 * MISMO + admin functionality that lived in Header.js.
 *
 * Active-route detection drives the `.active` nav style; auto-detects from the
 * current URL so callers don't need to manage state.
 */
function detectActive(pathname) {
  if (pathname.startsWith('/apply')) return 'apply';
  if (pathname.startsWith('/applications') || pathname.startsWith('/loan')) return 'applications';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
}

function useCurrentLoanId() {
  const { pathname } = useLocation();
  const m = pathname.match(/^\/applications\/(\d+)/) || pathname.match(/^\/loan\/(\d+)/);
  return m ? m[1] : null;
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { isAdmin } = useRoles();
  const active = detectActive(location.pathname);
  const currentLoanId = useCurrentLoanId();

  const [showSettings, setShowSettings] = useState(false);
  const [busyMismo, setBusyMismo] = useState(false);
  const settingsRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const profile = auth.user?.profile || {};
  const displayName = profile.name || profile.email || '';
  const initials = (displayName.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase() || 'U';

  // ── MISMO download (only when viewing a specific loan) ─────────────────
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
  const handleUploadClick = () => {
    setShowSettings(false);
    if (!currentLoanId) return;
    fileInputRef.current?.click();
  };
  const runImport = async (file, force) => {
    try {
      setBusyMismo(true);
      const result = await mortgageService.importMismo(currentLoanId, file, { force });
      toast.success(`MISMO imported. ${result.changeCount} field${result.changeCount === 1 ? '' : 's'} updated.`);
      window.dispatchEvent(new CustomEvent('mismo:imported', { detail: { loanId: currentLoanId } }));
    } catch (e) {
      if (e.message === 'drift_detected') {
        const fileTime = e.drift?.fileCreatedDatetime ? new Date(e.drift.fileCreatedDatetime).toLocaleString() : 'unknown';
        const appTime  = e.drift?.applicationUpdatedDate ? new Date(e.drift.applicationUpdatedDate).toLocaleString() : 'unknown';
        const proceed = window.confirm(
          `This MISMO file was generated at:\n  ${fileTime}\n\nThe application was last modified at:\n  ${appTime}\n\nImporting will overwrite changes made since the file was generated.\n\nContinue?`,
        );
        if (proceed) await runImport(file, true);
        else toast.info('MISMO import cancelled.');
      } else {
        toast.error(`MISMO import failed: ${e.message || e}`);
      }
    } finally {
      setBusyMismo(false);
    }
  };
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentLoanId) return;
    await runImport(file, false);
  };

  const handleSignIn = () => auth.signinRedirect();
  const handleSignOut = async () => {
    await auth.removeUser();
    window.location.href = buildCognitoLogoutUrl();
  };

  return (
    <header className="topbar">
      <Link to="/applications" className="brand">
        <div className="brand-mark">M</div>
        <span>MSFG</span>
        <small>Mortgage Suite</small>
      </Link>

      <nav className="topnav">
        <Link to="/apply" className={active === 'apply' ? 'active' : ''}>
          <Icon name="doc" size={14} /> Apply
        </Link>
        <Link to="/applications" className={active === 'applications' ? 'active' : ''}>
          <Icon name="folder" size={14} /> Applications
        </Link>
        {isAdmin && (
          <Link to="/admin" className={active === 'admin' ? 'active' : ''}>
            <Icon name="settings" size={14} /> Admin
          </Link>
        )}
      </nav>

      <div className="top-right">
        {auth.isLoading && <span style={{ opacity: 0.6, fontSize: 13 }}>…</span>}

        {!auth.isLoading && !auth.isAuthenticated && (
          <button type="button" className="top-icon-btn" onClick={handleSignIn} title="Sign in" style={{ width: 'auto', padding: '0 12px', fontSize: 13 }}>
            Sign in
          </button>
        )}

        {auth.isAuthenticated && (
          <>
            <div className="top-user" title={displayName}>
              <div className="av">{initials}</div>
              <span>{displayName.split('@')[0] || 'User'}</span>
            </div>

            <div ref={settingsRef} style={{ position: 'relative' }}>
              <button type="button" className="top-icon-btn" onClick={() => setShowSettings((v) => !v)} title="Settings">
                <Icon name="settings" size={16} />
              </button>
              {showSettings && (
                <div role="menu" className="topbar-menu">
                  {currentLoanId ? (
                    <>
                      <button type="button" className="topbar-menu-item" disabled={busyMismo} onClick={handleDownloadMismo}>
                        <Icon name="download" size={14} /> Download MISMO
                      </button>
                      <button type="button" className="topbar-menu-item" disabled={busyMismo} onClick={handleUploadClick}>
                        <Icon name="upload" size={14} /> Upload MISMO
                      </button>
                      <div className="topbar-menu-divider" />
                    </>
                  ) : (
                    <div className="topbar-menu-hint">Open a loan to access MISMO actions</div>
                  )}
                  <button type="button" className="topbar-menu-item" onClick={() => { setShowSettings(false); navigate('/applications'); }}>
                    <Icon name="folder" size={14} /> My applications
                  </button>
                  {isAdmin && (
                    <button type="button" className="topbar-menu-item" onClick={() => { setShowSettings(false); navigate('/admin'); }}>
                      <Icon name="settings" size={14} /> Admin
                    </button>
                  )}
                  <div className="topbar-menu-divider" />
                  <button type="button" className="topbar-menu-item" onClick={handleSignOut}>
                    <Icon name="key" size={14} /> Sign out
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,application/xml,text/xml"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
