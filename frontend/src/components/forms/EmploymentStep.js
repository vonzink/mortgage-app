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
  createDefaultEmployment
} from '../../utils/fieldArrayHelpers';

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

  // Clamp active borrower tab and limit visible borrowers to 4
  useEffect(() => {
    const maxIndex = Math.min(borrowerFields.length, 4) - 1;
    if (activeBorrowerTab > maxIndex) {
      setActiveBorrowerTab(Math.max(0, maxIndex));
    }
  }, [borrowerFields.length, activeBorrowerTab]);
  const visibleBorrowers = borrowerFields.slice(0, 4);

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
      title="Employment & Income"
      icon={<FaBriefcase />}
      description="Employment history and income details for all borrowers."
    >
      {/* Borrower Tabs */}
      <div className="borrower-tabs" style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        marginBottom: '2rem',
        marginTop: '1rem'
      }}>
        {visibleBorrowers.map((borrowerField, borrowerIndex) => (
          <button
            key={borrowerField.id}
            type="button"
            onClick={() => setActiveBorrowerTab(borrowerIndex)}
            style={bubbleTabStyle(activeBorrowerTab === borrowerIndex)}
            onMouseEnter={(e) => {
              if (activeBorrowerTab !== borrowerIndex) {
                e.target.style.background = '#e0e0e0';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeBorrowerTab !== borrowerIndex) {
                e.target.style.background = '#f0f0f0';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {getBorrowerName(borrowerIndex)}
          </button>
        ))}
      </div>

      {visibleBorrowers.map((borrowerField, borrowerIndex) => {
        // Only show the active borrower tab
        if (borrowerIndex !== activeBorrowerTab) return null;

        const { fields: empFields, append: appendEmp, remove: removeEmp } = getFieldArray(borrowerIndex, 'employmentHistory');
        const warning = checkEmploymentHistoryWarning(empFields);
        
        // Get or initialize the active employment tab for this borrower
        const activeEmploymentTab = activeEmploymentTabs[borrowerIndex] ?? 0;
        const setActiveEmploymentTab = (empIndex) => {
          setActiveEmploymentTabs(prev => ({ ...prev, [borrowerIndex]: empIndex }));
        };
        
        return (
          <div key={borrowerField.id} className="borrower-employment-section">
            
            {warning.hasWarning && (
              <div className="alert alert-warning">
                <strong>Warning:</strong> Your employment history covers approximately {Math.round(warning.totalDuration)} months. 
                Most lenders require at least 24 months (2 years) of employment history.
              </div>
            )}
            
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
                      onClick={() => setActiveEmploymentTab(empIndex)}
                      style={{
                        ...bubbleTabStyle(activeEmploymentTab === empIndex),
                        background: activeEmploymentTab === empIndex 
                          ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                          : '#f0f0f0',
                        boxShadow: activeEmploymentTab === empIndex 
                          ? '0 4px 15px rgba(79, 172, 254, 0.4)' 
                          : '0 2px 5px rgba(0,0,0,0.1)',
                      }}
                      onMouseEnter={(e) => {
                        if (activeEmploymentTab !== empIndex) {
                          e.target.style.background = '#e0e0e0';
                          e.target.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeEmploymentTab !== empIndex) {
                          e.target.style.background = '#f0f0f0';
                          e.target.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {displayName}
                      {employmentStatus && (
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          background: employmentStatus === 'Present' ? 'var(--success-color)' : 'var(--warning-color)',
                          color: '#fff',
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
                      <span className="error-message">
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
                      <span className="error-message">
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
                      <span className="error-message">
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
                      <span className="error-message">
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
                        <span className="error-message">
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
                      <span className="error-message">
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
                        <span className="error-message">
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

            {empFields.length < 5 && (
              <div className="form-row">
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => appendEmp(createDefaultEmployment(empFields.length + 1))}
                    className="btn btn-outline-primary"
                  >
                    Add Employer
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </FormSection>
  );
};

export default EmploymentStep;
