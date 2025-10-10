/**
 * Custom hook for managing form steps and navigation
 */
import { useState, useCallback } from 'react';

export const useFormSteps = (totalSteps = 7) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState(new Set([1]));

  const nextStep = useCallback(() => {
    const nextStepNum = Math.min(currentStep + 1, totalSteps);
    setCurrentStep(nextStepNum);
    setVisitedSteps(prev => new Set([...prev, nextStepNum]));
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
      setVisitedSteps(prev => new Set([...prev, step]));
    }
  }, [totalSteps]);

  const canGoNext = currentStep < totalSteps;
  const canGoPrev = currentStep > 1;
  const isLastStep = currentStep === totalSteps;
  const isFirstStep = currentStep === 1;

  return {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    goToStep,
    canGoNext,
    canGoPrev,
    isLastStep,
    isFirstStep,
    setCurrentStep,
    visitedSteps
  };
};
