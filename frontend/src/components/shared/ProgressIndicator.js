/**
 * Progress Indicator Component
 * Shows the current step progress with visual indicators
 */
import React from 'react';
import { FaCheck } from 'react-icons/fa';

const ProgressIndicator = ({ 
  steps, 
  currentStep, 
  onStepClick,
  clickableSteps = false 
}) => {
  const handleStepClick = (stepNumber) => {
    if (clickableSteps && stepNumber <= currentStep) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h2>Mortgage Application</h2>
        <p>Complete all steps to submit your application</p>
      </div>
      
      <div className="progress-steps">
        {steps.map((step) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isClickable = clickableSteps && step.number <= currentStep;
          
          return (
            <div
              key={step.number}
              className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
              onClick={() => handleStepClick(step.number)}
            >
              <div className="step-icon">
                {isCompleted ? <FaCheck /> : step.icon}
              </div>
              <div className="step-info">
                <h4>{step.title}</h4>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
