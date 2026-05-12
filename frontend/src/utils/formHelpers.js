/**
 * Form Helper Utilities — duration calculations, validators, and ID generation.
 *
 * The format/parsing helpers (formatCurrency, formatDate, formatSSN, formatPhone,
 * formatCurrencyInput, parseCurrencyInput) used to live here. They now live in
 * {@link ./format.js} so every UI surface has one source of truth (audit SI-1).
 * Re-exported below so existing callers keep working without an import sweep.
 */
export {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  formatDate,
  formatSSN,
  formatPhone,
} from './format';

/**
 * Calculate total residence history duration in months
 * @param {Array} residences - Array of residence objects
 * @returns {number} Total duration in months
 */
export const calculateResidenceHistoryDuration = (residences) => {
  if (!residences || !Array.isArray(residences)) return 0;
  
  return residences.reduce((total, residence) => {
    const duration = parseInt(residence.durationMonths) || 0;
    return total + duration;
  }, 0);
};

/**
 * Calculate total employment history duration in months
 * @param {Array} employmentHistory - Array of employment objects
 * @returns {number} Total duration in months
 */
export const calculateEmploymentHistoryDuration = (employmentHistory) => {
  if (!employmentHistory || !Array.isArray(employmentHistory)) return 0;
  
  return employmentHistory.reduce((total, employment) => {
    if (!employment.startDate) return total;
    
    const startDate = new Date(employment.startDate);
    const endDate = employment.endDate ? new Date(employment.endDate) : new Date();
    
    const diffTime = Math.abs(endDate - startDate);
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    
    return total + diffMonths;
  }, 0);
};

/**
 * Check if residence history covers minimum required period
 * @param {Array} residences - Array of residence objects
 * @param {number} minimumMonths - Minimum required months (default: 24)
 * @returns {Object} { hasWarning: boolean, totalDuration: number }
 */
export const checkResidenceHistoryWarning = (residences, minimumMonths = 24) => {
  const totalDuration = calculateResidenceHistoryDuration(residences);
  const hasData = residences.some(res => 
    (res.durationYears && res.durationYears > 0) || 
    (res.durationMonthsOnly && res.durationMonthsOnly > 0)
  );
  
  return {
    hasWarning: hasData && totalDuration < minimumMonths,
    totalDuration
  };
};

/**
 * Check if employment history covers minimum required period
 * @param {Array} employmentHistory - Array of employment objects
 * @param {number} minimumMonths - Minimum required months (default: 24)
 * @returns {Object} { hasWarning: boolean, totalDuration: number }
 */
export const checkEmploymentHistoryWarning = (employmentHistory, minimumMonths = 24) => {
  const totalDuration = calculateEmploymentHistoryDuration(employmentHistory);
  const hasData = employmentHistory.some(emp => emp.startDate || emp.endDate);
  
  return {
    hasWarning: hasData && totalDuration < minimumMonths,
    totalDuration
  };
};


/**
 * Generate unique ID for form fields
 * @returns {string} Unique identifier
 */
export const generateFieldId = () => {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return phoneRegex.test(phone);
};

/**
 * Validate SSN format
 * @param {string} ssn - SSN to validate
 * @returns {boolean} True if valid SSN format
 */
export const isValidSSN = (ssn) => {
  const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
  return ssnRegex.test(ssn);
};

