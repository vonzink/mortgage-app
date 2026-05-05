/**
 * Single source of truth for enum-style values shown to users.
 *
 * Form fields and the review screen previously rendered raw stored values like
 * "SingleFamily", "OwnerOccupied", "CashOut", "LivingRentFree" — fine as data,
 * unfriendly to read. This module pairs every value with a human label; selects
 * can pull options from {@link OPTIONS}, and read-only renderings can call
 * {@link displayLabel} so the same humanization happens everywhere.
 *
 * Adding a new enum: extend OPTIONS with a new key. The existing fallback
 * (camelCase split + underscore replacement) handles single-token unknowns
 * gracefully so a missing entry doesn't break the UI.
 */

export const OPTIONS = {
  loanPurpose: [
    { value: 'Purchase',    label: 'Purchase' },
    { value: 'Refinance',   label: 'Refinance' },
    { value: 'CashOut',     label: 'Cash Out' },
  ],
  loanType: [
    { value: 'Conventional', label: 'Conventional' },
    { value: 'FHA',          label: 'FHA' },
    { value: 'VA',           label: 'VA' },
    { value: 'USDA',         label: 'USDA' },
  ],
  propertyUse: [
    { value: 'Primary',    label: 'Primary Residence' },
    { value: 'Secondary',  label: 'Secondary Residence' },
    { value: 'Investment', label: 'Investment Property' },
  ],
  propertyType: [
    { value: 'SingleFamily',  label: 'Single Family' },
    { value: 'Condo',         label: 'Condominium' },
    { value: 'Townhouse',     label: 'Townhouse' },
    { value: 'MultiFamily',   label: 'Multi-Family' },
    { value: 'Manufactured',  label: 'Manufactured Home' },
    { value: 'Other',         label: 'Other' },
  ],
  occupancy: [
    { value: 'OwnerOccupied', label: 'Owner Occupied' },
    { value: 'SecondHome',    label: 'Second Home' },
    { value: 'Investment',    label: 'Investment Property' },
  ],
  downPaymentSource: [
    { value: 'Savings',        label: 'Savings' },
    { value: 'Gift',           label: 'Gift' },
    { value: 'SaleOfProperty', label: 'Sale of Property' },
    { value: 'Borrowed',       label: 'Borrowed' },
    { value: 'Other',          label: 'Other' },
  ],
  maritalStatus: [
    { value: 'Single',    label: 'Single' },
    { value: 'Married',   label: 'Married' },
    { value: 'Divorced',  label: 'Divorced' },
    { value: 'Widowed',   label: 'Widowed' },
    { value: 'Separated', label: 'Separated' },
  ],
  citizenshipType: [
    { value: 'USCitizen',          label: 'U.S. Citizen' },
    { value: 'PermanentResident',  label: 'Permanent Resident' },
    { value: 'NonPermanentResident', label: 'Non-Permanent Resident' },
  ],
  employmentStatus: [
    { value: 'Present', label: 'Present' },
    { value: 'Prior',   label: 'Prior' },
  ],
  businessType: [
    { value: 'SoleProprietorship', label: 'Sole Proprietorship' },
    { value: 'LLC',                label: 'Limited Liability Company (LLC)' },
    { value: 'SCorp',              label: 'S-Corporation' },
    { value: 'Corporation',        label: 'Corporation' },
    { value: 'Other',              label: 'Other' },
  ],
  residencyBasis: [
    { value: 'Own',             label: 'Own' },
    { value: 'Rent',            label: 'Rent' },
    { value: 'LivingRentFree',  label: 'Living Rent Free' },
  ],
};

/**
 * Best-effort humanization for values not in {@link OPTIONS}: split CamelCase
 * boundaries and replace underscores with spaces. Used as a final fallback so a
 * missing taxonomy entry doesn't surface as "SingleFamily" in production.
 */
function humanize(value) {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s) return '';
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}

/**
 * Look up the human-readable label for a stored enum value.
 *
 * @param {keyof typeof OPTIONS | string} field — name of the enum (e.g. "propertyType")
 * @param {string|null|undefined} value — the stored value (e.g. "SingleFamily")
 * @param {{ fallback?: string }} [opts] — string to return for blank input; defaults to "Not provided"
 * @returns {string} The human label, the fallback for blank input, or a humanized form of the raw value.
 */
export function displayLabel(field, value, opts = {}) {
  const fallback = opts.fallback ?? 'Not provided';
  if (value === null || value === undefined || value === '') return fallback;

  const entries = OPTIONS[field];
  if (entries) {
    const hit = entries.find((e) => e.value === value);
    if (hit) return hit.label;
  }
  return humanize(value);
}
