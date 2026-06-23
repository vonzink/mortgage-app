/**
 * Decode the NON-SENSITIVE hand-off payload from the `?t=` token.
 * The FE decodes (does NOT verify the signature) — the token carries the borrower's own
 * non-sensitive funnel summary, used only to render the page + seed the application; the
 * loan it creates is the borrower's own. Integrity verification, if needed, lives server-side.
 */
export function decodeHandoffToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = JSON.parse(decodeURIComponent(escape(atob(b64))));
    return json && json.h ? json.h : null;
  } catch {
    return null;
  }
}
