/**
 * Loan Information Step Component
 * Step 1: Basic loan details
 *
 * UX:
 *   - Purchase loans show "Purchase Price" + Down Payment ($/% toggle); Loan Amount auto-
 *     computes from Purchase Price - Down Payment, but is editable (then DP recomputes).
 *   - Refinance / CashOut show "Property Value"; no down-payment block; Loan Amount is direct.
 *   - All three monetary fields stay in sync via per-field onChange handlers (no useEffect
 *     ping-ponging) so user input remains responsive.
 */
import React, { useState, useEffect } from 'react';
import { FaHome } from 'react-icons/fa';
import FormSection from '../shared/FormSection';
import CurrencyInput from '../form-fields/CurrencyInput';

const LoanInformationStep = ({ register, errors, watch, setValue, getValues }) => {
  const loanPurpose = watch('loanPurpose');
  const isPurchase = loanPurpose === 'Purchase';

  // Local UI state for the down-payment input mode. The stored field (`downPayment`) is
  // ALWAYS the dollar amount; the toggle just changes how the user enters it.
  const [dpMode, setDpMode] = useState('$');

  // For % mode only, track raw user input so the field doesn't fight the recompute on
  // every keystroke. ($ mode is handled by CurrencyInput's own internal state.)
  const [pctRaw, setPctRaw] = useState(null);

  const num = (v) => {
    const n = parseFloat(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const purchasePrice = num(watch('propertyValue'));
  const downPayment = num(watch('downPayment'));

  // % mode display: derived from stored $ unless the user is actively typing
  const pctDerived = purchasePrice > 0 ? ((downPayment / purchasePrice) * 100).toFixed(2) : '';
  const pctDisplay = pctRaw !== null ? pctRaw : pctDerived;

  useEffect(() => { setPctRaw(null); }, [dpMode]);

  // ── Per-field handlers ─────────────────────────────────────────────────────
  const onPurchasePriceChange = (e) => {
    const newPP = num(e.target.value);
    setValue('propertyValue', e.target.value);
    if (!isPurchase) return;
    setValue('loanAmount', Math.max(newPP - downPayment, 0).toFixed(2));
  };

  // $ mode: CurrencyInput passes us a numeric value already
  const onDpDollarChange = (e) => {
    const dpDollar = num(e.target.value);
    setValue('downPayment', dpDollar);
    if (!isPurchase) return;
    setValue('loanAmount', Math.max(purchasePrice - dpDollar, 0).toFixed(2));
  };

  // % mode: track the raw string so partial values like "1" → "12" → "12." → "12.5" don't
  // bounce around. Compute the $ amount from the typed % and store that.
  const onDpPercentChange = (e) => {
    const raw = e.target.value;
    setPctRaw(raw);
    const pct = num(raw);
    const dpDollar = purchasePrice * pct / 100;
    setValue('downPayment', Number(dpDollar.toFixed(2)));
    if (!isPurchase) return;
    setValue('loanAmount', Math.max(purchasePrice - dpDollar, 0).toFixed(2));
  };
  const onDpPercentFocus = () => setPctRaw(pctDerived);
  const onDpPercentBlur = () => setPctRaw(null);

  const onLoanAmountChange = (e) => {
    const newLA = num(e.target.value);
    setValue('loanAmount', e.target.value);
    if (!isPurchase) return;
    setValue('downPayment', Math.max(purchasePrice - newLA, 0).toFixed(2));
    setPctRaw(null);  // refresh the % display from new stored value
  };

  const toggleStyle = (active) => ({
    padding: '0.4rem 0.75rem',
    border: '1px solid var(--primary-color, #2563eb)',
    background: active ? 'var(--primary-color, #2563eb)' : 'white',
    color: active ? 'white' : 'var(--primary-color, #2563eb)',
    cursor: 'pointer',
    fontWeight: 500,
  });

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
          <label htmlFor="propertyValue">
            {isPurchase ? 'Purchase Price' : 'Property Value'}
          </label>
          <CurrencyInput
            id="propertyValue"
            name="propertyValue"
            value={watch('propertyValue') || ''}
            onChange={onPurchasePriceChange}
            placeholder={isPurchase ? '500,000.00' : '600,000.00'}
            className={errors.propertyValue ? 'error' : ''}
          />
          {errors.propertyValue && (
            <span className="error-message">{errors.propertyValue.message}</span>
          )}
        </div>

        {isPurchase && (
          <div className="form-group">
            <label htmlFor="downPayment">
              Down Payment
              <span style={{ marginLeft: '0.75rem', display: 'inline-flex', borderRadius: 4, overflow: 'hidden' }}>
                <button type="button" onClick={() => setDpMode('$')} style={{ ...toggleStyle(dpMode === '$'), borderRadius: '4px 0 0 4px' }}>$</button>
                <button type="button" onClick={() => setDpMode('%')} style={{ ...toggleStyle(dpMode === '%'), borderLeft: 0, borderRadius: '0 4px 4px 0' }}>%</button>
              </span>
            </label>
            {dpMode === '$' ? (
              <CurrencyInput
                id="downPayment"
                name="downPayment"
                value={watch('downPayment') || ''}
                onChange={onDpDollarChange}
                placeholder="100,000.00"
                className={errors.downPayment ? 'error' : ''}
              />
            ) : (
              <input
                type="number"
                id="downPayment"
                value={pctDisplay}
                onChange={onDpPercentChange}
                onFocus={onDpPercentFocus}
                onBlur={onDpPercentBlur}
                placeholder="20.00"
                step="0.01"
                min="0"
                max="100"
                className={errors.downPayment ? 'error' : ''}
                inputMode="decimal"
              />
            )}
            <small style={{ color: 'var(--text-secondary, #666)', marginTop: '0.25rem', display: 'block' }}>
              {dpMode === '$' && purchasePrice > 0
                ? `${((downPayment / purchasePrice) * 100).toFixed(2)}% of purchase price`
                : dpMode === '%' && purchasePrice > 0
                ? `≈ $${downPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : null}
            </small>
            {errors.downPayment && (
              <span className="error-message">{errors.downPayment.message}</span>
            )}
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="loanAmount">
            Loan Amount
            {isPurchase && <small style={{ color: 'var(--text-secondary, #666)', marginLeft: '0.5rem', fontWeight: 400 }}>
              (auto-calculated; you can override)
            </small>}
          </label>
          <CurrencyInput
            id="loanAmount"
            name="loanAmount"
            value={watch('loanAmount') || ''}
            onChange={onLoanAmountChange}
            placeholder="400,000.00"
            className={errors.loanAmount ? 'error' : ''}
          />
          {errors.loanAmount && (
            <span className="error-message">{errors.loanAmount.message}</span>
          )}
        </div>

        {isPurchase && (
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
        )}
      </div>

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
