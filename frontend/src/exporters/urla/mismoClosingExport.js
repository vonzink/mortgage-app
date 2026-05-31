/**
 * MISMO 3.4 Closing format XML export
 */
import { XML_HEADER, downloadBlobAsFile } from './urlaHelpers';

/**
 * Generate XML in MISMO 3.4 Closing format
 */
export const exportToMISMO34Closing = (formData) => {
  const xml = `${XML_HEADER}<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" MISMOVersionID="3.4">
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
 * Download MISMO 3.4 Closing XML file
 */
export const downloadMISMO34Closing = (formData) => {
  const xml = exportToMISMO34Closing(formData);
  downloadBlobAsFile(
    xml,
    `MISMO-3.4-Closing-${formData.applicationNumber || 'PENDING'}-${Date.now()}.xml`
  );
};
