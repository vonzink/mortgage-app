/**
 * Custom hook for form validation logic
 */
import { useCallback } from 'react';
import { 
  checkResidenceHistoryWarning, 
  checkEmploymentHistoryWarning,
  isValidEmail,
  isValidPhone,
  isValidSSN
} from '../utils/formHelpers';

export const useFormValidation = (getValues, watch) => {
  
  /**
   * Validate borrower information
   * @param {number} borrowerIndex - Index of the borrower
   * @returns {Object} Validation result
   */
  const validateBorrower = useCallback((borrowerIndex) => {
    const borrower = getValues(`borrowers.${borrowerIndex}`);
    const errors = [];

    // Required fields validation - only firstName, lastName, email, and phone
    if (!borrower.firstName) errors.push('First name is required');
    if (!borrower.lastName) errors.push('Last name is required');
    if (!borrower.email) errors.push('Email is required');
    if (!borrower.phone) errors.push('Phone number is required');

    // Format validation
    if (borrower.email && !isValidEmail(borrower.email)) {
      errors.push('Invalid email format');
    }
    if (borrower.phone && !isValidPhone(borrower.phone)) {
      errors.push('Invalid phone number format');
    }
    if (borrower.ssn && !isValidSSN(borrower.ssn)) {
      errors.push('Invalid SSN format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [getValues]);

  /**
   * Validate residence history for a borrower
   * @param {number} borrowerIndex - Index of the borrower
   * @returns {Object} Validation result with warnings
   */
  const validateResidenceHistory = useCallback((borrowerIndex) => {
    const residences = getValues(`borrowers.${borrowerIndex}.residences`) || [];
    const errors = [];
    
    // No required fields for residence - all optional
    
    // Check duration warning (informational only)
    const warning = checkResidenceHistoryWarning(residences);

    return {
      isValid: true, // Always valid since no required fields
      errors,
      warning
    };
  }, [getValues]);

  /**
   * Validate employment history for a borrower
   * @param {number} borrowerIndex - Index of the borrower
   * @returns {Object} Validation result with warnings
   */
  const validateEmploymentHistory = useCallback((borrowerIndex) => {
    const employmentHistory = getValues(`borrowers.${borrowerIndex}.employmentHistory`) || [];
    const errors = [];
    
    // No required fields for employment - all optional

    // Check duration warning (informational only)
    const warning = checkEmploymentHistoryWarning(employmentHistory);

    return {
      isValid: true, // Always valid since no required fields
      errors,
      warning
    };
  }, [getValues]);

  /**
   * Validate property details
   * @returns {Object} Validation result
   */
  const validatePropertyDetails = useCallback(() => {
    const property = getValues();
    const errors = [];

    // No required fields for property - all optional

    return {
      isValid: true, // Always valid since no required fields
      errors
    };
  }, [getValues]);

  /**
   * Validate loan information
   * @returns {Object} Validation result
   */
  const validateLoanInformation = useCallback(() => {
    const loanInfo = getValues();
    const errors = [];

    // Only loanPurpose is required
    if (!loanInfo.loanPurpose) errors.push('Loan purpose is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [getValues]);

  /**
   * Validate entire form step
   * @param {number} stepNumber - Step number to validate
   * @returns {Object} Validation result
   */
  const validateStep = useCallback((stepNumber) => {
    switch (stepNumber) {
      case 1:
        return validateLoanInformation();
      case 2:
        // Validate first borrower
        const borrowerValidation = validateBorrower(0);
        const residenceValidation = validateResidenceHistory(0);
        return {
          isValid: borrowerValidation.isValid && residenceValidation.isValid,
          errors: [...borrowerValidation.errors, ...residenceValidation.errors],
          warnings: residenceValidation.warning
        };
      case 3:
        return validatePropertyDetails();
      case 4:
        // Validate employment for all borrowers
        const employmentValidation = validateEmploymentHistory(0);
        return employmentValidation;
      case 5:
      case 6:
        // Assets and declarations don't have required validations
        return { isValid: true, errors: [] };
      default:
        return { isValid: true, errors: [] };
    }
  }, [validateLoanInformation, validateBorrower, validateResidenceHistory, validatePropertyDetails, validateEmploymentHistory]);

  return {
    validateBorrower,
    validateResidenceHistory,
    validateEmploymentHistory,
    validatePropertyDetails,
    validateLoanInformation,
    validateStep
  };
};
