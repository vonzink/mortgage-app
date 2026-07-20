import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import mortgageService from '../../services/mortgageService';
import Button from '../../components/design/Button';
import Icon from '../../components/design/Icon';
import './LoPage.design.css';

/**
 * Public LO vanity landing page at /lo/:slug (NOT RequireAuth-wrapped).
 *
 * A prospect who follows a loan officer's link sees the LO's public card
 * (suite GET /api/public/lo-pages/{slug} — display fields only, no auth) and a
 * "Start your application" CTA. Starting stashes the slug in sessionStorage
 * ('loSlug') so the eventual POST /loans/intake attributes the loan to this LO
 * (org-guarded server-side, never fails the intake), then routes cold visitors
 * to /signup (Cognito hosted signup) and signed-in users straight to /apply.
 *
 * Unknown/disabled slug → the service swallows the 404 to null → redirect home.
 */

// Local copy of ApplyChrome's initials helper (that component is unmounted/dead —
// don't import from it). "Zack Zink" → "ZZ"; empty → "LO".
const initialsOf = (name) => {
  if (!name) return 'LO';
  return (name.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase();
};

export default function LoPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  // Defensive: useAuth() is undefined outside an AuthProvider (some test/render
  // trees) — treat as signed-out (useRoles pattern).
  const auth = useAuth();

  // The suite lookup is case-forgiving and the intake resolver normalizes too —
  // normalize once here and use it consistently for both the fetch and the stash.
  const normalizedSlug = (slug || '').trim().toLowerCase();

  const [lo, setLo] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const page = await mortgageService.getPublicLoPage(normalizedSlug);
        if (!stale) setLo(page);
      } catch {
        // The service already swallows 404s to null; this guards a future
        // throw path so the prospect gets the home redirect, not a blank page.
        if (!stale) setLo(null);
      }
    })();
    return () => { stale = true; };
  }, [normalizedSlug]);

  // Unknown/disabled slug: nothing to show a prospect — send them to the
  // regular landing page rather than a dead end.
  useEffect(() => {
    if (lo === null) navigate('/', { replace: true });
  }, [lo, navigate]);

  if (lo === undefined) {
    return (
      <div className="page lo-page">
        <div className="lo-page-wrap">
          <div className="dim lo-page-loading">Loading…</div>
        </div>
      </div>
    );
  }
  if (lo === null) return null; // redirecting home (effect above)

  const start = () => {
    // Stash BEFORE navigating — the intake call sites (ContinuePage funnel tail +
    // ApplicationForm borrower self-materialize) read 'loSlug' from sessionStorage.
    sessionStorage.setItem('loSlug', normalizedSlug);
    navigate(auth?.isAuthenticated ? '/apply' : '/signup');
  };

  const metaLine = [lo.title, lo.nmlsId ? `NMLS #${lo.nmlsId}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="page lo-page">
      <div className="lo-page-wrap">
        <div className="eyebrow">Your loan officer</div>

        <div className="card card-pad lo-card">
          <div className="lo-card-head">
            {lo.photoUrl ? (
              <img className="lo-card-photo" src={lo.photoUrl} alt={lo.displayName} />
            ) : (
              <div className="av av-copper lo-card-av" aria-hidden="true">
                {initialsOf(lo.displayName)}
              </div>
            )}
            <div>
              <h1 className="lo-card-name">{lo.displayName}</h1>
              {metaLine ? <div className="dim lo-card-meta">{metaLine}</div> : null}
            </div>
          </div>

          {(lo.phone || lo.email) && (
            <div className="lo-card-contacts">
              {lo.phone ? (
                <a className="lo-card-contact" href={`tel:${lo.phone}`}>
                  <Icon name="phone" size={14} stroke={1.8} /> {lo.phone}
                </a>
              ) : null}
              {lo.email ? (
                <a className="lo-card-contact" href={`mailto:${lo.email}`}>
                  <Icon name="mail" size={14} stroke={1.8} /> {lo.email}
                </a>
              ) : null}
            </div>
          )}

          <div className="hr lo-card-hr" />

          <Button variant="primary" size="lg" className="lo-card-cta" onClick={start}>
            Start your application
          </Button>
          <div className="dim lo-card-sub">
            About 20 minutes · save your progress and finish later
          </div>
        </div>
      </div>
    </div>
  );
}
