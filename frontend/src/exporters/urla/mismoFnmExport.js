/**
 * MISMO 3.4 FNM (Fannie Mae) format XML export
 */
import { XML_HEADER, downloadBlobAsFile } from './urlaHelpers';

/**
 * Generate XML in MISMO 3.4 FNM (Fannie Mae) format
 */
export const exportToMISMO34FNM = (formData) => {
  const xml = `${XML_HEADER}<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:fnm="http://www.fanniemae.com/loandelivery/schemas" MISMOVersionID="3.4">
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
 * Download MISMO 3.4 FNM XML file
 */
export const downloadMISMO34FNM = (formData) => {
  const xml = exportToMISMO34FNM(formData);
  downloadBlobAsFile(
    xml,
    `MISMO-3.4-FNM-${formData.applicationNumber || 'PENDING'}-${Date.now()}.xml`
  );
};
