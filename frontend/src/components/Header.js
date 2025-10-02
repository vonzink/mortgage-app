import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaFileAlt, FaList, FaChartLine } from 'react-icons/fa';

const Header = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Link to="/" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaHome />
            MortgageApp
          </Link>
        </div>
        <nav className="nav">
          <Link to="/" className={isActive('/') ? 'active' : ''}>
            <FaHome />
            <span>Home</span>
          </Link>
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            <FaChartLine />
            <span>Dashboard</span>
          </Link>
          <Link to="/apply" className={isActive('/apply') ? 'active' : ''}>
            <FaFileAlt />
            <span>Apply Now</span>
          </Link>
          <Link to="/applications" className={isActive('/applications') ? 'active' : ''}>
            <FaList />
            <span>My Applications</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
