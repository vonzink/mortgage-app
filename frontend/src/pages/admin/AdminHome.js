import React from 'react';
import { Link } from 'react-router-dom';
import useRoles from '../../hooks/useRoles';

export default function AdminHome() {
  const { isAdmin } = useRoles();

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
        <h2>Admin</h2>
        <p style={{ color: '#b91c1c' }}>You need the Admin role to access this area.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h2>Admin</h2>
      <p style={{ color: 'var(--text-secondary, #666)' }}>
        Manage system configuration for document workflows.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        <AdminCard
          title="Document Types"
          description="Manage the structured document type list, MIME rules, and default folder routing."
          to="/admin/document-types"
        />
        <AdminCard
          title="Folder Templates"
          description="Edit the default subfolder set seeded into every loan workspace."
          to="/admin/folder-templates"
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
        border: '1px solid var(--border-color, #e5e7eb)',
        borderRadius: 8,
        background: 'var(--bg-card, white)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#2563eb';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color, #e5e7eb)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>{description}</p>
    </Link>
  );
}
