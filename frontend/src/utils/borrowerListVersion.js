/**
 * Borrower-list version guard for the suite application PUT.
 *
 * The suite's PUT /api/loans/{id}/application matches co-borrowers BY POSITION. If staff
 * add, delete or reorder borrowers after this form loaded, an old form would write onto
 * the wrong person. The suite returns `borrowerListVersion` on the application GET and
 * PUT; sending it back as X-Borrower-List-Version makes the suite refuse (409
 * BORROWER_LIST_CHANGED, nothing written) when the list has changed since. No header =
 * no check.
 *
 * The version is kept next to the form's draft (`${draftKey}:listVersion`), tagged with
 * the loan it belongs to, so a restored draft sends the version it started with and is
 * never sent against a different loan. clearDraft() removes it with the draft.
 */

export const BORROWER_LIST_VERSION_HEADER = 'X-Borrower-List-Version';
export const BORROWER_LIST_CHANGED = 'BORROWER_LIST_CHANGED';

export function listVersionKey(draftKey) {
  return `${draftKey}:listVersion`;
}

/** The stored version for `loanId`, or null (none stored, other loan, unreadable). */
export function readStoredListVersion(draftKey, loanId) {
  try {
    const raw = sessionStorage.getItem(listVersionKey(draftKey));
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (stored && stored.loanId === loanId && typeof stored.version === 'string' && stored.version) {
      return stored.version;
    }
  } catch { /* corrupt → unknown */ }
  return null;
}

/** Store the version for `loanId`; a null/empty version removes the stored one. */
export function storeListVersion(draftKey, loanId, version) {
  try {
    if (version && loanId) {
      sessionStorage.setItem(listVersionKey(draftKey), JSON.stringify({ loanId, version }));
    } else {
      sessionStorage.removeItem(listVersionKey(draftKey));
    }
  } catch { /* storage unavailable — non-fatal */ }
}

/** axios request config carrying the header, or undefined when no version is known. */
export function listVersionRequestConfig(version) {
  return version ? { headers: { [BORROWER_LIST_VERSION_HEADER]: version } } : undefined;
}

/** The borrowerListVersion from an application GET/PUT body (enveloped or bare), or null. */
export function listVersionFromResponse(body) {
  const payload = body && typeof body === 'object' && 'success' in body && 'data' in body
    ? body.data
    : body;
  const version = payload && typeof payload === 'object' ? payload.borrowerListVersion : null;
  return typeof version === 'string' && version ? version : null;
}

/** True for the suite's 409 BORROWER_LIST_CHANGED refusal. */
export function isBorrowerListChanged(error) {
  const res = error && error.response;
  return !!res && res.status === 409 && res.data?.code === BORROWER_LIST_CHANGED;
}
