import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Header from './components/Header';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationList from './pages/ApplicationList';
import ApplicationDetails from './pages/ApplicationDetails';

// Auth
import RequireAuth from './auth/RequireAuth';

// Styles
import './App.css';

/**
 * Listens for the `auth:expired` event dispatched by apiClient on 401 and
 * triggers a fresh sign-in redirect. Keeps each call site free of auth logic.
 */
function AuthExpiredListener() {
  const auth = useAuth();
  useEffect(() => {
    const handler = () => {
      if (!auth.activeNavigator) auth.signinRedirect();
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [auth]);
  return null;
}

/**
 * Cognito redirect target. AuthProvider's onSigninCallback already stripped
 * the query string; we just send the user somewhere useful.
 */
function AuthCallback() {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (auth.isAuthenticated) navigate('/applications', { replace: true });
  }, [auth.isAuthenticated, navigate]);
  return <div style={{ padding: '2rem' }}>Signing in…</div>;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthExpiredListener />
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={<ApplicationForm />} />
            <Route path="/apply" element={<RequireAuth><ApplicationForm /></RequireAuth>} />
            <Route path="/applications" element={<RequireAuth><ApplicationList /></RequireAuth>} />
            <Route path="/applications/:id" element={<RequireAuth><ApplicationDetails /></RequireAuth>} />
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
