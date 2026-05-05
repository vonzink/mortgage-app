import React, { useCallback } from 'react';
import { FaFileAlt, FaDownload, FaTrash, FaPencilAlt } from 'react-icons/fa';

/** MIME tag we use to recognize internal (within-app) drags from external (OS file) drops. */
export const INTERNAL_DRAG_MIME = 'application/x-mortgage-docs';

/**
 * Phase 2 file list. Adds:
 *   - Checkbox per row + select-all header (multi-select)
 *   - Shift/Cmd/Ctrl-click row-selection semantics
 *   - HTML5 native drag for both internal moves (folder drop) and OS-level
 *     drag-out (DownloadURL data type, single-file)
 *
 * Drop-onto-folder semantics live in FolderTree; this component just SOURCES the drag.
 *
 * Props:
 *   documents          — array of doc DTOs from the backend
 *   loading            — bool
 *   selectedUuids      — Set<string> of currently-selected doc uuids
 *   onSelectionChange  — (Set<string>) => void
 *   onPrefetchDownload — (doc) => void; called when a row is hovered, to populate
 *                        the download-url cache so the dragstart handler can attach
 *                        DownloadURL synchronously.
 *   getDownloadUrl     — (doc) => string | undefined; lookup into the prefetch cache
 *   onDownload         — (doc) => void; explicit download button click
 *   onRename           — (doc) => void; or null to hide. WorkspaceTab supplies
 *                        a window.prompt-driven handler for now.
 *   onDelete           — (doc) => void; or null to hide
 */
export default function FileTable({
  documents,
  loading,
  selectedUuids,
  onSelectionChange,
  onPrefetchDownload,
  getDownloadUrl,
  onDownload,
  onRename,
  onDelete,
}) {
  // ── Selection helpers ────────────────────────────────────────────────────
  const toggleAll = useCallback(() => {
    if (selectedUuids.size === documents.length && documents.length > 0) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(documents.map((d) => d.docUuid)));
    }
  }, [documents, selectedUuids, onSelectionChange]);

  const handleRowClick = useCallback((e, doc) => {
    // Ignore clicks on the action buttons / checkbox itself
    if (e.target.closest('button, input, a')) return;
    const next = new Set(selectedUuids);
    if (e.metaKey || e.ctrlKey) {
      next.has(doc.docUuid) ? next.delete(doc.docUuid) : next.add(doc.docUuid);
    } else if (e.shiftKey && selectedUuids.size > 0) {
      const ids = documents.map((d) => d.docUuid);
      const lastIdx = Math.max(...[...selectedUuids].map((u) => ids.indexOf(u)));
      const thisIdx = ids.indexOf(doc.docUuid);
      const [from, to] = lastIdx < thisIdx ? [lastIdx, thisIdx] : [thisIdx, lastIdx];
      for (let i = from; i <= to; i++) next.add(ids[i]);
    } else {
      next.clear();
      next.add(doc.docUuid);
    }
    onSelectionChange(next);
  }, [documents, selectedUuids, onSelectionChange]);

  const toggleRow = (docUuid, checked) => {
    const next = new Set(selectedUuids);
    checked ? next.add(docUuid) : next.delete(docUuid);
    onSelectionChange(next);
  };

  // ── Drag start: package internal doc-uuids + best-effort DownloadURL ─────
  const handleDragStart = useCallback((e, doc) => {
    // If the dragged row isn't in the selection, treat it as a single-file drag
    // (Dropbox/Drive behavior — drag of an unselected item ignores selection).
    const dragging = selectedUuids.has(doc.docUuid)
      ? [...selectedUuids]
      : [doc.docUuid];

    // Internal format used by FolderTree drop targets
    e.dataTransfer.setData(INTERNAL_DRAG_MIME, JSON.stringify({ docUuids: dragging }));

    // External format for OS / cross-site drop. Only meaningful for a single file —
    // a multi-file desktop drag would need a server-zipped URL (Phase 3).
    if (dragging.length === 1) {
      const url = getDownloadUrl?.(doc);
      if (url) {
        const mime = doc.contentType || 'application/octet-stream';
        const safeName = (doc.fileName || 'download').replace(/[\r\n:]/g, '_');
        e.dataTransfer.setData('DownloadURL', `${mime}:${safeName}:${url}`);
      }
    }

    // Custom drag preview text — count badge for multi-select, filename for single.
    e.dataTransfer.effectAllowed = 'copyMove';
  }, [selectedUuids, getDownloadUrl]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div className="ws-file-empty">Loading documents…</div>;
  if (!documents || documents.length === 0) {
    return <div className="ws-file-empty">No documents in this folder yet. Drag files here, or click Upload.</div>;
  }

  const allSelected = selectedUuids.size === documents.length && documents.length > 0;
  const someSelected = selectedUuids.size > 0 && !allSelected;

  return (
    <table className="ws-file-table">
      <thead>
        <tr>
          <th className="ws-col-check">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleAll}
              aria-label="Select all"
            />
          </th>
          <th>Name</th>
          <th>Tag</th>
          <th>Size</th>
          <th>Uploaded</th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => {
          const isSelected = selectedUuids.has(doc.docUuid);
          return (
            <tr
              key={doc.docUuid || doc.id}
              draggable
              onDragStart={(e) => handleDragStart(e, doc)}
              onMouseEnter={() => onPrefetchDownload?.(doc)}
              onClick={(e) => handleRowClick(e, doc)}
              className={isSelected ? 'ws-row--selected' : ''}
            >
              <td className="ws-col-check">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => toggleRow(doc.docUuid, e.target.checked)}
                  aria-label={`Select ${doc.fileName}`}
                />
              </td>
              <td>
                <FaFileAlt className="ws-file-icon" aria-hidden />
                <span className="ws-file-name" title={doc.fileName}>{doc.fileName}</span>
              </td>
              <td><span className="ws-tag">{doc.documentType || 'Other'}</span></td>
              <td>{formatSize(doc.fileSize)}</td>
              <td>{formatDate(doc.uploadedAt)}</td>
              <td className="ws-file-actions">
                {onRename && (
                  <button type="button" className="btn-icon" onClick={() => onRename(doc)} title="Rename">
                    <FaPencilAlt />
                  </button>
                )}
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
          );
        })}
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
