import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaFileAlt, FaEye, FaEdit, FaPlus, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import mortgageService from '../services/mortgageService';

const ApplicationList = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

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
          <Link to="/apply" className="btn btn-primary">
            <FaPlus /> New Application
          </Link>
        </div>
        
        {applications.length === 0 ? (
          <div className="empty-state">
            <FaFileAlt className="empty-icon" />
            <h3>No Applications Yet</h3>
            <p>You haven't submitted any applications yet. Start your first mortgage application to get started.</p>
            <Link to="/apply" className="btn btn-primary btn-large">
              <FaPlus /> Start Your First Application
            </Link>
          </div>
        ) : (
          <div className="applications-grid">
            {applications.map((application) => (
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
                    className="btn btn-secondary"
                  >
                    <FaEye /> View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationList;
