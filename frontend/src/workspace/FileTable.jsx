import React from 'react';
import { FaFileAlt, FaDownload, FaTrash } from 'react-icons/fa';

/**
 * Phase 1 file list — simple table. Drag-drop, multi-select, and bulk actions
 * land in Phase 2 / Phase 4.
 */
export default function FileTable({ documents, loading, onDownload, onDelete }) {
  if (loading) {
    return <div className="ws-file-empty">Loading documents…</div>;
  }
  if (!documents || documents.length === 0) {
    return <div className="ws-file-empty">No documents in this folder yet.</div>;
  }

  return (
    <table className="ws-file-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Tag</th>
          <th>Size</th>
          <th>Uploaded</th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.docUuid || doc.id}>
            <td>
              <FaFileAlt className="ws-file-icon" aria-hidden />
              <span className="ws-file-name" title={doc.fileName}>{doc.fileName}</span>
            </td>
            <td><span className="ws-tag">{doc.documentType || 'Other'}</span></td>
            <td>{formatSize(doc.fileSize)}</td>
            <td>{formatDate(doc.uploadedAt)}</td>
            <td className="ws-file-actions">
              {onDownload && (
                <button type="button" className="btn-icon" onClick={() => onDownload(doc)} title="Download">
                  <FaDownload />
                </button>
              )}
              {onDelete && (
                <button type="button" className="btn-icon btn-icon--danger" onClick={() => onDelete(doc)} title="Delete">
                  <FaTrash />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
