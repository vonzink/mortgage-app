/**
 * Assets & Liabilities Step Component
 * Step 5: Assets, liabilities, and REO properties — entered PER BORROWER.
 *
 * Mirrors the EmploymentStep borrower-tab pattern: a tab per borrower (primary +
 * co-borrowers), each owning its own assets / liabilities / reoProperties field
 * arrays under `borrowers.${borrowerIndex}.*`. These flow through
 * suiteApplicationPayload.buildCoBorrowerSection so each co-borrower's assets,
 * liabilities and REO reach the suite `coBorrowers[]` payload.
 */
import React, { useState, useEffect, useRef } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import FormSection from '../shared/FormSection';
import CurrencyInput from '../form-fields/CurrencyInput';
import {
  createDefaultLiability,
  createDefaultREOProperty
} from '../../utils/fieldArrayHelpers';
import { bubbleTabStyle } from '../shared/bubbleTabStyle';
import AssetsSection from './AssetsSection';

const AssetsLiabilitiesStep = ({
  register,
  errors,
  watch,
  getValues,
  setValue,
  getFieldArray,
  borrowerFields
}) => {
  const [activeBorrowerTab, setActiveBorrowerTab] = useState(0);
  // Per-borrower active REO tab (borrowerIndex -> reoIndex), so each borrower keeps
  // its own selected REO property — mirrors EmploymentStep's activeEmploymentTabs.
  const [activeREOTabs, setActiveREOTabs] = useState({});

  const getBorrowerName = (index) => {
    const firstName = watch(`borrowers.${index}.firstName`);
    const lastName = watch(`borrowers.${index}.lastName`);
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim() || `Borrower ${index + 1}`;
    }
    return `Borrower ${index + 1}`;
  };

  const getREOPropertyName = (borrowerIndex, reoIndex) => {
    const addressLine = watch(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.addressLine`);
    if (addressLine && addressLine.trim()) {
      return addressLine;
    }
    return `REO Property ${reoIndex + 1}`;
  };

  // bubbleTabStyle imported from shared/bubbleTabStyle (audit M-4).

  // Borrower visibility — same rule as EmploymentStep: borrower 1 always shown, the
  // active tab always shown, and any borrower already claimed (named) in the Borrower
  // Information step. Capped at 4 (the field arrays cover borrowers 0-3). Because
  // co-borrowers are added sequentially, the visible position equals the real index.
  const visibleBorrowers = borrowerFields.slice(0, 4).filter((b, i) => {
    if (i === 0) return true;
    if (i === activeBorrowerTab) return true;
    const fn = watch(`borrowers.${i}.firstName`);
    const ln = watch(`borrowers.${i}.lastName`);
    return !!(fn || ln);
  });

  // Clamp active tab if borrowers vanished
  useEffect(() => {
    const maxIndex = visibleBorrowers.length - 1;
    if (activeBorrowerTab > maxIndex) {
      setActiveBorrowerTab(Math.max(0, maxIndex));
    }
  }, [visibleBorrowers.length, activeBorrowerTab]);

  // Per-borrower owned-residence REO auto-seed. For EACH borrower (0-3) seed ONE REO
  // entry from THAT borrower's primary (Current) residence so they're prompted to
  // address that property's debt. Runs at most once per borrower (reoSeededRef keyed by
  // index) and only when the borrower's REO list is currently empty (never clobbers /
  // duplicates entered or loaded REO). Only a residence the borrower OWNS is seeded —
  // REO = real estate OWNED, so a renter's (or living-rent-free) current address must
  // NOT become an owned-property entry. residencyBasis comes from the page-2 selector.
  const borrowerCount = Math.min(borrowerFields.length, 4);
  // Length signature across every borrower's REO array — the multi-borrower analog of
  // the original single-borrower [reoFields.length] dep, so the seed re-evaluates when
  // REO data loads/changes or a co-borrower is added.
  const reoLenSignature = Array.from({ length: borrowerCount })
    .map((_, i) => getFieldArray(i, 'reoProperties').fields.length)
    .join(',');
  const reoSeededRef = useRef({});
  useEffect(() => {
    for (let bIdx = 0; bIdx < borrowerCount; bIdx++) {
      if (reoSeededRef.current[bIdx]) continue;
      const { fields: bReoFields, append: bAppendReo } = getFieldArray(bIdx, 'reoProperties');
      if (bReoFields.length > 0) {
        // User already has REO (entered or loaded) — don't seed, and mark done so we
        // never seed later even if they remove all entries.
        reoSeededRef.current[bIdx] = true;
        continue;
      }
      const residence = getValues(`borrowers.${bIdx}.residences.0`);
      const addressLine = (residence?.addressLine || '').trim();
      if (!addressLine || residence?.residencyBasis !== 'Own') continue;
      reoSeededRef.current[bIdx] = true;
      bAppendReo({
        ...createDefaultREOProperty(),
        addressLine: residence.addressLine,
        city: residence.city || '',
        state: residence.state || '',
        zipCode: residence.zipCode || '',
        category: 'Primary'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reoLenSignature, borrowerCount]);

  return (
    <FormSection
      title="Assets & Liabilities"
      icon={<FaFileAlt />}
      description="Assets, liabilities, and real estate owned (REO) properties for each borrower. Switch borrowers with the tabs; use the Owner field to attribute each item."
    >
      {/* Borrower Tabs — hidden when only one borrower exists */}
      {visibleBorrowers.length > 1 && (
      <div className="borrower-tabs" style={{
        display: 'flex',
        flexWrap: 'wrap',
        marginBottom: '2rem',
        marginTop: '1rem'
      }}>
        {visibleBorrowers.map((borrowerField, borrowerIndex) => (
          <button
            key={borrowerField.id}
            type="button"
            className="form-tab"
            onClick={() => setActiveBorrowerTab(borrowerIndex)}
            style={bubbleTabStyle(activeBorrowerTab === borrowerIndex)}
          >
            {getBorrowerName(borrowerIndex)}
          </button>
        ))}
      </div>
      )}

      {visibleBorrowers.map((borrowerField, borrowerIndex) => {
        // Only render the active borrower tab.
        if (borrowerIndex !== activeBorrowerTab) return null;

        // Field arrays for THIS borrower. getFieldArray is a pure lookup over arrays that
        // are all pre-instantiated in useBorrowerFieldArrays, so calling it after the
        // early-return above is hook-safe.
        const { fields: assetFields, append: appendAsset, remove: removeAsset } = getFieldArray(borrowerIndex, 'assets');
        const { fields: liabilityFields, append: appendLiability, remove: removeLiability } = getFieldArray(borrowerIndex, 'liabilities');
        const { fields: reoFields, append: appendReo, remove: removeReo } = getFieldArray(borrowerIndex, 'reoProperties');

        const activeREOTab = activeREOTabs[borrowerIndex] ?? 0;
        const setActiveREOTab = (reoIndex) => {
          setActiveREOTabs(prev => ({ ...prev, [borrowerIndex]: reoIndex }));
        };

        return (
          <div key={borrowerField.id} className="borrower-assets-section">

          {/* Assets — extracted to AssetsSection.js as part of audit SI-6. */}
          <AssetsSection
            register={register}
            watch={watch}
            setValue={setValue}
            borrowerIndex={borrowerIndex}
            borrowerFields={borrowerFields}
            getBorrowerName={getBorrowerName}
            assetFields={assetFields}
            appendAsset={appendAsset}
            removeAsset={removeAsset}
          />

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
                    <div className="liability-header-item">Status</div>
                    <div className="liability-header-item">Actions</div>
                  </div>

                  {liabilityFields.map((liabilityField, liabilityIndex) => (
                    <div key={liabilityField.id} className="liability-entry">
                      <div className="form-group">
                        <select
                          {...register(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.liabilityType`)}
                          className="form-select"
                        >
                          <option value="">Select Type</option>
                          <option value="CreditCard">Credit Card</option>
                          <option value="AutoLoan">Auto Loan</option>
                          <option value="StudentLoan">Student Loan</option>
                          <option value="MortgageLoan">Mortgage</option>
                          {/* HELOC is split out from Revolving — HELOCs are
                              secured by a property and bridge to REO; pure
                              Revolving (e.g. unsecured LOC) does not. */}
                          <option value="HELOC">HELOC</option>
                          <option value="Revolving">Revolving</option>
                          <option value="Installment">Installment</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <select
                          {...register(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.owner`)}
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
                          {...register(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.creditorName`)}
                          placeholder="Creditor Name"
                        />
                      </div>

                      <div className="form-group">
                        <input
                          type="text"
                          {...register(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.accountNumber`)}
                          placeholder="Account Number"
                        />
                      </div>

                      <div className="form-group">
                        <CurrencyInput
                          id={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.monthlyPayment`}
                          name={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.monthlyPayment`}
                          value={watch(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.monthlyPayment`) || ''}
                          onChange={(e) => setValue(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.monthlyPayment`, e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="form-group">
                        <CurrencyInput
                          id={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.unpaidBalance`}
                          name={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.unpaidBalance`}
                          value={watch(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.unpaidBalance`) || ''}
                          onChange={(e) => setValue(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.unpaidBalance`, e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      {/* LO classification — Omit/Payoff/Duplicate. Empty = use as-is in DTI.
                          MISMO LiabilityExclusionIndicator=true preselects "Omit" on import. */}
                      <div className="form-group">
                        <select
                          {...register(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.exclusionReason`)}
                          className="form-select"
                          title="Mark how this debt should be treated for DTI"
                        >
                          <option value="">— Include —</option>
                          <option value="Omit">Omit</option>
                          <option value="Payoff">Payoff</option>
                          <option value="Duplicate">Duplicate</option>
                        </select>
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
                        className="form-tab"
                        onClick={() => setActiveREOTab(reoIndex)}
                        style={bubbleTabStyle(activeREOTab === reoIndex)}
                      >
                        {getREOPropertyName(borrowerIndex, reoIndex)}
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
                        <h6>{reoFields.length === 1 ? getREOPropertyName(borrowerIndex, reoIndex) : ''}</h6>
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
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.category`}>
                            Property Category
                          </label>
                          <select
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.category`}
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.category`)}
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
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.owner`}>
                            Owner
                          </label>
                          <select
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.owner`}
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.owner`)}
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
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.addressLine`}>
                            Property Address
                          </label>
                          <input
                            type="text"
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.addressLine`}
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.addressLine`)}
                            placeholder="123 Property St"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <input
                            type="text"
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.city`)}
                            placeholder="City"
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.state`)}
                            placeholder="State"
                          />
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.zipCode`)}
                            placeholder="ZIP Code"
                          />
                        </div>
                      </div>

                      <div className="form-row" style={{ fontSize: '0.9rem' }}>
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyType`} style={{ fontSize: '0.85rem' }}>
                            Property Type
                          </label>
                          <select {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyType`)}>
                            <option value="">Select Property Type</option>
                            <option value="SingleFamily">Single Family</option>
                            <option value="Condo">Condominium</option>
                            <option value="Townhouse">Townhouse</option>
                            <option value="MultiFamily">Multi-Family</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyValue`} style={{ fontSize: '0.85rem' }}>
                            Property Value
                          </label>
                          <CurrencyInput
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyValue`}
                            name={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyValue`}
                            value={watch(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyValue`) || ''}
                            onChange={(e) => setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyValue`, e.target.value)}
                            placeholder="0.00"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      <div className="form-row" style={{ fontSize: '0.9rem' }}>
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.use`} style={{ fontSize: '0.85rem' }}>
                            Use / Disposition
                          </label>
                          <select
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.use`}
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.use`)}
                            className="form-select"
                          >
                            <option value="">Select…</option>
                            <option value="Investment">Investment</option>
                            <option value="SecondHome">Second home</option>
                            <option value="Timeshare">Timeshare</option>
                            <option value="ToBeSold">To be sold</option>
                            <option value="PaidByOthers">Paid by others</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row" style={{ fontSize: '0.9rem' }}>
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.note`} style={{ fontSize: '0.85rem' }}>
                            Notes
                          </label>
                          <textarea
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.note`}
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.note`)}
                            placeholder="Notes about this property (optional)"
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="form-row" style={{ fontSize: '0.9rem' }}>
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyRentalIncome`} style={{ fontSize: '0.85rem' }}>
                            Monthly Rental Income
                          </label>
                          <CurrencyInput
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyRentalIncome`}
                            name={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyRentalIncome`}
                            value={watch(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyRentalIncome`) || ''}
                            onChange={(e) => setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyRentalIncome`, e.target.value)}
                            placeholder="0.00"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`} style={{ fontSize: '0.85rem' }}>
                            Monthly Payment
                          </label>
                          <CurrencyInput
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`}
                            name={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`}
                            value={watch(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`) || ''}
                            onChange={(e) => setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`, e.target.value)}
                            placeholder="0.00"
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`} style={{ fontSize: '0.85rem' }}>
                            Unpaid Balance
                          </label>
                          <CurrencyInput
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`}
                            name={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`}
                            value={watch(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`) || ''}
                            onChange={(e) => setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`, e.target.value)}
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
                              {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.ownedFreeAndClear`)}
                              onChange={(e) => {
                                setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.ownedFreeAndClear`, e.target.checked);
                                // Clear associated liabilities and amounts if owned free and clear
                                if (e.target.checked) {
                                  setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.associatedLiabilities`, []);
                                  setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`, 0);
                                  setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`, 0);
                                }
                              }}
                              style={{ width: 'auto', margin: 0 }}
                            />
                            <strong>Owned Free and Clear (No Mortgages/Liens)</strong>
                          </label>
                        </div>
                      </div>

                      {/* Associated Liabilities - Only show if NOT owned free and clear */}
                      {!watch(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.ownedFreeAndClear`) && (
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
                                    const liabilityType = watch(`borrowers.${borrowerIndex}.liabilities.${liabIndex}.liabilityType`);
                                    const creditorName = watch(`borrowers.${borrowerIndex}.liabilities.${liabIndex}.creditorName`);

                                    // Only show Mortgage or HELOC/Revolving
                                    if (liabilityType !== 'MortgageLoan' && liabilityType !== 'Revolving') {
                                      return null;
                                    }

                                    const owner = watch(`borrowers.${borrowerIndex}.liabilities.${liabIndex}.owner`) || '';
                                    const baseName = creditorName || (liabilityType === 'MortgageLoan' ? 'Mortgage' : 'HELOC / Revolving') || `Liability ${liabIndex + 1}`;
                                    const displayName = owner ? `${baseName} — ${owner}` : baseName;

                                    const associatedLiabilities = watch(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.associatedLiabilities`) || [];
                                    const isChecked = associatedLiabilities.includes(liabIndex.toString());

                                    return (
                                      <label
                                        key={liabIndex}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.75rem',
                                          padding: '0.5rem',
                                          background: isChecked ? '#1fb46324' : 'white',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          border: isChecked ? '2px solid #1fb463' : '1px solid #e2e6dd'
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const currentLiabilities = watch(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.associatedLiabilities`) || [];
                                            let newLiabilities;

                                            if (e.target.checked) {
                                              // Add liability
                                              newLiabilities = [...currentLiabilities, liabIndex.toString()];

                                              // Auto-populate amounts if this is the first liability added
                                              if (currentLiabilities.length === 0) {
                                                const liability = getValues(`borrowers.${borrowerIndex}.liabilities.${liabIndex}`);
                                                if (liability) {
                                                  if (liability.monthlyPayment) {
                                                    setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`, liability.monthlyPayment);
                                                  }
                                                  if (liability.unpaidBalance) {
                                                    setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`, liability.unpaidBalance);
                                                  }
                                                }
                                              } else {
                                                // If multiple, sum the amounts
                                                const liability = getValues(`borrowers.${borrowerIndex}.liabilities.${liabIndex}`);
                                                const currentPayment = parseFloat(getValues(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`)) || 0;
                                                const currentBalance = parseFloat(getValues(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`)) || 0;

                                                if (liability) {
                                                  const newPayment = currentPayment + (parseFloat(liability.monthlyPayment) || 0);
                                                  const newBalance = currentBalance + (parseFloat(liability.unpaidBalance) || 0);
                                                  setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`, newPayment);
                                                  setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`, newBalance);
                                                }
                                              }
                                            } else {
                                              // Remove liability
                                              newLiabilities = currentLiabilities.filter(id => id !== liabIndex.toString());

                                              // Subtract the amounts
                                              const liability = getValues(`borrowers.${borrowerIndex}.liabilities.${liabIndex}`);
                                              const currentPayment = parseFloat(getValues(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`)) || 0;
                                              const currentBalance = parseFloat(getValues(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`)) || 0;

                                              if (liability) {
                                                const newPayment = Math.max(0, currentPayment - (parseFloat(liability.monthlyPayment) || 0));
                                                const newBalance = Math.max(0, currentBalance - (parseFloat(liability.unpaidBalance) || 0));
                                                setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`, newPayment);
                                                setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`, newBalance);
                                              }
                                            }

                                            setValue(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.associatedLiabilities`, newLiabilities);
                                          }}
                                          style={{ width: 'auto', margin: 0 }}
                                        />
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: '500' }}>{displayName}</div>
                                          <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                            Payment: ${parseFloat(watch(`borrowers.${borrowerIndex}.liabilities.${liabIndex}.monthlyPayment`) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |
                                            Balance: ${parseFloat(watch(`borrowers.${borrowerIndex}.liabilities.${liabIndex}.unpaidBalance`) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {!watch(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.ownedFreeAndClear`) && (
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
          </div>
        );
      })}
    </FormSection>
  );
};

export default AssetsLiabilitiesStep;
