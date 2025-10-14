/**
 * Document Catalog - Canonical mapping of document IDs to human-readable labels
 */

export const DOCUMENT_CATALOG: Record<string, string> = {
  // Identity & Basics
  GOVT_ID: "Government-issued photo ID (Driver's License or Passport)",
  SSN_VERIFICATION: "Social Security Card or SSN Verification",
  GREEN_CARD_EAD: "Green Card or Employment Authorization Document (EAD)",
  NAME_CHANGE_DOCS: "Name change documentation (marriage certificate, court order, etc.)",
  
  // Letters of Explanation
  LOE_GAPS_EMPLOYMENT: "Letter of Explanation - Employment Gaps",
  LOE_CREDIT_INQUIRIES: "Letter of Explanation - Recent Credit Inquiries",
  LOE_LARGE_DEPOSITS: "Letter of Explanation - Large Deposits",
  LOE_ALT_NAMES: "Letter of Explanation - Alternate Names",
  LOE_MORTGAGE_LATES: "Letter of Explanation - Mortgage Payment History",
  LOE_RENT_FREE: "Letter of Explanation - Rent-Free Living Arrangement",
  
  // Income - Employment (W2)
  PAYSTUB_30D: "Paystub - Most Recent 30 Days",
  W2_LAST2Y: "W-2 Forms - Last 2 Years",
  VOE: "Verification of Employment (VOE) - Written or Electronic",
  
  // Income - Self-Employed
  TAX_RETURN_PERSONAL_1040_YEARS_1: "Personal Tax Return (1040) - Most Recent Year",
  TAX_RETURN_PERSONAL_1040_YEARS_2: "Personal Tax Return (1040) - Last 2 Years",
  TAX_RETURN_BUSINESS_1120S_YEARS_1: "Business Tax Return (1120S) - Most Recent Year",
  TAX_RETURN_BUSINESS_1120S_YEARS_2: "Business Tax Return (1120S) - Last 2 Years",
  TAX_RETURN_BUSINESS_1065_YEARS_1: "Business Tax Return (1065) - Most Recent Year",
  TAX_RETURN_BUSINESS_1065_YEARS_2: "Business Tax Return (1065) - Last 2 Years",
  TAX_RETURN_BUSINESS_1120_YEARS_1: "Business Tax Return (1120) - Most Recent Year",
  TAX_RETURN_BUSINESS_1120_YEARS_2: "Business Tax Return (1120) - Last 2 Years",
  TAX_RETURN_BUSINESS_SCHEDULEC_YEARS_1: "Business Tax Return (Schedule C) - Most Recent Year",
  TAX_RETURN_BUSINESS_SCHEDULEC_YEARS_2: "Business Tax Return (Schedule C) - Last 2 Years",
  K1_LAST2Y: "K-1 Forms - Last 2 Years",
  YTD_PNL: "Year-to-Date Profit & Loss Statement",
  YTD_BALANCE_SHEET: "Year-to-Date Balance Sheet",
  CPA_LETTER_OR_LICENSE: "CPA Letter or Business License",
  BUSINESS_LICENSE_OR_WEBSITE_PROOF: "Business License or Website Proof",
  BUSINESS_BANK_STATEMENTS_2_12M: "Business Bank Statements - 2 to 12 Months",
  
  // Income - 1099 / Commission / Bonus
  FORM1099_LAST2Y: "1099 Forms - Last 2 Years",
  BONUS_COMMISSION_HISTORY: "Bonus/Commission History - Last 2 Years",
  
  // Income - Other
  RENTAL_LEASES: "Rental Property Leases",
  RENTAL_SCHEDULE_E_LAST2Y: "Schedule E - Rental Income - Last 2 Years",
  ALIMONY_CHILD_SUPPORT_PROOF: "Proof of Alimony/Child Support Receipt",
  PENSION_AWARD: "Pension Award Letter",
  SSA_AWARD: "Social Security Award Letter",
  DISABILITY_AWARD: "Disability Award Letter",
  
  // Assets / Reserves
  BANK_STMTS_2M: "Bank Statements - Last 2 Months",
  BROKERAGE_STMTS_2M: "Brokerage Statements - Last 2 Months",
  RETIREMENT_STMTS_2M: "Retirement Account Statements - Last 2 Months",
  GIFT_LETTER: "Gift Letter (Fannie Mae Form)",
  GIFT_FUNDS_PROOF_OF_TRANSFER: "Proof of Gift Funds Transfer",
  DONOR_ASSET_EVIDENCE: "Donor Asset Evidence",
  EARNEST_MONEY_PROOF: "Earnest Money Deposit Proof",
  SALE_OF_ASSET_BILL_OF_SALE: "Bill of Sale for Asset Sale",
  CRYPTO_LIQUIDATION_PROOF: "Cryptocurrency Liquidation Proof & Paper Trail",
  SOURCE_LARGE_DEPOSITS: "Source Documentation for Large Deposits",
  
  // Liabilities & Legal
  DIVORCE_DECREE: "Divorce Decree (all pages, including support terms)",
  SEPARATION_AGREEMENT: "Separation Agreement",
  ALIMONY_CHILD_SUPPORT_ORDER: "Alimony/Child Support Court Order",
  BK_PAPERS_DISCHARGE: "Bankruptcy Papers & Discharge Documentation",
  FORECLOSURE_DOCS: "Foreclosure Documentation",
  STUDENT_LOAN_DOCS: "Student Loan Payment/Forbearance Documentation",
  
  // Property & Transaction
  PURCHASE_CONTRACT: "Purchase Contract",
  ADDENDA: "Contract Addenda",
  HOMEOWNERS_INSURANCE_QUOTE: "Homeowner's Insurance Quote",
  CONDO_DOCS_BUDGET_MINUTES_INSURANCE: "Condo Docs - Budget, Minutes, Insurance",
  LANDLORD_VOR_12M: "Landlord Verification of Rent - 12 Months",
  TITLE_TRUST_DOCS: "Title/Trust Documentation",
  OCCUPANCY_LETTER: "Occupancy Letter",
  
  // Government Program Specifics
  USDA_HOUSEHOLD_INCOME_DOCS: "USDA Household Income Documentation (all occupants)",
  VA_COE: "VA Certificate of Eligibility (COE)",
  DD214: "DD-214 (Military Discharge Papers)",
  VA_DISABILITY_AWARD: "VA Disability Award Letter",
};

/**
 * Helper function to get document label by ID
 */
export function getDocumentLabel(docId: string): string {
  return DOCUMENT_CATALOG[docId] || docId;
}

/**
 * Helper function to check if document exists in catalog
 */
export function isValidDocumentId(docId: string): boolean {
  return docId in DOCUMENT_CATALOG;
}


