/**
 * URLA print preview — opens a popup window with a Form-1003-style HTML
 * rendering and triggers the browser's print dialog.
 *
 * This is intentionally client-side: the data is already in the form, the
 * output is a transient print view (not a saved artifact), and there's no
 * value in round-tripping form values through the backend just to render
 * static HTML. MISMO XML export DOES go through the backend — see
 * mortgageService.downloadMismoXml.
 */

export const printURLAFormat = (formData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = generateURLAHTML(formData);
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
  };
};

const generateURLAHTML = (formData) => {
  const borrowers = formData.borrowers || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Uniform Residential Loan Application - Form 1003</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 10pt;
      line-height: 1.3;
      color: #000;
      margin: 0;
      padding: 20px;
      background: white;
    }
    .urla-container { max-width: 8.5in; margin: 0 auto; background: white; }
    .urla-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .urla-header h1 { font-size: 14pt; font-weight: bold; margin: 0 0 5px 0; }
    .urla-header .subtitle { font-size: 11pt; margin: 5px 0; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-header { background: #e8e6df; padding: 5px 10px; font-weight: bold; font-size: 11pt; border: 1px solid #000; margin-bottom: 10px; }
    .field-row { display: flex; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    .field-label { font-weight: bold; min-width: 180px; font-size: 9pt; }
    .field-value { flex: 1; font-size: 10pt; }
    .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
    .grid-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .subsection { margin: 15px 0; padding: 10px; border: 1px solid #ddd; background: #fafafa; }
    .subsection-header { font-weight: bold; font-size: 10pt; margin-bottom: 10px; color: #2c5f2d; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }
    table th { background: #e8e6df; padding: 6px; text-align: left; font-weight: bold; border: 1px solid #000; }
    table td { padding: 6px; border: 1px solid #ccc; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #000; font-size: 8pt; text-align: center; }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="urla-container">
    <div class="urla-header">
      <h1>Uniform Residential Loan Application</h1>
      <div class="subtitle">Form 1003 - Fannie Mae/Freddie Mac</div>
      <div class="subtitle">Application Number: ${formData.applicationNumber || 'PENDING'}</div>
    </div>

    <div class="section">
      <div class="section-header">1. LOAN INFORMATION</div>
      <div class="grid-2col">
        <div>
          <div class="field-row"><span class="field-label">Loan Purpose:</span><span class="field-value">${formData.loanPurpose || 'Not specified'}</span></div>
          <div class="field-row"><span class="field-label">Loan Type:</span><span class="field-value">${formData.loanType || 'Not specified'}</span></div>
        </div>
        <div>
          <div class="field-row"><span class="field-label">Loan Amount:</span><span class="field-value">$${Number(formData.loanAmount || 0).toLocaleString()}</span></div>
          <div class="field-row"><span class="field-label">Property Value:</span><span class="field-value">$${Number(formData.propertyValue || 0).toLocaleString()}</span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">2. PROPERTY INFORMATION AND PURPOSE OF LOAN</div>
      <div class="field-row"><span class="field-label">Subject Property Address:</span><span class="field-value">${formData.property?.addressLine || 'Not provided'}</span></div>
      <div class="grid-3col">
        <div class="field-row"><span class="field-label">City:</span><span class="field-value">${formData.property?.city || ''}</span></div>
        <div class="field-row"><span class="field-label">State:</span><span class="field-value">${formData.property?.state || ''}</span></div>
        <div class="field-row"><span class="field-label">ZIP:</span><span class="field-value">${formData.property?.zipCode || ''}</span></div>
      </div>
      <div class="grid-3col">
        <div class="field-row"><span class="field-label">Property Type:</span><span class="field-value">${formData.propertyUse || ''}</span></div>
        <div class="field-row"><span class="field-label">Year Built:</span><span class="field-value">${formData.yearBuilt || ''}</span></div>
        <div class="field-row"><span class="field-label">Units:</span><span class="field-value">${formData.unitsCount || '1'}</span></div>
      </div>
    </div>

    ${borrowers.map((borrower, index) => `
    <div class="section">
      <div class="section-header">3. BORROWER INFORMATION - ${index === 0 ? 'PRIMARY BORROWER' : `CO-BORROWER ${index}`}</div>
      <div class="grid-2col">
        <div class="field-row"><span class="field-label">First Name:</span><span class="field-value">${borrower.firstName || ''}</span></div>
        <div class="field-row"><span class="field-label">Last Name:</span><span class="field-value">${borrower.lastName || ''}</span></div>
      </div>
      <div class="grid-3col">
        <div class="field-row"><span class="field-label">SSN:</span><span class="field-value">***-**-${(borrower.ssn || '').slice(-4) || '****'}</span></div>
        <div class="field-row"><span class="field-label">Date of Birth:</span><span class="field-value">${borrower.dateOfBirth || ''}</span></div>
        <div class="field-row"><span class="field-label">Marital Status:</span><span class="field-value">${borrower.maritalStatus || ''}</span></div>
      </div>
      <div class="grid-2col">
        <div class="field-row"><span class="field-label">Email:</span><span class="field-value">${borrower.email || ''}</span></div>
        <div class="field-row"><span class="field-label">Phone:</span><span class="field-value">${borrower.phone || ''}</span></div>
      </div>
      <div class="grid-2col">
        <div class="field-row"><span class="field-label">Citizenship:</span><span class="field-value">${borrower.citizenshipType || ''}</span></div>
        <div class="field-row"><span class="field-label">Dependents:</span><span class="field-value">${borrower.dependents || '0'}</span></div>
      </div>

      ${(borrower.employmentHistory && borrower.employmentHistory.length > 0) ? `
      <div class="subsection">
        <div class="subsection-header">Employment History</div>
        <table>
          <thead><tr><th>Employer Name</th><th>Position</th><th>Start Date</th><th>End Date</th><th>Monthly Income</th></tr></thead>
          <tbody>
            ${borrower.employmentHistory.map(emp => `
            <tr>
              <td>${emp.employerName || ''}</td>
              <td>${emp.position || ''}</td>
              <td>${emp.startDate || ''}</td>
              <td>${emp.endDate || 'Present'}</td>
              <td>$${Number(emp.monthlyIncome || 0).toLocaleString()}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${(borrower.residences && borrower.residences.length > 0) ? `
      <div class="subsection">
        <div class="subsection-header">Residence History</div>
        <table>
          <thead><tr><th>Address</th><th>City</th><th>State</th><th>ZIP</th><th>Type</th><th>Duration</th></tr></thead>
          <tbody>
            ${borrower.residences.map(res => `
            <tr>
              <td>${res.addressLine || ''}</td>
              <td>${res.city || ''}</td>
              <td>${res.state || ''}</td>
              <td>${res.zipCode || ''}</td>
              <td>${res.residencyType || ''}</td>
              <td>${res.durationMonths || '0'} months</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>`).join('')}

    ${borrowers.some(b => b.liabilities && b.liabilities.length > 0) ? `
    <div class="section">
      <div class="section-header">4. FINANCIAL INFORMATION - LIABILITIES</div>
      <table>
        <thead><tr><th>Creditor Name</th><th>Account Number</th><th>Type</th><th>Monthly Payment</th><th>Unpaid Balance</th></tr></thead>
        <tbody>
          ${borrowers.flatMap(b => (b.liabilities || [])).map(liability => `
          <tr>
            <td>${liability.creditorName || ''}</td>
            <td>****${(liability.accountNumber || '').slice(-4) || '****'}</td>
            <td>${liability.liabilityType || ''}</td>
            <td>$${Number(liability.monthlyPayment || 0).toLocaleString()}</td>
            <td>$${Number(liability.unpaidBalance || 0).toLocaleString()}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="footer">
      <p>This is a computer-generated document. No signature is required for this print copy.</p>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <p>Fannie Mae Form 1003 | Freddie Mac Form 65 | Uniform Residential Loan Application</p>
    </div>
  </div>
</body>
</html>
  `;
};
