import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import Button from './Button';

/**
 * Hero for the document workspace page (ApplicationDetails). Breadcrumb,
 * borrower name as H1, stats subtitle (file count / total size / last activity),
 * and the three primary actions on the right.
 */
export default function DocumentsHero({
  applicationId,
  borrowerName,
  fileCount = 0,
  totalSizeBytes = 0,
  lastActivity = null,
  onNewFolder,
  onExportAll,
  onUpload,
}) {
  const sizeStr = formatBytes(totalSizeBytes);
  const lastStr = relativeTime(lastActivity);

  return (
    <div className="docs-hero">
      <div className="docs-hero-text">
        <div className="eyebrow docs-breadcrumb">
          <Link to="/applications" className="docs-crumb">Applications</Link>
          <Icon name="chevron" size={10} />
          <span className="docs-crumb">{borrowerName || `#${applicationId}`}</span>
          <Icon name="chevron" size={10} />
          <span>Documents</span>
        </div>
        <h1 className="docs-h1">Document workspace</h1>
        <div className="muted docs-subtitle">
          {fileCount} file{fileCount === 1 ? '' : 's'}
          {totalSizeBytes ? ` · ${sizeStr} total` : ''}
          {lastStr ? ` · Last activity ${lastStr}` : ''}
        </div>
      </div>
      <div className="docs-hero-actions">
        {onNewFolder && (
          <Button onClick={onNewFolder}>
            <Icon name="folder" size={14} /> New folder
          </Button>
        )}
        {onExportAll && (
          <Button onClick={onExportAll}>
            <Icon name="download" size={14} /> Export all
          </Button>
        )}
        {onUpload && (
          <Button variant="primary" onClick={onUpload}>
            <Icon name="upload" size={14} /> Upload
          </Button>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function relativeTime(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (isNaN(then)) return null;
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  try { return new Date(iso).toLocaleDateString(); } catch { return null; }
}
