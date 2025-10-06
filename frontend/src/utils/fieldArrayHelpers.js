/**
 * Field Array Helper Utilities
 * Contains functions for managing React Hook Form field arrays
 */

/**
 * Create borrower field arrays for a specific borrower index
 * @param {Object} control - React Hook Form control object
 * @param {number} borrowerIndex - Index of the borrower
 * @returns {Object} Object containing all field arrays for the borrower
 */
export const createBorrowerFieldArrays = (control, borrowerIndex) => {
  const baseName = `borrowers.${borrowerIndex}`;
  
  return {
    employmentHistory: {
      name: `${baseName}.employmentHistory`,
      control
    },
    incomeSources: {
      name: `${baseName}.incomeSources`,
      control
    },
    residences: {
      name: `${baseName}.residences`,
      control
    },
    assets: {
      name: `${baseName}.assets`,
      control
    },
    liabilities: {
      name: `${baseName}.liabilities`,
      control
    },
    reoProperties: {
      name: `${baseName}.reoProperties`,
      control
    }
  };
};

/**
 * Get field array by borrower index and field name
 * @param {Object} control - React Hook Form control object
 * @param {number} borrowerIndex - Index of the borrower
 * @param {string} fieldName - Name of the field (employmentHistory, residences, etc.)
 * @returns {Object} Field array object with fields, append, and remove methods
 */
export const getFieldArray = (control, borrowerIndex, fieldName) => {
  const fieldArrayName = `borrowers.${borrowerIndex}.${fieldName}`;
  
  try {
    // This would be used with useFieldArray in components
    return {
      name: fieldArrayName,
      control
    };
  } catch (error) {
    console.error(`Error getting field array for ${fieldArrayName}:`, error);
    return {
      name: fieldArrayName,
      control,
      fields: [],
      append: () => {},
      remove: () => {}
    };
  }
};

/**
 * Create default values for new borrower
 * @param {number} sequenceNumber - Sequence number for the borrower
 * @returns {Object} Default borrower object
 */
export const createDefaultBorrower = (sequenceNumber) => ({
  sequenceNumber,
  employmentHistory: [{}],
  incomeSources: [{}],
  residences: [{}],
  assets: [],
  liabilities: [],
  reoProperties: []
});

/**
 * Create default residence object
 * @param {number} sequenceNumber - Sequence number for the residence
 * @returns {Object} Default residence object
 */
export const createDefaultResidence = (sequenceNumber) => ({
  sequenceNumber,
  residencyType: 'Prior',
  durationYears: '',
  durationMonthsOnly: '',
  durationMonths: 0,
  addressLine: '',
  city: '',
  state: '',
  zipCode: '',
  residencyBasis: '',
  monthlyRent: ''
});

/**
 * Create default employment object
 * @param {number} sequenceNumber - Sequence number for the employment
 * @returns {Object} Default employment object
 */
export const createDefaultEmployment = (sequenceNumber) => ({
  sequenceNumber,
  employerName: '',
  position: '',
  startDate: '',
  endDate: '',
  employmentStatus: 'Present',
  monthlyIncome: '',
  employerAddress: '',
  employerPhone: '',
  selfEmployed: false
});

/**
 * Create default asset object
 * @returns {Object} Default asset object
 */
export const createDefaultAsset = () => ({
  assetType: '',
  accountNumber: '',
  bankName: '',
  assetValue: '',
  usedForDownpayment: false
});

/**
 * Create default liability object
 * @returns {Object} Default liability object
 */
export const createDefaultLiability = () => ({
  liabilityType: '',
  creditorName: '',
  accountNumber: '',
  monthlyPayment: '',
  unpaidBalance: ''
});

/**
 * Create default REO property object
 * @returns {Object} Default REO property object
 */
export const createDefaultREOProperty = () => ({
  addressLine: '',
  city: '',
  state: '',
  zipCode: '',
  propertyType: '',
  propertyValue: '',
  monthlyRentalIncome: '',
  monthlyPayment: '',
  unpaidBalance: '',
  associatedLiability: ''
});

/**
 * Validate field array data
 * @param {Array} fieldArray - Array of field objects
 * @param {string} fieldType - Type of field (residence, employment, asset, etc.)
 * @returns {Object} Validation result with isValid and errors
 */
export const validateFieldArray = (fieldArray, fieldType) => {
  if (!Array.isArray(fieldArray)) {
    return { isValid: false, errors: ['Field array must be an array'] };
  }

  const errors = [];
  
  switch (fieldType) {
    case 'residence':
      fieldArray.forEach((residence, index) => {
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
      break;
      
    case 'employment':
      fieldArray.forEach((employment, index) => {
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
      });
      break;
      
    default:
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
