/**
 * Suite-to-form reverse mapper — the inverse of suiteApplicationPayload.js.
 *
 * Maps a suite `GET /api/loans/{id}/application` response back into the react-hook-form
 * state the /apply wizard consumes via `reset(data)`. Used by the staff "open a loan in
 * the wizard" mode (Task 13) to prefill the form with the loan's EXISTING application.
 *
 * ⚠️ WHAT THE SUITE RETURNS TODAY (BorrowerApplicationResponse.java): ONLY
 * {loanId, loanNumber, borrowerId, loan, borrower, addresses} — the borrower carries
 * hasSsn (never the SSN), and LoanInfo does NOT include the four proposed*Monthly escrow
 * estimates. So in prod, TODAY, only the loan + borrower + addresses sections prefill. The
 * other six section mappers here (income, assets, liabilities, reo, declarations,
 * demographics, coBorrowers) are future-proofing: they hydrate as plain wizard
 * defaults until the suite GET grows to the full request shape. That is SAFE — an
 * empty/default section forwards to null, and the suite SKIPS null sections on PUT,
 * so loading a partial response and resubmitting cannot wipe SoR data.
 *
 * `addresses` is returned precisely BECAUSE it is a full-replace section the wizard now
 * writes: without hydration, reopening the wizard and resubmitting would replace the
 * borrower's stored residence history with whatever single address was retyped.
 *
 * Pure functions only — no React, no HTTP. The invariant this file is tested against:
 *
 *     form → wire → form → wire   produces two deep-equal wire bodies.
 *
 * i.e. everything the FORM can express survives the loop. Suite-side data the form has
 * no home for is intentionally lossy (documented inline) — it is surfaced where a form
 * slot exists, and silently dropped (never guessed) where none does.
 *
 * Enum reversal is DERIVED from the exported forward `mapX` functions: each inverse
 * table is built by probing the forward map with the wizard's real option values, so a
 * forward-table change automatically re-shapes the inverse (no hand-written drift).
 *
 * Known one-way (form → wire only) fields with NO wire home — untouched here, so the
 * wizard defaults stand: loanPurpose, yearBuilt, constructionType, downPaymentSource,
 * gift fields, residence start/end DATES (the span survives as years+months; the dates
 * themselves have no column), asset owner/usedForDownpayment,
 * liability owner, REO owner/category/ownedFreeAndClear/associatedLiabilities,
 * declaration.hmdaEthnicityOrigin, declaration.applicationTakenMethod.
 * Known wire-only fields with NO form home — dropped here: borrower homePhone-as-its-own
 * -field/workPhone/workPhoneExt/dependentAges, employment employerAddressLine2/City/
 * State/PostalCode + classification + employedByPartyToTransaction, REO
 * isSubjectProperty + monthlyTaxes/Insurance/HoaDues/Maintenance, declarations
 * priorPropertyUsage/priorPropertyTitleType/bankruptcyTypes.
 */

import { hasValue } from './applicationPayload';
import { formatSSN, formatPhone } from './format';
import {
  createDefaultBorrower,
  createDefaultResidence,
  createDefaultEmployment,
  createDefaultIncomeSource,
  createDefaultAsset,
  createDefaultLiability,
  createDefaultREOProperty,
} from './fieldArrayHelpers';
import {
  mapMortgageType,
  mapOccupancyType,
  mapPropertyType,
  mapEmploymentStatus,
  mapMaritalStatus,
  mapCitizenshipType,
  mapAssetType,
  mapLiabilityType,
  mapIncomeType,
  mapRaceCode,
  mapEthnicityCode,
  mapSexCode,
} from './suiteApplicationPayload';

// ── Inverse enum tables (derived by probing the forward maps) ─────────────

/**
 * Build a suite→form lookup by running each candidate form value through the
 * forward map. Candidate order is the canonical preference: when several form
 * values collapse onto one suite enum (e.g. IRA/Pension/Retirement401k →
 * RETIREMENT), the FIRST candidate that produces the suite value wins.
 */
function invertEnumMap(mapFn, formValueCandidates) {
  const table = {};
  formValueCandidates.forEach((formValue) => {
    const suiteValue = mapFn(formValue);
    if (suiteValue !== null && suiteValue !== undefined && !(suiteValue in table)) {
      table[suiteValue] = formValue;
    }
  });
  return table;
}

/** suiteValue → form value; null/undefined → '', unknown suite value → `unknownFallback`. */
function fromTable(table, suiteValue, unknownFallback = '') {
  if (suiteValue === null || suiteValue === undefined) return '';
  return table[suiteValue] !== undefined ? table[suiteValue] : unknownFallback;
}

// Candidates are the REAL wizard <option value>s (LoanInformationStep,
// PersonalInfoField, EmploymentStep, AssetsSection, AssetsLiabilitiesStep).
const INV_MORTGAGE_TYPE = invertEnumMap(mapMortgageType,
  ['Conventional', 'FHA', 'VA', 'USDA', 'Other']);
const INV_PROPERTY_TYPE = invertEnumMap(mapPropertyType,
  ['SingleFamily', 'Condo', 'Townhouse', 'MultiFamily', 'Manufactured']);
const INV_PROPERTY_USE = invertEnumMap(mapOccupancyType,
  ['Primary', 'Secondary', 'Investment']);
const INV_EMPLOYMENT_STATUS = invertEnumMap(mapEmploymentStatus, ['Present', 'Prior']);
const INV_MARITAL_STATUS = invertEnumMap(mapMaritalStatus, ['Married', 'Separated', 'Single']);
const INV_CITIZENSHIP = invertEnumMap(mapCitizenshipType,
  ['USCitizen', 'PermanentResident', 'NonPermanentResident', 'ForeignNational']);
const INV_ASSET_TYPE = invertEnumMap(mapAssetType,
  ['Checking', 'Savings', 'MoneyMarket', 'CertificateOfDeposit', 'MutualFunds',
    'Stocks', 'Bonds', 'Retirement401k', 'EarnestMoney', 'Other']);
const INV_LIABILITY_TYPE = invertEnumMap(mapLiabilityType,
  ['MortgageLoan', 'Revolving', 'Installment', 'Other']);
const INV_INCOME_TYPE = invertEnumMap(mapIncomeType,
  ['SocialSecurity', 'Pension', 'Disability', 'Unemployment', 'ChildSupport',
    'Alimony', 'Investment', 'Other']);
const INV_RACE = invertEnumMap(mapRaceCode,
  ['AmericanIndianOrAlaskaNative', 'Asian', 'BlackOrAfricanAmerican',
    'NativeHawaiianOrOtherPacificIslander', 'White']);
const INV_ETHNICITY = invertEnumMap(mapEthnicityCode,
  ['HispanicOrLatino', 'NotHispanicOrLatino']);
const INV_SEX = invertEnumMap(mapSexCode, ['Male', 'Female']);

// The wizard's Occupancy dropdown values are NOT forward-map inputs (the forward
// path reads propertyUse), so this display-only companion is a literal — it mirrors
// ApplicationForm's edit-mode deriveOccupancy().
const OCCUPANCY_BY_SUITE = {
  PRIMARY_RESIDENCE: 'OwnerOccupied',
  SECOND_HOME: 'SecondHome',
  INVESTMENT: 'Investment',
};

// reoUseOverrides() switch keys for the occupancy-carrying `use` values — these ARE
// the wizard's REO disposition <option value>s, and each forward-maps back to the
// same intendedOccupancy it came from.
const REO_USE_BY_OCCUPANCY = {
  PRIMARY_RESIDENCE: 'Primary',
  SECOND_HOME: 'SecondHome',
  INVESTMENT: 'Investment',
};

// ── Scalar helpers ────────────────────────────────────────────────────────

/** Pass a wire scalar through, mapping null/undefined to '' (what blank inputs hold). */
const orBlank = (v) => (v === null || v === undefined ? '' : v);

/** Format a wire phone ("NNN-NNN-NNNN") for the masked input; idempotent. */
const phoneOrBlank = (v) => (hasValue(v) ? formatPhone(v) : '');

// ── Section mappers ───────────────────────────────────────────────────────

/** loan section → top-level loan/property form fields (inverse of buildLoan). */
function applyLoan(form, loan) {
  // null mortgageType is the explicit "To Be Determined"; unknown enums fall back to
  // 'Other' so an untouched resubmit re-emits OTHER instead of silently nulling it.
  form.loanType = (loan.mortgageType === null || loan.mortgageType === undefined)
    ? 'TBD'
    : fromTable(INV_MORTGAGE_TYPE, loan.mortgageType, 'Other');
  form.loanAmount = orBlank(loan.baseLoanAmount);
  form.downPayment = orBlank(loan.downPaymentAmount);
  // The forward mapper mirrors propertyValue onto BOTH estimatedValue and salesPrice;
  // prefer estimatedValue, fall back to salesPrice.
  form.propertyValue = orBlank(
    loan.estimatedValue !== null && loan.estimatedValue !== undefined
      ? loan.estimatedValue
      : loan.salesPrice,
  );
  form.propertyType = fromTable(INV_PROPERTY_TYPE, loan.propertyType, '');
  form.propertyUse = fromTable(INV_PROPERTY_USE, loan.occupancyType, '');
  form.occupancy = fromTable(OCCUPANCY_BY_SUITE, loan.occupancyType, '');
  form.unitsCount = orBlank(loan.numberOfUnits);
  form.notes = orBlank(loan.notes);
  form.property = {
    addressLine: orBlank(loan.addressLine1),
    addressLine2: orBlank(loan.addressLine2),
    city: orBlank(loan.city),
    state: orBlank(loan.state),
    zipCode: orBlank(loan.postalCode),
    proposedTaxesMonthly: orBlank(loan.proposedTaxesMonthly),
    proposedHazardInsuranceMonthly: orBlank(loan.proposedHazardInsuranceMonthly),
    proposedHoaDuesMonthly: orBlank(loan.proposedHoaDuesMonthly),
    proposedMortgageInsuranceMonthly: orBlank(loan.proposedMortgageInsuranceMonthly),
  };
}

/** borrower section → personal fields on a form borrower (inverse of buildBorrower). */
function applyBorrowerInfo(target, b) {
  target.firstName = orBlank(b.firstName);
  target.lastName = orBlank(b.lastName);
  target.middleName = orBlank(b.middleName);
  target.suffix = orBlank(b.suffix);
  // The GET response NEVER carries the SSN (only hasSsn) — keep the default '' then,
  // so an untouched resubmit sends null and the suite keeps what's on file.
  if (hasValue(b.ssn)) target.ssn = formatSSN(b.ssn);
  target.dateOfBirth = orBlank(b.dateOfBirth);
  target.maritalStatus = fromTable(INV_MARITAL_STATUS, b.maritalStatus, '');
  target.dependents = orBlank(b.dependentsCount);
  target.citizenshipType = fromTable(INV_CITIZENSHIP, b.citizenshipType, '');
  // The form has ONE phone field; the forward path writes it to cellPhone. Fall back
  // to a staff-entered homePhone so the wizard still shows a reachable number.
  target.phone = hasValue(b.cellPhone) ? phoneOrBlank(b.cellPhone) : phoneOrBlank(b.homePhone);
  target.email = orBlank(b.email);
}

// Inverse of the payload builder's residence tables.
const FORM_RESIDENCY_TYPE = { PRESENT: 'Current', PREVIOUS: 'Prior' };
const FORM_RESIDENCY_BASIS = { OWN: 'Own', RENT: 'Rent', LIVING_RENT_FREE: 'LivingRentFree' };

/**
 * One wire address → form residences row (inverse of buildAddresses).
 *
 * Lossy in one direction by construction: a PRIOR residence was authored with start/end DATES,
 * which the wire reduced to years+months (the table has no date columns). Re-hydrating puts the
 * duration back on the Current-shaped inputs and leaves startDate/endDate blank — the span
 * survives, the exact dates don't. That's why residenceDuration() falls back to durationMonths.
 */
const RESIDENCE_TYPES = new Set(['PRESENT', 'PREVIOUS']);

/** A wire address the wizard can't edit, kept in its wire (AddressInfo) shape. */
function toPassthroughAddress(a) {
  return {
    addressType: a.addressType,
    addressLine1: a.addressLine1 ?? null,
    addressLine2: a.addressLine2 ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
    postalCode: a.postalCode ?? null,
    ownershipType: a.ownershipType ?? null,
    residencyDurationYears: a.residencyDurationYears ?? null,
    residencyDurationMonths: a.residencyDurationMonths ?? null,
    rentAmount: a.rentAmount ?? null,
  };
}

function toFormResidence(a, index) {
  const row = createDefaultResidence(
    index + 1,
    FORM_RESIDENCY_TYPE[a.addressType] || (index === 0 ? 'Current' : 'Prior'),
  );
  row.addressLine = orBlank(a.addressLine1);
  // No wizard input for line 2, but it must survive the full-replace save.
  row.addressLine2 = orBlank(a.addressLine2);
  row.city = orBlank(a.city);
  row.state = orBlank(a.state);
  row.zipCode = orBlank(a.postalCode);
  row.residencyBasis = fromTable(FORM_RESIDENCY_BASIS, a.ownershipType, '');
  row.monthlyRent = orBlank(a.rentAmount);
  const years = Number(a.residencyDurationYears) || 0;
  const months = Number(a.residencyDurationMonths) || 0;
  if (years || months) {
    row.durationYears = years;
    row.durationMonthsOnly = months;
    row.durationMonths = years * 12 + months;
  }
  return row;
}

/**
 * addresses[] → residences[] + the separate mailingAddress slot.
 *
 * MAILING rows are pulled OUT of the residence list — the wizard models the mailing address as
 * its own field behind the "same as my present address" checkbox, not as a residence tab. A
 * MAILING row on the wire therefore means the borrower unticked that box, so it's unticked here.
 */
function applyAddresses(target, addresses) {
  const residences = addresses.filter((a) => a && RESIDENCE_TYPES.has(a.addressType));
  const mailing = addresses.find((a) => a && a.addressType === 'MAILING');
  // Types the wizard has no UI for (TAX_FILING_CURRENT / TAX_FILING_PREVIOUS, extra MAILING
  // rows) ride along untouched. The addresses section is a full REPLACE on save, so anything
  // not carried back here would be deleted — and folding them into residences[] would rewrite
  // a tax-filing address as a prior residence.
  const passthrough = addresses.filter((a) => a && !RESIDENCE_TYPES.has(a.addressType) && a !== mailing);

  if (residences.length) target.residences = residences.map(toFormResidence);
  if (passthrough.length) target.suitePassthroughAddresses = passthrough.map(toPassthroughAddress);
  if (mailing) {
    target.mailingSameAsPresent = false;
    target.mailingAddress = {
      addressLine: orBlank(mailing.addressLine1),
      addressLine2: orBlank(mailing.addressLine2),
      city: orBlank(mailing.city),
      state: orBlank(mailing.state),
      zipCode: orBlank(mailing.postalCode),
    };
  }
}

/** One wire employment → form employmentHistory row (inverse of buildEmployment). */
function toFormEmployment(emp, index) {
  const row = createDefaultEmployment(
    index + 1,
    fromTable(INV_EMPLOYMENT_STATUS, emp.employmentStatus, ''),
  );
  row.employerName = orBlank(emp.employerName);
  row.position = orBlank(emp.positionTitle);
  row.startDate = orBlank(emp.startDate);
  row.endDate = orBlank(emp.endDate);
  row.monthlyIncome = orBlank(emp.monthlyIncome);
  row.employerAddress = orBlank(emp.employerAddressLine1);
  row.employerPhone = phoneOrBlank(emp.employerPhone);
  row.selfEmployed = !!emp.selfEmployed;
  row.monthsInLineOfWork = orBlank(emp.monthsInLineOfWork);
  // OwnershipInterestType is a BUCKET (the numeric form value is lossy on the wire).
  // Re-hydrate a representative in-bucket number so the bucket survives a resubmit.
  if (emp.ownershipShare === 'GREATER_OR_EQUAL_25') row.ownershipShare = 25;
  else if (emp.ownershipShare === 'LESS_THAN_25') row.ownershipShare = 24;
  else row.ownershipShare = '';
  return row;
}

/** One wire otherIncome row → form incomeSources row (inverse of buildOtherIncome). */
function toFormIncomeSource(inc) {
  const row = createDefaultIncomeSource();
  row.incomeType = fromTable(INV_INCOME_TYPE, inc.incomeType, 'Other');
  row.monthlyAmount = orBlank(inc.monthlyAmount);
  row.description = orBlank(inc.description);
  return row;
}

/** One wire asset → form asset row (inverse of buildAssets). */
function toFormAsset(a) {
  const row = createDefaultAsset();
  row.assetType = fromTable(INV_ASSET_TYPE, a.assetType, 'Other');
  row.bankName = orBlank(a.financialInstitution);
  row.accountNumber = orBlank(a.accountNumber);
  row.assetValue = orBlank(a.cashOrMarketValue);
  return row;
}

/** One wire liability → form liability row (inverse of buildLiabilities). */
function toFormLiability(l) {
  const row = createDefaultLiability();
  row.liabilityType = fromTable(INV_LIABILITY_TYPE, l.liabilityType, 'Other');
  row.creditorName = orBlank(l.creditorName);
  row.accountNumber = orBlank(l.accountNumber);
  row.unpaidBalance = orBlank(l.unpaidBalance);
  row.monthlyPayment = orBlank(l.monthlyPayment);
  row.monthsRemaining = orBlank(l.monthsRemaining);
  return row;
}

/**
 * One wire reo → form reoProperties row (inverse of buildReo + reoUseOverrides).
 *
 * The wire triple {propertyType, intendedOccupancy, propertyStatus} folds back into
 * the form's two slots {propertyType, use}:
 *  - TIMESHARE / PENDING_SALE / PAID_BY_OTHERS claim the `use` slot; a surviving
 *    intendedOccupancy is preserved through the form's reo propertyType slot (whose
 *    forward path is mapIntendedOccupancy), so the full triple re-emits exactly.
 *  - Otherwise (RETAINED or unknown status) `use` carries the occupancy and the
 *    propertyType slot surfaces a suite-side STRUCTURAL type if one exists (the
 *    forward path drops structural REO types — a documented forward asymmetry).
 */
function toFormReo(r) {
  const row = createDefaultREOProperty();
  row.addressLine = orBlank(r.addressLine1);
  row.city = orBlank(r.city);
  row.state = orBlank(r.state);
  row.zipCode = orBlank(r.postalCode);
  row.note = orBlank(r.note);
  row.propertyValue = orBlank(r.marketValue);
  row.monthlyRentalIncome = orBlank(r.grossMonthlyRentalIncome);
  row.monthlyPayment = orBlank(r.mortgageMonthlyPayment);
  row.unpaidBalance = orBlank(r.mortgageUnpaidBalance);

  const occupancyFormValue = fromTable(INV_PROPERTY_USE, r.intendedOccupancy, '');
  if (r.propertyType === 'TIMESHARE') {
    row.use = 'Timeshare';
    row.propertyType = occupancyFormValue;
  } else if (r.propertyStatus === 'PENDING_SALE') {
    row.use = 'ToBeSold';
    row.propertyType = occupancyFormValue || fromTable(INV_PROPERTY_TYPE, r.propertyType, '');
  } else if (r.propertyStatus === 'PAID_BY_OTHERS') {
    row.use = 'PaidByOthers';
    row.propertyType = occupancyFormValue || fromTable(INV_PROPERTY_TYPE, r.propertyType, '');
  } else {
    row.use = fromTable(REO_USE_BY_OCCUPANCY, r.intendedOccupancy, '');
    row.propertyType = fromTable(INV_PROPERTY_TYPE, r.propertyType, '');
  }
  return row;
}

// Wire declarations key → the canonical DeclarationsStep checkbox key under
// borrowers[i].declaration.* (the FIRST source in each buildDeclarations pick chain).
const DECLARATION_KEY_BY_WIRE = {
  occupyAsPrimaryResidence: 'occupyPrimaryResidence',
  hadOwnershipInterestLast3Years: 'ownershipInterestThreeYears',
  familyOrBusinessAffiliationWithSeller: 'familyBusinessAffiliation',
  borrowingUndisclosedMoney: 'borrowingMoneyTransaction',
  applyingForOtherMortgageOnProperty: 'applyingMortgageOtherProperty',
  applyingForNewCreditBeforeClosing: 'applyingNewCredit',
  subjectToPriorityLienPace: 'propertySubjectLien',
  coSignerOrGuarantorOnUndisclosedDebt: 'coSignerGuarantor',
  outstandingJudgments: 'outstandingJudgments',
  delinquentOrDefaultOnFederalDebt: 'delinquentFederalDebt',
  partyToLawsuit: 'partyToLawsuit',
  conveyedTitleInLieuLast7Years: 'conveyedTitleLieuForeclosure',
  completedPreForeclosureShortSaleLast7Years: 'preForeclosureSale',
  propertyForeclosedLast7Years: 'propertyForeclosedSevenYears',
  declaredBankruptcyLast7Years: 'declaredBankruptcySevenYears',
};

/**
 * declarations section → declaration.* booleans (inverse of buildDeclarations).
 * Tri-state: true/false are answers and land as booleans; null is UNANSWERED and the
 * key is OMITTED entirely (an untouched resubmit re-sends null, never a fabricated No).
 */
function applyDeclarations(target, decl) {
  const d = target.declaration || (target.declaration = {});
  Object.entries(DECLARATION_KEY_BY_WIRE).forEach(([wireKey, formKey]) => {
    const v = decl[wireKey];
    if (v === true || v === false) d[formKey] = v;
  });
}

/**
 * demographics section → declaration.hmda* fields (inverse of buildDemographics).
 * DO_NOT_WISH_TO_PROVIDE folds back into the explicit refusal flags; enum arrays fold
 * back into the FE's comma-separated MISMO code strings. Unmappable suite values are
 * dropped (regulated data: omit, don't guess).
 */
function applyDemographics(target, demo) {
  const d = target.declaration || (target.declaration = {});
  const race = Array.isArray(demo.race) ? demo.race : [];
  const ethnicity = Array.isArray(demo.ethnicity) ? demo.ethnicity : [];

  if (race.includes('DO_NOT_WISH_TO_PROVIDE')) {
    d.hmdaRaceRefusal = true;
  } else if (race.length) {
    d.hmdaRace = race.map((v) => INV_RACE[v]).filter(Boolean).join(',');
  }

  if (ethnicity.includes('DO_NOT_WISH_TO_PROVIDE')) {
    d.hmdaEthnicityRefusal = true;
  } else if (ethnicity.length) {
    d.hmdaEthnicity = ethnicity.map((v) => INV_ETHNICITY[v]).filter(Boolean).join(',');
  }

  if (demo.sex === 'DO_NOT_WISH_TO_PROVIDE') {
    d.hmdaSexRefusal = true;
  } else if (INV_SEX[demo.sex] !== undefined) {
    d.hmdaSex = INV_SEX[demo.sex];
  }
}

/**
 * Assemble ONE form borrower from its suite sections (primary and co-borrowers use
 * the same shapes). Starts from createDefaultBorrower so every nested array/field the
 * wizard binds to exists; absent sections leave those defaults untouched.
 */
function toFormBorrower(sequenceNumber, sections) {
  const target = createDefaultBorrower(sequenceNumber);
  // createDefaultBorrower has no suffix key (the wizard field predates it) — seed ''
  // so the shape is stable whether or not a borrower section overrides it below.
  target.suffix = target.suffix || '';
  const {
    borrower, addresses, income, assets, liabilities, reo, declarations, demographics,
  } = sections || {};

  if (borrower) applyBorrowerInfo(target, borrower);
  if (Array.isArray(addresses) && addresses.length) applyAddresses(target, addresses);
  if (income) {
    const employments = Array.isArray(income.employments) ? income.employments : [];
    const otherIncome = Array.isArray(income.otherIncome) ? income.otherIncome : [];
    // Keep the default single blank employer row when the suite has none.
    if (employments.length) target.employmentHistory = employments.map(toFormEmployment);
    target.incomeSources = otherIncome.map(toFormIncomeSource);
  }
  if (Array.isArray(assets)) target.assets = assets.map(toFormAsset);
  if (Array.isArray(liabilities)) target.liabilities = liabilities.map(toFormLiability);
  if (Array.isArray(reo)) target.reoProperties = reo.map(toFormReo);
  if (declarations) applyDeclarations(target, declarations);
  if (demographics) applyDemographics(target, demographics);
  return target;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Convert a suite application response/body into /apply wizard form state.
 *
 * @param {object|null|undefined} app  Suite BorrowerApplicationResponse (or the
 *   request-shaped body — same sections). loanId/loanNumber/borrowerId/hasSsn and any
 *   other read-only extras are ignored.
 * @returns {object|null}  Values for react-hook-form `reset()`, or null when there is
 *   nothing to load (caller keeps the pristine wizard).
 */
export default function suiteApplicationToForm(app) {
  if (app === null || app === undefined) return null;

  // Wizard defaults (mirrors ApplicationForm's useForm defaultValues) — stand
  // untouched unless a present section overrides them.
  const form = {
    loanType: 'TBD',
    occupancy: 'OwnerOccupied',
    propertyUse: 'Primary',
    borrowers: [],
  };

  if (app.loan) applyLoan(form, app.loan);

  // Primary borrower = borrowers[0]; carries the application-level sections.
  form.borrowers.push(toFormBorrower(1, {
    borrower: app.borrower,
    addresses: app.addresses,
    income: app.income,
    assets: app.assets,
    liabilities: app.liabilities,
    reo: app.reo,
    declarations: app.declarations,
    demographics: app.demographics,
  }));

  // Co-borrowers (joint applicants) = borrowers[1..], same sub-shapes, no
  // declarations/demographics (application-level, primary-only).
  const coBorrowers = Array.isArray(app.coBorrowers) ? app.coBorrowers : [];
  coBorrowers.forEach((section, index) => {
    form.borrowers.push(toFormBorrower(index + 2, section || {}));
  });

  return form;
}
