/**
 * Recommended Documents Component
 * Shows a checklist of required documents based on loan application data
 */
import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaCheckCircle, FaExclamationTriangle, FaEye, FaFileCsv, FaPrint } from 'react-icons/fa';
import { generateDocumentRecommendations, calculateCoverageStats, downloadCSV } from '../utils/documentRecommendations';

const RecommendedDocuments = ({ applicationData, onClose }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (applicationData) {
      const recs = generateDocumentRecommendations(applicationData);
      const coverage = calculateCoverageStats(applicationData.borrowers || []);
      setRecommendations(recs);
      setStats(coverage);
    }
  }, [applicationData]);

  const handleExportCSV = () => {
    if (recommendations) {
      downloadCSV(recommendations, applicationData.applicationNumber);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'required':
        return 'status-required';
      case 'conditional':
        return 'status-conditional';
      case 'review':
        return 'status-review';
      case 'ok':
        return 'status-ok';
      default:
        return '';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'required':
        return <FaExclamationTriangle />;
      case 'ok':
        return <FaCheckCircle />;
      default:
        return <FaEye />;
    }
  };

  if (!recommendations || !stats) {
    return (
      <div className="recommended-docs-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2><FaFileAlt /> Loading Document Recommendations...</h2>
          </div>
        </div>
      </div>
    );
  }

  const borrowerNames = (applicationData.borrowers || [])
    .map(b => `${b.firstName} ${b.lastName}`)
    .join(', ');

  return (
    <div className="recommended-docs-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2><FaFileAlt /> Loan Document Checklist</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {/* Snapshot Summary */}
        <div className="doc-summary-section">
          <h3>Application Snapshot</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Borrowers</span>
              <span className="summary-value">{borrowerNames || '—'}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Purpose</span>
              <span className="summary-value">{applicationData.loanPurpose || '—'}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Loan Type</span>
              <span className="summary-value">{applicationData.loanType || '—'}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Loan Amount</span>
              <span className="summary-value">
                {applicationData.loanAmount 
                  ? `$${Number(applicationData.loanAmount).toLocaleString()}` 
                  : '—'}
              </span>
            </div>
          </div>

          {/* Coverage Chips */}
          <div className="coverage-chips">
            <div className={`coverage-chip ${stats.employmentCoverage.needed > 0 ? 'need' : 'ok'}`}>
              {stats.employmentCoverage.needed > 0 
                ? `Employment: need +${stats.employmentCoverage.needed} mo`
                : 'Employment: 24 mo ✓'}
            </div>
            <div className={`coverage-chip ${stats.residenceCoverage.needed > 0 ? 'need' : 'ok'}`}>
              {stats.residenceCoverage.needed > 0 
                ? `Residence: need +${stats.residenceCoverage.needed} mo`
                : 'Residence: 24 mo ✓'}
            </div>
            <div className={`coverage-chip ${stats.reoCount > 0 ? 'warn' : 'ok'}`}>
              {stats.reoCount > 0 ? `REO: ${stats.reoCount}` : 'REO: none'}
            </div>
            <div className={`coverage-chip ${stats.hasDeclarationFlags ? 'warn' : 'ok'}`}>
              {stats.hasDeclarationFlags ? 'Declarations: flags present' : 'Declarations: clear'}
            </div>
          </div>
        </div>

        {/* Document Tables */}
        <div className="doc-sections">
          <div className="doc-section-note">
            <strong>Statuses:</strong> 
            <span className="status status-required">Required</span>
            <span className="status status-conditional">Conditional</span>
            <span className="status status-review">Review</span>
            <span className="status status-ok">OK</span>
          </div>

          {/* General Documents */}
          {recommendations.general.length > 0 && (
            <div className="doc-section">
              <h3>Identity & General</h3>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.general.map((doc, idx) => (
                    <tr key={idx}>
                      <td>{doc.name}</td>
                      <td>
                        <span className={`status ${getStatusClass(doc.status)}`}>
                          {getStatusIcon(doc.status)}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </td>
                      <td className="reason-cell">{doc.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Income Documents */}
          {recommendations.income.length > 0 && (
            <div className="doc-section">
              <h3>Income (Per Borrower)</h3>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.income.map((doc, idx) => (
                    <tr key={idx}>
                      <td>{doc.name}</td>
                      <td>
                        <span className={`status ${getStatusClass(doc.status)}`}>
                          {getStatusIcon(doc.status)}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </td>
                      <td className="reason-cell">{doc.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Asset Documents */}
          {recommendations.assets.length > 0 && (
            <div className="doc-section">
              <h3>Assets</h3>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.assets.map((doc, idx) => (
                    <tr key={idx}>
                      <td>{doc.name}</td>
                      <td>
                        <span className={`status ${getStatusClass(doc.status)}`}>
                          {getStatusIcon(doc.status)}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </td>
                      <td className="reason-cell">{doc.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Credit & REO Documents */}
          {recommendations.credit.length > 0 && (
            <div className="doc-section">
              <h3>Credit & REO</h3>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.credit.map((doc, idx) => (
                    <tr key={idx}>
                      <td>{doc.name}</td>
                      <td>
                        <span className={`status ${getStatusClass(doc.status)}`}>
                          {getStatusIcon(doc.status)}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </td>
                      <td className="reason-cell">{doc.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="doc-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <FaFileCsv /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <FaPrint /> Print
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Info Box */}
        <div className="doc-info-box">
          <h4>How Recommendations Are Determined</h4>
          <ul>
            <li><strong>Per-borrower items:</strong> ID, paystubs/W-2s, self-employment packages, citizenship docs, and BK/foreclosure documents are requested for specific borrower(s).</li>
            <li><strong>Employment & Residence:</strong> Each borrower needs 24 months coverage. Gaps prompt prior history and letters.</li>
            <li><strong>Self-employment:</strong> If indicated and ownership ≥ 25%: K-1s + 1120S (S-Corp) or K-1s + 1065 (Partnership). Otherwise K-1s only.</li>
            <li><strong>REO:</strong> If REO properties exist, requests statements and insurance per address; taxes and HOA are conditional; leases required for rentals.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RecommendedDocuments;

