/**
 * Centralized display formatters. Every UI surface goes through this module
 * so we keep one truth per concept (money / date / bytes / etc.) and avoid
 * the 20+ scattered `format*` helpers the audit flagged (SI-1).
 *
 * Conventions:
 *   - "format*" returns a display string (never null, never throws).
 *   - "format*OrNull" returns null for empty/unparseable input — useful
 *     when a list-row should be hidden entirely on missing data.
 *   - All functions are pure. No React, no side effects, no time mocking
 *     required to test.
 */

// ── Money ─────────────────────────────────────────────────────────────────

/**
 * "$1,234.56" — 2-decimal USD. Null/blank/unparseable → "$0.00" so callers
 * don't need to defend against "$NaN" sneaking into the UI.
 */
export function formatCurrency(amount) {
  const n = parseFloat(amount);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Dashboard-style money: "$1,234.56" but returns null on missing input so
 * KV-list rows can hide entirely.
 */
export function formatMoneyOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/**
 * Compact money: "$1.5M" / "$120K" / "$0". Used on KPI tiles where
 * precision isn't important and screen real estate is.
 */
export function formatMoneyShort(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000)     return `$${Math.round(num / 1_000)}K`;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

/**
 * Input-display variant: "1,234.56" (no currency symbol, no parsing of
 * non-numeric chars). Used by the CurrencyInput component while the user
 * is typing.
 */
export function formatCurrencyInput(value) {
  if (!value) return '';
  const numericValue = value.toString().replace(/[^0-9.]/g, '');
  const number = parseFloat(numericValue);
  if (!Number.isFinite(number)) return '';
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse "1,234.56" back to a number; safe on null/blank. */
export function parseCurrencyInput(formattedValue) {
  if (!formattedValue) return 0;
  const numericValue = formattedValue.toString().replace(/,/g, '');
  const parsed = parseFloat(numericValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

// ── Percent / rate ────────────────────────────────────────────────────────

/** "5.875%". Trims trailing zeros: 5.000 → 5%. */
export function formatRate(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(4).replace(/\.?0+$/, '')}%`;
}

// ── Dates ─────────────────────────────────────────────────────────────────

/**
 * "June 15, 1985" — long US date. Plain {@code YYYY-MM-DD} is parsed by
 * parts so dates don't shift in negative-UTC timezones. ISO timestamps
 * with time portions fall through to the standard Date parser.
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString));
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    const local = new Date(Number(y), Number(m) - 1, Number(d));
    return local.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** "May 12, 4:35 PM" — short with time. Returns null on bad input. */
export function formatDateTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

/** "Apr 28" — short month + day. Used in the milestone strip. */
export function formatMonthDay(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  } catch {
    return String(iso);
  }
}

/**
 * Relative-time: "just now" / "2 min ago" / "5 hours ago" / "3 days ago",
 * then falls back to a locale date string.
 */
export function formatRelative(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  try { return new Date(iso).toLocaleDateString(); } catch { return ''; }
}

/** Compact relative-time for tight UI rows: "2m ago" / "5h ago" / "3d ago". */
export function formatRelativeShort(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  try { return new Date(iso).toLocaleDateString(); } catch { return ''; }
}

/**
 * "Auto-saved 2 sec ago" — used by the apply-form draft autosave pill.
 * Quantizes to seconds for the first minute so the user sees the indicator tick.
 */
export function formatAutoSave(ts) {
  if (!ts) return 'Auto-saved';
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 5) return 'Auto-saved just now';
  if (secs < 60) return `Auto-saved ${secs} sec ago`;
  const mins = Math.round(secs / 60);
  return `Auto-saved ${mins} min ago`;
}

// ── Bytes ─────────────────────────────────────────────────────────────────

/** "12.4 MB" — falsy input returns '—'. */
export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ── Identity / strings ────────────────────────────────────────────────────

/**
 * Format an SSN as "xxx-xx-xxxx" while the user types. Strips non-digits,
 * takes the first 9, slices 3/2/4. Partial input is preserved.
 */
export function formatSSN(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/**
 * Format a US phone number as "xxx-xxx-xxxx" (used while the user types).
 * Partial input is preserved: "12" → "12", "1234" → "123-4".
 */
export function formatPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ── Enum / action labels ──────────────────────────────────────────────────

/** "PriorToDocs" → "Prior To Docs"; "INVESTMENT_PROPERTY" → "INVESTMENT PROPERTY". */
export function prettyEnum(s) {
  if (!s) return '—';
  return String(s).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}

/** "STATUS_CHANGE" → "Status Change". Used by audit-log rows. */
export function formatAction(a) {
  if (!a) return '—';
  return String(a)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// File size alias to match older callsite naming
export { formatBytes as formatSize };
