/**
 * Borrower Information Step Component
 * Step 2: Personal details and residence history
 *
 * Multi-borrower: borrowers[0] is the PRIMARY; borrowers[1..3] are CO-BORROWERS (joint
 * applicants). A tab strip switches the active borrower; "Add Co-Borrower" appends up to
 * a URLA-norm cap of 4 total. Co-borrowers additionally get a relationship dropdown, a
 * remove (✕) control, and a "Use Primary Borrower Address" quick-copy. All fields use the
 * per-index `borrowers.${i}.*` paths, so the existing react-hook-form wiring is unchanged.
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
import { debug } from '../../utils/debug';
import {
  createDefaultResidence,
  createDefaultBorrower
} from '../../utils/fieldArrayHelpers';
import { bubbleTabStyle } from '../shared/bubbleTabStyle';
// URLA norm: a loan supports up to 4 borrowers. The field-array hook
// (useBorrowerFieldArrays) only wires nested arrays for indices 0-3, so this is also
// the hard cap for which co-borrowers can carry employment/income/assets/etc.
// Shared visibility rule (primary-OR-active-OR-named) lives in utils so this step,
// EmploymentStep and AssetsLiabilitiesStep all hide empty borrower tabs identically.
import { MAX_BORROWERS, getVisibleBorrowers } from '../../utils/visibleBorrowers';

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
    debug('borrowerFields changed. Count:', borrowerFields.length);
  }, [borrowerFields.length]);

  // Clamp active borrower tab and limit visible borrowers to MAX_BORROWERS
  useEffect(() => {
    const maxIndex = Math.min(borrowerFields.length, MAX_BORROWERS) - 1;
    if (activeBorrowerTab > maxIndex) {
      setActiveBorrowerTab(Math.max(0, maxIndex));
    }
  }, [borrowerFields.length, activeBorrowerTab]);

  // Index-preserving visible list ({ field, index }) — primary, the active tab, and any
  // named co-borrower. Empty non-active co-borrowers are hidden. Real index retained so
  // downstream `borrowers.${index}.*` paths stay correct even when an earlier tab is hidden.
  const visibleBorrowers = getVisibleBorrowers(
    borrowerFields,
    activeBorrowerTab,
    (i) => watch(`borrowers.${i}.firstName`),
    (i) => watch(`borrowers.${i}.lastName`)
  );

  const addBorrower = () => {
    if (isAddingRef.current) {
      debug('Already adding borrower, ignoring duplicate call');
      return;
    }

    debug('addBorrower called. Current count:', borrowerFields.length);

    if (borrowerFields.length < MAX_BORROWERS) {
      isAddingRef.current = true;
      const newIndex = borrowerFields.length; // 0-based index of the borrower being added
      appendBorrower(createDefaultBorrower(newIndex + 1));
      debug('appendBorrower called. New length should be:', borrowerFields.length + 1);
      // Focus the freshly-added co-borrower tab.
      setActiveBorrowerTab(newIndex);

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

  // bubbleTabStyle imported from shared/bubbleTabStyle (audit M-4).

  /**
   * Render one borrower's full section (personal info + co-borrower relationship +
   * residence history). Parameterized by borrower index so the primary (i === 0) and
   * each co-borrower (i > 0) share identical field wiring under `borrowers.${i}.*`.
   */
  const renderBorrowerSection = (borrowerField, i) => {
    const isCoBorrower = i > 0;

    return (
      <div key={borrowerField.id} className="borrower-section">
        {/* Co-borrowers can be removed; the primary borrower cannot. */}
        {isCoBorrower && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => removeBorrowerHandler(i)}
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
          setValue={setValue}
          watch={watch}
          prefix={`borrowers.${i}`}
          required={true}
        />

        {/* Occupancy question removed per request */}

        {/* Relationship to Primary Borrower (only for co-borrowers) */}
        {isCoBorrower && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor={`borrowers.${i}.relationshipToPrimaryBorrower`}>
                Relationship to Primary Borrower
              </label>
              <select
                id={`borrowers.${i}.relationshipToPrimaryBorrower`}
                {...register(`borrowers.${i}.relationshipToPrimaryBorrower`)}
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
            const { fields: resFields, append: appendRes, remove: removeRes } = getFieldArray(i, 'residences');
            const warning = checkResidenceHistoryWarning(resFields);
            const activeResidenceTab = getActiveResidenceTab(i);

            return (
              <>
                {/* For co-borrowers: show primary borrower current address with quick-copy */}
                {isCoBorrower && (
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
                          setValue(`borrowers.${i}.residences.0.addressLine`, src.addressLine || '');
                          setValue(`borrowers.${i}.residences.0.city`, src.city || '');
                          setValue(`borrowers.${i}.residences.0.state`, src.state || '');
                          setValue(`borrowers.${i}.residences.0.zipCode`, src.zipCode || '');
                          setValue(`borrowers.${i}.residences.0.residencyType`, 'Current');
                          setActiveResidenceTab(i, 0);
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
                        className="form-tab"
                        onClick={() => setActiveResidenceTab(i, resIndex)}
                        style={bubbleTabStyle(activeResidenceTab === resIndex)}
                      >
                        {resIndex === 0 ? 'Primary Address' : `Address ${resIndex + 1}`}
                        {resIndex === 0 && (
                          <span style={{
                            background: 'var(--primary-color)',
                            color: '#0b231c',
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
                            setActiveResidenceTab(i, 0);
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
                      prefix={`borrowers.${i}.residences.${resIndex}`}
                      required={false}
                      label="Residence Address"
                      enableAutocomplete={true}
                      setValue={setValue}
                    />

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor={`borrowers.${i}.residences.${resIndex}.residencyType`}>
                          Residency Type
                        </label>
                        <select
                          id={`borrowers.${i}.residences.${resIndex}.residencyType`}
                          {...register(`borrowers.${i}.residences.${resIndex}.residencyType`)}
                        >
                          <option value="">Select Type</option>
                          <option value="Current">Current</option>
                          <option value="Prior">Prior</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor={`borrowers.${i}.residences.${resIndex}.residencyBasis`}>
                          Residency Basis
                        </label>
                        <select
                          id={`borrowers.${i}.residences.${resIndex}.residencyBasis`}
                          {...register(`borrowers.${i}.residences.${resIndex}.residencyBasis`)}
                        >
                          <option value="">Select Basis</option>
                          <option value="Own">Own</option>
                          <option value="Rent">Rent</option>
                          <option value="LivingRentFree">Living Rent Free</option>
                        </select>
                      </div>
                    </div>

                    {watch(`borrowers.${i}.residences.${resIndex}.residencyType`) === 'Prior' ? (
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`borrowers.${i}.residences.${resIndex}.startDate`}>Start Date</label>
                          <input
                            type="date"
                            id={`borrowers.${i}.residences.${resIndex}.startDate`}
                            {...register(`borrowers.${i}.residences.${resIndex}.startDate`)}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor={`borrowers.${i}.residences.${resIndex}.endDate`}>End Date</label>
                          <input
                            type="date"
                            id={`borrowers.${i}.residences.${resIndex}.endDate`}
                            {...register(`borrowers.${i}.residences.${resIndex}.endDate`)}
                          />
                        </div>

                        {watch(`borrowers.${i}.residences.${resIndex}.residencyBasis`) === 'Rent' && (
                          <div className="form-group">
                            <label htmlFor={`borrowers.${i}.residences.${resIndex}.monthlyRent`}>Monthly Rent</label>
                            <CurrencyInput
                              id={`borrowers.${i}.residences.${resIndex}.monthlyRent`}
                              name={`borrowers.${i}.residences.${resIndex}.monthlyRent`}
                              value={watch(`borrowers.${i}.residences.${resIndex}.monthlyRent`) || ''}
                              onChange={(e) => setValue(`borrowers.${i}.residences.${resIndex}.monthlyRent`, e.target.value)}
                              placeholder="1,500.00"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`borrowers.${i}.residences.${resIndex}.durationYears`}>Years</label>
                          <input
                            type="number"
                            id={`borrowers.${i}.residences.${resIndex}.durationYears`}
                            {...register(`borrowers.${i}.residences.${resIndex}.durationYears`)}
                            placeholder="2"
                            min="0"
                            onChange={(e) => {
                              const years = parseInt(e.target.value) || 0;
                              const months = parseInt(getValues(`borrowers.${i}.residences.${resIndex}.durationMonthsOnly`)) || 0;
                              const totalMonths = (years * 12) + months;
                              setValue(`borrowers.${i}.residences.${resIndex}.durationMonths`, totalMonths);
                            }}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor={`borrowers.${i}.residences.${resIndex}.durationMonthsOnly`}>Months</label>
                          <input
                            type="number"
                            id={`borrowers.${i}.residences.${resIndex}.durationMonthsOnly`}
                            {...register(`borrowers.${i}.residences.${resIndex}.durationMonthsOnly`)}
                            placeholder="6"
                            min="0"
                            max="11"
                            onChange={(e) => {
                              const months = parseInt(e.target.value) || 0;
                              const years = parseInt(getValues(`borrowers.${i}.residences.${resIndex}.durationYears`)) || 0;
                              const totalMonths = (years * 12) + months;
                              setValue(`borrowers.${i}.residences.${resIndex}.durationMonths`, totalMonths);
                            }}
                          />
                        </div>

                        {watch(`borrowers.${i}.residences.${resIndex}.residencyBasis`) === 'Rent' && (
                          <div className="form-group">
                            <label htmlFor={`borrowers.${i}.residences.${resIndex}.monthlyRent`}>Monthly Rent</label>
                            <CurrencyInput
                              id={`borrowers.${i}.residences.${resIndex}.monthlyRent`}
                              name={`borrowers.${i}.residences.${resIndex}.monthlyRent`}
                              value={watch(`borrowers.${i}.residences.${resIndex}.monthlyRent`) || ''}
                              onChange={(e) => setValue(`borrowers.${i}.residences.${resIndex}.monthlyRent`, e.target.value)}
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
                        setActiveResidenceTab(i, resFields.length);
                      }}
                      className="btn btn-outline-primary"
                    >
                      Add Another Address
                    </button>
                  </div>
                )}

                {/* Mailing address: same as present by default; reveal a dedicated
                    mailing AddressField (NOT a residences entry) when unchecked. */}
                <div className="mailing-address-section" style={{ marginTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      {...register(`borrowers.${i}.mailingSameAsPresent`)}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    <span>Mailing address same as present address</span>
                  </label>

                  {!watch(`borrowers.${i}.mailingSameAsPresent`) && (
                    <div style={{ marginTop: '1rem' }}>
                      <AddressField
                        register={register}
                        errors={errors}
                        prefix={`borrowers.${i}.mailingAddress`}
                        required={false}
                        label="Mailing Address"
                      />
                    </div>
                  )}
                </div>

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
    );
  };

  return (
    <FormSection
      title="Borrower Information"
      icon={<FaUser />}
      description="Personal details and residence history for all borrowers."
    >
      {debug('Rendering borrowers. borrowerFields.length:', borrowerFields.length, 'borrowerFields:', borrowerFields)}

      {/* Borrower tab strip: one tab per borrower (primary + co-borrowers), plus an
          "Add Co-Borrower" action capped at MAX_BORROWERS total. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
        {visibleBorrowers.map(({ field: borrowerField, index: i }) => (
          <button
            key={borrowerField.id}
            type="button"
            className="form-tab"
            onClick={() => setActiveBorrowerTab(i)}
            style={bubbleTabStyle(activeBorrowerTab === i)}
          >
            {i === 0 ? `${getBorrowerName(0)} (Primary)` : getBorrowerName(i)}
          </button>
        ))}

        {borrowerFields.length < MAX_BORROWERS && (
          <button
            type="button"
            onClick={addBorrower}
            className="btn btn-outline-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaPlus /> Add Co-Borrower
          </button>
        )}
      </div>

      {/* Active borrower header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h5 style={{ margin: 0 }}>
          {activeBorrowerTab === 0 ? 'Borrower 1 (Primary)' : `Co-Borrower ${activeBorrowerTab}`}
        </h5>
      </div>

      {/* Render only the active borrower's section; all borrowers' fields stay mounted in
          react-hook-form state via the per-index `borrowers.${i}.*` paths regardless.
          Index by the REAL field array (the active tab is always a valid borrower). */}
      {borrowerFields[activeBorrowerTab] &&
        renderBorrowerSection(borrowerFields[activeBorrowerTab], activeBorrowerTab)}
    </FormSection>
  );
};

export default BorrowerInformationStep;
