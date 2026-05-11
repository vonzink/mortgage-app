import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FaFolderPlus, FaUpload, FaSyncAlt, FaSearch, FaTimes, FaCheck, FaSyncAlt as FaRevise } from 'react-icons/fa';

import workspaceService, { buildFolderTree, pathTo } from '../services/workspaceService';
import mortgageService from '../services/mortgageService';

import FolderTree from './FolderTree';
import Breadcrumbs from './Breadcrumbs';
import FileTable from './FileTable';
import NewFolderModal from './NewFolderModal';
import DownloadTray from './DownloadTray';
import EditDocumentModal from './EditDocumentModal';
import DocumentHistory from './DocumentHistory';
import DocumentReviewPanel from './DocumentReviewPanel';
import UploadTypeModal from './UploadTypeModal';
import './workspace.css';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'UPLOADED', label: 'Uploaded' },
  { value: 'READY_FOR_REVIEW', label: 'Ready for review' },
  { value: 'NEEDS_BORROWER_ACTION', label: 'Needs borrower action' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const PARTY_ROLE_OPTIONS = [
  { value: '', label: 'All uploaders' },
  { value: 'borrower', label: 'Borrower' },
  { value: 'agent', label: 'Agent' },
  { value: 'lo', label: 'LO' },
  { value: 'system', label: 'System' },
];

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

  // Phase 1/2: history + review modals (one at a time).
  const [historyDoc, setHistoryDoc] = useState(null);
  const [reviewingDoc, setReviewingDoc] = useState(null);

  // Phase 3: staged files awaiting type selection before the actual upload starts.
  const [pendingUploadFiles, setPendingUploadFiles] = useState([]);

  // Phase 5: search + filters. When any are set, we hit /documents/search
  // instead of the folder-scoped listing.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [partyRoleFilter, setPartyRoleFilter] = useState('');
  const [docTypes, setDocTypes] = useState([]);

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

  // Doc types — used by the type filter dropdown. Loaded once; falls back to empty
  // list if the endpoint isn't reachable (filter just hides itself in that case).
  useEffect(() => {
    let cancelled = false;
    workspaceService.listDocumentTypes()
      .then((list) => { if (!cancelled) setDocTypes(list); })
      .catch(() => { /* hide the filter silently */ });
    return () => { cancelled = true; };
  }, []);

  const loadDocs = useCallback(async () => {
    if (!selectedFolderId) return;
    setLoadingDocs(true);
    try {
      let docs;
      if (search.trim() || statusFilter || typeFilter || partyRoleFilter) {
        // Search mode — server-side filter. Scope to folder unless we're at root.
        const folderScope = (selectedFolderId === rootId) ? undefined : selectedFolderId;
        const result = await workspaceService.searchDocuments(loanId, {
          q: search.trim() || undefined,
          status: statusFilter || undefined,
          documentTypeId: typeFilter || undefined,
          partyRole: partyRoleFilter || undefined,
          folderId: folderScope,
          size: 200,
        });
        docs = result.documents || result.content || [];
      } else if (selectedFolderId === rootId) {
        // Clicking the loan root behaves like Dropbox's account root: show every
        // document on the loan regardless of which subfolder it's filed in.
        docs = await workspaceService.getAllDocuments(loanId);
      } else {
        docs = await workspaceService.getDocumentsInFolder(loanId, { folderId: selectedFolderId });
      }
      setDocuments(docs);
      setSelectedDocUuids((prev) => {
        const visible = new Set(docs.map((d) => d.docUuid));
        return new Set([...prev].filter((u) => visible.has(u)));
      });
    } catch (err) {
      toast.error(`Failed to load documents: ${err.message || err}`);
    } finally {
      setLoadingDocs(false);
    }
  }, [loanId, selectedFolderId, rootId, search, statusFilter, typeFilter, partyRoleFilter]);

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

  const handleFilesPicked = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    // Stage files and open the type modal — actual upload kicks off on confirm.
    setPendingUploadFiles(files);
  };

  const handleUploadConfirm = async ({ documentType, partyRole }) => {
    const files = pendingUploadFiles;
    setPendingUploadFiles([]);
    if (!files || files.length === 0) return;

    // Don't upload TO the loan root — root is a virtual catch-all view.
    // Force the LO into a real subfolder.
    const targetFolderId = (selectedFolderId === rootId) ? null : selectedFolderId;

    setUploadingCount(files.length);
    let ok = 0, failed = 0;
    for (const file of files) {
      try {
        await mortgageService.uploadDocument(loanId, {
          file,
          documentType,
          partyRole,
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
  const atDeleteFolder = selectedFolder?.isDeleteFolder === true;
  const searchActive = !!(search.trim() || statusFilter || typeFilter || partyRoleFilter);

  const handleHistory = useCallback((doc) => setHistoryDoc(doc), []);
  const handleReview = useCallback((doc) => setReviewingDoc(doc), []);
  const handleReviewed = useCallback(() => loadDocs(), [loadDocs]);
  const handleClearSearch = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPartyRoleFilter('');
  }, []);

  /**
   * Bulk-review entry point. Prompts for notes when required, fires the bulk endpoint,
   * surfaces a summary toast (succeeded / failed) and reloads the table. Failures from
   * individual docs (invalid state transitions, etc.) are bundled into the response and
   * shown inline rather than aborting the whole batch.
   */
  const handleBulkReview = useCallback(async (decision) => {
    const uuids = [...selectedDocUuids];
    if (uuids.length === 0) return;
    const requiresNotes = decision === 'REJECTED' || decision === 'NEEDS_BORROWER_ACTION';
    let notes = null;
    if (requiresNotes) {
      // eslint-disable-next-line no-alert
      notes = window.prompt(
        decision === 'REJECTED'
          ? `Reject ${uuids.length} document${uuids.length === 1 ? '' : 's'}. Reason?`
          : `Request revision on ${uuids.length} document${uuids.length === 1 ? '' : 's'}. What should the borrower fix?`,
      );
      if (notes == null) return;
      if (!notes.trim()) { toast.warn('A note is required'); return; }
    }
    try {
      const result = await workspaceService.bulkReview(loanId, uuids, decision, notes);
      const verb = decision === 'ACCEPTED' ? 'accepted'
                 : decision === 'REJECTED' ? 'rejected'
                 : 'sent back for revision';
      if (result.succeeded > 0) {
        toast.success(`${result.succeeded} document${result.succeeded === 1 ? '' : 's'} ${verb}`);
      }
      if (result.failed > 0) {
        toast.warn(`${result.failed} document${result.failed === 1 ? '' : 's'} skipped (invalid state)`);
      }
      setSelectedDocUuids(new Set());
      await loadDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Bulk review failed');
    }
  }, [loanId, selectedDocUuids, loadDocs]);

  /**
   * Permanent delete — only reachable from inside the Delete folder. Confirms with
   * a strong "type-the-name" style prompt so accidental clicks don't take a doc.
   * Backend re-checks folder placement and rejects if the doc was moved out.
   */
  const handlePermanentDelete = useCallback(async (doc) => {
    const confirmed = window.confirm(
      `Permanently delete "${doc.fileName}"?\n\n` +
      `This removes the file from S3 and the database. It cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await workspaceService.permanentlyDeleteDocument(loanId, doc.docUuid);
      toast.success(`Deleted ${doc.fileName}`);
      await loadDocs();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Delete failed';
      toast.error(msg);
    }
  }, [loanId, loadDocs]);

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
          <>
            <span className="ws-selection-count">
              {selectedDocUuids.size} selected
            </span>
            {!atDeleteFolder && (
              <div className="ws-bulk-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-bulk"
                  onClick={() => handleBulkReview('ACCEPTED')}
                  title="Accept all selected"
                >
                  <FaCheck /> Accept
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-bulk"
                  onClick={() => handleBulkReview('NEEDS_BORROWER_ACTION')}
                  title="Request borrower revision"
                >
                  <FaRevise /> Request revision
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-bulk btn-bulk--danger"
                  onClick={() => handleBulkReview('REJECTED')}
                  title="Reject all selected"
                >
                  <FaTimes /> Reject
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        <div className="ws-search-wrap">
          <FaSearch className="ws-search-icon" aria-hidden />
          <input
            type="search"
            className="ws-search-input"
            placeholder="Search by file name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="ws-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          title="Filter by status"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {docTypes.length > 0 && (
          <select
            className="ws-status-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            title="Filter by document type"
          >
            <option value="">All types</option>
            {docTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <select
          className="ws-status-filter"
          value={partyRoleFilter}
          onChange={(e) => setPartyRoleFilter(e.target.value)}
          title="Filter by who uploaded"
        >
          {PARTY_ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {searchActive && (
          <button type="button" className="btn btn-secondary btn-icon" onClick={handleClearSearch} title="Clear search">
            <FaTimes />
          </button>
        )}
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

          {atDeleteFolder && (
            <div className="ws-delete-warning">
              <strong>Delete folder.</strong> Files dragged here can be permanently
              removed using the trash button. <em>This is the only way to delete documents
              and the action cannot be undone.</em>
            </div>
          )}

          <FileTable
            documents={documents}
            loading={loadingDocs}
            selectedUuids={selectedDocUuids}
            onSelectionChange={setSelectedDocUuids}
            onPrefetchDownload={prefetchDownloadUrl}
            getDownloadUrl={getCachedDownloadUrl}
            onDownload={handleDownload}
            onRename={atDeleteFolder ? null : handleEditDoc}
            onReview={atDeleteFolder ? null : handleReview}
            onHistory={handleHistory}
            onDelete={atDeleteFolder ? handlePermanentDelete : null}
            showFolder={atRoot || searchActive}
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

          {/* Download tray inline below the file list. Always rendered so its
              empty-state placeholder ("Drag files here to stage them for
              download.") gives the LO an obvious drop target — the tray itself
              is what receives the drag, not a phantom region. */}
          <DownloadTray
            stagedDocs={stagedDocs}
            onAdd={handleStageDocs}
            onRemove={handleUnstageDoc}
            onClear={handleClearTray}
            resolveDownloadUrl={resolveDownloadUrl}
            inline
          />
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

      {historyDoc && (
        <DocumentHistory
          loanId={loanId}
          doc={historyDoc}
          onClose={() => setHistoryDoc(null)}
        />
      )}

      {reviewingDoc && (
        <DocumentReviewPanel
          loanId={loanId}
          doc={reviewingDoc}
          onClose={() => setReviewingDoc(null)}
          onReviewed={handleReviewed}
        />
      )}

      {pendingUploadFiles.length > 0 && (
        <UploadTypeModal
          files={pendingUploadFiles}
          onCancel={() => setPendingUploadFiles([])}
          onConfirm={handleUploadConfirm}
        />
      )}
    </div>
  );
}
