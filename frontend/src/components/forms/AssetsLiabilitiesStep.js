/**
 * Assets & Liabilities Step Component
 * Step 5: Assets and liabilities including REO properties
 */
import React from 'react';
import { FaFileAlt } from 'react-icons/fa';
import FormSection from '../shared/FormSection';
import { 
  createDefaultAsset,
  createDefaultLiability,
  createDefaultREOProperty
} from '../../utils/fieldArrayHelpers';

const AssetsLiabilitiesStep = ({ 
  register, 
  errors, 
  watch, 
  getValues, 
  setValue,
  getFieldArray,
  borrowerFields
}) => {
  const getBorrowerName = (index) => {
    const firstName = watch(`borrowers.${index}.firstName`);
    const lastName = watch(`borrowers.${index}.lastName`);
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim() || `Borrower ${index + 1}`;
    }
    return `Borrower ${index + 1}`;
  };

  // Get field arrays for primary borrower (index 0) - all items will be added here
  const { fields: assetFields, append: appendAsset, remove: removeAsset } = getFieldArray(0, 'assets');
  const { fields: liabilityFields, append: appendLiability, remove: removeLiability } = getFieldArray(0, 'liabilities');
  const { fields: reoFields, append: appendReo, remove: removeReo } = getFieldArray(0, 'reoProperties');

  return (
    <FormSection
      title="Assets & Liabilities"
      icon={<FaFileAlt />}
      description="Assets, liabilities, and real estate owned properties for all borrowers. Use the Owner field to identify who owns each item."
    >
      {/* Assets Section */}
      <div className="assets-section">
        <h5>Assets</h5>
        
        {assetFields.length === 0 ? (
          <div className="no-items-message">
            <p>No assets added yet. Click "Add Asset" to get started.</p>
          </div>
        ) : (
          <div className="asset-list-section">
            <div className="asset-header">
              <div className="asset-header-item">Asset Type</div>
              <div className="asset-header-item">Owner</div>
              <div className="asset-header-item">Bank Name</div>
              <div className="asset-header-item">Account Number</div>
              <div className="asset-header-item">Amount</div>
              <div className="asset-header-item">Used for Down Payment</div>
              <div className="asset-header-item">Actions</div>
            </div>
            
            {assetFields.map((assetField, assetIndex) => (
              <div key={assetField.id} className="asset-entry">
                <div className="form-group">
                  <select
                    {...register(`borrowers.0.assets.${assetIndex}.assetType`)}
                    className="form-select"
                  >
                          <option value="">Select Asset Type</option>
                          <option value="Checking">Checking Account</option>
                          <option value="Savings">Savings Account</option>
                          <option value="MoneyMarket">Money Market Account</option>
                          <option value="CertificateOfDeposit">Certificate of Deposit</option>
                          <option value="MutualFunds">Mutual Funds</option>
                          <option value="Stocks">Stocks</option>
                          <option value="Bonds">Bonds</option>
                          <option value="Retirement401k">401(k)</option>
                          <option value="IRA">IRA</option>
                          <option value="Pension">Pension</option>
                          <option value="EarnestMoney">Earnest Money</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <select
                          {...register(`borrowers.0.assets.${assetIndex}.owner`)}
                          className="form-select"
                        >
                          <option value="">Select Owner</option>
                          {borrowerFields.map((bf, bfIndex) => (
                            <option key={bf.id} value={getBorrowerName(bfIndex)}>
                              {getBorrowerName(bfIndex)}
                            </option>
                          ))}
                          <option value="Joint">Joint</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <input
                          type="text"
                          {...register(`borrowers.0.assets.${assetIndex}.bankName`)}
                          placeholder="Bank Name"
                        />
                      </div>
                      
                      <div className="form-group">
                        <input
                          type="text"
                          {...register(`borrowers.0.assets.${assetIndex}.accountNumber`)}
                          placeholder="Account Number"
                        />
                      </div>
                      
                      <div className="form-group">
                        <input
                          type="number"
                          {...register(`borrowers.0.assets.${assetIndex}.assetValue`)}
                          placeholder="Amount"
                          min="0"
                        />
                      </div>
                      
                      <div className="form-group checkbox-group">
                        <input
                          type="checkbox"
                          {...register(`borrowers.0.assets.${assetIndex}.usedForDownpayment`)}
                          className="form-checkbox"
                        />
                      </div>
                      
                      <div className="form-group">
                        <button
                          type="button"
                          onClick={() => removeAsset(assetIndex)}
                          className="btn btn-outline-danger btn-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => appendAsset(createDefaultAsset())}
                    className="btn btn-outline-primary"
                  >
                    Add Asset
                  </button>
                </div>
              </div>
            </div>

            {/* Liabilities Section */}
            <div className="liabilities-section">
              <h5>Liabilities</h5>
              
              {liabilityFields.length === 0 ? (
                <div className="no-items-message">
                  <p>No liabilities added yet. Click "Add Liability" to get started.</p>
                </div>
              ) : (
                <div className="liability-list-section">
                  <div className="liability-header">
                    <div className="liability-header-item">Liability Type</div>
                    <div className="liability-header-item">Owner</div>
                    <div className="liability-header-item">Creditor Name</div>
                    <div className="liability-header-item">Account Number</div>
                    <div className="liability-header-item">Monthly Payment</div>
                    <div className="liability-header-item">Unpaid Balance</div>
                    <div className="liability-header-item">Actions</div>
                  </div>
                  
                  {liabilityFields.map((liabilityField, liabilityIndex) => (
                    <div key={liabilityField.id} className="liability-entry">
                      <div className="form-group">
                        <select
                          {...register(`borrowers.0.liabilities.${liabilityIndex}.liabilityType`)}
                          className="form-select"
                        >
                          <option value="">Select Liability Type</option>
                          <option value="CreditCard">Credit Card</option>
                          <option value="AutoLoan">Auto Loan</option>
                          <option value="StudentLoan">Student Loan</option>
                          <option value="MortgageLoan">Mortgage Loan</option>
                          <option value="Revolving">Revolving Credit</option>
                          <option value="Installment">Installment Loan</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <select
                          {...register(`borrowers.0.liabilities.${liabilityIndex}.owner`)}
                          className="form-select"
                        >
                          <option value="">Select Owner</option>
                          {borrowerFields.map((bf, bfIndex) => (
                            <option key={bf.id} value={getBorrowerName(bfIndex)}>
                              {getBorrowerName(bfIndex)}
                            </option>
                          ))}
                          <option value="Joint">Joint</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <input
                          type="text"
                          {...register(`borrowers.0.liabilities.${liabilityIndex}.creditorName`)}
                          placeholder="Creditor Name"
                        />
                      </div>
                      
                      <div className="form-group">
                        <input
                          type="text"
                          {...register(`borrowers.0.liabilities.${liabilityIndex}.accountNumber`)}
                          placeholder="Account Number"
                        />
                      </div>
                      
                      <div className="form-group">
                        <input
                          type="number"
                          {...register(`borrowers.0.liabilities.${liabilityIndex}.monthlyPayment`)}
                          placeholder="Monthly Payment"
                          min="0"
                        />
                      </div>
                      
                      <div className="form-group">
                        <input
                          type="number"
                          {...register(`borrowers.0.liabilities.${liabilityIndex}.unpaidBalance`)}
                          placeholder="Unpaid Balance"
                          min="0"
                        />
                      </div>
                      
                      <div className="form-group">
                        <button
                          type="button"
                          onClick={() => removeLiability(liabilityIndex)}
                          className="btn btn-outline-danger btn-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => appendLiability(createDefaultLiability())}
                    className="btn btn-outline-primary"
                  >
                    Add Liability
                  </button>
                </div>
              </div>
            </div>

            {/* REO Properties Section */}
            {reoFields.length > 0 && (
              <div className="reo-properties-section">
                <h5>Real Estate Owned (REO) Properties</h5>
                
                <div className="reo-list-section">
                  {reoFields.map((reoField, reoIndex) => (
                    <div key={reoField.id} className="reo-entry">
                      <div className="reo-header">
                        <h6>REO Property {reoIndex + 1}</h6>
                        <button
                          type="button"
                          onClick={() => removeReo(reoIndex)}
                          className="btn btn-outline-danger btn-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`borrowers.0.reoProperties.${reoIndex}.owner`}>
                            Owner
                          </label>
                          <select
                            id={`borrowers.0.reoProperties.${reoIndex}.owner`}
                            {...register(`borrowers.0.reoProperties.${reoIndex}.owner`)}
                            className="form-select"
                          >
                            <option value="">Select Owner</option>
                            {borrowerFields.map((bf, bfIndex) => (
                              <option key={bf.id} value={getBorrowerName(bfIndex)}>
                                {getBorrowerName(bfIndex)}
                              </option>
                            ))}
                            <option value="Joint">Joint</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor={`borrowers.0.reoProperties.${reoIndex}.addressLine`}>
                            Property Address
                          </label>
                          <input
                            type="text"
                            id={`borrowers.0.reoProperties.${reoIndex}.addressLine`}
                            {...register(`borrowers.0.reoProperties.${reoIndex}.addressLine`)}
                            placeholder="123 Property St"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <input
                            type="text"
                            {...register(`borrowers.0.reoProperties.${reoIndex}.city`)}
                            placeholder="City"
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            {...register(`borrowers.0.reoProperties.${reoIndex}.state`)}
                            placeholder="State"
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            {...register(`borrowers.0.reoProperties.${reoIndex}.zipCode`)}
                            placeholder="ZIP Code"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <select {...register(`borrowers.0.reoProperties.${reoIndex}.propertyType`)}>
                            <option value="">Select Property Type</option>
                            <option value="SingleFamily">Single Family</option>
                            <option value="Condo">Condominium</option>
                            <option value="Townhouse">Townhouse</option>
                            <option value="MultiFamily">Multi-Family</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <input
                            type="number"
                            {...register(`borrowers.0.reoProperties.${reoIndex}.propertyValue`)}
                            placeholder="Property Value"
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <input
                            type="number"
                            {...register(`borrowers.0.reoProperties.${reoIndex}.monthlyRentalIncome`)}
                            placeholder="Monthly Rental Income"
                            min="0"
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="number"
                            {...register(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`)}
                            placeholder="Monthly Payment"
                            min="0"
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="number"
                            {...register(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`)}
                            placeholder="Unpaid Balance"
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`borrowers.0.reoProperties.${reoIndex}.associatedLiability`}>
                            Associated Liability
                          </label>
                          <select 
                            {...register(`borrowers.0.reoProperties.${reoIndex}.associatedLiability`)}
                            onChange={(e) => {
                              const liabIndex = e.target.value;
                              
                              if (liabIndex !== '' && liabIndex !== undefined) {
                                try {
                                  const liability = getValues(`borrowers.0.liabilities.${parseInt(liabIndex)}`);
                                  if (liability) {
                                    // Prefill monthly payment and unpaid balance from the selected liability
                                    if (liability.monthlyPayment && parseFloat(liability.monthlyPayment) > 0) {
                                      const currentValue = getValues(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`);
                                      if (!currentValue || parseFloat(currentValue) === 0) {
                                        setValue(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`, liability.monthlyPayment);
                                      }
                                    }
                                    if (liability.unpaidBalance && parseFloat(liability.unpaidBalance) > 0) {
                                      const currentValue = getValues(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`);
                                      if (!currentValue || parseFloat(currentValue) === 0) {
                                        setValue(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`, liability.unpaidBalance);
                                      }
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error linking liability to REO:', error);
                                }
                              }
                            }}
                          >
                            <option value="">Select Associated Liability</option>
                            {liabilityFields.map((liability, liabIndex) => {
                              const liabilityData = getValues(`borrowers.0.liabilities.${liabIndex}`);
                              const displayName = liabilityData?.creditorName || 
                                                liabilityData?.liabilityType || 
                                                `Liability ${liabIndex + 1}`;
                              return (
                                <option key={liabIndex} value={liabIndex}>
                                  {displayName}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

      {/* Add REO Property Button */}
      <div className="form-row">
        <div className="form-group">
          <button
            type="button"
            onClick={() => appendReo(createDefaultREOProperty())}
            className="btn btn-outline-primary"
          >
            Add REO Property
          </button>
        </div>
      </div>
    </FormSection>
  );
};

export default AssetsLiabilitiesStep;
