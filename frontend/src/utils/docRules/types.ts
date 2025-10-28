/**
 * Mortgage Document Rules Engine - Type Definitions
 * 
 * This module defines the core types for the document requirements engine
 * that generates borrower document checklists based on loan application details.
 */

export type LoanProgram = "Conventional" | "FHA" | "VA" | "USDA";
export type Occupancy = "Primary" | "SecondHome" | "Investment";
export type PropertyType = "SFR" | "Condo" | "PUD" | "2-4 Unit" | "Manufactured";
export type TransactionType = "Purchase" | "RateTermRefi" | "CashOutRefi";
export type EmploymentType = "W2" | "SelfEmployed" | "1099" | "Retired" | "Unemployed";
export type BusinessType = "SoleProp" | "LLC" | "SCorp" | "CCorp" | "Partnership";
export type MaritalStatus = "Single" | "Married" | "Separated" | "Divorced";
export type IncomeType =
  | "BasePay" | "Overtime" | "Bonus" | "Commission" | "SelfEmployment"
  | "Rental" | "AlimonyReceived" | "ChildSupportReceived" | "Pension"
  | "SocialSecurity" | "Disability" | "VACompensation" | "Other";

export interface LoanApplication {
  program: LoanProgram;
  transactionType: TransactionType;
  occupancy: Occupancy;
  propertyType: PropertyType;
  purchasePrice?: number;
  loanAmount?: number;
  downPaymentSource?: ("OwnFunds" | "Gift" | "Grant" | "Employer" | "SaleOfAsset" | "CryptoLiquidated" | "Other")[];
  isFirstTimeHomebuyer?: boolean;

  creditScore?: number;
  bkHistory?: { chapter: "7" | "13"; dischargeDate: string } | null;
  foreclosureHistoryDate?: string | null;
  mortgageLatesIn12Mo?: number;

  // Borrower profile
  maritalStatus: MaritalStatus;
  isUSCitizen?: boolean;
  isPermanentResident?: boolean;
  hasITIN?: boolean;

  // Employment
  employmentType: EmploymentType;
  employerName?: string;
  startDate?: string; // ISO
  yearsInLineOfWork?: number;

  // Self-employed details
  selfEmployed?: {
    businessType: BusinessType;
    businessStartDate: string; // ISO
    ownershipPercent: number;
    usesBusinessFundsForClose?: boolean;
    businessHasDecliningIncome?: boolean;
  } | null;

  // Income & assets
  incomes: { type: IncomeType; monthlyAmount: number; startDate?: string; expectedToContinue?: boolean }[];
  assets: { type: "Checking" | "Savings" | "Brokerage" | "Retirement" | "CashOnHand" | "Gift" | "Crypto" | "Other"; balance: number; accountTitle?: string }[];

  // Liabilities & support
  paysAlimony?: boolean;
  paysChildSupport?: boolean;
  receivesChildOrAlimony?: boolean;
  supportOrderDocsClaimedInAssets?: boolean;

  // Property specifics
  isCondo?: boolean;
  isNewConstruction?: boolean;

  // Misc
  nameVariations?: string[];
  largeDepositsPresent?: boolean;
  creditInquiriesLast90Days?: boolean;
  rentHistory?: { payingRent?: boolean; method?: "PrivateLandlord" | "PropertyManager" | "LivingRentFree" } | null;

  // Government program specifics
  va?: { priorUseOfEntitlement?: boolean; serviceType?: "Regular" | "Reserves" | "Guard" } | null;
  usda?: { householdMembers: number; nonBorrowerHouseholdIncome?: number } | null;
}

export interface DocRequest {
  id: string;
  label: string;
  programScope?: LoanProgram[];
  conditional?: boolean;
  reason: string;
  ruleHits: string[];
  strictness?: number;
}

export interface DocChecklistResult {
  required: DocRequest[];
  niceToHave: DocRequest[];
  clarifications: string[];
}

export interface Rule {
  id: string;
  title: string;
  when: (app: LoanApplication) => boolean;
  docs: DocRequest[] | ((app: LoanApplication) => DocRequest[]);
  strictness?: number;
  conditional?: boolean;
}

export interface Overlays {
  defaultBusinessReturnsYears: number;
  minBankStmtMonths: number;
  studentLoanImputeRule: "programDefault" | "1pct" | "0.5pct";
  alwaysRequire2YearsSelfEmployed?: boolean;
  requireCondoDocs?: boolean;
}

export interface RuleContext {
  overlays: Overlays;
  app: LoanApplication;
}








