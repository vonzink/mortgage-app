export const TERMINAL_STATUSES = new Set(['FUNDED', 'WITHDRAWN', 'DENIED', 'CANCELLED']);
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Active first (newest change first), then recent past, then past whose final
 *  status change is >12 months old ("View older loans" expander). */
export function groupLoans(loans, now = new Date()) {
  const byNewest = [...(loans || [])].sort(
    (a, b) => new Date(b.statusChangedAt || 0) - new Date(a.statusChangedAt || 0),
  );
  const active = byNewest.filter((l) => !TERMINAL_STATUSES.has(l.status));
  const terminal = byNewest.filter((l) => TERMINAL_STATUSES.has(l.status));
  const isOld = (l) =>
    l.statusChangedAt && now - new Date(l.statusChangedAt) > YEAR_MS;
  return {
    active,
    past: terminal.filter((l) => !isOld(l)),
    older: terminal.filter(isOld),
  };
}
