/**
 * Unit tests for the borrower self-application suite payload mapper.
 *
 * Covers: enum mappings (FE string → suite enum), the per-employment income
 * split, otherIncome vs employment income, blank-row filtering, and the
 * null-section "skip" rule.
 *
 * Run: CI=true npx react-scripts test --watchAll=false --testPathPattern=suiteApplicationPayload
 */
import formToSuiteApplication, {
  mapMortgageType,
  mapOccupancyType,
  mapPropertyType,
  mapIntendedOccupancy,
  mapEmploymentStatus,
  mapMaritalStatus,
  mapCitizenshipType,
  mapAssetType,
  mapLiabilityType,
  mapIncomeType,
} from './suiteApplicationPayload';

// ── Enum maps ────────────────────────────────────────────────────────────

describe('mapMortgageType', () => {
  test.each([
    ['Conventional', 'CONVENTIONAL'],
    ['FHA', 'FHA'],
    ['VA', 'VA'],
    ['USDA', 'USDA_RURAL_DEVELOPMENT'],
    ['Whatever', 'OTHER'],
    [undefined, 'OTHER'],
  ])('%s → %s', (input, expected) => {
    expect(mapMortgageType(input)).toBe(expected);
  });
});

describe('mapOccupancyType', () => {
  test.each([
    ['Primary', 'PRIMARY_RESIDENCE'],
    ['Secondary', 'SECOND_HOME'],
    ['SecondHome', 'SECOND_HOME'],
    ['Investment', 'INVESTMENT'],
    ['', null],
    [undefined, null],
  ])('%s → %s', (input, expected) => {
    expect(mapOccupancyType(input)).toBe(expected);
  });
});

describe('mapPropertyType (structural)', () => {
  test.each([
    ['SingleFamily', 'SINGLE_FAMILY'],
    ['Condo', 'CONDOMINIUM'],
    ['Townhouse', 'TOWNHOUSE'],
    ['MultiFamily', 'TWO_TO_FOUR_UNIT'],
    ['Manufactured', 'MANUFACTURED'],
    ['Other', 'SINGLE_FAMILY'],
    [undefined, 'SINGLE_FAMILY'],
  ])('%s → %s', (input, expected) => {
    expect(mapPropertyType(input)).toBe(expected);
  });
});

describe('mapIntendedOccupancy (reo)', () => {
  test('reuses occupancy mapping', () => {
    expect(mapIntendedOccupancy('Primary')).toBe('PRIMARY_RESIDENCE');
    expect(mapIntendedOccupancy('Investment')).toBe('INVESTMENT');
    expect(mapIntendedOccupancy('Secondary')).toBe('SECOND_HOME');
  });
});

describe('mapEmploymentStatus', () => {
  test.each([
    ['Present', 'CURRENT'],
    ['Prior', 'PREVIOUS'],
    [undefined, null],
  ])('%s → %s', (input, expected) => {
    expect(mapEmploymentStatus(input)).toBe(expected);
  });
});

describe('mapMaritalStatus', () => {
  test.each([
    ['Married', 'MARRIED'],
    ['Separated', 'SEPARATED'],
    ['Single', 'UNMARRIED'],
    ['Divorced', 'UNMARRIED'],
    ['Widowed', 'UNMARRIED'],
    ['Unmarried', 'UNMARRIED'],
    ['', null],
    [undefined, null],
  ])('%s → %s', (input, expected) => {
    expect(mapMaritalStatus(input)).toBe(expected);
  });
});

describe('mapCitizenshipType', () => {
  test.each([
    ['USCitizen', 'US_CITIZEN'],
    ['PermanentResident', 'PERMANENT_RESIDENT_ALIEN'],
    ['NonPermanentResident', 'NON_PERMANENT_RESIDENT_ALIEN'],
    ['VisaHolder', 'NON_PERMANENT_RESIDENT_ALIEN'],
    ['Something', 'FOREIGN_NATIONAL'],
    ['', null],
    [undefined, null],
  ])('%s → %s', (input, expected) => {
    expect(mapCitizenshipType(input)).toBe(expected);
  });
});

describe('mapAssetType', () => {
  test.each([
    ['Checking', 'CHECKING'],
    ['Savings', 'SAVINGS'],
    ['MoneyMarket', 'MONEY_MARKET'],
    ['CertificateOfDeposit', 'CERTIFICATE_OF_DEPOSIT'],
    ['MutualFunds', 'MUTUAL_FUND'],
    ['Stocks', 'STOCKS'],
    ['Bonds', 'BONDS'],
    ['Retirement401k', 'RETIREMENT'],
    ['IRA', 'RETIREMENT'],
    ['Pension', 'RETIREMENT'],
    ['EarnestMoney', 'EARNEST_MONEY'],
    ['Crypto', 'OTHER'],
  ])('%s → %s', (input, expected) => {
    expect(mapAssetType(input)).toBe(expected);
  });
});

describe('mapLiabilityType', () => {
  test.each([
    ['MortgageLoan', 'MORTGAGE_LOAN'],
    ['Revolving', 'REVOLVING'],
    ['CreditCard', 'REVOLVING'],
    ['Installment', 'INSTALLMENT'],
    ['StudentLoan', 'INSTALLMENT'],
    ['AutoLoan', 'INSTALLMENT'],
    ['SecuredLoan', 'INSTALLMENT'],
    ['Lease', 'OTHER'],
  ])('%s → %s', (input, expected) => {
    expect(mapLiabilityType(input)).toBe(expected);
  });
});

describe('mapIncomeType (otherIncome)', () => {
  test.each([
    ['SocialSecurity', 'SOCIAL_SECURITY'],
    ['Pension', 'PENSION'],
    ['Disability', 'DISABILITY'],
    ['Unemployment', 'UNEMPLOYMENT'],
    ['ChildSupport', 'CHILD_SUPPORT'],
    ['Alimony', 'ALIMONY'],
    ['Investment', 'DIVIDENDS_INTEREST'],
    ['Rental', 'OTHER'],
    ['Mystery', 'OTHER'],
  ])('%s → %s', (input, expected) => {
    expect(mapIncomeType(input)).toBe(expected);
  });
});

// ── formToSuiteApplication ──────────────────────────────────────────────

const fullForm = {
  loanType: 'FHA',
  loanAmount: '400000',
  propertyValue: '500000',
  downPayment: '100000',
  propertyUse: 'Primary',
  propertyType: 'Condo',
  unitsCount: '1',
  property: {
    addressLine: '123 Main St',
    addressLine2: 'Apt 4',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
  },
  borrowers: [
    {
      firstName: 'Jane',
      lastName: 'Borrower',
      middleName: 'Q',
      email: 'jane@example.com',
      phone: '(512) 555-1234',
      ssn: '123-45-6789',
      dateOfBirth: '1985-03-02',
      maritalStatus: 'Married',
      dependents: 2,
      citizenshipType: 'USCitizen',
      employmentHistory: [
        {
          employerName: 'Acme Co',
          position: 'Engineer',
          startDate: '2018-01-01',
          endDate: '',
          employmentStatus: 'Present',
          monthlyIncome: '8000',
          employerAddress: '1 Industrial Way',
          employerPhone: '5125550000',
          selfEmployed: false,
        },
        // Blank row — no employerName → filtered out.
        { employerName: '', monthlyIncome: '999' },
      ],
      incomeSources: [
        { incomeType: 'SocialSecurity', monthlyAmount: '1200', description: 'SSA' },
        // Zero-amount row → filtered out.
        { incomeType: 'Pension', monthlyAmount: '0' },
      ],
      assets: [
        { assetType: 'Checking', bankName: 'BigBank', accountNumber: '111', assetValue: '5000' },
        // Blank asset → filtered out.
        { assetType: '', assetValue: '999' },
      ],
      liabilities: [
        {
          liabilityType: 'CreditCard',
          creditorName: 'Visa',
          accountNumber: '4444',
          unpaidBalance: '2000',
          monthlyPayment: '50',
          monthsRemaining: '24',
        },
        // No creditor → filtered out.
        { liabilityType: 'AutoLoan', creditorName: '' },
      ],
      reoProperties: [
        {
          addressLine: '9 Rental Rd',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75001',
          propertyType: 'Investment',
          propertyValue: '300000',
          monthlyRentalIncome: '2000',
          monthlyPayment: '1500',
          unpaidBalance: '180000',
        },
        // No address → filtered out.
        { addressLine: '' },
      ],
    },
  ],
};

describe('formToSuiteApplication', () => {
  const out = formToSuiteApplication(fullForm);

  test('loan section maps enums and mirrors propertyValue → estimated + sales', () => {
    expect(out.loan).toMatchObject({
      mortgageType: 'FHA',
      baseLoanAmount: 400000,
      downPaymentAmount: 100000,
      estimatedValue: 500000,
      salesPrice: 500000,
      addressLine1: '123 Main St',
      addressLine2: 'Apt 4',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      propertyType: 'CONDOMINIUM',
      occupancyType: 'PRIMARY_RESIDENCE',
      numberOfUnits: 1,
    });
  });

  test('borrower section maps name/marital/citizenship and normalizes phone to cellPhone', () => {
    expect(out.borrower).toMatchObject({
      firstName: 'Jane',
      lastName: 'Borrower',
      middleName: 'Q',
      email: 'jane@example.com',
      ssn: '123-45-6789',
      dateOfBirth: '1985-03-02',
      maritalStatus: 'MARRIED',
      dependentsCount: 2,
      citizenshipType: 'US_CITIZEN',
      cellPhone: '512-555-1234',
    });
    expect(out.borrower.homePhone).toBeNull();
    expect(out.borrower.workPhone).toBeNull();
  });

  test('each employment carries its own monthlyIncome; blank rows filtered', () => {
    expect(out.income.employments).toHaveLength(1);
    const emp = out.income.employments[0];
    expect(emp.employerName).toBe('Acme Co');
    expect(emp.monthlyIncome).toBe(8000);
    expect(emp.employmentStatus).toBe('CURRENT');
    expect(emp.classification).toBe('PRIMARY');
    expect(emp.selfEmployed).toBe(false);
    expect(emp.employerPhone).toBe('512-555-0000');
  });

  test('incomeSources → otherIncome (employment income NOT duplicated here); zero filtered', () => {
    expect(out.income.otherIncome).toHaveLength(1);
    expect(out.income.otherIncome[0]).toMatchObject({
      incomeType: 'SOCIAL_SECURITY',
      monthlyAmount: 1200,
      description: 'SSA',
    });
  });

  test('assets filter blanks and map type', () => {
    expect(out.assets).toHaveLength(1);
    expect(out.assets[0]).toMatchObject({
      assetType: 'CHECKING',
      financialInstitution: 'BigBank',
      accountNumber: '111',
      cashOrMarketValue: 5000,
    });
  });

  test('liabilities filter blanks and map type', () => {
    expect(out.liabilities).toHaveLength(1);
    expect(out.liabilities[0]).toMatchObject({
      liabilityType: 'REVOLVING',
      creditorName: 'Visa',
      unpaidBalance: 2000,
      monthlyPayment: 50,
      monthsRemaining: 24,
    });
  });

  test('reo: structural propertyType null, FE propertyType → intendedOccupancy, default RETAINED', () => {
    expect(out.reo).toHaveLength(1);
    expect(out.reo[0]).toMatchObject({
      addressLine1: '9 Rental Rd',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75001',
      propertyType: null,
      intendedOccupancy: 'INVESTMENT',
      propertyStatus: 'RETAINED',
      marketValue: 300000,
      grossMonthlyRentalIncome: 2000,
      mortgageUnpaidBalance: 180000,
      mortgageMonthlyPayment: 1500,
      isSubjectProperty: false,
    });
  });

  test('declarations and demographics deferred → null', () => {
    expect(out.declarations).toBeNull();
    expect(out.demographics).toBeNull();
  });
});

describe('formToSuiteApplication — empty-section skip rule', () => {
  test('empty form yields all-null sections', () => {
    const out = formToSuiteApplication({ borrowers: [{}] });
    expect(out.loan).toBeNull();
    expect(out.borrower).toBeNull();
    expect(out.income).toBeNull();
    expect(out.assets).toBeNull();
    expect(out.liabilities).toBeNull();
    expect(out.reo).toBeNull();
  });

  test('completely empty input does not throw', () => {
    expect(() => formToSuiteApplication({})).not.toThrow();
    expect(() => formToSuiteApplication(undefined)).not.toThrow();
  });

  test('borrower present but no income → income null, borrower non-null', () => {
    const out = formToSuiteApplication({
      borrowers: [{ firstName: 'Sam', lastName: 'Smith', email: 's@x.com' }],
    });
    expect(out.borrower).not.toBeNull();
    expect(out.income).toBeNull();
  });
});

// Defensive coercion: the suite's BorrowerApplicationRequest deserializes enums +
// LocalDate strictly, so a bad value 400s the WHOLE body ("Malformed request
// body"). The builder must emit only suite-valid values or null. (QA 2026-06-28.)
describe('formToSuiteApplication — defensive type/enum coercion', () => {
  const base = (overrides) => ({
    borrowers: [{ firstName: 'Z', lastName: 'Z', email: 'z@e.com', ssn: '111-11-1111', ...overrides }],
  });

  test('reo.state: free-text full name → null; 2-letter (any case) → uppercased UsStateCode', () => {
    expect(formToSuiteApplication(base({
      reoProperties: [{ addressLine: '1 A St', city: 'Arvada', state: 'Colorado' }],
    })).reo[0].state).toBeNull();

    expect(formToSuiteApplication(base({
      reoProperties: [{ addressLine: '1 A St', city: 'Arvada', state: 'co' }],
    })).reo[0].state).toBe('CO');
  });

  test('employment dates: non-ISO → null; strict YYYY-MM-DD → kept', () => {
    const emp = formToSuiteApplication(base({
      employmentHistory: [{ employerName: 'Acme', startDate: '03/2019', endDate: '2020-06-15', monthlyIncome: '100' }],
    })).income.employments[0];
    expect(emp.startDate).toBeNull();
    expect(emp.endDate).toBe('2020-06-15');
  });

  test('borrower.dateOfBirth: non-ISO (06/15/1985) → null', () => {
    expect(formToSuiteApplication(base({ dateOfBirth: '06/15/1985' })).borrower.dateOfBirth).toBeNull();
  });

  test('ownershipShare: numeric share → OwnershipInterestType enum; absent → null', () => {
    const e1 = formToSuiteApplication(base({
      employmentHistory: [{ employerName: 'Acme', ownershipShare: '30', monthlyIncome: '100' }],
    })).income.employments[0];
    expect(e1.ownershipShare).toBe('GREATER_OR_EQUAL_25');

    const e2 = formToSuiteApplication(base({
      employmentHistory: [{ employerName: 'Acme', ownershipShare: '10', monthlyIncome: '100' }],
    })).income.employments[0];
    expect(e2.ownershipShare).toBe('LESS_THAN_25');

    const e3 = formToSuiteApplication(base({
      employmentHistory: [{ employerName: 'Acme', monthlyIncome: '100' }],
    })).income.employments[0];
    expect(e3.ownershipShare).toBeNull();
  });
});
