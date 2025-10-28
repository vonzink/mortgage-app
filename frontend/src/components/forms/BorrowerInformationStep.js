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
import CurrencyInput from '../form-fields/CurrencyInput';
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
  const [activeResidenceTabs, setActiveResidenceTabs] = useState({});
  const isAddingRef = useRef(false);

  // Helper to get/set active residence tab for a borrower
  const getActiveResidenceTab = (borrowerIndex) => activeResidenceTabs[borrowerIndex] || 0;
  const setActiveResidenceTab = (borrowerIndex, tabIndex) => {
    setActiveResidenceTabs(prev => ({ ...prev, [borrowerIndex]: tabIndex }));
  };

  // Track borrower count changes
  useEffect(() => {
    console.log('[DEBUG] borrowerFields changed. Count:', borrowerFields.length);
  }, [borrowerFields.length]);

  // Clamp active borrower tab and limit visible borrowers to 4
  useEffect(() => {
    const maxIndex = Math.min(borrowerFields.length, 4) - 1;
    if (activeBorrowerTab > maxIndex) {
      setActiveBorrowerTab(Math.max(0, maxIndex));
    }
  }, [borrowerFields.length, activeBorrowerTab]);

  const visibleBorrowers = borrowerFields.slice(0, 4);

  const addBorrower = () => {
    if (isAddingRef.current) {
      console.log('[DEBUG] Already adding borrower, ignoring duplicate call');
      return;
    }
    
    console.log('[DEBUG] addBorrower called. Current count:', borrowerFields.length);
    
    if (borrowerFields.length < 2) {
      isAddingRef.current = true;
      appendBorrower(createDefaultBorrower(borrowerFields.length + 1));
      console.log('[DEBUG] appendBorrower called. New length should be:', borrowerFields.length + 1);
      
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

  // Bubble tab styles
  const bubbleTabStyle = (isActive) => ({
    padding: '0.6rem 1.2rem',
    border: 'none',
    borderRadius: '20px',
    background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0',
    color: isActive ? 'white' : '#666',
    cursor: 'pointer',
    fontWeight: isActive ? '600' : '500',
    fontSize: '0.9rem',
    transition: 'all 0.3s ease',
    boxShadow: isActive ? '0 4px 15px rgba(102, 126, 234, 0.4)' : '0 2px 5px rgba(0,0,0,0.1)',
    transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
    marginRight: '0.75rem',
    marginBottom: '0.5rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  });

  return (
    <FormSection
      title="Borrower Information"
      icon={<FaUser />}
      description="Personal details and residence history for all borrowers."
    >
      {/* Borrower 1 header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '1rem' }}>
        <h5 style={{ margin: 0 }}>Borrower 1</h5>
      </div>

      {console.log('[DEBUG] Rendering borrowers. borrowerFields.length:', borrowerFields.length, 'borrowerFields:', borrowerFields)}
      {/* Always render Borrower 1 fields */}
      {visibleBorrowers[0] && (
        <div key={visibleBorrowers[0].id} className="borrower-section">
            {/* Borrower 1 can't be removed */}
            {false && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {}}
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
              prefix={`borrowers.0`}
              required={true}
            />

            {/* Occupancy question removed per request */}

            {/* Relationship to Primary Borrower (only for co-borrowers) */}
            {false && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={`borrowers.0.relationshipToPrimaryBorrower`}>
                    Relationship to Primary Borrower
                  </label>
                  <select
                    id={`borrowers.0.relationshipToPrimaryBorrower`}
                    {...register(`borrowers.0.relationshipToPrimaryBorrower`)}
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
            <div className="residence-history-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid var(--border-color)' }}>
              <h5 style={{ marginBottom: '1rem' }}>Residence History</h5>
              {(() => {
                const { fields: resFields, append: appendRes, remove: removeRes } = getFieldArray(0, 'residences');
                const warning = checkResidenceHistoryWarning(resFields);
                const activeResidenceTab = getActiveResidenceTab(0);

                return (
                  <>
                    {/* For co-borrowers: show primary borrower current address with quick-copy */}
                    {false && (
                      <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>Primary Borrower Current Address:</strong>
                            <div style={{ fontSize: '0.9rem' }}>
                              {(() => {
                                const p = getValues('borrowers.0.residences.0') || {};
                                if (p.addressLine || p.city || p.state || p.zipCode) {
                                  return (
                                    <span>
                                      {p.addressLine || ''} {p.city ? `, ${p.city}` : ''} {p.state || ''} {p.zipCode || ''}
                                    </span>
                                  );
                                }
                                return <span>Not provided yet.</span>;
                              })()}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => {
                              const src = getValues('borrowers.0.residences.0');
                              if (!src) return;
                              // Ensure at least one residence exists for this borrower
                              if (!resFields || resFields.length === 0) {
                                appendRes(createDefaultResidence(1, 'Current'));
                              }
                              setValue(`borrowers.0.residences.0.addressLine`, src.addressLine || '');
                              setValue(`borrowers.0.residences.0.city`, src.city || '');
                              setValue(`borrowers.0.residences.0.state`, src.state || '');
                              setValue(`borrowers.0.residences.0.zipCode`, src.zipCode || '');
                              setValue(`borrowers.0.residences.0.residencyType`, 'Current');
                              setActiveResidenceTab(0, 0);
                              toast && toast.success && toast.success('Copied primary borrower current address');
                            }}
                          >
                            Use Primary Borrower Address
                          </button>
                        </div>
                      </div>
                    )}
                    {warning.hasWarning && (
                      <div className="alert alert-warning">
                        <strong>Warning:</strong> Your residence history covers {Math.round(warning.totalDuration)} months. 
                        Most lenders require at least 24 months (2 years) of residence history.
                      </div>
                    )}
                    
                    {/* Residence Tabs - Only show tabs if there are multiple residences */}
                    {resFields.length > 1 && (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        marginBottom: '1.5rem',
                        marginTop: '1rem'
                      }}>
                        {resFields.map((resField, resIndex) => (
                          <button
                            key={resField.id}
                            type="button"
                            onClick={() => setActiveResidenceTab(0, resIndex)}
                            style={{
                              ...bubbleTabStyle(activeResidenceTab === resIndex),
                              background: activeResidenceTab === resIndex 
                                ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' 
                                : '#f0f0f0',
                              boxShadow: activeResidenceTab === resIndex 
                                ? '0 4px 15px rgba(240, 147, 251, 0.4)' 
                                : '0 2px 5px rgba(0,0,0,0.1)',
                            }}
                            onMouseEnter={(e) => {
                              if (activeResidenceTab !== resIndex) {
                                e.target.style.background = '#e0e0e0';
                                e.target.style.transform = 'translateY(-1px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (activeResidenceTab !== resIndex) {
                                e.target.style.background = '#f0f0f0';
                                e.target.style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            {resIndex === 0 ? 'Primary Address' : `Address ${resIndex + 1}`}
                            {resIndex === 0 && (
                              <span style={{ 
                                background: 'var(--primary-color)', 
                                color: 'white', 
                                padding: '0.125rem 0.5rem', 
                                borderRadius: '8px',
                                fontSize: '0.65rem',
                                fontWeight: '600'
                              }}>
                                PRIMARY
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {resFields.map((resField, resIndex) => {
                      // If only one residence (primary), always show it
                      // If multiple residences, only show the active tab
                      if (resFields.length > 1 && resIndex !== activeResidenceTab) return null;
                      
                      return (
                        <div key={resField.id} className="residence-entry">
                        <div className="residence-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h6 style={{ margin: 0 }}>{resIndex === 0 ? 'Primary Address' : `Address ${resIndex + 1}`}</h6>
                          {resFields.length > 1 && resIndex > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                removeRes(resIndex);
                                setActiveResidenceTab(0, 0);
                              }}
                              className="btn btn-outline-danger btn-sm"
                            >
                              Remove Address
                            </button>
                          )}
                        </div>

                        <AddressField
                          register={register}
                          errors={errors}
                          prefix={`borrowers.0.residences.${resIndex}`}
                          required={false}
                          label="Residence Address"
                        />

                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor={`borrowers.0.residences.${resIndex}.residencyType`}>
                              Residency Type
                            </label>
                            <select
                              id={`borrowers.0.residences.${resIndex}.residencyType`}
                              {...register(`borrowers.0.residences.${resIndex}.residencyType`)}
                            >
                              <option value="">Select Type</option>
                              <option value="Current">Current</option>
                              <option value="Prior">Prior</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label htmlFor={`borrowers.0.residences.${resIndex}.residencyBasis`}>
                              Residency Basis
                            </label>
                            <select
                              id={`borrowers.0.residences.${resIndex}.residencyBasis`}
                              {...register(`borrowers.0.residences.${resIndex}.residencyBasis`)}
                            >
                              <option value="">Select Basis</option>
                              <option value="Own">Own</option>
                              <option value="Rent">Rent</option>
                              <option value="LivingRentFree">Living Rent Free</option>
                            </select>
                          </div>
                        </div>
                        
                        {watch(`borrowers.0.residences.${resIndex}.residencyType`) === 'Prior' ? (
                          <div className="form-row">
                            <div className="form-group">
                              <label htmlFor={`borrowers.0.residences.${resIndex}.startDate`}>Start Date</label>
                              <input
                                type="date"
                                id={`borrowers.0.residences.${resIndex}.startDate`}
                                {...register(`borrowers.0.residences.${resIndex}.startDate`)}
                              />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor={`borrowers.0.residences.${resIndex}.endDate`}>End Date</label>
                              <input
                                type="date"
                                id={`borrowers.0.residences.${resIndex}.endDate`}
                                {...register(`borrowers.0.residences.${resIndex}.endDate`)}
                              />
                            </div>
                            
                            {watch(`borrowers.0.residences.${resIndex}.residencyBasis`) === 'Rent' && (
                              <div className="form-group">
                                <label htmlFor={`borrowers.0.residences.${resIndex}.monthlyRent`}>Monthly Rent</label>
                                <CurrencyInput
                                  id={`borrowers.0.residences.${resIndex}.monthlyRent`}
                                  name={`borrowers.0.residences.${resIndex}.monthlyRent`}
                                  value={watch(`borrowers.0.residences.${resIndex}.monthlyRent`) || ''}
                                  onChange={(e) => setValue(`borrowers.0.residences.${resIndex}.monthlyRent`, e.target.value)}
                                  placeholder="1,500.00"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="form-row">
                            <div className="form-group">
                              <label htmlFor={`borrowers.0.residences.${resIndex}.durationYears`}>Years</label>
                              <input
                                type="number"
                                id={`borrowers.0.residences.${resIndex}.durationYears`}
                                {...register(`borrowers.0.residences.${resIndex}.durationYears`)}
                                placeholder="2"
                                min="0"
                                onChange={(e) => {
                                  const years = parseInt(e.target.value) || 0;
                                  const months = parseInt(getValues(`borrowers.0.residences.${resIndex}.durationMonthsOnly`)) || 0;
                                  const totalMonths = (years * 12) + months;
                                  setValue(`borrowers.0.residences.${resIndex}.durationMonths`, totalMonths);
                                }}
                              />
                            </div>
                            
                            <div className="form-group">
                              <label htmlFor={`borrowers.0.residences.${resIndex}.durationMonthsOnly`}>Months</label>
                              <input
                                type="number"
                                id={`borrowers.0.residences.${resIndex}.durationMonthsOnly`}
                                {...register(`borrowers.0.residences.${resIndex}.durationMonthsOnly`)}
                                placeholder="6"
                                min="0"
                                max="11"
                                onChange={(e) => {
                                  const months = parseInt(e.target.value) || 0;
                                  const years = parseInt(getValues(`borrowers.0.residences.${resIndex}.durationYears`)) || 0;
                                  const totalMonths = (years * 12) + months;
                                  setValue(`borrowers.0.residences.${resIndex}.durationMonths`, totalMonths);
                                }}
                              />
                            </div>
                            
                            {watch(`borrowers.0.residences.${resIndex}.residencyBasis`) === 'Rent' && (
                              <div className="form-group">
                                <label htmlFor={`borrowers.0.residences.${resIndex}.monthlyRent`}>Monthly Rent</label>
                                <CurrencyInput
                                  id={`borrowers.0.residences.${resIndex}.monthlyRent`}
                                  name={`borrowers.0.residences.${resIndex}.monthlyRent`}
                                  value={watch(`borrowers.0.residences.${resIndex}.monthlyRent`) || ''}
                                  onChange={(e) => setValue(`borrowers.0.residences.${resIndex}.monthlyRent`, e.target.value)}
                                  placeholder="1,500.00"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}

                    {resFields.length < 6 && (
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            appendRes(createDefaultResidence(resFields.length + 1));
                            setActiveResidenceTab(0, resFields.length);
                          }}
                          className="btn btn-outline-primary"
                        >
                          Add Another Address
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            appendRes({ 
                              ...createDefaultResidence(resFields.length + 1),
                              residencyType: 'Mailing',
                              isMailing: true
                            });
                            setActiveResidenceTab(0, resFields.length);
                          }}
                          className="btn btn-outline-secondary"
                        >
                          Add Mailing Address
                        </button>
                      </div>
                    )}
                    
                    {resFields.length < 6 && (
                      <div className="form-row" style={{ display: 'none' }}>
                        <div className="form-group"></div>
                        <div className="form-group"></div>
                        
                        {false && loanPurpose === 'Refinance' && (
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
                                            toast.success(`Borrower 2's residence populated from Borrower 1's current residence!`);
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
      )}
    </FormSection>
  );
};

export default BorrowerInformationStep;
