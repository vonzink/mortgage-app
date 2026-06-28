/**
 * Pure helpers for the Review & Submit summary.
 */

/**
 * Classify a borrower's HMDA demographics for the review page. HMDA is legally
 * optional — the borrower may decline — so we never block submit on it, but a
 * genuinely unanswered section (neither provided nor declined) is flagged as
 * missing so it isn't silently submitted (QA #5).
 *
 * @param {object} declaration the borrower.declaration object (may be undefined)
 * @returns {{label: string, missing: boolean}}
 */
export function hmdaStatus(declaration = {}) {
  const d = declaration || {};
  if (d.hmdaRace || d.hmdaEthnicity || d.hmdaSex) {
    return { label: 'Provided', missing: false };
  }
  if (d.hmdaRaceRefusal || d.hmdaEthnicityRefusal || d.hmdaSexRefusal) {
    return { label: 'Declined to provide', missing: false };
  }
  return { label: 'Not provided', missing: true };
}
