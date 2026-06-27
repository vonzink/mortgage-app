/**
 * Form-to-suite payload builder for the BORROWER SELF-APPLICATION submit path.
 *
 * This is the explicit boundary between react-hook-form state and the msfg-suite
 * (system-of-record) request body for `PUT /api/loans/{loanId}/application`
 * (suite `BorrowerApplicationRequest`). It is the borrower-self analog of
 * applicationPayload.js (which targets the legacy mortgage-app backend DTO).
 *
 * Pure functions only — no React, no toasts, no HTTP. Unit-testable in isolation,
 * which matters because the wire format is regulated (URLA / MISMO) and silent
 * drift here corrupts loan data in the SoR.
 *
 * Shape (suite contract):
 *   { loan, borrower, income:{employments, otherIncome}, assets, liabilities, reo,
 *     declarations:null, demographics:null }
 * A `null` section is SKIPPED by the suite; a present section is a FULL REPLACE.
 * Dates are ISO `YYYY-MM-DD`. `state`/`employerState` are 2-letter codes.
 *
 * The mortgage-app form is borrower-ARRAY based with employment/income/assets/
 * liabilities/reo nested under each borrower (assets & liabilities live under
 * borrowers[0]). The suite self-application is SINGLE-borrower, so we map from the
 * primary borrower (borrowers[0]).
 */

import { hasValue, normalizePhone } from './applicationPayload';

// ── Numeric coercion ──────────────────────────────────────────────────────

/** Parse to a finite number, or null when blank/non-numeric (NOT 0 — null = "omit"). */
function num(value) {
  if (!hasValue(value)) return null;
  const n = parseFloat(String(value).replace(/[,$]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Parse to a finite integer, or null when blank/non-numeric. */
function intOrNull(value) {
  if (!hasValue(value)) return null;
  const n = parseInt(String(value).replace(/[,$]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/** Pass through a non-blank string, else null. */
function str(value) {
  return hasValue(value) ? String(value).trim() : null;
}

/** ISO date pass-through (form date inputs already emit YYYY-MM-DD), else null. */
function isoDate(value) {
  return hasValue(value) ? String(value).trim() : null;
}

// ── Enum maps (FE string → suite enum) ────────────────────────────────────

export function mapMortgageType(loanType) {
  switch (loanType) {
    case 'Conventional': return 'CONVENTIONAL';
    case 'FHA':          return 'FHA';
    case 'VA':           return 'VA';
    case 'USDA':         return 'USDA_RURAL_DEVELOPMENT';
    default:             return 'OTHER';
  }
}

/** loan.occupancyType — from the form's propertyUse (Primary/Secondary/Investment). */
export function mapOccupancyType(propertyUse) {
  switch (propertyUse) {
    case 'Primary':     return 'PRIMARY_RESIDENCE';
    case 'Secondary':   return 'SECOND_HOME';
    case 'SecondHome':  return 'SECOND_HOME';
    case 'Investment':  return 'INVESTMENT';
    default:            return null;
  }
}

/** loan.propertyType — structural (FE SingleFamily/Condo/Townhouse/MultiFamily/Manufactured/Other). */
export function mapPropertyType(propertyType) {
  switch (propertyType) {
    case 'SingleFamily': return 'SINGLE_FAMILY';
    case 'Condo':        return 'CONDOMINIUM';
    case 'Townhouse':    return 'TOWNHOUSE';
    case 'MultiFamily':  return 'TWO_TO_FOUR_UNIT';
    case 'Manufactured': return 'MANUFACTURED';
    default:             return 'SINGLE_FAMILY';
  }
}

/** reo.intendedOccupancy — the FE reo propertyType is occupancy-style (Primary/Secondary/Investment). */
export function mapIntendedOccupancy(reoPropertyType) {
  return mapOccupancyType(reoPropertyType);
}

export function mapEmploymentStatus(status) {
  switch (status) {
    case 'Present': return 'CURRENT';
    case 'Prior':   return 'PREVIOUS';
    default:        return null;
  }
}

export function mapMaritalStatus(status) {
  switch (status) {
    case 'Married':   return 'MARRIED';
    case 'Separated': return 'SEPARATED';
    // Single / Divorced / Widowed / Unmarried → UNMARRIED
    default:          return hasValue(status) ? 'UNMARRIED' : null;
  }
}

export function mapCitizenshipType(type) {
  switch (type) {
    case 'USCitizen':            return 'US_CITIZEN';
    case 'PermanentResident':    return 'PERMANENT_RESIDENT_ALIEN';
    case 'NonPermanentResident': return 'NON_PERMANENT_RESIDENT_ALIEN';
    case 'VisaHolder':           return 'NON_PERMANENT_RESIDENT_ALIEN';
    default:                     return hasValue(type) ? 'FOREIGN_NATIONAL' : null;
  }
}

export function mapAssetType(type) {
  switch (type) {
    case 'Checking':            return 'CHECKING';
    case 'Savings':             return 'SAVINGS';
    case 'MoneyMarket':         return 'MONEY_MARKET';
    case 'CertificateOfDeposit': return 'CERTIFICATE_OF_DEPOSIT';
    case 'MutualFunds':         return 'MUTUAL_FUND';
    case 'Stocks':              return 'STOCKS';
    case 'Bonds':               return 'BONDS';
    case 'Retirement401k':      return 'RETIREMENT';
    case 'IRA':                 return 'RETIREMENT';
    case 'Pension':             return 'RETIREMENT';
    case 'EarnestMoney':        return 'EARNEST_MONEY';
    default:                    return 'OTHER';
  }
}

export function mapLiabilityType(type) {
  switch (type) {
    case 'MortgageLoan': return 'MORTGAGE_LOAN';
    case 'Revolving':    return 'REVOLVING';
    case 'CreditCard':   return 'REVOLVING';
    case 'Installment':  return 'INSTALLMENT';
    case 'StudentLoan':  return 'INSTALLMENT';
    case 'AutoLoan':     return 'INSTALLMENT';
    case 'SecuredLoan':  return 'INSTALLMENT';
    default:             return 'OTHER';
  }
}

/** otherIncome[].incomeType — non-employment income sources. */
export function mapIncomeType(type) {
  switch (type) {
    case 'SocialSecurity': return 'SOCIAL_SECURITY';
    case 'Pension':        return 'PENSION';
    case 'Disability':     return 'DISABILITY';
    case 'Unemployment':   return 'UNEMPLOYMENT';
    case 'ChildSupport':   return 'CHILD_SUPPORT';
    case 'Alimony':        return 'ALIMONY';
    case 'Investment':     return 'DIVIDENDS_INTEREST';
    case 'Rental':         return 'OTHER';
    default:               return 'OTHER';
  }
}

// ── Sub-builders ──────────────────────────────────────────────────────────

/**
 * loan section — built from the top-level form loan/property fields. The FE has no
 * dedicated salesPrice field; for a purchase the property value IS the sales price,
 * so we mirror propertyValue → both estimatedValue and salesPrice. downPaymentAmount
 * comes from the form's derived `downPayment` field.
 */
function buildLoan(formData) {
  const propertyValue = num(formData.propertyValue);
  return {
    mortgageType: mapMortgageType(formData.loanType),
    baseLoanAmount: num(formData.loanAmount),
    downPaymentAmount: num(formData.downPayment),
    estimatedValue: propertyValue,
    salesPrice: propertyValue,
    addressLine1: str(formData.property?.addressLine),
    addressLine2: str(formData.property?.addressLine2),
    city: str(formData.property?.city),
    state: str(formData.property?.state),
    postalCode: str(formData.property?.zipCode),
    propertyType: mapPropertyType(formData.propertyType),
    occupancyType: mapOccupancyType(formData.propertyUse),
    numberOfUnits: intOrNull(formData.unitsCount),
  };
}

// mortgageType + propertyType ALWAYS resolve to a default ('OTHER' / 'SINGLE_FAMILY')
// even with no input, so they must NOT, on their own, make an otherwise-empty loan
// section look populated.
const LOAN_DEFAULTED_KEYS = new Set(['mortgageType', 'propertyType']);

/** True if the loan section carries any genuinely user-provided data worth sending. */
function loanHasData(loan) {
  return Object.entries(loan).some(([k, v]) => {
    if (LOAN_DEFAULTED_KEYS.has(k)) return false;
    return v !== null && v !== undefined && v !== '';
  });
}

function buildBorrower(b) {
  if (!b) return null;
  return {
    firstName: str(b.firstName),
    lastName: str(b.lastName),
    middleName: str(b.middleName),
    suffix: str(b.suffix),
    ssn: str(b.ssn),
    dateOfBirth: isoDate(b.dateOfBirth),
    maritalStatus: mapMaritalStatus(b.maritalStatus),
    dependentsCount: intOrNull(b.dependents),
    dependentAges: null,
    citizenshipType: mapCitizenshipType(b.citizenshipType),
    homePhone: null,
    cellPhone: normalizePhone(b.phone) || null,
    workPhone: null,
    workPhoneExt: null,
    email: str(b.email),
  };
}

function borrowerHasData(b) {
  return !!b && (hasValue(b.firstName) || hasValue(b.lastName) || hasValue(b.email) || hasValue(b.ssn));
}

/** One employment row → suite employment. Each row's monthlyIncome becomes its income. */
function buildEmployment(emp) {
  return {
    employerName: str(emp.employerName),
    employerPhone: normalizePhone(emp.employerPhone) || null,
    employerAddressLine1: str(emp.employerAddress),
    employerAddressLine2: null,
    employerCity: null,
    employerState: null,
    employerPostalCode: null,
    positionTitle: str(emp.position),
    employmentStatus: mapEmploymentStatus(emp.employmentStatus),
    classification: 'PRIMARY',
    selfEmployed: !!emp.selfEmployed,
    ownershipShare: num(emp.ownershipShare),
    employedByPartyToTransaction: false,
    startDate: isoDate(emp.startDate),
    endDate: isoDate(emp.endDate),
    monthsInLineOfWork: intOrNull(emp.monthsInLineOfWork),
    monthlyIncome: num(emp.monthlyIncome),
  };
}

function buildEmployments(employmentHistory) {
  return (employmentHistory || [])
    .filter((emp) => hasValue(emp.employerName))
    .map(buildEmployment);
}

function buildOtherIncome(incomeSources) {
  return (incomeSources || [])
    .filter((inc) => hasValue(inc.incomeType) && (num(inc.monthlyAmount) || 0) > 0)
    .map((inc) => ({
      incomeType: mapIncomeType(inc.incomeType),
      monthlyAmount: num(inc.monthlyAmount),
      description: str(inc.description),
    }));
}

function buildAssets(assets) {
  return (assets || [])
    .filter((a) => hasValue(a.assetType))
    .map((a) => ({
      assetType: mapAssetType(a.assetType),
      financialInstitution: str(a.bankName),
      accountNumber: str(a.accountNumber),
      cashOrMarketValue: num(a.assetValue),
    }));
}

function buildLiabilities(liabilities) {
  return (liabilities || [])
    .filter((l) => hasValue(l.liabilityType) && hasValue(l.creditorName))
    .map((l) => ({
      liabilityType: mapLiabilityType(l.liabilityType),
      creditorName: str(l.creditorName),
      accountNumber: str(l.accountNumber),
      unpaidBalance: num(l.unpaidBalance),
      monthlyPayment: num(l.monthlyPayment),
      monthsRemaining: intOrNull(l.monthsRemaining),
    }));
}

function buildReo(reoProperties) {
  return (reoProperties || [])
    .filter((r) => hasValue(r.addressLine))
    .map((r) => ({
      isSubjectProperty: false,
      addressLine1: str(r.addressLine),
      addressLine2: null,
      city: str(r.city),
      state: str(r.state),
      postalCode: str(r.zipCode),
      // FE REO has no STRUCTURAL property type; its propertyType is occupancy-style.
      propertyType: null,
      intendedOccupancy: mapIntendedOccupancy(r.propertyType),
      // FE has no REO status field → default RETAINED.
      propertyStatus: 'RETAINED',
      marketValue: num(r.propertyValue),
      grossMonthlyRentalIncome: num(r.monthlyRentalIncome),
      monthlyTaxes: null,
      monthlyInsurance: null,
      monthlyHoaDues: null,
      monthlyMaintenance: null,
      mortgageUnpaidBalance: num(r.unpaidBalance),
      mortgageMonthlyPayment: num(r.monthlyPayment),
    }));
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Convert react-hook-form values to the suite BorrowerApplicationRequest body.
 *
 * Each section is included (non-null) ONLY when the form has data for it; an empty
 * section is sent as null so the suite SKIPS it (a present section is a full replace,
 * so we never want to wipe a populated section in the SoR with an empty array).
 *
 * @param {object} formData  Raw react-hook-form values (getValues() / handleSubmit data).
 * @returns {object}         Body for PUT /api/loans/{loanId}/application.
 */
export function formToSuiteApplication(formData) {
  const data = formData || {};
  const primary = (data.borrowers || [])[0] || null;

  const loan = buildLoan(data);

  const borrower = buildBorrower(primary);

  const employments = buildEmployments(primary?.employmentHistory);
  const otherIncome = buildOtherIncome(primary?.incomeSources);
  const income = (employments.length || otherIncome.length)
    ? { employments, otherIncome }
    : null;

  // Assets & liabilities live under borrowers[0] in the form model.
  const assets = buildAssets(primary?.assets);
  const liabilities = buildLiabilities(primary?.liabilities);
  const reo = buildReo(primary?.reoProperties);

  return {
    loan: loanHasData(loan) ? loan : null,
    borrower: borrowerHasData(primary) ? borrower : null,
    income,
    assets: assets.length ? assets : null,
    liabilities: liabilities.length ? liabilities : null,
    reo: reo.length ? reo : null,
    // TODO: §5 Declarations + §8 HMDA Demographics. The suite endpoint already
    // accepts `declarations` and `demographics` sections, but the FE field model
    // (flat declaration/HMDA fields on the borrower row, see applicationPayload.js
    // buildDeclaration) does not yet match the suite enum shape — DEFERRED.
    declarations: null,
    demographics: null,
  };
}

export default formToSuiteApplication;
