import {
  createDefaultBorrower,
  createDefaultEmployment,
  createDefaultResidence,
  createDefaultAsset,
  createDefaultLiability,
  createDefaultREOProperty,
  validateFieldArray,
} from './fieldArrayHelpers';

describe('createDefaultBorrower', () => {
  test('seeds a borrower with one Present employment + one Current residence', () => {
    const b = createDefaultBorrower(1);
    expect(b.sequenceNumber).toBe(1);
    expect(b.employmentHistory).toHaveLength(1);
    expect(b.employmentHistory[0].employmentStatus).toBe('Present');
    expect(b.residences).toHaveLength(1);
    expect(b.residences[0].residencyType).toBe('Current');
    // Empty initial state for the heavy collections
    expect(b.incomeSources).toEqual([]);
    expect(b.assets).toEqual([]);
    expect(b.liabilities).toEqual([]);
    expect(b.reoProperties).toEqual([]);
  });
});

describe('createDefaultResidence', () => {
  test('defaults to Prior when type omitted', () => {
    expect(createDefaultResidence(2).residencyType).toBe('Prior');
  });
  test('respects explicit Current', () => {
    expect(createDefaultResidence(1, 'Current').residencyType).toBe('Current');
  });
  test('zero-initializes durationMonths', () => {
    expect(createDefaultResidence(1).durationMonths).toBe(0);
  });
});

describe('createDefault* shapes', () => {
  test('employment has start/end strings, monthlyIncome string, selfEmployed boolean', () => {
    const e = createDefaultEmployment(1);
    expect(e.startDate).toBe('');
    expect(e.endDate).toBe('');
    expect(e.monthlyIncome).toBe('');
    expect(e.selfEmployed).toBe(false);
  });
  test('asset has usedForDownpayment=false', () => {
    expect(createDefaultAsset().usedForDownpayment).toBe(false);
  });
  test('liability is fully empty', () => {
    expect(createDefaultLiability()).toEqual({
      liabilityType: '',
      creditorName: '',
      accountNumber: '',
      monthlyPayment: '',
      unpaidBalance: '',
    });
  });
  test('REO has empty associatedLiabilities array', () => {
    expect(createDefaultREOProperty().associatedLiabilities).toEqual([]);
    expect(createDefaultREOProperty().ownedFreeAndClear).toBe(false);
  });
});

describe('validateFieldArray', () => {
  test('rejects non-arrays', () => {
    expect(validateFieldArray(null, 'residence').isValid).toBe(false);
    expect(validateFieldArray({}, 'residence').isValid).toBe(false);
  });

  test('residence: collects per-row missing-field errors with 1-based labels', () => {
    const result = validateFieldArray(
      [
        { addressLine: '123 Main', city: 'Boise', state: 'ID', zipCode: '83702' },
        { addressLine: '', city: '', state: '', zipCode: '' },
      ],
      'residence',
    );
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      'Residence 2: Address is required',
      'Residence 2: City is required',
      'Residence 2: State is required',
      'Residence 2: ZIP code is required',
    ]);
  });

  test('employment: passes when every row has employer/position/start/income', () => {
    const result = validateFieldArray(
      [{ employerName: 'Acme', position: 'Eng', startDate: '2020-01-01', monthlyIncome: '5000' }],
      'employment',
    );
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('unknown fieldType: passes through with no errors', () => {
    expect(validateFieldArray([{}], 'unknown')).toEqual({ isValid: true, errors: [] });
  });
});
