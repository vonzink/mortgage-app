import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import Icon from '../components/design/Icon';
import Button from '../components/design/Button';
import { buildCognitoSignupUrl } from '../auth/cognitoConfig';
import './LandingPage.design.css';

/**
 * Public landing page at `/`. Two paths:
 *   - Sign in  → react-oidc-context's signinRedirect (Cognito hosted UI /login)
 *   - Create account → manual redirect to Cognito hosted UI /signup
 *
 * If the user is already authenticated, bounce them straight to /applications.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/applications', { replace: true });
    }
  }, [auth.isAuthenticated, navigate]);

  const handleSignIn = () => {
    auth.signinRedirect({
      state: { returnTo: '/applications' },
    });
  };

  const handleSignUp = () => {
    // Cognito's hosted UI signup tab — preserves the OAuth round-trip params
    // so we still get a code grant back to /auth/callback.
    window.location.href = buildCognitoSignupUrl();
  };

  return (
    <div className="page landing-page">
      <div className="landing-grid">
        {/* Left — marketing pitch */}
        <div className="landing-pitch">
          <div className="eyebrow">MSFG Mortgage Suite</div>
          <h1 className="landing-h1">
            A mortgage, with the<br />paperwork out of the way.
          </h1>
          <p className="landing-lede">
            Apply online in about 20 minutes. Upload documents from your phone.
            Track your loan from application through funded — without the back-and-forth.
          </p>

          <ul className="landing-bullets">
            <li><Icon name="check" size={16} stroke={2} /> Save your progress and finish later</li>
            <li><Icon name="check" size={16} stroke={2} /> Secure document uploads, auto-sorted</li>
            <li><Icon name="check" size={16} stroke={2} /> Real-time status on every milestone</li>
            <li><Icon name="check" size={16} stroke={2} /> Direct line to your loan officer</li>
          </ul>
        </div>

        {/* Right — auth card */}
        <div className="landing-auth-col">
          <div className="card landing-auth-card">
            <div className="landing-auth-head">
              <h2 className="landing-auth-h2">Get started</h2>
              <p className="muted landing-auth-sub">
                Pick up where you left off, or start a new application today.
              </p>
            </div>

            <div className="landing-auth-actions">
              <Button variant="primary" size="lg" onClick={handleSignUp} className="landing-cta">
                <Icon name="plus" size={14} stroke={2} /> Create an account
              </Button>
              <Button size="lg" onClick={handleSignIn} className="landing-cta">
                <Icon name="user" size={14} /> Sign in
              </Button>
            </div>

            <div className="landing-divider"><span>or</span></div>

            <p className="muted landing-fineprint">
              Already have a draft from a loan officer? Sign in with the email they used to invite you.
            </p>
          </div>

          <div className="landing-trust">
            <Icon name="key" size={14} /> Bank-grade encryption · No credit card required to start
          </div>
        </div>
      </div>

      {/* Secondary band — three feature cards */}
      <div className="landing-features">
        <FeatureCard
          icon="doc"
          title="One application, all the borrowers"
          text="Add a co-borrower in 30 seconds. Each person fills their section on their own device — no shared logins."
        />
        <FeatureCard
          icon="folder"
          title="Paperwork that sorts itself"
          text="Drop a paystub, a W-2, a bank statement. We file each one into the right folder for your loan officer."
        />
        <FeatureCard
          icon="chart"
          title="No more 'just checking in' emails"
          text="Every status change shows up on your dashboard. Conditions, appraisal, clear-to-close — all in one place."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="card card-pad landing-feature">
      <div className="landing-feature-icon">
        <Icon name={icon} size={20} stroke={1.6} />
      </div>
      <h3 className="landing-feature-title">{title}</h3>
      <p className="muted landing-feature-text">{text}</p>
    </div>
  );
}
