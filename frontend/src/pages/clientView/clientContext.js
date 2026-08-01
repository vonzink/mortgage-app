/**
 * "The client I'm helping" — set when staff enters client-view, read by the TopBar so Applications
 * and Apply become client-scoped instead of bouncing to the suite console.
 *
 * sessionStorage, not a React context: the TopBar lives above the route tree and must survive a
 * hard navigation (the /apply hand-off does a full page load).
 */
const KEY = 'clientContext';

/**
 * sessionStorage fires no same-tab event, so the stash announces its own changes. The TopBar is
 * mounted once, globally, and ClientView writes this AFTER its fetch resolves — which is not a
 * render or a navigation — so without this the nav stays un-scoped on the very page the feature
 * exists for. Same idiom as `mismo:imported` / `auth:expired` elsewhere in the app.
 */
export const CLIENT_CONTEXT_EVENT = 'clientContext:changed';

function announce() {
  window.dispatchEvent(new CustomEvent(CLIENT_CONTEXT_EVENT));
}

export function setClientContext({ borrowerId, loanId, name }) {
  if (!borrowerId) return;
  sessionStorage.setItem(KEY, JSON.stringify({ borrowerId, loanId, name }));
  announce();
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
  announce();
}
