import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import Button from './Button';
import { formatBytes, formatRelative as relativeTime } from '../../utils/format';

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

// formatBytes / relativeTime (alias for formatRelative) imported from utils/format (audit SI-1).
