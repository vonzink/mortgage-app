import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import TopBar from './components/design/TopBar';
import RequireAuth from './auth/RequireAuth';

// Pages
import LandingPage from './pages/LandingPage';
import AuthRedirect from './pages/AuthRedirect';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationList from './pages/ApplicationList';
import ApplicationDetails from './pages/ApplicationDetails';
import LoanDashboardPage from './pages/LoanDashboardPage';
import AdminHome from './pages/admin/AdminHome';
import DocumentTypesAdmin from './pages/admin/DocumentTypesAdmin';
import FolderTemplatesAdmin from './pages/admin/FolderTemplatesAdmin';

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
  if (auth.isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Finishing sign-in…</div>;
  }
  if (auth.error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Sign-in error</h2>
        <p style={{ color: '#b91c1c' }}>{auth.error.message}</p>
      </div>
    );
  }
  return <Navigate to="/applications" replace />;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthExpiredListener />
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

            <Route
              path="/apply"
              element={<RequireAuth><ApplicationForm /></RequireAuth>}
            />
            <Route
              path="/applications"
              element={<RequireAuth><ApplicationList /></RequireAuth>}
            />
            <Route
              path="/applications/:id"
              element={<RequireAuth><ApplicationDetails /></RequireAuth>}
            />
            {/* Loan Dashboard — LO-side view, separate from the borrower URLA. */}
            <Route
              path="/loan/:loanId"
              element={<RequireAuth><LoanDashboardPage /></RequireAuth>}
            />

            {/* Admin — backend enforces Admin role; frontend gate is UX only */}
            <Route path="/admin" element={<RequireAuth><AdminHome /></RequireAuth>} />
            <Route path="/admin/document-types" element={<RequireAuth><DocumentTypesAdmin /></RequireAuth>} />
            <Route path="/admin/folder-templates" element={<RequireAuth><FolderTemplatesAdmin /></RequireAuth>} />
          </Routes>
        </main>
        <ToastContainer
          position="top-right"
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
