/**
 * Property Details Step Component
 * Step 3: Property information
 */
import React from 'react';
import { FaHome } from 'react-icons/fa';
import FormSection from '../shared/FormSection';
import AddressField from '../form-fields/AddressField';

const PropertyDetailsStep = ({ register, errors }) => {
  return (
    <FormSection
      title="Property Details"
      icon={<FaHome />}
      description="Tell us about the property you're purchasing or refinancing."
    >
      <AddressField
        register={register}
        errors={errors}
        prefix="property"
        required={true}
        label="Property Address"
      />

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="yearBuilt">Year Built *</label>
          <input
            type="number"
            id="yearBuilt"
            {...register('yearBuilt', { 
              required: 'Year built is required',
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
          <label htmlFor="unitsCount">Number of Units *</label>
          <select
            id="unitsCount"
            {...register('unitsCount', { required: 'Number of units is required' })}
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
