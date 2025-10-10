/**
 * Employment Step Component
 * Step 4: Employment and income details
 */
import React from 'react';
import { FaBriefcase } from 'react-icons/fa';
import FormSection from '../shared/FormSection';
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
  getFieldArray,
  borrowerFields
}) => {
  return (
    <FormSection
      title="Employment & Income"
      icon={<FaBriefcase />}
      description="Employment history and income details for all borrowers."
    >
      {borrowerFields.map((borrowerField, borrowerIndex) => {
        // Always show borrower 1 (primary) and any borrowers that exist in the fields array
        const { fields: empFields, append: appendEmp, remove: removeEmp } = getFieldArray(borrowerIndex, 'employmentHistory');
        const warning = checkEmploymentHistoryWarning(empFields);
        
        return (
          <div key={borrowerField.id} className="borrower-employment-section">
            <h4>Borrower {borrowerIndex + 1} - Employment History</h4>
            
            {warning.hasWarning && (
              <div className="alert alert-warning">
                <strong>Warning:</strong> Your employment history covers approximately {Math.round(warning.totalDuration)} months. 
                Most lenders require at least 24 months (2 years) of employment history.
              </div>
            )}
            
            {empFields.map((empField, empIndex) => (
              <div key={empField.id} className="employment-entry">
                <div className="employment-header">
                  <h5>Employer {empIndex + 1}</h5>
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
                    <input
                      type="number"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.monthlyIncome`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.monthlyIncome`, {
                        min: { value: 0, message: 'Income cannot be negative' }
                      })}
                      placeholder="5000"
                      min="0"
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
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            ))}

            {empFields.length < 5 && (
              <div className="form-row">
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => appendEmp(createDefaultEmployment(empFields.length + 1))}
                    className="btn btn-outline-primary"
                  >
                    Add Another Employer
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
