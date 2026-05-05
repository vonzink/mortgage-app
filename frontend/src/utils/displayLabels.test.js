import { displayLabel, OPTIONS } from './displayLabels';

describe('displayLabel', () => {
  test('humanizes known enum values from each taxonomy', () => {
    expect(displayLabel('loanPurpose',     'CashOut')).toBe('Cash Out');
    expect(displayLabel('propertyType',    'SingleFamily')).toBe('Single Family');
    expect(displayLabel('propertyType',    'MultiFamily')).toBe('Multi-Family');
    expect(displayLabel('occupancy',       'OwnerOccupied')).toBe('Owner Occupied');
    expect(displayLabel('propertyUse',     'Primary')).toBe('Primary Residence');
    expect(displayLabel('residencyBasis',  'LivingRentFree')).toBe('Living Rent Free');
    expect(displayLabel('businessType',    'LLC')).toBe('Limited Liability Company (LLC)');
    expect(displayLabel('citizenshipType', 'USCitizen')).toBe('U.S. Citizen');
  });

  test('returns the configurable fallback for blank input', () => {
    expect(displayLabel('loanPurpose', null)).toBe('Not provided');
    expect(displayLabel('loanPurpose', '')).toBe('Not provided');
    expect(displayLabel('loanPurpose', undefined)).toBe('Not provided');
    expect(displayLabel('loanPurpose', '', { fallback: '—' })).toBe('—');
  });

  test('unknown field falls back to humanized raw value', () => {
    expect(displayLabel('madeUpField', 'SomeNewValue')).toBe('Some New Value');
    expect(displayLabel('madeUpField', 'SNAKE_CASE_VALUE')).toBe('SNAKE CASE VALUE');
  });

  test('unknown value within a known field falls back to humanized form', () => {
    // Backend adds a new enum value before the frontend learns it — never break.
    expect(displayLabel('propertyType', 'TinyHouse')).toBe('Tiny House');
  });

  test('OPTIONS is keyed by field and entries have value+label', () => {
    for (const [field, entries] of Object.entries(OPTIONS)) {
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
      for (const e of entries) {
        expect(typeof e.value).toBe('string');
        expect(typeof e.label).toBe('string');
        expect(e.value.length).toBeGreaterThan(0);
        expect(e.label.length).toBeGreaterThan(0);
      }
      expect(field).not.toMatch(/^\s*$/);
    }
  });
});
