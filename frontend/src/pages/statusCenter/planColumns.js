/*
 * planColumns — pure column planner for the v2.1 layout contract.
 *
 * The borrower payload's `layout` ({ rail: [...], main: [...], side: [...] })
 * is the LO's saved per-loan section arrangement (absent when never
 * customized). The key vocabulary is the 14-key UNION: the console drags
 * sections both within and ACROSS columns, so any known key may appear in any
 * of the three arrays. The server 400s unknown keys and duplicates across all
 * three arrays on write (a section lives in exactly one column).
 *
 * Client read contract (tolerant):
 *   - layout missing / not an object → the three default columns, untouched
 *   - a column missing / not an array → treated as empty
 *   - unknown keys → ignored (forward compat: a future server key must not
 *     blank a column on an old client)
 *   - duplicate keys (within or across arrays) → global first occurrence
 *     wins, scanning rail → main → side
 *   - keys missing from the whole layout → appended to their HOME column in
 *     default order (backward compat: sections shipped after the LO saved
 *     their layout still render)
 *
 * Home columns / default orders (keys map 1:1 to the container's section
 * renderer; arrangement NEVER un-hides a section — hiding beats ordering):
 *   rail: milestones, loanOfficer, contacts, notifications
 *   main: todo, dropzone, cleared, downloads
 *   side: rateLock, keyDates, appraisal, snapshot, payment, closingCosts
 */

export const RAIL_KEYS = ['milestones', 'loanOfficer', 'contacts', 'notifications'];
export const MAIN_KEYS = ['todo', 'dropzone', 'cleared', 'downloads'];
export const SIDE_KEYS = ['rateLock', 'keyDates', 'appraisal', 'snapshot', 'payment', 'closingCosts'];

const COLUMNS = [
  ['rail', RAIL_KEYS],
  ['main', MAIN_KEYS],
  ['side', SIDE_KEYS],
];

const KNOWN = new Set([...RAIL_KEYS, ...MAIN_KEYS, ...SIDE_KEYS]);

export default function planColumns(layout) {
  const src = layout && typeof layout === 'object' ? layout : {};
  const seen = new Set();
  const plan = { rail: [], main: [], side: [] };

  // Pass 1: each known key lands in the column that claims it — global
  // first-occurrence-wins (scan order rail → main → side) resolves duplicates
  // both within and across arrays.
  for (const [name] of COLUMNS) {
    const arr = Array.isArray(src[name]) ? src[name] : [];
    for (const key of arr) {
      if (KNOWN.has(key) && !seen.has(key)) {
        seen.add(key);
        plan[name].push(key);
      }
    }
  }

  // Pass 2: append every unclaimed key to its HOME column in default order.
  for (const [name, defaults] of COLUMNS) {
    for (const key of defaults) {
      if (!seen.has(key)) plan[name].push(key);
    }
  }

  return plan;
}
