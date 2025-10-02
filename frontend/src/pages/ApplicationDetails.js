import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import mortgageService from '../services/mortgageService';

const ApplicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
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

        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #eee' }}>
          <h3>Next Steps</h3>
          {application.status === 'SUBMITTED' && (
            <div>
              <p>Your application is currently under review. Our team will:</p>
              <ul style={{ marginLeft: '2rem', marginTop: '1rem' }}>
                <li>Review your financial information</li>
                <li>Verify your employment status</li>
                <li>Check your credit history</li>
                <li>Contact you if additional documentation is needed</li>
              </ul>
              <p style={{ marginTop: '1rem' }}>
                You will receive an email notification once your application status is updated.
              </p>
            </div>
          )}
          
          {application.status === 'APPROVED' && (
            <div>
              <p style={{ color: '#28a745', fontWeight: 'bold' }}>
                🎉 Congratulations! Your mortgage application has been approved.
              </p>
              <p style={{ marginTop: '1rem' }}>
                A loan officer will contact you within 24 hours to discuss the next steps 
                in the closing process.
              </p>
            </div>
          )}
          
          {application.status === 'DENIED' && (
            <div>
              <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
                Unfortunately, your mortgage application was not approved at this time.
              </p>
              <p style={{ marginTop: '1rem' }}>
                A loan officer will contact you to discuss the reasons and potential 
                alternatives or steps you can take to improve your application.
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button onClick={() => navigate('/applications')} className="btn btn-secondary">
            Back to Applications
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetails;
