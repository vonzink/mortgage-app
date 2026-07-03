import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import mortgageService from '../../../services/mortgageService';

/*
 * UploadDropzone — the dark "forest" dropzone (.dz3 / #dz) from
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Reuses the EXISTING borrower upload seam so files land in the suite (SoR)
 * exactly like BorrowerDocuments: mortgageService.uploadBorrowerDocument wraps
 * the full upload-url → PUT bytes → confirm sequence. On success it calls
 * onUploaded() so the container can refresh the to-do list / history.
 */

export default function UploadDropzone({ suiteLoanId, onUploaded }) {
  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(async (files) => {
    const arr = Array.from(files || []).filter(Boolean);
    if (!arr.length || !suiteLoanId) return;
    setUploading(true);
    let ok = 0;
    for (const file of arr) {
      try {
        // upload-url → PUT → confirm, all inside the reused service fn.
        await mortgageService.uploadBorrowerDocument(suiteLoanId, file);
        ok += 1;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('upload failed', file && file.name, e);
      }
    }
    setUploading(false);
    if (ok && onUploaded) onUploaded();
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
