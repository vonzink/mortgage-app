import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FaFolderPlus, FaUpload, FaSyncAlt } from 'react-icons/fa';

import workspaceService, { buildFolderTree, pathTo } from '../services/workspaceService';
import mortgageService from '../services/mortgageService';

import FolderTree from './FolderTree';
import Breadcrumbs from './Breadcrumbs';
import FileTable from './FileTable';
import NewFolderModal from './NewFolderModal';
import DownloadTray from './DownloadTray';
import EditDocumentModal from './EditDocumentModal';
import './workspace.css';

/** How long to trust a cached presigned download URL — backend issues 15-min URLs;
 *  we expire ours a minute early to avoid sending a just-stale URL on the wire. */
const DOWNLOAD_URL_TTL_MS = 14 * 60 * 1000;

/**
 * Phase 2 document workspace. Adds:
 *   - Multi-select (checkboxes + click semantics) shared across the file table
 *   - File drag from FileTable to FolderTree → bulk move via /documents/move
 *   - OS / cross-site drag-out by attaching DownloadURL on dragstart
 *     (single-file only; multi-file zip drag-out lands in Phase 3)
 *   - Folder-aware upload — Upload button now picks files, uploads each into the
 *     currently-selected folder via the existing 3-step S3 flow.
 *
 * Selecting the loan root displays "atRoot" docs (folder_id = root OR NULL) so legacy
 * borrower uploads remain visible until the LO files them.
 */
export default function WorkspaceTab({ loanId }) {
  const [folders, setFolders] = useState([]);
  const [rootId, setRootId] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocUuids, setSelectedDocUuids] = useState(new Set());
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  // Download tray — stages files dragged from FileTable for bulk save.
  // Sidesteps the corporate Defender drag-out block: we never engage browser
  // download events; instead we fetch as Blob and either write via the
  // File System Access API or trigger normal user-initiated downloads.
  const [stagedDocs, setStagedDocs] = useState([]);

  // Combined edit modal state — replaces the older window.prompt rename.
  const [editingDoc, setEditingDoc] = useState(null);

  const fileInputRef = useRef(null);
  const downloadUrlCache = useRef(new Map()); // docUuid → { url, expiresAt }

  // ── Tree + documents fetchers ────────────────────────────────────────────
  const loadTree = useCallback(async () => {
    setLoadingTree(true);
    try {
      const data = await workspaceService.getFolderTree(loanId);
      setFolders(data.folders || []);
      setRootId(data.rootId || null);
      setSelectedFolderId((prev) => prev || data.rootId || null);
    } catch (err) {
      toast.error(`Failed to load folders: ${err.message || err}`);
    } finally {
      setLoadingTree(false);
    }
  }, [loanId]);

  useEffect(() => { loadTree(); }, [loadTree]);

  const loadDocs = useCallback(async () => {
    if (!selectedFolderId) return;
    setLoadingDocs(true);
    try {
      // Clicking the loan root behaves like Dropbox's account root: show every
      // document on the loan regardless of which subfolder it's filed in (unfiled
      // legacy uploads included). Subfolders show only their own contents.
      const docs = (selectedFolderId === rootId)
        ? await workspaceService.getAllDocuments(loanId)
        : await workspaceService.getDocumentsInFolder(loanId, { folderId: selectedFolderId });
      setDocuments(docs);
      // Clear selection that no longer exists in the new view
      setSelectedDocUuids((prev) => {
        const visible = new Set(docs.map((d) => d.docUuid));
        const next = new Set([...prev].filter((u) => visible.has(u)));
        return next;
      });
    } catch (err) {
      toast.error(`Failed to load documents: ${err.message || err}`);
    } finally {
      setLoadingDocs(false);
    }
  }, [loanId, selectedFolderId, rootId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // ── Tree shape + breadcrumbs ─────────────────────────────────────────────
  const tree = useMemo(() => buildFolderTree(folders, rootId), [folders, rootId]);
  const breadcrumb = useMemo(() => pathTo(tree, selectedFolderId), [tree, selectedFolderId]);
  const selectedFolder = breadcrumb[breadcrumb.length - 1] || null;
  const defaultExpanded = useMemo(() => (rootId ? new Set([rootId]) : new Set()), [rootId]);

  // ── Folder create ────────────────────────────────────────────────────────
  const handleCreateFolder = async (displayName) => {
    if (!selectedFolderId) throw new Error('Pick a parent folder first');
    await workspaceService.createFolder(loanId, { parentId: selectedFolderId, displayName });
    await loadTree();
    toast.success(`Folder "${displayName}" created`);
  };

  // ── File move (drop on tree node) ────────────────────────────────────────
  const handleDropFiles = useCallback(async (toFolderId, docUuids) => {
    if (!docUuids || docUuids.length === 0) return;
    try {
      const result = await workspaceService.moveDocuments(loanId, docUuids, toFolderId);
      if (result.moved > 0) {
        toast.success(
          result.moved === 1
            ? '1 file moved'
            : `${result.moved} files moved`,
        );
      }
      await loadDocs();
    } catch (err) {
      toast.error(`Move failed: ${err.message || err}`);
    }
  }, [loanId, loadDocs]);

  // ── Download URL prefetch (powers DownloadURL drag-out) ──────────────────
  const prefetchDownloadUrl = useCallback((doc) => {
    const cache = downloadUrlCache.current;
    const cached = cache.get(doc.docUuid);
    if (cached && cached.expiresAt > Date.now()) return;

    mortgageService.getDocumentDownloadUrl(loanId, doc.docUuid)
      .then(({ downloadUrl }) => {
        cache.set(doc.docUuid, {
          url: downloadUrl,
          expiresAt: Date.now() + DOWNLOAD_URL_TTL_MS,
        });
      })
      .catch(() => {
        // Ignore — drag-out simply won't have DownloadURL set.
        // Internal drag-to-folder still works.
      });
  }, [loanId]);

  const getCachedDownloadUrl = useCallback((doc) => {
    const cached = downloadUrlCache.current.get(doc.docUuid);
    return (cached && cached.expiresAt > Date.now()) ? cached.url : undefined;
  }, []);

  // ── Explicit download button (uses fresh URL, not the cache) ─────────────
  const handleDownload = async (doc) => {
    try {
      const { downloadUrl } = await mortgageService.getDocumentDownloadUrl(loanId, doc.docUuid);
      window.location.href = downloadUrl;
    } catch (err) {
      toast.error(`Download failed: ${err.message || err}`);
    }
  };

  // ── Download tray plumbing ──────────────────────────────────────────────
  const handleStageDocs = useCallback((incoming) => {
    setStagedDocs((prev) => {
      const seen = new Set(prev.map((d) => d.docUuid));
      const additions = incoming.filter((d) => !seen.has(d.docUuid));
      return [...prev, ...additions];
    });
  }, []);

  const handleUnstageDoc = useCallback((docUuid) => {
    setStagedDocs((prev) => prev.filter((d) => d.docUuid !== docUuid));
  }, []);

  const handleClearTray = useCallback(() => setStagedDocs([]), []);

  // The tray asks for fresh URLs at save time — cached URLs from hover-prefetch
  // would be ~14 minutes old by then in some cases; safer to re-issue.
  const resolveDownloadUrl = useCallback(async (docUuid) => {
    const { downloadUrl } = await mortgageService.getDocumentDownloadUrl(loanId, docUuid);
    return downloadUrl;
  }, [loanId]);

  // ── Edit (rename + retag + move) ────────────────────────────────────────
  const handleEditDoc = (doc) => setEditingDoc(doc);

  // The modal supplies a patch with only the changed keys. Folder changes go
  // through moveDocuments (so null=unfile semantics work), and fileName/
  // documentType go through PATCH. Done in one transaction-ish flow so the LO
  // sees a single toast.
  const handleSaveDocEdit = async (patch) => {
    if (!editingDoc) return;
    const { folderId, ...metaPatch } = patch;
    if (Object.keys(metaPatch).length > 0) {
      await workspaceService.patchDocument(loanId, editingDoc.docUuid, metaPatch);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'folderId')) {
      await workspaceService.moveDocuments(loanId, [editingDoc.docUuid], folderId);
    }
    toast.success('Saved');
    setEditingDoc(null);
    await loadDocs();
  };

  // ── Folder delete ───────────────────────────────────────────────────────
  const handleDeleteFolder = async (folder) => {
    if (!folder || folder.id === rootId) return;
    if (folder.isSystem) {
      toast.warning('Default folders cannot be deleted.');
      return;
    }
    if (!window.confirm(`Delete folder "${folder.displayName}"? Files inside will be unfiled.`)) return;
    try {
      await workspaceService.deleteFolder(loanId, folder.id);
      toast.success('Folder deleted');
      if (selectedFolderId === folder.id) setSelectedFolderId(rootId);
      await loadTree();
      await loadDocs();
    } catch (err) {
      toast.error(`Delete failed: ${err.response?.data?.message || err.message || err}`);
    }
  };

  // ── Folder-aware upload ──────────────────────────────────────────────────
  const handleUploadClick = () => {
    if (!selectedFolderId) {
      toast.warning('Pick a folder first');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFilesPicked = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // reset so picking the same file twice still fires onChange
    if (files.length === 0) return;

    // Don't upload TO the loan root — root is a virtual catch-all view (folderId=null
    // OR rootId). Force the LO into a real subfolder.
    const targetFolderId = (selectedFolderId === rootId) ? null : selectedFolderId;

    setUploadingCount(files.length);
    let ok = 0, failed = 0;
    for (const file of files) {
      try {
        await mortgageService.uploadDocument(loanId, {
          file,
          documentType: 'Other', // Phase 3 adds folder→tag auto-suggestion
          partyRole: 'lo',
          folderId: targetFolderId,
        });
        ok++;
      } catch (err) {
        console.error('Upload error', file.name, err);
        failed++;
      }
    }
    setUploadingCount(0);

    if (ok > 0) toast.success(ok === 1 ? '1 file uploaded' : `${ok} files uploaded`);
    if (failed > 0) toast.error(failed === 1 ? '1 file failed to upload' : `${failed} files failed`);
    await loadDocs();
  };

  // Map folder id → display name. Used by the file table when at root so the LO
  // can see which subfolder each doc is filed in.
  const folderNameFor = useCallback((id) => {
    if (id == null) return null;
    const f = folders.find((x) => x.id === id);
    return f ? f.displayName : null;
  }, [folders]);

  const atRoot = selectedFolderId === rootId;

  return (
    <div className="ws-root">
      <div className="ws-toolbar">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowNewFolder(true)}
          disabled={!selectedFolder}
          title="Create a folder under the selected one"
        >
          <FaFolderPlus /> New folder
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={loadTree}
          title="Refresh"
        >
          <FaSyncAlt />
        </button>

        {selectedDocUuids.size > 0 && (
          <span className="ws-selection-count">
            {selectedDocUuids.size} selected
          </span>
        )}

        <div style={{ flex: 1 }} />
      </div>

      <div className="ws-body">
        <aside className="ws-sidebar">
          {loadingTree ? (
            <div className="ws-tree-empty">Loading…</div>
          ) : (
            <FolderTree
              root={tree}
              selectedId={selectedFolderId}
              onSelect={setSelectedFolderId}
              defaultExpanded={defaultExpanded}
              onDropFiles={handleDropFiles}
              onDeleteFolder={handleDeleteFolder}
            />
          )}
        </aside>

        <main className="ws-main">
          <Breadcrumbs path={breadcrumb} onNavigate={setSelectedFolderId} />
          <FileTable
            documents={documents}
            loading={loadingDocs}
            selectedUuids={selectedDocUuids}
            onSelectionChange={setSelectedDocUuids}
            onPrefetchDownload={prefetchDownloadUrl}
            getDownloadUrl={getCachedDownloadUrl}
            onDownload={handleDownload}
            onRename={handleEditDoc}
            showFolder={atRoot}
            folderNameFor={folderNameFor}
          />

          {/* Upload button sits at the END of the file list — once clicked and the
              upload completes, the table refreshes and the new docs appear among
              the files (auto-routed by tag if uploaded from the loan root). */}
          <div className="ws-upload-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUploadClick}
              disabled={!selectedFolder || uploadingCount > 0}
              title={atRoot
                ? 'Files uploaded from root auto-route into folders by tag'
                : `Upload into ${selectedFolder?.displayName || 'this folder'}`}
            >
              <FaUpload /> {uploadingCount > 0 ? `Uploading ${uploadingCount}…` : 'Upload'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFilesPicked}
            />
          </div>

          {/* Download tray relocated inline below the file list — easier to spot
              than the floating bottom-right panel. Only shows when something has
              been staged into it via drag. */}
          {stagedDocs.length > 0 && (
            <DownloadTray
              stagedDocs={stagedDocs}
              onAdd={handleStageDocs}
              onRemove={handleUnstageDoc}
              onClear={handleClearTray}
              resolveDownloadUrl={resolveDownloadUrl}
              inline
            />
          )}
        </main>
      </div>

      {showNewFolder && (
        <NewFolderModal
          parentName={selectedFolder?.displayName || 'this folder'}
          onClose={() => setShowNewFolder(false)}
          onCreate={handleCreateFolder}
        />
      )}

      {editingDoc && (
        <EditDocumentModal
          doc={editingDoc}
          folders={folders}
          rootId={rootId}
          onClose={() => setEditingDoc(null)}
          onSave={handleSaveDocEdit}
        />
      )}
    </div>
  );
}
