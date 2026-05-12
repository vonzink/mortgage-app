/**
 * Display formatters for the loan dashboard. As of audit SI-1, the actual
 * formatter logic lives in {@link ../../utils/format.js}. This file now just
 * re-exports the dashboard-specific aliases (formatMoney → formatMoneyOrNull,
 * formatDate → formatDateTime since dashboards want time included) and the
 * dashboard-only helpers (sums + identifier presence check).
 */

import {
  formatMoneyOrNull as _formatMoney,
  formatRate as _formatRate,
  formatDateTime as _formatDate,
  prettyEnum as _prettyEnum,
} from '../../utils/format';

export const formatMoney = _formatMoney;
export const formatRate = _formatRate;
export const formatDate = _formatDate;
export const prettyEnum = _prettyEnum;

export function hasAnyIdentifier(ids) {
  return ids && (ids.lendingpadLoanNumber || ids.investorLoanNumber || ids.mersMin);
}

export const sumExpenses = (list) =>
  list.reduce((acc, h) => acc + (Number(h.paymentAmount) || 0), 0);

export const sumCredits = (list) =>
  list.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
