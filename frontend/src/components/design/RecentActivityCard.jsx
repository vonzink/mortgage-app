import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import auditService from '../../services/auditService';
import { formatRelativeShort as formatWhen } from '../../utils/format';

/**
 * Right-rail activity feed for the document workspace. Polls the loan audit log
 * every 30 seconds. Each row shows: small initials avatar (forest gradient for
 * borrower / system, copper gradient for staff), action verb, target noun,
 * relative timestamp.
 */
export default function RecentActivityCard({ loanId, refreshKey = 0, limit = 8 }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const load = async () => {
      try {
        const data = await auditService.getLoanAuditLog(loanId, { size: limit });
        if (!cancelled) {
          setEntries((data?.entries || data?.content || []).slice(0, limit));
        }
      } catch {
        // Silent — empty state covers it
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    timer = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [loanId, limit, refreshKey]);

  return (
    <div className="card recent-activity-card">
      <div className="card-header">
        <div className="card-title"><Icon name="clock" size={14} stroke={1.8} /> Recent activity</div>
      </div>
      <div className="recent-activity-body">
        {loading && <div className="dim recent-activity-empty">Loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="dim recent-activity-empty">No activity yet.</div>
        )}
        {!loading && entries.length > 0 && entries.map((e, i) => (
          <ActivityRow key={e.id ?? i} entry={e} />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ entry }) {
  const isStaff = isStaffRole(entry.userRole);
  const initials = initialsFor(entry.userRole, entry.userId);
  const verb = describeAction(entry.action, entry.entityType);
  const target = extractTarget(entry.metadataJson) || '';
  return (
    <div className="recent-activity-row">
      <div className={`av ${isStaff ? 'av-copper' : 'av-brand'} recent-activity-av`}>{initials}</div>
      <div className="recent-activity-text">
        <div>
          <span className="recent-activity-verb">{verb}</span>
          {target && <> <span className="dim">{target}</span></>}
        </div>
        <div className="dim recent-activity-when">{formatWhen(entry.createdAt)}</div>
      </div>
    </div>
  );
}

function isStaffRole(role) {
  if (!role) return false;
  return /lo|processor|admin|manager/i.test(role);
}

function initialsFor(role, userId) {
  if (!role && !userId) return '··';
  if (role) {
    const map = { borrower: 'BR', agent: 'AG', lo: 'LO', processor: 'PR', admin: 'AD', manager: 'MG', system: 'SY' };
    const key = role.toLowerCase();
    return map[key] || role.slice(0, 2).toUpperCase();
  }
  return `#${String(userId).slice(-2)}`;
}

function describeAction(action, entityType) {
  if (!action) return '—';
  const verbs = {
    UPLOAD: 'uploaded',
    DOWNLOAD: 'downloaded',
    VIEW: 'viewed',
    MOVE: 'moved',
    DELETE: 'deleted',
    RENAME: 'renamed',
    VISIBILITY_CHANGE: 'changed visibility on',
    STATUS_CHANGE: 'changed status on',
    REVIEW: 'reviewed',
  };
  return verbs[action] || action.toLowerCase().replace(/_/g, ' ');
}

function extractTarget(json) {
  if (!json) return null;
  try {
    const o = typeof json === 'string' ? JSON.parse(json) : json;
    return o.fileName || o.docUuid || o.folderName || null;
  } catch { return null; }
}

// formatWhen (alias for formatRelativeShort) imported from utils/format (audit SI-1).
