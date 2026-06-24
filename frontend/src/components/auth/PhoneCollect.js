import React from 'react';

/**
 * PhoneCollect — E.164 phone capture for the SMS factor (spec §5.1).
 *
 * Only reachable when SMS is live (FactorChooser routes here for Factor.SMS_OTP, and
 * SMS is hidden today via the adapter's availableFactors gate — §3.3). Kept minimal:
 * normalizes to a +1XXXXXXXXXX E.164 string for US numbers as the user types.
 */
export default function PhoneCollect({ value, onChange }) {
  const handle = (e) => {
    onChange(toE164(e.target.value));
  };
  return (
    <div className="phone-collect">
      <label htmlFor="factor-phone">Mobile number</label>
      <input
        id="factor-phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+1 555 123 4567"
        value={value}
        onChange={handle}
      />
      <p className="muted factor-fine">
        Standard message &amp; data rates may apply.
      </p>
    </div>
  );
}

/**
 * Best-effort E.164 normalization for US numbers: strip non-digits, default the +1
 * country code when 10 digits are entered. Leaves an explicit leading + intact.
 */
export function toE164(raw) {
  if (!raw) return '';
  const hasPlus = raw.trim().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits ? `+${digits}` : '';
}
