import React from 'react';
import { FaChevronRight } from 'react-icons/fa';

/**
 * Folder breadcrumb path. Renders root → … → currentFolder; each segment is clickable
 * to jump to that folder.
 */
export default function Breadcrumbs({ path, onNavigate }) {
  if (!path || path.length === 0) return null;
  return (
    <nav className="ws-crumbs" aria-label="Folder path">
      {path.map((node, i) => {
        const isLast = i === path.length - 1;
        return (
          <React.Fragment key={node.id}>
            {i > 0 && <FaChevronRight className="ws-crumb-sep" />}
            {isLast ? (
              <span className="ws-crumb ws-crumb--current">{node.displayName}</span>
            ) : (
              <button type="button" className="ws-crumb" onClick={() => onNavigate(node.id)}>
                {node.displayName}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
