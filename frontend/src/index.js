import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import './index.css';
import App from './App';
import { cognitoConfig } from './auth/cognitoConfig';

const root = ReactDOM.createRoot(document.getElementById('root'));

// After Cognito redirects back with ?code=...&state=..., strip those query params
// from the URL so refresh/back-navigation doesn't try to re-redeem the code.
const onSigninCallback = () => {
  window.history.replaceState({}, document.title, window.location.pathname);
};

root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoConfig} onSigninCallback={onSigninCallback}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
