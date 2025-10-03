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
          <label htmlFor="constructionType">Construction Type *</label>
          <select
            id="constructionType"
            {...register('constructionType', { required: 'Construction type is required' })}
            className={errors.constructionType ? 'error' : ''}
          >
            <option value="">Select Type</option>
            <option value="SiteBuilt">Site Built</option>
            <option value="Manufactured">Manufactured Home</option>
            <option value="Modular">Modular</option>
            <option value="Log">Log Home</option>
            <option value="Other">Other</option>
          </select>
          {errors.constructionType && (
            <span className="error-message">{errors.constructionType.message}</span>
          )}
        </div>

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

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="propertyBedrooms">Number of Bedrooms</label>
          <input
            type="number"
            id="propertyBedrooms"
            {...register('propertyBedrooms')}
            placeholder="3"
            min="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="propertyBathrooms">Number of Bathrooms</label>
          <input
            type="number"
            id="propertyBathrooms"
            {...register('propertyBathrooms')}
            placeholder="2"
            min="0"
            step="0.5"
          />
        </div>

        <div className="form-group">
          <label htmlFor="propertySquareFootage">Square Footage</label>
          <input
            type="number"
            id="propertySquareFootage"
            {...register('propertySquareFootage')}
            placeholder="2000"
            min="0"
          />
        </div>
      </div>
    </FormSection>
  );
};

export default PropertyDetailsStep;
