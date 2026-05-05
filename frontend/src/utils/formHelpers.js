/**
 * Form Helper Utilities
 * Contains reusable functions for form calculations and validations
 */

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
 * Format currency for display
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  const numAmount = parseFloat(amount) || 0;
  return numAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Format number to currency string for input display (without $ symbol)
 * @param {number|string} value - Value to format
 * @returns {string} Formatted number string with commas and decimals
 */
export const formatCurrencyInput = (value) => {
  if (!value) return '';
  
  // Remove non-numeric characters except decimal point
  const numericValue = value.toString().replace(/[^0-9.]/g, '');
  
  // Parse to float and format with commas
  const number = parseFloat(numericValue);
  if (isNaN(number)) return '';
  
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Parse formatted currency string to number
 * @param {string} formattedValue - Formatted currency string
 * @returns {number} Numeric value
 */
export const parseCurrencyInput = (formattedValue) => {
  if (!formattedValue) return 0;
  
  // Remove commas and parse to float
  const numericValue = formattedValue.toString().replace(/,/g, '');
  const parsed = parseFloat(numericValue);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format a date for display in the long US form (e.g. "June 15, 1985").
 *
 * Plain {@code YYYY-MM-DD} strings — what HTML {@code <input type="date">} returns and
 * what we send to the backend for fields like {@code dateOfBirth} — are intentionally
 * parsed by *parts* rather than via {@code new Date(str)}, because the latter treats
 * the string as UTC midnight and shifts a day in any negative-UTC timezone (US users
 * see "1985-06-15" rendered as "June 14, 1985"). For full ISO timestamps with a time
 * component (e.g. {@code 2026-05-05T09:10:00Z}) we fall through to the standard parser
 * since those carry their own offset.
 *
 * @param {string} dateString
 * @returns {string} Long-form US date, or '' for null / blank / unparseable input.
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';

  // YYYY-MM-DD (10 chars, no time portion) → parts-based, timezone-safe construction.
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    const local = new Date(Number(y), Number(m) - 1, Number(d));
    return local.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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

/**
 * Format a Social Security Number as the user types: `xxx-xx-xxxx`.
 * Strips all non-digits, takes the first 9, slices into 3/2/4 segments.
 * Partial input is preserved gracefully (e.g. "12" → "12", "1234" → "123-4").
 */
export const formatSSN = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

/**
 * Format a US phone number as the user types: `xxx-xxx-xxxx`. Same partial-input rules.
 */
export const formatPhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};
