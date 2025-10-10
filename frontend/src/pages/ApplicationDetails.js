import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDropzone } from 'react-dropzone';
import { FaUpload, FaFile, FaDownload, FaTrash, FaCheckCircle, FaTimes, FaFileAlt, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import mortgageService from '../services/mortgageService';
import { generateDocumentRecommendations } from '../utils/documentRecommendations';

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

const ApplicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [recommendations, setRecommendations] = useState(null);

  const fetchApplication = useCallback(async () => {
    try {
      const data = await mortgageService.getApplication(id);
      setApplication(data);
    } catch (error) {
      toast.error('Failed to load application details');
      console.error('Error fetching application:', error);
      navigate('/applications');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await mortgageService.getApplicationDocuments(id);
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
    fetchDocuments();
  }, [fetchApplication, fetchDocuments]);

  useEffect(() => {
    if (application) {
      const recs = generateDocumentRecommendations(application);
      console.log('[DEBUG] Document recommendations:', recs);
      setRecommendations(recs);
    }
  }, [application]);

  // Document upload handlers
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
          id,
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocStatusClass = (status) => {
    switch (status) {
      case 'Required':
      case 'required':
        return 'status-required';
      case 'Conditional':
      case 'conditional':
        return 'status-conditional';
      case 'Review':
      case 'review':
        return 'status-review';
      case 'OK':
      case 'ok':
        return 'status-ok';
      default:
        return '';
    }
  };

  const getDocStatusIcon = (status) => {
    switch (status) {
      case 'Required':
      case 'required':
        return <FaExclamationTriangle />;
      case 'OK':
      case 'ok':
        return <FaCheckCircle />;
      default:
        return <FaInfoCircle />;
    }
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-pending';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Application Details</h2>
        <p>Loading application details...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="card">
        <h2>Application Not Found</h2>
        <p>The requested application could not be found.</p>
        <button onClick={() => navigate('/applications')} className="btn btn-primary">
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Application #{application.applicationNumber}</h2>
          <span className={`status ${getStatusClass(application.status)}`}>
            {application.status || 'DRAFT'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3>Property Information</h3>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Address:</strong><br />
              {application.property?.addressLine || 'N/A'}<br />
              {application.property?.city || 'N/A'}, {application.property?.state || 'N/A'} {application.property?.zipCode || 'N/A'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Property Type:</strong> {application.property?.propertyType || 'N/A'}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Construction Type:</strong> {application.property?.constructionType || 'N/A'}
            </div>
            <div>
              <strong>Year Built:</strong> {application.property?.yearBuilt || 'N/A'}
            </div>
          </div>

          <div>
            <h3>Loan Information</h3>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Loan Purpose:</strong> {application.loanPurpose || 'N/A'}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Loan Type:</strong> {application.loanType || 'N/A'}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Loan Amount:</strong> {formatCurrency(application.loanAmount || 0)}
              </div>
              <div>
                <strong>Property Value:</strong> {formatCurrency(application.propertyValue || 0)}
              </div>
            </div>
          </div>

          <div>
            <h3>Borrower Information</h3>
            {application.borrowers && application.borrowers.length > 0 ? (
              application.borrowers.map((borrower, index) => (
                <div key={index} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #eee', borderRadius: '5px' }}>
                  <h4>Borrower {index + 1}</h4>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Name:</strong> {borrower.firstName} {borrower.lastName}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Email:</strong> {borrower.email}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Phone:</strong> {borrower.phone}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Marital Status:</strong> {borrower.maritalStatus}
                  </div>
                  <div>
                    <strong>Dependents:</strong> {borrower.dependentsCount || 0}
                  </div>
                </div>
              ))
            ) : (
              <p>No borrower information available</p>
            )}
          </div>

          <div>
            <h3>Application Timeline</h3>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Created:</strong> {formatDate(application.createdDate || new Date())}
              </div>
              <div>
                <strong>Last Updated:</strong> {formatDate(application.updatedDate || new Date())}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Documents Section */}
      {recommendations && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2><FaFileAlt /> Loan Document Checklist</h2>
          
          {/* Document Tables by Category */}
          <div className="doc-sections">
            {Object.entries(recommendations).map(([category, items]) => {
              if (!items || items.length === 0) return null;
              
              return (
                <div key={category} className="doc-section" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: 'var(--primary-color)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                    {category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')}
                  </h3>
                  <table className="doc-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Document</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border-color)', width: '110px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Status</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((doc, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.5rem', fontWeight: '500', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{doc.name || doc.document}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <span className={`status ${getDocStatusClass(doc.status)}`} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              whiteSpace: 'nowrap',
                              backgroundColor: 
                                doc.status?.toLowerCase() === 'required' ? '#dc3545' :
                                doc.status?.toLowerCase() === 'conditional' ? '#6c757d' :
                                doc.status?.toLowerCase() === 'review' ? '#f0ad4e' :
                                '#28a745',
                              color: 'white'
                            }}>
                              {getDocStatusIcon(doc.status)}
                              {doc.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{doc.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
            </div>
          )}
          
      {/* Document Upload Section */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2><FaUpload /> Upload Documents</h2>
        
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
          {documents.length === 0 ? (
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

      {/* Back Button */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button onClick={() => navigate('/applications')} className="btn btn-secondary">
            Back to Applications
          </button>
      </div>
    </div>
  );
};

export default ApplicationDetails;
