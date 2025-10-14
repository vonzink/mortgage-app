import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaFileAlt, FaEye, FaClock, FaCheckCircle, FaTimesCircle, FaFileCode, FaCopy, FaChevronDown } from 'react-icons/fa';
import mortgageService from '../services/mortgageService';
import { downloadMISMO34Closing, downloadMISMO34FNM } from '../utils/urlaExport';

const ApplicationList = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowExportDropdown(null);
    if (showExportDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportDropdown]);

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

  const handleExportMISMO34Closing = async (applicationId) => {
    try {
      const applicationData = await mortgageService.getApplication(applicationId);
      downloadMISMO34Closing(applicationData);
      toast.success('MISMO 3.4 Closing XML downloaded successfully!');
      setShowExportDropdown(null);
    } catch (error) {
      toast.error('Failed to export XML. Please try again.');
      console.error('XML export error:', error);
    }
  };

  const handleExportMISMO34FNM = async (applicationId) => {
    try {
      const applicationData = await mortgageService.getApplication(applicationId);
      downloadMISMO34FNM(applicationData);
      toast.success('MISMO 3.4 FNM XML downloaded successfully!');
      setShowExportDropdown(null);
    } catch (error) {
      toast.error('Failed to export XML. Please try again.');
      console.error('XML export error:', error);
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
        <div className="applications-header">
          <h2><FaFileAlt /> My Applications</h2>
        </div>
        
        {applications.length === 0 ? (
          <div className="empty-state">
            <FaFileAlt className="empty-icon" />
            <h3>No Applications Yet</h3>
            <p>You haven't submitted any applications yet. Start your first mortgage application to get started.</p>
            <Link to="/apply" className="btn btn-primary btn-large">
              <FaFileAlt /> Start Your First Application
            </Link>
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
                
                <div className="application-actions">
                  <Link 
                    to={`/applications/${application.id}`} 
                    className="btn btn-primary"
                  >
                    <FaEye /> View & Upload Docs
                  </Link>
                  {isLatest && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyToNewApplication(application.id)}
                        className="btn btn-secondary"
                        title="Start a new application with Assets, Liabilities, and REO from this one"
                      >
                        <FaCopy /> Copy to New
                      </button>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExportDropdown(showExportDropdown === application.id ? null : application.id);
                          }}
                          className="btn btn-outline-primary"
                          title="Export to XML (MISMO 3.4 Format)"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <FaFileCode /> Export XML <FaChevronDown style={{ fontSize: '0.8rem' }} />
                        </button>
                        {showExportDropdown === application.id && (
                          <div 
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              marginTop: '0.25rem',
                              backgroundColor: 'white',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--border-radius)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              zIndex: 1000,
                              minWidth: '200px'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleExportMISMO34Closing(application.id)}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                background: 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.9rem',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              <FaFileCode /> MISMO 3.4 Closing
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportMISMO34FNM(application.id)}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                background: 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.9rem',
                                borderTop: '1px solid var(--border-color)',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              <FaFileCode /> MISMO 3.4 FNM
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
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
