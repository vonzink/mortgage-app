import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaFileAlt, FaEye, FaEdit, FaTrash, FaClock, FaCheckCircle, FaTimesCircle, FaFileDownload, FaCopy, FaFileUpload, FaPlus } from 'react-icons/fa';
import mortgageService from '../services/mortgageService';

const ApplicationList = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importingMismo, setImportingMismo] = useState(false);
  const mismoInputRef = useRef(null);

  /**
   * Start a fresh application by importing a MISMO XML file. The backend creates an empty
   * application, runs the importer to populate it, auto-assigns the calling LO if applicable,
   * and returns the new ID — we navigate the user straight into the editor.
   */
  const handleStartFromMismo = () => mismoInputRef.current?.click();
  const handleMismoFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setImportingMismo(true);
      const result = await mortgageService.createFromMismo(file);
      toast.success(`New application ${result.applicationNumber || ''} created from MISMO. ${result.changeCount} field${result.changeCount === 1 ? '' : 's'} populated.`);
      navigate(`/apply?edit=${result.id}`);
    } catch (err) {
      toast.error(`MISMO import failed: ${err.message || err}`);
    } finally {
      setImportingMismo(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const data = await mortgageService.getApplications();
      setApplications(data);
    } catch (error) {
      toast.error('Failed to load applications');
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToNewApplication = async (applicationId) => {
    try {
      // Load the application data
      const applicationData = await mortgageService.getApplication(applicationId);
      
      // Map backend data to form structure (same as edit mode)
      const formData = {
        loanPurpose: applicationData.loanPurpose,
        loanType: applicationData.loanType,
        loanAmount: applicationData.loanAmount,
        propertyValue: applicationData.propertyValue,
        downPayment: applicationData.downPayment,
        downPaymentSource: applicationData.downPaymentSource,
        propertyUse: applicationData.propertyUse,
        propertyType: applicationData.propertyType,
        occupancy: applicationData.occupancy,
        
        // Property fields
        property: applicationData.property,
        yearBuilt: applicationData.property?.yearBuilt,
        unitsCount: applicationData.property?.unitsCount,
        constructionType: applicationData.property?.constructionType,
        
        // Borrowers with all nested data
        borrowers: (applicationData.borrowers || []).map(borrower => ({
          firstName: borrower.firstName,
          lastName: borrower.lastName,
          middleName: borrower.middleName,
          ssn: borrower.ssn,
          dateOfBirth: borrower.birthDate,
          maritalStatus: borrower.maritalStatus,
          email: borrower.email,
          phone: borrower.phone,
          citizenshipType: borrower.citizenshipType,
          dependents: borrower.dependentsCount,
          
          // Employment history
          employmentHistory: borrower.employmentHistory || [],
          
          // Income sources
          incomeSources: borrower.incomeSources || [],
          
          // Residences
          residences: borrower.residences || [],
          
          // Assets
          assets: borrower.assets || [],
          
          // Liabilities
          liabilities: borrower.liabilities || [],
          
          // REO Properties
          reoProperties: borrower.reoProperties || [],
          
          // Declaration (flatten the nested object structure)
          ...((borrower.declaration) ? {
            usCitizen: borrower.declaration.usCitizen,
            permanentResident: borrower.declaration.permanentResident,
            intentToOccupy: borrower.declaration.intentToOccupy,
            borrowingDownPayment: borrower.declaration.borrowingDownPayment,
            downPaymentGift: borrower.declaration.downPaymentGift,
            giftSource: borrower.declaration.giftSource,
            giftAmount: borrower.declaration.giftAmount,
            comakerEndorser: borrower.declaration.comakerEndorser,
            outstandingJudgments: borrower.declaration.outstandingJudgments,
            lawsuit: borrower.declaration.lawsuit,
            foreclosure: borrower.declaration.foreclosure,
            bankruptcy: borrower.declaration.bankruptcy,
            alimonyChildSupport: borrower.declaration.alimonyChildSupport,
            coSignerObligation: borrower.declaration.coSignerObligation,
            presentlyDelinquent: borrower.declaration.presentlyDelinquent,
            loanForeclosure: borrower.declaration.loanForeclosure,
            pendingCreditInquiry: borrower.declaration.pendingCreditInquiry,
            propertyInsuranceRequired: borrower.declaration.propertyInsuranceRequired,
            floodInsuranceRequired: borrower.declaration.floodInsuranceRequired,
            creditReportConsent: borrower.declaration.creditReportConsent,
            incomeVerificationConsent: borrower.declaration.incomeVerificationConsent,
            creditExplanation: borrower.declaration.creditExplanation,
            employmentGapExplanation: borrower.declaration.employmentGapExplanation
          } : {})
        }))
      };
      
      sessionStorage.setItem('carryOverData', JSON.stringify(formData));
      
      // Navigate to new application form
      navigate('/apply');
      toast.success('Starting new application with all data from previous application');
    } catch (error) {
      toast.error('Failed to copy application data');
      console.error('Error copying application:', error);
    }
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
      day: 'numeric'
    });
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

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <FaCheckCircle className="status-icon approved" />;
      case 'rejected':
        return <FaTimesCircle className="status-icon rejected" />;
      default:
        return <FaClock className="status-icon pending" />;
    }
  };

  /**
   * Download a MISMO XML for the loan via the backend exporter (richer output than the
   * legacy frontend-only generator: SSN, DOB, marital status, full BORROWER_DETAIL, etc.).
   */
  const handleDownloadMismo = async (applicationId) => {
    try {
      const filename = await mortgageService.exportMismo(applicationId);
      toast.success(`Downloaded ${filename}`);
    } catch (e) {
      toast.error(`MISMO export failed: ${e.message || e}`);
    }
  };

  const handleDeleteApplication = async (applicationId, applicationNumber) => {
    const ok = window.confirm(
      `Delete application ${applicationNumber || `#${applicationId}`}?\n\n` +
      `This permanently removes the application and all of its borrowers, employment, ` +
      `income, residences, assets, REOs, liabilities, and document records.\n\n` +
      `This cannot be undone.`
    );
    if (!ok) return;
    try {
      await mortgageService.deleteApplication(applicationId);
      toast.success(`Deleted ${applicationNumber || `application #${applicationId}`}`);
      // Refresh the list
      fetchApplications();
    } catch (e) {
      toast.error(`Delete failed: ${e.message || e}`);
    }
  };

  if (loading) {
    return (
      <div className="applications-container">
        <div className="card">
          <h2><FaFileAlt /> My Applications</h2>
          <p>Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="applications-container">
      <div className="card">
        <div className="applications-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ margin: 0 }}><FaFileAlt /> My Applications</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/apply" className="btn btn-primary">
              <FaPlus /> Start New Application
            </Link>
            <button
              type="button"
              onClick={handleStartFromMismo}
              disabled={importingMismo}
              className="btn btn-secondary"
              title="Upload a MISMO 3.4 XML file to start a new application pre-populated with its data"
            >
              <FaFileUpload /> {importingMismo ? 'Importing…' : 'Start from MISMO'}
            </button>
            <input
              ref={mismoInputRef}
              type="file"
              accept=".xml,application/xml,text/xml"
              style={{ display: 'none' }}
              onChange={handleMismoFileSelected}
            />
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="empty-state">
            <FaFileAlt className="empty-icon" />
            <h3>No Applications Yet</h3>
            <p>Use the buttons above to start a fresh application or import a MISMO file from another system.</p>
          </div>
        ) : (
          <div className="applications-grid">
            {applications
              .sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate)) // Sort by date, oldest first
              .map((application, index) => {
                const isLatest = index === applications.length - 1; // Last item is the most recent
                return (
              <div key={application.id} className="application-card">
                <div className="application-header">
                  <div className="application-title">
                    {getStatusIcon(application.status)}
                    <div>
                      <h3>Application #{application.applicationNumber}</h3>
                      <p className="property-address">
                        {application.property?.addressLine || 'N/A'}, {application.property?.city || 'N/A'}, {application.property?.state || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className={`status ${getStatusClass(application.status)}`}>
                    {application.status || 'DRAFT'}
                  </span>
                </div>
                
                <div className="application-details">
                  <div className="detail-row">
                    <div className="detail-item">
                      <span className="label">Loan Amount</span>
                      <span className="value">{formatCurrency(application.loanAmount || 0)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Property Value</span>
                      <span className="value">{formatCurrency(application.propertyValue || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="detail-row">
                    <div className="detail-item">
                      <span className="label">Loan Type</span>
                      <span className="value">{application.loanType || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Applied</span>
                      <span className="value">{formatDate(application.createdDate || new Date())}</span>
                    </div>
                  </div>
                </div>
                
                <div className="application-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link
                    to={`/apply?edit=${application.id}`}
                    className="btn btn-primary"
                    title="Edit this application"
                  >
                    <FaEdit /> Edit
                  </Link>
                  <Link
                    to={`/applications/${application.id}`}
                    className="btn btn-secondary"
                    title="View read-only details and upload documents"
                  >
                    <FaEye /> View / Docs
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDownloadMismo(application.id)}
                    className="btn btn-outline-primary"
                    title="Download a MISMO 3.4 XML of this application"
                  >
                    <FaFileDownload /> MISMO
                  </button>
                  {isLatest && (
                    <button
                      type="button"
                      onClick={() => handleCopyToNewApplication(application.id)}
                      className="btn btn-secondary"
                      title="Start a new application with Assets, Liabilities, and REO from this one"
                    >
                      <FaCopy /> Copy to New
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteApplication(application.id, application.applicationNumber)}
                    className="btn btn-outline-danger"
                    title="Delete this application permanently"
                    style={{ marginLeft: 'auto' }}
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
                );
              })}
          </div>
        )}
      </div>
      
    </div>
  );
};

export default ApplicationList;
