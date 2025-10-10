/**
 * Borrower Information Step Component
 * Step 2: Personal details and residence history
 */
import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaPlus, FaTimes } from 'react-icons/fa';
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
  const [activeBorrowerTab, setActiveBorrowerTab] = useState(0);
  const isAddingRef = useRef(false);

  // Track borrower count changes
  useEffect(() => {
    console.log('[DEBUG] borrowerFields changed. Count:', borrowerFields.length);
  }, [borrowerFields.length]);

  const addBorrower = () => {
    if (isAddingRef.current) {
      console.log('[DEBUG] Already adding borrower, ignoring duplicate call');
      return;
    }
    
    console.log('[DEBUG] addBorrower called. Current count:', borrowerFields.length);
    
    if (borrowerFields.length < 4) {
      isAddingRef.current = true;
      appendBorrower(createDefaultBorrower(borrowerFields.length + 1));
      console.log('[DEBUG] appendBorrower called. New length should be:', borrowerFields.length + 1);
      // Switch to the new borrower tab
      setActiveBorrowerTab(borrowerFields.length);
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isAddingRef.current = false;
      }, 500);
    }
  };

  const removeBorrowerHandler = (index) => {
    if (borrowerFields.length > 1) {
      removeBorrower(index);
      // Switch to previous tab if we removed the active one
      if (activeBorrowerTab >= index) {
        setActiveBorrowerTab(Math.max(0, activeBorrowerTab - 1));
      }
    }
  };

  const getBorrowerName = (index) => {
    const firstName = watch(`borrowers.${index}.firstName`);
    const lastName = watch(`borrowers.${index}.lastName`);
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim() || `Borrower ${index + 1}`;
    }
    return `Borrower ${index + 1}`;
  };

  return (
    <FormSection
      title="Borrower Information"
      icon={<FaUser />}
      description="Personal details and residence history for all borrowers."
    >
      {/* Borrower Tabs */}
      <div className="borrower-tabs" style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        borderBottom: '2px solid var(--border-color)',
        flexWrap: 'wrap'
      }}>
        {borrowerFields.map((borrowerField, borrowerIndex) => (
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
        
        {borrowerFields.length < 4 && (
          <button
            type="button"
            onClick={addBorrower}
            className="add-borrower-tab"
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500'
            }}
          >
            <FaPlus /> Add Co-Borrower
          </button>
        )}
      </div>

      {console.log('[DEBUG] Rendering borrowers. borrowerFields.length:', borrowerFields.length, 'borrowerFields:', borrowerFields)}
      {borrowerFields.map((borrowerField, borrowerIndex) => {
        // Only show the active borrower tab
        if (borrowerIndex !== activeBorrowerTab) return null;
        
        return (
          <div key={borrowerField.id} className="borrower-section">
            {borrowerIndex > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => removeBorrowerHandler(borrowerIndex)}
                  className="btn btn-outline-danger btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FaTimes /> Remove This Borrower
                </button>
              </div>
            )}

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
    </FormSection>
  );
};

export default BorrowerInformationStep;
