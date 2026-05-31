import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import FolderEvaluationCard from './FolderEvaluationCard';

import useWorkspaceUpload from './useWorkspaceUpload';
import useWorkspaceActions from './useWorkspaceActions';
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

/**
 * Phase 2 document workspace — layout orchestrator.
 *
 * Upload logic lives in useWorkspaceUpload; document CRUD, move, delete,
 * download-tray, and bulk-review live in useWorkspaceActions.
 */
export default function WorkspaceTab({ loanId }) {
  // ── Folder tree state ──────────────────────────────────────────────────
  const [folders, setFolders] = useState([]);
  const [rootId, setRootId] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocUuids, setSelectedDocUuids] = useState(new Set());
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);

  // Search + filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [partyRoleFilter, setPartyRoleFilter] = useState('');
  const [docTypes, setDocTypes] = useState([]);

  // AI folder evaluation gating
  const [aiEnabled, setAiEnabled] = useState(false);
  useEffect(() => {
    mortgageService.getAppSettingsPublic()
      .then((s) => setAiEnabled(!!s?.aiEvalEnabled))
      .catch(() => setAiEnabled(false));
  }, []);

  // ── Tree + documents fetchers ──────────────────────────────────────────
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

  useEffect(() => {
    let cancelled = false;
    workspaceService.listDocumentTypes()
      .then((list) => { if (!cancelled) setDocTypes(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const loadDocs = useCallback(async () => {
    if (!selectedFolderId) return;
    setLoadingDocs(true);
    try {
      let docs;
      if (search.trim() || statusFilter || typeFilter || partyRoleFilter) {
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

  // ── Derived tree shape ─────────────────────────────────────────────────
  const tree = useMemo(() => buildFolderTree(folders, rootId), [folders, rootId]);
  const breadcrumb = useMemo(() => pathTo(tree, selectedFolderId), [tree, selectedFolderId]);
  const selectedFolder = breadcrumb[breadcrumb.length - 1] || null;
  const defaultExpanded = useMemo(() => (rootId ? new Set([rootId]) : new Set()), [rootId]);

  const atRoot = selectedFolderId === rootId;
  const atDeleteFolder = selectedFolder?.isDeleteFolder === true;
  const searchActive = !!(search.trim() || statusFilter || typeFilter || partyRoleFilter);

  // ── Hooks ──────────────────────────────────────────────────────────────
  const upload = useWorkspaceUpload(loanId, selectedFolderId, rootId, loadDocs);
  const actions = useWorkspaceActions(loanId, loadDocs);

  // ── Folder create ──────────────────────────────────────────────────────
  const handleCreateFolder = async (displayName) => {
    if (!selectedFolderId) throw new Error('Pick a parent folder first');
    await workspaceService.createFolder(loanId, { parentId: selectedFolderId, displayName });
    await loadTree();
    toast.success(`Folder "${displayName}" created`);
  };

  const folderNameFor = useCallback((id) => {
    if (id == null) return null;
    const f = folders.find((x) => x.id === id);
    return f ? f.displayName : null;
  }, [folders]);

  const handleClearSearch = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPartyRoleFilter('');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="ws-root">
      <div className="ws-toolbar">
        <button type="button" className="btn btn-secondary" onClick={() => setShowNewFolder(true)}
                disabled={!selectedFolder} title="Create a folder under the selected one">
          <FaFolderPlus /> New folder
        </button>
        <button type="button" className="btn btn-secondary" onClick={loadTree} title="Refresh">
          <FaSyncAlt />
        </button>

        {selectedDocUuids.size > 0 && (
          <>
            <span className="ws-selection-count">{selectedDocUuids.size} selected</span>
            {!atDeleteFolder && (
              <div className="ws-bulk-actions">
                <button type="button" className="btn btn-secondary btn-bulk"
                        onClick={() => actions.handleBulkReview('ACCEPTED', selectedDocUuids, setSelectedDocUuids)}
                        title="Accept all selected">
                  <FaCheck /> Accept
                </button>
                <button type="button" className="btn btn-secondary btn-bulk"
                        onClick={() => actions.handleBulkReview('NEEDS_BORROWER_ACTION', selectedDocUuids, setSelectedDocUuids)}
                        title="Request borrower revision">
                  <FaRevise /> Request revision
                </button>
                <button type="button" className="btn btn-secondary btn-bulk btn-bulk--danger"
                        onClick={() => actions.handleBulkReview('REJECTED', selectedDocUuids, setSelectedDocUuids)}
                        title="Reject all selected">
                  <FaTimes /> Reject
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        <div className="ws-search-wrap">
          <FaSearch className="ws-search-icon" aria-hidden />
          <input type="search" className="ws-search-input" placeholder="Search by file name…"
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="ws-status-filter" value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)} title="Filter by status">
          {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {docTypes.length > 0 && (
          <select className="ws-status-filter" value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)} title="Filter by document type">
            <option value="">All types</option>
            {docTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        <select className="ws-status-filter" value={partyRoleFilter}
                onChange={(e) => setPartyRoleFilter(e.target.value)} title="Filter by who uploaded">
          {PARTY_ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
            <div className="ws-tree-empty">Loading...</div>
          ) : (
            <FolderTree root={tree} selectedId={selectedFolderId} onSelect={setSelectedFolderId}
                        defaultExpanded={defaultExpanded} onDropFiles={actions.handleDropFiles}
                        onDeleteFolder={(f) => actions.handleDeleteFolder(f, rootId, selectedFolderId, setSelectedFolderId, loadTree)} />
          )}
        </aside>

        <main className={`ws-main${upload.isOsDragOver ? ' ws-main--drag-over' : ''}`}
              onDragOver={upload.handleOsDragOver} onDragEnter={upload.handleOsDragOver}
              onDragLeave={upload.handleOsDragLeave} onDrop={upload.handleOsDrop}>
          <Breadcrumbs path={breadcrumb} onNavigate={setSelectedFolderId} />

          {atDeleteFolder && (
            <div className="ws-delete-warning">
              <strong>Delete folder.</strong> Files dragged here can be permanently
              removed using the trash button. <em>This is the only way to delete documents
              and the action cannot be undone.</em>
            </div>
          )}

          {selectedFolder && (
            <FolderEvaluationCard loanId={loanId} folderTemplateId={selectedFolder.folderTemplateId}
                                  hasPrompt={!!selectedFolder.evalPrompt} aiEnabled={aiEnabled} />
          )}

          <FileTable documents={documents} loading={loadingDocs}
                     selectedUuids={selectedDocUuids} onSelectionChange={setSelectedDocUuids}
                     onPrefetchDownload={actions.prefetchDownloadUrl}
                     getDownloadUrl={actions.getCachedDownloadUrl}
                     onDownload={actions.handleDownload}
                     onRename={atDeleteFolder ? null : actions.handleEditDoc}
                     onReview={atDeleteFolder ? null : actions.handleReview}
                     onHistory={actions.handleHistory}
                     onDelete={atDeleteFolder ? actions.handlePermanentDelete : null}
                     showFolder={atRoot || searchActive}
                     folderNameFor={folderNameFor} />

          <div className="ws-upload-row">
            <button type="button" className="btn btn-primary" onClick={upload.handleUploadClick}
                    disabled={upload.uploadingCount > 0 || (rootId == null && selectedFolderId == null)}
                    title={atRoot ? 'Files uploaded from root auto-route into folders by tag'
                                  : `Upload into ${selectedFolder?.displayName || 'this folder'}`}>
              <FaUpload /> {upload.uploadingCount > 0 ? `Uploading ${upload.uploadingCount}...` : 'Upload'}
            </button>
            <span className="ws-upload-hint dim">or drag files anywhere into this panel</span>
            <input ref={upload.fileInputRef} type="file" multiple style={{ display: 'none' }}
                   onChange={upload.handleFilesPicked} />
          </div>

          <DownloadTray stagedDocs={actions.stagedDocs} onAdd={actions.handleStageDocs}
                        onRemove={actions.handleUnstageDoc} onClear={actions.handleClearTray}
                        resolveDownloadUrl={actions.resolveDownloadUrl} inline />
        </main>
      </div>

      {showNewFolder && (
        <NewFolderModal parentName={selectedFolder?.displayName || 'this folder'}
                        onClose={() => setShowNewFolder(false)} onCreate={handleCreateFolder} />
      )}
      {actions.editingDoc && (
        <EditDocumentModal doc={actions.editingDoc} folders={folders} rootId={rootId}
                           onClose={() => actions.setEditingDoc(null)} onSave={actions.handleSaveDocEdit} />
      )}
      {actions.historyDoc && (
        <DocumentHistory loanId={loanId} doc={actions.historyDoc}
                         onClose={() => actions.setHistoryDoc(null)} />
      )}
      {actions.reviewingDoc && (
        <DocumentReviewPanel loanId={loanId} doc={actions.reviewingDoc}
                             onClose={() => actions.setReviewingDoc(null)} onReviewed={actions.handleReviewed} />
      )}
      {upload.pendingUploadFiles.length > 0 && (
        <UploadTypeModal files={upload.pendingUploadFiles}
                         onCancel={upload.cancelUpload} onConfirm={upload.handleUploadConfirm} />
      )}
    </div>
  );
}
