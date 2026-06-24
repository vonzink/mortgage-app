/**
 * WebAuthn helpers — base64url ↔ ArrayBuffer codecs + thin wrappers over the
 * `navigator.credentials.create/get` ceremonies, delegating the fiddly option/
 * response (de)serialization to `@simplewebauthn/browser`.
 *
 * Spec §3.4 / §5.4: WebAuthn requires a secure context (HTTPS; localhost is the
 * only HTTP exception). RP-ID is `msfgco.com` in prod (see cognitoConfig). The
 * pool's WebAuthnConfiguration is owner-gated (not set yet), so ceremonies won't
 * succeed against the live pool until that lands — this code is built correctly
 * in advance.
 *
 * ⚠️ KEY-NAME PINNING (spec §5.3): the exact challenge-parameter key names Cognito
 * returns for the WEB_AUTHN register/authenticate challenges (e.g. the JSON blob
 * holding PublicKeyCredentialCreationOptions / RequestOptions, and the response
 * field name `CREDENTIAL`) are version-sensitive and MUST be pinned against the
 * live pool during enablement. The adapter centralizes those names; these helpers
 * only do the standards-based codec/ceremony work.
 */
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

/** base64url string → ArrayBuffer. */
export function base64urlToArrayBuffer(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** ArrayBuffer (or typed array) → base64url string (no padding). */
export function arrayBufferToBase64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** True when the platform exposes the WebAuthn API in a usable (secure) context. */
export function isWebAuthnSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    browserSupportsWebAuthn()
  );
}

/**
 * Registration ceremony. `creationOptionsJSON` is the
 * PublicKeyCredentialCreationOptionsJSON object Cognito returns from
 * StartWebAuthnRegistration (already base64url-encoded per the WebAuthn JSON
 * serialization). Returns the attestation response JSON to POST back to
 * CompleteWebAuthnRegistration.
 */
export async function createPasskey(creationOptionsJSON) {
  // @simplewebauthn/browser v13 takes { optionsJSON } and returns the JSON-shaped response.
  return startRegistration({ optionsJSON: creationOptionsJSON });
}

/**
 * Authentication (assertion) ceremony. `requestOptionsJSON` is the
 * PublicKeyCredentialRequestOptionsJSON Cognito returns on the WEB_AUTHN
 * sign-in challenge. Returns the assertion response JSON for RespondToAuthChallenge.
 */
export async function getPasskeyAssertion(requestOptionsJSON) {
  return startAuthentication({ optionsJSON: requestOptionsJSON });
}
