# Mortgage Document Rules Engine

A deterministic, explainable rules engine for generating borrower document checklists based on loan application details. Supports Conventional, FHA, VA, and USDA loan programs.

## Overview

The Document Rules Engine analyzes loan application data and generates a comprehensive list of required documents based on program-specific rules, borrower characteristics, and transaction details. It provides:

- **Deterministic output**: Same input always produces same output
- **Explainable decisions**: Every document includes the rule ID and reason
- **Compositional rules**: Rules compose and merge intelligently
- **Program-specific logic**: Handles Conventional, FHA, VA, and USDA requirements
- **Edge case handling**: Gracefully handles missing or ambiguous data

## Installation

```typescript
import { generateDocChecklist, explain } from './utils/docRules/docRules';
import { LoanApplication } from './utils/docRules/types';
```

## Quick Start

```typescript
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

// Generate document checklist
const result = generateDocChecklist(application);

// Get human-readable explanations
const explanations = explain(application);
```

## Core Concepts

### Rule Precedence

Rules are evaluated in the following order of precedence:

1. **Program-specific rules** (e.g., VA COE, USDA household income)
2. **Agency-agnostic rules** (e.g., employment verification, asset documentation)
3. **Lender overlays** (configurable additional requirements)
4. **Generic requirements** (e.g., government ID, SSN verification)

### Conservatism Principle

When rules conflict, the engine chooses the more conservative (stricter) requirement:

- If one rule requires 1 year of tax returns and another requires 2 years → 2 years wins
- If one rule marks a document as conditional and another as required → required wins

### Document Merging

Documents with the same ID are automatically merged:

- Rule hits are combined (all triggering rules are tracked)
- The strictest requirement is preserved
- Reasons are concatenated if different

## Rule Catalog

### Global / Identity Rules

| Rule ID | Title | Trigger |
|---------|-------|---------|
| R-G-01 | Government ID and SSN | Always |
| R-G-02 | Name variations | `nameVariations` present |
| R-G-03 | Credit inquiries | `creditInquiriesLast90Days === true` |
| R-G-04 | Large deposits | `largeDepositsPresent === true` |
| R-G-05 | Immigration docs | Non-US citizens |

### Employment & Income Rules

| Rule ID | Title | Trigger |
|---------|-------|---------|
| R-E-01 | W2 employment docs | `employmentType === 'W2'` |
| R-E-02 | Employment gaps | Gaps detected in history |

### Self-Employed Rules

| Rule ID | Title | Logic |
|---------|-------|-------|
| **R-SE-01** | Tax return years | **See detailed logic below** |
| R-SE-02 | K-1 requirements | Ownership ≥25% |
| R-SE-03 | Business funds | `usesBusinessFundsForClose === true` |
| R-SE-04 | YTD statements | Always for self-employed |
| R-SE-05 | Declining income | 2 years regardless of program |
| R-SE-06 | Business license | Always for self-employed |

#### R-SE-01: Tax Return Years Logic

This is the most complex rule with specific business logic:

```
IF businessType IN ["LLC", "SCorp", "CCorp", "Partnership"]
  AND yearsInBusiness < 5
  THEN:
    - Conventional → 1 year returns
    - FHA/VA → 2 years returns
ELSE
  - Use overlay default (typically 2 years)
```

**Examples:**

- **Conventional + LLC + 3 years in business** → 1 year returns
- **FHA + S-Corp + 2 years in business** → 2 years returns
- **Conventional + Sole Prop + 3 years** → 2 years (default overlay)
- **VA + LLC + 6 years in business** → 2 years (default overlay)

### Alimony / Child Support Rules

| Rule ID | Title | Trigger |
|---------|-------|---------|
| R-FAM-01 | Receiving support | `receivesChildOrAlimony === true` |
| R-FAM-02 | Paying support | `paysAlimony` or `paysChildSupport` |
| R-FAM-03 | Divorce decree | `maritalStatus === 'Divorced'` |
| R-FAM-04 | Support as asset | `supportOrderDocsClaimedInAssets === true` |

### Government Program Rules

| Rule ID | Program | Title |
|---------|---------|-------|
| R-VA-01 | VA | COE and service documentation |
| R-USDA-01 | USDA | Household income for all occupants |
| R-FHA-01 | FHA | CAIVRS check (conditional) |

### Property / Transaction Rules

| Rule ID | Title | Trigger |
|---------|-------|---------|
| R-PR-01 | Purchase contract | `transactionType === 'Purchase'` |
| R-PR-02 | Condo docs | `propertyType === 'Condo'` |
| R-PR-03 | Trust vesting | Trust vesting detected |
| R-PR-04 | Homeowners insurance | Always |

### Credit Event Rules

| Rule ID | Title | Trigger |
|---------|-------|---------|
| R-CR-01 | Bankruptcy | `bkHistory` present |
| R-CR-02 | Foreclosure | `foreclosureHistoryDate` present |
| R-CR-03 | Mortgage lates | `mortgageLatesIn12Mo > 0` |

## Configuration

### Overlays

Customize default behavior with overlays:

```typescript
const overlays = {
  defaultBusinessReturnsYears: 2,    // Default years for business returns
  minBankStmtMonths: 2,               // Minimum months of bank statements
  studentLoanImputeRule: 'programDefault',  // Student loan payment calculation
  alwaysRequire2YearsSelfEmployed: false,   // Force 2 years for all self-employed
  requireCondoDocs: true,             // Always require condo docs
};

const result = generateDocChecklist(application, overlays);
```

## API Reference

### `generateDocChecklist(app, overlays?)`

Generates a document checklist for a loan application.

**Parameters:**
- `app: LoanApplication` - The loan application data
- `overlays?: Partial<Overlays>` - Optional configuration overrides

**Returns:**
```typescript
{
  required: DocRequest[];      // Required documents
  niceToHave: DocRequest[];    // Optional/conditional documents
  clarifications: string[];    // Questions to clarify
}
```

**Example:**
```typescript
const result = generateDocChecklist(application);

console.log(`Required: ${result.required.length} documents`);
console.log(`Optional: ${result.niceToHave.length} documents`);
console.log(`Clarifications: ${result.clarifications.length} items`);
```

### `explain(app)`

Generates human-readable explanations for all rule hits.

**Parameters:**
- `app: LoanApplication` - The loan application data

**Returns:**
```typescript
string[]  // Array of explanation strings
```

**Example:**
```typescript
const explanations = explain(application);
// [
//   "R-G-01: Required for all borrowers",
//   "R-SE-01: Self-employed LLC <5y → 1 year returns (Conventional)",
//   "R-SE-04: Year-to-date profit & loss",
//   ...
// ]
```

## Document Types

### DocRequest Structure

```typescript
interface DocRequest {
  id: string;              // Stable document identifier
  label: string;           // Human-readable name
  programScope?: LoanProgram[];  // Program-specific (if applicable)
  conditional?: boolean;   // True if depends on clarification
  reason: string;          // Explanation
  ruleHits: string[];      // Rule IDs that triggered this doc
  strictness?: number;     // Strictness score (0-100)
}
```

### Document Categories

Documents are organized into categories:

1. **Identity & Basics** - ID, SSN, immigration docs
2. **Employment & Income** - Paystubs, W-2s, tax returns
3. **Assets & Reserves** - Bank statements, gift letters
4. **Liabilities & Legal** - Court orders, bankruptcy docs
5. **Property & Transaction** - Purchase contract, condo docs
6. **Program-Specific** - VA COE, USDA household income

## Test Cases

The engine includes comprehensive test coverage for:

- ✅ Conventional self-employed LLC <5y (1 year returns)
- ✅ FHA self-employed LLC <5y (2 years returns)
- ✅ VA with divorce and child support
- ✅ USDA with non-borrower household income
- ✅ Purchase with gift funds and large deposits
- ✅ Self-employed using business funds
- ✅ Crypto liquidation
- ✅ Name variations
- ✅ Credit inquiries
- ✅ Rental income
- ✅ Paying alimony/child support
- ✅ Bankruptcy history
- ✅ Foreclosure history
- ✅ Mortgage lates
- ✅ Living rent-free

## Extending the Engine

### Adding New Rules

1. Define the rule in `defineRules()`:

```typescript
{
  id: 'R-NEW-01',
  title: 'Your new rule title',
  when: (app) => {
    // Your condition logic
    return app.someField === 'someValue';
  },
  docs: [
    createDoc('DOCUMENT_ID', 'Reason for this document', ['R-NEW-01']),
  ],
}
```

2. Add the document to the catalog in `documentCatalog.ts`:

```typescript
export const DOCUMENT_CATALOG: Record<string, string> = {
  // ... existing docs
  DOCUMENT_ID: 'Human-readable document name',
};
```

3. Add test cases in `docRules.spec.ts`

### Adding New Document Types

1. Update the `LoanApplication` interface in `types.ts`
2. Create rules that reference the new fields
3. Add corresponding test cases

## Best Practices

### Rule Design

- **Keep rules atomic**: One rule should check one condition
- **Use descriptive IDs**: Follow the pattern `R-CATEGORY-##`
- **Provide clear reasons**: Users should understand why a doc is required
- **Handle edge cases**: Consider missing or ambiguous data

### Testing

- **Test each rule independently**: Verify the rule triggers correctly
- **Test rule combinations**: Ensure rules compose properly
- **Test edge cases**: Missing data, boundary conditions
- **Test program differences**: Ensure program-specific logic works

### Performance

- Rules are evaluated in sequence, but the engine is fast enough for real-time use
- Document merging is O(n) where n is the number of rules
- Typical applications generate 20-40 documents in <10ms

## Troubleshooting

### Documents Not Appearing

1. Check if the rule's `when()` condition is met
2. Verify the document ID exists in the catalog
3. Check if the document was merged with another (same ID)
4. Review the `ruleHits` array to see which rules triggered

### Unexpected Documents

1. Review the rule's `when()` condition
2. Check if multiple rules are triggering the same document
3. Verify program-specific logic is correct
4. Use `explain()` to see which rules are firing

### Validation Errors

1. Check `result.clarifications` for missing required fields
2. Ensure all required fields are populated in the application
3. Review the validation logic in `validateApplication()`

## Contributing

When adding new rules:

1. Follow the existing rule ID pattern
2. Add comprehensive test cases
3. Update this documentation
4. Ensure backward compatibility
5. Test with all four loan programs

## License

Internal use only - Mortgage Application System

## Support

For questions or issues, contact the development team or review the test cases for examples.


