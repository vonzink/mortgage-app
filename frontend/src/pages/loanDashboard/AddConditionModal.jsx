import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { ModalShell, Row } from './ModalShell';
import { prettyEnum } from './format';

const CONDITION_TYPES = ['PriorToDocs', 'PriorToFunding', 'AtClosing', 'PostClose', 'Other'];

export function AddConditionModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    conditionText: '',
    conditionType: 'PriorToDocs',
    dueDate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.conditionText.trim()) {
      setError('Condition text is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!payload.dueDate) delete payload.dueDate;
      if (!payload.notes) delete payload.notes;
      await onSave(payload);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Add condition" onClose={onClose}>
      <form onSubmit={submit} className="dashboard-form">
        <Row label="Condition" full>
          <textarea
            rows={3}
            value={form.conditionText}
            onChange={set('conditionText')}
            placeholder='e.g., "Provide most recent 2 months bank statements all pages"'
            autoFocus
          />
        </Row>
        <Row label="Type">
          <select value={form.conditionType} onChange={set('conditionType')}>
            {CONDITION_TYPES.map(t => <option key={t} value={t}>{prettyEnum(t)}</option>)}
          </select>
        </Row>
        <Row label="Due date">
          <input type="date" value={form.dueDate} onChange={set('dueDate')} />
        </Row>
        <Row label="Notes" full>
          <textarea rows={2} value={form.notes} onChange={set('notes')} />
        </Row>
        {error && <p className="dashboard-form-error">{error}</p>}
        <div className="dashboard-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FaPlus /> {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
