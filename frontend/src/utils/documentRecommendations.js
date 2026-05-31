/**
 * Document Recommendations Logic
 * Based on MISMO 3.4 standards and loan application data.
 *
 * Static rule data lives in documentRecommendations.data.js.
 * This file contains the matching/filtering engine.
 */

import {
  PURCHASE_GENERAL_DOCS,
  REFINANCE_GENERAL_DOCS,
  BORROWER_ID_DOC,
  EMPLOYMENT_GAP_DOCS,
  EMPLOYMENT_OK_DOC,
  RESIDENCE_GAP_DOC,
  RESIDENCE_OK_DOC,
  PERMANENT_RESIDENT_DOC,
  NON_PERMANENT_RESIDENT_DOC,
  BANKRUPTCY_DOC,
  FORECLOSURE_DOC,
  OUTSTANDING_JUDGMENTS_DOC,
  W2_INCOME_DOCS,
  VARIABLE_INCOME_DOC,
  VARIABLE_INCOME_TYPES,
  SELF_EMPLOYED_BASE_DOCS,
  LLC_DOCS,
  SCORP_DOCS,
  CCORP_DOCS,
  PARTNERSHIP_DOCS,
  SELF_EMPLOYED_CONDITIONAL_DOC,
  RENTAL_INCOME_DOC,
  CREDIT_INQUIRY_DOC,
  ASSET_STATEMENT_DOC,
  NO_ASSETS_PURCHASE_DOC,
  NO_ASSETS_REFI_DOC,
  PAYOFF_LIABILITIES_DOC,
  REO_MORTGAGE_STATEMENT_DOC,
  REO_MORTGAGE_GENERIC_DOC,
  REO_INSURANCE_DOC,
  REO_TAX_DOC,
  REO_LEASE_DOC,
  REO_SCHEDULE_E_DOC,
  REO_INFERRED_DOCS,
  HELOC_DOC,
  REQUIRED_HISTORY_MONTHS,
} from './documentRecommendations.data';

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Interpolate {{key}} placeholders in a rule template.
 * Returns a new object with the `name` field resolved.
 */
const applyTemplate = (rule, vars) => ({
  ...rule,
  name: rule.name.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? ''),
});

/**
 * Apply a template to every rule in an array.
 */
const applyTemplates = (rules, vars) => rules.map(r => applyTemplate(r, vars));

/**
 * Helper to calculate months between two dates
 */
const monthsBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();

  if (end.getDate() < start.getDate()) {
    months--;
  }

  return Math.max(0, months);
};

// ── Main recommendation engine ───────────────────────────────────────

/**
 * Generate document recommendations based on loan application data
 */
export const generateDocumentRecommendations = (applicationData) => {
  const recommendations = {
    general: [],
    income: [],
    assets: [],
    credit: [],
  };

  const borrowers = applicationData.borrowers || [];
  const loanPurpose = (applicationData.loanPurpose || '').toLowerCase();
  const liabilities = applicationData.liabilities || [];

  // Calculate REO count
  const reoCount = borrowers.reduce(
    (sum, b) => sum + (b.reoProperties ? b.reoProperties.length : 0),
    0,
  );

  const mortgageLienCount = liabilities.filter((l) =>
    (l.liabilityType || '').match(/mortgage/i),
  ).length;
  const helocCount = liabilities.filter((l) =>
    (l.liabilityType || '').match(/heloc/i),
  ).length;

  const inferredREOCount = reoCount === 0 ? mortgageLienCount + helocCount : 0;
  const hasREO = reoCount > 0 || inferredREOCount > 0;

  // ========== GENERAL DOCUMENTS ==========

  if (loanPurpose === 'purchase') {
    recommendations.general.push(...PURCHASE_GENERAL_DOCS);
  }

  if (loanPurpose === 'refinance' || loanPurpose === 'cashout') {
    recommendations.general.push(...REFINANCE_GENERAL_DOCS);
  }

  // ========== PER-BORROWER DOCUMENTS ==========

  borrowers.forEach((borrower) => {
    const tag = `[${borrower.firstName} ${borrower.lastName}]`;
    const vars = { tag };

    // Government-issued ID (always required)
    recommendations.general.push(applyTemplate(BORROWER_ID_DOC, vars));

    // ===== EMPLOYMENT COVERAGE =====
    const employmentHistory = borrower.employmentHistory || [];
    const now = new Date();
    let empMonths = 0;

    employmentHistory.forEach((emp) => {
      const startDate = emp.startDate;
      const endDate = emp.endDate || now.toISOString().split('T')[0];
      empMonths += monthsBetween(startDate, endDate);
    });

    const needEmpMonths = Math.max(0, REQUIRED_HISTORY_MONTHS - empMonths);

    if (needEmpMonths > 0) {
      recommendations.general.push(
        ...applyTemplates(EMPLOYMENT_GAP_DOCS, { ...vars, months: needEmpMonths }),
      );
    } else {
      recommendations.general.push(applyTemplate(EMPLOYMENT_OK_DOC, vars));
    }

    // ===== RESIDENCE COVERAGE =====
    const residences = borrower.residences || [];
    let resMonths = 0;

    residences.forEach((res) => {
      resMonths += Number(res.durationMonths || 0);
    });

    const needResMonths = Math.max(0, REQUIRED_HISTORY_MONTHS - resMonths);

    if (needResMonths > 0) {
      recommendations.general.push(
        applyTemplate(RESIDENCE_GAP_DOC, { ...vars, months: needResMonths }),
      );
    } else {
      recommendations.general.push(applyTemplate(RESIDENCE_OK_DOC, vars));
    }

    // ===== CITIZENSHIP / RESIDENCY =====
    const citizenshipType = (borrower.citizenshipType || '').toLowerCase();

    if (citizenshipType && !citizenshipType.match(/citizen|us/i)) {
      if (citizenshipType.match(/permanent|resident/i)) {
        recommendations.general.push(applyTemplate(PERMANENT_RESIDENT_DOC, vars));
      } else {
        recommendations.general.push(applyTemplate(NON_PERMANENT_RESIDENT_DOC, vars));
      }
    }

    // ===== DECLARATIONS =====
    const declaration = borrower.declaration || {};

    if (declaration.bankruptcy) {
      recommendations.credit.push(applyTemplate(BANKRUPTCY_DOC, vars));
    }

    if (declaration.foreclosure) {
      recommendations.credit.push(applyTemplate(FORECLOSURE_DOC, vars));
    }

    if (declaration.outstandingJudgments) {
      recommendations.credit.push(applyTemplate(OUTSTANDING_JUDGMENTS_DOC, vars));
    }

    // ===== INCOME DOCUMENTS =====
    const incomeSources = borrower.incomeSources || [];
    const hasEmploymentIncome = employmentHistory.some(
      (emp) => emp.monthlyIncome > 0 && emp.employmentStatus === 'Present',
    );

    const isSelfEmployed = employmentHistory.some((emp) => emp.selfEmployed === true);

    const businessTypes = employmentHistory
      .filter((emp) => emp.selfEmployed && emp.businessType)
      .map((emp) => emp.businessType);

    const hasLLC = businessTypes.includes('LLC');
    const hasSCorp = businessTypes.includes('SCorp');
    const hasCCorp = businessTypes.includes('Corporation');

    const hasPartnershipIncome = incomeSources.some((inc) =>
      (inc.incomeType || '').match(/partnership/i),
    );

    // W-2 Employment
    if (hasEmploymentIncome && !isSelfEmployed) {
      recommendations.income.push(...applyTemplates(W2_INCOME_DOCS, vars));
    }

    // Variable income (bonus, OT, commission)
    const hasVariableIncome = incomeSources.some((inc) =>
      VARIABLE_INCOME_TYPES.includes(inc.incomeType),
    );

    if (hasVariableIncome) {
      recommendations.income.push(applyTemplate(VARIABLE_INCOME_DOC, vars));
    }

    // Self-employment
    if (isSelfEmployed) {
      recommendations.income.push(...applyTemplates(SELF_EMPLOYED_BASE_DOCS, vars));

      if (hasLLC) {
        recommendations.income.push(...applyTemplates(LLC_DOCS, vars));
      }

      if (hasSCorp) {
        recommendations.income.push(...applyTemplates(SCORP_DOCS, vars));
      }

      if (hasCCorp) {
        recommendations.income.push(...applyTemplates(CCORP_DOCS, vars));
      }

      if (hasPartnershipIncome) {
        recommendations.income.push(...applyTemplates(PARTNERSHIP_DOCS, vars));
      }

      recommendations.income.push(applyTemplate(SELF_EMPLOYED_CONDITIONAL_DOC, vars));
    }

    // Rental income
    if (incomeSources.some((inc) => (inc.incomeType || '').match(/rental/i))) {
      recommendations.income.push(applyTemplate(RENTAL_INCOME_DOC, vars));
    }

    // Credit inquiry explanation (always conditional per borrower)
    recommendations.credit.push(applyTemplate(CREDIT_INQUIRY_DOC, vars));
  });

  // ========== ASSETS ==========

  const totalAssets = borrowers.reduce((sum, b) => sum + (b.assets || []).length, 0);

  if (totalAssets > 0) {
    borrowers.forEach((b) => {
      const tag = `[${b.firstName} ${b.lastName}]`;
      (b.assets || []).forEach((asset) => {
        recommendations.assets.push(
          applyTemplate(ASSET_STATEMENT_DOC, {
            tag,
            assetType: asset.assetType || 'Asset',
            accountSuffix: asset.accountNumber
              ? '****' + asset.accountNumber.slice(-4)
              : '',
          }),
        );
      });
    });
  } else if (loanPurpose === 'purchase') {
    recommendations.assets.push(NO_ASSETS_PURCHASE_DOC);
  } else {
    recommendations.assets.push(NO_ASSETS_REFI_DOC);
  }

  // ========== CREDIT & REO ==========

  const hasPayoffLiabilities = liabilities.some((l) => l.toBePaidOff || l.payoffStatus);
  if (hasPayoffLiabilities) {
    recommendations.credit.push(PAYOFF_LIABILITIES_DOC);
  }

  // REO Properties
  if (hasREO) {
    const allREOProperties = borrowers.flatMap((b) =>
      (b.reoProperties || []).map((reo) => ({
        ...reo,
        borrowerName: `${b.firstName} ${b.lastName}`,
      })),
    );

    if (allREOProperties.length > 0) {
      allREOProperties.forEach((reo, idx) => {
        const label = reo.addressLine
          ? ` – ${reo.addressLine}, ${reo.city}, ${reo.state}`
          : ` #${idx + 1}`;
        const reoVars = { label };

        // Find associated mortgage or secured loan liability
        const associatedLiability = liabilities.find(
          (l) =>
            (l.liabilityType === 'Mortgage' || l.liabilityType === 'Secured Loan') &&
            l.associatedREO === reo.id,
        );

        if (associatedLiability) {
          recommendations.credit.push(
            applyTemplate(REO_MORTGAGE_STATEMENT_DOC, {
              ...reoVars,
              liabilityType: associatedLiability.liabilityType,
            }),
          );
        } else {
          recommendations.credit.push(applyTemplate(REO_MORTGAGE_GENERIC_DOC, reoVars));
        }

        recommendations.credit.push(applyTemplate(REO_INSURANCE_DOC, reoVars));
        recommendations.credit.push(applyTemplate(REO_TAX_DOC, reoVars));

        // Check if rental/investment property
        const isRental =
          (reo.propertyType || '').match(/invest|rental/i) ||
          reo.monthlyRentalIncome > 0;

        if (isRental) {
          const ownershipMonths = reo.ownershipMonths || 0;

          if (ownershipMonths > 0 && ownershipMonths < 12) {
            recommendations.income.push(applyTemplate(REO_LEASE_DOC, reoVars));
          } else {
            recommendations.income.push(applyTemplate(REO_SCHEDULE_E_DOC, reoVars));
          }
        }
      });
    } else {
      // Inferred from liabilities
      recommendations.credit.push(...REO_INFERRED_DOCS);
    }
  }

  // HELOC-specific
  if (helocCount > 0) {
    recommendations.credit.push(HELOC_DOC);
  }

  return recommendations;
};

// ── Coverage stats ───────────────────────────────────────────────────

/**
 * Calculate coverage statistics for borrowers
 */
export const calculateCoverageStats = (borrowers) => {
  const stats = {
    employmentCoverage: { needed: 0, covered: 0 },
    residenceCoverage: { needed: 0, covered: 0 },
    hasDeclarationFlags: false,
    reoCount: 0,
  };

  const now = new Date();

  borrowers.forEach((borrower) => {
    // Employment coverage
    let empMonths = 0;
    (borrower.employmentHistory || []).forEach((emp) => {
      const startDate = emp.startDate;
      const endDate = emp.endDate || now.toISOString().split('T')[0];
      empMonths += monthsBetween(startDate, endDate);
    });
    stats.employmentCoverage.covered = Math.min(
      stats.employmentCoverage.covered || empMonths,
      empMonths,
    );
    stats.employmentCoverage.needed = Math.max(
      stats.employmentCoverage.needed,
      Math.max(0, REQUIRED_HISTORY_MONTHS - empMonths),
    );

    // Residence coverage
    let resMonths = 0;
    (borrower.residences || []).forEach((res) => {
      resMonths += Number(res.durationMonths || 0);
    });
    stats.residenceCoverage.covered = Math.min(
      stats.residenceCoverage.covered || resMonths,
      resMonths,
    );
    stats.residenceCoverage.needed = Math.max(
      stats.residenceCoverage.needed,
      Math.max(0, REQUIRED_HISTORY_MONTHS - resMonths),
    );

    // Declaration flags
    const decl = borrower.declaration || {};
    if (decl.bankruptcy || decl.foreclosure || decl.outstandingJudgments) {
      stats.hasDeclarationFlags = true;
    }

    // REO count
    stats.reoCount += (borrower.reoProperties || []).length;
  });

  return stats;
};

// ── CSV export ───────────────────────────────────────────────────────

/**
 * Export recommendations to CSV
 */
export const exportToCSV = (recommendations) => {
  const escape = (str) => `"${String(str).replace(/"/g, '""')}"`;

  const lines = [['Section', 'Item', 'Status', 'Reason']];

  Object.entries(recommendations).forEach(([section, items]) => {
    items.forEach((item) => {
      lines.push([
        section.charAt(0).toUpperCase() + section.slice(1),
        item.name,
        item.status.charAt(0).toUpperCase() + item.status.slice(1),
        item.reason,
      ]);
    });
  });

  return lines.map((row) => row.map(escape).join(',')).join('\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (recommendations, applicationNumber) => {
  const csv = exportToCSV(recommendations);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `doc-checklist-${applicationNumber || Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
