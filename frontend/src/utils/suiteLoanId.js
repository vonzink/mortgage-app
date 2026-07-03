// The /applications/:id route is fed from two worlds: suite-first navigation (console
// "Open in borrower app", /me/loans) passes the suite loan UUID; legacy lists pass the
// numeric mortgage-app id. Suite-keyed calls (suite documents, status history, console
// deep links) must always be keyed by the SUITE id.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the suite loan id for a details page: a UUID route id IS the suite id (usable
 * before the application loads); otherwise fall back to the loaded legacy application's
 * suiteLoanId link. Null = this loan has no suite counterpart (suite features disable
 * cleanly instead of firing doomed requests).
 */
export function resolveSuiteLoanId(routeId, application) {
  if (routeId && UUID_RE.test(String(routeId))) return String(routeId);
  return application?.suiteLoanId || null;
}
