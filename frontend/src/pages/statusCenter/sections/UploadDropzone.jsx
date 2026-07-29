import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

import mortgageService from '../../../services/mortgageService';

/*
 * UploadDropzone — the dark "forest" dropzone (.dz3 / #dz) from
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Reuses the EXISTING borrower upload seam so files land in the suite (SoR)
 * exactly like BorrowerDocuments: mortgageService.uploadBorrowerDocument wraps
 * the full upload-url → PUT bytes → confirm sequence. On success it calls
 * onUploaded() so the container can refresh the to-do list / history.
 *
 * Failures are surfaced as toasts, never swallowed: a file that never reaches
 * the suite is indistinguishable from a file the client forgot to send, and the
 * client is the only one who can retry.
 */

// Mirrors the limits the dropzone copy promises. Enforced here so an oversized
// or unsupported file fails with a reason instead of a silent 4xx from the suite.
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED_EXT = /\.(pdf|jpe?g|png|heic|heif)$/i;
const ACCEPTED_MIME = /^(application\/pdf|image\/(jpeg|png|heic|heif))$/i;

/** Returns null when the file is uploadable, else a client-facing reason. */
function rejectionReason(file) {
  if (file.size > MAX_BYTES) return 'is larger than 25 MB';
  // HEIC/HEIF often arrive with an empty file.type, so extension is the fallback.
  if (ACCEPTED_MIME.test(file.type || '') || ACCEPTED_EXT.test(file.name || '')) return null;
  return 'is not a PDF, JPG, PNG, or HEIC';
}

export default function UploadDropzone({ suiteLoanId, onUploaded }) {
  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(async (files) => {
    const arr = Array.from(files || []).filter(Boolean);
    if (!arr.length || !suiteLoanId) return;
    setUploading(true);
    let ok = 0;
    for (const file of arr) {
      const reason = rejectionReason(file);
      if (reason) {
        toast.error(`${file.name} ${reason}`);
        continue;
      }
      try {
        // upload-url → PUT → confirm, all inside the reused service fn.
        await mortgageService.uploadBorrowerDocument(suiteLoanId, file);
        ok += 1;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('upload failed', file && file.name, e);
        toast.error(`Couldn't upload ${(file && file.name) || 'file'} — please try again`);
      }
    }
    setUploading(false);
    if (ok) {
      toast.success(`Uploaded ${ok} document${ok > 1 ? 's' : ''}`);
      if (onUploaded) onUploaded();
    }
  }, [suiteLoanId, onUploaded]);

  const onDrop = useCallback((accepted) => { uploadFiles(accepted); }, [uploadFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noKeyboard: false });

  return (
    <div
      {...getRootProps({
        className: `lsc-dz${isDragActive ? ' is-drag' : ''}`,
        id: 'lsc-dz',
      })}
    >
      <input {...getInputProps()} data-testid="lsc-dz-input" />
      <div className="lsc-dz-ic" aria-hidden="true">⇪</div>
      <b>Drop your documents here</b>
      <span>
        We'll route each file to the right condition · secure &amp; encrypted · PDF, JPG, PNG, HEIC · 25 MB
      </span>
      <button type="button" className="lsc-dz-browse" disabled={uploading}>
        {uploading ? 'Uploading…' : 'or browse your files'}
      </button>
    </div>
  );
}
