import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FolderEvaluationCard from './FolderEvaluationCard';
import mortgageService from '../services/mortgageService';

// react-markdown v10 is ESM-only and CRA Jest can't transform it.
// Mock to a passthrough that just renders children as text.
vi.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="markdown">{children}</div>,
}));

vi.mock('../services/mortgageService', () => ({
  __esModule: true,
  default: {
    getFolderEvaluation: vi.fn(),
    evaluateFolder: vi.fn(),
  },
}));

beforeEach(() => {
  mortgageService.getFolderEvaluation.mockReset();
  mortgageService.evaluateFolder.mockReset();
});

const baseProps = { loanId: 1, folderTemplateId: 3, hasPrompt: true, aiEnabled: true };

test('renders never-evaluated state with Evaluate button', async () => {
  mortgageService.getFolderEvaluation.mockResolvedValue(null);
  render(<FolderEvaluationCard {...baseProps} />);
  await waitFor(() => screen.getByText(/no evaluation yet/i));
  expect(screen.getByRole('button', { name: /evaluate folder/i })).toBeInTheDocument();
});

test('renders nothing when aiEnabled is false', () => {
  const { container } = render(<FolderEvaluationCard {...baseProps} aiEnabled={false} />);
  expect(container.firstChild).toBeNull();
});

test('renders nothing when hasPrompt is false', () => {
  const { container } = render(<FolderEvaluationCard {...baseProps} hasPrompt={false} />);
  expect(container.firstChild).toBeNull();
});

test('renders success state with markdown body', async () => {
  mortgageService.getFolderEvaluation.mockResolvedValue({
    id: 7, status: 'success', providerCalled: true,
    responseMarkdown: '## Summary\n\nLooks good.',
    costUsd: 0.0156, actualInputTokens: 1200, actualOutputTokens: 80,
    createdAt: new Date().toISOString(),
  });
  render(<FolderEvaluationCard {...baseProps} />);
  await waitFor(() => screen.getByText(/Summary/));
  expect(screen.getByText(/Looks good/)).toBeInTheDocument();
});

test('renders needs_ocr status with reason', async () => {
  mortgageService.getFolderEvaluation.mockResolvedValue({
    id: 8, status: 'needs_ocr', providerCalled: false,
    reason: 'PDF is scanned',
    costUsd: 0, createdAt: new Date().toISOString(),
  });
  render(<FolderEvaluationCard {...baseProps} />);
  await waitFor(() => screen.getByText(/needs_ocr/i));
  expect(screen.getByText(/PDF is scanned/)).toBeInTheDocument();
});

test('Evaluate button fires POST', async () => {
  mortgageService.getFolderEvaluation.mockResolvedValue(null);
  mortgageService.evaluateFolder.mockResolvedValue({
    id: 9, status: 'success', providerCalled: true,
    responseMarkdown: '## New result', costUsd: 0.02,
    createdAt: new Date().toISOString(),
  });
  render(<FolderEvaluationCard {...baseProps} />);
  await waitFor(() => screen.getByRole('button', { name: /evaluate folder/i }));
  fireEvent.click(screen.getByRole('button', { name: /evaluate folder/i }));
  await waitFor(() => expect(mortgageService.evaluateFolder).toHaveBeenCalledWith(1, 3));
});
