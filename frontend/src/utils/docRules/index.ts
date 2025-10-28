/**
 * Document Rules Engine - Main Entry Point
 * 
 * Exports all public APIs for the mortgage document rules engine
 */

export { generateDocChecklist, explain, getDocumentLabel } from './docRules';
export { getDocumentLabel as getDocLabel, isValidDocumentId } from './documentCatalog';
export type {
  LoanApplication,
  DocRequest,
  DocChecklistResult,
  Rule,
  Overlays,
  RuleContext,
  LoanProgram,
  Occupancy,
  PropertyType,
  TransactionType,
  EmploymentType,
  BusinessType,
  MaritalStatus,
  IncomeType,
} from './types';

export { DOCUMENT_CATALOG } from './documentCatalog';








