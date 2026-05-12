/**
 * Custom hook for managing form steps and navigation
 */
import { useState, useCallback, useEffect, useRef } from 'react';

export const useFormSteps = (totalSteps = 7, persistKey = null) => {
  // Lazy-restore from sessionStorage so a reload / re-auth round-trip lands on the
  // same step (and re-enables the strip's clickable nav for previously visited steps).
  const initial = (() => {
    if (!persistKey) return { step: 1, visited: new Set([1]) };
    try {
      const raw = sessionStorage.getItem(persistKey);
      if (!raw) return { step: 1, visited: new Set([1]) };
      const { step, visited } = JSON.parse(raw);
      const s = Number.isInteger(step) && step >= 1 && step <= totalSteps ? step : 1;
      const v = Array.isArray(visited) ? new Set(visited.filter(n => Number.isInteger(n) && n >= 1 && n <= totalSteps)) : new Set([1]);
      v.add(s);
      return { step: s, visited: v };
    } catch {
      return { step: 1, visited: new Set([1]) };
    }
  })();

  const [currentStep, setCurrentStep] = useState(initial.step);
  const [visitedSteps, setVisitedSteps] = useState(initial.visited);

  const persistRef = useRef(persistKey);
  persistRef.current = persistKey;
  useEffect(() => {
    if (!persistRef.current) return;
    try {
      sessionStorage.setItem(persistRef.current, JSON.stringify({
        step: currentStep,
        visited: Array.from(visitedSteps),
      }));
    } catch { /* quota or serialize — non-fatal */ }
  }, [currentStep, visitedSteps]);

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
    visitedSteps,
    setVisitedSteps
  };
};
