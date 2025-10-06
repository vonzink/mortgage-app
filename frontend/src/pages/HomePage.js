import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaHome, 
  FaChartLine, 
  FaClock, 
  FaHeadset,
  FaCheckCircle,
  FaDollarSign,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaUpload,
  FaEye
} from 'react-icons/fa';

const HomePage = () => {
  // Mock loan data - in a real app, this would come from an API
  const [loanData] = useState({
    loanAmount: 450000,
    propertyValue: 500000,
    propertyAddress: "123 Maple Street, Springfield, IL 62701",
    loanType: "Conventional",
    loanPurpose: "Purchase",
    interestRate: 6.75,
    term: 30,
    monthlyPayment: 2916,
    status: "Under Review",
    progress: 65,
    loanOfficer: {
      name: "Sarah Johnson",
      phone: "(555) 123-4567",
      email: "sarah.johnson@mortgageapp.com"
    },
    recentActivity: [
      { date: "2024-01-15", activity: "Appraisal completed", status: "completed" },
      { date: "2024-01-12", activity: "Credit report received", status: "completed" },
      { date: "2024-01-10", activity: "Income verification pending", status: "pending" },
      { date: "2024-01-08", activity: "Application submitted", status: "completed" }
    ]
  });

  // Mock login state - removed unused variable

  return (
    <div className="homepage-container">
      {/* Welcome Section */}
      <div className="hero-card">
        <div className="hero-content">
          <h1>Welcome Back, John!</h1>
          <p>Here's your current loan information and progress</p>
          <div className="hero-actions">
            <Link to="/dashboard" className="btn btn-primary btn-large">
              <FaChartLine />
              View Full Dashboard
            </Link>
            <Link to="/documents" className="btn btn-secondary btn-large">
              <FaUpload />
              Upload Documents
            </Link>
          </div>
        </div>
      </div>

      {/* Loan Overview */}
      <div className="card">
        <h2><FaHome /> Your Loan Information</h2>
        <div className="loan-overview-grid">
          <div className="loan-detail-card">
            <div className="icon">
              <FaDollarSign />
            </div>
            <div className="detail-content">
              <h3>Loan Amount</h3>
              <p className="amount">${loanData.loanAmount.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="loan-detail-card">
            <div className="icon">
              <FaMapMarkerAlt />
            </div>
            <div className="detail-content">
              <h3>Property</h3>
              <p className="address">{loanData.propertyAddress}</p>
            </div>
          </div>
          
          <div className="loan-detail-card">
            <div className="icon">
              <FaCalendarAlt />
            </div>
            <div className="detail-content">
              <h3>Interest Rate</h3>
              <p className="rate">{loanData.interestRate}%</p>
            </div>
          </div>
          
          <div className="loan-detail-card">
            <div className="icon">
              <FaCheckCircle />
            </div>
            <div className="detail-content">
              <h3>Monthly Payment</h3>
              <p className="payment">${loanData.monthlyPayment.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Progress */}
      <div className="card">
        <h2><FaChartLine /> Loan Progress</h2>
        <div className="progress-section">
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${loanData.progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{loanData.progress}% Complete</span>
          </div>
          <div className="status-badge">
            <span className={`status ${loanData.status.toLowerCase().replace(' ', '-')}`}>
              {loanData.status}
            </span>
          </div>
        </div>
        
        <div className="loan-details-grid">
          <div className="detail-item">
            <span className="label">Loan Type:</span>
            <span className="value">{loanData.loanType}</span>
          </div>
          <div className="detail-item">
            <span className="label">Purpose:</span>
            <span className="value">{loanData.loanPurpose}</span>
          </div>
          <div className="detail-item">
            <span className="label">Term:</span>
            <span className="value">{loanData.term} years</span>
          </div>
          <div className="detail-item">
            <span className="label">Property Value:</span>
            <span className="value">${loanData.propertyValue.toLocaleString()}</span>
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
              <h3>{loanData.loanOfficer.name}</h3>
              <p>Senior Loan Officer</p>
            </div>
          </div>
          <div className="contact-methods">
            <a href={`tel:${loanData.loanOfficer.phone}`} className="contact-btn">
              <FaPhone />
              {loanData.loanOfficer.phone}
            </a>
            <a href={`mailto:${loanData.loanOfficer.email}`} className="contact-btn">
              <FaEnvelope />
              {loanData.loanOfficer.email}
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2><FaClock /> Recent Activity</h2>
        <div className="activity-timeline">
          {loanData.recentActivity.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className={`activity-status ${activity.status}`}>
                {activity.status === 'completed' ? <FaCheckCircle /> : <FaClock />}
              </div>
              <div className="activity-content">
                <h4>{activity.activity}</h4>
                <p>{new Date(activity.date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <Link to="/dashboard" className="dashboard-card">
            <div className="icon">
              <FaChartLine />
            </div>
            <div>
              <h3>Full Dashboard</h3>
              <p>View detailed loan progress and status</p>
            </div>
          </Link>
          
          <Link to="/documents" className="dashboard-card">
            <div className="icon">
              <FaUpload />
            </div>
            <div>
              <h3>Upload Documents</h3>
              <p>Submit required documents securely</p>
            </div>
          </Link>
          
          <Link to="/loan-details" className="dashboard-card">
            <div className="icon">
              <FaEye />
            </div>
            <div>
              <h3>Loan Details</h3>
              <p>Review all loan information</p>
            </div>
          </Link>
          
          <Link to="/contact" className="dashboard-card">
            <div className="icon">
              <FaHeadset />
            </div>
            <div>
              <h3>Contact Support</h3>
              <p>Get help from our team</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
