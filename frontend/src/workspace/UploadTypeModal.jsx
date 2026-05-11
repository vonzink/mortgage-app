import React, { useEffect, useState } from 'react';
import { FaTimes, FaUpload } from 'react-icons/fa';
import workspaceService from '../services/workspaceService';

/**
 * Asks the LO to pick a structured DocumentType + optional description before the
 * actual file upload kicks off. Renders the staged file list so they know what
 * they're about to send.
 *
 * Renders nothing if there are no files (parent should mount/unmount on demand).
 */
export default function UploadTypeModal({ files, defaultPartyRole = 'lo', onCancel, onConfirm }) {
  const [types, setTypes] = useState([]);
  const [typeName, setTypeName] = useState('Other');
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    let cancelled = false;
    workspaceService.listDocumentTypes()
      .then((list) => {
        if (cancelled) return;
        setTypes(list);
        // Pick something sensible by default — preserve "Other" if it's in the list.
        if (list.length > 0 && !list.find(t => t.name === 'Other')) {
          setTypeName(list[0].name);
        }
      })
      .catch(() => { /* fall back to free-text */ })
      .finally(() => { if (!cancelled) setLoadingTypes(false); });
    return () => { cancelled = true; };
  }, []);

  if (!files || files.length === 0) return null;

  const submit = (e) => {
    e?.preventDefault?.();
    onConfirm({
      documentType: typeName,
      partyRole: defaultPartyRole,
    });
  };

  return (
    <div className="ws-modal-backdrop" onClick={onCancel}>
      <div className="ws-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Upload settings">
        <div className="ws-modal-head">
          <h3>Upload {files.length} file{files.length === 1 ? '' : 's'}</h3>
          <button className="btn-icon" onClick={onCancel} aria-label="Close"><FaTimes /></button>
        </div>
        <form onSubmit={submit} className="ws-modal-body">
          <ul className="ws-upload-filelist">
            {files.slice(0, 6).map((f, i) => (
              <li key={i}><span className="ws-file-name" title={f.name}>{f.name}</span></li>
            ))}
            {files.length > 6 && <li style={{ color: '#666', fontStyle: 'italic' }}>+ {files.length - 6} more…</li>}
          </ul>

          <label className="ws-form-row">
            <span>Document type</span>
            {loadingTypes ? (
              <span style={{ fontSize: '0.85rem', color: '#666' }}>Loading…</span>
            ) : types.length > 0 ? (
              <select value={typeName} onChange={(e) => setTypeName(e.target.value)}>
                {types.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="e.g. Income, Title, Other"
              />
            )}
          </label>

          <p style={{ fontSize: '0.8rem', color: '#666', margin: '0.5rem 0 0' }}>
            Add a description after upload via the file's edit menu.
          </p>

          <div className="ws-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <FaUpload /> Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
