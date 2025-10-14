/**
 * Form Adapter - Converts form data to LoanApplication format
 * 
 * This utility adapts your existing form structure to work with the document rules engine
 */

import { LoanApplication } from './types';

/**
 * Convert form data from your application form to LoanApplication format
 */
export function adaptFormToLoanApplication(formData: any): LoanApplication {
  const application: LoanApplication = {
    program: formData.program || 'Conventional',
    transactionType: formData.transactionType || 'Purchase',
    occupancy: formData.occupancy || 'Primary',
    propertyType: formData.propertyType || 'SFR',
    maritalStatus: formData.borrowers?.[0]?.maritalStatus || 'Single',
    employmentType: determineEmploymentType(formData),
    
    // Employment details
    employerName: formData.borrowers?.[0]?.employmentHistory?.[0]?.employerName,
    startDate: formData.borrowers?.[0]?.employmentHistory?.[0]?.startDate,
    yearsInLineOfWork: calculateYearsInLineOfWork(formData),
    
    // Self-employed details
    selfEmployed: extractSelfEmployedData(formData),
    
    // Incomes
    incomes: extractIncomes(formData),
    
    // Assets
    assets: extractAssets(formData),
    
    // Liabilities & support
    paysAlimony: formData.borrowers?.[0]?.declaration?.paysAlimony || false,
    paysChildSupport: formData.borrowers?.[0]?.declaration?.paysChildSupport || false,
    receivesChildOrAlimony: formData.borrowers?.[0]?.declaration?.receivesChildOrAlimony || false,
    
    // Property specifics
    isCondo: formData.propertyType === 'Condo',
    
    // Misc
    nameVariations: extractNameVariations(formData),
    largeDepositsPresent: formData.largeDepositsPresent || false,
    creditInquiriesLast90Days: formData.creditInquiriesLast90Days || false,
    
    // Down payment source
    downPaymentSource: formData.downPaymentSource || [],
    
    // Credit history
    bkHistory: formData.borrowers?.[0]?.declaration?.declaredBankruptcySevenYears ? {
      chapter: '7', // Default, should be extracted from form
      dischargeDate: formData.borrowers?.[0]?.declaration?.bankruptcyDate || '',
    } : null,
    
    foreclosureHistoryDate: formData.borrowers?.[0]?.declaration?.propertyForeclosedSevenYears ? 
      formData.borrowers?.[0]?.declaration?.foreclosureDate : null,
    
    mortgageLatesIn12Mo: formData.borrowers?.[0]?.declaration?.mortgageLates || 0,
    
    // Citizenship
    isUSCitizen: formData.borrowers?.[0]?.citizenshipType === 'USCitizen',
    isPermanentResident: formData.borrowers?.[0]?.citizenshipType === 'PermanentResident',
    hasITIN: formData.borrowers?.[0]?.citizenshipType === 'ITIN',
    
    // Rent history
    rentHistory: extractRentHistory(formData),
    
    // Government program specifics
    va: extractVAData(formData),
    usda: extractUSDAData(formData),
  };
  
  return application;
}

/**
 * Determine employment type from form data
 */
function determineEmploymentType(formData: any): LoanApplication['employmentType'] {
  const employment = formData.borrowers?.[0]?.employmentHistory?.[0];
  
  if (!employment) return 'W2';
  
  if (employment.selfEmployed) {
    return 'SelfEmployed';
  }
  
  return 'W2';
}

/**
 * Calculate years in line of work
 */
function calculateYearsInLineOfWork(formData: any): number | undefined {
  const startDate = formData.borrowers?.[0]?.employmentHistory?.[0]?.startDate;
  if (!startDate) return undefined;
  
  const start = new Date(startDate);
  const now = new Date();
  const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  
  return Math.floor(years);
}

/**
 * Extract self-employed data
 */
function extractSelfEmployedData(formData: any): LoanApplication['selfEmployed'] {
  const employment = formData.borrowers?.[0]?.employmentHistory?.[0];
  
  if (!employment?.selfEmployed) return null;
  
  // Map business type from form to rules engine format
  const businessTypeMap: Record<string, LoanApplication['selfEmployed']['businessType']> = {
    'SoleProprietorship': 'SoleProp',
    'LLC': 'LLC',
    'SCorp': 'SCorp',
    'Corporation': 'CCorp',
    'Partnership': 'Partnership',
    'Other': 'SoleProp', // Default to SoleProp
  };
  
  return {
    businessType: businessTypeMap[employment.businessType] || 'SoleProp',
    businessStartDate: employment.startDate || new Date().toISOString(),
    ownershipPercent: employment.ownershipPercent || 100,
    usesBusinessFundsForClose: employment.usesBusinessFundsForClose || false,
    businessHasDecliningIncome: employment.businessHasDecliningIncome || false,
  };
}

/**
 * Extract incomes from form data
 */
function extractIncomes(formData: any): LoanApplication['incomes'] {
  const incomes: LoanApplication['incomes'] = [];
  
  // Employment income
  const employment = formData.borrowers?.[0]?.employmentHistory?.[0];
  if (employment?.monthlyIncome) {
    incomes.push({
      type: employment.selfEmployed ? 'SelfEmployment' : 'BasePay',
      monthlyAmount: employment.monthlyIncome,
      startDate: employment.startDate,
      expectedToContinue: employment.employmentStatus === 'Present',
    });
  }
  
  // Additional income sources
  const incomeSources = formData.borrowers?.[0]?.incomeSources || [];
  incomeSources.forEach((source: any) => {
    incomes.push({
      type: mapIncomeType(source.incomeType),
      monthlyAmount: source.monthlyAmount || 0,
      startDate: source.startDate,
      expectedToContinue: source.expectedToContinue,
    });
  });
  
  // Support income
  const declaration = formData.borrowers?.[0]?.declaration;
  if (declaration?.receivesChildOrAlimony) {
    incomes.push({
      type: 'ChildSupportReceived',
      monthlyAmount: 0, // Should be extracted from form
      expectedToContinue: true,
    });
  }
  
  return incomes;
}

/**
 * Extract assets from form data
 */
function extractAssets(formData: any): LoanApplication['assets'] {
  const assets: LoanApplication['assets'] = [];
  
  const borrowerAssets = formData.borrowers?.[0]?.assets || [];
  borrowerAssets.forEach((asset: any) => {
    assets.push({
      type: asset.assetType || 'Checking',
      balance: asset.assetValue || 0,
      accountTitle: asset.owner,
    });
  });
  
  return assets;
}

/**
 * Extract name variations
 */
function extractNameVariations(formData: any): string[] | undefined {
  const variations: string[] = [];
  
  const borrower = formData.borrowers?.[0];
  if (borrower?.firstName && borrower?.lastName) {
    variations.push(`${borrower.firstName} ${borrower.lastName}`);
  }
  
  // Add any other variations if they exist in the form
  // This is a placeholder - adjust based on your actual form structure
  
  return variations.length > 0 ? variations : undefined;
}

/**
 * Extract rent history
 */
function extractRentHistory(formData: any): LoanApplication['rentHistory'] {
  const residence = formData.borrowers?.[0]?.residences?.[0];
  
  if (!residence) return null;
  
  return {
    payingRent: residence.residencyBasis === 'Rent',
    method: residence.residencyBasis === 'Rent' ? 'PrivateLandlord' : 
            residence.residencyBasis === 'LivingRentFree' ? 'LivingRentFree' : 
            undefined,
  };
}

/**
 * Extract VA data
 */
function extractVAData(formData: any): LoanApplication['va'] {
  if (formData.program !== 'VA') return null;
  
  return {
    priorUseOfEntitlement: false, // Should be extracted from form
    serviceType: 'Regular', // Should be extracted from form
  };
}

/**
 * Extract USDA data
 */
function extractUSDAData(formData: any): LoanApplication['usda'] {
  if (formData.program !== 'USDA') return null;
  
  return {
    householdMembers: 1, // Should be extracted from form
    nonBorrowerHouseholdIncome: 0, // Should be extracted from form
  };
}

/**
 * Map income type from form to LoanApplication format
 */
function mapIncomeType(incomeType: string): LoanApplication['incomes'][0]['type'] {
  const mapping: Record<string, LoanApplication['incomes'][0]['type']> = {
    'BasePay': 'BasePay',
    'Overtime': 'Overtime',
    'Bonus': 'Bonus',
    'Commission': 'Commission',
    'SelfEmployment': 'SelfEmployment',
    'Rental': 'Rental',
    'AlimonyReceived': 'AlimonyReceived',
    'ChildSupportReceived': 'ChildSupportReceived',
    'Pension': 'Pension',
    'SocialSecurity': 'SocialSecurity',
    'Disability': 'Disability',
    'VACompensation': 'VACompensation',
    'Other': 'Other',
  };
  
  return mapping[incomeType] || 'Other';
}

/**
 * Helper to check if form data is valid for document generation
 */
export function validateFormForDocumentGeneration(formData: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!formData.program) {
    errors.push('Loan program is required');
  }
  
  if (!formData.borrowers || formData.borrowers.length === 0) {
    errors.push('At least one borrower is required');
  }
  
  if (!formData.borrowers?.[0]?.employmentHistory || formData.borrowers[0].employmentHistory.length === 0) {
    errors.push('Employment history is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

