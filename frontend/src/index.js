import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import './index.css';
import App from './App';
import { cognitoOidcConfig } from './auth/cognitoConfig';

// After Cognito redirects back, strip the ?code=…&state=… so the URL is clean
// and a refresh doesn't try to re-process the auth response.
const onSigninCallback = () => {
  window.history.replaceState({}, document.title, window.location.pathname);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoOidcConfig} onSigninCallback={onSigninCallback}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
