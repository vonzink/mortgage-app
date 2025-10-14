/**
 * Assets & Liabilities Step Component
 * Step 5: Assets and liabilities including REO properties
 */
import React, { useState } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import FormSection from '../shared/FormSection';
import CurrencyInput from '../form-fields/CurrencyInput';
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
  const [activeREOTab, setActiveREOTab] = useState(0);

  const getBorrowerName = (index) => {
    const firstName = watch(`borrowers.${index}.firstName`);
    const lastName = watch(`borrowers.${index}.lastName`);
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim() || `Borrower ${index + 1}`;
    }
    return `Borrower ${index + 1}`;
  };

  const getREOPropertyName = (reoIndex) => {
    const addressLine = watch(`borrowers.0.reoProperties.${reoIndex}.addressLine`);
    if (addressLine && addressLine.trim()) {
      return addressLine;
    }
    return `REO Property ${reoIndex + 1}`;
  };

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
    marginBottom: '0.5rem'
  });

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
                          <option value="">Select Type</option>
                          <option value="Checking">Checking</option>
                          <option value="Savings">Savings</option>
                          <option value="MoneyMarket">Money Market</option>
                          <option value="CertificateOfDeposit">CD</option>
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
                        <CurrencyInput
                          id={`borrowers.0.assets.${assetIndex}.assetValue`}
                          name={`borrowers.0.assets.${assetIndex}.assetValue`}
                          value={watch(`borrowers.0.assets.${assetIndex}.assetValue`) || ''}
                          onChange={(e) => setValue(`borrowers.0.assets.${assetIndex}.assetValue`, e.target.value)}
                          placeholder="0.00"
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
                          <option value="">Select Type</option>
                          <option value="CreditCard">Credit Card</option>
                          <option value="AutoLoan">Auto Loan</option>
                          <option value="StudentLoan">Student Loan</option>
                          <option value="MortgageLoan">Mortgage</option>
                          <option value="Revolving">HELOC / Revolving</option>
                          <option value="Installment">Installment</option>
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
                        <CurrencyInput
                          id={`borrowers.0.liabilities.${liabilityIndex}.monthlyPayment`}
                          name={`borrowers.0.liabilities.${liabilityIndex}.monthlyPayment`}
                          value={watch(`borrowers.0.liabilities.${liabilityIndex}.monthlyPayment`) || ''}
                          onChange={(e) => setValue(`borrowers.0.liabilities.${liabilityIndex}.monthlyPayment`, e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div className="form-group">
                        <CurrencyInput
                          id={`borrowers.0.liabilities.${liabilityIndex}.unpaidBalance`}
                          name={`borrowers.0.liabilities.${liabilityIndex}.unpaidBalance`}
                          value={watch(`borrowers.0.liabilities.${liabilityIndex}.unpaidBalance`) || ''}
                          onChange={(e) => setValue(`borrowers.0.liabilities.${liabilityIndex}.unpaidBalance`, e.target.value)}
                          placeholder="0.00"
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
                
                {/* REO Tabs - Only show if there are multiple properties */}
                {reoFields.length > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    marginBottom: '1.5rem',
                    marginTop: '1rem'
                  }}>
                    {reoFields.map((reoField, reoIndex) => (
                      <button
                        key={reoField.id}
                        type="button"
                        onClick={() => setActiveREOTab(reoIndex)}
                        style={{
                          ...bubbleTabStyle(activeREOTab === reoIndex),
                          background: activeREOTab === reoIndex 
                            ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' 
                            : '#f0f0f0',
                          boxShadow: activeREOTab === reoIndex 
                            ? '0 4px 15px rgba(250, 112, 154, 0.4)' 
                            : '0 2px 5px rgba(0,0,0,0.1)',
                        }}
                        onMouseEnter={(e) => {
                          if (activeREOTab !== reoIndex) {
                            e.target.style.background = '#e0e0e0';
                            e.target.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activeREOTab !== reoIndex) {
                            e.target.style.background = '#f0f0f0';
                            e.target.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {getREOPropertyName(reoIndex)}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="reo-list-section">
                  {reoFields.map((reoField, reoIndex) => {
                    // Only show the active REO tab if there are multiple properties
                    if (reoFields.length > 1 && reoIndex !== activeREOTab) return null;
                    
                    return (
                    <div key={reoField.id} className="reo-entry">
                      <div className="reo-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h6>{reoFields.length === 1 ? getREOPropertyName(reoIndex) : ''}</h6>
                        <button
                          type="button"
                          onClick={() => {
                            removeReo(reoIndex);
                            // Adjust active tab if needed
                            if (activeREOTab >= reoIndex && activeREOTab > 0) {
                              setActiveREOTab(activeREOTab - 1);
                            }
                          }}
                          className="btn btn-outline-danger btn-sm"
                        >
                          Remove Property
                        </button>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`borrowers.0.reoProperties.${reoIndex}.category`}>
                            Property Category
                          </label>
                          <select
                            id={`borrowers.0.reoProperties.${reoIndex}.category`}
                            {...register(`borrowers.0.reoProperties.${reoIndex}.category`)}
                            className="form-select"
                          >
                            <option value="">Select Category</option>
                            <option value="Primary">Primary</option>
                            <option value="SecondHome">Second Home</option>
                            <option value="Investment">Investment</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Land">Land</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

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
                      </div>

                      <div className="form-row">
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

                      <div className="form-row" style={{ fontSize: '0.9rem' }}>
                        <div className="form-group">
                          <label htmlFor={`borrowers.0.reoProperties.${reoIndex}.propertyType`} style={{ fontSize: '0.85rem' }}>
                            Property Type
                          </label>
                          <select {...register(`borrowers.0.reoProperties.${reoIndex}.propertyType`)}>
                            <option value="">Select Property Type</option>
                            <option value="SingleFamily">Single Family</option>
                            <option value="Condo">Condominium</option>
                            <option value="Townhouse">Townhouse</option>
                            <option value="MultiFamily">Multi-Family</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor={`borrowers.0.reoProperties.${reoIndex}.propertyValue`} style={{ fontSize: '0.85rem' }}>
                            Property Value
                          </label>
                          <CurrencyInput
                            id={`borrowers.0.reoProperties.${reoIndex}.propertyValue`}
                            name={`borrowers.0.reoProperties.${reoIndex}.propertyValue`}
                            value={watch(`borrowers.0.reoProperties.${reoIndex}.propertyValue`) || ''}
                            onChange={(e) => setValue(`borrowers.0.reoProperties.${reoIndex}.propertyValue`, e.target.value)}
                            placeholder="0.00"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      <div className="form-row" style={{ fontSize: '0.9rem' }}>
                        <div className="form-group">
                          <label htmlFor={`borrowers.0.reoProperties.${reoIndex}.monthlyRentalIncome`} style={{ fontSize: '0.85rem' }}>
                            Monthly Rental Income
                          </label>
                          <CurrencyInput
                            id={`borrowers.0.reoProperties.${reoIndex}.monthlyRentalIncome`}
                            name={`borrowers.0.reoProperties.${reoIndex}.monthlyRentalIncome`}
                            value={watch(`borrowers.0.reoProperties.${reoIndex}.monthlyRentalIncome`) || ''}
                            onChange={(e) => setValue(`borrowers.0.reoProperties.${reoIndex}.monthlyRentalIncome`, e.target.value)}
                            placeholder="0.00"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`} style={{ fontSize: '0.85rem' }}>
                            Monthly Payment
                          </label>
                          <CurrencyInput
                            id={`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`}
                            name={`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`}
                            value={watch(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`) || ''}
                            onChange={(e) => setValue(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`, e.target.value)}
                            placeholder="0.00"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`} style={{ fontSize: '0.85rem' }}>
                            Unpaid Balance
                          </label>
                          <CurrencyInput
                            id={`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`}
                            name={`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`}
                            value={watch(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`) || ''}
                            onChange={(e) => setValue(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`, e.target.value)}
                            placeholder="0.00"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      {/* Owned Free and Clear Section */}
                      <div className="form-row">
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              {...register(`borrowers.0.reoProperties.${reoIndex}.ownedFreeAndClear`)}
                              onChange={(e) => {
                                setValue(`borrowers.0.reoProperties.${reoIndex}.ownedFreeAndClear`, e.target.checked);
                                // Clear associated liabilities and amounts if owned free and clear
                                if (e.target.checked) {
                                  setValue(`borrowers.0.reoProperties.${reoIndex}.associatedLiabilities`, []);
                                  setValue(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`, 0);
                                  setValue(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`, 0);
                                }
                              }}
                              style={{ width: 'auto', margin: 0 }}
                            />
                            <strong>Owned Free and Clear (No Mortgages/Liens)</strong>
                          </label>
                        </div>
                      </div>

                      {/* Associated Liabilities - Only show if NOT owned free and clear */}
                      {!watch(`borrowers.0.reoProperties.${reoIndex}.ownedFreeAndClear`) && (
                        <div className="form-row" style={{ marginTop: '1rem' }}>
                          <div className="form-group">
                            <label>Associated Liabilities (Mortgages/Liens on this Property)</label>
                            <div style={{ 
                              border: '1px solid #ddd', 
                              borderRadius: '4px', 
                              padding: '1rem',
                              background: '#f9f9f9',
                              marginTop: '0.5rem'
                            }}>
                              {liabilityFields.length === 0 ? (
                                <p style={{ color: '#666', margin: 0 }}>
                                  No liabilities added yet. Add liabilities in the section above to link them to this property.
                                </p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {liabilityFields.map((liability, liabIndex) => {
                                    const liabilityType = watch(`borrowers.0.liabilities.${liabIndex}.liabilityType`);
                                    const creditorName = watch(`borrowers.0.liabilities.${liabIndex}.creditorName`);
                                    
                                    // Only show Mortgage or HELOC/Revolving
                                    if (liabilityType !== 'MortgageLoan' && liabilityType !== 'Revolving') {
                                      return null;
                                    }
                                    
                                    const owner = watch(`borrowers.0.liabilities.${liabIndex}.owner`) || '';
                                    const baseName = creditorName || (liabilityType === 'MortgageLoan' ? 'Mortgage' : 'HELOC / Revolving') || `Liability ${liabIndex + 1}`;
                                    const displayName = owner ? `${baseName} — ${owner}` : baseName;
                                    
                                    const associatedLiabilities = watch(`borrowers.0.reoProperties.${reoIndex}.associatedLiabilities`) || [];
                                    const isChecked = associatedLiabilities.includes(liabIndex.toString());

                                    return (
                                      <label 
                                        key={liabIndex}
                                        style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '0.75rem',
                                          padding: '0.5rem',
                                          background: isChecked ? '#e8f4f8' : 'white',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          border: isChecked ? '2px solid #667eea' : '1px solid #ddd'
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const currentLiabilities = watch(`borrowers.0.reoProperties.${reoIndex}.associatedLiabilities`) || [];
                                            let newLiabilities;
                                            
                                            if (e.target.checked) {
                                              // Add liability
                                              newLiabilities = [...currentLiabilities, liabIndex.toString()];
                                              
                                              // Auto-populate amounts if this is the first liability added
                                              if (currentLiabilities.length === 0) {
                                                const liability = getValues(`borrowers.0.liabilities.${liabIndex}`);
                                                if (liability) {
                                                  if (liability.monthlyPayment) {
                                                    setValue(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`, liability.monthlyPayment);
                                                  }
                                                  if (liability.unpaidBalance) {
                                                    setValue(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`, liability.unpaidBalance);
                                                  }
                                                }
                                              } else {
                                                // If multiple, sum the amounts
                                                const liability = getValues(`borrowers.0.liabilities.${liabIndex}`);
                                                const currentPayment = parseFloat(getValues(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`)) || 0;
                                                const currentBalance = parseFloat(getValues(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`)) || 0;
                                                
                                                if (liability) {
                                                  const newPayment = currentPayment + (parseFloat(liability.monthlyPayment) || 0);
                                                  const newBalance = currentBalance + (parseFloat(liability.unpaidBalance) || 0);
                                                  setValue(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`, newPayment);
                                                  setValue(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`, newBalance);
                                                }
                                              }
                                            } else {
                                              // Remove liability
                                              newLiabilities = currentLiabilities.filter(id => id !== liabIndex.toString());
                                              
                                              // Subtract the amounts
                                              const liability = getValues(`borrowers.0.liabilities.${liabIndex}`);
                                              const currentPayment = parseFloat(getValues(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`)) || 0;
                                              const currentBalance = parseFloat(getValues(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`)) || 0;
                                              
                                              if (liability) {
                                                const newPayment = Math.max(0, currentPayment - (parseFloat(liability.monthlyPayment) || 0));
                                                const newBalance = Math.max(0, currentBalance - (parseFloat(liability.unpaidBalance) || 0));
                                                setValue(`borrowers.0.reoProperties.${reoIndex}.monthlyPayment`, newPayment);
                                                setValue(`borrowers.0.reoProperties.${reoIndex}.unpaidBalance`, newBalance);
                                              }
                                            }
                                            
                                            setValue(`borrowers.0.reoProperties.${reoIndex}.associatedLiabilities`, newLiabilities);
                                          }}
                                          style={{ width: 'auto', margin: 0 }}
                                        />
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: '500' }}>{displayName}</div>
                                          <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                            Payment: ${parseFloat(watch(`borrowers.0.liabilities.${liabIndex}.monthlyPayment`) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | 
                                            Balance: ${parseFloat(watch(`borrowers.0.liabilities.${liabIndex}.unpaidBalance`) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {!watch(`borrowers.0.reoProperties.${reoIndex}.ownedFreeAndClear`) && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                                <em>Tip: Select all mortgages and liens that apply to this property. Amounts will be automatically summed.</em>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

      {/* Add REO Property Button */}
      <div className="form-row">
        <div className="form-group">
          <button
            type="button"
            onClick={() => {
              appendReo(createDefaultREOProperty());
              setActiveREOTab(reoFields.length);
            }}
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
