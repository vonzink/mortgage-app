import React, { useState } from 'react';
import { FaFolder, FaFolderOpen, FaChevronDown, FaChevronRight } from 'react-icons/fa';

/**
 * Recursive folder tree. Phase 1: expand/collapse + click-to-select. No drag-drop yet.
 *
 * Props:
 *   root:         { id, displayName, children: [...] }
 *   selectedId:   currently focused folder id
 *   onSelect:     (folderId) => void
 *   defaultExpanded: Set of folder IDs to render expanded on first render
 */
export default function FolderTree({ root, selectedId, onSelect, defaultExpanded = new Set() }) {
  if (!root) return <div className="ws-tree-empty">No folders yet.</div>;
  return (
    <div className="ws-tree" role="tree">
      <FolderNode
        node={root}
        depth={0}
        selectedId={selectedId}
        onSelect={onSelect}
        defaultExpanded={defaultExpanded}
      />
    </div>
  );
}

function FolderNode({ node, depth, selectedId, onSelect, defaultExpanded }) {
  const [expanded, setExpanded] = useState(depth === 0 || defaultExpanded.has(node.id));
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div role="treeitem" aria-expanded={expanded}>
      <div
        className={`ws-tree-row${isSelected ? ' ws-tree-row--selected' : ''}`}
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        <button
          type="button"
          className="ws-tree-toggle"
          onClick={() => hasChildren && setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (expanded ? <FaChevronDown /> : <FaChevronRight />) : <span style={{ width: 12, display: 'inline-block' }} />}
        </button>
        <button
          type="button"
          className="ws-tree-label"
          onClick={() => onSelect(node.id)}
          title={node.displayName}
        >
          {expanded && hasChildren ? <FaFolderOpen /> : <FaFolder />}
          <span className="ws-tree-name">{node.displayName}</span>
        </button>
      </div>
      {expanded && hasChildren && (
        <div role="group">
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
