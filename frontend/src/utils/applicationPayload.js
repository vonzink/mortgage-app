/**
 * Form-to-backend payload builder for the loan application submit pipeline.
 *
 * This module is the single explicit boundary between what react-hook-form
 * holds in memory and what the Spring Boot {@code LoanApplicationDTO} expects.
 * Pure functions only — no React, no toasts, no HTTP. Unit-testable in
 * isolation, which matters because the wire format is regulated (URLA / MISMO)
 * and silent drift here corrupts loan data.
 *
 * Extracted from the 200-line inline transform in ApplicationForm.js
 * (audit item CR-3).
 */

// ── Tiny utilities ────────────────────────────────────────────────────────

/** True if value carries actual content (non-null, non-undefined, non-empty/blank string). */
export function hasValue(value) {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/** Normalize a US phone number to "NNN-NNN-NNNN" when 10+ digits are present. */
export function normalizePhone(p) {
  if (!p) return null;
  const digits = String(p).replace(/\D/g, '');
  if (digits.length < 10) return p; // leave as-is if not enough digits
  const last10 = digits.slice(-10);
  return `${last10.slice(0, 3)}-${last10.slice(3, 6)}-${last10.slice(6)}`;
}

/** Legacy liability types from older form data — back-compat shim. */
export function normalizeLiabilityType(t) {
  if (!t) return t;
  if (t === 'SecuredLoan') return 'Installment';
  return t;
}

/** Map the form's propertyUse field to the backend's propertyType enum. */
function mapPropertyType(propertyUse) {
  if (propertyUse === 'Primary') return 'PrimaryResidence';
  if (propertyUse === 'Secondary') return 'SecondHome';
  return propertyUse || 'PrimaryResidence';
}

function toFloat(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function toInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

// ── Sub-builders ──────────────────────────────────────────────────────────

function buildProperty(formData) {
  return {
    addressLine: hasValue(formData.property?.addressLine) ? formData.property.addressLine : null,
    city: hasValue(formData.property?.city) ? formData.property.city : null,
    state: hasValue(formData.property?.state) ? formData.property.state : null,
    zipCode: hasValue(formData.property?.zipCode) ? formData.property.zipCode : null,
    propertyType: mapPropertyType(formData.propertyUse),
    propertyValue: toFloat(formData.propertyValue),
    constructionType: hasValue(formData.constructionType) ? formData.constructionType : 'SiteBuilt',
    yearBuilt: hasValue(formData.yearBuilt) ? toInt(formData.yearBuilt) : null,
    unitsCount: hasValue(formData.unitsCount) ? toInt(formData.unitsCount) : 1,
  };
}

function buildEmployment(employmentHistory) {
  return (employmentHistory || [])
    .filter((emp) => hasValue(emp.employerName) && hasValue(emp.startDate) && hasValue(emp.employmentStatus))
    .map((emp, idx) => ({
      sequenceNumber: idx + 1,
      employerName: emp.employerName,
      position: emp.position || null,
      startDate: emp.startDate,
      endDate: emp.endDate || null,
      employmentStatus: emp.employmentStatus,
      monthlyIncome: toFloat(emp.monthlyIncome),
      employerAddress: emp.employerAddress || null,
      employerCity: null,
      employerState: null,
      employerZip: null,
      employerPhone: normalizePhone(emp.employerPhone),
      selfEmployed: false,
    }));
}

function buildIncomeSources(incomeSources) {
  return (incomeSources || [])
    .filter((income) => hasValue(income.incomeType) && toFloat(income.monthlyAmount) > 0)
    .map((income) => ({
      incomeType: income.incomeType,
      monthlyAmount: toFloat(income.monthlyAmount),
      description: income.description || null,
    }));
}

function buildResidences(residences) {
  return (residences || [])
    .filter((res) => hasValue(res.addressLine))
    .map((res, idx) => ({
      sequenceNumber: idx + 1,
      addressLine: res.addressLine,
      city: res.city || null,
      state: res.state || null,
      zipCode: res.zipCode || null,
      residencyType: res.residencyType || null,
      residencyBasis: res.residencyBasis || null,
      durationMonths: toInt(res.durationMonths),
      monthlyRent: toFloat(res.monthlyRent),
    }));
}

function buildReoProperties(reoProperties) {
  return (reoProperties || [])
    .filter((reo) => hasValue(reo.addressLine) && hasValue(reo.city))
    .map((reo, idx) => ({
      sequenceNumber: idx + 1,
      addressLine: reo.addressLine,
      city: reo.city,
      state: reo.state || null,
      zipCode: reo.zipCode || null,
      propertyType: reo.propertyType || null,
      propertyValue: toFloat(reo.propertyValue),
      monthlyRentalIncome: toFloat(reo.monthlyRentalIncome),
      monthlyPayment: toFloat(reo.monthlyPayment),
      unpaidBalance: toFloat(reo.unpaidBalance),
    }));
}

function buildAssets(assets) {
  return (assets || [])
    .filter((asset) => hasValue(asset.assetType) && toFloat(asset.assetValue) > 0)
    .map((asset) => ({
      assetType: asset.assetType,
      bankName: asset.bankName || null,
      accountNumber: asset.accountNumber || null,
      assetValue: toFloat(asset.assetValue),
      usedForDownpayment: asset.usedForDownpayment || false,
    }));
}

function buildBorrower(b, idx) {
  return {
    sequenceNumber: idx + 1,
    firstName: b.firstName,
    lastName: b.lastName,
    middleName: b.middleName || null,
    ssn: b.ssn || null,
    birthDate: b.dateOfBirth || null,
    maritalStatus: b.maritalStatus || null,
    dependentsCount: toInt(b.dependents),
    citizenshipType: b.citizenshipType || null,
    email: b.email || null,
    phone: b.phone || null,
    employmentHistory: buildEmployment(b.employmentHistory),
    incomeSources: buildIncomeSources(b.incomeSources),
    residences: buildResidences(b.residences),
    reoProperties: buildReoProperties(b.reoProperties),
    assets: buildAssets(b.assets),
  };
}

function buildLiabilities(borrowers) {
  return (borrowers || [])
    .filter((b) => hasValue(b.firstName) && hasValue(b.lastName))
    .flatMap((b) =>
      (b.liabilities || [])
        .filter((l) => hasValue(l.creditorName) && hasValue(l.liabilityType))
        .map((l) => ({
          creditorName: l.creditorName,
          accountNumber: l.accountNumber || null,
          liabilityType: normalizeLiabilityType(l.liabilityType),
          monthlyPayment: toFloat(l.monthlyPayment),
          unpaidBalance: toFloat(l.unpaidBalance),
          payoffStatus: false,
          toBePaidOff: false,
        }))
    );
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Convert react-hook-form values to the backend LoanApplicationDTO payload.
 * Filters out blank borrower placeholders (no first or last name) and any
 * empty child rows (income sources with 0 amount, residences with no
 * address, etc.) so the wire payload is minimal and the backend doesn't
 * see noise.
 *
 * @param {object} formData  Raw form values from react-hook-form's getValues().
 * @returns {object}         Payload ready for POST /api/loan-applications.
 */
export function formToApplicationPayload(formData) {
  return {
    loanPurpose: formData.loanPurpose || 'Purchase',
    loanType: formData.loanType || 'Conventional',
    loanAmount: toFloat(formData.loanAmount),
    propertyValue: toFloat(formData.propertyValue),
    status: 'DRAFT',
    property: buildProperty(formData),
    borrowers: (formData.borrowers || [])
      .filter((b) => hasValue(b.firstName) && hasValue(b.lastName))
      .map(buildBorrower),
    liabilities: buildLiabilities(formData.borrowers),
  };
}

export default formToApplicationPayload;
