/**
 * Form Section Component
 * Reusable wrapper for form sections with consistent styling
 */
import React from 'react';

const FormSection = ({ 
  title, 
  icon, 
  description, 
  children, 
  className = '',
  warning = null,
  error = null 
}) => {
  return (
    <div className={`form-section ${className}`}>
      <div className="section-header">
        <h3>
          {icon && <span className="section-icon">{icon}</span>}
          {title}
        </h3>
        {description && <p className="section-description">{description}</p>}
      </div>
      
      {warning && (
        <div className="alert alert-warning">
          <strong>Warning:</strong> {warning}
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="section-content">
        {children}
      </div>
    </div>
  );
};

export default FormSection;
