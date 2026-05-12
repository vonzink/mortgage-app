/**
 * Assets sub-section of the Assets & Liabilities form step.
 *
 * Extracted from AssetsLiabilitiesStep.js as part of audit item SI-6 (the
 * parent was 701 lines stacking three concerns: assets, liabilities, REO).
 * Each row is a single asset (type, owner, bank, account #, value, used-for-
 * downpayment). All assets live under borrower 0 in form state — they're
 * tagged with an "owner" string for actual ownership attribution.
 */
import React from 'react';
import CurrencyInput from '../form-fields/CurrencyInput';
import { createDefaultAsset } from '../../utils/fieldArrayHelpers';

export default function AssetsSection({
  register,
  watch,
  setValue,
  borrowerFields,
  getBorrowerName,
  assetFields,
  appendAsset,
  removeAsset,
}) {
  return (
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
  );
}
