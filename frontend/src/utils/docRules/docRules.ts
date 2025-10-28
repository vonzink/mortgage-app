/**
 * Mortgage Document Rules Engine
 * 
 * Deterministic rules engine that generates borrower document checklists
 * based on loan application details for Conventional, FHA, VA, and USDA loans.
 */

import {
  LoanApplication,
  DocRequest,
  DocChecklistResult,
  Rule,
  Overlays,
  RuleContext,
  LoanProgram,
  BusinessType,
} from './types';
import { getDocumentLabel } from './documentCatalog';

// Default overlays configuration
const DEFAULT_OVERLAYS: Overlays = {
  defaultBusinessReturnsYears: 2,
  minBankStmtMonths: 2,
  studentLoanImputeRule: 'programDefault',
  alwaysRequire2YearsSelfEmployed: false,
  requireCondoDocs: true,
};

/**
 * Calculate years in business from start date
 */
function calculateYearsInBusiness(businessStartDate: string): number {
  const start = new Date(businessStartDate);
  const now = new Date();
  const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return years;
}

/**
 * Determine required tax return years for self-employed based on program and business type
 */
function getRequiredTaxReturnYears(
  program: LoanProgram,
  businessType: BusinessType,
  yearsInBusiness: number,
  overlays: Overlays
): number {
  const isStructuredEntity = ['LLC', 'SCorp', 'CCorp', 'Partnership'].includes(businessType);
  
  if (!isStructuredEntity) {
    return overlays.defaultBusinessReturnsYears;
  }

  // R-SE-01: Specific logic for structured entities < 5 years
  if (yearsInBusiness < 5) {
    if (program === 'Conventional') {
      return 1;
    } else if (program === 'FHA' || program === 'VA') {
      return 2;
    }
  }

  // Fallback to overlay default
  return overlays.defaultBusinessReturnsYears;
}

/**
 * Create a document request
 */
function createDoc(
  id: string,
  reason: string,
  ruleHits: string[],
  conditional: boolean = false,
  programScope?: LoanProgram[]
): DocRequest {
  return {
    id,
    label: getDocumentLabel(id),
    reason,
    ruleHits,
    conditional,
    programScope,
  };
}

/**
 * Define all rules
 */
function defineRules(context: RuleContext): Rule[] {
  const { app, overlays } = context;

  return [
    // ===== GLOBAL / IDENTITY RULES =====
    {
      id: 'R-G-01',
      title: 'Always require government ID and SSN verification',
      when: () => true,
      docs: [
        createDoc('GOVT_ID', 'Required for all borrowers', ['R-G-01']),
      ],
    },
    {
      id: 'R-G-02',
      title: 'Name variations require documentation',
      when: (app) => !!app.nameVariations && app.nameVariations.length > 0,
      docs: [
        createDoc('NAME_CHANGE_DOCS', 'Name variations present', ['R-G-02']),
        createDoc('LOE_ALT_NAMES', 'Explain name variations', ['R-G-02']),
      ],
    },
    {
      id: 'R-G-03',
      title: 'Recent credit inquiries require explanation',
      when: (app) => app.creditInquiriesLast90Days === true,
      docs: [
        createDoc('LOE_CREDIT_INQUIRIES', 'Recent credit inquiries in last 90 days', ['R-G-03']),
      ],
    },
    {
      id: 'R-G-04',
      title: 'Large deposits require documentation',
      when: (app) => app.largeDepositsPresent === true,
      docs: [
        createDoc('SOURCE_LARGE_DEPOSITS', 'Large deposits present', ['R-G-04']),
        createDoc('BANK_STMTS_2M', 'Bank statements to trace deposits', ['R-G-04']),
        createDoc('LOE_LARGE_DEPOSITS', 'Explain large deposits', ['R-G-04']),
      ],
    },
    {
      id: 'R-G-05',
      title: 'Non-US citizens require immigration documentation',
      when: (app) => app.isPermanentResident === true || app.hasITIN === true,
      docs: [
        createDoc('GREEN_CARD_EAD', 'Permanent resident or ITIN holder', ['R-G-05']),
      ],
    },

    // ===== EMPLOYMENT & INCOME RULES =====
    {
      id: 'R-E-01',
      title: 'W2 employment requires paystubs, W-2s, and VOE',
      when: (app) => app.employmentType === 'W2',
      docs: [
        createDoc('PAYSTUB_30D', 'W2 employment - recent paystub', ['R-E-01']),
        createDoc('W2_LAST2Y', 'W2 employment - last 2 years', ['R-E-01']),
      ],
    },
    {
      id: 'R-E-02',
      title: 'Employment gaps require explanation',
      when: (app) => {
        if (!app.startDate) return false;
        const start = new Date(app.startDate);
        const now = new Date();
        const monthsEmployed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return monthsEmployed < app.yearsInLineOfWork! * 12 - 2;
      },
      docs: [
        createDoc('LOE_GAPS_EMPLOYMENT', 'Employment gaps detected', ['R-E-02']),
      ],
    },

    // ===== SELF-EMPLOYED RULES =====
    {
      id: 'R-SE-01',
      title: 'Self-employed tax returns based on program and years in business',
      when: (app) => app.employmentType === 'SelfEmployed' && !!app.selfEmployed,
      docs: (app) => {
        if (!app.selfEmployed) return [];
        const yearsInBusiness = calculateYearsInBusiness(app.selfEmployed.businessStartDate);
        const requiredYears = getRequiredTaxReturnYears(
          app.program,
          app.selfEmployed.businessType,
          yearsInBusiness,
          overlays
        );

        const docs: DocRequest[] = [];
        
        // Personal returns
        if (requiredYears === 1) {
          docs.push(createDoc('TAX_RETURN_PERSONAL_1040_YEARS_1', 
            `Self-employed ${app.selfEmployed.businessType} <5y → 1 year returns (${app.program})`, 
            ['R-SE-01']));
        } else {
          docs.push(createDoc('TAX_RETURN_PERSONAL_1040_YEARS_2', 
            `Self-employed ${app.selfEmployed.businessType} <5y → 2 years returns (${app.program})`, 
            ['R-SE-01']));
        }

        // Business returns based on entity type
        const businessDocSuffix = requiredYears === 1 ? 'YEARS_1' : 'YEARS_2';
        let businessDocId = 'TAX_RETURN_BUSINESS_SCHEDULEC_YEARS_1';
        
        if (app.selfEmployed.businessType === 'LLC') {
          businessDocId = `TAX_RETURN_BUSINESS_1065_${businessDocSuffix}`;
        } else if (app.selfEmployed.businessType === 'SCorp') {
          businessDocId = `TAX_RETURN_BUSINESS_1120S_${businessDocSuffix}`;
        } else if (app.selfEmployed.businessType === 'CCorp') {
          businessDocId = `TAX_RETURN_BUSINESS_1120_${businessDocSuffix}`;
        } else if (app.selfEmployed.businessType === 'Partnership') {
          businessDocId = `TAX_RETURN_BUSINESS_1065_${businessDocSuffix}`;
        } else {
          businessDocId = `TAX_RETURN_BUSINESS_SCHEDULEC_${businessDocSuffix}`;
        }

        docs.push(createDoc(businessDocId, 
          `Business returns required (${app.selfEmployed.businessType})`, 
          ['R-SE-01']));

        return docs;
      },
    },
    {
      id: 'R-SE-02',
      title: 'K-1 required for ownership ≥25%',
      when: (app) => 
        app.employmentType === 'SelfEmployed' && 
        app.selfEmployed?.ownershipPercent && 
        app.selfEmployed.ownershipPercent >= 25,
      docs: [
        createDoc('K1_LAST2Y', 'Ownership ≥25% requires K-1', ['R-SE-02']),
      ],
    },
    {
      id: 'R-SE-03',
      title: 'Business funds for closing require business statements and CPA letter',
      when: (app) => 
        app.employmentType === 'SelfEmployed' && 
        app.selfEmployed?.usesBusinessFundsForClose === true,
      docs: [
        createDoc('BUSINESS_BANK_STATEMENTS_2_12M', 'Using business funds to close', ['R-SE-03']),
        createDoc('CPA_LETTER_OR_LICENSE', 'CPA letter verifying no adverse impact', ['R-SE-03']),
      ],
    },
    {
      id: 'R-SE-04',
      title: 'Always require YTD P&L for self-employed',
      when: (app) => app.employmentType === 'SelfEmployed',
      docs: [
        createDoc('YTD_PNL', 'Year-to-date profit & loss', ['R-SE-04']),
        createDoc('YTD_BALANCE_SHEET', 'Year-to-date balance sheet (if mid-year)', ['R-SE-04']),
      ],
    },
    {
      id: 'R-SE-05',
      title: 'Declining income requires additional year regardless of program',
      when: (app) => 
        app.employmentType === 'SelfEmployed' && 
        app.selfEmployed?.businessHasDecliningIncome === true,
      docs: [
        createDoc('TAX_RETURN_PERSONAL_1040_YEARS_2', 'Declining income - 2 years required', ['R-SE-05']),
      ],
    },
    {
      id: 'R-SE-06',
      title: 'Business license or website proof always required',
      when: (app) => app.employmentType === 'SelfEmployed',
      docs: [
        createDoc('BUSINESS_LICENSE_OR_WEBSITE_PROOF', 'Verify business existence', ['R-SE-06']),
      ],
    },

    // ===== 1099 / COMMISSION / BONUS RULES =====
    {
      id: 'R-1099-01',
      title: '1099 or commission income requires 2 years of 1099s',
      when: (app) => 
        app.incomes.some(inc => inc.type === 'Commission'),
      docs: [
        createDoc('FORM1099_LAST2Y', '1099 or commission income', ['R-1099-01']),
        createDoc('YTD_PNL', 'Year-to-date proof of receipts', ['R-1099-01']),
      ],
    },
    {
      id: 'R-BONUS-01',
      title: 'Bonus or overtime requires 2 years W-2 and YTD history',
      when: (app) => 
        app.incomes.some(inc => inc.type === 'Bonus' || inc.type === 'Overtime'),
      docs: [
        createDoc('W2_LAST2Y', 'Bonus/overtime requires W-2 history', ['R-BONUS-01']),
        createDoc('PAYSTUB_30D', 'YTD pay history for bonus/overtime', ['R-BONUS-01']),
      ],
    },

    // ===== ALIMONY / CHILD SUPPORT RULES =====
    {
      id: 'R-FAM-01',
      title: 'Receiving support requires proof and continuance documentation',
      when: (app) => 
        app.receivesChildOrAlimony === true || 
        app.incomes.some(inc => inc.type === 'AlimonyReceived' || inc.type === 'ChildSupportReceived'),
      docs: [
        createDoc('ALIMONY_CHILD_SUPPORT_PROOF', 'Proof of support receipt (6-12 months)', ['R-FAM-01']),
        createDoc('LOE_GAPS_EMPLOYMENT', 'Proof of continuance ≥3 years', ['R-FAM-01']),
      ],
    },
    {
      id: 'R-FAM-02',
      title: 'Paying support requires court order',
      when: (app) => app.paysAlimony === true || app.paysChildSupport === true,
      docs: [
        createDoc('ALIMONY_CHILD_SUPPORT_ORDER', 'Court order for support payments', ['R-FAM-02']),
      ],
    },
    {
      id: 'R-FAM-03',
      title: 'Divorced requires divorce decree',
      when: (app) => app.maritalStatus === 'Divorced',
      docs: [
        createDoc('DIVORCE_DECREE', 'Divorce decree with support terms', ['R-FAM-03']),
      ],
    },
    {
      id: 'R-FAM-04',
      title: 'Support claimed as asset requires documentation',
      when: (app) => app.supportOrderDocsClaimedInAssets === true,
      docs: [
        createDoc('ALIMONY_CHILD_SUPPORT_PROOF', 'Support income documentation', ['R-FAM-04']),
      ],
    },

    // ===== RENTAL INCOME RULES =====
    {
      id: 'R-RENT-01',
      title: 'Rental income requires leases and Schedule E',
      when: (app) => app.incomes.some(inc => inc.type === 'Rental'),
      docs: [
        createDoc('RENTAL_LEASES', 'Rental property leases', ['R-RENT-01']),
        createDoc('RENTAL_SCHEDULE_E_LAST2Y', 'Schedule E - last 2 years', ['R-RENT-01']),
      ],
    },

    // ===== ASSETS / FUNDS TO CLOSE RULES =====
    {
      id: 'R-AST-01',
      title: 'Assets used to qualify require statements',
      when: (app) => app.assets.length > 0,
      docs: (app) => {
        const docs: DocRequest[] = [];
        const hasChecking = app.assets.some(a => a.type === 'Checking');
        const hasSavings = app.assets.some(a => a.type === 'Savings');
        const hasBrokerage = app.assets.some(a => a.type === 'Brokerage');
        const hasRetirement = app.assets.some(a => a.type === 'Retirement');

        if (hasChecking || hasSavings) {
          docs.push(createDoc('BANK_STMTS_2M', 'Bank statements for assets', ['R-AST-01']));
        }
        if (hasBrokerage) {
          docs.push(createDoc('BROKERAGE_STMTS_2M', 'Brokerage statements', ['R-AST-01']));
        }
        if (hasRetirement) {
          docs.push(createDoc('RETIREMENT_STMTS_2M', 'Retirement account statements', ['R-AST-01']));
        }

        return docs;
      },
    },
    {
      id: 'R-AST-02',
      title: 'Gift funds require gift letter and donor documentation',
      when: (app) => 
        app.downPaymentSource?.includes('Gift') === true,
      docs: [
        createDoc('GIFT_LETTER', 'Gift letter (Fannie Mae form)', ['R-AST-02']),
        createDoc('DONOR_ASSET_EVIDENCE', 'Donor asset evidence', ['R-AST-02']),
        createDoc('GIFT_FUNDS_PROOF_OF_TRANSFER', 'Proof of gift transfer', ['R-AST-02']),
      ],
    },
    {
      id: 'R-AST-03',
      title: 'Crypto liquidation requires proof and paper trail',
      when: (app) => 
        app.downPaymentSource?.includes('CryptoLiquidated') === true ||
        app.assets.some(a => a.type === 'Crypto'),
      docs: [
        createDoc('CRYPTO_LIQUIDATION_PROOF', 'Cryptocurrency liquidation proof', ['R-AST-03']),
        createDoc('BANK_STMTS_2M', 'Full paper trail into verifiable funds', ['R-AST-03']),
      ],
    },
    {
      id: 'R-AST-04',
      title: 'Sale of asset requires bill of sale',
      when: (app) => app.downPaymentSource?.includes('SaleOfAsset') === true,
      docs: [
        createDoc('SALE_OF_ASSET_BILL_OF_SALE', 'Bill of sale for asset', ['R-AST-04']),
      ],
    },

    // ===== STUDENT LOAN RULES =====
    // Student loan documents intentionally omitted until student loan data is available

    // ===== GOVERNMENT PROGRAM SPECIFICS =====
    {
      id: 'R-FHA-01',
      title: 'FHA may require CAIVRS check evidence',
      when: (app) => app.program === 'FHA',
      docs: [
        createDoc('GOVT_ID', 'FHA program requirement', ['R-FHA-01']),
      ],
      conditional: true,
    },
    {
      id: 'R-VA-01',
      title: 'VA requires COE and service documentation',
      when: (app) => app.program === 'VA',
      docs: (app) => {
        const docs: DocRequest[] = [
          createDoc('VA_COE', 'VA Certificate of Eligibility', ['R-VA-01']),
        ];
        if (app.va?.serviceType) {
          docs.push(createDoc('DD214', 'Military discharge papers', ['R-VA-01']));
        }
        if (app.incomes.some(inc => inc.type === 'VACompensation')) {
          docs.push(createDoc('VA_DISABILITY_AWARD', 'VA disability award letter', ['R-VA-01']));
        }
        return docs;
      },
    },
    {
      id: 'R-USDA-01',
      title: 'USDA requires household income documentation',
      when: (app) => app.program === 'USDA' && app.usda?.householdMembers && app.usda.householdMembers > 0,
      docs: [
        createDoc('USDA_HOUSEHOLD_INCOME_DOCS', 'Household income for all occupants (paystubs/W-2/award letters)', ['R-USDA-01']),
      ],
    },

    // ===== PROPERTY / TRANSACTION RULES =====
    {
      id: 'R-PR-01',
      title: 'Purchase transaction requires contract and earnest money proof',
      when: (app) => app.transactionType === 'Purchase',
      docs: [
        createDoc('PURCHASE_CONTRACT', 'Purchase contract', ['R-PR-01']),
        createDoc('EARNEST_MONEY_PROOF', 'Earnest money deposit proof', ['R-PR-01']),
      ],
    },
    {
      id: 'R-PR-02',
      title: 'Condo requires condo documentation',
      when: (app) => app.propertyType === 'Condo' || app.isCondo === true,
      docs: [
        createDoc('CONDO_DOCS_BUDGET_MINUTES_INSURANCE', 'Condo budget, minutes, insurance', ['R-PR-02']),
      ],
    },
    {
      id: 'R-PR-03',
      title: 'Trust vesting requires trust documentation',
      when: (app) => false, // Would need trust vesting field
      docs: [
        createDoc('TITLE_TRUST_DOCS', 'Title/trust documentation', ['R-PR-03']),
      ],
      conditional: true,
    },
    {
      id: 'R-PR-04',
      title: 'Homeowners insurance required',
      when: () => true,
      docs: [
        createDoc('HOMEOWNERS_INSURANCE_QUOTE', 'Homeowner insurance quote prior to CTC', ['R-PR-04']),
      ],
    },

    // ===== CREDIT EVENTS RULES =====
    {
      id: 'R-CR-01',
      title: 'Bankruptcy requires discharge documentation',
      when: (app) => !!app.bkHistory,
      docs: [
        createDoc('BK_PAPERS_DISCHARGE', 'Bankruptcy papers & discharge', ['R-CR-01']),
      ],
    },
    {
      id: 'R-CR-02',
      title: 'Foreclosure requires documentation',
      when: (app) => !!app.foreclosureHistoryDate,
      docs: [
        createDoc('FORECLOSURE_DOCS', 'Foreclosure documentation', ['R-CR-02']),
      ],
    },
    {
      id: 'R-CR-03',
      title: 'Mortgage lates require explanation and proof of cure',
      when: (app) => (app.mortgageLatesIn12Mo ?? 0) > 0,
      docs: [
        createDoc('LOE_MORTGAGE_LATES', 'Mortgage payment history explanation', ['R-CR-03']),
      ],
    },

    // ===== OCCUPANCY & RENT RULES =====
    {
      id: 'R-OCC-01',
      title: 'Rent history with thin credit may require landlord VOR',
      when: (app) => app.rentHistory?.payingRent === true,
      docs: [
        createDoc('LANDLORD_VOR_12M', 'Landlord verification of rent - 12 months', ['R-OCC-01']),
      ],
      conditional: true,
    },
    {
      id: 'R-OCC-02',
      title: 'Living rent-free requires explanation',
      when: (app) => app.rentHistory?.method === 'LivingRentFree',
      docs: [
        createDoc('LOE_RENT_FREE', 'Explain rent-free living arrangement', ['R-OCC-02']),
      ],
    },
  ];
}

/**
 * Merge documents by ID, keeping the strictest requirement
 */
function mergeDocuments(docs: DocRequest[]): DocRequest[] {
  const docMap = new Map<string, DocRequest>();

  for (const doc of docs) {
    const existing = docMap.get(doc.id);
    
    if (!existing) {
      docMap.set(doc.id, doc);
    } else {
      // Merge rule hits
      const mergedRuleHits = [...new Set([...existing.ruleHits, ...doc.ruleHits])];
      
      // Keep the more conservative (non-conditional) version
      const conditional = existing.conditional && doc.conditional;
      
      // Merge reasons
      const reason = existing.reason === doc.reason ? existing.reason : 
                    `${existing.reason}; ${doc.reason}`;

      docMap.set(doc.id, {
        ...existing,
        ruleHits: mergedRuleHits,
        conditional,
        reason,
      });
    }
  }

  return Array.from(docMap.values());
}

/**
 * Validate application and generate clarifications
 */
function validateApplication(app: LoanApplication): string[] {
  const clarifications: string[] = [];

  if (!app.program) {
    clarifications.push('Loan program must be specified');
  }

  if (!app.employmentType) {
    clarifications.push('Employment type must be specified');
  }

  if (app.employmentType === 'SelfEmployed' && !app.selfEmployed) {
    clarifications.push('Self-employed borrowers must provide business details');
  }

  if (app.employmentType === 'SelfEmployed' && app.selfEmployed && !app.selfEmployed.businessStartDate) {
    clarifications.push('Business start date required for self-employed borrowers');
  }

  if (app.program === 'USDA' && !app.usda) {
    clarifications.push('USDA applications require household member information');
  }

  if (app.program === 'VA' && !app.va) {
    clarifications.push('VA applications should specify service details');
  }

  return clarifications;
}

/**
 * Generate document checklist for a loan application
 */
export function generateDocChecklist(
  app: LoanApplication,
  overlays: Partial<Overlays> = {}
): DocChecklistResult {
  const mergedOverlays = { ...DEFAULT_OVERLAYS, ...overlays };
  const context: RuleContext = { app, overlays: mergedOverlays };

  // Validate application
  const clarifications = validateApplication(app);

  // Define and evaluate rules
  const rules = defineRules(context);
  const allDocs: DocRequest[] = [];

  for (const rule of rules) {
    if (rule.when(app)) {
      const docs = typeof rule.docs === 'function' ? rule.docs(app) : rule.docs;
      allDocs.push(...docs);
    }
  }

  // Merge and deduplicate documents
  const mergedDocs = mergeDocuments(allDocs);

  // Separate required from nice-to-have (conditional)
  const required = mergedDocs.filter(doc => !doc.conditional);
  const niceToHave = mergedDocs.filter(doc => doc.conditional);

  // Sort by category
  const sortOrder = ['GOVT_ID', 'SSN_VERIFICATION', 'GREEN_CARD_EAD', 'NAME_CHANGE_DOCS'];
  const sortedRequired = required.sort((a, b) => {
    const aIndex = sortOrder.indexOf(a.id);
    const bIndex = sortOrder.indexOf(b.id);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.label.localeCompare(b.label);
  });

  return {
    required: sortedRequired,
    niceToHave,
    clarifications,
  };
}

/**
 * Generate human-readable explanations for rule hits
 */
export function explain(app: LoanApplication): string[] {
  const result = generateDocChecklist(app);
  const explanations: string[] = [];

  for (const doc of result.required) {
    for (const ruleId of doc.ruleHits) {
      explanations.push(`${ruleId}: ${doc.reason}`);
    }
  }

  return [...new Set(explanations)]; // Deduplicate
}

/**
 * Get document label by ID
 */
export { getDocumentLabel };








