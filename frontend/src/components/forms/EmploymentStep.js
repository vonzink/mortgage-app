/**
 * Employment Step Component
 * Step 4: Employment and income details
 */
import React, { useState, useEffect } from 'react';
import { FaBriefcase } from 'react-icons/fa';
import FormSection from '../shared/FormSection';
import CurrencyInput from '../form-fields/CurrencyInput';
import { 
  checkEmploymentHistoryWarning
} from '../../utils/formHelpers';
import {
  createDefaultEmployment,
  createDefaultIncomeSource
} from '../../utils/fieldArrayHelpers';
import { bubbleTabStyle } from '../shared/bubbleTabStyle';
import { getVisibleBorrowers } from '../../utils/visibleBorrowers';

const EmploymentStep = ({
  register, 
  errors, 
  watch, 
  getValues, 
  setValue,
  getFieldArray,
  borrowerFields
}) => {
  const [activeBorrowerTab, setActiveBorrowerTab] = useState(0);
  const [activeEmploymentTabs, setActiveEmploymentTabs] = useState({});

  const getBorrowerName = (index) => {
    const firstName = watch(`borrowers.${index}.firstName`);
    const lastName = watch(`borrowers.${index}.lastName`);
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim() || `Borrower ${index + 1}`;
    }
    return `Borrower ${index + 1}`;
  };

  // Borrower-tab visibility: primary-OR-active-OR-named (shared rule, identical to the
  // Borrower Information and Assets & Liabilities steps). Index-preserving { field, index }
  // entries so each shown tab maps to its REAL borrower index for `borrowers.${index}.*`.
  const visibleBorrowers = getVisibleBorrowers(
    borrowerFields,
    activeBorrowerTab,
    (i) => watch(`borrowers.${i}.firstName`),
    (i) => watch(`borrowers.${i}.lastName`)
  );

  // Clamp the active tab to a real borrower index (active is a real field index, not a
  // position in the filtered visible list). Borrower count is capped at 4 to match the
  // wired field arrays.
  useEffect(() => {
    const maxIndex = Math.min(borrowerFields.length, 4) - 1;
    if (activeBorrowerTab > maxIndex) {
      setActiveBorrowerTab(Math.max(0, maxIndex));
    }
  }, [borrowerFields.length, activeBorrowerTab]);

  // bubbleTabStyle imported from shared/bubbleTabStyle (audit M-4).

  return (
    <FormSection
      title="Employment & Income"
      icon={<FaBriefcase />}
      description="Employment history and income details for all borrowers."
    >
      {/* Borrower Tabs — hidden when only one borrower exists */}
      {visibleBorrowers.length > 1 && (
      <div className="borrower-tabs" style={{
        display: 'flex',
        flexWrap: 'wrap',
        marginBottom: '2rem',
        marginTop: '1rem'
      }}>
        {visibleBorrowers.map(({ field: borrowerField, index: borrowerIndex }) => (
          <button
            key={borrowerField.id}
            type="button"
            className="form-tab"
            onClick={() => setActiveBorrowerTab(borrowerIndex)}
            style={bubbleTabStyle(activeBorrowerTab === borrowerIndex)}
          >
            {getBorrowerName(borrowerIndex)}
          </button>
        ))}
      </div>
      )}

      {visibleBorrowers.map(({ field: borrowerField, index: borrowerIndex }) => {
        // Only show the active borrower tab
        if (borrowerIndex !== activeBorrowerTab) return null;

        const { fields: empFields, append: appendEmp, remove: removeEmp } = getFieldArray(borrowerIndex, 'employmentHistory');
        const { fields: incomeFields, append: appendIncome, remove: removeIncome } = getFieldArray(borrowerIndex, 'incomeSources');
        // Compute the 2-year warning from LIVE values (watch), not the react-hook-form
        // `fields` snapshot — the snapshot doesn't reflect typed start/end dates, so the
        // warning would never update as the borrower fills the form.
        const warning = checkEmploymentHistoryWarning(watch(`borrowers.${borrowerIndex}.employmentHistory`) || []);

        // Get or initialize the active employment tab for this borrower
        const activeEmploymentTab = activeEmploymentTabs[borrowerIndex] ?? 0;
        const setActiveEmploymentTab = (empIndex) => {
          setActiveEmploymentTabs(prev => ({ ...prev, [borrowerIndex]: empIndex }));
        };
        
        return (
          <div key={borrowerField.id} className="borrower-employment-section">

            {/* Employment history — always shown (no situation gate). The Other /
                Non-Employment Income section below is always available too, so a borrower
                records jobs and/or non-employment income without picking a "situation". */}
            {/* Employment Tabs */}
            {empFields.length > 1 && (
              <div className="employment-tabs" style={{ 
                display: 'flex', 
                flexWrap: 'wrap',
                marginBottom: '1.5rem',
                marginTop: '1rem'
              }}>
                {empFields.map((empField, empIndex) => {
                  const employerName = watch(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerName`);
                  const employmentStatus = watch(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employmentStatus`);
                  const displayName = employerName || `Employer ${empIndex + 1}`;
                  
                  return (
                    <button
                      key={empField.id}
                      type="button"
                      className="form-tab"
                      onClick={() => setActiveEmploymentTab(empIndex)}
                      style={bubbleTabStyle(activeEmploymentTab === empIndex)}
                    >
                      {displayName}
                      {employmentStatus && (
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          background: employmentStatus === 'Present' ? 'var(--success-color)' : 'var(--warning-color)',
                          color: '#0b231c',
                          fontWeight: '600'
                        }}>
                          {employmentStatus}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            
            {empFields.map((empField, empIndex) => {
              // Only show the active employment tab if there are multiple employers
              if (empFields.length > 1 && empIndex !== activeEmploymentTab) return null;
              
              const employerName = watch(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerName`);
              const displayName = employerName || `Employer ${empIndex + 1}`;
              
              return (
              <div key={empField.id} className="employment-entry">
                <div className="employment-header">
                  <h5>{displayName}</h5>
                  {empFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmp(empIndex)}
                      className="btn btn-outline-danger btn-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerName`}>
                      Employer Name
                    </label>
                    <input
                      type="text"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerName`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerName`)}
                      placeholder="ABC Company"
                      className={errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.employerName ? 'error' : ''}
                    />
                    {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.employerName && (
                      <span className="error-message" role="alert">
                        {errors.borrowers[borrowerIndex].employmentHistory[empIndex].employerName.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.position`}>
                      Position/Title
                    </label>
                    <input
                      type="text"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.position`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.position`)}
                      placeholder="Software Engineer"
                      className={errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.position ? 'error' : ''}
                    />
                    {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.position && (
                      <span className="error-message" role="alert">
                        {errors.borrowers[borrowerIndex].employmentHistory[empIndex].position.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.startDate`}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.startDate`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.startDate`)}
                      className={errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.startDate ? 'error' : ''}
                    />
                    {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.startDate && (
                      <span className="error-message" role="alert">
                        {errors.borrowers[borrowerIndex].employmentHistory[empIndex].startDate.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employmentStatus`}>
                      Employment Status
                    </label>
                    <select
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employmentStatus`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employmentStatus`)}
                      className={errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.employmentStatus ? 'error' : ''}
                    >
                      <option value="">Select Status</option>
                      <option value="Present">Present</option>
                      <option value="Prior">Prior</option>
                    </select>
                    {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.employmentStatus && (
                      <span className="error-message" role="alert">
                        {errors.borrowers[borrowerIndex].employmentHistory[empIndex].employmentStatus.message}
                      </span>
                    )}
                  </div>

                  {watch(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employmentStatus`) === 'Prior' && (
                    <div className="form-group">
                      <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.endDate`}>
                        End Date
                      </label>
                      <input
                        type="date"
                        id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.endDate`}
                        {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.endDate`)}
                        className={errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.endDate ? 'error' : ''}
                      />
                      {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.endDate && (
                        <span className="error-message" role="alert">
                          {errors.borrowers[borrowerIndex].employmentHistory[empIndex].endDate.message}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.monthlyIncome`}>
                      Monthly Income
                    </label>
                    <CurrencyInput
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.monthlyIncome`}
                      name={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.monthlyIncome`}
                      value={watch(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.monthlyIncome`) || ''}
                      onChange={(e) => setValue(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.monthlyIncome`, e.target.value)}
                      placeholder="5,000.00"
                      className={errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.monthlyIncome ? 'error' : ''}
                    />
                    {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.monthlyIncome && (
                      <span className="error-message" role="alert">
                        {errors.borrowers[borrowerIndex].employmentHistory[empIndex].monthlyIncome.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.selfEmployed`)}
                      />
                      {' '}Self-Employed
                    </label>
                  </div>
                </div>

                {watch(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.selfEmployed`) && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.businessType`}>
                        Business Type
                      </label>
                      <select
                        id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.businessType`}
                        {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.businessType`)}
                        className={errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.businessType ? 'error' : ''}
                      >
                        <option value="">Select Business Type</option>
                        <option value="SoleProprietorship">Sole Proprietorship</option>
                        <option value="LLC">Limited Liability Company (LLC)</option>
                        <option value="SCorp">S-Corporation</option>
                        <option value="Corporation">Corporation</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.businessType && (
                        <span className="error-message" role="alert">
                          {errors.borrowers[borrowerIndex].employmentHistory[empIndex].businessType.message}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerAddress`}>
                      Employer Address
                    </label>
                    <input
                      type="text"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerAddress`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerAddress`)}
                      placeholder="123 Business St, City, State 12345"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerPhone`}>
                      Employer Phone
                    </label>
                    <input
                      type="tel"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerPhone`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerPhone`)}
                      placeholder="123-456-7890"
                    />
                  </div>
                </div>
              </div>
              );
            })}

            {empFields.length === 0 && (
              <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
                Add each job and income source for this borrower so we can
                verify their ability to repay.
              </p>
            )}
            {/* Subtle nudge to add prior employment when history is under 2 years.
                Computed from live values, so it disappears the moment 24 months is reached. */}
            {warning.hasWarning && (
              <p className="history-hint" role="note">
                Lenders typically need <strong>2 years</strong> of employment history — you have about{' '}
                {Math.round(warning.totalDuration)} month{Math.round(warning.totalDuration) === 1 ? '' : 's'}.
                Add a prior employer to cover the gap.
              </p>
            )}
            {empFields.length < 5 && (
              <div className="form-row">
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => appendEmp(createDefaultEmployment(empFields.length + 1, 'Prior'))}
                    className="btn btn-outline-primary"
                  >
                    Add Employer
                  </button>
                </div>
              </div>
            )}
            {/* Other / non-employment income — wires the borrower's incomeSources array.
                Always rendered alongside employment history. Rows flow through
                suiteApplicationPayload.buildOtherIncome → mapIncomeType → suite IncomeType. */}
            <div className="income-sources-section" style={{ marginTop: '1.5rem' }}>
              <h5>Other / Non-Employment Income</h5>
              <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
                Add any income that doesn&apos;t come from an employer (e.g. Social
                Security, pension, child support). Optional.
              </p>

              {incomeFields.map((incomeField, incIndex) => (
                <div key={incomeField.id} className="income-source-entry">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor={`borrowers.${borrowerIndex}.incomeSources.${incIndex}.incomeType`}>
                        Income Type
                      </label>
                      <select
                        id={`borrowers.${borrowerIndex}.incomeSources.${incIndex}.incomeType`}
                        {...register(`borrowers.${borrowerIndex}.incomeSources.${incIndex}.incomeType`)}
                      >
                        <option value="">Select Income Type</option>
                        <option value="SocialSecurity">Social Security</option>
                        <option value="Pension">Pension</option>
                        <option value="Disability">Disability</option>
                        <option value="Unemployment">Unemployment</option>
                        <option value="ChildSupport">Child Support</option>
                        <option value="Alimony">Alimony</option>
                        <option value="Investment">Dividends / Interest</option>
                        <option value="Rental">Rental</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`borrowers.${borrowerIndex}.incomeSources.${incIndex}.monthlyAmount`}>
                        Monthly Amount
                      </label>
                      <CurrencyInput
                        id={`borrowers.${borrowerIndex}.incomeSources.${incIndex}.monthlyAmount`}
                        name={`borrowers.${borrowerIndex}.incomeSources.${incIndex}.monthlyAmount`}
                        value={watch(`borrowers.${borrowerIndex}.incomeSources.${incIndex}.monthlyAmount`) || ''}
                        onChange={(e) => setValue(`borrowers.${borrowerIndex}.incomeSources.${incIndex}.monthlyAmount`, e.target.value)}
                        placeholder="1,000.00"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`borrowers.${borrowerIndex}.incomeSources.${incIndex}.description`}>
                        Description
                      </label>
                      <input
                        type="text"
                        id={`borrowers.${borrowerIndex}.incomeSources.${incIndex}.description`}
                        {...register(`borrowers.${borrowerIndex}.incomeSources.${incIndex}.description`)}
                        placeholder="Optional details"
                      />
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => removeIncome(incIndex)}
                        className="btn btn-outline-danger btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="form-row">
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => appendIncome(createDefaultIncomeSource())}
                    className="btn btn-outline-primary"
                  >
                    Add Income Source
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Free-text notes for the borrower to leave context for their loan officer
          (e.g. an employment gap, a recent job change, seasonal income). Autosaves
          with the rest of the draft. */}
      <div className="application-notes-section" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <label htmlFor="notes" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Notes <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          placeholder="Anything you'd like your loan officer to know — employment gaps, upcoming changes, etc."
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
    </FormSection>
  );
};

export default EmploymentStep;
