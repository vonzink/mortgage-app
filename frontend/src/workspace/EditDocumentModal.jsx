import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaCheck } from 'react-icons/fa';

/** Tag options offered to the LO. Matches the auto-route mapping in
 *  DocumentController.findDefaultFolderForTag — picking one of these will
 *  align the doc with its default folder. Free-text isn't blocked, so the LO
 *  can also type something else (the field is data-driven, not enum-locked). */
const COMMON_TAGS = [
  'Submission', 'Borrower', 'Income', 'Assets', 'Credit',
  'Property', 'Title', 'Insurance', 'Disclosures', 'Conditions',
  'Underwriting', 'Closing', 'Post Closing', 'Invoice', 'Correspondence',
  'Other',
];

/**
 * Combined rename + retag + move modal. Replaces the older window.prompt rename.
 * Renders three controls — file name, tag, target folder — and saves changes
 * via the onSave callback (which the parent builds from dashboardService /
 * mortgageService PATCHes). Empty string fields are stripped before save so the
 * server treats them as "leave alone".
 */
export default function EditDocumentModal({
  doc,
  folders,           // flat folder list (for the move dropdown). May be []; "no change" is always available.
  rootId,
  onClose,
  onSave,            // (patch: { fileName?, documentType?, folderId? }) => Promise
}) {
  const [fileName, setFileName] = useState(doc.fileName || '');
  const [documentType, setDocumentType] = useState(doc.documentType || 'Other');
  const [folderId, setFolderId] = useState(doc.folderId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!fileName.trim()) { setError('File name is required'); return; }
    setSaving(true);
    setError(null);

    const patch = {};
    if (fileName.trim() !== (doc.fileName || '')) patch.fileName = fileName.trim();
    if ((documentType || '') !== (doc.documentType || '')) patch.documentType = documentType;
    // folderId: '' = no folder (root); a number = a real folder id. Only patch if changed.
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

  // Build the folder dropdown — flat list, alphabetic by display name, with the
  // root folder presented as "(root — unfiled)" since selecting it places the
  // doc above the seeded subfolders.
  const folderOptions = (folders || [])
    .filter(f => f.id !== rootId)            // root is "" instead, below
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

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
              {COMMON_TAGS.map(t => <option key={t} value={t} />)}
            </datalist>
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
