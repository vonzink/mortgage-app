/**
 * Custom hook for managing borrower field arrays
 */
import { useFieldArray } from 'react-hook-form';

export const useBorrowerFieldArrays = (control) => {
  // Main borrowers array
  const borrowers = useFieldArray({
    control,
    name: "borrowers"
  });

  // Borrower 0 field arrays
  const borrower0 = {
    employmentHistory: useFieldArray({ control, name: "borrowers.0.employmentHistory" }),
    incomeSources: useFieldArray({ control, name: "borrowers.0.incomeSources" }),
    residences: useFieldArray({ control, name: "borrowers.0.residences" }),
    assets: useFieldArray({ control, name: "borrowers.0.assets" }),
    liabilities: useFieldArray({ control, name: "borrowers.0.liabilities" }),
    reoProperties: useFieldArray({ control, name: "borrowers.0.reoProperties" })
  };

  // Borrower 1 field arrays
  const borrower1 = {
    employmentHistory: useFieldArray({ control, name: "borrowers.1.employmentHistory" }),
    incomeSources: useFieldArray({ control, name: "borrowers.1.incomeSources" }),
    residences: useFieldArray({ control, name: "borrowers.1.residences" }),
    assets: useFieldArray({ control, name: "borrowers.1.assets" }),
    liabilities: useFieldArray({ control, name: "borrowers.1.liabilities" }),
    reoProperties: useFieldArray({ control, name: "borrowers.1.reoProperties" })
  };

  // Borrower 2 field arrays
  const borrower2 = {
    employmentHistory: useFieldArray({ control, name: "borrowers.2.employmentHistory" }),
    incomeSources: useFieldArray({ control, name: "borrowers.2.incomeSources" }),
    residences: useFieldArray({ control, name: "borrowers.2.residences" }),
    assets: useFieldArray({ control, name: "borrowers.2.assets" }),
    liabilities: useFieldArray({ control, name: "borrowers.2.liabilities" }),
    reoProperties: useFieldArray({ control, name: "borrowers.2.reoProperties" })
  };

  // Borrower 3 field arrays
  const borrower3 = {
    employmentHistory: useFieldArray({ control, name: "borrowers.3.employmentHistory" }),
    incomeSources: useFieldArray({ control, name: "borrowers.3.incomeSources" }),
    residences: useFieldArray({ control, name: "borrowers.3.residences" }),
    assets: useFieldArray({ control, name: "borrowers.3.assets" }),
    liabilities: useFieldArray({ control, name: "borrowers.3.liabilities" }),
    reoProperties: useFieldArray({ control, name: "borrowers.3.reoProperties" })
  };

  /**
   * Get field array for a specific borrower and field type
   * @param {number} borrowerIndex - Index of the borrower (0-3)
   * @param {string} fieldName - Name of the field (employmentHistory, residences, etc.)
   * @returns {Object} Field array object
   */
  const getFieldArray = (borrowerIndex, fieldName) => {
    const borrowerFieldArrays = [borrower0, borrower1, borrower2, borrower3];
    
    if (borrowerIndex >= 0 && borrowerIndex < borrowerFieldArrays.length) {
      return borrowerFieldArrays[borrowerIndex][fieldName];
    }
    
    console.warn(`Invalid borrower index: ${borrowerIndex}`);
    return { fields: [], append: () => {}, remove: () => {} };
  };

  return {
    borrowers,
    borrower0,
    borrower1,
    borrower2,
    borrower3,
    getFieldArray
  };
};
