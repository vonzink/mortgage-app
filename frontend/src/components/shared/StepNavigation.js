/**
 * Step Navigation Component
 * Handles navigation between form steps
 */
import React from 'react';
import { FaArrowLeft, FaArrowRight, FaSpinner } from 'react-icons/fa';

const StepNavigation = ({ 
  currentStep, 
  totalSteps, 
  onPrev, 
  onNext, 
  onSubmit,
  canGoNext = true,
  canGoPrev = true,
  isSubmitting = false,
  isLastStep = false
}) => {
  return (
    <div className="step-navigation">
      <div className="navigation-buttons">
        {canGoPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="btn btn-outline-secondary"
            disabled={isSubmitting}
          >
            <FaArrowLeft />
            Previous
          </button>
        )}
        
        <div className="step-info">
          <span className="current-step">Step {currentStep} of {totalSteps}</span>
        </div>
        
        {isLastStep ? (
          <button
            type="button"
            onClick={onSubmit}
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="spinner" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="btn btn-primary"
            disabled={!canGoNext || isSubmitting}
          >
            Next
            <FaArrowRight />
          </button>
        )}
      </div>
    </div>
  );
};

export default StepNavigation;
