/**
 * Borrower Information Step Component
 * Step 2: Personal details and residence history
 */
import React from 'react';
import { FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';
import FormSection from '../shared/FormSection';
import PersonalInfoField from '../form-fields/PersonalInfoField';
import AddressField from '../form-fields/AddressField';
import { 
  checkResidenceHistoryWarning
} from '../../utils/formHelpers';
import { 
  createDefaultResidence,
  createDefaultBorrower
} from '../../utils/fieldArrayHelpers';

const BorrowerInformationStep = ({ 
  register, 
  errors, 
  watch, 
  getValues, 
  setValue,
  borrowerFields,
  getFieldArray,
  appendBorrower,
  removeBorrower
}) => {
  const loanPurpose = watch('loanPurpose');

  const addBorrower = () => {
    console.log('[DEBUG] Before add - borrowerFields.length:', borrowerFields.length);
    if (borrowerFields.length < 4) {
      appendBorrower(createDefaultBorrower(borrowerFields.length + 1));
      console.log('[DEBUG] Added borrower. New length should be:', borrowerFields.length + 1);
    }
  };

  const removeBorrowerHandler = (index) => {
    if (borrowerFields.length > 1) {
      removeBorrower(index);
    }
  };

  return (
    <FormSection
      title="Borrower Information"
      icon={<FaUser />}
      description="Personal details and residence history for all borrowers."
    >
      {console.log('[DEBUG] Rendering borrowers. borrowerFields.length:', borrowerFields.length, 'borrowerFields:', borrowerFields)}
      {borrowerFields.map((borrowerField, borrowerIndex) => {
        // Always show borrower 1 (primary) and any borrowers that exist in the fields array
        // The fields array only contains borrowers explicitly added by the user
        return (
          <div key={borrowerField.id} className="borrower-section">
            <div className="borrower-header">
              <h4>Borrower {borrowerIndex + 1}</h4>
              {borrowerIndex > 0 && (
                <button
                  type="button"
                  onClick={() => removeBorrowerHandler(borrowerIndex)}
                  className="btn btn-outline-danger btn-sm"
                >
                  Remove Borrower
                </button>
              )}
            </div>

            <PersonalInfoField
              register={register}
              errors={errors}
              prefix={`borrowers.${borrowerIndex}`}
              required={borrowerIndex === 0}
            />

            {/* Relationship to Primary Borrower (only for co-borrowers) */}
            {borrowerIndex > 0 && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={`borrowers.${borrowerIndex}.relationshipToPrimaryBorrower`}>
                    Relationship to Primary Borrower
                  </label>
                  <select
                    id={`borrowers.${borrowerIndex}.relationshipToPrimaryBorrower`}
                    {...register(`borrowers.${borrowerIndex}.relationshipToPrimaryBorrower`)}
                  >
                    <option value="">Select Relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="BusinessPartner">Business Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}

            {/* Residence History Section */}
            <div className="residence-history-section">
              <h5>Residence History</h5>
              {(() => {
                const { fields: resFields, append: appendRes, remove: removeRes } = getFieldArray(borrowerIndex, 'residences');
                const warning = checkResidenceHistoryWarning(resFields);
                
                return (
                  <>
                    {warning.hasWarning && (
                      <div className="alert alert-warning">
                        <strong>Warning:</strong> Your residence history covers {Math.round(warning.totalDuration)} months. 
                        Most lenders require at least 24 months (2 years) of residence history.
                      </div>
                    )}
                    
                    {resFields.map((resField, resIndex) => (
                      <div key={resField.id} className="residence-entry">
                        <div className="residence-header">
                          <h6>Residence {resIndex + 1}</h6>
                          {resFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRes(resIndex)}
                              className="btn btn-outline-danger btn-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <AddressField
                          register={register}
                          errors={errors}
                          prefix={`borrowers.${borrowerIndex}.residences.${resIndex}`}
                          required={false}
                          label="Residence Address"
                        />

                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.residencyType`}>
                              Residency Type
                            </label>
                            <select
                              id={`borrowers.${borrowerIndex}.residences.${resIndex}.residencyType`}
                              {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.residencyType`)}
                            >
                              <option value="">Select Type</option>
                              <option value="Current">Current</option>
                              <option value="Prior">Prior</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.residencyBasis`}>
                              Residency Basis
                            </label>
                            <select
                              id={`borrowers.${borrowerIndex}.residences.${resIndex}.residencyBasis`}
                              {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.residencyBasis`)}
                            >
                              <option value="">Select Basis</option>
                              <option value="Own">Own</option>
                              <option value="Rent">Rent</option>
                              <option value="LivingRentFree">Living Rent Free</option>
                            </select>
                          </div>
                        </div>
                        
                        {watch(`borrowers.${borrowerIndex}.residences.${resIndex}.residencyType`) === 'Prior' ? (
                          <div className="form-row">
                            <div className="form-group">
                              <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.startDate`}>Start Date</label>
                              <input
                                type="date"
                                id={`borrowers.${borrowerIndex}.residences.${resIndex}.startDate`}
                                {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.startDate`)}
                              />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.endDate`}>End Date</label>
                              <input
                                type="date"
                                id={`borrowers.${borrowerIndex}.residences.${resIndex}.endDate`}
                                {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.endDate`)}
                              />
                            </div>
                            
                            {watch(`borrowers.${borrowerIndex}.residences.${resIndex}.residencyBasis`) === 'Rent' && (
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.monthlyRent`}>Monthly Rent</label>
                                <input
                                  type="number"
                                  id={`borrowers.${borrowerIndex}.residences.${resIndex}.monthlyRent`}
                                  {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.monthlyRent`)}
                                  placeholder="1500"
                                  min="0"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="form-row">
                            <div className="form-group">
                              <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.durationYears`}>Years</label>
                              <input
                                type="number"
                                id={`borrowers.${borrowerIndex}.residences.${resIndex}.durationYears`}
                                {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.durationYears`)}
                                placeholder="2"
                                min="0"
                                onChange={(e) => {
                                  const years = parseInt(e.target.value) || 0;
                                  const months = parseInt(getValues(`borrowers.${borrowerIndex}.residences.${resIndex}.durationMonthsOnly`)) || 0;
                                  const totalMonths = (years * 12) + months;
                                  setValue(`borrowers.${borrowerIndex}.residences.${resIndex}.durationMonths`, totalMonths);
                                }}
                              />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.durationMonthsOnly`}>Months</label>
                              <input
                                type="number"
                                id={`borrowers.${borrowerIndex}.residences.${resIndex}.durationMonthsOnly`}
                                {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.durationMonthsOnly`)}
                                placeholder="6"
                                min="0"
                                max="11"
                                onChange={(e) => {
                                  const months = parseInt(e.target.value) || 0;
                                  const years = parseInt(getValues(`borrowers.${borrowerIndex}.residences.${resIndex}.durationYears`)) || 0;
                                  const totalMonths = (years * 12) + months;
                                  setValue(`borrowers.${borrowerIndex}.residences.${resIndex}.durationMonths`, totalMonths);
                                }}
                              />
                            </div>
                            
                            {watch(`borrowers.${borrowerIndex}.residences.${resIndex}.residencyBasis`) === 'Rent' && (
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.monthlyRent`}>Monthly Rent</label>
                                <input
                                  type="number"
                                  id={`borrowers.${borrowerIndex}.residences.${resIndex}.monthlyRent`}
                                  {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.monthlyRent`)}
                                  placeholder="1500"
                                  min="0"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {resFields.length < 6 && (
                      <div className="form-row">
                        <div className="form-group">
                          <button
                            type="button"
                            onClick={() => appendRes(createDefaultResidence(resFields.length + 1))}
                            className="btn btn-outline-primary"
                          >
                            Add Another Residence
                          </button>
                        </div>
                        
                        {borrowerIndex > 0 && loanPurpose === 'Refinance' && (
                          <div className="form-group">
                            <div className="address-display-section">
                              <h6>Borrower 1's Current Residence Address:</h6>
                              <div className="address-display">
                                {(() => {
                                  const borrower1CurrentResidence = getValues('borrowers.0.residences.0');
                                  if (borrower1CurrentResidence?.addressLine && borrower1CurrentResidence?.city && borrower1CurrentResidence?.state && borrower1CurrentResidence?.zipCode) {
                                    return (
                                      <div className="address-info">
                                        <p><strong>Address:</strong> {borrower1CurrentResidence.addressLine}</p>
                                        <p><strong>City:</strong> {borrower1CurrentResidence.city}</p>
                                        <p><strong>State:</strong> {borrower1CurrentResidence.state}</p>
                                        <p><strong>ZIP:</strong> {borrower1CurrentResidence.zipCode}</p>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            appendRes({
                                              sequenceNumber: resFields.length + 1,
                                              residencyType: 'Prior',
                                              addressLine: borrower1CurrentResidence.addressLine,
                                              city: borrower1CurrentResidence.city,
                                              state: borrower1CurrentResidence.state,
                                              zipCode: borrower1CurrentResidence.zipCode,
                                              residencyBasis: borrower1CurrentResidence.residencyBasis,
                                              monthlyRent: borrower1CurrentResidence.monthlyRent,
                                              durationYears: borrower1CurrentResidence.durationYears,
                                              durationMonthsOnly: borrower1CurrentResidence.durationMonthsOnly,
                                              durationMonths: borrower1CurrentResidence.durationMonths
                                            });
                                            toast.success(`Borrower ${borrowerIndex + 1}'s residence populated from Borrower 1's current residence!`);
                                          }}
                                          className="btn btn-primary btn-sm"
                                        >
                                          Use This Address
                                        </button>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="address-info">
                                        <p className="text-muted">Borrower 1 must complete their current residence information first.</p>
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        );
      })}

      {borrowerFields.length < 4 && (
        <div className="add-borrower-section">
          <button
            type="button"
            onClick={addBorrower}
            className="btn btn-outline-primary"
          >
            Add Co-Borrower {borrowerFields.length + 1}
          </button>
        </div>
      )}
    </FormSection>
  );
};

export default BorrowerInformationStep;
