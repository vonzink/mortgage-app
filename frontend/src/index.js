import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/hanken-grotesk/800.css';
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
