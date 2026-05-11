import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import useRoles from '../../hooks/useRoles';

const EMPTY_FORM = {
  name: '',
  slug: '',
  defaultFolderName: '',
  requiredForMilestones: '',
  allowedMimeTypes: '',
  maxFileSizeBytes: '',
  borrowerVisibleDefault: true,
  isActive: true,
  sortOrder: 0,
};

export default function DocumentTypesAdmin() {
  const { isAdmin } = useRoles();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = creating, {...} = editing
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
  }, [isAdmin]);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await adminService.listDocumentTypes();
      setItems(list);
    } catch (e) {
      toast.error(`Failed to load document types: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing({}); setForm(EMPTY_FORM); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      slug: row.slug || '',
      defaultFolderName: row.defaultFolderName || '',
      requiredForMilestones: row.requiredForMilestones || '',
      allowedMimeTypes: row.allowedMimeTypes || '',
      maxFileSizeBytes: row.maxFileSizeBytes ?? '',
      borrowerVisibleDefault: row.borrowerVisibleDefault !== false,
      isActive: row.isActive !== false,
      sortOrder: row.sortOrder ?? 0,
    });
  };
  const closeModal = () => { setEditing(null); setForm(EMPTY_FORM); };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.warn('Name and slug are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        maxFileSizeBytes: form.maxFileSizeBytes === '' ? null : Number(form.maxFileSizeBytes),
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing && editing.id) {
        await adminService.updateDocumentType(editing.id, payload);
        toast.success('Document type updated');
      } else {
        await adminService.createDocumentType(payload);
        toast.success('Document type created');
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
    if (!window.confirm(`Deactivate "${row.name}"? It will no longer appear in upload forms.`)) return;
    try {
      await adminService.deactivateDocumentType(row.id);
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
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to="/admin" style={{ color: 'var(--text-secondary, #666)' }}>← Admin</Link>
        <h2 style={{ margin: 0 }}>Document Types</h2>
        <button onClick={openCreate} style={primaryBtn}>+ New type</button>
      </div>

      {loading ? <p>Loading…</p> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Order</th>
              <th style={th}>Name</th>
              <th style={th}>Slug</th>
              <th style={th}>Default folder</th>
              <th style={th}>Max size</th>
              <th style={th}>Borrower visible</th>
              <th style={th}>Active</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id} style={{ opacity: row.isActive ? 1 : 0.5 }}>
                <td style={td}>{row.sortOrder}</td>
                <td style={td}>{row.name}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.slug}</td>
                <td style={td}>{row.defaultFolderName || '—'}</td>
                <td style={td}>{row.maxFileSizeBytes ? `${(row.maxFileSizeBytes / 1024 / 1024).toFixed(1)} MB` : '—'}</td>
                <td style={td}>{row.borrowerVisibleDefault ? 'Yes' : 'No'}</td>
                <td style={td}>{row.isActive ? 'Active' : 'Inactive'}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button onClick={() => openEdit(row)} style={linkBtn}>Edit</button>
                  {row.isActive && <button onClick={() => deactivate(row)} style={dangerLinkBtn}>Deactivate</button>}
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#999' }}>No document types yet.</td></tr>}
          </tbody>
        </table>
      )}

      {editing && (
        <Modal onClose={closeModal} title={editing.id ? 'Edit document type' : 'New document type'}>
          <Field label="Name *">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input} />
          </Field>
          <Field label="Slug * (URL-safe identifier)">
            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} style={input} />
          </Field>
          <Field label="Default folder name (auto-routes uploads)">
            <input value={form.defaultFolderName} onChange={e => setForm({ ...form, defaultFolderName: e.target.value })} placeholder="e.g. 03 Income" style={input} />
          </Field>
          <Field label="Allowed MIME types (comma-separated)">
            <input value={form.allowedMimeTypes} onChange={e => setForm({ ...form, allowedMimeTypes: e.target.value })} placeholder="application/pdf,image/jpeg" style={input} />
          </Field>
          <Field label="Required for milestones (comma-separated, optional)">
            <input value={form.requiredForMilestones} onChange={e => setForm({ ...form, requiredForMilestones: e.target.value })} style={input} />
          </Field>
          <Field label="Max file size (bytes)">
            <input type="number" value={form.maxFileSizeBytes} onChange={e => setForm({ ...form, maxFileSizeBytes: e.target.value })} style={input} />
          </Field>
          <Field label="Sort order">
            <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} style={input} />
          </Field>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <label><input type="checkbox" checked={form.borrowerVisibleDefault} onChange={e => setForm({ ...form, borrowerVisibleDefault: e.target.checked })} /> Borrower-visible by default</label>
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

// ── Shared styles + small components (kept inline to avoid new CSS files) ────

const tableStyle = { width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card, white)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const th = { padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid var(--border-color, #e5e7eb)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary, #666)' };
const td = { padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color, #f1f5f9)', fontSize: '0.9rem' };
const primaryBtn = { padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', marginLeft: 'auto' };
const secondaryBtn = { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color, #d1d5db)', borderRadius: 6, cursor: 'pointer' };
const linkBtn = { background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: '0.5rem' };
const dangerLinkBtn = { background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer' };
const input = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-color, #d1d5db)', borderRadius: 6, fontSize: '0.9rem' };

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
