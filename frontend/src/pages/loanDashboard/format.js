/**
 * Display formatters for the loan dashboard. Each one returns null for empty /
 * unparseable input so the consuming <DefinitionList> can hide the row entirely
 * — keeps the dashboard tidy when fields aren't filled in yet.
 */

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function formatRate(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `${n.toFixed(4).replace(/\.?0+$/, '')}%`;
}

export function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function hasAnyIdentifier(ids) {
  return ids && (ids.lendingpadLoanNumber || ids.investorLoanNumber || ids.mersMin);
}

export const sumExpenses = (list) =>
  list.reduce((acc, h) => acc + (Number(h.paymentAmount) || 0), 0);

export const sumCredits = (list) =>
  list.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

/** "PriorToDocs" → "Prior To Docs"; "INVESTMENT_PROPERTY" → "INVESTMENT PROPERTY". */
export function prettyEnum(s) {
  if (!s) return '—';
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}
