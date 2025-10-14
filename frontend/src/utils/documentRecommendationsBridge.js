/**
 * Document Recommendations Bridge
 * 
 * Bridges the old documentRecommendations.js with the new rules engine
 * Allows for gradual migration while maintaining backward compatibility
 */

import { generateDocChecklist } from './docRules';
import { adaptFormToLoanApplication } from './docRules/formAdapter';

/**
 * Legacy wrapper that maintains the old API while using the new rules engine
 */
export const generateDocumentRecommendations = (applicationData) => {
  try {
    // Convert to new format
    const loanApplication = adaptFormToLoanApplication(applicationData);
    
    // Generate using new rules engine
    const result = generateDocChecklist(loanApplication);
    
    // Convert back to legacy format
    return convertToLegacyFormat(result, applicationData);
  } catch (error) {
    console.error('Error generating document recommendations:', error);
    // Fallback to basic recommendations
    return {
      general: [
        {
          name: 'Government-issued photo ID',
          status: 'required',
          reason: 'Required for all borrowers'
        },
        {
          name: 'Social Security Card or SSN Verification',
          status: 'required',
          reason: 'Required for all borrowers'
        }
      ],
      income: [],
      assets: [],
      credit: []
    };
  }
};

/**
 * Convert new format to legacy format
 */
function convertToLegacyFormat(result, applicationData) {
  const recommendations = {
    general: [],
    income: [],
    assets: [],
    credit: []
  };

  // Categorize documents
  result.required.forEach(doc => {
    const category = categorizeDocument(doc.id);
    recommendations[category].push({
      name: doc.label,
      status: doc.conditional ? 'conditional' : 'required',
      reason: doc.reason,
      ruleHits: doc.ruleHits,
      id: doc.id,
    });
  });

  // Add conditional documents
  result.niceToHave.forEach(doc => {
    const category = categorizeDocument(doc.id);
    recommendations[category].push({
      name: doc.label,
      status: 'conditional',
      reason: doc.reason,
      ruleHits: doc.ruleHits,
      id: doc.id,
    });
  });

  // Add clarifications as general items
  if (result.clarifications.length > 0) {
    recommendations.general.push({
      name: '⚠️ Additional Information Required',
      status: 'review',
      reason: 'Please provide the following information: ' + result.clarifications.join(', '),
      isClarification: true,
    });
  }

  return recommendations;
}

/**
 * Categorize document by ID
 */
function categorizeDocument(docId) {
  if (docId.includes('GOVT_ID') || docId.includes('SSN') || docId.includes('GREEN_CARD') || 
      docId.includes('NAME_CHANGE') || docId.includes('PURCHASE') || docId.includes('CONDO') ||
      docId.includes('HOMEOWNERS') || docId.includes('USDA') || docId.includes('VA_COE')) {
    return 'general';
  }
  
  if (docId.includes('PAYSTUB') || docId.includes('W2') || docId.includes('VOE') || 
      docId.includes('TAX_RETURN') || docId.includes('K1') || docId.includes('YTD') ||
      docId.includes('BUSINESS') || docId.includes('CPA') || docId.includes('RENTAL') ||
      docId.includes('ALIMONY') || docId.includes('PENSION') || docId.includes('SSA') ||
      docId.includes('DISABILITY') || docId.includes('1099') || docId.includes('BONUS')) {
    return 'income';
  }
  
  if (docId.includes('BANK') || docId.includes('BROKERAGE') || docId.includes('RETIREMENT') ||
      docId.includes('GIFT') || docId.includes('DONOR') || docId.includes('EARNEST') ||
      docId.includes('SALE_OF_ASSET') || docId.includes('CRYPTO') || docId.includes('SOURCE_LARGE')) {
    return 'assets';
  }
  
  if (docId.includes('DIVORCE') || docId.includes('SEPARATION') || docId.includes('BK') ||
      docId.includes('FORECLOSURE') || docId.includes('STUDENT_LOAN') || docId.includes('LOE')) {
    return 'credit';
  }
  
  return 'general';
}

/**
 * Legacy wrapper for coverage stats
 */
export const calculateCoverageStats = (borrowers) => {
  const stats = {
    employmentCoverage: { needed: 0, covered: 0 },
    residenceCoverage: { needed: 0, covered: 0 },
    hasDeclarationFlags: false,
    reoCount: 0
  };

  const now = new Date();
  
  borrowers.forEach(borrower => {
    // Employment coverage
    let empMonths = 0;
    (borrower.employmentHistory || []).forEach(emp => {
      const startDate = emp.startDate;
      const endDate = emp.endDate || now.toISOString().split('T')[0];
      empMonths += monthsBetween(startDate, endDate);
    });
    stats.employmentCoverage.covered = Math.min(
      stats.employmentCoverage.covered || empMonths, 
      empMonths
    );
    stats.employmentCoverage.needed = Math.max(
      stats.employmentCoverage.needed, 
      Math.max(0, 24 - empMonths)
    );

    // Residence coverage
    let resMonths = 0;
    (borrower.residences || []).forEach(res => {
      resMonths += Number(res.durationMonths || 0);
    });
    stats.residenceCoverage.covered = Math.min(
      stats.residenceCoverage.covered || resMonths,
      resMonths
    );
    stats.residenceCoverage.needed = Math.max(
      stats.residenceCoverage.needed,
      Math.max(0, 24 - resMonths)
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

/**
 * Export recommendations to CSV
 */
export const exportToCSV = (recommendations) => {
  const escape = (str) => `"${String(str).replace(/"/g, '""')}"`;
  
  const lines = [['Section', 'Item', 'Status', 'Reason']];
  
  Object.entries(recommendations).forEach(([section, items]) => {
    items.forEach(item => {
      lines.push([
        section.charAt(0).toUpperCase() + section.slice(1),
        item.name,
        item.status.charAt(0).toUpperCase() + item.status.slice(1),
        item.reason
      ]);
    });
  });
  
  return lines.map(row => row.map(escape).join(',')).join('\n');
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

