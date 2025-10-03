/**
 * Loan Information Step Component
 * Step 1: Basic loan details
 */
import React from 'react';
import { FaHome } from 'react-icons/fa';
import FormSection from '../shared/FormSection';

const LoanInformationStep = ({ register, errors }) => {
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
          <label htmlFor="loanType">Loan Type *</label>
          <select
            id="loanType"
            {...register('loanType', { required: 'Loan type is required' })}
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
          <label htmlFor="loanAmount">Loan Amount *</label>
          <input
            type="number"
            id="loanAmount"
            {...register('loanAmount', { 
              required: 'Loan amount is required',
              min: { value: 1, message: 'Loan amount must be greater than 0' }
            })}
            placeholder="500000"
            className={errors.loanAmount ? 'error' : ''}
          />
          {errors.loanAmount && (
            <span className="error-message">{errors.loanAmount.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="propertyValue">Property Value *</label>
          <input
            type="number"
            id="propertyValue"
            {...register('propertyValue', { 
              required: 'Property value is required',
              min: { value: 1, message: 'Property value must be greater than 0' }
            })}
            placeholder="600000"
            className={errors.propertyValue ? 'error' : ''}
          />
          {errors.propertyValue && (
            <span className="error-message">{errors.propertyValue.message}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="downPayment">Down Payment *</label>
          <input
            type="number"
            id="downPayment"
            {...register('downPayment', { 
              required: 'Down payment is required',
              min: { value: 0, message: 'Down payment cannot be negative' }
            })}
            placeholder="100000"
            className={errors.downPayment ? 'error' : ''}
          />
          {errors.downPayment && (
            <span className="error-message">{errors.downPayment.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="downPaymentSource">Down Payment Source *</label>
          <select
            id="downPaymentSource"
            {...register('downPaymentSource', { required: 'Down payment source is required' })}
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

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="propertyUse">Property Use *</label>
          <select
            id="propertyUse"
            {...register('propertyUse', { required: 'Property use is required' })}
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
          <label htmlFor="propertyType">Property Type *</label>
          <select
            id="propertyType"
            {...register('propertyType', { required: 'Property type is required' })}
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
          <label htmlFor="occupancy">Occupancy *</label>
          <select
            id="occupancy"
            {...register('occupancy', { required: 'Occupancy is required' })}
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
