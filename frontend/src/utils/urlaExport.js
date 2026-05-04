/**
 * URLA (Uniform Residential Loan Application) Export Utilities
 * Functions to export loan application data to PDF and XML formats
 */

/**
 * Generate XML in MISMO 3.4 Closing format
 */
export const exportToMISMO34Closing = (formData) => {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const primaryBorrower = formData.borrowers?.[0] || {};
  
  const xml = `${xmlHeader}<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" MISMOVersionID="3.4">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <CreatedDatetime>${new Date().toISOString()}</CreatedDatetime>
      <DataVersionIdentifier>1</DataVersionIdentifier>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <LOANS>
            <LOAN>
              <LOAN_IDENTIFIERS>
                <LOAN_IDENTIFIER>
                  <LoanIdentifier>${formData.applicationNumber || 'PENDING'}</LoanIdentifier>
                  <LoanIdentifierType>LenderLoan</LoanIdentifierType>
                </LOAN_IDENTIFIER>
              </LOAN_IDENTIFIERS>
              <LOAN_DETAIL>
                <LoanPurposeType>${formData.loanPurpose || ''}</LoanPurposeType>
                <MortgageType>${formData.loanType || ''}</MortgageType>
                <LoanAmount>${formData.loanAmount || '0'}</LoanAmount>
              </LOAN_DETAIL>
              <PARTIES>
${(formData.borrowers || []).map((borrower, index) => `                <PARTY>
                  <INDIVIDUAL>
                    <NAME>
                      <FirstName>${borrower.firstName || ''}</FirstName>
                      <MiddleName>${borrower.middleName || ''}</MiddleName>
                      <LastName>${borrower.lastName || ''}</LastName>
                    </NAME>
                    <CONTACT_POINTS>
                      <CONTACT_POINT>
                        <CONTACT_POINT_EMAIL>
                          <ContactPointEmailValue>${borrower.email || ''}</ContactPointEmailValue>
                        </CONTACT_POINT_EMAIL>
                        <CONTACT_POINT_TELEPHONE>
                          <ContactPointTelephoneValue>${borrower.phone || ''}</ContactPointTelephoneValue>
                        </CONTACT_POINT_TELEPHONE>
                      </CONTACT_POINT>
                    </CONTACT_POINTS>
                  </INDIVIDUAL>
                  <ROLES>
                    <ROLE>
                      <ROLE_DETAIL>
                        <PartyRoleType>Borrower</PartyRoleType>
                        <PartyRoleSequenceNumber>${index + 1}</PartyRoleSequenceNumber>
                      </ROLE_DETAIL>
                      <BORROWER>
                        <DECLARATION>
                          <DeclarationIndicator>${borrower.intentToOccupy ? 'true' : 'false'}</DeclarationIndicator>
                        </DECLARATION>
                        <GOVERNMENT_MONITORING>
                          <HMDAEthnicityType>${borrower.ethnicityType || 'NotProvided'}</HMDAEthnicityType>
                        </GOVERNMENT_MONITORING>
                      </BORROWER>
                    </ROLE>
                  </ROLES>
                </PARTY>`).join('\n')}
              </PARTIES>
              <QUALIFICATION>
                <INCOMES>
${(formData.borrowers || []).flatMap((borrower, bIndex) => 
  (borrower.employmentHistory || []).map((emp, eIndex) => `                  <INCOME>
                    <IncomeMonthlyTotalAmount>${emp.monthlyIncome || '0'}</IncomeMonthlyTotalAmount>
                    <IncomeType>Employment</IncomeType>
                    <EMPLOYERS>
                      <EMPLOYER>
                        <EmployerName>${emp.employerName || ''}</EmployerName>
                        <EMPLOYMENT>
                          <EmploymentPositionDescription>${emp.position || ''}</EmploymentPositionDescription>
                          <EmploymentStartDate>${emp.startDate || ''}</EmploymentStartDate>
                          <EmploymentEndDate>${emp.endDate || ''}</EmploymentEndDate>
                          <EmploymentClassificationType>${emp.selfEmployed ? 'SelfEmployed' : 'Primary'}</EmploymentClassificationType>
                        </EMPLOYMENT>
                      </EMPLOYER>
                    </EMPLOYERS>
                  </INCOME>`)).join('\n')}
                </INCOMES>
              </QUALIFICATION>
            </LOAN>
          </LOANS>
          <COLLATERALS>
            <COLLATERAL>
              <SUBJECT_PROPERTY>
                <ADDRESS>
                  <AddressLineText>${formData.property?.addressLine || ''}</AddressLineText>
                  <CityName>${formData.property?.city || ''}</CityName>
                  <StateCode>${formData.property?.state || ''}</StateCode>
                  <PostalCode>${formData.property?.zipCode || ''}</PostalCode>
                </ADDRESS>
                <PROPERTY_DETAIL>
                  <PropertyEstimatedValueAmount>${formData.propertyValue || '0'}</PropertyEstimatedValueAmount>
                  <PropertyExistingCleanEnergyLienIndicator>false</PropertyExistingCleanEnergyLienIndicator>
                  <PropertyInProjectIndicator>false</PropertyInProjectIndicator>
                  <PropertyUsageType>${formData.propertyUse || ''}</PropertyUsageType>
                  <AttachmentType>${formData.propertyType || ''}</AttachmentType>
                  <PropertyBuiltYear>${formData.yearBuilt || ''}</PropertyBuiltYear>
                  <PropertyEstateType>FeeSimple</PropertyEstateType>
                </PROPERTY_DETAIL>
              </SUBJECT_PROPERTY>
            </COLLATERAL>
          </COLLATERALS>
          <LIABILITIES>
${(formData.borrowers || []).flatMap(borrower => 
    (borrower.liabilities || []).map((liability, index) => `            <LIABILITY>
              <LIABILITY_DETAIL>
                <LiabilityAccountIdentifier>${liability.accountNumber || ''}</LiabilityAccountIdentifier>
                <LiabilityMonthlyPaymentAmount>${liability.monthlyPayment || '0'}</LiabilityMonthlyPaymentAmount>
                <LiabilityPayoffStatusIndicator>false</LiabilityPayoffStatusIndicator>
                <LiabilityType>${liability.liabilityType || ''}</LiabilityType>
                <LiabilityUnpaidBalanceAmount>${liability.unpaidBalance || '0'}</LiabilityUnpaidBalanceAmount>
              </LIABILITY_DETAIL>
              <LIABILITY_HOLDER>
                <NAME>
                  <FullName>${liability.creditorName || ''}</FullName>
                </NAME>
              </LIABILITY_HOLDER>
            </LIABILITY>`)).join('\n')}
          </LIABILITIES>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;

  return xml;
};

/**
 * Generate XML in MISMO 3.4 FNM (Fannie Mae) format
 */
export const exportToMISMO34FNM = (formData) => {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const primaryBorrower = formData.borrowers?.[0] || {};
  
  const xml = `${xmlHeader}<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:fnm="http://www.fanniemae.com/loandelivery/schemas" MISMOVersionID="3.4">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <CreatedDatetime>${new Date().toISOString()}</CreatedDatetime>
      <DataVersionIdentifier>1</DataVersionIdentifier>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <ASSETS>
${(formData.borrowers || []).flatMap(borrower => 
    (borrower.assets || []).map((asset, index) => `            <ASSET>
              <ASSET_DETAIL>
                <AssetAccountIdentifier>${asset.accountNumber || ''}</AssetAccountIdentifier>
                <AssetCashOrMarketValueAmount>${asset.assetValue || '0'}</AssetCashOrMarketValueAmount>
                <AssetType>${asset.assetType || ''}</AssetType>
              </ASSET_DETAIL>
              <ASSET_HOLDER>
                <NAME>
                  <FullName>${asset.bankName || ''}</FullName>
                </NAME>
              </ASSET_HOLDER>
            </ASSET>`)).join('\n')}
          </ASSETS>
          <LOANS>
            <LOAN>
              <LOAN_IDENTIFIERS>
                <LOAN_IDENTIFIER>
                  <LoanIdentifier>${formData.applicationNumber || 'PENDING'}</LoanIdentifier>
                  <LoanIdentifierType>LenderLoan</LoanIdentifierType>
                </LOAN_IDENTIFIER>
              </LOAN_IDENTIFIERS>
              <LOAN_DETAIL>
                <ApplicationReceivedDate>${new Date().toISOString().split('T')[0]}</ApplicationReceivedDate>
                <BalloonIndicator>false</BalloonIndicator>
                <BuydownTemporarySubsidyFundingIndicator>false</BuydownTemporarySubsidyFundingIndicator>
                <ConstructionLoanIndicator>false</ConstructionLoanIndicator>
                <ConversionOfContractForDeedIndicator>false</ConversionOfContractForDeedIndicator>
                <InterestOnlyIndicator>false</InterestOnlyIndicator>
                <NegativeAmortizationIndicator>false</NegativeAmortizationIndicator>
                <PrepaymentPenaltyIndicator>false</PrepaymentPenaltyIndicator>
                <LoanPurposeType>${formData.loanPurpose || ''}</LoanPurposeType>
                <MortgageType>${formData.loanType || ''}</MortgageType>
                <LoanAmount>${formData.loanAmount || '0'}</LoanAmount>
              </LOAN_DETAIL>
              <DOWN_PAYMENTS>
                <DOWN_PAYMENT>
                  <DownPaymentAmount>${formData.downPayment || '0'}</DownPaymentAmount>
                  <DownPaymentType>${formData.downPaymentSource || 'OtherTypeSeeRemarks'}</DownPaymentType>
                </DOWN_PAYMENT>
              </DOWN_PAYMENTS>
              <PARTIES>
${(formData.borrowers || []).map((borrower, index) => `                <PARTY>
                  <INDIVIDUAL>
                    <NAME>
                      <FirstName>${borrower.firstName || ''}</FirstName>
                      <MiddleName>${borrower.middleName || ''}</MiddleName>
                      <LastName>${borrower.lastName || ''}</LastName>
                    </NAME>
                    <CONTACT_POINTS>
                      <CONTACT_POINT>
                        <CONTACT_POINT_EMAIL>
                          <ContactPointEmailValue>${borrower.email || ''}</ContactPointEmailValue>
                        </CONTACT_POINT_EMAIL>
                        <CONTACT_POINT_TELEPHONE>
                          <ContactPointTelephoneValue>${borrower.phone || ''}</ContactPointTelephoneValue>
                        </CONTACT_POINT_TELEPHONE>
                      </CONTACT_POINT>
                    </CONTACT_POINTS>
                  </INDIVIDUAL>
                  <ROLES>
                    <ROLE>
                      <ROLE_DETAIL>
                        <PartyRoleType>Borrower</PartyRoleType>
                        <PartyRoleSequenceNumber>${index + 1}</PartyRoleSequenceNumber>
                      </ROLE_DETAIL>
                      <BORROWER>
                        <BORROWER_DETAIL>
                          <BorrowerBirthDate>${borrower.dateOfBirth || ''}</BorrowerBirthDate>
                          <BorrowerClassificationType>${index === 0 ? 'Primary' : 'Secondary'}</BorrowerClassificationType>
                          <DependentCount>${borrower.dependents || '0'}</DependentCount>
                          <MaritalStatusType>${borrower.maritalStatus || ''}</MaritalStatusType>
                          <TaxpayerIdentifierValue>${borrower.ssn || ''}</TaxpayerIdentifierValue>
                        </BORROWER_DETAIL>
                        <DECLARATION>
                          <BankruptcyIndicator>${borrower.bankruptcy || false}</BankruptcyIndicator>
                          <CitizenshipResidencyType>${borrower.usCitizen ? 'USCitizen' : (borrower.permanentResident ? 'PermanentResidentAlien' : 'NonPermanentResidentAlien')}</CitizenshipResidencyType>
                          <CoMakerEndorserOfNoteIndicator>${borrower.comakerEndorser || false}</CoMakerEndorserOfNoteIndicator>
                          <HomeownerPastThreeYearsType>No</HomeownerPastThreeYearsType>
                          <IntentToOccupyIndicator>${borrower.intentToOccupy || false}</IntentToOccupyIndicator>
                          <LoanForeclosureOrJudgmentIndicator>${borrower.foreclosure || false}</LoanForeclosureOrJudgmentIndicator>
                          <OutstandingJudgmentsIndicator>${borrower.outstandingJudgments || false}</OutstandingJudgmentsIndicator>
                          <PartyToLawsuitIndicator>${borrower.lawsuit || false}</PartyToLawsuitIndicator>
                          <PresentlyDelinquentIndicator>${borrower.presentlyDelinquent || false}</PresentlyDelinquentIndicator>
                          <PriorPropertyUsageType>Investment</PriorPropertyUsageType>
                          <PropertyProposedCleanEnergyLienIndicator>false</PropertyProposedCleanEnergyLienIndicator>
                        </DECLARATION>
                        <RESIDENCES>
${(borrower.residences || []).map((res, resIndex) => `                          <RESIDENCE>
                            <ADDRESS>
                              <AddressLineText>${res.addressLine || ''}</AddressLineText>
                              <CityName>${res.city || ''}</CityName>
                              <StateCode>${res.state || ''}</StateCode>
                              <PostalCode>${res.zipCode || ''}</PostalCode>
                            </ADDRESS>
                            <RESIDENCE_DETAIL>
                              <BorrowerResidencyBasisType>${res.residencyBasis || ''}</BorrowerResidencyBasisType>
                              <BorrowerResidencyDurationMonthsCount>${res.durationMonths || '0'}</BorrowerResidencyDurationMonthsCount>
                              <BorrowerResidencyType>${res.residencyType || ''}</BorrowerResidencyType>
                            </RESIDENCE_DETAIL>
                          </RESIDENCE>`).join('\n')}
                        </RESIDENCES>
                      </BORROWER>
                    </ROLE>
                  </ROLES>
                </PARTY>`).join('\n')}
              </PARTIES>
              <QUALIFICATION>
                <INCOMES>
${(formData.borrowers || []).flatMap((borrower, bIndex) => 
  (borrower.employmentHistory || []).map((emp, eIndex) => `                  <INCOME>
                    <IncomeMonthlyTotalAmount>${emp.monthlyIncome || '0'}</IncomeMonthlyTotalAmount>
                    <IncomeType>Employment</IncomeType>
                    <EMPLOYERS>
                      <EMPLOYER>
                        <EmployerName>${emp.employerName || ''}</EmployerName>
                        <ADDRESS>
                          <AddressLineText>${emp.employerAddress || ''}</AddressLineText>
                        </ADDRESS>
                        <EMPLOYMENT>
                          <EmploymentPositionDescription>${emp.position || ''}</EmploymentPositionDescription>
                          <EmploymentStartDate>${emp.startDate || ''}</EmploymentStartDate>
                          <EmploymentEndDate>${emp.endDate || ''}</EmploymentEndDate>
                          <EmploymentClassificationType>${emp.selfEmployed ? 'SelfEmployed' : 'Primary'}</EmploymentClassificationType>
                          <EmploymentMonthlyIncomeAmount>${emp.monthlyIncome || '0'}</EmploymentMonthlyIncomeAmount>
                        </EMPLOYMENT>
                      </EMPLOYER>
                    </EMPLOYERS>
                  </INCOME>`)).join('\n')}
                </INCOMES>
              </QUALIFICATION>
            </LOAN>
          </LOANS>
          <COLLATERALS>
            <COLLATERAL>
              <SUBJECT_PROPERTY>
                <ADDRESS>
                  <AddressLineText>${formData.property?.addressLine || ''}</AddressLineText>
                  <CityName>${formData.property?.city || ''}</CityName>
                  <StateCode>${formData.property?.state || ''}</StateCode>
                  <PostalCode>${formData.property?.zipCode || ''}</PostalCode>
                </ADDRESS>
                <PROPERTY_DETAIL>
                  <PropertyEstimatedValueAmount>${formData.propertyValue || '0'}</PropertyEstimatedValueAmount>
                  <PropertyExistingCleanEnergyLienIndicator>false</PropertyExistingCleanEnergyLienIndicator>
                  <PropertyInProjectIndicator>false</PropertyInProjectIndicator>
                  <PropertyUsageType>${formData.propertyUse || ''}</PropertyUsageType>
                  <AttachmentType>${formData.propertyType || ''}</AttachmentType>
                  <PropertyBuiltYear>${formData.yearBuilt || ''}</PropertyBuiltYear>
                  <PropertyEstateType>FeeSimple</PropertyEstateType>
                  <FinancedUnitCount>${formData.unitsCount || '1'}</FinancedUnitCount>
                </PROPERTY_DETAIL>
              </SUBJECT_PROPERTY>
            </COLLATERAL>
          </COLLATERALS>
          <LIABILITIES>
${(formData.borrowers || []).flatMap(borrower => 
    (borrower.liabilities || []).map((liability, index) => `            <LIABILITY>
              <LIABILITY_DETAIL>
                <LiabilityAccountIdentifier>${liability.accountNumber || ''}</LiabilityAccountIdentifier>
                <LiabilityMonthlyPaymentAmount>${liability.monthlyPayment || '0'}</LiabilityMonthlyPaymentAmount>
                <LiabilityPayoffStatusIndicator>false</LiabilityPayoffStatusIndicator>
                <LiabilityType>${liability.liabilityType || ''}</LiabilityType>
                <LiabilityUnpaidBalanceAmount>${liability.unpaidBalance || '0'}</LiabilityUnpaidBalanceAmount>
              </LIABILITY_DETAIL>
              <LIABILITY_HOLDER>
                <NAME>
                  <FullName>${liability.creditorName || ''}</FullName>
                </NAME>
              </LIABILITY_HOLDER>
            </LIABILITY>`)).join('\n')}
          </LIABILITIES>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`;

  return xml;
};

/**
 * Download MISMO 3.4 Closing XML file
 */
export const downloadMISMO34Closing = (formData) => {
  const xml = exportToMISMO34Closing(formData);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `MISMO-3.4-Closing-${formData.applicationNumber || 'PENDING'}-${Date.now()}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download MISMO 3.4 FNM XML file
 */
export const downloadMISMO34FNM = (formData) => {
  const xml = exportToMISMO34FNM(formData);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `MISMO-3.4-FNM-${formData.applicationNumber || 'PENDING'}-${Date.now()}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download XML file (legacy - kept for backwards compatibility)
 */
export const downloadXML = (formData, format = 'closing') => {
  if (format === 'fnm') {
    downloadMISMO34FNM(formData);
  } else {
    downloadMISMO34Closing(formData);
  }
};

/**
 * Print application in URLA format
 */
export const printURLAFormat = (formData) => {
  const printWindow = window.open('', '_blank');
  
  const html = generateURLAHTML(formData);
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load before printing
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
  };
};

/**
 * Generate URLA-formatted HTML
 */
const generateURLAHTML = (formData) => {
  const borrowers = formData.borrowers || [];
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Uniform Residential Loan Application - Form 1003</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in;
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 10pt;
      line-height: 1.3;
      color: #000;
      margin: 0;
      padding: 20px;
      background: white;
    }
    
    .urla-container {
      max-width: 8.5in;
      margin: 0 auto;
      background: white;
    }
    
    .urla-header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    
    .urla-header h1 {
      font-size: 14pt;
      font-weight: bold;
      margin: 0 0 5px 0;
    }
    
    .urla-header .subtitle {
      font-size: 11pt;
      margin: 5px 0;
    }
    
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .section-header {
      background: #e8e6df;
      padding: 5px 10px;
      font-weight: bold;
      font-size: 11pt;
      border: 1px solid #000;
      margin-bottom: 10px;
    }
    
    .field-row {
      display: flex;
      margin-bottom: 8px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
    }
    
    .field-label {
      font-weight: bold;
      min-width: 180px;
      font-size: 9pt;
    }
    
    .field-value {
      flex: 1;
      font-size: 10pt;
    }
    
    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 15px;
    }
    
    .grid-3col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .subsection {
      margin: 15px 0;
      padding: 10px;
      border: 1px solid #ddd;
      background: #fafafa;
    }
    
    .subsection-header {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 10px;
      color: #2c5f2d;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 9pt;
    }
    
    table th {
      background: #e8e6df;
      padding: 6px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #000;
    }
    
    table td {
      padding: 6px;
      border: 1px solid #ccc;
    }
    
    .checkbox {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 1px solid #000;
      margin-right: 5px;
      vertical-align: middle;
    }
    
    .checkbox.checked::after {
      content: '✓';
      display: block;
      text-align: center;
      line-height: 12px;
      font-weight: bold;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #000;
      font-size: 8pt;
      text-align: center;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="urla-container">
    <!-- Header -->
    <div class="urla-header">
      <h1>Uniform Residential Loan Application</h1>
      <div class="subtitle">Form 1003 - Fannie Mae/Freddie Mac</div>
      <div class="subtitle">Application Number: ${formData.applicationNumber || 'PENDING'}</div>
    </div>

    <!-- Section 1: Loan Information -->
    <div class="section">
      <div class="section-header">1. LOAN INFORMATION</div>
      <div class="grid-2col">
        <div>
          <div class="field-row">
            <span class="field-label">Loan Purpose:</span>
            <span class="field-value">${formData.loanPurpose || 'Not specified'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Loan Type:</span>
            <span class="field-value">${formData.loanType || 'Not specified'}</span>
          </div>
        </div>
        <div>
          <div class="field-row">
            <span class="field-label">Loan Amount:</span>
            <span class="field-value">$${Number(formData.loanAmount || 0).toLocaleString()}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Property Value:</span>
            <span class="field-value">$${Number(formData.propertyValue || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Property Information -->
    <div class="section">
      <div class="section-header">2. PROPERTY INFORMATION AND PURPOSE OF LOAN</div>
      <div class="field-row">
        <span class="field-label">Subject Property Address:</span>
        <span class="field-value">${formData.property?.addressLine || 'Not provided'}</span>
      </div>
      <div class="grid-3col">
        <div class="field-row">
          <span class="field-label">City:</span>
          <span class="field-value">${formData.property?.city || ''}</span>
        </div>
        <div class="field-row">
          <span class="field-label">State:</span>
          <span class="field-value">${formData.property?.state || ''}</span>
        </div>
        <div class="field-row">
          <span class="field-label">ZIP:</span>
          <span class="field-value">${formData.property?.zipCode || ''}</span>
        </div>
      </div>
      <div class="grid-3col">
        <div class="field-row">
          <span class="field-label">Property Type:</span>
          <span class="field-value">${formData.propertyUse || ''}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Year Built:</span>
          <span class="field-value">${formData.yearBuilt || ''}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Units:</span>
          <span class="field-value">${formData.unitsCount || '1'}</span>
        </div>
      </div>
    </div>

    <!-- Section 3: Borrower Information -->
    ${borrowers.map((borrower, index) => `
    <div class="section">
      <div class="section-header">3. BORROWER INFORMATION - ${index === 0 ? 'PRIMARY BORROWER' : `CO-BORROWER ${index}`}</div>
      
      <div class="grid-2col">
        <div class="field-row">
          <span class="field-label">First Name:</span>
          <span class="field-value">${borrower.firstName || ''}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Last Name:</span>
          <span class="field-value">${borrower.lastName || ''}</span>
        </div>
      </div>
      
      <div class="grid-3col">
        <div class="field-row">
          <span class="field-label">SSN:</span>
          <span class="field-value">***-**-${(borrower.ssn || '').slice(-4) || '****'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Date of Birth:</span>
          <span class="field-value">${borrower.dateOfBirth || ''}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Marital Status:</span>
          <span class="field-value">${borrower.maritalStatus || ''}</span>
        </div>
      </div>
      
      <div class="grid-2col">
        <div class="field-row">
          <span class="field-label">Email:</span>
          <span class="field-value">${borrower.email || ''}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Phone:</span>
          <span class="field-value">${borrower.phone || ''}</span>
        </div>
      </div>
      
      <div class="grid-2col">
        <div class="field-row">
          <span class="field-label">Citizenship:</span>
          <span class="field-value">${borrower.citizenshipType || ''}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Dependents:</span>
          <span class="field-value">${borrower.dependents || '0'}</span>
        </div>
      </div>

      <!-- Employment History -->
      ${(borrower.employmentHistory && borrower.employmentHistory.length > 0) ? `
      <div class="subsection">
        <div class="subsection-header">Employment History</div>
        <table>
          <thead>
            <tr>
              <th>Employer Name</th>
              <th>Position</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Monthly Income</th>
            </tr>
          </thead>
          <tbody>
            ${borrower.employmentHistory.map(emp => `
            <tr>
              <td>${emp.employerName || ''}</td>
              <td>${emp.position || ''}</td>
              <td>${emp.startDate || ''}</td>
              <td>${emp.endDate || 'Present'}</td>
              <td>$${Number(emp.monthlyIncome || 0).toLocaleString()}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Residence History -->
      ${(borrower.residences && borrower.residences.length > 0) ? `
      <div class="subsection">
        <div class="subsection-header">Residence History</div>
        <table>
          <thead>
            <tr>
              <th>Address</th>
              <th>City</th>
              <th>State</th>
              <th>ZIP</th>
              <th>Type</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${borrower.residences.map(res => `
            <tr>
              <td>${res.addressLine || ''}</td>
              <td>${res.city || ''}</td>
              <td>${res.state || ''}</td>
              <td>${res.zipCode || ''}</td>
              <td>${res.residencyType || ''}</td>
              <td>${res.durationMonths || '0'} months</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    </div>
    `).join('')}

    <!-- Section 4: Financial Information - Liabilities -->
    ${borrowers.some(b => b.liabilities && b.liabilities.length > 0) ? `
    <div class="section">
      <div class="section-header">4. FINANCIAL INFORMATION - LIABILITIES</div>
      <table>
        <thead>
          <tr>
            <th>Creditor Name</th>
            <th>Account Number</th>
            <th>Type</th>
            <th>Monthly Payment</th>
            <th>Unpaid Balance</th>
          </tr>
        </thead>
        <tbody>
          ${borrowers.flatMap(b => (b.liabilities || [])).map(liability => `
          <tr>
            <td>${liability.creditorName || ''}</td>
            <td>****${(liability.accountNumber || '').slice(-4) || '****'}</td>
            <td>${liability.liabilityType || ''}</td>
            <td>$${Number(liability.monthlyPayment || 0).toLocaleString()}</td>
            <td>$${Number(liability.unpaidBalance || 0).toLocaleString()}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Footer -->
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

