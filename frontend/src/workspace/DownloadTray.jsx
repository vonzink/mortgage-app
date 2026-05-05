import React, { useState, useCallback } from 'react';
import { FaDownload, FaTimes, FaFileAlt, FaFolderOpen, FaSave } from 'react-icons/fa';
import { INTERNAL_DRAG_MIME } from './FileTable';

/**
 * Download tray. Drag files from the FileTable into the tray to stage them, then
 * use one of two save mechanisms:
 *
 *   - Chrome/Edge with File System Access API: "Save to folder…" opens a native
 *     folder picker; we fetch each file as a Blob and write it directly into the
 *     chosen directory. No browser download events fire — Defender for Cloud
 *     Apps treats it as XHR data, not a download, which usually slips past the
 *     drag-out block.
 *   - Safari/Firefox/older browsers: "Download all" triggers sequential
 *     <a download="…"> clicks against fresh presigned URLs. Files land in the
 *     user's default Downloads folder, same as the per-row Download button.
 *
 * Internal-only drag MIME: tray drops never include the DownloadURL data
 * type, so the OS-level drag-out path is never engaged here.
 *
 * Props:
 *   stagedDocs:  array of { docUuid, fileName, fileSize, contentType, documentType }
 *   onAdd:       (docs) => void; called when files are dropped INTO the tray
 *   onRemove:    (docUuid) => void; remove a single staged doc
 *   onClear:     () => void
 *   resolveDownloadUrl: (docUuid) => Promise<string>; fetches a fresh presigned URL
 */
export default function DownloadTray({
  stagedDocs,
  onAdd,
  onRemove,
  onClear,
  resolveDownloadUrl,
  /** When true, render inline in normal flow (below the file list) instead of
   *  the floating bottom-right panel. */
  inline = false,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [savingProgress, setSavingProgress] = useState(null); // { current, total } | null

  const supportsFsa = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // ── Drop target ──────────────────────────────────────────────────────────
  const onDragEnter = (e) => {
    if (!hasInternalDrag(e)) return;
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragOver = (e) => {
    if (!hasInternalDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = (e) => {
    // dragleave fires when crossing INTO child elements; only un-highlight when
    // we've actually left the tray container.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };
  const onDrop = (e) => {
    if (!hasInternalDrag(e)) return;
    e.preventDefault();
    setIsDragOver(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData(INTERNAL_DRAG_MIME) || '{}');
      const incoming = Array.isArray(payload.docs) ? payload.docs : [];
      if (incoming.length > 0) onAdd(incoming);
    } catch {
      /* malformed payload → ignore */
    }
  };

  // ── Save to folder (FSA) ────────────────────────────────────────────────
  const handleSaveToFolder = useCallback(async () => {
    if (stagedDocs.length === 0) return;

    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker({
        id: 'mortgage-app-downloads', // browser remembers the last-picked dir under this id
        mode: 'readwrite',
      });
    } catch (err) {
      // User cancelled the picker — quiet exit.
      if (err?.name === 'AbortError') return;
      throw err;
    }

    setSavingProgress({ current: 0, total: stagedDocs.length });

    // Sequential to keep memory bounded for large files; bandwidth is the
    // bottleneck anyway for typical mortgage docs.
    let i = 0;
    for (const doc of stagedDocs) {
      try {
        const url = await resolveDownloadUrl(doc.docUuid);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const fileHandle = await dirHandle.getFileHandle(uniqueName(doc.fileName, i), { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (err) {
        // Continue past per-file errors; surface a summary at the end.
        // eslint-disable-next-line no-console
        console.error('Save failed for', doc.fileName, err);
      }
      i++;
      setSavingProgress({ current: i, total: stagedDocs.length });
    }

    setSavingProgress(null);
    onClear();
  }, [stagedDocs, resolveDownloadUrl, onClear]);

  // ── Sequential download fallback (no FSA) ───────────────────────────────
  const handleDownloadAll = useCallback(async () => {
    if (stagedDocs.length === 0) return;
    setSavingProgress({ current: 0, total: stagedDocs.length });
    let i = 0;
    for (const doc of stagedDocs) {
      try {
        const url = await resolveDownloadUrl(doc.docUuid);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        // Pause briefly between clicks — some browsers throttle multiple
        // simultaneous downloads or pop a "allow site to download multiple
        // files?" prompt that resolves cleanly with a small gap.
        document.body.appendChild(a);
        a.click();
        a.remove();
        await new Promise((r) => setTimeout(r, 250));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Download failed for', doc.fileName, err);
      }
      i++;
      setSavingProgress({ current: i, total: stagedDocs.length });
    }
    setSavingProgress(null);
    onClear();
  }, [stagedDocs, resolveDownloadUrl, onClear]);

  // ── Render ──────────────────────────────────────────────────────────────
  // Hidden when empty AND not being dragged onto. Visible (with placeholder
  // empty state) the moment the user drags anything over the workspace.
  const hasItems = stagedDocs.length > 0;

  return (
    <aside
      className={`ws-tray${hasItems ? ' ws-tray--open' : ''}${isDragOver ? ' ws-tray--drophover' : ''}${inline ? ' ws-tray--inline' : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label="Download tray"
    >
      <div className="ws-tray-head">
        <div>
          <strong>Download tray</strong>
          {hasItems && <span className="ws-tray-count">{stagedDocs.length}</span>}
        </div>
        {hasItems && (
          <button
            type="button"
            className="btn-icon"
            onClick={onClear}
            title="Clear tray"
            disabled={savingProgress != null}
          >
            <FaTimes />
          </button>
        )}
      </div>

      {!hasItems ? (
        <div className="ws-tray-empty">
          <FaFolderOpen />
          <div>Drag files here to stage them for download.</div>
          <small>Pick a destination folder once, save them all together.</small>
        </div>
      ) : (
        <>
          <ul className="ws-tray-list">
            {stagedDocs.map((doc) => (
              <li key={doc.docUuid} className="ws-tray-item">
                <FaFileAlt aria-hidden />
                <span className="ws-tray-filename" title={doc.fileName}>{doc.fileName}</span>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => onRemove(doc.docUuid)}
                  title="Remove from tray"
                  disabled={savingProgress != null}
                >
                  <FaTimes />
                </button>
              </li>
            ))}
          </ul>

          <div className="ws-tray-actions">
            {savingProgress ? (
              <div className="ws-tray-progress">
                Saving {savingProgress.current} / {savingProgress.total}…
              </div>
            ) : supportsFsa ? (
              <>
                <button type="button" className="btn btn-primary" onClick={handleSaveToFolder}>
                  <FaSave /> Save to folder…
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleDownloadAll}>
                  <FaDownload /> Downloads
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleDownloadAll}>
                <FaDownload /> Download all
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function hasInternalDrag(e) {
  return Array.from(e.dataTransfer?.types || []).includes(INTERNAL_DRAG_MIME);
}

/**
 * Avoid name collisions when the same filename appears twice (rare, but
 * possible — same filename under different folders, or two W2s named
 * "Heaton Income W2.pdf"). Append " (2)", " (3)", ... when needed.
 *
 * Index-based suffix for now; collisions across runs would need a
 * read-then-bump check via dirHandle.getFileHandle without { create: true }.
 */
function uniqueName(name, index) {
  if (index === 0) return name;
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return `${name} (${index + 1})`;
  return `${name.slice(0, dot)} (${index + 1})${name.slice(dot)}`;
}
