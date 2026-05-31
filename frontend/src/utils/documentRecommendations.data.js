/**
 * Document Recommendation Rules — static data
 * Based on MISMO 3.4 standards and loan application data.
 *
 * Each rule object:
 *   name    — display string (may contain {{tag}}, {{months}}, {{label}}, etc. placeholders)
 *   status  — 'required' | 'conditional' | 'review' | 'ok'
 *   reason  — short explanation
 */

// ── Loan-purpose rules (keyed by purpose) ────────────────────────────

export const PURCHASE_GENERAL_DOCS = [
  {
    name: 'Executed purchase contract',
    status: 'required',
    reason: 'Loan purpose is Purchase.',
  },
  {
    name: 'Earnest money proof (canceled check / statement)',
    status: 'required',
    reason: 'Shows source of EMD.',
  },
  {
    name: '(Conditional) Gift letter + donor ability evidence',
    status: 'conditional',
    reason: 'If gift funds are used.',
  },
];

export const REFINANCE_GENERAL_DOCS = [
  {
    name: 'Current mortgage statement (subject property)',
    status: 'required',
    reason: 'Refinance.',
  },
  {
    name: 'Promissory Note (copy)',
    status: 'required',
    reason: 'Refinance.',
  },
  {
    name: 'Insurance declaration page (subject)',
    status: 'required',
    reason: 'Verify hazard coverage.',
  },
];

// ── Per-borrower general rules ───────────────────────────────────────

export const BORROWER_ID_DOC = {
  name: '{{tag}} Government-issued photo ID',
  status: 'required',
  reason: 'Always required per borrower.',
};

// Employment coverage
export const EMPLOYMENT_GAP_DOCS = [
  {
    name: '{{tag}} Prior employment history to cover missing {{months}} months',
    status: 'required',
    reason: 'Must document 24 months employment.',
  },
  {
    name: '{{tag}} Letter of explanation for any gaps > 30 days',
    status: 'review',
    reason: 'Request if gaps are identified.',
  },
];

export const EMPLOYMENT_OK_DOC = {
  name: '{{tag}} Employment history coverage (24 months)',
  status: 'ok',
  reason: 'Sufficient based on employment dates.',
};

// Residence coverage
export const RESIDENCE_GAP_DOC = {
  name: '{{tag}} Prior residence addresses to cover missing {{months}} months',
  status: 'required',
  reason: 'Must provide 24 months address history.',
};

export const RESIDENCE_OK_DOC = {
  name: '{{tag}} Residence history coverage (24 months)',
  status: 'ok',
  reason: 'Sufficient based on durations.',
};

// Citizenship / residency
export const PERMANENT_RESIDENT_DOC = {
  name: '{{tag}} I-551 (Permanent Resident/Green Card) – front & back',
  status: 'required',
  reason: 'Non-US citizen (permanent resident).',
};

export const NON_PERMANENT_RESIDENT_DOC = {
  name: '{{tag}} Valid EAD card (I-766) or visa with work authorization + I-94',
  status: 'required',
  reason: 'Non-permanent resident alien.',
};

// ── Declaration-triggered rules ──────────────────────────────────────

export const BANKRUPTCY_DOC = {
  name: '{{tag}} Bankruptcy documents (petition, schedules, discharge). If Ch. 13: 12 months trustee payment history',
  status: 'required',
  reason: 'BK indicated on declarations.',
};

export const FORECLOSURE_DOC = {
  name: '{{tag}} Foreclosure / short sale documents + LOE',
  status: 'required',
  reason: 'History of foreclosure/short sale.',
};

export const OUTSTANDING_JUDGMENTS_DOC = {
  name: '{{tag}} Court payoff / release for outstanding judgments or liens',
  status: 'required',
  reason: 'Outstanding judgments indicated.',
};

// ── Income rules ─────────────────────────────────────────────────────

export const W2_INCOME_DOCS = [
  {
    name: '{{tag}} 30 days most recent pay stubs',
    status: 'required',
    reason: 'W-2 employment income present.',
  },
  {
    name: '{{tag}} W-2s for last 2 years',
    status: 'required',
    reason: 'Standard for W-2 income.',
  },
];

export const VARIABLE_INCOME_DOC = {
  name: '{{tag}} VOE confirming 2-year history of bonus/OT/commission',
  status: 'required',
  reason: 'Needed to use variable income.',
};

export const VARIABLE_INCOME_TYPES = ['Bonus', 'Overtime', 'Commission'];

export const SELF_EMPLOYED_BASE_DOCS = [
  {
    name: '{{tag}} 1040 personal tax returns – last 2 years',
    status: 'required',
    reason: 'Self-employment indicated.',
  },
  {
    name: '{{tag}} Year-to-date P&L and balance sheet',
    status: 'required',
    reason: 'Support current year performance.',
  },
];

export const LLC_DOCS = [
  {
    name: '{{tag}} K-1s (LLC) – last 2 years',
    status: 'required',
    reason: 'LLC ownership present.',
  },
  {
    name: '{{tag}} 1065 partnership tax returns – last 2 years',
    status: 'required',
    reason: 'LLC treated as partnership.',
  },
];

export const SCORP_DOCS = [
  {
    name: '{{tag}} K-1s (S-Corp) – last 2 years',
    status: 'required',
    reason: 'S-Corporation ownership present.',
  },
  {
    name: '{{tag}} 1120S business tax returns – last 2 years',
    status: 'required',
    reason: 'S-Corporation ownership.',
  },
  {
    name: '{{tag}} W-2s – last 2 years (if applicable)',
    status: 'conditional',
    reason: 'S-Corp owners typically receive W-2 wages.',
  },
];

export const CCORP_DOCS = [
  {
    name: '{{tag}} K-1s (C-Corp) – last 2 years',
    status: 'required',
    reason: 'C-Corporation ownership present.',
  },
  {
    name: '{{tag}} 1120 corporate tax returns – last 2 years',
    status: 'required',
    reason: 'C-Corporation ownership.',
  },
];

export const PARTNERSHIP_DOCS = [
  {
    name: '{{tag}} K-1s (Partnership) – last 2 years',
    status: 'required',
    reason: 'Partnership income present.',
  },
  {
    name: '{{tag}} 1065 partnership tax returns – last 2 years',
    status: 'required',
    reason: 'Partnership ownership.',
  },
];

export const SELF_EMPLOYED_CONDITIONAL_DOC = {
  name: '{{tag}} (Conditional) Business bank statements (2-3 months)',
  status: 'conditional',
  reason: 'If needed to support cash flow/P&L.',
};

export const RENTAL_INCOME_DOC = {
  name: '{{tag}} Current lease(s) + 2 months rent receipts',
  status: 'conditional',
  reason: 'Rental income present.',
};

export const CREDIT_INQUIRY_DOC = {
  name: '{{tag}} Letter of explanation for any recent credit inquiries',
  status: 'conditional',
  reason: 'Requested for underwriting clarity.',
};

// ── Asset rules ──────────────────────────────────────────────────────

export const ASSET_STATEMENT_DOC = {
  name: '{{tag}} Account statements (2 months) – {{assetType}} {{accountSuffix}}',
  status: 'required',
  reason: 'Verify funds to close & reserves.',
};

export const NO_ASSETS_PURCHASE_DOC = {
  name: 'Proof of funds for down payment & closing',
  status: 'required',
  reason: 'No assets listed in application.',
};

export const NO_ASSETS_REFI_DOC = {
  name: 'Asset statements (if cash-to-close required)',
  status: 'conditional',
  reason: 'Provide if needed.',
};

// ── Credit / liability rules ─────────────────────────────────────────

export const PAYOFF_LIABILITIES_DOC = {
  name: 'Payoff statements for debts to be paid at closing',
  status: 'required',
  reason: 'Flagged in liabilities.',
};

// REO — per-property docs
export const REO_MORTGAGE_STATEMENT_DOC = {
  name: '{{liabilityType}} statement{{label}}',
  status: 'required',
  reason: 'REO property with associated liability.',
};

export const REO_MORTGAGE_GENERIC_DOC = {
  name: 'Mortgage/Secured Loan statement{{label}}',
  status: 'required',
  reason: 'REO property identified.',
};

export const REO_INSURANCE_DOC = {
  name: 'Hazard insurance declaration page{{label}}',
  status: 'required',
  reason: 'Verify coverage.',
};

export const REO_TAX_DOC = {
  name: 'Property tax bill{{label}}',
  status: 'conditional',
  reason: 'Provide if taxes are not escrowed.',
};

export const REO_LEASE_DOC = {
  name: 'Lease agreement{{label}}',
  status: 'required',
  reason: 'Rental property owned less than 12 months.',
};

export const REO_SCHEDULE_E_DOC = {
  name: 'Personal tax returns with Schedule E{{label}}',
  status: 'required',
  reason: 'Rental property income verification.',
};

// REO — inferred (from liabilities, no explicit REO records)
export const REO_INFERRED_DOCS = [
  {
    name: 'Mortgage/Secured Loan statement(s) – each REO property',
    status: 'required',
    reason: 'Mortgage/Secured Loan liabilities present.',
  },
  {
    name: 'Hazard insurance declaration page – each REO property',
    status: 'required',
    reason: 'Verify coverage on owned properties.',
  },
  {
    name: 'Property tax bill – each REO property',
    status: 'conditional',
    reason: 'Provide if taxes not escrowed.',
  },
];

export const HELOC_DOC = {
  name: 'HELOC statement(s) (most recent)',
  status: 'required',
  reason: 'HELOC liability detected.',
};

// ── Constants ────────────────────────────────────────────────────────

export const REQUIRED_HISTORY_MONTHS = 24;
