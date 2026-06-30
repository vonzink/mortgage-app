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
 * liabilities/reo nested under each borrower. borrowers[0] is the PRIMARY (maps to the
 * top-level borrower/income/assets/liabilities/reo sections, plus the application-level
 * loan/declarations/demographics); borrowers[1..] are CO-BORROWERS (joint applicants),
 * each mapped to a `coBorrowers[]` CoBorrowerSection of the same sub-shapes.
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

/** Strict ISO date — emit only YYYY-MM-DD (what the suite's LocalDate parses), else
 *  null. A non-ISO string (e.g. "03/2019") would 400 the whole body, so drop it. */
function isoDate(value) {
  if (!hasValue(value)) return null;
  const s = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Valid suite UsStateCode constants (USPS 2-letter incl. DC + territories). */
const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
  'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV',
  'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN',
  'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'AS', 'GU', 'MP', 'PR', 'VI',
]);

/** Normalize a state to a valid suite UsStateCode (2-letter, upper), else null — the
 *  suite field is an enum, so a free-text "Colorado"/"co" must not be sent raw. */
function usState(value) {
  if (!hasValue(value)) return null;
  const s = String(value).trim().toUpperCase();
  return US_STATE_CODES.has(s) ? s : null;
}

/** OwnershipInterestType — the suite field is a bucketed enum, never a number. */
function ownershipInterest(value) {
  const n = num(value);
  if (n === null) return null;
  return n >= 25 ? 'GREATER_OR_EQUAL_25' : 'LESS_THAN_25';
}

// ── Enum maps (FE string → suite enum) ────────────────────────────────────

export function mapMortgageType(loanType) {
  switch (loanType) {
    case 'Conventional': return 'CONVENTIONAL';
    case 'FHA':          return 'FHA';
    case 'VA':           return 'VA';
    case 'USDA':         return 'USDA_RURAL_DEVELOPMENT';
    // 'TBD' is the form's "To Be Determined" default — the borrower hasn't picked a program.
    // Send null (the suite column is nullable) so we never stamp a guessed 'OTHER'.
    case 'TBD':          return null;
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

// ── HMDA demographics (§8) enum maps ──────────────────────────────────────
//
// The FE stores race/ethnicity as comma-separated MISMO-style codes (see
// DeclarationsStep.js HmdaSection) and sex as a single MISMO code. Each FE code
// maps to its EXACT suite enum constant (declarations/domain/{Race,Ethnicity,Sex}).
// The FE option sets are COARSE (top-level only — no sub-categories like MEXICAN,
// CHINESE, SAMOAN), so we map only the top-level values the FE actually offers;
// any code with no exact suite enum is OMITTED (never invented/guessed).
// DO_NOT_WISH_TO_PROVIDE comes ONLY from the refusal flags, not from any FE code.

/** One FE race code → suite Race enum constant (null = unmappable → caller omits). */
export function mapRaceCode(code) {
  switch (code) {
    case 'AmericanIndianOrAlaskaNative':         return 'AMERICAN_INDIAN_OR_ALASKA_NATIVE';
    case 'Asian':                                return 'ASIAN';
    case 'BlackOrAfricanAmerican':               return 'BLACK_OR_AFRICAN_AMERICAN';
    case 'NativeHawaiianOrOtherPacificIslander': return 'NATIVE_HAWAIIAN_OR_PACIFIC_ISLANDER';
    case 'White':                                return 'WHITE';
    default:                                     return null;
  }
}

/** One FE ethnicity code → suite Ethnicity enum constant (null = unmappable → caller omits). */
export function mapEthnicityCode(code) {
  switch (code) {
    case 'HispanicOrLatino':    return 'HISPANIC_OR_LATINO';
    case 'NotHispanicOrLatino': return 'NOT_HISPANIC_OR_LATINO';
    default:                    return null;
  }
}

/**
 * FE sex code → suite Sex enum constant (null = unselected/unmappable).
 * The suite Sex enum is {MALE, FEMALE, DO_NOT_WISH_TO_PROVIDE} — it has NO
 * "not applicable" / "unknown" value, so the FE 'InformationNotProvidedUnknown'
 * and 'NotApplicable' are NOT mapped here; a borrower who does not affirmatively
 * pick Male/Female is represented via the explicit hmdaSexRefusal flag →
 * DO_NOT_WISH_TO_PROVIDE in buildDemographics. Mapping these soft codes to
 * DO_NOT_WISH_TO_PROVIDE here would FABRICATE an affirmative refusal the
 * borrower never made, so they are dropped (regulated data: omit, don't guess).
 */
export function mapSexCode(code) {
  switch (code) {
    case 'Male':   return 'MALE';
    case 'Female': return 'FEMALE';
    default:       return null;
  }
}

/** Split a FE comma-separated code string into trimmed, non-empty tokens. */
function csvTokens(csv) {
  if (!hasValue(csv)) return [];
  return String(csv).split(',').map((s) => s.trim()).filter(Boolean);
}

/** Map a FE CSV of codes through `mapFn`, dropping unmappable codes, de-duped. */
function mapCsvToEnums(csv, mapFn) {
  const out = [];
  for (const token of csvTokens(csv)) {
    const mapped = mapFn(token);
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
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
    // Optional monthly escrow estimates (page-3 collapsible block). Read from the
    // same property.* path as the address fields above; null when blank → omitted.
    proposedTaxesMonthly: num(formData.property?.proposedTaxesMonthly),
    proposedHazardInsuranceMonthly: num(formData.property?.proposedHazardInsuranceMonthly),
    proposedHoaDuesMonthly: num(formData.property?.proposedHoaDuesMonthly),
    proposedMortgageInsuranceMonthly: num(formData.property?.proposedMortgageInsuranceMonthly),
  };
}

// mortgageType resolves to 'OTHER' for unknown input (or null for the explicit 'TBD'
// default) and propertyType ALWAYS resolves to 'SINGLE_FAMILY' even with no input, so
// neither must, on its own, make an otherwise-empty loan section look populated.
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

export function borrowerHasData(b) {
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
    ownershipShare: ownershipInterest(emp.ownershipShare),
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

/**
 * REO use/disposition (FE page-5 select) → suite reo enum fields. Applied ON TOP of
 * the base mapping below: only the fields named in a branch are overridden; everything
 * else keeps its base value. propertyStatus is ALWAYS set to a valid ReoPropertyStatus
 * (never null), defaulting to RETAINED for blank/unknown `use`.
 */
function reoUseOverrides(use) {
  switch (use) {
    case 'Investment':   return { intendedOccupancy: 'INVESTMENT',  propertyStatus: 'RETAINED' };
    case 'SecondHome':   return { intendedOccupancy: 'SECOND_HOME', propertyStatus: 'RETAINED' };
    case 'Timeshare':    return { propertyType: 'TIMESHARE',        propertyStatus: 'RETAINED' };
    case 'ToBeSold':     return { propertyStatus: 'PENDING_SALE' };
    case 'PaidByOthers': return { propertyStatus: 'PAID_BY_OTHERS' };
    default:             return { propertyStatus: 'RETAINED' };
  }
}

/**
 * income section for ONE borrower → suite IncomeSection `{ employments, otherIncome }`,
 * or null when the borrower has neither. Shared by the primary and each co-borrower so
 * the wire shape is identical for all applicants.
 */
function buildIncomeSection(b) {
  const employments = buildEmployments(b?.employmentHistory);
  const otherIncome = buildOtherIncome(b?.incomeSources);
  return (employments.length || otherIncome.length)
    ? { employments, otherIncome }
    : null;
}

function buildReo(reoProperties) {
  return (reoProperties || [])
    .filter((r) => hasValue(r.addressLine))
    .map((r) => {
      // Base mapping (preserved): FE REO has no STRUCTURAL property type; its
      // propertyType field is occupancy-style → intendedOccupancy. propertyStatus
      // defaults to RETAINED. The `use` overrides below replace ONLY the fields they
      // name, so the base intendedOccupancy/propertyType survive when not overridden.
      const base = {
        isSubjectProperty: false,
        addressLine1: str(r.addressLine),
        addressLine2: null,
        city: str(r.city),
        state: usState(r.state),
        postalCode: str(r.zipCode),
        propertyType: null,
        intendedOccupancy: mapIntendedOccupancy(r.propertyType),
        propertyStatus: 'RETAINED',
        note: str(r.note),
        marketValue: num(r.propertyValue),
        grossMonthlyRentalIncome: num(r.monthlyRentalIncome),
        monthlyTaxes: null,
        monthlyInsurance: null,
        monthlyHoaDues: null,
        monthlyMaintenance: null,
        mortgageUnpaidBalance: num(r.unpaidBalance),
        mortgageMonthlyPayment: num(r.monthlyPayment),
      };
      return { ...base, ...reoUseOverrides(r.use) };
    });
}

/**
 * One co-borrower (joint applicant) → suite CoBorrowerSection
 * `{ borrower, income, assets, liabilities, reo }` — the SAME sub-shapes the primary
 * uses, MINUS loan §4 / declarations / demographics (those are application-level, only
 * on the primary path). Reuses the shared section builders, parameterized per borrower.
 */
function buildCoBorrowerSection(b) {
  return {
    borrower: buildBorrower(b),
    income: buildIncomeSection(b),
    assets: buildAssets(b?.assets),
    liabilities: buildLiabilities(b?.liabilities),
    reo: buildReo(b?.reoProperties),
  };
}

/**
 * §5 Declarations — built from the PRIMARY borrower's declaration fields (the suite
 * applies declarations to the primary borrower only; co-borrowers don't carry them).
 *
 * The live UI (DeclarationsStep.js) stores each §5 answer as a BOOLEAN checkbox under
 * `borrowers[i].declaration.*`. Every FE checkbox has an EXACT 1:1 suite field in
 * DeclarationsRequest, so all 15 are mapped. A small set of legacy flat/aliased keys
 * (from older backend-load hydration) is also coalesced defensively via `pick()` so a
 * rehydrated form still maps — sibling-level wins, then `declaration.*`.
 *
 * `bool()` returns null when the FE carries no value at all (= "unanswered", NOT false),
 * so an untouched form yields an all-null declarations object → declarationsHaveData()
 * sends null → the suite SKIPS the section (never clobbers an LO's prior answers).
 *
 * The 3 enum/set §5 fields (priorPropertyUsage: OccupancyType, priorPropertyTitleType:
 * PriorPropertyTitleType, bankruptcyTypes: Set<BankruptcyType>) have NO reliable FE
 * source — the form collects none of them — so they stay null/omitted (never guessed).
 */
function buildDeclarations(b) {
  if (!b) return null;
  const d = b.declaration || {};
  const pick = (k) => (b[k] !== undefined ? b[k] : d[k]);

  // Strict Boolean ONLY when the FE actually carries a value; else null (= unanswered).
  const bool = (v) => (v === null || v === undefined ? null : !!v);
  // OR several FE sources; null only when ALL are absent (so a single true wins).
  const boolAny = (...vals) => {
    const present = vals.filter((v) => v !== null && v !== undefined);
    if (present.length === 0) return null;
    return present.some((v) => !!v);
  };

  return {
    occupyAsPrimaryResidence: boolAny(pick('occupyPrimaryResidence'), pick('intentToOccupy')),
    hadOwnershipInterestLast3Years: bool(pick('ownershipInterestThreeYears')),
    familyOrBusinessAffiliationWithSeller: bool(pick('familyBusinessAffiliation')),
    borrowingUndisclosedMoney: bool(pick('borrowingMoneyTransaction')),
    applyingForOtherMortgageOnProperty: bool(pick('applyingMortgageOtherProperty')),
    applyingForNewCreditBeforeClosing: bool(pick('applyingNewCredit')),
    subjectToPriorityLienPace: bool(pick('propertySubjectLien')),
    coSignerOrGuarantorOnUndisclosedDebt: boolAny(
      pick('coSignerGuarantor'), pick('comakerEndorser'), pick('coSignerObligation'),
    ),
    outstandingJudgments: bool(pick('outstandingJudgments')),
    delinquentOrDefaultOnFederalDebt: boolAny(pick('delinquentFederalDebt'), pick('presentlyDelinquent')),
    partyToLawsuit: boolAny(pick('partyToLawsuit'), pick('lawsuit')),
    conveyedTitleInLieuLast7Years: bool(pick('conveyedTitleLieuForeclosure')),
    completedPreForeclosureShortSaleLast7Years: bool(pick('preForeclosureSale')),
    propertyForeclosedLast7Years: boolAny(
      pick('propertyForeclosedSevenYears'), pick('foreclosure'), pick('loanForeclosure'),
    ),
    declaredBankruptcyLast7Years: boolAny(pick('declaredBankruptcySevenYears'), pick('bankruptcy')),
    // No FE source — never guessed (regulated).
    priorPropertyUsage: null,
    priorPropertyTitleType: null,
    bankruptcyTypes: null,
  };
}

/** True if the declarations section carries at least one non-null mapped field. */
function declarationsHaveData(decl) {
  return !!decl && Object.values(decl).some((v) => v !== null && v !== undefined);
}

/**
 * §8 HMDA Demographics (self-report ONLY) — ethnicity/race/sex from the PRIMARY
 * borrower's HMDA fields (DeclarationsStep.js HmdaSection). The suite forces the
 * lender-attestation fields (collectedByVisualObservationOrSurname=false,
 * applicationTakenMethod=INTERNET) in its orchestrator — the DemographicsInfo record
 * has ONLY ethnicity/race/sex, so we send exactly those three.
 *
 * Race/ethnicity are FE comma-separated MISMO code strings → arrays of EXACT suite
 * enum constants (Set<Ethnicity>/Set<Race> on the wire). Unmappable codes are DROPPED
 * (never invented). A refusal flag is an affirmative "decline to provide" → it
 * overrides to the single suite DO_NOT_WISH_TO_PROVIDE value for that axis. Sex maps
 * Male/Female; a refusal → DO_NOT_WISH_TO_PROVIDE; anything else → null (omit).
 */
function buildDemographics(b) {
  if (!b) return null;
  const d = b.declaration || {};
  const pick = (k) => (b[k] !== undefined ? b[k] : d[k]);

  const ethnicity = pick('hmdaEthnicityRefusal')
    ? ['DO_NOT_WISH_TO_PROVIDE']
    : mapCsvToEnums(pick('hmdaEthnicity'), mapEthnicityCode);

  const race = pick('hmdaRaceRefusal')
    ? ['DO_NOT_WISH_TO_PROVIDE']
    : mapCsvToEnums(pick('hmdaRace'), mapRaceCode);

  const sex = pick('hmdaSexRefusal')
    ? 'DO_NOT_WISH_TO_PROVIDE'
    : mapSexCode(pick('hmdaSex'));

  return { ethnicity, race, sex };
}

/** True if any of ethnicity/race/sex carries data worth sending. */
function demographicsHaveData(demo) {
  return !!demo && ((demo.ethnicity && demo.ethnicity.length > 0)
    || (demo.race && demo.race.length > 0)
    || (demo.sex !== null && demo.sex !== undefined));
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

  // Same shared income builder the co-borrowers use → primary output is unchanged.
  const income = buildIncomeSection(primary);

  // Assets & liabilities live under borrowers[0] in the form model.
  const assets = buildAssets(primary?.assets);
  const liabilities = buildLiabilities(primary?.liabilities);
  const reo = buildReo(primary?.reoProperties);

  // Co-borrowers (joint applicants) = borrowers[1..]. Each maps to a CoBorrowerSection
  // via the SAME section builders as the primary. Drop blank appended rows (no name) so
  // an empty co-borrower tab isn't submitted. Omit the key entirely when there are none,
  // so a single-borrower submit is byte-for-byte identical to before.
  const coBorrowers = (data.borrowers || [])
    .slice(1)
    .filter((b) => borrowerHasData(b))
    .map(buildCoBorrowerSection);

  // §5 Declarations + §8 HMDA Demographics — application-level / PRIMARY-only (the suite
  // applies both to the primary borrower; co-borrowers don't carry them). Sent (non-null)
  // only when the borrower answered something; else null → the suite SKIPS the section.
  const declarations = buildDeclarations(primary);
  const demographics = buildDemographics(primary);

  return {
    loan: loanHasData(loan) ? loan : null,
    borrower: borrowerHasData(primary) ? borrower : null,
    income,
    assets: assets.length ? assets : null,
    liabilities: liabilities.length ? liabilities : null,
    reo: reo.length ? reo : null,
    declarations: declarationsHaveData(declarations) ? declarations : null,
    demographics: demographicsHaveData(demographics) ? demographics : null,
    // Joint applicants. Omitted entirely (spread of {}) when there are none, so the
    // single-borrower body is byte-for-byte unchanged; sent as CoBorrowerSection[] otherwise.
    ...(coBorrowers.length ? { coBorrowers } : {}),
  };
}

export default formToSuiteApplication;
