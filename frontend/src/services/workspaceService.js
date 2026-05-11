/**
 * Folder CRUD for the document workspace. Mirrors the FolderController endpoints.
 *
 * The backend returns a flat folder list with parentId pointers; the tree is rebuilt
 * on the client. Auto-seeds the root + default folders on first GET, so the very first
 * call to getFolderTree for a loan returns the seeded layout.
 */
import apiClient from './apiClient';

const workspaceService = {
  /** Returns { rootId, count, folders: [...] }. Auto-seeds defaults on first call. */
  getFolderTree: async (loanId) => {
    const { data } = await apiClient.get(`/loan-applications/${loanId}/folders`);
    return data;
  },

  /** Idempotent re-seed; creates anything missing from the canonical default folder set. */
  seedDefaults: async (loanId) => {
    const { data } = await apiClient.post(`/loan-applications/${loanId}/folders/seed-defaults`);
    return data;
  },

  /** Create a user folder under a parent. Returns the new folder. */
  createFolder: async (loanId, { parentId, displayName }) => {
    const { data } = await apiClient.post(`/loan-applications/${loanId}/folders`, {
      parentId, displayName,
    });
    return data;
  },

  /** Rename. Returns the updated folder. */
  renameFolder: async (loanId, folderId, displayName) => {
    const { data } = await apiClient.patch(
      `/loan-applications/${loanId}/folders/${folderId}`,
      { displayName },
    );
    return data;
  },

  /**
   * Documents for a folder view.
   *   { atRoot: true }     — docs at the loan's root folder OR unfiled (legacy null)
   *   { folderId: N }      — only that folder
   *   { unfiled: true }    — only docs with folder_id IS NULL
   */
  getDocumentsInFolder: async (loanId, { folderId, unfiled, atRoot }) => {
    const params = {};
    if (atRoot) params.atRoot = 'true';
    else if (unfiled) params.unfiled = 'true';
    else if (folderId != null) params.folderId = folderId;
    const { data } = await apiClient.get(`/loan-applications/${loanId}/documents`, { params });
    return Array.isArray(data) ? data : (data.documents || []);
  },

  /**
   * Bulk move. Returns { requested, moved, toFolderId }. {@code toFolderId === null}
   * unfiles the documents (sets folder_id to NULL). The backend rejects the whole
   * batch if any docUuid belongs to a different loan.
   */
  moveDocuments: async (loanId, docUuids, toFolderId) => {
    const { data } = await apiClient.post(`/loan-applications/${loanId}/documents/move`, {
      docUuids,
      toFolderId,
    });
    return data;
  },

  /** Rename a single document (changes the user-visible fileName; S3 key stays immutable). */
  renameDocument: async (loanId, docUuid, fileName) => {
    const { data } = await apiClient.patch(
      `/loan-applications/${loanId}/documents/${docUuid}`,
      { fileName },
    );
    return data;
  },

  /**
   * Patch any subset of document fields. Backend accepts fileName, folderId,
   * documentType. folderId=null on the wire = "no change" (use moveDocuments to
   * unfile); only set keys you actually want changed.
   */
  patchDocument: async (loanId, docUuid, patch) => {
    const { data } = await apiClient.patch(
      `/loan-applications/${loanId}/documents/${docUuid}`,
      patch,
    );
    return data;
  },

  /** Soft-delete a user-created folder. System (default) folders are rejected by the backend. */
  deleteFolder: async (loanId, folderId) => {
    await apiClient.delete(`/loan-applications/${loanId}/folders/${folderId}`);
  },

  /**
   * Hard-delete a document. Only works when the document is currently in the loan's
   * Delete folder — backend rejects the call otherwise. Removes the S3 object and
   * the database row. Irreversible.
   */
  permanentlyDeleteDocument: async (loanId, docUuid) => {
    await apiClient.delete(`/loan-applications/${loanId}/documents/${docUuid}/permanent`);
  },

  /** Returns every uploaded document on the loan, regardless of folder. */
  getAllDocuments: async (loanId) => {
    const { data } = await apiClient.get(`/loan-applications/${loanId}/documents`);
    return Array.isArray(data) ? data : (data.documents || []);
  },
};

/** Reconstructs a tree (root → [children]) from a flat list with parentId. */
export function buildFolderTree(folders, rootId) {
  const byId = new Map(folders.map((f) => [f.id, { ...f, children: [] }]));
  let root = null;
  for (const f of byId.values()) {
    if (f.id === rootId || f.parentId == null) {
      root = f;
    } else {
      const parent = byId.get(f.parentId);
      if (parent) parent.children.push(f);
    }
  }
  // Sort children by sortKey (NULLs last), then displayName.
  const sortChildren = (node) => {
    node.children.sort((a, b) => {
      const ak = a.sortKey ?? '~';
      const bk = b.sortKey ?? '~';
      if (ak !== bk) return ak.localeCompare(bk);
      return a.displayName.localeCompare(b.displayName);
    });
    node.children.forEach(sortChildren);
  };
  if (root) sortChildren(root);
  return root;
}

/** Walk root → folderId, returning the array of nodes (inclusive). [] if not found. */
export function pathTo(root, folderId) {
  if (!root) return [];
  if (root.id === folderId) return [root];
  for (const child of root.children || []) {
    const sub = pathTo(child, folderId);
    if (sub.length) return [root, ...sub];
  }
  return [];
}

export default workspaceService;
