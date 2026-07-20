/**
 * Unit tests for the suite → wizard-form reverse mapper (Task 12).
 *
 * The completion gate is the ROUND-TRIP invariant: for anything the /apply form
 * can express,   form → wire → form → wire   must produce two deep-equal wire
 * bodies, section by section. The suite GET response the mapper consumes in prod
 * has the same section shapes as the PUT request body (plus loanId/loanNumber/
 * borrowerId read-only extras), so round-tripping through the REQUEST shape is
 * the correct invariant.
 *
 * Run: CI=true npx react-scripts test --watchAll=false --testPathPattern=suiteApplicationToForm
 */
import suiteApplicationToForm from './suiteApplicationToForm';
import formToSuiteApplication, {
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

// ── Representative full form fixture (primary + 1 co-borrower) ────────────
//
// Everything here is a value the live wizard can actually hold: select values
// come from the real <option value>s; amounts are the string values the inputs
// produce; ssn/phone are in the masked-input formats.

const primaryBorrower = () => ({
  sequenceNumber: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  middleName: 'Q',
  suffix: 'Jr',
  ssn: '123-45-6789',
  dateOfBirth: '1990-05-15',
  maritalStatus: 'Married',
  dependents: 2,
  citizenshipType: 'USCitizen',
  phone: '303-555-1234',
  email: 'jane@example.com',
  employmentHistory: [
    {
      sequenceNumber: 1,
      employerName: 'Acme Corp',
      position: 'Engineer',
      employmentStatus: 'Present',
      startDate: '2020-01-01',
      endDate: '',
      monthlyIncome: '8500',
      employerAddress: '1 Acme Way',
      employerPhone: '303-555-9999',
      selfEmployed: false,
      monthsInLineOfWork: '48',
      ownershipShare: '',
    },
    {
      sequenceNumber: 2,
      employerName: 'Beta LLC',
      position: 'Analyst',
      employmentStatus: 'Prior',
      startDate: '2015-02-01',
      endDate: '2019-12-31',
      monthlyIncome: '6000',
      employerAddress: '',
      employerPhone: '',
      selfEmployed: true,
      ownershipShare: '30',
    },
  ],
  incomeSources: [
    { incomeType: 'SocialSecurity', monthlyAmount: '1200', description: 'SSA' },
    // 'Rental' forward-maps to OTHER (a deliberate collapse) — exercises the
    // many-to-one inverse: wire OTHER comes back as 'Other', re-emits OTHER.
    { incomeType: 'Rental', monthlyAmount: '900', description: 'duplex' },
  ],
  residences: [],
  assets: [
    { assetType: 'Checking', bankName: 'First Bank', accountNumber: '1111', assetValue: '15000' },
    // 'IRA' forward-maps to RETIREMENT (collapse) — inverse picks 'Retirement401k'.
    { assetType: 'IRA', bankName: 'Vanguard', accountNumber: '2222', assetValue: '80000' },
  ],
  liabilities: [
    // 'CreditCard' forward-maps to REVOLVING (collapse) — inverse picks 'Revolving'.
    {
      liabilityType: 'CreditCard', creditorName: 'Visa', accountNumber: '4444',
      unpaidBalance: '3000', monthlyPayment: '150', monthsRemaining: '20',
    },
    {
      liabilityType: 'MortgageLoan', creditorName: 'Big Bank', accountNumber: '5555',
      unpaidBalance: '200000', monthlyPayment: '1400', monthsRemaining: '',
    },
  ],
  reoProperties: [
    {
      addressLine: '77 Rental Rd', city: 'Aurora', state: 'CO', zipCode: '80010',
      propertyType: '', use: 'ToBeSold', note: 'selling',
      propertyValue: '350000', monthlyRentalIncome: '2100',
      monthlyPayment: '1500', unpaidBalance: '180000',
    },
  ],
  declaration: {
    occupyPrimaryResidence: true,
    ownershipInterestThreeYears: false,
    outstandingJudgments: false,
    partyToLawsuit: false,
    declaredBankruptcySevenYears: true,
    hmdaRace: 'White,Asian',
    hmdaRaceRefusal: false,
    hmdaEthnicity: 'NotHispanicOrLatino',
    hmdaEthnicityRefusal: false,
    hmdaSex: 'Female',
    hmdaSexRefusal: false,
  },
});

const coBorrower = () => ({
  sequenceNumber: 2,
  firstName: 'John',
  lastName: 'Doe',
  middleName: '',
  suffix: '',
  ssn: '987-65-4321',
  dateOfBirth: '1988-03-02',
  maritalStatus: 'Married',
  dependents: 0,
  citizenshipType: 'PermanentResident',
  phone: '720-555-4321',
  email: 'john@example.com',
  employmentHistory: [
    {
      sequenceNumber: 1,
      employerName: 'Gamma Inc',
      position: 'Manager',
      employmentStatus: 'Present',
      startDate: '2018-06-01',
      endDate: '',
      monthlyIncome: '7000',
      employerAddress: '',
      employerPhone: '',
      selfEmployed: false,
    },
  ],
  incomeSources: [],
  residences: [],
  assets: [
    { assetType: 'Savings', bankName: 'CU', accountNumber: '9999', assetValue: '22000' },
  ],
  liabilities: [
    // 'StudentLoan' forward-maps to INSTALLMENT (collapse) — inverse picks 'Installment'.
    {
      liabilityType: 'StudentLoan', creditorName: 'Navient', accountNumber: '1212',
      unpaidBalance: '25000', monthlyPayment: '300', monthsRemaining: '',
    },
  ],
  reoProperties: [
    {
      addressLine: '9 Second St', city: 'Boulder', state: 'CO', zipCode: '80301',
      propertyType: '', use: 'Investment', note: '',
      propertyValue: '400000', monthlyRentalIncome: '2500',
      monthlyPayment: '1700', unpaidBalance: '220000',
    },
  ],
});

const fullFormFixture = () => ({
  loanPurpose: 'Purchase',
  loanType: 'Conventional',
  loanAmount: '425000',
  downPayment: '75000',
  propertyValue: '500000',
  propertyType: 'Condo',
  propertyUse: 'Secondary',
  occupancy: 'SecondHome',
  unitsCount: '1',
  notes: 'Test note',
  property: {
    addressLine: '123 Main St',
    addressLine2: 'Unit 4',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    proposedTaxesMonthly: '250',
    proposedHazardInsuranceMonthly: '100',
    proposedHoaDuesMonthly: '50',
    proposedMortgageInsuranceMonthly: '75',
  },
  borrowers: [primaryBorrower(), coBorrower()],
});

// ── 1. Round-trip (the completion gate) ───────────────────────────────────

describe('round-trip: form → wire → form → wire', () => {
  const wire1 = formToSuiteApplication(fullFormFixture());
  const form2 = suiteApplicationToForm(wire1);
  const wire2 = formToSuiteApplication(form2);

  test.each([
    'loan', 'borrower', 'income', 'assets', 'liabilities', 'reo',
    'declarations', 'demographics', 'coBorrowers',
  ])('section %s survives the loop', (section) => {
    expect(wire2[section]).toEqual(wire1[section]);
  });

  test('whole wire bodies are deep-equal', () => {
    expect(wire2).toEqual(wire1);
  });

  test('read-only response extras (loanId/loanNumber/borrowerId/hasSsn) are ignored', () => {
    const withExtras = {
      ...wire1,
      loanId: '0b7f3f1a-1111-2222-3333-444455556666',
      loanNumber: 'L-2026-0042',
      borrowerId: '0b7f3f1a-aaaa-bbbb-cccc-ddddeeeeffff',
      borrower: { ...wire1.borrower, hasSsn: true },
    };
    expect(formToSuiteApplication(suiteApplicationToForm(withExtras))).toEqual(wire1);
  });
});

// ── 2. Partial responses ──────────────────────────────────────────────────

describe('partial responses', () => {
  test('borrower-only response populates borrowers[0], leaves loan defaults untouched', () => {
    const form = suiteApplicationToForm({
      borrower: { firstName: 'Sam', lastName: 'Lee', email: 'sam@example.com' },
    });
    expect(form.borrowers[0].firstName).toBe('Sam');
    expect(form.borrowers[0].lastName).toBe('Lee');
    expect(form.borrowers[0].email).toBe('sam@example.com');
    // Wizard defaults (ApplicationForm useForm defaultValues) untouched:
    expect(form.loanType).toBe('TBD');
    expect(form.propertyUse).toBe('Primary');
    expect(form.occupancy).toBe('OwnerOccupied');
    // No loan section → no property address injected.
    expect(form.property).toBeUndefined();
    // Borrower defaults still present for unmapped nested arrays.
    expect(Array.isArray(form.borrowers[0].employmentHistory)).toBe(true);
  });

  test('loan-only response populates loan fields, leaves borrower defaults untouched', () => {
    const form = suiteApplicationToForm({
      loan: {
        mortgageType: 'FHA',
        baseLoanAmount: 300000,
        estimatedValue: 350000,
        addressLine1: '9 Elm St',
        city: 'Golden',
        state: 'CO',
        postalCode: '80401',
        propertyType: 'SINGLE_FAMILY',
        occupancyType: 'PRIMARY_RESIDENCE',
      },
    });
    expect(form.loanType).toBe('FHA');
    expect(form.loanAmount).toBe(300000);
    expect(form.propertyValue).toBe(350000);
    expect(form.property.addressLine).toBe('9 Elm St');
    expect(form.property.city).toBe('Golden');
    expect(form.property.state).toBe('CO');
    expect(form.property.zipCode).toBe('80401');
    expect(form.propertyType).toBe('SingleFamily');
    expect(form.propertyUse).toBe('Primary');
    expect(form.occupancy).toBe('OwnerOccupied');
    expect(form.borrowers[0].firstName).toBe('');
  });

  test('empty object → wizard defaults, no throw', () => {
    const form = suiteApplicationToForm({});
    expect(form.loanType).toBe('TBD');
    expect(form.borrowers).toHaveLength(1);
    expect(form.borrowers[0].firstName).toBe('');
  });

  test('sections with null/absent nested fields never throw', () => {
    expect(() => suiteApplicationToForm({
      loan: null,
      borrower: null,
      income: null,
      assets: null,
      liabilities: null,
      reo: null,
      declarations: null,
      demographics: null,
    })).not.toThrow();
    expect(() => suiteApplicationToForm({
      income: { employments: null, otherIncome: null },
      reo: [{}],
      assets: [{}],
      liabilities: [{}],
      declarations: {},
      demographics: {},
      coBorrowers: [{}],
    })).not.toThrow();
  });
});

// ── 3. null/undefined input ───────────────────────────────────────────────

describe('null/undefined input', () => {
  test('null → null', () => {
    expect(suiteApplicationToForm(null)).toBeNull();
  });
  test('undefined → null', () => {
    expect(suiteApplicationToForm(undefined)).toBeNull();
  });
});

// ── 4. Enum edges ─────────────────────────────────────────────────────────

describe('enum reversal', () => {
  test('unknown suite enum values fall back without throwing', () => {
    const form = suiteApplicationToForm({
      loan: { mortgageType: 'BALLOON_MYSTERY', propertyType: 'HOUSEBOAT', occupancyType: 'ORBITAL' },
      borrower: { firstName: 'X', maritalStatus: 'CIVIL_UNION_X', citizenshipType: 'MARTIAN' },
      assets: [{ assetType: 'CRYPTO_WALLET', cashOrMarketValue: 5 }],
      liabilities: [{ liabilityType: 'FUTURE_DEBT', creditorName: 'Z', unpaidBalance: 1 }],
      income: {
        employments: [{ employerName: 'E', employmentStatus: 'SABBATICAL' }],
        otherIncome: [{ incomeType: 'LOTTERY', monthlyAmount: 10 }],
      },
    });
    // Unknowns land on a fallback the form tolerates — never a crash.
    expect(form.propertyUse).toBe('');
    expect(form.occupancy).toBe('');
    expect(form.borrowers[0].maritalStatus).toBe('');
    expect(form.borrowers[0].citizenshipType).toBe('');
    expect(form.borrowers[0].employmentHistory[0].employmentStatus).toBe('');
    // Enums whose forward map has a catch-all collapse to that catch-all value.
    expect(form.borrowers[0].assets[0].assetType).toBe('Other');
    expect(form.borrowers[0].liabilities[0].liabilityType).toBe('Other');
    expect(form.borrowers[0].incomeSources[0].incomeType).toBe('Other');
  });

  // Every suite value the FORWARD tables can produce must survive
  // suite → form → suite (probe the forward table, invert, re-forward).
  const roundTripEnum = (formValues, mapFn, invertVia) => {
    formValues.forEach((formValue) => {
      const suiteValue = mapFn(formValue);
      const back = invertVia(suiteValue);
      expect(mapFn(back)).toBe(suiteValue);
    });
  };

  test('mortgageType values round-trip', () => {
    roundTripEnum(
      ['Conventional', 'FHA', 'VA', 'USDA', 'TBD', 'Other'],
      mapMortgageType,
      (s) => suiteApplicationToForm({ loan: { mortgageType: s } }).loanType,
    );
  });

  test('propertyType values round-trip', () => {
    roundTripEnum(
      ['SingleFamily', 'Condo', 'Townhouse', 'MultiFamily', 'Manufactured', 'Other'],
      mapPropertyType,
      (s) => suiteApplicationToForm({ loan: { propertyType: s } }).propertyType,
    );
  });

  test('occupancyType (propertyUse) values round-trip', () => {
    roundTripEnum(
      ['Primary', 'Secondary', 'SecondHome', 'Investment'],
      mapOccupancyType,
      (s) => suiteApplicationToForm({ loan: { occupancyType: s } }).propertyUse,
    );
  });

  test('maritalStatus values round-trip', () => {
    roundTripEnum(
      ['Married', 'Separated', 'Single', 'Divorced', 'Widowed', 'Unmarried'],
      mapMaritalStatus,
      (s) => suiteApplicationToForm({ borrower: { maritalStatus: s } }).borrowers[0].maritalStatus,
    );
  });

  test('citizenshipType values round-trip', () => {
    roundTripEnum(
      ['USCitizen', 'PermanentResident', 'NonPermanentResident', 'VisaHolder', 'ForeignNational'],
      mapCitizenshipType,
      (s) => suiteApplicationToForm({ borrower: { citizenshipType: s } }).borrowers[0].citizenshipType,
    );
  });

  test('employmentStatus values round-trip', () => {
    roundTripEnum(
      ['Present', 'Prior'],
      mapEmploymentStatus,
      (s) => suiteApplicationToForm({
        income: { employments: [{ employerName: 'E', employmentStatus: s }], otherIncome: [] },
      }).borrowers[0].employmentHistory[0].employmentStatus,
    );
  });

  test('assetType values round-trip', () => {
    roundTripEnum(
      ['Checking', 'Savings', 'MoneyMarket', 'CertificateOfDeposit', 'MutualFunds',
        'Stocks', 'Bonds', 'Retirement401k', 'IRA', 'Pension', 'EarnestMoney', 'Other'],
      mapAssetType,
      (s) => suiteApplicationToForm({ assets: [{ assetType: s }] }).borrowers[0].assets[0].assetType,
    );
  });

  test('liabilityType values round-trip', () => {
    roundTripEnum(
      ['MortgageLoan', 'Revolving', 'CreditCard', 'Installment', 'StudentLoan',
        'AutoLoan', 'SecuredLoan', 'HELOC', 'Other'],
      mapLiabilityType,
      (s) => suiteApplicationToForm({
        liabilities: [{ liabilityType: s, creditorName: 'C' }],
      }).borrowers[0].liabilities[0].liabilityType,
    );
  });

  test('incomeType values round-trip', () => {
    roundTripEnum(
      ['SocialSecurity', 'Pension', 'Disability', 'Unemployment', 'ChildSupport',
        'Alimony', 'Investment', 'Rental', 'Other'],
      mapIncomeType,
      (s) => suiteApplicationToForm({
        income: { employments: [], otherIncome: [{ incomeType: s, monthlyAmount: 5 }] },
      }).borrowers[0].incomeSources[0].incomeType,
    );
  });

  test('HMDA race/ethnicity/sex codes round-trip', () => {
    const races = ['AmericanIndianOrAlaskaNative', 'Asian', 'BlackOrAfricanAmerican',
      'NativeHawaiianOrOtherPacificIslander', 'White'];
    races.forEach((code) => {
      const suiteValue = mapRaceCode(code);
      const form = suiteApplicationToForm({ demographics: { race: [suiteValue], ethnicity: [], sex: null } });
      expect(mapRaceCode(form.borrowers[0].declaration.hmdaRace)).toBe(suiteValue);
    });
    ['HispanicOrLatino', 'NotHispanicOrLatino'].forEach((code) => {
      const suiteValue = mapEthnicityCode(code);
      const form = suiteApplicationToForm({ demographics: { ethnicity: [suiteValue], race: [], sex: null } });
      expect(mapEthnicityCode(form.borrowers[0].declaration.hmdaEthnicity)).toBe(suiteValue);
    });
    ['Male', 'Female'].forEach((code) => {
      const suiteValue = mapSexCode(code);
      const form = suiteApplicationToForm({ demographics: { ethnicity: [], race: [], sex: suiteValue } });
      expect(mapSexCode(form.borrowers[0].declaration.hmdaSex)).toBe(suiteValue);
    });
  });

  test('HMDA refusals map to the refusal flags, not fabricated codes', () => {
    const form = suiteApplicationToForm({
      demographics: {
        ethnicity: ['DO_NOT_WISH_TO_PROVIDE'],
        race: ['DO_NOT_WISH_TO_PROVIDE'],
        sex: 'DO_NOT_WISH_TO_PROVIDE',
      },
    });
    const d = form.borrowers[0].declaration;
    expect(d.hmdaEthnicityRefusal).toBe(true);
    expect(d.hmdaRaceRefusal).toBe(true);
    expect(d.hmdaSexRefusal).toBe(true);
    // Re-forward reproduces the exact refusal wire shape.
    const wire = formToSuiteApplication(form);
    expect(wire.demographics).toEqual({
      ethnicity: ['DO_NOT_WISH_TO_PROVIDE'],
      race: ['DO_NOT_WISH_TO_PROVIDE'],
      sex: 'DO_NOT_WISH_TO_PROVIDE',
    });
  });
});

// ── 5. REO disposition matrix ─────────────────────────────────────────────

describe('REO use/disposition wire fidelity', () => {
  // Each form `use` value → wire → form → wire must reproduce the exact
  // {propertyType, intendedOccupancy, propertyStatus} triple.
  test.each(['Primary', 'Investment', 'SecondHome', 'Timeshare', 'ToBeSold', 'PaidByOthers', ''])(
    'use=%s round-trips at the wire level',
    (use) => {
      const form1 = {
        borrowers: [{
          firstName: 'R', lastName: 'Owner', email: 'r@example.com',
          reoProperties: [{
            addressLine: '1 Reo Way', city: 'Denver', state: 'CO', zipCode: '80202',
            propertyType: '', use, propertyValue: '100000',
          }],
        }],
      };
      const wire1 = formToSuiteApplication(form1);
      const wire2 = formToSuiteApplication(suiteApplicationToForm(wire1));
      expect(wire2.reo).toEqual(wire1.reo);
    },
  );

  test('disposition + occupancy combo survives (occ preserved via reo propertyType slot)', () => {
    // Old-draft shape: occupancy-style reo propertyType + a disposition use.
    const form1 = {
      borrowers: [{
        firstName: 'R', lastName: 'Owner', email: 'r@example.com',
        reoProperties: [{
          addressLine: '2 Reo Way', city: 'Denver', state: 'CO', zipCode: '80202',
          propertyType: 'Primary', use: 'ToBeSold', propertyValue: '100000',
        }],
      }],
    };
    const wire1 = formToSuiteApplication(form1);
    expect(wire1.reo[0].intendedOccupancy).toBe('PRIMARY_RESIDENCE');
    expect(wire1.reo[0].propertyStatus).toBe('PENDING_SALE');
    const wire2 = formToSuiteApplication(suiteApplicationToForm(wire1));
    expect(wire2.reo).toEqual(wire1.reo);
  });
});

// ── 6. Numeric / string coercions ─────────────────────────────────────────

describe('coercions', () => {
  test('wire numbers stay numbers; ssn/phone come back input-formatted', () => {
    const wire = formToSuiteApplication(fullFormFixture());
    const form = suiteApplicationToForm(wire);
    expect(form.loanAmount).toBe(425000);
    expect(form.downPayment).toBe(75000);
    expect(form.propertyValue).toBe(500000);
    expect(form.unitsCount).toBe(1);
    expect(form.borrowers[0].dependents).toBe(2);
    expect(form.borrowers[0].employmentHistory[0].monthlyIncome).toBe(8500);
    // Masked-input formats (idempotent through formatSSN/formatPhone).
    expect(form.borrowers[0].ssn).toBe('123-45-6789');
    expect(form.borrowers[0].phone).toBe('303-555-1234');
    expect(form.borrowers[0].employmentHistory[0].employerPhone).toBe('303-555-9999');
  });

  test('null wire scalars come back as blank strings the inputs tolerate', () => {
    const form = suiteApplicationToForm({
      loan: { baseLoanAmount: null, addressLine1: null, occupancyType: null },
      borrower: { firstName: 'A', dateOfBirth: null, dependentsCount: null },
    });
    expect(form.loanAmount).toBe('');
    expect(form.property.addressLine).toBe('');
    expect(form.propertyUse).toBe('');
    expect(form.borrowers[0].dateOfBirth).toBe('');
    expect(form.borrowers[0].dependents).toBe('');
  });
});

// ── 7. Declarations tri-state ─────────────────────────────────────────────

describe('declarations tri-state', () => {
  test('true/false map to booleans; null stays unanswered (key omitted)', () => {
    const form = suiteApplicationToForm({
      declarations: {
        outstandingJudgments: false,
        partyToLawsuit: true,
        declaredBankruptcyLast7Years: null,
      },
    });
    const d = form.borrowers[0].declaration;
    expect(d.outstandingJudgments).toBe(false);
    expect(d.partyToLawsuit).toBe(true);
    expect('declaredBankruptcySevenYears' in d).toBe(false);
    // Re-forward: answered fields survive, unanswered stay null.
    const wire = formToSuiteApplication(form);
    expect(wire.declarations.outstandingJudgments).toBe(false);
    expect(wire.declarations.partyToLawsuit).toBe(true);
    expect(wire.declarations.declaredBankruptcyLast7Years).toBeNull();
  });
});
