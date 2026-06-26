import { normalizePhone } from '../utils/applicationPayload';

/** msfg.us loanPurpose -> suite LoanPurposeType enum (suite: PURCHASE/REFINANCE/CONSTRUCTION/OTHER). */
function mapPurpose(p) {
  if (p === 'Purchase') return 'PURCHASE';
  if (p === 'Refinance' || p === 'CashOut') return 'REFINANCE';
  return 'OTHER';
}

/** HandoffPayload -> suite POST /api/loans/intake body (matches origination IntakeRequest). */
export function toIntakeRequest(p) {
  const pr = p.property || {};
  return {
    sourceLeadId: p.sourceLeadId,
    loanPurpose: mapPurpose(p.loanPurpose),
    borrower: {
      firstName: p.borrower?.firstName ?? null,
      lastName: p.borrower?.lastName ?? null,
      email: p.borrower?.email ?? null,
      phone: p.borrower?.phone ?? null,
    },
    property: {
      addressLine1: pr.addressLine ?? null,
      city: pr.city ?? null,
      state: pr.state ?? null,
      postalCode: pr.zipCode ?? null,
      estimatedValue: p.display?.purchasePrice ?? pr.propertyValue ?? null,
    },
  };
}

/** Parse the funnel's down-payment string ("20", "20%", "85,000") to a number, or null. */
function parseDpNumber(v) {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

const round2 = (n) => Math.round(n * 100) / 100;

/** HandoffPayload -> the ApplicationForm carry-over shape (consumed via sessionStorage['carryOverData']). */
export function toCarryOverData(p) {
  const pr = p.property || {};
  const price = p.display?.purchasePrice ?? pr.propertyValue ?? null;

  // The funnel collects down payment as a %/$ toggle string with NO unit flag in the token.
  // Heuristic: a value <= 100 is a percent of the price; > 100 is a dollar amount.
  const dpNum = parseDpNumber(p.display?.downPaymentPercent);
  let downPayment = null;
  if (dpNum != null) {
    if (price != null && dpNum <= 100) downPayment = round2((price * dpNum) / 100);
    else if (dpNum > 100) downPayment = round2(dpNum);
  }

  // Loan Amount auto-derives for a purchase (price - down payment). The step's per-field
  // onChange handlers don't fire on reset()-driven prefill, so it must be precomputed here.
  let loanAmount = null;
  if (p.loanPurpose === 'Purchase' && price != null && downPayment != null) {
    loanAmount = Math.max(round2(price - downPayment), 0);
  }

  const hasAddress = !!(pr.addressLine || pr.city || pr.state || pr.zipCode);

  return {
    loanPurpose: p.loanPurpose,
    propertyValue: price,
    downPayment,
    loanAmount,
    property: { addressLine: pr.addressLine ?? '', city: pr.city ?? '', state: pr.state ?? '', zipCode: pr.zipCode ?? '' },
    // A purchase lead with no subject-property address yet → pre-check "TBD" so the
    // borrower isn't blocked entering an address they don't have.
    propertyTBD: p.loanPurpose === 'Purchase' && !hasAddress,
    propertyUse: pr.propertyUse === 'Primary residence' ? 'Primary'
      : pr.propertyUse === 'Second home' ? 'Secondary'
      : pr.propertyUse === 'Investment property' ? 'Investment' : '',
    borrowers: [{
      firstName: p.borrower?.firstName ?? '',
      lastName: p.borrower?.lastName ?? '',
      email: p.borrower?.email ?? '',
      phone: normalizePhone(p.borrower?.phone) ?? '',
    }],
  };
}
