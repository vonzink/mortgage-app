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
import { adoptSharedSession } from './auth/sharedSession';

const root = ReactDOM.createRoot(document.getElementById('root'));

// After Cognito redirects back with ?code=...&state=..., strip those query params
// from the URL so refresh/back-navigation doesn't try to re-redeem the code.
const onSigninCallback = () => {
  window.history.replaceState({}, document.title, window.location.pathname);
};

// Before first render: if a STAFF user arrived from the suite ("Open in borrower app") with no
// live local session, adopt the shared .msfgco.com msfg_sso cookie so they land signed in instead
// of at the login screen. Any failure falls through to the normal login UI. Mirrors the suite
// console's boot-time adoption (main.tsx).
async function boot() {
  try {
    await adoptSharedSession();
  } catch {
    /* fall through to the normal login UI */
  }
  root.render(
    <React.StrictMode>
      <AuthProvider {...cognitoConfig} onSigninCallback={onSigninCallback}>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}

boot();
