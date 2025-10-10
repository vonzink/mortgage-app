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
  clickableSteps = false,
  isEditing = false,
  visitedSteps = new Set([1])
}) => {
  const handleStepClick = (stepNumber) => {
    if (clickableSteps && visitedSteps.has(stepNumber)) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h2>{isEditing ? 'Create New Version from Existing Application' : 'Mortgage Application'}</h2>
        <p>{isEditing ? 'Make changes and save as a new version. Your original will be preserved.' : 'Complete all steps to submit your application'}</p>
      </div>
      
      <div className="progress-steps">
        {steps.map((step) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isClickable = clickableSteps && visitedSteps.has(step.number);
          
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
