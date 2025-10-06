/**
 * Property Details Step Component
 * Step 3: Property information
 */
import React from 'react';
import { FaHome } from 'react-icons/fa';
import { toast } from 'react-toastify';
import FormSection from '../shared/FormSection';
import AddressField from '../form-fields/AddressField';

const PropertyDetailsStep = ({ register, errors, watch, getValues, setValue }) => {
  const loanPurpose = watch('loanPurpose');
  const isTBD = watch('propertyTBD');
  
  const handleUseCurrentResidence = () => {
    const currentResidence = getValues('borrowers.0.residences.0');
    if (currentResidence?.addressLine && currentResidence?.city && currentResidence?.state && currentResidence?.zipCode) {
      setValue('property.addressLine', currentResidence.addressLine);
      setValue('property.city', currentResidence.city);
      setValue('property.state', currentResidence.state);
      setValue('property.zipCode', currentResidence.zipCode);
      toast.success('Property address populated from current residence!');
    } else {
      toast.error('Please complete borrower current residence information first.');
    }
  };
  
  return (
    <FormSection
      title="Property Details"
      icon={<FaHome />}
      description="Tell us about the property you're purchasing or refinancing."
    >
      <div className="form-row">
        {loanPurpose === 'Purchase' && (
          <div className="form-group">
            <label className="declaration-label">
              <input
                type="checkbox"
                {...register('propertyTBD')}
                className="declaration-checkbox"
              />
              <span className="declaration-text">
                Property address is To Be Determined (TBD)
              </span>
            </label>
          </div>
        )}
        
        {(loanPurpose === 'Refinance' || loanPurpose === 'CashOut') && !isTBD && (
          <div className="form-group">
            <button
              type="button"
              onClick={handleUseCurrentResidence}
              className="btn btn-outline-primary"
            >
              Use Current Residence Address
            </button>
          </div>
        )}
      </div>

      {!isTBD && (
        <AddressField
          register={register}
          errors={errors}
          prefix="property"
          required={false}
          label="Property Address"
        />
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="yearBuilt">Year Built</label>
          <input
            type="number"
            id="yearBuilt"
            {...register('yearBuilt', { 
              min: { value: 1800, message: 'Year must be 1800 or later' },
              max: { value: new Date().getFullYear() + 1, message: 'Year cannot be in the future' }
            })}
            placeholder="2020"
            className={errors.yearBuilt ? 'error' : ''}
          />
          {errors.yearBuilt && (
            <span className="error-message">{errors.yearBuilt.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="unitsCount">Number of Units</label>
          <select
            id="unitsCount"
            {...register('unitsCount')}
            className={errors.unitsCount ? 'error' : ''}
          >
            <option value="">Select Units</option>
            <option value="1">1 Unit</option>
            <option value="2">2 Units</option>
            <option value="3">3 Units</option>
            <option value="4">4 Units</option>
            <option value="5+">5+ Units</option>
          </select>
          {errors.unitsCount && (
            <span className="error-message">{errors.unitsCount.message}</span>
          )}
        </div>
      </div>
    </FormSection>
  );
};

export default PropertyDetailsStep;
