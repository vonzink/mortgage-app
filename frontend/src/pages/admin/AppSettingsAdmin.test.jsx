import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppSettingsAdmin from './AppSettingsAdmin';
import adminService from '../../services/adminService';

vi.mock('../../services/adminService', () => ({
  __esModule: true,
  default: {
    getAppSettings: vi.fn(),
    updateAppSettings: vi.fn(),
  },
}));

// ESM default export: the factory must return an object with a `default` key
// (Jest tolerated a bare function via CJS interop; Vitest/ESM does not).
vi.mock('../../hooks/useRoles', () => ({ default: () => ({ isAdmin: true }) }));

beforeEach(() => {
  adminService.getAppSettings.mockReset();
  adminService.updateAppSettings.mockReset();
});

test('renders the toggle and provider dropdown', async () => {
  adminService.getAppSettings.mockResolvedValue({
    id: 1, aiEvalEnabled: false, llmDefaultProvider: 'anthropic', llmDefaultModel: 'claude-sonnet-4-20250514',
  });
  render(<MemoryRouter><AppSettingsAdmin /></MemoryRouter>);
  await waitFor(() => screen.getByLabelText(/AI evaluation/i));
  expect(screen.getByLabelText(/AI evaluation/i)).not.toBeChecked();
  expect(screen.getByLabelText(/default provider/i)).toHaveValue('anthropic');
});

test('toggling and saving sends PUT', async () => {
  adminService.getAppSettings.mockResolvedValue({
    id: 1, aiEvalEnabled: false, llmDefaultProvider: 'anthropic', llmDefaultModel: '',
  });
  adminService.updateAppSettings.mockResolvedValue({
    id: 1, aiEvalEnabled: true, llmDefaultProvider: 'openai', llmDefaultModel: 'gpt-4o-mini',
  });
  render(<MemoryRouter><AppSettingsAdmin /></MemoryRouter>);
  await waitFor(() => screen.getByLabelText(/AI evaluation/i));

  fireEvent.click(screen.getByLabelText(/AI evaluation/i));
  fireEvent.change(screen.getByLabelText(/default provider/i), { target: { value: 'openai' } });
  fireEvent.change(screen.getByLabelText(/model/i), { target: { value: 'gpt-4o-mini' } });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() => expect(adminService.updateAppSettings).toHaveBeenCalledWith({
    aiEvalEnabled: true,
    llmDefaultProvider: 'openai',
    llmDefaultModel: 'gpt-4o-mini',
  }));
});

test('DeepSeek banner shown when DeepSeek selected', async () => {
  adminService.getAppSettings.mockResolvedValue({
    id: 1, aiEvalEnabled: true, llmDefaultProvider: 'deepseek', llmDefaultModel: 'deepseek-chat',
  });
  render(<MemoryRouter><AppSettingsAdmin /></MemoryRouter>);
  await waitFor(() => screen.getByText(/disabled in production by default/i));
});
