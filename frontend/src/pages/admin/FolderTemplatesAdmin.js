import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import useRoles from '../../hooks/useRoles';
import {
  tableStyle, th, td, monoCell, primaryBtn, secondaryBtn, linkBtn, dangerLinkBtn,
  input, monoTextarea, badge, mutedText, dangerText, helpText, fieldLabel,
} from './adminStyles';

const EMPTY_FORM = {
  displayName: '',
  sortKey: '',
  isOldLoanArchive: false,
  isDeleteFolder: false,
  isActive: true,
  sortOrder: 0,
  evalPrompt: '',
};

export default function FolderTemplatesAdmin() {
  const { isAdmin } = useRoles();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
  }, [isAdmin]);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await adminService.listFolderTemplates();
      setItems(list);
    } catch (e) {
      toast.error(`Failed to load folder templates: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing({});
    // Suggest next sort order so the user doesn't have to think about it
    const nextOrder = items.length ? Math.max(...items.map(i => i.sortOrder || 0)) + 1 : 1;
    setForm({ ...EMPTY_FORM, sortOrder: nextOrder });
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      displayName: row.displayName || '',
      sortKey: row.sortKey || '',
      isOldLoanArchive: !!row.isOldLoanArchive,
      isDeleteFolder: !!row.isDeleteFolder,
      isActive: row.isActive !== false,
      sortOrder: row.sortOrder ?? 0,
      evalPrompt: row.evalPrompt || '',
    });
  };
  const closeModal = () => { setEditing(null); setForm(EMPTY_FORM); };

  const save = async () => {
    if (!form.displayName.trim()) {
      toast.warn('Display name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder) || 0,
        evalPrompt: form.evalPrompt?.trim() ? form.evalPrompt : null,
      };
      if (editing && editing.id) {
        await adminService.updateFolderTemplate(editing.id, payload);
        toast.success('Folder template updated');
      } else {
        await adminService.createFolderTemplate(payload);
        toast.success('Folder template created');
      }
      closeModal();
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (row) => {
    if (row.isDeleteFolder) {
      toast.warn('The Delete folder is required and cannot be deactivated');
      return;
    }
    if (!window.confirm(`Deactivate "${row.displayName}"? New loans will skip this folder.`)) return;
    try {
      await adminService.deactivateFolderTemplate(row.id);
      toast.success('Deactivated');
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  if (!isAdmin) {
    return <div style={{ padding: '2rem' }}><p style={dangerText}>Admin access required.</p></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <Link to="/admin" style={mutedText}>← Admin</Link>
        <h2 style={{ margin: 0 }}>Folder Templates</h2>
        <button onClick={openCreate} style={primaryBtn}>+ New template</button>
      </div>
      <p style={{ ...mutedText, fontSize: '0.875rem', marginTop: 0 }}>
        These folders are seeded into every loan workspace on first access. Changes apply to new loans and gap-fill existing ones.
      </p>

      {loading ? <p>Loading…</p> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Order</th>
              <th style={th}>Display name</th>
              <th style={th}>Sort key</th>
              <th style={th}>Role</th>
              <th style={th}>Active</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id} style={{ opacity: row.isActive ? 1 : 0.5 }}>
                <td style={td}>{row.sortOrder}</td>
                <td style={td}>{row.displayName}</td>
                <td style={monoCell}>{row.sortKey || '—'}</td>
                <td style={td}>
                  {row.isDeleteFolder && <span style={badge('rose')}>Delete</span>}
                  {row.isOldLoanArchive && <span style={badge('amber')}>Archive</span>}
                  {!row.isDeleteFolder && !row.isOldLoanArchive && <span style={mutedText}>—</span>}
                </td>
                <td style={td}>{row.isActive ? 'Active' : 'Inactive'}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button onClick={() => openEdit(row)} style={linkBtn}>Edit</button>
                  {row.isActive && !row.isDeleteFolder && (
                    <button onClick={() => deactivate(row)} style={dangerLinkBtn}>Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', ...mutedText }}>No folder templates yet.</td></tr>}
          </tbody>
        </table>
      )}

      {editing && (
        <Modal onClose={closeModal} title={editing.id ? 'Edit folder template' : 'New folder template'}>
          <Field label="Display name *">
            <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="e.g. 18 Audit" style={input} />
          </Field>
          <Field label="Sort key (optional — e.g. '18')">
            <input value={form.sortKey} onChange={e => setForm({ ...form, sortKey: e.target.value })} style={input} />
          </Field>
          <Field label="Sort order">
            <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} style={input} />
          </Field>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
            <label><input type="checkbox" checked={form.isOldLoanArchive} onChange={e => setForm({ ...form, isOldLoanArchive: e.target.checked })} /> Old loan archive (singleton)</label>
            <label><input type="checkbox" checked={form.isDeleteFolder} onChange={e => setForm({ ...form, isDeleteFolder: e.target.checked })} /> Delete folder (singleton)</label>
            <label><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          </div>
          <Field label="AI evaluation prompt (markdown, optional)">
            <textarea
              value={form.evalPrompt}
              onChange={e => setForm({ ...form, evalPrompt: e.target.value })}
              placeholder="e.g. Check that all income docs are present and totals match the borrower's stated income."
              rows={8}
              style={monoTextarea}
            />
            <p style={{ fontSize: 12, ...helpText, margin: '4px 0 0' }}>
              Leave empty to hide the Evaluate button on this folder.
            </p>
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button onClick={closeModal} style={secondaryBtn} disabled={saving}>Cancel</button>
            <button onClick={save} style={primaryBtn} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 8, padding: '1.5rem', maxWidth: 560, width: '90%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem 0' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
