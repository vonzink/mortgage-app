import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaFolderPlus, FaUpload, FaSyncAlt } from 'react-icons/fa';

import workspaceService, { buildFolderTree, pathTo } from '../services/workspaceService';
import mortgageService from '../services/mortgageService';

import FolderTree from './FolderTree';
import Breadcrumbs from './Breadcrumbs';
import FileTable from './FileTable';
import NewFolderModal from './NewFolderModal';
import './workspace.css';

/**
 * Phase 1 document workspace shell. Renders the loan's folder tree, the contents
 * of the currently-selected folder, breadcrumbs, and a "+ New folder" button.
 *
 * Drag-drop, bulk select, search, and tagging come in subsequent phases.
 *
 * Props:
 *   loanId  — the application id this workspace is for.
 */
export default function WorkspaceTab({ loanId }) {
  const [folders, setFolders] = useState([]);          // flat list from backend
  const [rootId, setRootId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);

  // ── Load folder tree (auto-seeds defaults on first call) ────────────────
  const loadTree = useCallback(async () => {
    setLoadingTree(true);
    try {
      const data = await workspaceService.getFolderTree(loanId);
      setFolders(data.folders || []);
      setRootId(data.rootId || null);
      setSelectedId((prev) => prev || data.rootId || null);
    } catch (err) {
      toast.error(`Failed to load folders: ${err.message || err}`);
    } finally {
      setLoadingTree(false);
    }
  }, [loanId]);

  useEffect(() => { loadTree(); }, [loadTree]);

  // ── Load documents for selected folder ──────────────────────────────────
  const loadDocs = useCallback(async () => {
    if (!selectedId) return;
    setLoadingDocs(true);
    try {
      // Selected = root → show "unfiled" docs (no folder_id) so legacy uploads remain visible
      const opts = (selectedId === rootId) ? { unfiled: true } : { folderId: selectedId };
      const docs = await workspaceService.getDocumentsInFolder(loanId, opts);
      setDocuments(docs);
    } catch (err) {
      toast.error(`Failed to load documents: ${err.message || err}`);
    } finally {
      setLoadingDocs(false);
    }
  }, [loanId, selectedId, rootId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // ── Derived: tree + breadcrumb path ─────────────────────────────────────
  const tree = useMemo(() => buildFolderTree(folders, rootId), [folders, rootId]);
  const breadcrumb = useMemo(() => pathTo(tree, selectedId), [tree, selectedId]);
  const selectedFolder = breadcrumb[breadcrumb.length - 1] || null;

  // First-render default: expand the root so the 15 defaults are visible
  const defaultExpanded = useMemo(
    () => (rootId ? new Set([rootId]) : new Set()),
    [rootId],
  );

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleCreateFolder = async (displayName) => {
    if (!selectedId) throw new Error('Pick a parent folder first');
    await workspaceService.createFolder(loanId, { parentId: selectedId, displayName });
    await loadTree();
    toast.success(`Folder "${displayName}" created`);
  };

  const handleDownload = async (doc) => {
    try {
      const { downloadUrl } = await mortgageService.getDocumentDownloadUrl(loanId, doc.docUuid);
      window.location.href = downloadUrl;
    } catch (err) {
      toast.error(`Download failed: ${err.message || err}`);
    }
  };

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
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-primary"
          disabled
          title="Upload (Phase 2)"
        >
          <FaUpload /> Upload
        </button>
      </div>

      <div className="ws-body">
        <aside className="ws-sidebar">
          {loadingTree ? (
            <div className="ws-tree-empty">Loading…</div>
          ) : (
            <FolderTree
              root={tree}
              selectedId={selectedId}
              onSelect={setSelectedId}
              defaultExpanded={defaultExpanded}
            />
          )}
        </aside>

        <main className="ws-main">
          <Breadcrumbs path={breadcrumb} onNavigate={setSelectedId} />
          <FileTable
            documents={documents}
            loading={loadingDocs}
            onDownload={handleDownload}
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
    </div>
  );
}
