import React from 'react';
import { Link } from 'react-router-dom';
import useRoles from '../../hooks/useRoles';
import { mutedText, dangerText } from './adminStyles';
import './adminStyles.css';

export default function AdminHome() {
  const { isAdmin } = useRoles();

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
        <h2>Admin</h2>
        <p style={dangerText}>You need the Admin role to access this area.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h2>Admin</h2>
      <p style={mutedText}>
        Manage system configuration for document workflows.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        <AdminCard
          title="App Settings"
          description="AI evaluation toggle, default provider, and model."
          to="/admin/settings"
        />
      </div>
    </div>
  );
}

function AdminCard({ title, description, to }) {
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        padding: '1.25rem',
        border: '1px solid var(--border-color, #e2e6dd)',
        borderRadius: 8,
        background: 'var(--bg-card, white)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      className="admin-card"
    >
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '0.875rem', ...mutedText }}>{description}</p>
    </Link>
  );
}
