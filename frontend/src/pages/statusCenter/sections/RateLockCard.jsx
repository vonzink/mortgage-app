import React from 'react';

/*
 * RateLockCard — the rate-lock countdown card in the Loan Status Center right
 * column. Ported from the .lockcard / .lockring block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Consumes payload.rateLock:
 *   { status:"LOCKED"|"EXPIRED", noteRate, lockedAt, expiresAt, lockDays }
 *
 * daysLeft is measured at UTC midnight so it never drifts by a day across
 * timezones. The SVG ring reuses the design geometry exactly (r=31), filling
 * clamp(daysLeft/lockDays, 0, 1) of the circumference via stroke-dashoffset.
 * status==="EXPIRED" (or daysLeft<=0) → an amber "Lock expired" state; the
 * amber "urgent" treatment also kicks in at 5 or fewer days left.
 */

// Ring geometry, ported verbatim from the design's <svg viewBox="0 0 74 74">.
const RING_R = 31;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 194.78

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});
const RATE_FMT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

// Midnight-UTC ms for a YYYY-MM-DD (or ISO) date string.
function utcMidnightMs(value) {
  if (!value) return NaN;
  const day = String(value).slice(0, 10);
  return Date.parse(`${day}T00:00:00Z`);
}

// Today, floored to UTC midnight ms.
function todayUtcMidnightMs(now) {
  const d = now instanceof Date ? now : new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function formatUtcDate(value) {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return DATE_FMT.format(d);
}

function clamp01(n) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export default function RateLockCard({ rateLock, now = new Date() }) {
  if (!rateLock) return null;

  const { status, noteRate, lockedAt, expiresAt, lockDays } = rateLock;

  const daysLeft = Math.ceil(
    (utcMidnightMs(expiresAt) - todayUtcMidnightMs(now)) / 86400000,
  );
  const expired = status === 'EXPIRED' || !(daysLeft > 0);
  const urgent = expired || daysLeft <= 5;

  const fraction = clamp01(
    lockDays > 0 && Number.isFinite(daysLeft) ? daysLeft / lockDays : 0,
  );
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);

  const ringColor = urgent ? 'var(--amber)' : 'var(--green)';
  const rate = Number.isFinite(noteRate) ? `${RATE_FMT.format(noteRate)}%` : null;
  const lockedDate = formatUtcDate(lockedAt);
  const expiresDate = formatUtcDate(expiresAt);

  return (
    <div className={`lsc-lockcard${urgent ? ' is-urgent' : ''}`}>
      <div className="lsc-lockring">
        <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true">
          <circle
            cx="37"
            cy="37"
            r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,.14)"
            strokeWidth="6"
          />
          <circle
            cx="37"
            cy="37"
            r={RING_R}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="lsc-lockring-num">
          {expired ? (
            <b className="lsc-lockring-x">✕</b>
          ) : (
            <>
              <b>{daysLeft}</b>
              <span>DAYS LEFT</span>
            </>
          )}
        </div>
      </div>

      <div className="lsc-locktx">
        {expired ? (
          <>
            <b>Lock expired</b>
            {rate && <div className="lsc-lock-rate">{rate}</div>}
            {expiresDate && <span>Expired {expiresDate}</span>}
          </>
        ) : (
          <>
            <b>Rate lock active</b>
            {(rate || lockedDate) && (
              <div className="lsc-lock-rate">
                {[rate, lockedDate ? `locked ${lockedDate}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
            {(expiresDate || lockDays) && (
              <span>
                {[expiresDate ? `Expires ${expiresDate}` : null,
                  lockDays ? `${lockDays}-day lock` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
