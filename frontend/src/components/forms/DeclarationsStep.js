/**
 * Declarations Step Component
 * Step 6: Mortgage declarations
 */
import React from 'react';
import { FaFileAlt } from 'react-icons/fa';
import FormSection from '../shared/FormSection';

const DeclarationsStep = ({ 
  register, 
  errors, 
  watch, 
  getValues, 
  borrowerFields
}) => {
  return (
    <FormSection
      title="Mortgage Declarations"
      icon={<FaFileAlt />}
      description="Please answer all declaration questions accurately."
    >
      {borrowerFields.map((borrowerField, borrowerIndex) => {
        const borrower = getValues(`borrowers.${borrowerIndex}`);
        const hasBorrowerData = borrower?.firstName || borrower?.lastName;
        
        // Only show borrower declarations if they have data or it's the first borrower
        if (!hasBorrowerData && borrowerIndex > 0) {
          return null;
        }

        return (
          <div key={borrowerField.id} className="borrower-declarations-section">
            <h4>Borrower {borrowerIndex + 1} - Declarations</h4>

            <div className="declarations-grid">
              {/* Bankruptcy and Legal Issues */}
              <div className="declaration-group">
                <h5>Bankruptcy and Legal Issues</h5>
                
                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.bankruptcy`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Are you presently a party to a lawsuit?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.foreclosure`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Have you had property foreclosed upon or given title or deed in lieu thereof in the last 7 years?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.lawsuit`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Are you presently a party to a lawsuit?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.obligatedOnLoan`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Are you presently obligated to pay alimony, child support, or separate maintenance?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.delinquentFederalDebt`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Is any part of the down payment borrowed?
                    </span>
                  </label>
                </div>
              </div>

              {/* Citizenship and Residency */}
              <div className="declaration-group">
                <h5>Citizenship and Residency</h5>
                
                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.usCitizen`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Are you a U.S. citizen?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.permanentResident`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Are you a permanent resident alien?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.primaryResidence`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Will the property be your primary residence?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.ownershipInterest`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Do you intend to occupy the property as your principal dwelling?
                    </span>
                  </label>
                </div>
              </div>

              {/* Financial Information */}
              <div className="declaration-group">
                <h5>Financial Information</h5>
                
                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.downPaymentBorrowed`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Is any part of the down payment borrowed?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.coMakerEndorser`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Are you a co-maker or endorser on a note?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.downPaymentGift`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Is any part of the down payment a gift?
                    </span>
                  </label>
                </div>
              </div>

              {/* Additional Information */}
              <div className="declaration-group">
                <h5>Additional Information</h5>
                
                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.outstandingJudgments`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Are there any outstanding judgments against you?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.partyToLawsuit`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Are you a party to a lawsuit?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.propertyForeclosed`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Has any property owned by you been foreclosed upon?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.declaredBankruptcy`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Have you declared bankruptcy within the past 7 years?
                    </span>
                  </label>
                </div>

                <div className="declaration-item">
                  <label className="declaration-label">
                    <input
                      type="checkbox"
                      {...register(`borrowers.${borrowerIndex}.alimonyChildSupport`)}
                      className="declaration-checkbox"
                    />
                    <span className="declaration-text">
                      Are you obligated to pay alimony, child support, or separate maintenance?
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Co-Borrower Relationship (only for borrower 1) */}
            {borrowerIndex === 0 && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="coBorrowerRelationship">Relationship to Co-Borrower</label>
                  <select
                    id="coBorrowerRelationship"
                    {...register('coBorrowerRelationship')}
                  >
                    <option value="">Select Relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="BusinessPartner">Business Partner</option>
                    <option value="Other">Other</option>
                    <option value="None">No Co-Borrower</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </FormSection>
  );
};

export default DeclarationsStep;
