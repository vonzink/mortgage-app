import {
  formToApplicationPayload,
  hasValue,
  normalizePhone,
  normalizeLiabilityType,
} from './applicationPayload';

// ── Utilities ───────────────────────────────────────────────────────────────

describe('hasValue', () => {
  test.each([
    [null, false],
    [undefined, false],
    ['', false],
    ['   ', false],
    [0, true],
    ['a', true],
    [false, true],
  ])('hasValue(%p) → %p', (input, expected) => {
    expect(hasValue(input)).toBe(expected);
  });
});

describe('normalizePhone', () => {
  test('formats a 10-digit string', () => {
    expect(normalizePhone('3035235436')).toBe('303-523-5436');
  });

  test('strips formatting and reformats', () => {
    expect(normalizePhone('(303) 523-5436')).toBe('303-523-5436');
  });

  test('handles 11-digit (country code) by keeping last 10', () => {
    expect(normalizePhone('+1 303 523 5436')).toBe('303-523-5436');
  });

  test('passes through under 10 digits as-is', () => {
    expect(normalizePhone('123')).toBe('123');
  });

  test('returns null for empty / null', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});

describe('normalizeLiabilityType', () => {
  test('remaps legacy SecuredLoan to Installment', () => {
    expect(normalizeLiabilityType('SecuredLoan')).toBe('Installment');
  });

  test('passes other values through', () => {
    expect(normalizeLiabilityType('Revolving')).toBe('Revolving');
  });

  test('returns falsy as-is', () => {
    expect(normalizeLiabilityType(null)).toBeNull();
    expect(normalizeLiabilityType('')).toBe('');
  });
});

// ── Payload builder ─────────────────────────────────────────────────────────

function minimalForm() {
  return {
    loanPurpose: 'Purchase',
    loanType: 'Conventional',
    loanAmount: '492150',
    propertyValue: '510000',
    propertyUse: 'Primary',
    property: {
      addressLine: '17630 East 104th Place',
      city: 'Commerce City',
      state: 'CO',
      zipCode: '80022',
    },
    borrowers: [
      {
        firstName: 'Veronica',
        lastName: 'Sawaged',
        email: 'vs@example.com',
        phone: '(303) 523-5436',
        dependents: '0',
      },
    ],
  };
}

describe('formToApplicationPayload', () => {
  test('returns a minimal valid payload from minimum input', () => {
    const payload = formToApplicationPayload(minimalForm());

    expect(payload.loanPurpose).toBe('Purchase');
    expect(payload.loanType).toBe('Conventional');
    expect(payload.loanAmount).toBe(492150);
    expect(payload.propertyValue).toBe(510000);
    expect(payload.status).toBe('DRAFT');
  });

  test('coerces string amounts to numbers', () => {
    const form = minimalForm();
    form.loanAmount = '500000.75';
    form.propertyValue = '600000';

    const payload = formToApplicationPayload(form);
    expect(typeof payload.loanAmount).toBe('number');
    expect(payload.loanAmount).toBeCloseTo(500000.75, 2);
    expect(payload.propertyValue).toBe(600000);
  });

  test('property block reflects form values + defaults', () => {
    const payload = formToApplicationPayload(minimalForm());

    expect(payload.property.addressLine).toBe('17630 East 104th Place');
    expect(payload.property.propertyType).toBe('PrimaryResidence'); // Primary → PrimaryResidence
    expect(payload.property.constructionType).toBe('SiteBuilt');     // default when blank
    expect(payload.property.unitsCount).toBe(1);                     // default when blank
  });

  test('maps secondary property use to SecondHome', () => {
    const form = minimalForm();
    form.propertyUse = 'Secondary';
    expect(formToApplicationPayload(form).property.propertyType).toBe('SecondHome');
  });

  test('drops blank borrowers (missing first or last name)', () => {
    const form = minimalForm();
    form.borrowers.push({ firstName: '', lastName: '' });
    form.borrowers.push({ firstName: 'Co', lastName: 'Borrower' });

    const payload = formToApplicationPayload(form);
    expect(payload.borrowers).toHaveLength(2);
    expect(payload.borrowers[0].firstName).toBe('Veronica');
    expect(payload.borrowers[1].firstName).toBe('Co');
  });

  test('assigns sequenceNumber starting at 1 for each kept borrower', () => {
    const form = minimalForm();
    form.borrowers.push({ firstName: 'Two', lastName: 'B' });
    form.borrowers.push({ firstName: 'Three', lastName: 'B' });

    const payload = formToApplicationPayload(form);
    expect(payload.borrowers.map((b) => b.sequenceNumber)).toEqual([1, 2, 3]);
  });

  test('normalizes employer phone in employmentHistory', () => {
    const form = minimalForm();
    form.borrowers[0].employmentHistory = [
      {
        employerName: 'ACME',
        startDate: '2020-01-01',
        employmentStatus: 'Active',
        employerPhone: '(303) 555-1234',
      },
    ];
    const payload = formToApplicationPayload(form);
    expect(payload.borrowers[0].employmentHistory[0].employerPhone).toBe('303-555-1234');
  });

  test('drops empty employmentHistory rows', () => {
    const form = minimalForm();
    form.borrowers[0].employmentHistory = [
      { employerName: '', startDate: '', employmentStatus: '' },
      { employerName: 'ACME', startDate: '2020-01-01', employmentStatus: 'Active' },
    ];
    expect(formToApplicationPayload(form).borrowers[0].employmentHistory).toHaveLength(1);
  });

  test('drops zero-amount income sources', () => {
    const form = minimalForm();
    form.borrowers[0].incomeSources = [
      { incomeType: 'Salary', monthlyAmount: '0' },
      { incomeType: 'Bonus', monthlyAmount: '500' },
    ];
    expect(formToApplicationPayload(form).borrowers[0].incomeSources).toHaveLength(1);
    expect(formToApplicationPayload(form).borrowers[0].incomeSources[0].incomeType).toBe('Bonus');
  });

  test('aggregates liabilities across borrowers under application-level liabilities', () => {
    const form = minimalForm();
    form.borrowers[0].liabilities = [
      { creditorName: 'Chase', liabilityType: 'Revolving', monthlyPayment: '50', unpaidBalance: '1000' },
      { creditorName: '', liabilityType: 'Installment' },   // dropped — no creditor
    ];
    form.borrowers.push({
      firstName: 'Co',
      lastName: 'Borrower',
      liabilities: [
        { creditorName: 'BoA', liabilityType: 'SecuredLoan', monthlyPayment: '200', unpaidBalance: '5000' },
      ],
    });

    const payload = formToApplicationPayload(form);
    expect(payload.liabilities).toHaveLength(2);
    // SecuredLoan should have been remapped to Installment
    expect(payload.liabilities.find((l) => l.creditorName === 'BoA').liabilityType).toBe('Installment');
  });

  test('omits assets without a type or with non-positive value', () => {
    const form = minimalForm();
    form.borrowers[0].assets = [
      { assetType: 'Checking', assetValue: '5000' },
      { assetType: '', assetValue: '1000' },        // no type — drop
      { assetType: 'Savings', assetValue: '0' },    // zero value — drop
    ];
    const payload = formToApplicationPayload(form);
    expect(payload.borrowers[0].assets).toHaveLength(1);
    expect(payload.borrowers[0].assets[0].assetType).toBe('Checking');
  });

  test('returns 0/null sensibly for an entirely empty form', () => {
    const payload = formToApplicationPayload({});
    expect(payload.loanAmount).toBe(0);
    expect(payload.borrowers).toEqual([]);
    expect(payload.liabilities).toEqual([]);
    expect(payload.property.propertyType).toBe('PrimaryResidence'); // default
  });
});
