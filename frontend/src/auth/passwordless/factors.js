/**
 * Passwordless first-factor enum + labels.
 *
 * Spec §2.2: factor preference ordering in every UI is Passkey > Email OTP > SMS OTP.
 * SMS is a designed-in *seam* but DEFERRED (spec §3.3 — needs SNS sandbox exit + 10DLC).
 *
 * The single gate that hides SMS today is the adapter's `availableFactors()` (it omits SMS).
 * Enabling SMS later is a one-line flip there — this enum already carries it. Do NOT key any
 * "is SMS live?" decision off this enum; key it off `availableFactors()`.
 */
export const Factor = Object.freeze({
  PASSKEY: 'WEB_AUTHN',  // Cognito AuthFlow challenge name for WebAuthn
  EMAIL_OTP: 'EMAIL_OTP',
  SMS_OTP: 'SMS_OTP',
});

/** Human labels for the chooser UI. */
export const FACTOR_LABELS = Object.freeze({
  [Factor.PASSKEY]: 'Passkey (Face ID / Touch ID)',
  [Factor.EMAIL_OTP]: 'Email me a code',
  [Factor.SMS_OTP]: 'Text me a code',
});

/** Preference ordering (spec §2.2). Lower index = preferred. */
export const FACTOR_ORDER = Object.freeze([Factor.PASSKEY, Factor.EMAIL_OTP, Factor.SMS_OTP]);

/** True if the factor is a code-delivery (OTP) factor (email or SMS) vs the passkey ceremony. */
export function isOtpFactor(factor) {
  return factor === Factor.EMAIL_OTP || factor === Factor.SMS_OTP;
}
