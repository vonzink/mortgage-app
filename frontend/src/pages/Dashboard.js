import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFileAlt, 
  FaChartLine, 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle,
  FaPlus,
  FaEye,
  FaEdit,
  FaDollarSign,
  FaMapMarkerAlt,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaUpload,
  FaHome,
  FaShieldAlt,
  FaFileContract,
  FaSearch,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaPercent
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import mortgageService from '../services/mortgageService';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  
  // Mock loan progress data - in a real app, this would come from an API
  const [loanProgress, setLoanProgress] = useState({
    applicationId: "APP-2024-001",
    status: "Under Review",
    progress: 75,
    estimatedCloseDate: "2024-02-15",
    loanAmount: 450000,
    propertyAddress: "123 Maple Street, Springfield, IL 62701",
    interestRate: 6.75,
    monthlyPayment: 2916,
    loanOfficer: {
      name: "Sarah Johnson",
      phone: "(555) 123-4567",
      email: "sarah.johnson@mortgageapp.com"
    },
    milestones: [
      { id: 1, name: "Application Submitted", status: "completed", date: "2024-01-08", description: "Initial application received" },
      { id: 2, name: "Credit Check", status: "completed", date: "2024-01-10", description: "Credit report pulled and reviewed" },
      { id: 3, name: "Income Verification", status: "completed", date: "2024-01-12", description: "Employment and income verified" },
      { id: 4, name: "Appraisal Ordered", status: "completed", date: "2024-01-15", description: "Property appraisal scheduled" },
      { id: 5, name: "Appraisal Completed", status: "completed", date: "2024-01-18", description: "Property value confirmed at $500,000" },
      { id: 6, name: "Underwriting Review", status: "in-progress", date: "2024-01-20", description: "Underwriter reviewing all documentation" },
      { id: 7, name: "Title Search", status: "pending", date: null, description: "Title company performing property search" },
      { id: 8, name: "Final Approval", status: "pending", date: null, description: "Final loan approval and commitment letter" },
      { id: 9, name: "Closing Scheduled", status: "pending", date: null, description: "Closing date set and documents prepared" }
    ],
    documents: {
      required: [
        { name: "Pay Stubs (Last 2 Months)", status: "submitted", uploaded: "2024-01-10" },
        { name: "W-2 Forms (Last 2 Years)", status: "submitted", uploaded: "2024-01-10" },
        { name: "Bank Statements (Last 2 Months)", status: "submitted", uploaded: "2024-01-11" },
        { name: "Tax Returns (Last 2 Years)", status: "submitted", uploaded: "2024-01-12" },
        { name: "Property Insurance Quote", status: "pending", uploaded: null },
        { name: "Homeowners Insurance Policy", status: "pending", uploaded: null }
      ],
      optional: [
        { name: "Gift Letter", status: "not-required", uploaded: null },
        { name: "Asset Documentation", status: "submitted", uploaded: "2024-01-13" }
      ]
    },
    conditions: [
      { id: 1, type: "Prior to Funding", description: "Provide final homeowners insurance policy", status: "pending", dueDate: "2024-02-01" },
      { id: 2, type: "Prior to Funding", description: "Pay appraisal fee of $500", status: "completed", dueDate: "2024-01-15" },
      { id: 3, type: "Prior to Funding", description: "Verify employment with current employer", status: "pending", dueDate: "2024-01-25" }
    ],
    title: {
      status: "In Progress",
      company: "Springfield Title Services",
      contact: "Mike Rodriguez",
      phone: "(555) 987-6543",
      email: "mike@springfieldtitle.com",
      estimatedCompletion: "2024-02-05"
    },
    appraisal: {
      status: "Completed",
      value: 500000,
      appraiser: "Jane Smith",
      completedDate: "2024-01-18",
      reportReceived: true
    },
    insurance: {
      status: "Quote Received",
      provider: "State Farm Insurance",
      annualPremium: 1200,
      deductible: 1000,
      policyNumber: null,
      effectiveDate: null
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMilestoneIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="milestone-icon completed" />;
      case 'in-progress':
        return <FaClock className="milestone-icon in-progress" />;
      default:
        return <FaClock className="milestone-icon pending" />;
    }
  };

  const getDocumentStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return <FaCheckCircle className="doc-icon submitted" />;
      case 'pending':
        return <FaExclamationTriangle className="doc-icon pending" />;
      case 'not-required':
        return <FaTimesCircle className="doc-icon not-required" />;
      default:
        return <FaClock className="doc-icon pending" />;
    }
  };

  const getConditionStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="condition-icon completed" />;
      case 'pending':
        return <FaExclamationTriangle className="condition-icon pending" />;
      default:
        return <FaClock className="condition-icon pending" />;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="card">
          <h2><FaChartLine /> Loan Progress Dashboard</h2>
          <p>Loading loan progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Loan Overview */}
      <div className="card">
        <h2><FaHome /> Loan Progress Overview</h2>
        <div className="loan-overview-grid">
          <div className="loan-detail-card">
            <div className="icon">
              <FaDollarSign />
            </div>
            <div className="detail-content">
              <h3>Loan Amount</h3>
              <p className="amount">{formatCurrency(loanProgress.loanAmount)}</p>
            </div>
          </div>
          
          <div className="loan-detail-card">
            <div className="icon">
              <FaPercent />
            </div>
            <div className="detail-content">
              <h3>Interest Rate</h3>
              <p className="rate">{loanProgress.interestRate}%</p>
            </div>
          </div>
          
          <div className="loan-detail-card">
            <div className="icon">
              <FaCalendarAlt />
            </div>
            <div className="detail-content">
              <h3>Est. Close Date</h3>
              <p className="date">{formatDate(loanProgress.estimatedCloseDate)}</p>
            </div>
          </div>
          
          <div className="loan-detail-card">
            <div className="icon">
              <FaChartLine />
            </div>
            <div className="detail-content">
              <h3>Progress</h3>
              <p className="progress">{loanProgress.progress}%</p>
            </div>
          </div>
        </div>
        
        <div className="progress-section">
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${loanProgress.progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{loanProgress.progress}% Complete</span>
          </div>
          <div className="status-badge">
            <span className={`status ${loanProgress.status.toLowerCase().replace(' ', '-')}`}>
              {loanProgress.status}
            </span>
          </div>
        </div>
      </div>

      {/* Loan Milestones */}
      <div className="card">
        <h2><FaChartLine /> Loan Process Milestones</h2>
        <div className="milestones-timeline">
          {loanProgress.milestones.map((milestone, index) => (
            <div key={milestone.id} className={`milestone-item ${milestone.status}`}>
              <div className="milestone-icon-container">
                {getMilestoneIcon(milestone.status)}
              </div>
              <div className="milestone-content">
                <h4>{milestone.name}</h4>
                <p>{milestone.description}</p>
                <span className="milestone-date">
                  {milestone.date ? formatDate(milestone.date) : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Status */}
      <div className="card">
        <h2><FaFileAlt /> Document Status</h2>
        <div className="document-sections">
          <div className="document-section">
            <h3><FaExclamationTriangle className="section-icon" /> Required Documents</h3>
            <div className="document-list">
              {loanProgress.documents.required.map((doc, index) => (
                <div key={index} className="document-item">
                  <div className="document-status">
                    {getDocumentStatusIcon(doc.status)}
                  </div>
                  <div className="document-info">
                    <h4>{doc.name}</h4>
                    <p>
                      {doc.status === 'submitted' && doc.uploaded 
                        ? `Submitted on ${formatDate(doc.uploaded)}`
                        : doc.status === 'pending' 
                          ? 'Pending submission'
                          : 'Not required'
                      }
                    </p>
                  </div>
                  {doc.status === 'pending' && (
                    <Link to="/documents" className="btn btn-primary btn-small">
                      <FaUpload /> Upload
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="document-section">
            <h3><FaFileAlt className="section-icon" /> Optional Documents</h3>
            <div className="document-list">
              {loanProgress.documents.optional.map((doc, index) => (
                <div key={index} className="document-item">
                  <div className="document-status">
                    {getDocumentStatusIcon(doc.status)}
                  </div>
                  <div className="document-info">
                    <h4>{doc.name}</h4>
                    <p>
                      {doc.status === 'submitted' && doc.uploaded 
                        ? `Submitted on ${formatDate(doc.uploaded)}`
                        : doc.status === 'not-required' 
                          ? 'Not required for this loan'
                          : 'Optional submission'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="document-actions">
          <Link to="/documents" className="btn btn-primary">
            <FaUpload /> Upload Documents
          </Link>
        </div>
      </div>

      {/* Underwriting Conditions */}
      <div className="card">
        <h2><FaFileContract /> Underwriting Conditions</h2>
        <div className="conditions-list">
          {loanProgress.conditions.map((condition) => (
            <div key={condition.id} className="condition-item">
              <div className="condition-status">
                {getConditionStatusIcon(condition.status)}
              </div>
              <div className="condition-content">
                <div className="condition-header">
                  <h4>{condition.description}</h4>
                  <span className="condition-type">{condition.type}</span>
                </div>
                <p>Due: {formatDate(condition.dueDate)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Providers */}
      <div className="service-providers-grid">
        {/* Title Company */}
        <div className="card">
          <h2><FaFileContract /> Title Information</h2>
          <div className="service-provider-card">
            <div className="provider-header">
              <h3>{loanProgress.title.company}</h3>
              <span className={`status ${loanProgress.title.status.toLowerCase().replace(' ', '-')}`}>
                {loanProgress.title.status}
              </span>
            </div>
            <div className="provider-details">
              <div className="provider-contact">
                <h4>Contact: {loanProgress.title.contact}</h4>
                <p><FaPhone /> {loanProgress.title.phone}</p>
                <p><FaEnvelope /> {loanProgress.title.email}</p>
              </div>
              <div className="provider-timeline">
                <p><strong>Est. Completion:</strong> {formatDate(loanProgress.title.estimatedCompletion)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Appraisal */}
        <div className="card">
          <h2><FaSearch /> Appraisal Status</h2>
          <div className="service-provider-card">
            <div className="provider-header">
              <h3>Property Appraisal</h3>
              <span className={`status ${loanProgress.appraisal.status.toLowerCase()}`}>
                {loanProgress.appraisal.status}
              </span>
            </div>
            <div className="provider-details">
              <div className="appraisal-details">
                <p><strong>Appraised Value:</strong> {formatCurrency(loanProgress.appraisal.value)}</p>
                <p><strong>Appraiser:</strong> {loanProgress.appraisal.appraiser}</p>
                <p><strong>Completed:</strong> {formatDate(loanProgress.appraisal.completedDate)}</p>
                <p><strong>Report Received:</strong> {loanProgress.appraisal.reportReceived ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Insurance */}
        <div className="card">
          <h2><FaShieldAlt /> Insurance Information</h2>
          <div className="service-provider-card">
            <div className="provider-header">
              <h3>{loanProgress.insurance.provider}</h3>
              <span className={`status ${loanProgress.insurance.status.toLowerCase().replace(' ', '-')}`}>
                {loanProgress.insurance.status}
              </span>
            </div>
            <div className="provider-details">
              <div className="insurance-details">
                <p><strong>Annual Premium:</strong> {formatCurrency(loanProgress.insurance.annualPremium)}</p>
                <p><strong>Deductible:</strong> {formatCurrency(loanProgress.insurance.deductible)}</p>
                {loanProgress.insurance.policyNumber && (
                  <p><strong>Policy Number:</strong> {loanProgress.insurance.policyNumber}</p>
                )}
                {loanProgress.insurance.effectiveDate && (
                  <p><strong>Effective Date:</strong> {formatDate(loanProgress.insurance.effectiveDate)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Officer Contact */}
      <div className="card">
        <h2><FaUser /> Your Loan Officer</h2>
        <div className="loan-officer-card">
          <div className="officer-info">
            <div className="officer-avatar">
              <FaUser />
            </div>
            <div className="officer-details">
              <h3>{loanProgress.loanOfficer.name}</h3>
              <p>Senior Loan Officer</p>
            </div>
          </div>
          <div className="contact-methods">
            <a href={`tel:${loanProgress.loanOfficer.phone}`} className="contact-btn">
              <FaPhone />
              {loanProgress.loanOfficer.phone}
            </a>
            <a href={`mailto:${loanProgress.loanOfficer.email}`} className="contact-btn">
              <FaEnvelope />
              {loanProgress.loanOfficer.email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

