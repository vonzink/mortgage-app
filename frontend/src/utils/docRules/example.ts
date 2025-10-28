/**
 * Document Rules Engine - Usage Examples
 * 
 * This file demonstrates how to use the document rules engine
 * in various scenarios
 */

import { generateDocChecklist, explain } from './docRules';
import { LoanApplication } from './types';

// ===== Example 1: Basic Usage =====
export function example1() {
  const application: LoanApplication = {
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

  const result = generateDocChecklist(application);
  
  console.log('Required Documents:', result.required.length);
  console.log('Optional Documents:', result.niceToHave.length);
  console.log('Clarifications:', result.clarifications.length);
  
  return result;
}

// ===== Example 2: With Custom Overlays =====
export function example2() {
  const application: LoanApplication = {
    program: 'FHA',
    transactionType: 'Purchase',
    occupancy: 'Primary',
    propertyType: 'SFR',
    employmentType: 'W2',
    maritalStatus: 'Married',
    incomes: [{ type: 'BasePay', monthlyAmount: 6000 }],
    assets: [{ type: 'Checking', balance: 25000 }],
  };

  const overlays = {
    defaultBusinessReturnsYears: 2,
    minBankStmtMonths: 3, // Require 3 months instead of 2
    studentLoanImputeRule: '1pct' as const,
    alwaysRequire2YearsSelfEmployed: true,
    requireCondoDocs: true,
  };

  const result = generateDocChecklist(application, overlays);
  
  return result;
}

// ===== Example 3: Getting Explanations =====
export function example3() {
  const application: LoanApplication = {
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

  const explanations = explain(application);
  
  console.log('Rule Explanations:');
  explanations.forEach(exp => console.log(`  - ${exp}`));
  
  return explanations;
}

// ===== Example 4: Complex Scenario =====
export function example4() {
  const application: LoanApplication = {
    program: 'Conventional',
    transactionType: 'Purchase',
    occupancy: 'Primary',
    propertyType: 'Condo',
    employmentType: 'SelfEmployed',
    selfEmployed: {
      businessType: 'SCorp',
      businessStartDate: '2021-03-15',
      ownershipPercent: 75,
      usesBusinessFundsForClose: true,
      businessHasDecliningIncome: false,
    },
    maritalStatus: 'Divorced',
    paysAlimony: true,
    downPaymentSource: ['Gift', 'OwnFunds'],
    largeDepositsPresent: true,
    nameVariations: ['John Smith', 'John A. Smith', 'J. A. Smith'],
    creditInquiriesLast90Days: true,
    incomes: [
      { type: 'SelfEmployment', monthlyAmount: 15000 },
      { type: 'Rental', monthlyAmount: 2000 },
    ],
    assets: [
      { type: 'Checking', balance: 50000 },
      { type: 'Brokerage', balance: 75000 },
    ],
    bkHistory: {
      chapter: '7',
      dischargeDate: '2018-06-01',
    },
  };

  const result = generateDocChecklist(application);
  
  // Group documents by category
  const grouped = {
    identity: result.required.filter(d => d.id.includes('GOVT_ID') || d.id.includes('SSN')),
    income: result.required.filter(d => d.id.includes('TAX') || d.id.includes('PAYSTUB') || d.id.includes('W2')),
    assets: result.required.filter(d => d.id.includes('BANK') || d.id.includes('GIFT') || d.id.includes('BROKERAGE')),
    legal: result.required.filter(d => d.id.includes('DIVORCE') || d.id.includes('BK') || d.id.includes('SUPPORT')),
    property: result.required.filter(d => d.id.includes('PURCHASE') || d.id.includes('CONDO')),
  };
  
  console.log('Documents by Category:');
  console.log('  Identity:', grouped.identity.length);
  console.log('  Income:', grouped.income.length);
  console.log('  Assets:', grouped.assets.length);
  console.log('  Legal:', grouped.legal.length);
  console.log('  Property:', grouped.property.length);
  
  return { result, grouped };
}

// ===== Example 5: Integration with Form State =====
export function example5(formData: any) {
  // Convert form data to LoanApplication format
  const application: LoanApplication = {
    program: formData.program || 'Conventional',
    transactionType: formData.transactionType || 'Purchase',
    occupancy: formData.occupancy || 'Primary',
    propertyType: formData.propertyType || 'SFR',
    employmentType: formData.employmentType || 'W2',
    maritalStatus: formData.maritalStatus || 'Single',
    incomes: formData.incomes || [],
    assets: formData.assets || [],
    // Add other fields as needed
  };

  const result = generateDocChecklist(application);
  
  // Return formatted for UI display
  return {
    requiredCount: result.required.length,
    optionalCount: result.niceToHave.length,
    clarificationsCount: result.clarifications.length,
    documents: result.required,
    optional: result.niceToHave,
    needsClarification: result.clarifications.length > 0,
  };
}

// ===== Example 6: Validation Before Submission =====
export function example6(application: LoanApplication) {
  const result = generateDocChecklist(application);
  
  // Check if application is ready for submission
  const isReady = result.clarifications.length === 0;
  
  if (!isReady) {
    console.warn('Application needs clarification:');
    result.clarifications.forEach(clar => console.warn(`  - ${clar}`));
  }
  
  return {
    isReady,
    clarifications: result.clarifications,
    requiredDocs: result.required.length,
    optionalDocs: result.niceToHave.length,
  };
}

// ===== Example 7: Document Tracking =====
export function example7(application: LoanApplication, uploadedDocs: string[]) {
  const result = generateDocChecklist(application);
  
  // Track which documents have been uploaded
  const tracking = result.required.map(doc => ({
    ...doc,
    uploaded: uploadedDocs.includes(doc.id),
    status: uploadedDocs.includes(doc.id) ? 'complete' : 'pending',
  }));
  
  const complete = tracking.filter(t => t.uploaded).length;
  const pending = tracking.filter(t => !t.uploaded).length;
  const percentComplete = Math.round((complete / tracking.length) * 100);
  
  return {
    tracking,
    complete,
    pending,
    percentComplete,
    isComplete: pending === 0,
  };
}








