import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { FaUpload, FaTimes, FaFile, FaDownload, FaTrash, FaCheckCircle } from 'react-icons/fa';
import mortgageService from '../services/mortgageService';

const DOCUMENT_TYPES = [
  'Pay Stub',
  'W-2 Form',
  'Tax Return',
  'Bank Statement',
  'Driver\'s License',
  'Social Security Card',
  'Employment Verification Letter',
  'Credit Report',
  'Appraisal Report',
  'Purchase Agreement',
  'Insurance Policy',
  'Gift Letter',
  'Divorce Decree',
  'Other'
];

const DocumentUpload = ({ applicationId, onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [applicationId]);

  const fetchDocuments = async () => {
    try {
      const docs = await mortgageService.getApplicationDocuments(applicationId);
      setDocuments(docs);
    } catch (error) {
      toast.error('Failed to load documents');
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const newPendingFiles = acceptedFiles.map(file => ({
      file,
      documentType: 'Other',
      id: Math.random().toString(36).substr(2, 9)
    }));
    setPendingFiles(prev => [...prev, ...newPendingFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 10485760 // 10MB
  });

  const handleDocumentTypeChange = (fileId, newType) => {
    setPendingFiles(prev => 
      prev.map(pf => pf.id === fileId ? { ...pf, documentType: newType } : pf)
    );
  };

  const handleRemovePendingFile = (fileId) => {
    setPendingFiles(prev => prev.filter(pf => pf.id !== fileId));
  };

  const handleUploadAll = async () => {
    if (pendingFiles.length === 0) {
      toast.warning('No files to upload');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const pendingFile of pendingFiles) {
      try {
        await mortgageService.uploadDocument(
          applicationId,
          pendingFile.documentType,
          pendingFile.file
        );
        successCount++;
      } catch (error) {
        console.error('Upload error:', error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} document(s) uploaded successfully!`);
      setPendingFiles([]);
      await fetchDocuments();
    }

    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} document(s)`);
    }

    setUploading(false);
  };

  const handleDownload = async (doc) => {
    try {
      await mortgageService.downloadDocument(doc.id, doc.fileName);
      toast.success('Document downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download document');
      console.error('Download error:', error);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await mortgageService.deleteDocument(docId);
      toast.success('Document deleted successfully!');
      await fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
      console.error('Delete error:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content document-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><FaUpload /> Upload Documents</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          {/* Dropzone */}
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            <FaUpload className="dropzone-icon" />
            {isDragActive ? (
              <p>Drop files here...</p>
            ) : (
              <>
                <p>Drag & drop files here, or click to select</p>
                <span className="dropzone-hint">Supported: PDF, Images, Word, Excel (max 10MB)</span>
              </>
            )}
          </div>

          {/* Pending Files */}
          {pendingFiles.length > 0 && (
            <div className="pending-files-section">
              <h3>Files to Upload ({pendingFiles.length})</h3>
              <div className="pending-files-list">
                {pendingFiles.map((pf) => (
                  <div key={pf.id} className="pending-file-item">
                    <div className="pending-file-info">
                      <FaFile className="file-icon" />
                      <div className="file-details">
                        <span className="file-name">{pf.file.name}</span>
                        <span className="file-size">{formatFileSize(pf.file.size)}</span>
                      </div>
                    </div>
                    <div className="pending-file-actions">
                      <select
                        value={pf.documentType}
                        onChange={(e) => handleDocumentTypeChange(pf.id, e.target.value)}
                        className="document-type-select"
                      >
                        {DOCUMENT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemovePendingFile(pf.id)}
                        className="btn-icon btn-danger"
                        title="Remove"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUploadAll}
                disabled={uploading}
                className="btn btn-primary btn-upload-all"
              >
                {uploading ? 'Uploading...' : `Upload ${pendingFiles.length} File(s)`}
              </button>
            </div>
          )}

          {/* Uploaded Documents */}
          <div className="uploaded-documents-section">
            <h3>Uploaded Documents ({documents.length})</h3>
            {loading ? (
              <p className="loading-text">Loading documents...</p>
            ) : documents.length === 0 ? (
              <p className="empty-text">No documents uploaded yet.</p>
            ) : (
              <div className="uploaded-documents-list">
                {documents.map((doc) => (
                  <div key={doc.id} className="uploaded-document-item">
                    <div className="document-info">
                      <FaCheckCircle className="success-icon" />
                      <div className="document-details">
                        <div className="document-name-row">
                          <span className="document-name">{doc.fileName}</span>
                          <span className="document-type-badge">{doc.documentType}</span>
                        </div>
                        <div className="document-meta">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="document-actions">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="btn-icon btn-secondary"
                        title="Download"
                      >
                        <FaDownload />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="btn-icon btn-danger"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;

