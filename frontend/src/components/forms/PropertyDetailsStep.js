/**
 * Property Details Step Component
 * Step 3: Property information
 */
import React from 'react';
import { FaHome } from 'react-icons/fa';
import { toast } from 'react-toastify';
import FormSection from '../shared/FormSection';
import AddressField from '../form-fields/AddressField';
import CurrencyInput from '../form-fields/CurrencyInput';

const PropertyDetailsStep = ({ register, errors, watch, getValues, setValue }) => {
  const loanPurpose = watch('loanPurpose');
  const isTBD = watch('propertyTBD');
  const showEscrowEstimates = watch('property.showEscrowEstimates');
  
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
      title="Subject Property Details"
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
      </div>

      {!isTBD && (
        <>
          <AddressField
            register={register}
            errors={errors}
            prefix="property"
            required={false}
            label="Property Address"
          />
          
          <div className="form-row">
            <div className="form-group">
              <button
                type="button"
                onClick={handleUseCurrentResidence}
                className="btn btn-outline-primary"
              >
                {(loanPurpose === 'Refinance' || loanPurpose === 'CashOut') 
                  ? 'Use Current Residence Address' 
                  : 'Use Primary Address'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Optional monthly escrow estimates — collapsed by default; gated behind a
          checkbox (same watch-gated pattern as propertyTBD above). All optional,
          no validation. Maps to suite loan.proposed*Monthly fields. */}
      <div className="form-row" style={{ marginTop: '1rem' }}>
        <div className="form-group">
          <label className="declaration-label">
            <input
              type="checkbox"
              {...register('property.showEscrowEstimates')}
              className="declaration-checkbox"
            />
            <span className="declaration-text">
              + Add monthly tax/insurance/HOA/MI estimates (optional)
            </span>
          </label>
        </div>
      </div>

      {showEscrowEstimates && (
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="property.proposedTaxesMonthly">
              Property Taxes (monthly)
            </label>
            <CurrencyInput
              id="property.proposedTaxesMonthly"
              name="property.proposedTaxesMonthly"
              value={watch('property.proposedTaxesMonthly') || ''}
              onChange={(e) => setValue('property.proposedTaxesMonthly', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label htmlFor="property.proposedHazardInsuranceMonthly">
              Homeowner's Insurance (monthly)
            </label>
            <CurrencyInput
              id="property.proposedHazardInsuranceMonthly"
              name="property.proposedHazardInsuranceMonthly"
              value={watch('property.proposedHazardInsuranceMonthly') || ''}
              onChange={(e) => setValue('property.proposedHazardInsuranceMonthly', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label htmlFor="property.proposedHoaDuesMonthly">
              HOA Dues (monthly)
            </label>
            <CurrencyInput
              id="property.proposedHoaDuesMonthly"
              name="property.proposedHoaDuesMonthly"
              value={watch('property.proposedHoaDuesMonthly') || ''}
              onChange={(e) => setValue('property.proposedHoaDuesMonthly', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label htmlFor="property.proposedMortgageInsuranceMonthly">
              Mortgage Insurance (monthly)
            </label>
            <CurrencyInput
              id="property.proposedMortgageInsuranceMonthly"
              name="property.proposedMortgageInsuranceMonthly"
              value={watch('property.proposedMortgageInsuranceMonthly') || ''}
              onChange={(e) => setValue('property.proposedMortgageInsuranceMonthly', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      )}
    </FormSection>
  );
};

export default PropertyDetailsStep;
