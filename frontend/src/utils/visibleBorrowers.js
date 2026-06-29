// Shared borrower-tab visibility rule, used identically by the three multi-borrower
// steps (Borrower Information, Employment & Income, Assets & Liabilities).
//
// A borrower tab is shown ONLY IF:
//   • it is the primary borrower (index 0), OR
//   • it is the currently-active tab, OR
//   • it has data (a non-empty first or last name).
//
// Empty, non-active co-borrowers are hidden. Co-borrowers are added one at a time
// and the newly-added (still-empty) one becomes the active tab, so it stays visible
// via the active-tab clause until the user names it or navigates away.
//
// IMPORTANT: this returns entries that CARRY the real borrower index (`{ field, index }`)
// rather than a compacted array. Downstream code reads react-hook-form paths by the
// REAL index (`borrowers.${index}.*`, `getFieldArray(index, ...)`), so collapsing the
// indices via a plain Array.filter would mis-map a shown borrower's fields once an
// earlier co-borrower is hidden. Always use `entry.index` as the borrower index.

export const MAX_BORROWERS = 4;

/**
 * True if the borrower at `index` should have a visible tab, per the
 * primary-OR-active-OR-named rule.
 *
 * @param {number} index            real borrower index (0-based)
 * @param {number} activeIndex      currently-active borrower tab index
 * @param {(i: number) => string|undefined} getFirstName  reads borrower i's first name
 * @param {(i: number) => string|undefined} getLastName   reads borrower i's last name
 */
export function isBorrowerVisible(index, activeIndex, getFirstName, getLastName) {
  if (index === 0) return true;                 // primary always visible
  if (index === activeIndex) return true;       // active tab always visible
  const fn = getFirstName(index);
  const ln = getLastName(index);
  return !!((fn && String(fn).trim()) || (ln && String(ln).trim())); // has a name
}

/**
 * Index-preserving visible-borrower list. Returns `{ field, index }` entries (real
 * index retained) for the borrowers (capped at MAX_BORROWERS) that pass the rule.
 *
 * @param {Array} borrowerFields    react-hook-form field-array entries
 * @param {number} activeIndex      currently-active borrower tab index
 * @param {(i: number) => string|undefined} getFirstName
 * @param {(i: number) => string|undefined} getLastName
 * @returns {Array<{ field: any, index: number }>}
 */
export function getVisibleBorrowers(borrowerFields, activeIndex, getFirstName, getLastName) {
  return borrowerFields
    .slice(0, MAX_BORROWERS)
    .map((field, index) => ({ field, index }))
    .filter(({ index }) => isBorrowerVisible(index, activeIndex, getFirstName, getLastName));
}
