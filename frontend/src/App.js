import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import TopBar from './components/design/TopBar';
import RequireAuth from './auth/RequireAuth';
import SharedSessionCookieSync from './auth/SharedSessionCookieSync';

// Pages
import LandingPage from './pages/LandingPage';
import AuthRedirect from './pages/AuthRedirect';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationSubmitted from './pages/ApplicationSubmitted';
import ApplicationList from './pages/ApplicationList';
import ApplicationDetails from './pages/ApplicationDetails';
import LoanStatusCenter from './pages/statusCenter/LoanStatusCenter';
import ClientView from './pages/clientView/ClientView';
import LoanSuiteRedirect from './pages/LoanSuiteRedirect';
import AdminHome from './pages/admin/AdminHome';
import AppSettingsAdmin from './pages/admin/AppSettingsAdmin';
import ContinuePage from './pages/ContinuePage';
import SignInPage from './pages/SignInPage';
import LoPage from './pages/loPage/LoPage';
import SecurityPage from './pages/account/SecurityPage';

// Hooks / services
import useRoles from './hooks/useRoles';
import { redirectStaffToConsole } from './auth/consoleHandoff';
import { suiteWebUrl } from './services/suiteWeb';

// Styles
import './App.css';

/**
 * Listens for `auth:expired` events from {@link apiClient} (a 401 came back from the API).
 * Routes the user through Cognito sign-in again. The form drafts in sessionStorage survive
 * the round-trip, so anything they were typing is still there when they land back.
 */
function AuthExpiredListener() {
  const auth = useAuth();
  useEffect(() => {
    const handler = () => {
      // Show a friendly toast so the user understands what's about to happen
      toast.warn('Session expired — signing you back in. Your work has been saved.', { autoClose: 4000 });
      // Save where the user is so we can return them after re-auth
      const returnTo = window.location.pathname + window.location.search;
      // Brief delay so the toast renders before the redirect
      setTimeout(() => {
        auth.signinRedirect({ state: { returnTo } }).catch(() => {});
      }, 500);
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [auth]);
  return null;
}

/**
 * Cognito redirects back to /auth/callback after sign-in. The AuthProvider in index.js
 * handles the code-exchange transparently — we just need a route at this path so the
 * redirect doesn't 404. Once auth state settles, send the user to their loans.
 */
function AuthCallback() {
  const auth = useAuth();
  const { isStaff } = useRoles();
  // Staff work loans in the suite console — forward them there after sign-in
  // (borrowers/agents keep their in-app loans). The SSO cookie is written first.
  const staffToConsole = auth.isAuthenticated && isStaff && !!suiteWebUrl();
  useEffect(() => {
    if (staffToConsole) redirectStaffToConsole(auth.user);
  }, [staffToConsole, auth.user]);

  if (auth.isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Finishing sign-in…</div>;
  }
  if (auth.error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Sign-in error</h2>
        <p style={{ color: '#a8423a' }}>{auth.error.message}</p>
      </div>
    );
  }
  if (staffToConsole) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Opening the console…</div>;
  }
  return <Navigate to="/applications" replace />;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthExpiredListener />
      <SharedSessionCookieSync />
      <div className="App msfg">
        <TopBar />
        <main className="main-content">
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Public marketing landing — sign in / create account CTAs.
                Authenticated users get bounced to /applications by LandingPage itself. */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login"  element={<AuthRedirect mode="login" />} />
            <Route path="/signup" element={<AuthRedirect mode="signup" />} />
            {/* First-class passwordless sign-in (replaces the Hosted-UI redirect) */}
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/continue" element={<ContinuePage />} />
            {/* Public LO vanity page — the LO's shareable link. Stashes the slug for
                intake attribution, then routes into signup (cold) or /apply (signed in). */}
            <Route path="/lo/:slug" element={<LoPage />} />

            <Route
              path="/apply"
              element={<RequireAuth><ApplicationForm /></RequireAuth>}
            />
            <Route
              path="/application-submitted"
              element={<RequireAuth><ApplicationSubmitted /></RequireAuth>}
            />
            <Route
              path="/dashboard"
              element={<RequireAuth><LoanStatusCenter /></RequireAuth>}
            />
            <Route
              path="/applications"
              element={<RequireAuth><ApplicationList /></RequireAuth>}
            />
            <Route
              path="/applications/:id"
              element={<RequireAuth><ApplicationDetails /></RequireAuth>}
            />
            {/* Staff "see it as the client sees it" preview for one suite loan. */}
            <Route
              path="/client-view/:loanId"
              element={<RequireAuth><ClientView /></RequireAuth>}
            />
            {/* Retired LO loan dashboard → forwards to the suite console loan
                workspace (the route param is already a suite loan id). */}
            <Route
              path="/loan/:loanId"
              element={<RequireAuth><LoanSuiteRedirect /></RequireAuth>}
            />

            {/* Admin — backend enforces Admin role; frontend gate is UX only */}
            <Route path="/admin" element={<RequireAuth><AdminHome /></RequireAuth>} />
            <Route path="/admin/settings" element={<RequireAuth><AppSettingsAdmin /></RequireAuth>} />
            {/* Account security — passkey enroll/list/delete (no classic MFA) */}
            <Route path="/account/security" element={<RequireAuth><SecurityPage /></RequireAuth>} />
            {/* Common typo / link-out — canonical route is /admin/settings */}
            <Route path="/admin/app-settings" element={<Navigate to="/admin/settings" replace />} />
          </Routes>
        </main>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App;
