import React from 'react';

/** Lightweight modal shell shared by EditTermsModal + AddConditionModal. */
export function ModalShell({ title, children, onClose }) {
  return (
    <div className="dashboard-modal-backdrop" onClick={onClose}>
      <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dashboard-modal-head">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="dashboard-modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Form row inside a dashboard modal: <label> with text + an input/select/textarea. */
export function Row({ label, children, full }) {
  return (
    <label className={`dashboard-form-row${full ? ' dashboard-form-row--full' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
