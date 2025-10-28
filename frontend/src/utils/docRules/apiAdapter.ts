/**
 * API Adapter - Converts backend LoanApplication payload to rules engine LoanApplication
 */

import { LoanApplication, IncomeType } from './types';

/** Map backend strings to rules engine enums with safe defaults */
function mapProgram(loanType?: string): LoanApplication['program'] {
  switch ((loanType || '').toUpperCase()) {
    case 'FHA': return 'FHA';
    case 'VA': return 'VA';
    case 'USDA': return 'USDA';
    default: return 'Conventional';
  }
}

function mapTransactionType(loanPurpose?: string): LoanApplication['transactionType'] {
  const v = (loanPurpose || '').toLowerCase();
  if (v.includes('cash')) return 'CashOutRefi';
  if (v.includes('refi')) return 'RateTermRefi';
  return 'Purchase';
}

function mapOccupancy(propertyType?: string): LoanApplication['occupancy'] {
  // Backend Property.propertyType stores occupancy concept: PrimaryResidence|SecondHome|Investment
  switch (propertyType) {
    case 'SecondHome': return 'SecondHome';
    case 'Investment': return 'Investment';
    default: return 'Primary';
  }
}

function mapPropertyType(_: any): LoanApplication['propertyType'] {
  // Backend does not provide structural type (SFR/Condo/etc.) distinctly; default to SFR
  return 'SFR';
}

function mapEmploymentType(borrower: any): LoanApplication['employmentType'] {
  const current = (borrower?.employmentHistory || []).find((e: any) => e.employmentStatus === 'Present');
  if (!current) return 'W2';
  if (current.selfEmployed === true) return 'SelfEmployed';
  return 'W2';
}

function mapBusinessType(_: any): LoanApplication['selfEmployed']['businessType'] {
  // No explicit entity type in backend Employment; assume SoleProp unless borrower indicates otherwise in future
  return 'SoleProp';
}

function mapIncomeTypeFromSource(type: string): IncomeType {
  switch (type) {
    case 'Rental': return 'Rental';
    case 'SocialSecurity': return 'SocialSecurity';
    case 'Pension': return 'Pension';
    case 'Disability': return 'Disability';
    case 'Unemployment': return 'Other';
    case 'ChildSupport': return 'ChildSupportReceived';
    case 'Alimony': return 'AlimonyReceived';
    case 'Investment': return 'Other';
    default: return 'Other';
  }
}

export function adaptApiToLoanApplication(api: any): LoanApplication {
  const firstBorrower = (api.borrowers || [])[0] || {};

  const currentEmployment = (firstBorrower.employmentHistory || []).find((e: any) => e.employmentStatus === 'Present');

  const employmentType = mapEmploymentType(firstBorrower);

  const incomes: LoanApplication['incomes'] = [];
  if (currentEmployment?.monthlyIncome) {
    incomes.push({
      type: currentEmployment?.selfEmployed ? 'SelfEmployment' : 'BasePay',
      monthlyAmount: Number(currentEmployment.monthlyIncome) || 0,
      startDate: currentEmployment.startDate,
      expectedToContinue: true,
    });
  }
  for (const src of firstBorrower.incomeSources || []) {
    incomes.push({
      type: mapIncomeTypeFromSource(src.incomeType),
      monthlyAmount: Number(src.monthlyAmount) || 0,
    });
  }

  const assets: LoanApplication['assets'] = (firstBorrower.assets || []).map((a: any) => ({
    type: ((): LoanApplication['assets'][0]['type'] => {
      switch (a.assetType) {
        case 'Checking': return 'Checking';
        case 'Savings': return 'Savings';
        case 'MutualFunds':
        case 'Stocks':
        case 'Bonds': return 'Brokerage';
        case 'Retirement401k':
        case 'IRA':
        case 'Pension': return 'Retirement';
        default: return 'Other';
      }
    })(),
    balance: Number(a.assetValue) || 0,
    accountTitle: a.bankName,
  }));

  const app: LoanApplication = {
    program: mapProgram(api.loanType),
    transactionType: mapTransactionType(api.loanPurpose),
    occupancy: mapOccupancy(api.property?.propertyType),
    propertyType: mapPropertyType(api.property),
    purchasePrice: api.propertyValue ? Number(api.propertyValue) : undefined,
    loanAmount: api.loanAmount ? Number(api.loanAmount) : undefined,
    maritalStatus: (firstBorrower.maritalStatus || 'Single') as LoanApplication['maritalStatus'],
    employmentType,
    employerName: currentEmployment?.employerName,
    startDate: currentEmployment?.startDate,
    yearsInLineOfWork: undefined,
    selfEmployed: employmentType === 'SelfEmployed' && currentEmployment ? {
      businessType: mapBusinessType(currentEmployment),
      businessStartDate: currentEmployment.startDate,
      ownershipPercent: 100,
      usesBusinessFundsForClose: false,
      businessHasDecliningIncome: false,
    } : null,
    incomes,
    assets,
    paysAlimony: firstBorrower?.declaration?.alimonyChildSupport === true,
    paysChildSupport: firstBorrower?.declaration?.alimonyChildSupport === true,
    receivesChildOrAlimony: false,
    isCondo: false,
    nameVariations: undefined,
    largeDepositsPresent: false,
    creditInquiriesLast90Days: firstBorrower?.declaration?.pendingCreditInquiry === true,
    rentHistory: null,
    va: null,
    usda: null,
  };

  return app;
}


