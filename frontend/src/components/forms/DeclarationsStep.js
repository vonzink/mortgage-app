/**
 * Declarations Step Component
 * Step 6: Mortgage declarations
 */
import React, { useState, useEffect } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import FormSection from '../shared/FormSection';

const DeclarationsStep = ({ 
  register, 
  errors, 
  watch, 
  getValues, 
  borrowerFields
}) => {
  const [activeBorrowerTab, setActiveBorrowerTab] = useState(0);
  
  // Clamp active borrower tab and show max 4 borrowers
  useEffect(() => {
    const maxIndex = Math.min(borrowerFields.length, 4) - 1;
    if (activeBorrowerTab > maxIndex) {
      setActiveBorrowerTab(Math.max(0, maxIndex));
    }
  }, [borrowerFields.length, activeBorrowerTab]);
  const visibleBorrowers = borrowerFields.slice(0, 4);

  const getBorrowerName = (index) => {
    const firstName = watch(`borrowers.${index}.firstName`);
    const lastName = watch(`borrowers.${index}.lastName`);
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim() || `Borrower ${index + 1}`;
    }
    return `Borrower ${index + 1}`;
  };

  // Helper component for declaration items with "Yes" indicator
  const DeclarationCheckbox = ({ name, label, borrowerIndex }) => {
    const isChecked = watch(name);
    return (
      <div className="declaration-item">
        <label className="declaration-label">
          <input
            type="checkbox"
            {...register(name)}
            className="declaration-checkbox"
          />
          <span className="declaration-text">
            {label}
          </span>
        </label>
        {isChecked && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--success-color, green)', 
            marginTop: '0.25rem', 
            marginLeft: '1.75rem', 
            fontWeight: '600' 
          }}>
            Yes
          </div>
        )}
      </div>
    );
  };

  return (
    <FormSection
      title="Mortgage Declarations"
      icon={<FaFileAlt />}
      description="Please answer all declaration questions accurately."
    >
      {/* Borrower Tabs */}
      <div className="borrower-tabs" style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        borderBottom: '2px solid var(--border-color)',
        flexWrap: 'wrap'
      }}>
        {visibleBorrowers.map((borrowerField, borrowerIndex) => (
          <button
            key={borrowerField.id}
            type="button"
            onClick={() => setActiveBorrowerTab(borrowerIndex)}
            className={`borrower-tab ${activeBorrowerTab === borrowerIndex ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderBottom: activeBorrowerTab === borrowerIndex ? '3px solid var(--primary-color)' : '3px solid transparent',
              background: activeBorrowerTab === borrowerIndex ? 'var(--bg-secondary)' : 'transparent',
              cursor: 'pointer',
              fontWeight: activeBorrowerTab === borrowerIndex ? '600' : '400',
              color: activeBorrowerTab === borrowerIndex ? 'var(--primary-color)' : 'var(--text-secondary)',
              transition: 'all 0.2s',
              position: 'relative',
              marginBottom: '-2px'
            }}
          >
            {getBorrowerName(borrowerIndex)}
          </button>
        ))}
      </div>

      {visibleBorrowers.map((borrowerField, borrowerIndex) => {
        // Only show the active borrower tab
        if (borrowerIndex !== activeBorrowerTab) return null;

        return (
          <div key={borrowerField.id} className="borrower-declarations-section">

            <div className="declarations-grid">
              {/* About This Property And Your Money For This Loan */}
              <div className="declaration-group">
                <h5>About This Property And Your Money For This Loan</h5>
                
                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.occupyPrimaryResidence`}
                  label="Will you occupy the property as your primary residence?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.ownershipInterestThreeYears`}
                  label="If YES, have you had an ownership interest in another property in the last three years?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.familyBusinessAffiliation`}
                  label="If this is a Purchase Transaction: Do you have a family relationship or business affiliation with the seller of the property?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.borrowingMoneyTransaction`}
                  label="Are you borrowing any money for this real estate transaction (e.g., money for your closing costs or down payment) or obtaining any money from another party, such as the seller or realtor, that you have not disclosed on this loan application?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.applyingMortgageOtherProperty`}
                  label="Have you or will you be applying for a mortgage loan on another property (not the property securing this loan) on or before closing this transaction that is not disclosed on this loan application?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.applyingNewCredit`}
                  label="Have you or will you be applying for any new credit (e.g., installment loan, credit card, etc.) on or before closing this loan that is not disclosed on this application?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.propertySubjectLien`}
                  label="Will this property be subject to a lien that could take priority over the first mortgage lien, such as a clean energy lien paid through your property taxes (e.g., the Property Assessed Clean Energy Program)?"
                  borrowerIndex={borrowerIndex}
                />
              </div>

              {/* About Your Finances */}
              <div className="declaration-group">
                <h5>About Your Finances</h5>
                
                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.coSignerGuarantor`}
                  label="Are you a co-signer or guarantor on any debt or loan that is not disclosed on this application?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.outstandingJudgments`}
                  label="Are there any outstanding judgments against you?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.delinquentFederalDebt`}
                  label="Are you currently delinquent or in default on a Federal debt?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.partyToLawsuit`}
                  label="Are you a party to a lawsuit in which you potentially have any personal financial liability?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.conveyedTitleLieuForeclosure`}
                  label="Have you conveyed title to any property in lieu of foreclosure in the past 7 years?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.preForeclosureSale`}
                  label="Within the past 7 years, have you completed a pre-foreclosure sale or short sale, whereby the property was sold to a third party and the Lender agreed to accept less than the outstanding mortgage balance due?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.propertyForeclosedSevenYears`}
                  label="Have you had property foreclosed upon in the last 7 years?"
                  borrowerIndex={borrowerIndex}
                />

                <DeclarationCheckbox
                  name={`borrowers.${borrowerIndex}.declaration.declaredBankruptcySevenYears`}
                  label="Have you declared bankruptcy within the past 7 years?"
                  borrowerIndex={borrowerIndex}
                />
              </div>
            </div>

            {/* Comments Section */}
            <div className="form-row">
              <div className="form-group" style={{ width: '100%' }}>
                <label htmlFor={`borrowers.${borrowerIndex}.comments`}>
                  Additional Comments or Information
                </label>
                <textarea
                  id={`borrowers.${borrowerIndex}.comments`}
                  {...register(`borrowers.${borrowerIndex}.comments`)}
                  placeholder="Please provide any additional information or comments..."
                  rows="4"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </FormSection>
  );
};

export default DeclarationsStep;
