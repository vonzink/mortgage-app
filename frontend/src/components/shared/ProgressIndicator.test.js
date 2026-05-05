/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProgressIndicator from './ProgressIndicator';

const STEPS = [
  { number: 1, title: 'Loan Info',  icon: <span /> },
  { number: 2, title: 'Borrower',   icon: <span /> },
  { number: 3, title: 'Property',   icon: <span /> },
  { number: 4, title: 'Employment', icon: <span /> },
];

describe('ProgressIndicator a11y states', () => {
  test('active step carries aria-current="step" and is not clickable as a no-op target', () => {
    const onClick = jest.fn();
    render(
      <ProgressIndicator
        steps={STEPS}
        currentStep={2}
        onStepClick={onClick}
        clickableSteps
        visitedSteps={new Set([1, 2])}
      />,
    );
    const active = screen.getByRole('button', { current: 'step' });
    expect(active).toHaveAttribute('disabled');
    fireEvent.click(active);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('previously-visited completed steps navigate', () => {
    const onClick = jest.fn();
    render(
      <ProgressIndicator
        steps={STEPS}
        currentStep={3}
        onStepClick={onClick}
        clickableSteps
        visitedSteps={new Set([1, 2, 3])}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Loan Info/ }));
    expect(onClick).toHaveBeenCalledWith(1);
  });

  test('future steps are aria-disabled, real-disabled, and carry the explanatory tooltip', () => {
    render(
      <ProgressIndicator
        steps={STEPS}
        currentStep={2}
        onStepClick={() => {}}
        clickableSteps
        visitedSteps={new Set([1, 2])}
      />,
    );
    const future = screen.getByRole('button', { name: /Property/ });
    expect(future).toHaveAttribute('aria-disabled', 'true');
    expect(future).toBeDisabled();
    expect(future).toHaveAttribute('title', 'Complete the current step first');
  });

  test('progressbar role + ETA reflect the remaining-step time sum', () => {
    render(
      <ProgressIndicator
        steps={STEPS}
        currentStep={2}
        onStepClick={() => {}}
        clickableSteps
        visitedSteps={new Set([1, 2])}
      />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
    // Remaining: steps 2,3,4 → 4+2+3 = 9 minutes (per STEP_MINUTES)
    expect(screen.getByText(/About 9 minutes remaining/)).toBeInTheDocument();
  });

  test('aria-label includes "step N of M, current step" for the active item', () => {
    render(
      <ProgressIndicator
        steps={STEPS}
        currentStep={2}
        onStepClick={() => {}}
        clickableSteps
        visitedSteps={new Set([1, 2])}
      />,
    );
    expect(
      screen.getByRole('button', { current: 'step' })
    ).toHaveAttribute('aria-label', expect.stringContaining('step 2 of 4, current step'));
  });
});
