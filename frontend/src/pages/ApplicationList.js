import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import mortgageService from '../services/mortgageService';
import Icon from '../components/design/Icon';
import Pill from '../components/design/Pill';
import Button from '../components/design/Button';
import Card from '../components/design/Card';
import Avatar from '../components/design/Avatar';
import './ApplicationList.design.css';

/* ─── Status → pill tone mapping ──────────────────────────────────────────
 * Backend `status` strings are loose (Draft / In Review / Approved / Rejected
 * / Funded / etc.). Bucket each one into a design-system tone + display label.
 */
const STATUS_BUCKETS = [
  { test: (s) => /draft/i.test(s),                                 tone: 'draft',  label: 'Draft' },
  { test: (s) => /review|processing|underwriting|condition/i.test(s), tone: 'review', label: 'In review' },
  { test: (s) => /clear to close|approved/i.test(s),               tone: 'active', label: 'Clear to close' },
  { test: (s) => /fund/i.test(s),                                  tone: 'active', label: 'Funded' },
  { test: (s) => /reject|denied/i.test(s),                         tone: 'danger', label: 'Rejected' },
];
function bucketize(status) {
  const s = status || 'Draft';
  const hit = STATUS_BUCKETS.find((b) => b.test(s));
  return hit ? { ...hit, raw: s } : { tone: 'muted', label: s, raw: s };
}

/** Map a status → 0-indexed stage on the 7-step bar (Application → Funded). */
const STAGE_NAMES = ['Application', 'Document review', 'Processing', 'Underwriting', 'Conditional', 'Clear to close', 'Funded'];
function stageFor(status) {
  const s = (status || '').toLowerCase();
  if (/fund/.test(s)) return 6;
  if (/clear to close/.test(s)) return 5;
  if (/condition/.test(s)) return 4;
  if (/underwriting/.test(s)) return 3;
  if (/process/.test(s)) return 2;
  if (/review|document/.test(s)) return 1;
  return 0; // default = Application
}

const StageBar = ({ stage }) => (
  <div className="stage-bar">
    {STAGE_NAMES.map((s, i) => {
      const done = i < stage;
      const current = i === stage;
      const bg = done
        ? 'var(--forest-700)'
        : current
          ? 'linear-gradient(90deg, var(--forest-700) 60%, var(--ink-line) 60%)'
          : 'var(--ink-line-soft)';
      const labelClass = done || current ? '' : 'dim';
      return (
        <div key={s} className="stage-cell">
          <div className="stage-bar-track" style={{ background: bg }} />
          <div className={`stage-label ${labelClass}`} style={{ fontWeight: current ? 600 : 500 }}>{s}</div>
        </div>
      );
    })}
  </div>
);

function fmtCurrency(n) {
  if (n == null) return '—';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n); }
  catch { return String(n); }
}
function fmtCurrencyCompact(n) {
  if (!n || n < 1) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return fmtCurrency(n);
}
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }); }
  catch { return String(d); }
}
function initialsFor(app) {
  const b = app.borrowers?.[0];
  if (!b) return 'AP';
  return ((b.firstName?.[0] || '') + (b.lastName?.[0] || '')).toUpperCase() || 'AP';
}
function borrowerName(app) {
  const b = app.borrowers?.[0];
  if (!b) return `Application ${app.applicationNumber || `#${app.id}`}`;
  return [b.firstName, b.lastName].filter(Boolean).join(' ') || `Application ${app.applicationNumber || `#${app.id}`}`;
}

/* ─── Filter pills (segmented) ──────────────────────────────────────────── */
const FILTERS = [
  { value: 'all',        label: 'All' },
  { value: 'draft',      label: 'Draft' },
  { value: 'review',     label: 'In review' },
  { value: 'active',     label: 'Clear to close' },
  { value: 'funded',     label: 'Funded' },
];
function matchesFilter(app, filter) {
  if (filter === 'all') return true;
  const b = bucketize(app.status);
  if (filter === 'funded') return /fund/i.test(b.raw);
  if (filter === 'active') return b.tone === 'active' && !/fund/i.test(b.raw);
  return b.tone === filter;
}

/* ─── KPI strip ─────────────────────────────────────────────────────────── */
function computeKpis(apps) {
  const active = apps.filter((a) => !/reject|denied|fund/i.test(a.status || ''));
  const totalPipeline = active.reduce((sum, a) => sum + (Number(a.loanAmount) || 0), 0);
  const ratedApps = apps.filter((a) => a.interestRate);
  const avgRate = ratedApps.length
    ? ratedApps.reduce((s, a) => s + Number(a.interestRate || 0), 0) / ratedApps.length
    : null;
  const needsAction = apps.filter((a) => /needs|action|condition/i.test(a.status || '')).length;
  return [
    { label: 'Total in pipeline', value: fmtCurrencyCompact(totalPipeline), sub: `across ${active.length} application${active.length === 1 ? '' : 's'}`, color: 'var(--forest-800)' },
    { label: 'Avg. rate', value: avgRate != null ? `${avgRate.toFixed(2)}%` : '—', sub: 'across rate-locked apps', color: 'var(--moss)' },
    { label: 'Applications', value: String(apps.length), sub: `${active.length} active`, color: 'var(--azure)' },
    { label: 'Action needed', value: String(needsAction), sub: needsAction === 0 ? 'all caught up' : 'items waiting on you', color: needsAction > 0 ? 'var(--copper)' : 'var(--ink-500)' },
  ];
}

/* ─── Application card ─────────────────────────────────────────────────── */
function AppCard({ app, isLatest, onMismo, onCopy, onDelete }) {
  const bucket = bucketize(app.status);
  const stage = stageFor(app.status);
  const initials = initialsFor(app);
  const name = borrowerName(app);
  const addrLine1 = app.property?.addressLine || '';
  const city = [app.property?.city, app.property?.state].filter(Boolean).join(', ');

  return (
    <div className="card app-card">
      <div className="app-card-head">
        <div className="app-card-id">
          <Avatar initials={initials} size={56} variant="brand" />
          <div>
            <div className="app-card-title-row">
              <div className="app-card-name">{name}</div>
              <Pill tone={bucket.tone} dot>{bucket.label}</Pill>
              <span className="dim mono app-card-id-num">#{app.applicationNumber || app.id}</span>
            </div>
            <div className="muted app-card-addr">
              {addrLine1 || <span className="dim">No address yet</span>}
              {addrLine1 && city && <> · <span className="dim">{city}</span></>}
            </div>
          </div>
        </div>
        <div className="app-card-actions">
          <Button size="sm" to={`/applications/${app.id}`} title="Open document workspace">
            <Icon name="folder" size={12} /> Documents
          </Button>
          <Button size="sm" to={`/loan/${app.id}`} title="LO dashboard">
            <Icon name="chart" size={12} /> Dashboard
          </Button>
          <Button size="sm" variant="primary" to={`/apply?edit=${app.id}`} title="Edit this application">
            <Icon name="edit" size={12} /> Edit
          </Button>
        </div>
      </div>

      <div className="app-card-stage">
        <StageBar stage={stage} />
      </div>

      <div className="app-card-footer">
        {[
          ['Loan amount',  fmtCurrency(app.loanAmount), true],
          ['Property value', fmtCurrency(app.propertyValue), true],
          ['Rate', app.interestRate ? `${Number(app.interestRate).toFixed(3)}%` : '—', true],
          ['Type', app.loanType ? `${app.loanType}${app.loanTerm ? ` · ${app.loanTerm}` : ''}` : '—', false],
          ['Applied', fmtDate(app.createdDate), false],
          ['Est. close', fmtDate(app.estimatedClosingDate), false],
        ].map(([k, v, mono], i) => (
          <div key={k} className="app-card-stat" style={{ borderRight: i < 5 ? '1px solid var(--ink-line-soft)' : 0 }}>
            <div className="eyebrow app-card-stat-label">{k}</div>
            <div className={mono ? 'mono' : ''} style={{ fontSize: 13.5, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="app-card-overflow">
        <Button size="sm" variant="ghost" onClick={() => onMismo(app.id)} title="Download a MISMO 3.4 XML of this application">
          <Icon name="download" size={12} /> MISMO
        </Button>
        {isLatest && (
          <Button size="sm" variant="ghost" onClick={() => onCopy(app.id)} title="Start a new application with Assets / Liabilities / REO from this one">
            <Icon name="doc" size={12} /> Copy to new
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={() => onDelete(app.id, app.applicationNumber)} className="app-card-delete" title="Delete this application permanently">
          <Icon name="trash" size={12} /> Delete
        </Button>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function ApplicationList() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importingMismo, setImportingMismo] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const mismoInputRef = useRef(null);

  useEffect(() => { fetchApplications(); }, []);
  const fetchApplications = async () => {
    try {
      const data = await mortgageService.getApplications();
      setApplications(data);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStartFromMismo = () => mismoInputRef.current?.click();
  const handleMismoFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setImportingMismo(true);
      const result = await mortgageService.createFromMismo(file);
      toast.success(`New application ${result.applicationNumber || ''} created from MISMO. ${result.changeCount} field${result.changeCount === 1 ? '' : 's'} populated.`);
      navigate(`/apply?edit=${result.id}`);
    } catch (err) {
      toast.error(`MISMO import failed: ${err.message || err}`);
    } finally {
      setImportingMismo(false);
    }
  };

  const handleDownloadMismo = async (id) => {
    try {
      const filename = await mortgageService.exportMismo(id);
      toast.success(`Downloaded ${filename}`);
    } catch (e) {
      toast.error(`MISMO export failed: ${e.message || e}`);
    }
  };

  const handleCopyToNewApplication = async (applicationId) => {
    try {
      // Server-side clone — produces a real new row in the apps list with the
      // full data tree carried forward. SSNs and unique identifiers are reset
      // server-side so the LO doesn't accidentally duplicate PII.
      const result = await mortgageService.cloneApplication(applicationId);
      toast.success(`New application ${result.applicationNumber || ''} created from copy`);
      // Refresh the list so the new card appears immediately, then jump into
      // the form for the LO to fill in the SSNs / borrower-specific bits.
      await fetchApplications();
      navigate(`/apply?edit=${result.id}`);
    } catch (err) {
      toast.error(`Copy failed: ${err.response?.data?.message || err.message || err}`);
    }
  };

  const handleDeleteApplication = async (applicationId, applicationNumber) => {
    const ok = window.confirm(
      `Delete application ${applicationNumber || `#${applicationId}`}?\n\n` +
      `This permanently removes the application and all of its borrowers, employment, ` +
      `income, residences, assets, REOs, liabilities, and document records.\n\n` +
      `This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await mortgageService.deleteApplication(applicationId);
      toast.success(`Deleted ${applicationNumber || `application #${applicationId}`}`);
      fetchApplications();
    } catch (e) {
      toast.error(`Delete failed: ${e.message || e}`);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications
      .filter((a) => matchesFilter(a, filter))
      .filter((a) => {
        if (!q) return true;
        const name = borrowerName(a).toLowerCase();
        const addr = (a.property?.addressLine || '').toLowerCase();
        const num = String(a.applicationNumber || a.id).toLowerCase();
        return name.includes(q) || addr.includes(q) || num.includes(q);
      })
      .sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
  }, [applications, search, filter]);

  const kpis = useMemo(() => computeKpis(applications), [applications]);
  const latestId = useMemo(() => {
    if (!applications.length) return null;
    const latest = [...applications].sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0))[0];
    return latest?.id;
  }, [applications]);

  return (
    <div className="page">
      {/* Hero */}
      <div className="apps-hero">
        <div>
          <div className="eyebrow">Borrower portal</div>
          <h1 className="apps-h1">My applications</h1>
          <div className="muted apps-subtitle">
            {loading
              ? 'Loading…'
              : `${applications.length} total · welcome back.`}
          </div>
        </div>
        <div className="apps-hero-actions">
          <Button onClick={handleStartFromMismo} disabled={importingMismo} title="Upload a MISMO 3.4 XML to start a new application pre-populated with its data">
            <Icon name="upload" size={14} /> {importingMismo ? 'Importing…' : 'Import MISMO 3.4'}
          </Button>
          <Button variant="primary" to="/apply">
            <Icon name="plus" size={14} /> Start new application
          </Button>
          <input
            ref={mismoInputRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            style={{ display: 'none' }}
            onChange={handleMismoFileSelected}
          />
        </div>
      </div>

      {/* KPI strip */}
      <div className="apps-kpis">
        {kpis.map((k) => (
          <Card key={k.label} pad>
            <div className="eyebrow apps-kpi-label">{k.label}</div>
            <div className="mono apps-kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="dim apps-kpi-sub">{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="apps-toolbar">
        <div className="input-wrap apps-search">
          <span className="prefix"><Icon name="search" size={14} /></span>
          <input
            className="input with-prefix"
            placeholder="Search by borrower, address, or application #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="apps-filter-pills">
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f.value}
              className={`btn btn-sm ${filter === f.value ? 'apps-filter--active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <Card pad><div className="muted">Loading applications…</div></Card>
      ) : filtered.length === 0 ? (
        <Card pad>
          <div className="apps-empty">
            <Icon name="folder" size={28} />
            <h3 style={{ marginTop: 12 }}>
              {applications.length === 0 ? 'No applications yet' : 'No applications match your search'}
            </h3>
            <p className="muted" style={{ marginTop: 6, marginBottom: 16 }}>
              {applications.length === 0
                ? 'Start a fresh application or import a MISMO file from another system.'
                : 'Try clearing the filter or adjusting your search query.'}
            </p>
            {applications.length === 0 && (
              <Button variant="primary" to="/apply"><Icon name="plus" size={14} /> Start new application</Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="col" style={{ gap: 14 }}>
          {filtered.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              isLatest={app.id === latestId}
              onMismo={handleDownloadMismo}
              onCopy={handleCopyToNewApplication}
              onDelete={handleDeleteApplication}
            />
          ))}
        </div>
      )}
    </div>
  );
}
