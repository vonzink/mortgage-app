/**
 * "The client I'm helping" — set when staff enters client-view, read by the TopBar so Applications
 * and Apply become client-scoped instead of bouncing to the suite console.
 *
 * sessionStorage, not a React context: the TopBar lives above the route tree and must survive a
 * hard navigation (the /apply hand-off does a full page load).
 */
const KEY = 'clientContext';

export function setClientContext({ borrowerId, loanId, name }) {
  if (!borrowerId) return;
  sessionStorage.setItem(KEY, JSON.stringify({ borrowerId, loanId, name }));
}

/** The stash, or null. A malformed or borrowerId-less stash is treated as absent — the nav must
 *  degrade to its default behavior rather than throw on every render. */
export function getClientContext() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY));
    return parsed && parsed.borrowerId ? parsed : null;
  } catch {
    return null;
  }
}

export function clearClientContext() {
  sessionStorage.removeItem(KEY);
}
