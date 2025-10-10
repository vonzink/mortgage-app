/**
 * Review & Submit Step Component
 * Step 7: Review and submit application
 */
import React from 'react';
import { FaCheck, FaFilePdf } from 'react-icons/fa';
import FormSection from '../shared/FormSection';
import { formatCurrency, formatDate } from '../../utils/formHelpers';
import { printURLAFormat } from '../../utils/urlaExport';
import { toast } from 'react-toastify';

const ReviewSubmitStep = ({ register, errors, getValues, onSubmit, isSubmitting, isEditing }) => {
  const formData = getValues();

  const handlePrintPDF = () => {
    try {
      printURLAFormat(formData);
      toast.success('Generating PDF print preview...');
    } catch (error) {
      toast.error('Failed to generate PDF. Please try again.');
      console.error('PDF generation error:', error);
    }
  };

  const renderBorrowerSummary = (borrower, index) => {
    if (!borrower.firstName && !borrower.lastName) return null;

    return (
      <div key={index} className="borrower-summary">
        <h5>Borrower {index + 1}: {borrower.firstName} {borrower.lastName}</h5>
        
        <div className="summary-details">
          <div className="summary-row">
            <span className="label">SSN:</span>
            <span className="value">***-**-{borrower.ssn?.slice(-4) || '****'}</span>
          </div>
          <div className="summary-row">
            <span className="label">Date of Birth:</span>
            <span className="value">{formatDate(borrower.dateOfBirth)}</span>
          </div>
          <div className="summary-row">
            <span className="label">Marital Status:</span>
            <span className="value">{borrower.maritalStatus || 'Not provided'}</span>
          </div>
          <div className="summary-row">
            <span className="label">Email:</span>
            <span className="value">{borrower.email || 'Not provided'}</span>
          </div>
          <div className="summary-row">
            <span className="label">Phone:</span>
            <span className="value">{borrower.phone || 'Not provided'}</span>
          </div>
          
          {/* Employment Summary */}
          {borrower.employmentHistory && borrower.employmentHistory.length > 0 && (
            <div className="employment-summary">
              <h6>Employment History:</h6>
              {borrower.employmentHistory.map((employment, empIndex) => (
                <div key={empIndex} className="employment-item">
                  <span className="employer">{employment.employerName || 'Not specified'}</span>
                  <span className="position">{employment.position || 'Not specified'}</span>
                  <span className="income">{formatCurrency(employment.monthlyIncome)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const calculateTotalAssets = () => {
    let total = 0;
    formData.borrowers?.forEach(borrower => {
      borrower.assets?.forEach(asset => {
        total += parseFloat(asset.assetValue) || 0;
      });
    });
    return total;
  };

  const calculateTotalLiabilities = () => {
    let total = 0;
    formData.borrowers?.forEach(borrower => {
      borrower.liabilities?.forEach(liability => {
        total += parseFloat(liability.unpaidBalance) || 0;
      });
    });
    return total;
  };

  return (
    <FormSection
      title="Review & Submit"
      icon={<FaCheck />}
      description="Please review all information before submitting your application."
    >
      <div className="review-container">
        <div className="review-section">
          <h4>Loan Information</h4>
          <div className="review-grid">
            <div className="review-item">
              <span className="label">Loan Purpose:</span>
              <span className="value">{formData.loanPurpose || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">Loan Type:</span>
              <span className="value">{formData.loanType || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">Loan Amount:</span>
              <span className="value">{formatCurrency(formData.loanAmount)}</span>
            </div>
            <div className="review-item">
              <span className="label">Property Value:</span>
              <span className="value">{formatCurrency(formData.propertyValue)}</span>
            </div>
            <div className="review-item">
              <span className="label">Down Payment:</span>
              <span className="value">{formatCurrency(formData.downPayment)}</span>
            </div>
            <div className="review-item">
              <span className="label">Property Use:</span>
              <span className="value">{formData.propertyUse || 'Not provided'}</span>
            </div>
          </div>
        </div>

        <div className="review-section">
          <h4>Property Details</h4>
          <div className="review-grid">
            <div className="review-item">
              <span className="label">Address:</span>
              <span className="value">{formData.propertyAddress || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">City:</span>
              <span className="value">{formData.propertyCity || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">State:</span>
              <span className="value">{formData.propertyState || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">ZIP Code:</span>
              <span className="value">{formData.propertyZip || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">Property Type:</span>
              <span className="value">{formData.propertyType || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">Construction Type:</span>
              <span className="value">{formData.constructionType || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">Year Built:</span>
              <span className="value">{formData.yearBuilt || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">Number of Units:</span>
              <span className="value">{formData.unitsCount || 'Not provided'}</span>
            </div>
          </div>
        </div>

        <div className="review-section">
          <h4>Borrowers</h4>
          {formData.borrowers?.map((borrower, index) => renderBorrowerSummary(borrower, index))}
        </div>

        <div className="review-section">
          <h4>Financial Summary</h4>
          <div className="review-grid">
            <div className="review-item">
              <span className="label">Total Assets:</span>
              <span className="value">{formatCurrency(calculateTotalAssets())}</span>
            </div>
            <div className="review-item">
              <span className="label">Total Liabilities:</span>
              <span className="value">{formatCurrency(calculateTotalLiabilities())}</span>
            </div>
            <div className="review-item">
              <span className="label">Net Worth:</span>
              <span className="value">{formatCurrency(calculateTotalAssets() - calculateTotalLiabilities())}</span>
            </div>
          </div>
        </div>

        <div className="submit-section">
          <div className="agreement-section">
            <div className="form-group">
              <label className="agreement-label">
                <input
                  type="checkbox"
                  {...register('termsAccepted', { required: 'You must accept the terms and conditions' })}
                  className="agreement-checkbox"
                />
                <span className="agreement-text">
                  I certify that the information provided in this application is true and complete to the best of my knowledge. 
                  I understand that providing false information may result in denial of the loan application.
                </span>
              </label>
              {errors.termsAccepted && (
                <span className="error-message">{errors.termsAccepted.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="agreement-label">
                <input
                  type="checkbox"
                  {...register('privacyAccepted', { required: 'You must accept the privacy policy' })}
                  className="agreement-checkbox"
                />
                <span className="agreement-text">
                  I consent to the collection and use of my personal information as described in the privacy policy.
                </span>
              </label>
              {errors.privacyAccepted && (
                <span className="error-message">{errors.privacyAccepted.message}</span>
              )}
            </div>
          </div>

          <div className="submit-actions">
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={handlePrintPDF}
                className="btn btn-secondary"
                disabled={isSubmitting}
                title="Print to PDF (URLA Format)"
              >
                <FaFilePdf /> Print to PDF
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                console.log('[DEBUG] Submit button clicked in ReviewSubmitStep');
                console.log('[DEBUG] Current form data:', formData);
                onSubmit();
              }}
              className="btn btn-primary btn-large"
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? (isEditing ? 'Saving New Version...' : 'Submitting Application...') 
                : (isEditing ? 'Save as New Version' : 'Submit Application')
              }
            </button>
          </div>
        </div>
      </div>
    </FormSection>
  );
};

export default ReviewSubmitStep;
