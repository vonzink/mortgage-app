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
  mapRaceCode,
  mapEthnicityCode,
  mapSexCode,
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

// ── HMDA enum maps (§8) — must equal suite Race/Ethnicity/Sex constants ───

describe('mapRaceCode (FE MISMO code → suite Race enum)', () => {
  test.each([
    ['AmericanIndianOrAlaskaNative', 'AMERICAN_INDIAN_OR_ALASKA_NATIVE'],
    ['Asian', 'ASIAN'],
    ['BlackOrAfricanAmerican', 'BLACK_OR_AFRICAN_AMERICAN'],
    ['NativeHawaiianOrOtherPacificIslander', 'NATIVE_HAWAIIAN_OR_PACIFIC_ISLANDER'],
    ['White', 'WHITE'],
    // Unknown / sub-category codes the FE does not offer → dropped (never guessed).
    ['Chinese', null],
    ['Samoan', null],
    ['', null],
    [undefined, null],
  ])('%s → %s', (input, expected) => {
    expect(mapRaceCode(input)).toBe(expected);
  });
});

describe('mapEthnicityCode (FE MISMO code → suite Ethnicity enum)', () => {
  test.each([
    ['HispanicOrLatino', 'HISPANIC_OR_LATINO'],
    ['NotHispanicOrLatino', 'NOT_HISPANIC_OR_LATINO'],
    // Sub-categories the FE does not offer → dropped.
    ['Mexican', null],
    ['', null],
    [undefined, null],
  ])('%s → %s', (input, expected) => {
    expect(mapEthnicityCode(input)).toBe(expected);
  });
});

describe('mapSexCode (FE MISMO code → suite Sex enum)', () => {
  test.each([
    ['Male', 'MALE'],
    ['Female', 'FEMALE'],
    // Suite Sex has no N/A or Unknown — the soft codes are NOT fabricated into
    // an affirmative refusal here; declining is carried by hmdaSexRefusal instead.
    ['InformationNotProvidedUnknown', null],
    ['NotApplicable', null],
    ['', null],
    [undefined, null],
  ])('%s → %s', (input, expected) => {
    expect(mapSexCode(input)).toBe(expected);
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

  test('no §5/§8 data on the fixture → declarations and demographics null (suite skips)', () => {
    expect(out.declarations).toBeNull();
    expect(out.demographics).toBeNull();
  });
});

// ── §5 Declarations + §8 HMDA Demographics ───────────────────────────────
// Regulated data. These lock in the EXACT suite shapes: DeclarationsRequest
// boolean fields and DemographicsInfo { ethnicity[], race[], sex } with enum
// NAMES equal to the suite Race/Ethnicity/Sex constants; unmappable codes drop.

describe('formToSuiteApplication — §5 declarations mapping', () => {
  const out = formToSuiteApplication({
    borrowers: [
      {
        firstName: 'Decl', lastName: 'Arant', email: 'd@e.com',
        declaration: {
          occupyPrimaryResidence: true,
          ownershipInterestThreeYears: false,
          familyBusinessAffiliation: true,
          borrowingMoneyTransaction: false,
          applyingMortgageOtherProperty: true,
          applyingNewCredit: false,
          propertySubjectLien: true,
          coSignerGuarantor: false,
          outstandingJudgments: true,
          delinquentFederalDebt: false,
          partyToLawsuit: true,
          conveyedTitleLieuForeclosure: false,
          preForeclosureSale: true,
          propertyForeclosedSevenYears: false,
          declaredBankruptcySevenYears: true,
        },
      },
    ],
  });

  test('all 15 live-UI checkboxes map 1:1 to the suite DeclarationsRequest booleans', () => {
    expect(out.declarations).toMatchObject({
      occupyAsPrimaryResidence: true,
      hadOwnershipInterestLast3Years: false,
      familyOrBusinessAffiliationWithSeller: true,
      borrowingUndisclosedMoney: false,
      applyingForOtherMortgageOnProperty: true,
      applyingForNewCreditBeforeClosing: false,
      subjectToPriorityLienPace: true,
      coSignerOrGuarantorOnUndisclosedDebt: false,
      outstandingJudgments: true,
      delinquentOrDefaultOnFederalDebt: false,
      partyToLawsuit: true,
      conveyedTitleInLieuLast7Years: false,
      completedPreForeclosureShortSaleLast7Years: true,
      propertyForeclosedLast7Years: false,
      declaredBankruptcyLast7Years: true,
    });
  });

  test('the 3 enum/set §5 fields with no FE source stay null (never guessed)', () => {
    expect(out.declarations.priorPropertyUsage).toBeNull();
    expect(out.declarations.priorPropertyTitleType).toBeNull();
    expect(out.declarations.bankruptcyTypes).toBeNull();
  });

  test('unanswered §5 (no declaration block) → declarations null so the suite skips it', () => {
    const o = formToSuiteApplication({ borrowers: [{ firstName: 'No', lastName: 'Decl', email: 'n@e.com' }] });
    expect(o.declarations).toBeNull();
  });

  test('a single answered checkbox still sends declarations (a true wins over absent siblings)', () => {
    const o = formToSuiteApplication({
      borrowers: [{ firstName: 'One', lastName: 'Flag', declaration: { partyToLawsuit: true } }],
    });
    expect(o.declarations).not.toBeNull();
    expect(o.declarations.partyToLawsuit).toBe(true);
    // Untouched checkboxes are null (= unanswered), NOT false.
    expect(o.declarations.outstandingJudgments).toBeNull();
  });

  test('legacy aliased keys still coalesce (rehydrated form) — bankruptcy/foreclosure/lawsuit', () => {
    const o = formToSuiteApplication({
      borrowers: [{ firstName: 'Legacy', lastName: 'Form', declaration: {
        bankruptcy: true, foreclosure: true, lawsuit: true, intentToOccupy: true,
      } }],
    });
    expect(o.declarations).toMatchObject({
      declaredBankruptcyLast7Years: true,
      propertyForeclosedLast7Years: true,
      partyToLawsuit: true,
      occupyAsPrimaryResidence: true,
    });
  });
});

describe('formToSuiteApplication — §8 HMDA demographics mapping', () => {
  test('race/ethnicity CSV → suite enum arrays; sex single enum; exact constant names', () => {
    const out = formToSuiteApplication({
      borrowers: [
        {
          firstName: 'Hmda', lastName: 'Self', email: 'h@e.com',
          declaration: {
            hmdaRace: 'Asian,White',
            hmdaEthnicity: 'HispanicOrLatino',
            hmdaSex: 'Female',
          },
        },
      ],
    });
    expect(out.demographics).toEqual({
      ethnicity: ['HISPANIC_OR_LATINO'],
      race: ['ASIAN', 'WHITE'],
      sex: 'FEMALE',
    });
  });

  test('unmappable race codes are DROPPED; valid ones survive (no guessing)', () => {
    const out = formToSuiteApplication({
      borrowers: [{ firstName: 'X', lastName: 'Y', declaration: {
        // 'Chinese' is a real MISMO sub-category but the FE never offers it and the
        // suite top-level Race enum is coarse → dropped; only White survives.
        hmdaRace: 'Chinese,White,Klingon',
      } }],
    });
    expect(out.demographics.race).toEqual(['WHITE']);
  });

  test('refusal flags → DO_NOT_WISH_TO_PROVIDE per axis (override any codes)', () => {
    const out = formToSuiteApplication({
      borrowers: [{ firstName: 'Ref', lastName: 'Use', declaration: {
        hmdaRace: 'Asian', hmdaRaceRefusal: true,
        hmdaEthnicity: 'HispanicOrLatino', hmdaEthnicityRefusal: true,
        hmdaSex: 'Male', hmdaSexRefusal: true,
      } }],
    });
    expect(out.demographics).toEqual({
      ethnicity: ['DO_NOT_WISH_TO_PROVIDE'],
      race: ['DO_NOT_WISH_TO_PROVIDE'],
      sex: 'DO_NOT_WISH_TO_PROVIDE',
    });
  });

  test('soft sex codes (Not provided / N/A) are NOT fabricated into a refusal → sex null', () => {
    const out = formToSuiteApplication({
      borrowers: [{ firstName: 'Soft', lastName: 'Sex', declaration: {
        hmdaSex: 'InformationNotProvidedUnknown', hmdaRace: 'White',
      } }],
    });
    // race present so demographics is sent, but sex is omitted (null) — no guess.
    expect(out.demographics.sex).toBeNull();
    expect(out.demographics.race).toEqual(['WHITE']);
  });

  test('no HMDA data → demographics null so the suite skips it', () => {
    const out = formToSuiteApplication({ borrowers: [{ firstName: 'No', lastName: 'Hmda' }] });
    expect(out.demographics).toBeNull();
  });

  test('demographics is PRIMARY-only — a co-borrower CoBorrowerSection carries no demographics key', () => {
    const out = formToSuiteApplication({
      borrowers: [
        { firstName: 'Prim', lastName: 'Ary', declaration: { hmdaRace: 'White' } },
        { firstName: 'Co', lastName: 'Bo', email: 'co@e.com', declaration: { hmdaRace: 'Asian' } },
      ],
    });
    expect(out.demographics.race).toEqual(['WHITE']);
    expect(out.coBorrowers[0]).not.toHaveProperty('demographics');
    expect(out.coBorrowers[0]).not.toHaveProperty('declarations');
  });
});

// AssetsLiabilitiesStep now lets each co-borrower enter their OWN assets/liabilities/REO
// (borrowers[1..].{assets,liabilities,reoProperties}). This locks in that those per-co-
// borrower arrays reach coBorrowers[].{assets,liabilities,reo} — not just the primary.
describe('formToSuiteApplication — co-borrower assets/liabilities/reo', () => {
  const out = formToSuiteApplication({
    borrowers: [
      { firstName: 'Jane', lastName: 'Borrower' },
      {
        firstName: 'John',
        lastName: 'Coborrower',
        email: 'john@example.com',
        assets: [
          { assetType: 'Savings', bankName: 'CreditUnion', accountNumber: '222', assetValue: '12000' },
          // Blank asset → filtered out.
          { assetType: '', assetValue: '999' },
        ],
        liabilities: [
          {
            liabilityType: 'AutoLoan',
            creditorName: 'CarFinance',
            accountNumber: '7777',
            unpaidBalance: '15000',
            monthlyPayment: '300',
          },
          // No creditor → filtered out.
          { liabilityType: 'CreditCard', creditorName: '' },
        ],
        reoProperties: [
          {
            addressLine: '42 CoOwned Ln',
            city: 'Denver',
            state: 'CO',
            zipCode: '80202',
            propertyType: 'Secondary',
            propertyValue: '450000',
            monthlyPayment: '2100',
            unpaidBalance: '250000',
          },
          // No address → filtered out.
          { addressLine: '' },
        ],
      },
    ],
  });

  test('co-borrower is mapped into coBorrowers[0]', () => {
    expect(out.coBorrowers).toHaveLength(1);
    expect(out.coBorrowers[0].borrower).toMatchObject({
      firstName: 'John',
      lastName: 'Coborrower',
      email: 'john@example.com',
    });
  });

  test('co-borrower assets flow through (blanks filtered, type mapped)', () => {
    expect(out.coBorrowers[0].assets).toHaveLength(1);
    expect(out.coBorrowers[0].assets[0]).toMatchObject({
      assetType: 'SAVINGS',
      financialInstitution: 'CreditUnion',
      accountNumber: '222',
      cashOrMarketValue: 12000,
    });
  });

  test('co-borrower liabilities flow through (blanks filtered, type mapped)', () => {
    expect(out.coBorrowers[0].liabilities).toHaveLength(1);
    expect(out.coBorrowers[0].liabilities[0]).toMatchObject({
      liabilityType: 'INSTALLMENT',
      creditorName: 'CarFinance',
      unpaidBalance: 15000,
      monthlyPayment: 300,
    });
  });

  test('co-borrower reo flows through (no-address filtered, occupancy mapped)', () => {
    expect(out.coBorrowers[0].reo).toHaveLength(1);
    expect(out.coBorrowers[0].reo[0]).toMatchObject({
      addressLine1: '42 CoOwned Ln',
      city: 'Denver',
      state: 'CO',
      postalCode: '80202',
      intendedOccupancy: 'SECOND_HOME',
      propertyStatus: 'RETAINED',
      marketValue: 450000,
      mortgageUnpaidBalance: 250000,
      mortgageMonthlyPayment: 2100,
      isSubjectProperty: false,
    });
  });

  test('primary (borrowers[0]) sections stay empty — co-borrower data is NOT bled up', () => {
    expect(out.assets).toBeNull();
    expect(out.liabilities).toBeNull();
    expect(out.reo).toBeNull();
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
