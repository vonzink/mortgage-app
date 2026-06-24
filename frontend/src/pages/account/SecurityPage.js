import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { toast } from 'react-toastify';
import Button from '../../components/design/Button';
import { getPasswordlessAuth } from '../../auth/passwordless/PasswordlessAuthPort';
import { isWebAuthnSupported } from '../../auth/webauthn';
import '../ContinuePage.design.css';

/**
 * SecurityPage (spec §5.1 / §2.1) — RequireAuth-gated "secure your account" screen.
 *
 * The ONLY strong-auth tier we expose to passwordless users is PASSKEYS. Per §2.1 we
 * deliberately do NOT offer classic TOTP / SMS-MFA enrollment (enrolling classic MFA
 * silently disables passwordless first factors in Cognito). "Add MFA" == "Add a passkey".
 *
 * Passkey ops use the Cognito ACCESS token (scope aws.cognito.signin.user.admin) — not
 * the id_token. We read it from react-oidc-context's user.
 */
export default function SecurityPage() {
  const auth = useAuth();
  const passwordless = useMemo(() => getPasswordlessAuth(), []);
  const accessToken = auth.user?.access_token;
  const supported = isWebAuthnSupported();

  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const list = await passwordless.listPasskeys(accessToken);
      setPasskeys(Array.isArray(list) ? list : []);
    } catch {
      // Pool WebAuthn config is owner-gated; listing may fail until enabled — degrade quietly.
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, passwordless]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enroll = async () => {
    setBusy(true);
    try {
      await passwordless.registerPasskey(accessToken);
      toast.success('Passkey added.');
      await refresh();
    } catch {
      toast.error('Could not add a passkey. Try again on a device with Face ID / Touch ID.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (credentialId) => {
    setBusy(true);
    try {
      await passwordless.deletePasskey(accessToken, credentialId);
      toast.success('Passkey removed.');
      await refresh();
    } catch {
      toast.error('Could not remove that passkey. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page continue-page">
      <h1 className="continue-h1">Account security</h1>
      <p className="muted">
        Add a passkey to sign in with Face ID, Touch ID, or your device PIN — the strongest,
        simplest way to protect your account. We recommend adding at least two.
      </p>

      <div className="continue-summary card">
        {!supported && (
          <p className="muted">
            This device or browser doesn&apos;t support passkeys. Try a device with Face ID,
            Touch ID, or Windows Hello.
          </p>
        )}

        {supported && (
          <>
            <Button variant="primary" disabled={busy || !accessToken} onClick={enroll}>
              Add a passkey
            </Button>

            <div style={{ marginTop: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Your passkeys</h2>
              {loading ? (
                <p className="muted">Loading…</p>
              ) : passkeys.length === 0 ? (
                <p className="muted">No passkeys yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {passkeys.map((pk) => (
                    <li
                      key={pk.CredentialId || pk.credentialId}
                      className="continue-row"
                      style={{ alignItems: 'center' }}
                    >
                      <span className="continue-val">
                        {pk.FriendlyCredentialName || pk.friendlyCredentialName || 'Passkey'}
                      </span>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={busy}
                        onClick={() => remove(pk.CredentialId || pk.credentialId)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
