/**
 * CognitoOtpAdapter — the REAL passwordless adapter (spec §5, the heart of P3).
 *
 * Speaks the raw Cognito USER_AUTH surface via `@aws-sdk/client-cognito-identity-provider`
 * (oidc-client-ts can't — it only does OAuth2 authorize/token). On success it mints the
 * oidc-client-ts session via `cognitoSession.mintSession`, so apiClient / RequireAuth /
 * react-oidc-context need ZERO change.
 *
 * NOTE (deviation from the spec's "throwing stub" premise): an interim *fetch*-based
 * EMAIL_OTP `requestCode/verifyCode` adapter had landed here before this phase. Per the
 * spec (authoritative), this rewrite supersedes it with the AWS SDK v3 + the widened
 * port contract + `mintSession`/`storeUser`. The legacy `requestCode/verifyCode` shape is
 * intentionally dropped in favor of `start/respond` (the spec's §5.2 state machine).
 *
 * Factors (spec §2):
 *   - EMAIL_OTP  — CONFIRMED against the live pool (the headline day-one factor).
 *   - WEB_AUTHN  — passkey sign-in + post-login enroll/list/delete. The pool's
 *                  WebAuthnConfiguration is owner-gated (not set yet) → ceremonies
 *                  won't succeed against the live pool until that lands. Built correctly
 *                  in advance; the version-sensitive key names are centralized below.
 *   - SMS_OTP    — designed-in but DEFERRED: `availableFactors()` OMITS it (spec §3.3).
 *                  Flip the SMS_ENABLED gate to true once §3.3 ops clears — one line.
 *
 * State machine (spec §5.2): choose-factor → start → (enter-code | passkey-ceremony) → done.
 *   start(username, factor) → { kind, factor, session, destination? }   (OTP: code emailed/texted)
 *   respond(state, response) → { user }                                 (OTP: {code}; passkey: {assertion})
 */
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  StartWebAuthnRegistrationCommand,
  CompleteWebAuthnRegistrationCommand,
  ListWebAuthnCredentialsCommand,
  DeleteWebAuthnCredentialCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoRegion, cognitoUserPoolClientId } from '../cognitoConfig';
import { Factor, isOtpFactor } from './factors';
import { mintSession } from './cognitoSession';
import { createPasskey, getPasskeyAssertion, isWebAuthnSupported } from '../webauthn';

/**
 * SMS gate (spec §3.3). KEEP FALSE until the SNS sandbox exit + 10DLC + spend-cap +
 * pool SMS-config (C5) all land. Flipping this to true is the ONLY change needed to
 * expose SMS in the chooser. Do not add other SMS conditionals — this is the seam.
 */
const SMS_ENABLED = false;

// ── Cognito USER_AUTH wire constants ─────────────────────────────────────────
// CONFIRMED against the live pool (spec hard requirement):
//   InitiateAuth AuthFlow=USER_AUTH, AuthParameters={USERNAME, PREFERRED_CHALLENGE}
//     → returns the EMAIL_OTP challenge.
//   RespondToAuthChallenge ChallengeName=EMAIL_OTP,
//     ChallengeResponses={USERNAME, EMAIL_OTP_CODE}.
const AUTH_FLOW_USER_AUTH = 'USER_AUTH';
const PARAM_USERNAME = 'USERNAME';
const PARAM_PREFERRED_CHALLENGE = 'PREFERRED_CHALLENGE';
const EMAIL_OTP_CODE = 'EMAIL_OTP_CODE';
const SMS_OTP_CODE = 'SMS_OTP_CODE';

// ⚠️ KEY-NAME PINNING (spec §5.3 + hard requirements): the WEB_AUTHN challenge
// parameter + response key names below are implemented to the AWS SDK v3 shape but
// are VERSION-SENSITIVE and MUST be pinned against the live pool during WebAuthn
// enablement. If a ceremony fails with InvalidParameter, re-confirm these against
// the actual ChallengeParameters Cognito returns and the RespondToAuthChallenge
// contract for ChallengeName=WEB_AUTHN.
const CHALLENGE_WEB_AUTHN = 'WEB_AUTHN';
// The JSON blob of PublicKeyCredentialRequestOptions Cognito returns on the
// WEB_AUTHN sign-in challenge (key name to pin):
const WEB_AUTHN_CREDENTIAL_REQUEST_OPTIONS = 'CREDENTIAL_REQUEST_OPTIONS';
// The response field holding the serialized assertion we send back (key to pin):
const WEB_AUTHN_RESPONSE_CREDENTIAL = 'CREDENTIAL';

let _client = null;
function client() {
  if (!_client) {
    // Public user-pool client — no credentials (unauthenticated browser SDK calls,
    // exactly as the funnel uses). region from cognitoConfig.
    _client = new CognitoIdentityProviderClient({ region: cognitoRegion });
  }
  return _client;
}

// Test seam.
function __setClientForTest(c) {
  _client = c;
}

export const CognitoOtpAdapter = {
  kind: 'cognito',

  /**
   * Which first factors to offer right now. The ONE gate (spec §3.3): SMS is hidden
   * until SMS_ENABLED flips. Passkey only when the platform supports WebAuthn.
   */
  availableFactors() {
    const factors = [];
    if (isWebAuthnSupported()) factors.push(Factor.PASSKEY);
    factors.push(Factor.EMAIL_OTP);
    if (SMS_ENABLED) factors.push(Factor.SMS_OTP); // DEFERRED — stays hidden
    return factors;
  },

  /**
   * Begin a sign-in. For OTP factors Cognito sends a code and we return the masked
   * destination + the challenge `Session` to thread into respond(). For passkey we
   * run navigator.credentials.get() inline and return a ready-to-respond state.
   */
  async start(username, factor = Factor.EMAIL_OTP) {
    if (factor === Factor.SMS_OTP && !SMS_ENABLED) {
      throw new Error('SMS factor is not enabled');
    }

    if (isOtpFactor(factor)) {
      // Headline funnel persona: a brand-new /continue borrower who has NEVER existed in
      // the pool. USER_AUTH InitiateAuth does NOT auto-provision (→ UserNotFound / generic
      // failure → locked out), so self-SignUp first. Idempotent: a returning user already
      // exists → UsernameExistsException is swallowed; then InitiateAuth emails/texts the code.
      await ensureSignedUp(username);
      const out = await client().send(
        new InitiateAuthCommand({
          AuthFlow: AUTH_FLOW_USER_AUTH,
          ClientId: cognitoUserPoolClientId,
          AuthParameters: {
            [PARAM_USERNAME]: username,
            [PARAM_PREFERRED_CHALLENGE]: factor, // EMAIL_OTP | SMS_OTP
          },
        })
      );
      return {
        kind: 'otp',
        factor,
        username,
        session: out.Session,
        challengeName: out.ChallengeName,
        // Masked destination, when Cognito returns CodeDeliveryDetails-style params.
        destination: out.ChallengeParameters?.CODE_DELIVERY_DESTINATION || null,
      };
    }

    if (factor === Factor.PASSKEY) {
      // Headless apps must collect the username before the WEB_AUTHN challenge
      // (no discoverable-credential autofill outside Managed Login) — spec §3.4.
      const init = await client().send(
        new InitiateAuthCommand({
          AuthFlow: AUTH_FLOW_USER_AUTH,
          ClientId: cognitoUserPoolClientId,
          AuthParameters: {
            [PARAM_USERNAME]: username,
            [PARAM_PREFERRED_CHALLENGE]: CHALLENGE_WEB_AUTHN,
          },
        })
      );
      const optionsJSON = parseWebAuthnOptions(
        init.ChallengeParameters?.[WEB_AUTHN_CREDENTIAL_REQUEST_OPTIONS]
      );
      // One-tap assertion ceremony — no code screen.
      const assertion = await getPasskeyAssertion(optionsJSON);
      return {
        kind: 'passkey',
        factor,
        username,
        session: init.Session,
        challengeName: init.ChallengeName || CHALLENGE_WEB_AUTHN,
        assertion,
      };
    }

    throw new Error(`Unsupported factor: ${factor}`);
  },

  /**
   * Complete the challenge. OTP: response={code}. Passkey: response may carry an
   * `{assertion}`, else the assertion captured in start() is reused. On success
   * mints the oidc-client-ts session and returns { user }.
   */
  async respond(state, response = {}) {
    if (!state) throw new Error('respond() requires the state from start()');

    let challengeName;
    let challengeResponses;

    if (state.kind === 'otp') {
      const codeKey = state.factor === Factor.SMS_OTP ? SMS_OTP_CODE : EMAIL_OTP_CODE;
      const code = response.code;
      if (!code) throw new Error('respond() requires a code for OTP factors');
      challengeName = state.challengeName || state.factor; // EMAIL_OTP | SMS_OTP
      challengeResponses = {
        [PARAM_USERNAME]: state.username,
        [codeKey]: code,
      };
    } else if (state.kind === 'passkey') {
      const assertion = response.assertion || state.assertion;
      if (!assertion) throw new Error('respond() requires a passkey assertion');
      challengeName = CHALLENGE_WEB_AUTHN;
      challengeResponses = {
        [PARAM_USERNAME]: state.username,
        // ⚠️ key name pinned to CREDENTIAL — re-confirm at WebAuthn enablement.
        [WEB_AUTHN_RESPONSE_CREDENTIAL]: JSON.stringify(assertion),
      };
    } else {
      throw new Error(`Unsupported challenge state: ${state.kind}`);
    }

    const out = await client().send(
      new RespondToAuthChallengeCommand({
        ClientId: cognitoUserPoolClientId,
        ChallengeName: challengeName,
        Session: state.session,
        ChallengeResponses: challengeResponses,
      })
    );

    if (!out.AuthenticationResult) {
      // A follow-on challenge (unexpected in the day-one factors) — surface it so
      // the caller can decide; we don't silently swallow.
      const err = new Error('Authentication not complete — additional challenge required');
      err.challengeName = out.ChallengeName;
      err.session = out.Session;
      throw err;
    }

    const user = await mintSession(out.AuthenticationResult);
    return { user };
  },

  // ── Passkey management (post-login, access-token auth; scope
  //    aws.cognito.signin.user.admin) — spec §3.4 / §5 SecurityPage. ────────────

  /**
   * Enroll a passkey for the signed-in user. `accessToken` is the Cognito access
   * token (id_token won't carry the user-admin scope). Runs the registration
   * ceremony, then completes it server-side.
   */
  async registerPasskey(accessToken) {
    if (!accessToken) throw new Error('registerPasskey requires an access token');
    const start = await client().send(
      new StartWebAuthnRegistrationCommand({ AccessToken: accessToken })
    );
    // SDK v3 returns CredentialCreationOptions as a structured document; normalize
    // to the JSON the WebAuthn ceremony expects.
    const optionsJSON = parseWebAuthnOptions(start.CredentialCreationOptions);
    const attestation = await createPasskey(optionsJSON);
    await client().send(
      new CompleteWebAuthnRegistrationCommand({
        AccessToken: accessToken,
        // ⚠️ key name (Credential) pinned to the SDK v3 shape — confirm at enablement.
        Credential: attestation,
      })
    );
    return { ok: true };
  },

  /** List the signed-in user's enrolled passkeys. */
  async listPasskeys(accessToken) {
    if (!accessToken) throw new Error('listPasskeys requires an access token');
    const out = await client().send(
      new ListWebAuthnCredentialsCommand({ AccessToken: accessToken })
    );
    return out.Credentials || [];
  },

  /** Delete one enrolled passkey by credential id. */
  async deletePasskey(accessToken, credentialId) {
    if (!accessToken) throw new Error('deletePasskey requires an access token');
    if (!credentialId) throw new Error('deletePasskey requires a credentialId');
    await client().send(
      new DeleteWebAuthnCredentialCommand({
        AccessToken: accessToken,
        CredentialId: credentialId,
      })
    );
    return { ok: true };
  },

  // Test-only seam.
  __setClientForTest,
};

/**
 * Idempotent self-SignUp so a brand-new funnel borrower exists before InitiateAuth.
 * Swallows ONLY UsernameExistsException (the returning-user case) — any other error
 * propagates so genuine failures surface rather than becoming a generic "no code".
 */
async function ensureSignedUp(username) {
  try {
    await client().send(
      new SignUpCommand({
        ClientId: cognitoUserPoolClientId,
        Username: username,
        Password: throwawayPassword(),
        UserAttributes: [{ Name: 'email', Value: username }],
      })
    );
  } catch (e) {
    if (e?.name !== 'UsernameExistsException') throw e;
  }
}

/**
 * A throwaway password the borrower never uses (passwordless), strong enough for any
 * pool policy. Security-bearing → crypto.getRandomValues, NEVER Math.random. The literal
 * "Aa1!" prefix guarantees upper/lower/digit/symbol; the random tail guarantees length+entropy.
 */
function throwawayPassword() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  let b64 = '';
  for (const b of bytes) b64 += String.fromCharCode(b);
  return 'Aa1!' + btoa(b64).replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Normalize a WebAuthn options blob (string JSON, or an already-parsed object) into
 * a plain object the @simplewebauthn ceremony can consume. Cognito may hand back
 * either a JSON string (challenge params) or a structured document (SDK command output).
 */
function parseWebAuthnOptions(raw) {
  if (raw == null) throw new Error('missing WebAuthn options from Cognito');
  if (typeof raw === 'string') return JSON.parse(raw);
  return raw;
}

export default CognitoOtpAdapter;
