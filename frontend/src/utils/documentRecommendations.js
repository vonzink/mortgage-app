/**
 * Document Recommendations Logic
 * Based on MISMO 3.4 standards and loan application data
 */

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
 * Generate document recommendations based on loan application data
 */
export const generateDocumentRecommendations = (applicationData) => {
  const recommendations = {
    general: [],
    income: [],
    assets: [],
    credit: []
  };

  const borrowers = applicationData.borrowers || [];
  const loanPurpose = (applicationData.loanPurpose || '').toLowerCase();
  const liabilities = applicationData.liabilities || [];
  
  // Calculate REO count
  const reoCount = borrowers.reduce((sum, b) => 
    sum + (b.reoProperties ? b.reoProperties.length : 0), 0);
  
  const mortgageLienCount = liabilities.filter(l => 
    (l.liabilityType || '').match(/mortgage/i)).length;
  const helocCount = liabilities.filter(l => 
    (l.liabilityType || '').match(/heloc/i)).length;
  
  const inferredREOCount = reoCount === 0 ? (mortgageLienCount + helocCount) : 0;
  const hasREO = reoCount > 0 || inferredREOCount > 0;
  
  // Check for rental income
  const hasRentalIncome = borrowers.some(b => 
    (b.incomeSources || []).some(inc => 
      (inc.incomeType || '').match(/rental/i)));

  // ========== GENERAL DOCUMENTS ==========
  
  // Purchase-specific docs
  if (loanPurpose === 'purchase') {
    recommendations.general.push({
      name: 'Executed purchase contract',
      status: 'required',
      reason: 'Loan purpose is Purchase.'
    });
    
    recommendations.general.push({
      name: 'Earnest money proof (canceled check / statement)',
      status: 'required',
      reason: 'Shows source of EMD.'
    });
    
    recommendations.general.push({
      name: '(Conditional) Gift letter + donor ability evidence',
      status: 'conditional',
      reason: 'If gift funds are used.'
    });
  }
  
  // Refinance-specific docs
  if (loanPurpose === 'refinance' || loanPurpose === 'cashout') {
    recommendations.general.push({
      name: 'Current mortgage statement (subject property)',
      status: 'required',
      reason: 'Refinance.'
    });
    
    recommendations.general.push({
      name: 'Promissory Note (copy)',
      status: 'required',
      reason: 'Refinance.'
    });
    
    recommendations.general.push({
      name: 'Insurance declaration page (subject)',
      status: 'required',
      reason: 'Verify hazard coverage.'
    });
  }

  // ========== PER-BORROWER DOCUMENTS ==========
  
  borrowers.forEach((borrower, index) => {
    const tag = `[${borrower.firstName} ${borrower.lastName}]`;
    
    // Government-issued ID (always required)
    recommendations.general.push({
      name: `${tag} Government-issued photo ID`,
      status: 'required',
      reason: 'Always required per borrower.'
    });

    // ===== EMPLOYMENT COVERAGE =====
    const employmentHistory = borrower.employmentHistory || [];
    let empMonths = 0;
    const now = new Date();
    
    employmentHistory.forEach(emp => {
      const startDate = emp.startDate;
      const endDate = emp.endDate || now.toISOString().split('T')[0];
      empMonths += monthsBetween(startDate, endDate);
    });
    
    const needEmpMonths = Math.max(0, 24 - empMonths);
    
    if (needEmpMonths > 0) {
      recommendations.general.push({
        name: `${tag} Prior employment history to cover missing ${needEmpMonths} months`,
        status: 'required',
        reason: 'Must document 24 months employment.'
      });
      
      recommendations.general.push({
        name: `${tag} Letter of explanation for any gaps > 30 days`,
        status: 'review',
        reason: 'Request if gaps are identified.'
      });
    } else {
      recommendations.general.push({
        name: `${tag} Employment history coverage (24 months)`,
        status: 'ok',
        reason: 'Sufficient based on employment dates.'
      });
    }

    // ===== RESIDENCE COVERAGE =====
    const residences = borrower.residences || [];
    let resMonths = 0;
    
    residences.forEach(res => {
      resMonths += Number(res.durationMonths || 0);
    });
    
    const needResMonths = Math.max(0, 24 - resMonths);
    
    if (needResMonths > 0) {
      recommendations.general.push({
        name: `${tag} Prior residence addresses to cover missing ${needResMonths} months`,
        status: 'required',
        reason: 'Must provide 24 months address history.'
      });
    } else {
      recommendations.general.push({
        name: `${tag} Residence history coverage (24 months)`,
        status: 'ok',
        reason: 'Sufficient based on durations.'
      });
    }

    // ===== CITIZENSHIP / RESIDENCY =====
    const citizenshipType = (borrower.citizenshipType || '').toLowerCase();
    
    if (citizenshipType && !citizenshipType.match(/citizen|us/i)) {
      if (citizenshipType.match(/permanent|resident/i)) {
        recommendations.general.push({
          name: `${tag} I-551 (Permanent Resident/Green Card) – front & back`,
          status: 'required',
          reason: 'Non-US citizen (permanent resident).'
        });
      } else {
        recommendations.general.push({
          name: `${tag} Valid EAD card (I-766) or visa with work authorization + I-94`,
          status: 'required',
          reason: 'Non-permanent resident alien.'
        });
      }
    }

    // ===== DECLARATIONS =====
    const declaration = borrower.declaration || {};
    
    if (declaration.bankruptcy) {
      recommendations.credit.push({
        name: `${tag} Bankruptcy documents (petition, schedules, discharge). If Ch. 13: 12 months trustee payment history`,
        status: 'required',
        reason: 'BK indicated on declarations.'
      });
    }
    
    if (declaration.foreclosure) {
      recommendations.credit.push({
        name: `${tag} Foreclosure / short sale documents + LOE`,
        status: 'required',
        reason: 'History of foreclosure/short sale.'
      });
    }
    
    if (declaration.outstandingJudgments) {
      recommendations.credit.push({
        name: `${tag} Court payoff / release for outstanding judgments or liens`,
        status: 'required',
        reason: 'Outstanding judgments indicated.'
      });
    }

    // ===== INCOME DOCUMENTS =====
    const incomeSources = borrower.incomeSources || [];
    const hasEmploymentIncome = employmentHistory.some(emp => 
      emp.monthlyIncome > 0 && emp.employmentStatus === 'Present');
    
    // Check for self-employment
    let isSelfEmployed = employmentHistory.some(emp => 
      emp.selfEmployed === true);
    
    const hasSCorp = incomeSources.some(inc => 
      (inc.incomeType || '').match(/s-?corp|s\s*corporation/i));
    const hasPartnership = incomeSources.some(inc => 
      (inc.incomeType || '').match(/partnership/i));
    
    // W-2 Employment
    if (hasEmploymentIncome && !isSelfEmployed) {
      recommendations.income.push({
        name: `${tag} 30 days most recent pay stubs`,
        status: 'required',
        reason: 'W-2 employment income present.'
      });
      
      recommendations.income.push({
        name: `${tag} W-2s for last 2 years`,
        status: 'required',
        reason: 'Standard for W-2 income.'
      });
    }
    
    // Variable income (bonus, OT, commission)
    const hasVariableIncome = incomeSources.some(inc => 
      ['Bonus', 'Overtime', 'Commission'].includes(inc.incomeType));
    
    if (hasVariableIncome) {
      recommendations.income.push({
        name: `${tag} VOE confirming 2-year history of bonus/OT/commission`,
        status: 'required',
        reason: 'Needed to use variable income.'
      });
    }

    // Self-employment
    if (isSelfEmployed) {
      recommendations.income.push({
        name: `${tag} 1040 personal tax returns – last 2 years`,
        status: 'required',
        reason: 'Self-employment indicated.'
      });
      
      recommendations.income.push({
        name: `${tag} Year-to-date P&L and balance sheet`,
        status: 'required',
        reason: 'Support current year performance.'
      });
      
      // S-Corp
      if (hasSCorp) {
        recommendations.income.push({
          name: `${tag} K-1s (S-Corp) – last 2 years`,
          status: 'required',
          reason: 'S-Corporation income present.'
        });
        
        recommendations.income.push({
          name: `${tag} 1120S business tax returns – last 2 years`,
          status: 'required',
          reason: 'S-Corporation ownership.'
        });
      }
      
      // Partnership
      if (hasPartnership) {
        recommendations.income.push({
          name: `${tag} K-1s (Partnership) – last 2 years`,
          status: 'required',
          reason: 'Partnership income present.'
        });
        
        recommendations.income.push({
          name: `${tag} 1065 partnership tax returns – last 2 years`,
          status: 'required',
          reason: 'Partnership ownership.'
        });
      }
      
      recommendations.income.push({
        name: `${tag} (Conditional) Business bank statements (2-3 months)`,
        status: 'conditional',
        reason: 'If needed to support cash flow/P&L.'
      });
    }

    // Rental income
    if (incomeSources.some(inc => (inc.incomeType || '').match(/rental/i))) {
      recommendations.income.push({
        name: `${tag} Current lease(s) + 2 months rent receipts`,
        status: 'conditional',
        reason: 'Rental income present.'
      });
    }

    // Credit inquiry explanation (always conditional per borrower)
    recommendations.credit.push({
      name: `${tag} Letter of explanation for any recent credit inquiries`,
      status: 'conditional',
      reason: 'Requested for underwriting clarity.'
    });
  });

  // ========== ASSETS ==========
  
  const totalAssets = borrowers.reduce((sum, b) => 
    sum + (b.assets || []).length, 0);
  
  if (totalAssets > 0) {
    borrowers.forEach(b => {
      const tag = `[${b.firstName} ${b.lastName}]`;
      (b.assets || []).forEach(asset => {
        recommendations.assets.push({
          name: `${tag} Account statements (2 months) – ${asset.assetType || 'Asset'} ${asset.accountNumber ? '****' + asset.accountNumber.slice(-4) : ''}`,
          status: 'required',
          reason: 'Verify funds to close & reserves.'
        });
      });
    });
  } else if (loanPurpose === 'purchase') {
    recommendations.assets.push({
      name: 'Proof of funds for down payment & closing',
      status: 'required',
      reason: 'No assets listed in application.'
    });
  } else {
    recommendations.assets.push({
      name: 'Asset statements (if cash-to-close required)',
      status: 'conditional',
      reason: 'Provide if needed.'
    });
  }

  // ========== CREDIT & REO ==========
  
  // Payoff liabilities
  const hasPayoffLiabilities = liabilities.some(l => l.toBePaidOff || l.payoffStatus);
  if (hasPayoffLiabilities) {
    recommendations.credit.push({
      name: 'Payoff statements for debts to be paid at closing',
      status: 'required',
      reason: 'Flagged in liabilities.'
    });
  }

  // REO Properties
  if (hasREO) {
    const allREOProperties = borrowers.flatMap(b => 
      (b.reoProperties || []).map(reo => ({
        ...reo,
        borrowerName: `${b.firstName} ${b.lastName}`
      }))
    );
    
    if (allREOProperties.length > 0) {
      allREOProperties.forEach((reo, idx) => {
        const label = reo.addressLine 
          ? ` – ${reo.addressLine}, ${reo.city}, ${reo.state}`
          : ` #${idx + 1}`;
        
        recommendations.credit.push({
          name: `Mortgage/HELOC statement${label}`,
          status: 'required',
          reason: 'REO property identified.'
        });
        
        recommendations.credit.push({
          name: `Hazard insurance declaration page${label}`,
          status: 'required',
          reason: 'Verify coverage.'
        });
        
        recommendations.credit.push({
          name: `Property tax bill${label}`,
          status: 'conditional',
          reason: 'Provide if taxes are not escrowed.'
        });
        
        // Check if investment property
        if ((reo.propertyType || '').match(/invest/i) || hasRentalIncome) {
          recommendations.income.push({
            name: `Lease agreement${label}`,
            status: 'conditional',
            reason: 'Investment/rental property.'
          });
        }
      });
    } else {
      // Inferred from liabilities
      recommendations.credit.push({
        name: 'Mortgage/HELOC statement(s) – each REO property',
        status: 'required',
        reason: 'Mortgage/HELOC liabilities present.'
      });
      
      recommendations.credit.push({
        name: 'Hazard insurance declaration page – each REO property',
        status: 'required',
        reason: 'Verify coverage on owned properties.'
      });
      
      recommendations.credit.push({
        name: 'Property tax bill – each REO property',
        status: 'conditional',
        reason: 'Provide if taxes not escrowed.'
      });
    }
  }

  // HELOC-specific
  if (helocCount > 0) {
    recommendations.credit.push({
      name: 'HELOC statement(s) (most recent)',
      status: 'required',
      reason: 'HELOC liability detected.'
    });
  }

  return recommendations;
};

/**
 * Calculate coverage statistics for borrowers
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

