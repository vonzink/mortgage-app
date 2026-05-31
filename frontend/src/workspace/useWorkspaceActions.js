import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import mortgageService from '../services/mortgageService';
import workspaceService from '../services/workspaceService';

/** How long to trust a cached presigned download URL (backend issues 15-min URLs). */
const DOWNLOAD_URL_TTL_MS = 14 * 60 * 1000;

/**
 * Owns document actions: move, edit/rename, delete, download, download-tray,
 * and bulk review. Pure state + callbacks — no JSX.
 */
export default function useWorkspaceActions(loanId, loadDocs) {
  const [editingDoc, setEditingDoc] = useState(null);
  const [historyDoc, setHistoryDoc] = useState(null);
  const [reviewingDoc, setReviewingDoc] = useState(null);
  const [stagedDocs, setStagedDocs] = useState([]);

  const downloadUrlCache = useRef(new Map());

  // ── File move (drop on tree node) ──────────────────────────────────────
  const handleDropFiles = useCallback(async (toFolderId, docUuids) => {
    if (!docUuids || docUuids.length === 0) return;
    try {
      const result = await workspaceService.moveDocuments(loanId, docUuids, toFolderId);
      if (result.moved > 0) {
        toast.success(result.moved === 1 ? '1 file moved' : `${result.moved} files moved`);
      }
      await loadDocs();
    } catch (err) {
      toast.error(`Move failed: ${err.message || err}`);
    }
  }, [loanId, loadDocs]);

  // ── Download URL prefetch (powers DownloadURL drag-out) ────────────────
  const prefetchDownloadUrl = useCallback((doc) => {
    const cache = downloadUrlCache.current;
    const cached = cache.get(doc.docUuid);
    if (cached && cached.expiresAt > Date.now()) return;

    mortgageService.getDocumentDownloadUrl(loanId, doc.docUuid)
      .then(({ downloadUrl }) => {
        cache.set(doc.docUuid, { url: downloadUrl, expiresAt: Date.now() + DOWNLOAD_URL_TTL_MS });
      })
      .catch(() => { /* drag-out simply won't have DownloadURL set */ });
  }, [loanId]);

  const getCachedDownloadUrl = useCallback((doc) => {
    const cached = downloadUrlCache.current.get(doc.docUuid);
    return (cached && cached.expiresAt > Date.now()) ? cached.url : undefined;
  }, []);

  const handleDownload = async (doc) => {
    try {
      const { downloadUrl } = await mortgageService.getDocumentDownloadUrl(loanId, doc.docUuid);
      window.location.href = downloadUrl;
    } catch (err) {
      toast.error(`Download failed: ${err.message || err}`);
    }
  };

  // ── Download tray ──────────────────────────────────────────────────────
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

  const resolveDownloadUrl = useCallback(async (docUuid) => {
    const { downloadUrl } = await mortgageService.getDocumentDownloadUrl(loanId, docUuid);
    return downloadUrl;
  }, [loanId]);

  // ── Edit (rename + retag + move) ───────────────────────────────────────
  const handleEditDoc = (doc) => setEditingDoc(doc);

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

  // ── Folder delete ──────────────────────────────────────────────────────
  const handleDeleteFolder = useCallback(async (folder, rootId, selectedFolderId, setSelectedFolderId, loadTree) => {
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
  }, [loanId, loadDocs]);

  // ── Bulk review ────────────────────────────────────────────────────────
  const handleBulkReview = useCallback(async (decision, selectedDocUuids, setSelectedDocUuids) => {
    const uuids = [...selectedDocUuids];
    if (uuids.length === 0) return;
    const requiresNotes = decision === 'REJECTED' || decision === 'NEEDS_BORROWER_ACTION';
    let notes = null;
    if (requiresNotes) {
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
      if (result.succeeded > 0) toast.success(`${result.succeeded} document${result.succeeded === 1 ? '' : 's'} ${verb}`);
      if (result.failed > 0) toast.warn(`${result.failed} document${result.failed === 1 ? '' : 's'} skipped (invalid state)`);
      setSelectedDocUuids(new Set());
      await loadDocs();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Bulk review failed');
    }
  }, [loanId, loadDocs]);

  // ── Permanent delete ───────────────────────────────────────────────────
  const handlePermanentDelete = useCallback(async (doc) => {
    const confirmed = window.confirm(
      `Permanently delete "${doc.fileName}"?\n\nThis removes the file from S3 and the database. It cannot be undone.`,
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

  return {
    editingDoc, setEditingDoc,
    historyDoc, setHistoryDoc,
    reviewingDoc, setReviewingDoc,
    stagedDocs,
    handleDropFiles,
    prefetchDownloadUrl,
    getCachedDownloadUrl,
    handleDownload,
    handleStageDocs, handleUnstageDoc, handleClearTray,
    resolveDownloadUrl,
    handleEditDoc, handleSaveDocEdit,
    handleDeleteFolder,
    handleBulkReview,
    handlePermanentDelete,
    handleHistory: useCallback((doc) => setHistoryDoc(doc), []),
    handleReview: useCallback((doc) => setReviewingDoc(doc), []),
    handleReviewed: useCallback(() => loadDocs(), [loadDocs]),
  };
}
