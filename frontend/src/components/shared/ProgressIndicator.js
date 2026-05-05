/**
 * Progress Indicator Component
 *
 * Renders the multi-step navigation rail. Steps the user has visited (or
 * completed) are real buttons that take them back. Future steps are visibly
 * inert — disabled, no hover lift, with a tooltip explaining why.
 *
 * a11y:
 *   - <button type="button"> per step (real buttons, keyboard-reachable)
 *   - aria-current="step" on the active item
 *   - aria-disabled + native disabled on future items
 *   - title="Complete the current step first" tooltip on future items
 */
import React from 'react';
import { FaCheck } from 'react-icons/fa';

const ProgressIndicator = ({
  steps,
  currentStep,
  onStepClick,
  clickableSteps = false,
  isEditing = false,
  visitedSteps = new Set([1]),
}) => {
  const handleStepClick = (stepNumber, isClickable) => {
    if (!isClickable) return;
    onStepClick(stepNumber);
  };

  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <h2>{isEditing ? 'Create New Version from Existing Application' : 'Mortgage Application'}</h2>
        <p>{isEditing ? 'Make changes and save as a new version. Your original will be preserved.' : 'Complete all steps to submit your application'}</p>
      </div>

      <ol className="progress-steps" aria-label="Application progress">
        {steps.map((step) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isClickable = clickableSteps && (visitedSteps.has(step.number) || isCompleted);
          const isFuture = !isActive && !isCompleted && !isClickable;

          const className = [
            'progress-step',
            isActive && 'active',
            isCompleted && 'completed',
            isClickable && !isActive && 'clickable',
            isFuture && 'future',
          ].filter(Boolean).join(' ');

          return (
            <li key={step.number} className="progress-step-item">
              <button
                type="button"
                className={className}
                onClick={() => handleStepClick(step.number, isClickable)}
                disabled={isFuture || isActive}
                aria-current={isActive ? 'step' : undefined}
                aria-disabled={isFuture ? 'true' : undefined}
                aria-label={`${step.title}, step ${step.number} of ${steps.length}${isActive ? ', current step' : isCompleted ? ', completed' : ''}`}
                title={isFuture ? 'Complete the current step first' : undefined}
              >
                <span className="step-icon" aria-hidden="true">
                  {isCompleted ? <FaCheck /> : step.icon}
                </span>
                <span className="step-info">
                  <span className="step-title">{step.title}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

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
