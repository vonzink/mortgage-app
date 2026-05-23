/**
 * Local cache of the loans this browser has opened recently — drives the
 * TopBar typeahead's empty state. Capped at 10, deduped by id, newest first.
 * Scoped per browser (so per-user implicitly via Cognito-bound device).
 */

export const RECENT_LOANS_KEY = 'msfg.recentLoans';
const CAP = 10;

function safeRead() {
  try {
    const raw = window.localStorage.getItem(RECENT_LOANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(list) {
  try {
    window.localStorage.setItem(RECENT_LOANS_KEY, JSON.stringify(list));
  } catch {
    // out of quota / disabled / etc. — silent.
  }
}

export function getRecentLoans() {
  return safeRead();
}

/**
 * Push a loan onto the recent list. Dedupes by `id`. Missing-id calls are ignored
 * so callers can safely fire from anywhere without null-checking.
 *
 * @param {{ id: number | string, applicationNumber?: string, borrowerName?: string }} loan
 */
export function pushRecentLoan(loan) {
  if (!loan || loan.id == null) return;
  const entry = {
    id: loan.id,
    applicationNumber: loan.applicationNumber || null,
    borrowerName: loan.borrowerName || null,
    openedAt: Date.now(),
  };
  const current = safeRead().filter((r) => r.id !== loan.id);
  current.unshift(entry);
  safeWrite(current.slice(0, CAP));
}

export function clearRecentLoans() {
  try { window.localStorage.removeItem(RECENT_LOANS_KEY); } catch {}
}
