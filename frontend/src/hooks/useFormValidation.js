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

    // Required fields validation
    if (!borrower.firstName) errors.push('First name is required');
    if (!borrower.lastName) errors.push('Last name is required');
    if (!borrower.ssn) errors.push('SSN is required');
    if (!borrower.dateOfBirth) errors.push('Date of birth is required');
    if (!borrower.maritalStatus) errors.push('Marital status is required');
    if (!borrower.citizenshipType) errors.push('Citizenship type is required');
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
    
    // Check each residence
    residences.forEach((residence, index) => {
      if (!residence.addressLine) {
        errors.push(`Residence ${index + 1}: Address is required`);
      }
      if (!residence.city) {
        errors.push(`Residence ${index + 1}: City is required`);
      }
      if (!residence.state) {
        errors.push(`Residence ${index + 1}: State is required`);
      }
      if (!residence.zipCode) {
        errors.push(`Residence ${index + 1}: ZIP code is required`);
      }
    });

    // Check duration warning
    const warning = checkResidenceHistoryWarning(residences);

    return {
      isValid: errors.length === 0,
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
    
    // Check each employment
    employmentHistory.forEach((employment, index) => {
      if (!employment.employerName) {
        errors.push(`Employment ${index + 1}: Employer name is required`);
      }
      if (!employment.position) {
        errors.push(`Employment ${index + 1}: Position is required`);
      }
      if (!employment.startDate) {
        errors.push(`Employment ${index + 1}: Start date is required`);
      }
      if (!employment.monthlyIncome) {
        errors.push(`Employment ${index + 1}: Monthly income is required`);
      }
      
      // Validate employment status and end date
      if (employment.employmentStatus === 'Prior' && !employment.endDate) {
        errors.push(`Employment ${index + 1}: End date is required for prior employment`);
      }
    });

    // Check duration warning
    const warning = checkEmploymentHistoryWarning(employmentHistory);

    return {
      isValid: errors.length === 0,
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

    if (!property.propertyAddress) errors.push('Property address is required');
    if (!property.propertyCity) errors.push('Property city is required');
    if (!property.propertyState) errors.push('Property state is required');
    if (!property.propertyZip) errors.push('Property ZIP code is required');
    if (!property.propertyType) errors.push('Property type is required');
    if (!property.propertyValue) errors.push('Property value is required');
    if (!property.constructionType) errors.push('Construction type is required');
    if (!property.yearBuilt) errors.push('Year built is required');
    if (!property.unitsCount) errors.push('Number of units is required');

    return {
      isValid: errors.length === 0,
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

    if (!loanInfo.loanPurpose) errors.push('Loan purpose is required');
    if (!loanInfo.loanType) errors.push('Loan type is required');
    if (!loanInfo.loanAmount) errors.push('Loan amount is required');
    if (!loanInfo.propertyValue) errors.push('Property value is required');
    if (!loanInfo.downPayment) errors.push('Down payment is required');
    if (!loanInfo.downPaymentSource) errors.push('Down payment source is required');
    if (!loanInfo.propertyUse) errors.push('Property use is required');
    if (!loanInfo.occupancy) errors.push('Occupancy is required');

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
