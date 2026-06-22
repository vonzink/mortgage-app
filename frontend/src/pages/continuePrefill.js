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

/** HandoffPayload -> the ApplicationForm carry-over shape (consumed via sessionStorage['carryOverData']). */
export function toCarryOverData(p) {
  const pr = p.property || {};
  return {
    loanPurpose: p.loanPurpose,
    propertyValue: p.display?.purchasePrice ?? pr.propertyValue ?? null,
    property: { addressLine: pr.addressLine ?? '', city: pr.city ?? '', state: pr.state ?? '', zipCode: pr.zipCode ?? '' },
    propertyUse: pr.propertyUse === 'Primary residence' ? 'Primary'
      : pr.propertyUse === 'Second home' ? 'Secondary'
      : pr.propertyUse === 'Investment property' ? 'Investment' : '',
    borrowers: [{
      firstName: p.borrower?.firstName ?? '',
      lastName: p.borrower?.lastName ?? '',
      email: p.borrower?.email ?? '',
      phone: p.borrower?.phone ?? '',
    }],
  };
}
