import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaCheck } from 'react-icons/fa';
import workspaceService from '../services/workspaceService';

/** Fallback common tags shown if the structured document_types endpoint fails to load. */
const COMMON_TAGS = [
  'Submission', 'Borrower', 'Income', 'Assets', 'Credit',
  'Property', 'Title', 'Insurance', 'Disclosures', 'Conditions',
  'Underwriting', 'Closing', 'Post Closing', 'Invoice', 'Correspondence',
  'Other',
];

/**
 * Combined rename + retag + description + move modal. Pulls structured document types
 * from the backend so the LO picks from a managed list; falls back to free-text tags
 * if the endpoint isn't reachable. Adds a description field (Phase 1).
 */
export default function EditDocumentModal({
  doc,
  folders,
  rootId,
  onClose,
  onSave,
}) {
  const [fileName, setFileName] = useState(doc.fileName || '');
  const [documentType, setDocumentType] = useState(doc.documentType || 'Other');
  const [folderId, setFolderId] = useState(doc.folderId ?? '');
  const [description, setDescription] = useState(doc.description || '');
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  useEffect(() => {
    let cancelled = false;
    workspaceService.listDocumentTypes()
      .then((list) => { if (!cancelled) setTypes(list); })
      .catch(() => { /* keep COMMON_TAGS fallback */ });
    return () => { cancelled = true; };
  }, []);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!fileName.trim()) { setError('File name is required'); return; }
    setSaving(true);
    setError(null);

    const patch = {};
    if (fileName.trim() !== (doc.fileName || '')) patch.fileName = fileName.trim();
    if ((documentType || '') !== (doc.documentType || '')) patch.documentType = documentType;
    if ((description || '') !== (doc.description || '')) patch.description = description;
    const newFolder = folderId === '' ? null : Number(folderId);
    if (newFolder !== (doc.folderId ?? null)) patch.folderId = newFolder;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    try {
      await onSave(patch);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
      setSaving(false);
    }
  };

  const folderOptions = (folders || [])
    .filter(f => f.id !== rootId)
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  // Prefer the structured list when available, otherwise fall back to common tag strings.
  const tagOptions = types.length > 0
    ? types.map((t) => ({ value: t.name, label: t.name }))
    : COMMON_TAGS.map((t) => ({ value: t, label: t }));

  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <div className="ws-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Edit document">
        <div className="ws-modal-head">
          <h3>Edit document</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><FaTimes /></button>
        </div>
        <form onSubmit={submit} className="ws-modal-body">
          <label className="ws-form-row">
            <span>File name</span>
            <input
              ref={inputRef}
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              maxLength={255}
              disabled={saving}
            />
          </label>
          <label className="ws-form-row">
            <span>Tag</span>
            <input
              type="text"
              list="ws-tag-suggestions"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              disabled={saving}
              placeholder="e.g. Income, Title, Underwriting"
            />
            <datalist id="ws-tag-suggestions">
              {tagOptions.map(t => <option key={t.value} value={t.value} />)}
            </datalist>
          </label>
          <label className="ws-form-row">
            <span>Description</span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              disabled={saving}
              placeholder="Optional notes about this document"
            />
          </label>
          <label className="ws-form-row">
            <span>Folder</span>
            <select
              value={folderId === null ? '' : folderId}
              onChange={(e) => setFolderId(e.target.value)}
              disabled={saving}
            >
              <option value="">— root (unfiled) —</option>
              {folderOptions.map(f => (
                <option key={f.id} value={f.id}>{f.displayName}</option>
              ))}
            </select>
          </label>
          {error && <p className="ws-modal-error">{error}</p>}
          <div className="ws-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <FaCheck /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
