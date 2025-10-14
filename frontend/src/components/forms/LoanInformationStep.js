/**
 * Loan Information Step Component
 * Step 1: Basic loan details
 */
import React from 'react';
import { FaHome } from 'react-icons/fa';
import FormSection from '../shared/FormSection';
import CurrencyInput from '../form-fields/CurrencyInput';

const LoanInformationStep = ({ register, errors, watch, setValue, getValues }) => {
  const loanPurpose = watch('loanPurpose');
  return (
    <FormSection
      title="Loan Information"
      icon={<FaHome />}
      description="Let's start with the basic details about your loan."
    >
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="loanPurpose">Loan Purpose *</label>
          <select
            id="loanPurpose"
            {...register('loanPurpose', { required: 'Loan purpose is required' })}
            className={errors.loanPurpose ? 'error' : ''}
          >
            <option value="">Select Loan Purpose</option>
            <option value="Purchase">Purchase</option>
            <option value="Refinance">Refinance</option>
            <option value="CashOut">Cash Out</option>
          </select>
          {errors.loanPurpose && (
            <span className="error-message">{errors.loanPurpose.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="loanType">Loan Type</label>
          <select
            id="loanType"
            {...register('loanType')}
            className={errors.loanType ? 'error' : ''}
          >
            <option value="">Select Loan Type</option>
            <option value="FHA">FHA</option>
            <option value="Conventional">Conventional</option>
            <option value="VA">VA</option>
            <option value="USDA">USDA</option>
          </select>
          {errors.loanType && (
            <span className="error-message">{errors.loanType.message}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="loanAmount">Loan Amount</label>
          <CurrencyInput
            id="loanAmount"
            name="loanAmount"
            value={watch('loanAmount') || ''}
            onChange={(e) => setValue('loanAmount', e.target.value)}
            placeholder="500,000.00"
            className={errors.loanAmount ? 'error' : ''}
          />
          {errors.loanAmount && (
            <span className="error-message">{errors.loanAmount.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="propertyValue">Property Value</label>
          <CurrencyInput
            id="propertyValue"
            name="propertyValue"
            value={watch('propertyValue') || ''}
            onChange={(e) => setValue('propertyValue', e.target.value)}
            placeholder="600,000.00"
            className={errors.propertyValue ? 'error' : ''}
          />
          {errors.propertyValue && (
            <span className="error-message">{errors.propertyValue.message}</span>
          )}
        </div>
      </div>

      {loanPurpose === 'Purchase' && (
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="downPayment">Down Payment</label>
            <CurrencyInput
              id="downPayment"
              name="downPayment"
              value={watch('downPayment') || ''}
              onChange={(e) => setValue('downPayment', e.target.value)}
              placeholder="100,000.00"
              className={errors.downPayment ? 'error' : ''}
            />
            {errors.downPayment && (
              <span className="error-message">{errors.downPayment.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="downPaymentSource">Down Payment Source</label>
            <select
              id="downPaymentSource"
              {...register('downPaymentSource')}
              className={errors.downPaymentSource ? 'error' : ''}
            >
              <option value="">Select Source</option>
              <option value="Savings">Savings</option>
              <option value="Gift">Gift</option>
              <option value="SaleOfProperty">Sale of Property</option>
              <option value="Borrowed">Borrowed</option>
              <option value="Other">Other</option>
            </select>
            {errors.downPaymentSource && (
              <span className="error-message">{errors.downPaymentSource.message}</span>
            )}
          </div>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="propertyUse">Property Use</label>
          <select
            id="propertyUse"
            {...register('propertyUse')}
            className={errors.propertyUse ? 'error' : ''}
          >
            <option value="">Select Use</option>
            <option value="Primary">Primary Residence</option>
            <option value="Secondary">Secondary Residence</option>
            <option value="Investment">Investment Property</option>
          </select>
          {errors.propertyUse && (
            <span className="error-message">{errors.propertyUse.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="propertyType">Property Type</label>
          <select
            id="propertyType"
            {...register('propertyType')}
            className={errors.propertyType ? 'error' : ''}
          >
            <option value="">Select Type</option>
            <option value="SingleFamily">Single Family</option>
            <option value="Condo">Condominium</option>
            <option value="Townhouse">Townhouse</option>
            <option value="MultiFamily">Multi-Family</option>
            <option value="Manufactured">Manufactured Home</option>
            <option value="Other">Other</option>
          </select>
          {errors.propertyType && (
            <span className="error-message">{errors.propertyType.message}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="occupancy">Occupancy</label>
          <select
            id="occupancy"
            {...register('occupancy')}
            className={errors.occupancy ? 'error' : ''}
          >
            <option value="">Select Occupancy</option>
            <option value="OwnerOccupied">Owner Occupied</option>
            <option value="SecondHome">Second Home</option>
            <option value="Investment">Investment Property</option>
          </select>
          {errors.occupancy && (
            <span className="error-message">{errors.occupancy.message}</span>
          )}
        </div>
      </div>
    </FormSection>
  );
};

export default LoanInformationStep;
