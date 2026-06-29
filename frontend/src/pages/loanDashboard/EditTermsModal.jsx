import React, { useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { ModalShell, Row } from './ModalShell';

export function EditTermsModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    baseLoanAmount: initial.baseLoanAmount ?? '',
    noteAmount: initial.noteAmount ?? '',
    noteRatePercent: initial.noteRatePercent ?? '',
    downPaymentAmount: initial.downPaymentAmount ?? '',
    amortizationType: initial.amortizationType ?? '',
    amortizationTermMonths: initial.amortizationTermMonths ?? '',
    lienPriorityType: initial.lienPriorityType ?? '',
    loanPurpose: initial.loanPurpose ?? '',
    applicationReceivedDate: initial.applicationReceivedDate ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setError(null);
    // Strip empty strings — server treats null as "skip this field".
    const payload = Object.fromEntries(Object.entries(form)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined));
    try {
      await onSave(payload);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Edit loan terms" onClose={onClose}>
      <form onSubmit={submit} className="dashboard-form">
        <Row label="Note rate (%)">
          <input type="number" step="0.0001" value={form.noteRatePercent} onChange={set('noteRatePercent')} />
        </Row>
        <Row label="Note amount">
          <input type="number" step="0.01" value={form.noteAmount} onChange={set('noteAmount')} />
        </Row>
        <Row label="Base loan amount">
          <input type="number" step="0.01" value={form.baseLoanAmount} onChange={set('baseLoanAmount')} />
        </Row>
        <Row label="Down payment">
          <input type="number" step="0.01" value={form.downPaymentAmount} onChange={set('downPaymentAmount')} />
        </Row>
        <Row label="Amortization type">
          <select value={form.amortizationType} onChange={set('amortizationType')}>
            <option value="">—</option>
            <option value="FIXED">Fixed</option>
            <option value="ADJUSTABLE_RATE">Adjustable Rate</option>
            <option value="OTHER">Other</option>
          </select>
        </Row>
        <Row label="Term (months)">
          <input type="number" step="1" value={form.amortizationTermMonths} onChange={set('amortizationTermMonths')} />
        </Row>
        <Row label="Lien priority">
          <select value={form.lienPriorityType} onChange={set('lienPriorityType')}>
            <option value="">—</option>
            <option value="FIRST_LIEN">First Lien</option>
            <option value="SECOND_LIEN">Second Lien</option>
          </select>
        </Row>
        <Row label="Loan purpose">
          <select value={form.loanPurpose} onChange={set('loanPurpose')}>
            <option value="">—</option>
            <option value="PURCHASE">Purchase</option>
            <option value="REFINANCE">Refinance</option>
            <option value="CONSTRUCTION">Construction</option>
            <option value="OTHER">Other</option>
          </select>
        </Row>
        <Row label="Application received">
          <input type="date" value={form.applicationReceivedDate} onChange={set('applicationReceivedDate')} />
        </Row>
        {error && <p className="dashboard-form-error">{error}</p>}
        <div className="dashboard-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FaCheck /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
