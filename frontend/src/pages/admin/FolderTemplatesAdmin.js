import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import useRoles from '../../hooks/useRoles';

const EMPTY_FORM = {
  displayName: '',
  sortKey: '',
  isOldLoanArchive: false,
  isDeleteFolder: false,
  isActive: true,
  sortOrder: 0,
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
      const payload = { ...form, sortOrder: Number(form.sortOrder) || 0 };
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
    return <div style={{ padding: '2rem' }}><p style={{ color: '#b91c1c' }}>Admin access required.</p></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <Link to="/admin" style={{ color: 'var(--text-secondary, #666)' }}>← Admin</Link>
        <h2 style={{ margin: 0 }}>Folder Templates</h2>
        <button onClick={openCreate} style={primaryBtn}>+ New template</button>
      </div>
      <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.875rem', marginTop: 0 }}>
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
                <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.sortKey || '—'}</td>
                <td style={td}>
                  {row.isDeleteFolder && <span style={badge('#fee2e2', '#b91c1c')}>Delete</span>}
                  {row.isOldLoanArchive && <span style={badge('#fef3c7', '#92400e')}>Archive</span>}
                  {!row.isDeleteFolder && !row.isOldLoanArchive && <span style={{ color: '#999' }}>Standard</span>}
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
            {!items.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#999' }}>No folder templates yet.</td></tr>}
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button onClick={closeModal} style={secondaryBtn} disabled={saving}>Cancel</button>
            <button onClick={save} style={primaryBtn} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card, white)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const th = { padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid var(--border-color, #e5e7eb)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary, #666)' };
const td = { padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color, #f1f5f9)', fontSize: '0.9rem' };
const primaryBtn = { padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', marginLeft: 'auto' };
const secondaryBtn = { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color, #d1d5db)', borderRadius: 6, cursor: 'pointer' };
const linkBtn = { background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: '0.5rem' };
const dangerLinkBtn = { background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer' };
const input = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-color, #d1d5db)', borderRadius: 6, fontSize: '0.9rem' };

function badge(bg, fg) {
  return { display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 4, background: bg, color: fg, fontSize: '0.75rem', fontWeight: 600 };
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text-secondary, #555)' }}>{label}</label>
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
