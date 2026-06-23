import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import useRoles from '../../hooks/useRoles';
import { primaryBtn, secondaryBtn, linkBtn, input, mutedText, dangerText, fieldLabel } from './adminStyles';

// Roles an LO may assign vs. the full set an ADMIN may assign. Mirrors the suite-side guard in
// UserAdminService (the server is authoritative; this is a UI affordance only).
const LO_ROLES = ['BORROWER', 'REAL_ESTATE_AGENT'];
const ADMIN_ROLES = ['BORROWER', 'REAL_ESTATE_AGENT', 'LO', 'PROCESSOR', 'UNDERWRITER', 'CLOSER', 'MANAGER', 'ADMIN'];
const ROLE_LABEL = {
  BORROWER: 'Borrower', REAL_ESTATE_AGENT: 'Real-estate agent', LO: 'Loan officer',
  PROCESSOR: 'Processor', UNDERWRITER: 'Underwriter', CLOSER: 'Closer', MANAGER: 'Manager', ADMIN: 'Admin',
};

const EMPTY = { email: '', name: '', role: 'BORROWER' };

export default function UsersAdmin() {
  const { isAdmin, isLO } = useRoles();
  const canAccess = isAdmin || isLO;
  const roles = isAdmin ? ADMIN_ROLES : LO_ROLES;

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [resetting, setResetting] = useState(false);

  if (!canAccess) {
    return (
      <div style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
        <h2>Users</h2>
        <p style={dangerText}>You need the Loan Officer or Admin role to manage users.</p>
      </div>
    );
  }

  const create = async () => {
    if (!form.email.trim()) { toast.warn('Email is required'); return; }
    setSaving(true);
    try {
      const user = await adminService.createUser({
        email: form.email.trim(), name: form.name.trim(), role: form.role,
      });
      setCreated(user);
      setForm(EMPTY);
      toast.success(`Created ${user.email}`);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    if (!created?.id) return;
    setResetting(true);
    try {
      await adminService.resetUserPassword(created.id);
      toast.success('Password reset sent');
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to="/admin" style={mutedText}>← Admin</Link>
        <h2 style={{ margin: 0 }}>Users</h2>
      </div>
      <p style={mutedText}>
        Invite a new user — they receive an email to set their own password. Loan officers can add
        borrowers and agents; admins can add staff.
      </p>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={fieldLabel}>Email *</label>
          <input type="email" value={form.email} placeholder="person@example.com"
                 onChange={e => setForm({ ...form, email: e.target.value })} style={input} />
        </div>
        <div>
          <label style={fieldLabel}>Name</label>
          <input value={form.name} placeholder="Full name"
                 onChange={e => setForm({ ...form, name: e.target.value })} style={input} />
        </div>
        <div>
          <label style={fieldLabel}>Role</label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={input}>
            {roles.map(r => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button onClick={create} style={primaryBtn} disabled={saving}>
            {saving ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </div>

      {created && (
        <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', border: '1px solid var(--border-primary, #e2e6dd)', borderRadius: 12, background: 'var(--bg-card, #fff)' }}>
          <div style={{ fontWeight: 600 }}>{created.name || created.email}</div>
          <div style={mutedText}>{created.email} · {ROLE_LABEL[created.role] || created.role}</div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button onClick={sendReset} style={secondaryBtn} disabled={resetting}>
              {resetting ? 'Sending…' : 'Send password reset'}
            </button>
            <button onClick={() => setCreated(null)} style={linkBtn}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
