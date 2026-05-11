import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import WorkspaceTab from '../workspace/WorkspaceTab';
import mortgageService from '../services/mortgageService';
import { formatCurrency } from '../utils/formHelpers';
import DocumentsHero from '../components/design/DocumentsHero';
import RecentActivityCard from '../components/design/RecentActivityCard';
import Button from '../components/design/Button';
import Icon from '../components/design/Icon';
import Pill from '../components/design/Pill';
import { Card } from '../components/design/Card';
import './ApplicationDetails.design.css';

const ApplicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

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

  const fetchStatusHistory = useCallback(async () => {
    try {
      const data = await mortgageService.getStatusHistory(id);
      setStatusHistory(data);
    } catch (error) {
      console.error('Error fetching status history:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
    fetchDocuments();
    fetchStatusHistory();
  }, [fetchApplication, fetchDocuments, fetchStatusHistory]);

  // Refresh after a MISMO import for this loan (fired from TopBar's upload action)
  useEffect(() => {
    const handler = (e) => {
      if (String(e.detail?.loanId) === String(id)) {
        fetchApplication();
        fetchDocuments();
      }
    };
    window.addEventListener('mismo:imported', handler);
    return () => window.removeEventListener('mismo:imported', handler);
  }, [id, fetchApplication, fetchDocuments]);

  if (loading) {
    return <div className="page"><div className="muted">Loading application…</div></div>;
  }
  if (!application) {
    return (
      <div className="page">
        <h2>Application not found</h2>
        <p className="muted">The requested application could not be found.</p>
        <Button variant="primary" to="/applications">Back to applications</Button>
      </div>
    );
  }

  const borrower = application.borrowers?.[0];
  const borrowerName = borrower ? `${borrower.lastName || ''}${borrower.firstName ? `, ${borrower.firstName}` : ''}`.trim() || 'Unknown' : null;
  const totalSize = documents.reduce((sum, d) => sum + (Number(d.fileSize) || 0), 0);
  const lastActivity = documents.reduce((latest, d) => {
    const ts = d.uploadedAt || d.updatedAt;
    if (!ts) return latest;
    return (!latest || new Date(ts) > new Date(latest)) ? ts : latest;
  }, null);

  return (
    <div className="page docs-page">
      <DocumentsHero
        applicationId={id}
        borrowerName={borrowerName}
        fileCount={documents.length}
        totalSizeBytes={totalSize}
        lastActivity={lastActivity}
        onExportAll={() => toast.info('Bulk export is coming soon — for now, use the file table to download individual files.')}
      />

      <div className="docs-layout">
        <div className="docs-main">
          <WorkspaceTab loanId={Number(id)} />
        </div>
        <aside className="docs-rail">
          <RecentActivityCard loanId={Number(id)} refreshKey={documents.length} />
        </aside>
      </div>

      {/* Collapsible application summary — secondary data (loan/property/borrower).
          Hidden by default since the Documents screen is workspace-focused. */}
      <Card className="docs-summary-card">
        <div className="card-header">
          <div className="card-title">
            <Icon name="briefcase" size={14} stroke={1.8} />
            <span>Application #{application.applicationNumber} — summary</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill tone="muted">{application.status || 'DRAFT'}</Pill>
            <Button size="sm" onClick={() => setShowSummary((v) => !v)}>
              {showSummary ? 'Hide' : 'Show'}
            </Button>
            <Button size="sm" variant="ghost" to={`/apply?edit=${application.id}&view=1`} title="Open full application">
              View
            </Button>
            <Button size="sm" variant="primary" to={`/apply?edit=${application.id}`} title="Edit this application">
              <Icon name="edit" size={12} /> Edit
            </Button>
          </div>
        </div>
        {showSummary && (
          <div className="docs-summary-body">
            <div className="docs-summary-grid">
              <div>
                <div className="eyebrow">Property</div>
                <div className="docs-summary-line">{application.property?.addressLine || '—'}</div>
                <div className="docs-summary-line dim">
                  {[application.property?.city, application.property?.state, application.property?.zipCode].filter(Boolean).join(', ') || '—'}
                </div>
                <div className="kv docs-summary-kv">
                  <div className="k">Property type</div><div className="v">{application.property?.propertyType || '—'}</div>
                  <div className="k">Construction</div><div className="v">{application.property?.constructionType || '—'}</div>
                  <div className="k">Year built</div><div className="v">{application.property?.yearBuilt || '—'}</div>
                </div>
              </div>
              <div>
                <div className="eyebrow">Loan</div>
                <div className="kv docs-summary-kv">
                  <div className="k">Purpose</div><div className="v">{application.loanPurpose || '—'}</div>
                  <div className="k">Type</div><div className="v">{application.loanType || '—'}</div>
                  <div className="k">Loan amount</div><div className="v mono">{formatCurrency(application.loanAmount || 0)}</div>
                  <div className="k">Property value</div><div className="v mono">{formatCurrency(application.propertyValue || 0)}</div>
                </div>
              </div>
              <div>
                <div className="eyebrow">Primary borrower</div>
                {borrower ? (
                  <div className="kv docs-summary-kv">
                    <div className="k">Name</div><div className="v">{[borrower.firstName, borrower.lastName].filter(Boolean).join(' ') || '—'}</div>
                    <div className="k">Email</div><div className="v">{borrower.email || '—'}</div>
                    <div className="k">Phone</div><div className="v">{borrower.phone || '—'}</div>
                    <div className="k">Marital</div><div className="v">{borrower.maritalStatus || '—'}</div>
                  </div>
                ) : <div className="muted">No borrower yet</div>}
              </div>
              {statusHistory.length > 0 && (
                <div>
                  <div className="eyebrow">Timeline</div>
                  <ol className="docs-summary-timeline">
                    {statusHistory.slice(0, 5).map((h, i) => (
                      <li key={h.id || i}>
                        <Pill tone="muted">{h.status}</Pill>
                        <span className="dim">{h.transitionedAt ? new Date(h.transitionedAt).toLocaleDateString() : ''}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ApplicationDetails;
