/**
 * Unit tests for the document-type + folder-template catalog slice of adminService.
 *
 * DMS cutover (Task A5): these 10 functions (5 doc-types + 5 folder-templates CRUD)
 * now manage the msfg-suite (system of record) catalogs instead of the legacy
 * mortgage-app backend. The suite wraps every response in an envelope
 * ({ success, data }) — unwrapped here the same way mortgageService does for its
 * suite-backed methods.
 *
 * Suite upsert DTOs (verified against
 * msfg-suite/documents/src/main/java/com/msfg/los/documents/web/dto/):
 *   - UpsertDocumentTypeRequest{name,slug,defaultFolderName,requiredForMilestones,
 *     allowedMimeTypes,maxFileSizeBytes,active,sortOrder} — boolean field is `active`.
 *     No `borrowerVisibleDefault` — visibility is now per-document sharing.
 *   - UpsertFolderTemplateRequest{displayName,sortKey,oldLoanArchive,deleteFolder,
 *     active,sortOrder,evalPrompt} — booleans are `oldLoanArchive`/`deleteFolder`/`active`
 *     (not the `is`-prefixed response field names).
 *
 * Users + app-settings functions are UNCHANGED (still legacy apiClient) — regression
 * covered at the bottom of this file.
 */
import adminService from './adminService';
import apiClient, { suiteClient } from './apiClient';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  suiteClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

// ── Document Types ────────────────────────────────────────────────────────────

describe('adminService document-type catalog (suite)', () => {
  test('listDocumentTypes hits suiteClient and unwraps the BARE-ARRAY envelope (real admin wire shape)', async () => {
    // AdminDocumentTypeController.list() returns ApiResponse<List<DocumentTypeResponse>>:
    // the envelope data IS the array — NOT the {count, documentTypes} non-admin view.
    suiteClient.get.mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 'dt-1', name: 'W-2', slug: 'w-2' }],
      },
    });

    const result = await adminService.listDocumentTypes();

    expect(suiteClient.get).toHaveBeenCalledWith('/admin/document-types');
    expect(result).toEqual([{ id: 'dt-1', name: 'W-2', slug: 'w-2' }]);
  });

  test('listDocumentTypes tolerates the {count, documentTypes} object view (future-proofing)', async () => {
    suiteClient.get.mockResolvedValue({
      data: {
        success: true,
        data: { count: 1, documentTypes: [{ id: 'dt-1', name: 'W-2', slug: 'w-2' }] },
      },
    });
    expect(await adminService.listDocumentTypes()).toEqual([
      { id: 'dt-1', name: 'W-2', slug: 'w-2' },
    ]);
  });

  test('listDocumentTypes returns [] when the payload is neither array nor object view', async () => {
    suiteClient.get.mockResolvedValue({ data: { success: true, data: { count: 0 } } });
    expect(await adminService.listDocumentTypes()).toEqual([]);
  });

  test('getDocumentType hits suiteClient by id and unwraps the envelope', async () => {
    const dto = { id: 'dt-1', name: 'W-2', slug: 'w-2' };
    suiteClient.get.mockResolvedValue({ data: { success: true, data: dto } });

    const result = await adminService.getDocumentType('dt-1');

    expect(suiteClient.get).toHaveBeenCalledWith('/admin/document-types/dt-1');
    expect(result).toEqual(dto);
  });

  test('createDocumentType POSTs to suiteClient with mapped fields, excluding borrowerVisibleDefault', async () => {
    const created = { id: 'dt-2', name: 'Pay Stub', slug: 'pay-stub' };
    suiteClient.post.mockResolvedValue({ data: { success: true, data: created } });

    const result = await adminService.createDocumentType({
      name: 'Pay Stub',
      slug: 'pay-stub',
      defaultFolderName: '03 Income',
      requiredForMilestones: '',
      allowedMimeTypes: 'application/pdf',
      maxFileSizeBytes: 5000000,
      borrowerVisibleDefault: true,
      isActive: true,
      sortOrder: 2,
    });

    expect(suiteClient.post).toHaveBeenCalledWith('/admin/document-types', {
      name: 'Pay Stub',
      slug: 'pay-stub',
      defaultFolderName: '03 Income',
      requiredForMilestones: '',
      allowedMimeTypes: 'application/pdf',
      maxFileSizeBytes: 5000000,
      active: true,
      sortOrder: 2,
    });
    const sentPayload = suiteClient.post.mock.calls[0][1];
    expect(sentPayload).not.toHaveProperty('borrowerVisibleDefault');
    expect(sentPayload).not.toHaveProperty('isActive');
    expect(result).toEqual(created);
  });

  test('updateDocumentType PUTs to suiteClient with mapped fields, excluding borrowerVisibleDefault', async () => {
    const updated = { id: 'dt-1', name: 'W-2 Updated' };
    suiteClient.put.mockResolvedValue({ data: { success: true, data: updated } });

    const result = await adminService.updateDocumentType('dt-1', {
      name: 'W-2 Updated',
      slug: 'w-2',
      borrowerVisibleDefault: false,
      isActive: false,
      sortOrder: 1,
    });

    expect(suiteClient.put).toHaveBeenCalledWith('/admin/document-types/dt-1', {
      name: 'W-2 Updated',
      slug: 'w-2',
      active: false,
      sortOrder: 1,
    });
    const sentPayload = suiteClient.put.mock.calls[0][1];
    expect(sentPayload).not.toHaveProperty('borrowerVisibleDefault');
    expect(result).toEqual(updated);
  });

  test('deactivateDocumentType DELETEs via suiteClient (204 No Content — empty body)', async () => {
    suiteClient.delete.mockResolvedValue({ status: 204, data: '' });

    await adminService.deactivateDocumentType('dt-1');

    expect(suiteClient.delete).toHaveBeenCalledWith('/admin/document-types/dt-1');
  });
});

// ── Folder Templates ──────────────────────────────────────────────────────────

describe('adminService folder-template catalog (suite)', () => {
  test('listFolderTemplates hits suiteClient and unwraps the BARE-ARRAY envelope (real admin wire shape)', async () => {
    // AdminFolderTemplateController.list() returns ApiResponse<List<FolderTemplateResponse>>:
    // the envelope data IS the array — NOT the {count, folderTemplates} non-admin view.
    suiteClient.get.mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 'ft-1', displayName: '01 Application' }],
      },
    });

    const result = await adminService.listFolderTemplates();

    expect(suiteClient.get).toHaveBeenCalledWith('/admin/folder-templates');
    expect(result).toEqual([{ id: 'ft-1', displayName: '01 Application' }]);
  });

  test('listFolderTemplates tolerates the {count, folderTemplates} object view (future-proofing)', async () => {
    suiteClient.get.mockResolvedValue({
      data: {
        success: true,
        data: { count: 1, folderTemplates: [{ id: 'ft-1', displayName: '01 Application' }] },
      },
    });
    expect(await adminService.listFolderTemplates()).toEqual([
      { id: 'ft-1', displayName: '01 Application' },
    ]);
  });

  test('listFolderTemplates returns [] when the payload is neither array nor object view', async () => {
    suiteClient.get.mockResolvedValue({ data: { success: true, data: { count: 0 } } });
    expect(await adminService.listFolderTemplates()).toEqual([]);
  });

  test('getFolderTemplate hits suiteClient by id and unwraps the envelope', async () => {
    const dto = { id: 'ft-1', displayName: '01 Application' };
    suiteClient.get.mockResolvedValue({ data: { success: true, data: dto } });

    const result = await adminService.getFolderTemplate('ft-1');

    expect(suiteClient.get).toHaveBeenCalledWith('/admin/folder-templates/ft-1');
    expect(result).toEqual(dto);
  });

  test('createFolderTemplate POSTs to suiteClient mapping isOldLoanArchive/isDeleteFolder/isActive → oldLoanArchive/deleteFolder/active', async () => {
    const created = { id: 'ft-2', displayName: '18 Audit' };
    suiteClient.post.mockResolvedValue({ data: { success: true, data: created } });

    const result = await adminService.createFolderTemplate({
      displayName: '18 Audit',
      sortKey: '18',
      isOldLoanArchive: false,
      isDeleteFolder: false,
      isActive: true,
      sortOrder: 18,
      evalPrompt: 'Check totals.',
    });

    expect(suiteClient.post).toHaveBeenCalledWith('/admin/folder-templates', {
      displayName: '18 Audit',
      sortKey: '18',
      oldLoanArchive: false,
      deleteFolder: false,
      active: true,
      sortOrder: 18,
      evalPrompt: 'Check totals.',
    });
    const sentPayload = suiteClient.post.mock.calls[0][1];
    expect(sentPayload).not.toHaveProperty('isOldLoanArchive');
    expect(sentPayload).not.toHaveProperty('isDeleteFolder');
    expect(sentPayload).not.toHaveProperty('isActive');
    expect(result).toEqual(created);
  });

  test('updateFolderTemplate PUTs to suiteClient with mapped boolean fields', async () => {
    const updated = { id: 'ft-1', displayName: '01 Application Updated' };
    suiteClient.put.mockResolvedValue({ data: { success: true, data: updated } });

    const result = await adminService.updateFolderTemplate('ft-1', {
      displayName: '01 Application Updated',
      sortKey: '01',
      isOldLoanArchive: true,
      isDeleteFolder: false,
      isActive: true,
      sortOrder: 1,
      evalPrompt: null,
    });

    expect(suiteClient.put).toHaveBeenCalledWith('/admin/folder-templates/ft-1', {
      displayName: '01 Application Updated',
      sortKey: '01',
      oldLoanArchive: true,
      deleteFolder: false,
      active: true,
      sortOrder: 1,
      evalPrompt: null,
    });
    expect(result).toEqual(updated);
  });

  test('deactivateFolderTemplate DELETEs via suiteClient (204 No Content — empty body)', async () => {
    suiteClient.delete.mockResolvedValue({ status: 204, data: '' });

    await adminService.deactivateFolderTemplate('ft-1');

    expect(suiteClient.delete).toHaveBeenCalledWith('/admin/folder-templates/ft-1');
  });
});

// ── Regression: users + app-settings stay on the legacy apiClient ────────────

describe('adminService users + app-settings (legacy, unchanged)', () => {
  test('createUser still calls legacy apiClient', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true, data: { id: 'u-1' } } });
    await adminService.createUser({ email: 'a@b.com' });
    expect(apiClient.post).toHaveBeenCalledWith('/admin/users', { email: 'a@b.com' });
    expect(suiteClient.post).not.toHaveBeenCalled();
  });

  test('resetUserPassword still calls legacy apiClient', async () => {
    apiClient.post.mockResolvedValue({ data: {} });
    await adminService.resetUserPassword('u-1');
    expect(apiClient.post).toHaveBeenCalledWith('/admin/users/u-1/reset-password');
    expect(suiteClient.post).not.toHaveBeenCalled();
  });

  test('getAppSettings still calls legacy apiClient', async () => {
    apiClient.get.mockResolvedValue({ data: { some: 'setting' } });
    const result = await adminService.getAppSettings();
    expect(apiClient.get).toHaveBeenCalledWith('/admin/app-settings');
    expect(result).toEqual({ some: 'setting' });
    expect(suiteClient.get).not.toHaveBeenCalled();
  });

  test('updateAppSettings still calls legacy apiClient', async () => {
    apiClient.put.mockResolvedValue({ data: { some: 'setting' } });
    const result = await adminService.updateAppSettings({ some: 'setting' });
    expect(apiClient.put).toHaveBeenCalledWith('/admin/app-settings', { some: 'setting' });
    expect(result).toEqual({ some: 'setting' });
    expect(suiteClient.put).not.toHaveBeenCalled();
  });
});
