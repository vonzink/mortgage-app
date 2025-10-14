/**
 * Document Rules Engine - Test Suite
 * 
 * Comprehensive test coverage for all loan scenarios
 */

import { generateDocChecklist, explain } from './docRules';
import { LoanApplication } from './types';

describe('Document Rules Engine', () => {
  
  // ===== CASE A: Conventional Self-Employed LLC <5y =====
  describe('Case A: Conventional Self-Employed LLC <5y', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'SelfEmployed',
      selfEmployed: {
        businessType: 'LLC',
        businessStartDate: '2022-07-01',
        ownershipPercent: 100,
        usesBusinessFundsForClose: false,
        businessHasDecliningIncome: false,
      },
      maritalStatus: 'Single',
      incomes: [{ type: 'SelfEmployment', monthlyAmount: 12000 }],
      assets: [{ type: 'Checking', balance: 40000 }],
      largeDepositsPresent: false,
    };

    it('should require 1 year personal and business returns for Conventional LLC <5y', () => {
      const result = generateDocChecklist(app);
      
      const hasPersonal1Year = result.required.some(d => d.id === 'TAX_RETURN_PERSONAL_1040_YEARS_1');
      const hasBusiness1Year = result.required.some(d => d.id === 'TAX_RETURN_BUSINESS_1065_YEARS_1');
      const hasPersonal2Year = result.required.some(d => d.id === 'TAX_RETURN_PERSONAL_1040_YEARS_2');
      const hasBusiness2Year = result.required.some(d => d.id === 'TAX_RETURN_BUSINESS_1065_YEARS_2');
      
      expect(hasPersonal1Year).toBe(true);
      expect(hasBusiness1Year).toBe(true);
      expect(hasPersonal2Year).toBe(false);
      expect(hasBusiness2Year).toBe(false);
    });

    it('should include YTD P&L and business license', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'YTD_PNL')).toBe(true);
      expect(result.required.some(d => d.id === 'BUSINESS_LICENSE_OR_WEBSITE_PROOF')).toBe(true);
    });

    it('should include global basics', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'GOVT_ID')).toBe(true);
      expect(result.required.some(d => d.id === 'SSN_VERIFICATION')).toBe(true);
    });
  });

  // ===== CASE B: FHA Self-Employed LLC <5y =====
  describe('Case B: FHA Self-Employed LLC <5y', () => {
    const app: LoanApplication = {
      program: 'FHA',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'SelfEmployed',
      selfEmployed: {
        businessType: 'LLC',
        businessStartDate: '2022-07-01',
        ownershipPercent: 100,
        usesBusinessFundsForClose: false,
        businessHasDecliningIncome: false,
      },
      maritalStatus: 'Single',
      incomes: [{ type: 'SelfEmployment', monthlyAmount: 12000 }],
      assets: [{ type: 'Checking', balance: 40000 }],
      largeDepositsPresent: false,
    };

    it('should require 2 years personal and business returns for FHA LLC <5y', () => {
      const result = generateDocChecklist(app);
      
      const hasPersonal2Year = result.required.some(d => d.id === 'TAX_RETURN_PERSONAL_1040_YEARS_2');
      const hasBusiness2Year = result.required.some(d => d.id === 'TAX_RETURN_BUSINESS_1065_YEARS_2');
      const hasPersonal1Year = result.required.some(d => d.id === 'TAX_RETURN_PERSONAL_1040_YEARS_1');
      const hasBusiness1Year = result.required.some(d => d.id === 'TAX_RETURN_BUSINESS_1065_YEARS_1');
      
      expect(hasPersonal2Year).toBe(true);
      expect(hasBusiness2Year).toBe(true);
      expect(hasPersonal1Year).toBe(false);
      expect(hasBusiness1Year).toBe(false);
    });
  });

  // ===== CASE C: VA Divorced Receiving Support =====
  describe('Case C: VA Divorced Receiving Support', () => {
    const app: LoanApplication = {
      program: 'VA',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Divorced',
      receivesChildOrAlimony: true,
      va: {
        priorUseOfEntitlement: false,
        serviceType: 'Regular',
      },
      incomes: [
        { type: 'ChildSupportReceived', monthlyAmount: 600, expectedToContinue: true },
        { type: 'BasePay', monthlyAmount: 5000 },
      ],
      assets: [{ type: 'Checking', balance: 8000 }],
    };

    it('should require divorce decree and support proof', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'DIVORCE_DECREE')).toBe(true);
      expect(result.required.some(d => d.id === 'ALIMONY_CHILD_SUPPORT_PROOF')).toBe(true);
    });

    it('should require W2 employment docs', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'PAYSTUB_30D')).toBe(true);
      expect(result.required.some(d => d.id === 'W2_LAST2Y')).toBe(true);
      expect(result.required.some(d => d.id === 'VOE')).toBe(true);
    });

    it('should require VA COE and DD214', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'VA_COE')).toBe(true);
      expect(result.required.some(d => d.id === 'DD214')).toBe(true);
    });
  });

  // ===== CASE D: USDA with Non-Borrower Household Income =====
  describe('Case D: USDA with Non-Borrower Household Income', () => {
    const app: LoanApplication = {
      program: 'USDA',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Single',
      incomes: [{ type: 'BasePay', monthlyAmount: 4200 }],
      assets: [{ type: 'Savings', balance: 12000 }],
      usda: {
        householdMembers: 4,
        nonBorrowerHouseholdIncome: 2200,
      },
    };

    it('should require USDA household income docs', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'USDA_HOUSEHOLD_INCOME_DOCS')).toBe(true);
    });

    it('should require normal W2 docs', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'PAYSTUB_30D')).toBe(true);
      expect(result.required.some(d => d.id === 'W2_LAST2Y')).toBe(true);
      expect(result.required.some(d => d.id === 'VOE')).toBe(true);
    });
  });

  // ===== CASE E: Purchase with Gift + Large Deposits + Condo =====
  describe('Case E: Purchase with Gift + Large Deposits + Condo', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'Condo',
      employmentType: 'W2',
      maritalStatus: 'Single',
      downPaymentSource: ['Gift'],
      largeDepositsPresent: true,
      incomes: [{ type: 'BasePay', monthlyAmount: 7000 }],
      assets: [{ type: 'Checking', balance: 50000 }],
    };

    it('should require gift documentation', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'GIFT_LETTER')).toBe(true);
      expect(result.required.some(d => d.id === 'DONOR_ASSET_EVIDENCE')).toBe(true);
      expect(result.required.some(d => d.id === 'GIFT_FUNDS_PROOF_OF_TRANSFER')).toBe(true);
    });

    it('should require large deposit documentation', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'SOURCE_LARGE_DEPOSITS')).toBe(true);
      expect(result.required.some(d => d.id === 'BANK_STMTS_2M')).toBe(true);
      expect(result.required.some(d => d.id === 'LOE_LARGE_DEPOSITS')).toBe(true);
    });

    it('should require condo documentation', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'CONDO_DOCS_BUDGET_MINUTES_INSURANCE')).toBe(true);
    });

    it('should require purchase contract and earnest money', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'PURCHASE_CONTRACT')).toBe(true);
      expect(result.required.some(d => d.id === 'EARNEST_MONEY_PROOF')).toBe(true);
    });
  });

  // ===== CASE F: Self-Employed Using Business Funds =====
  describe('Case F: Self-Employed Using Business Funds', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'SelfEmployed',
      selfEmployed: {
        businessType: 'LLC',
        businessStartDate: '2020-01-01',
        ownershipPercent: 100,
        usesBusinessFundsForClose: true,
        businessHasDecliningIncome: false,
      },
      maritalStatus: 'Single',
      incomes: [{ type: 'SelfEmployment', monthlyAmount: 15000 }],
      assets: [{ type: 'Checking', balance: 30000 }],
    };

    it('should require business bank statements and CPA letter', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'BUSINESS_BANK_STATEMENTS_2_12M')).toBe(true);
      expect(result.required.some(d => d.id === 'CPA_LETTER_OR_LICENSE')).toBe(true);
    });
  });

  // ===== CASE G: Crypto Liquidation =====
  describe('Case G: Crypto Liquidation', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Single',
      downPaymentSource: ['CryptoLiquidated'],
      incomes: [{ type: 'BasePay', monthlyAmount: 8000 }],
      assets: [
        { type: 'Checking', balance: 60000 },
        { type: 'Crypto', balance: 0 },
      ],
    };

    it('should require crypto liquidation proof and paper trail', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'CRYPTO_LIQUIDATION_PROOF')).toBe(true);
      expect(result.required.some(d => d.id === 'BANK_STMTS_2M')).toBe(true);
    });
  });

  // ===== ADDITIONAL TEST CASES =====

  describe('Name Variations', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Single',
      nameVariations: ['Jane Smith', 'Jane Doe', 'Jane Smith-Doe'],
      incomes: [{ type: 'BasePay', monthlyAmount: 5000 }],
      assets: [],
    };

    it('should require name change docs and LOE for name variations', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'NAME_CHANGE_DOCS')).toBe(true);
      expect(result.required.some(d => d.id === 'LOE_ALT_NAMES')).toBe(true);
    });
  });

  describe('Credit Inquiries', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Single',
      creditInquiriesLast90Days: true,
      incomes: [{ type: 'BasePay', monthlyAmount: 5000 }],
      assets: [],
    };

    it('should require LOE for recent credit inquiries', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'LOE_CREDIT_INQUIRIES')).toBe(true);
    });
  });

  describe('Rental Income', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Single',
      incomes: [
        { type: 'BasePay', monthlyAmount: 5000 },
        { type: 'Rental', monthlyAmount: 1500 },
      ],
      assets: [],
    };

    it('should require rental leases and Schedule E', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'RENTAL_LEASES')).toBe(true);
      expect(result.required.some(d => d.id === 'RENTAL_SCHEDULE_E_LAST2Y')).toBe(true);
    });
  });

  describe('Paying Alimony/Child Support', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Divorced',
      paysAlimony: true,
      paysChildSupport: true,
      incomes: [{ type: 'BasePay', monthlyAmount: 5000 }],
      assets: [],
    };

    it('should require support order documentation', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'ALIMONY_CHILD_SUPPORT_ORDER')).toBe(true);
      expect(result.required.some(d => d.id === 'DIVORCE_DECREE')).toBe(true);
    });
  });

  describe('Bankruptcy History', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Single',
      bkHistory: {
        chapter: '7',
        dischargeDate: '2020-06-15',
      },
      incomes: [{ type: 'BasePay', monthlyAmount: 5000 }],
      assets: [],
    };

    it('should require bankruptcy discharge documentation', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'BK_PAPERS_DISCHARGE')).toBe(true);
    });
  });

  describe('Foreclosure History', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Single',
      foreclosureHistoryDate: '2019-03-10',
      incomes: [{ type: 'BasePay', monthlyAmount: 5000 }],
      assets: [],
    };

    it('should require foreclosure documentation', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'FORECLOSURE_DOCS')).toBe(true);
    });
  });

  describe('Mortgage Lates', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Single',
      mortgageLatesIn12Mo: 2,
      incomes: [{ type: 'BasePay', monthlyAmount: 5000 }],
      assets: [],
    };

    it('should require LOE for mortgage lates', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'LOE_MORTGAGE_LATES')).toBe(true);
    });
  });

  describe('Living Rent Free', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Single',
      rentHistory: {
        payingRent: false,
        method: 'LivingRentFree',
      },
      incomes: [{ type: 'BasePay', monthlyAmount: 5000 }],
      assets: [],
    };

    it('should require LOE for rent-free living', () => {
      const result = generateDocChecklist(app);
      
      expect(result.required.some(d => d.id === 'LOE_RENT_FREE')).toBe(true);
    });
  });

  describe('Explain Function', () => {
    const app: LoanApplication = {
      program: 'Conventional',
      transactionType: 'Purchase',
      occupancy: 'Primary',
      propertyType: 'SFR',
      employmentType: 'W2',
      maritalStatus: 'Single',
      incomes: [{ type: 'BasePay', monthlyAmount: 5000 }],
      assets: [],
    };

    it('should generate human-readable explanations', () => {
      const explanations = explain(app);
      
      expect(explanations.length).toBeGreaterThan(0);
      expect(explanations.every(e => e.includes('R-'))).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should generate clarifications for missing required fields', () => {
      const app: LoanApplication = {
        program: 'Conventional',
        transactionType: 'Purchase',
        occupancy: 'Primary',
        propertyType: 'SFR',
        employmentType: 'SelfEmployed',
        maritalStatus: 'Single',
        incomes: [],
        assets: [],
      };

      const result = generateDocChecklist(app);
      
      expect(result.clarifications.length).toBeGreaterThan(0);
    });
  });

  describe('Document Deduplication', () => {
    it('should merge documents with same ID', () => {
      const app: LoanApplication = {
        program: 'Conventional',
        transactionType: 'Purchase',
        occupancy: 'Primary',
        propertyType: 'SFR',
        employmentType: 'W2',
        maritalStatus: 'Single',
        largeDepositsPresent: true,
        assets: [{ type: 'Checking', balance: 50000 }],
        incomes: [{ type: 'BasePay', monthlyAmount: 5000 }],
      };

      const result = generateDocChecklist(app);
      
      // BANK_STMTS_2M should appear only once even though triggered by multiple rules
      const bankStmtCount = result.required.filter(d => d.id === 'BANK_STMTS_2M').length;
      expect(bankStmtCount).toBe(1);
      
      // But should have multiple rule hits
      const bankStmtDoc = result.required.find(d => d.id === 'BANK_STMTS_2M');
      expect(bankStmtDoc?.ruleHits.length).toBeGreaterThan(1);
    });
  });
});


