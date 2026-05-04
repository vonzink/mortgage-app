import React, { useState, useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';

/**
 * Tiny modal for creating a folder under {parentName}. Auto-focuses the input;
 * Enter submits, Esc closes.
 */
export default function NewFolderModal({ parentName, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(trimmed);
      onClose();
    } catch (err) {
      setError(err.message || String(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <div className="ws-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="New folder">
        <div className="ws-modal-head">
          <h3>New folder</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close"><FaTimes /></button>
        </div>
        <form onSubmit={handleSubmit} className="ws-modal-body">
          <label htmlFor="ws-new-folder-name" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Inside <strong>{parentName}</strong>
          </label>
          <input
            id="ws-new-folder-name"
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            disabled={submitting}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            maxLength={255}
          />
          {error && <p className="ws-modal-error">{error}</p>}
          <div className="ws-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !name.trim()}>
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
