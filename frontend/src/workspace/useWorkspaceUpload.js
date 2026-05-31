import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import mortgageService from '../services/mortgageService';

/**
 * Owns the presigned-URL upload flow, OS drag-and-drop, and file staging.
 *
 * Returns state + handlers the parent wires to the DOM and the UploadTypeModal.
 */
export default function useWorkspaceUpload(loanId, selectedFolderId, rootId, onUploaded) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [pendingUploadFiles, setPendingUploadFiles] = useState([]);
  const [isOsDragOver, setIsOsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ── Click-to-upload ─────────────────────────────────────────────────────
  const handleUploadClick = () => {
    if (selectedFolderId == null && rootId == null) {
      toast.warning('Folders are still loading — try again in a moment');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFilesPicked = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setPendingUploadFiles(files);
  };

  // ── OS file drag-and-drop ───────────────────────────────────────────────
  const isOsFileDrag = (e) => {
    const dt = e.dataTransfer;
    if (!dt) return false;
    return Array.from(dt.types || []).includes('Files');
  };

  const handleOsDragOver = (e) => {
    if (!isOsFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isOsDragOver) setIsOsDragOver(true);
  };

  const handleOsDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsOsDragOver(false);
  };

  const handleOsDrop = (e) => {
    if (!isOsFileDrag(e)) return;
    e.preventDefault();
    setIsOsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    setPendingUploadFiles(files);
  };

  // ── Upload confirm (after type-picker modal) ────────────────────────────
  const handleUploadConfirm = async ({ documentType, partyRole }) => {
    const files = pendingUploadFiles;
    setPendingUploadFiles([]);
    if (!files || files.length === 0) return;

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
    await onUploaded();
  };

  const cancelUpload = useCallback(() => setPendingUploadFiles([]), []);

  return {
    uploadingCount,
    pendingUploadFiles,
    isOsDragOver,
    fileInputRef,
    handleUploadClick,
    handleFilesPicked,
    handleOsDragOver,
    handleOsDragLeave,
    handleOsDrop,
    handleUploadConfirm,
    cancelUpload,
  };
}
