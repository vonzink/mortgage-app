import React, { useState } from 'react';
import { FaFolder, FaFolderOpen, FaChevronDown, FaChevronRight, FaTrash } from 'react-icons/fa';
import { INTERNAL_DRAG_MIME } from './FileTable';

/**
 * Recursive folder tree. Phase 2: each node is a drop target for files dragged
 * out of FileTable. The drop reads the internal doc-uuid payload and calls onDropFiles.
 *
 * Props:
 *   root, selectedId, onSelect, defaultExpanded — same as Phase 1
 *   onDropFiles: (folderId, docUuids) => void — invoked when one or more files
 *                are dropped on a folder node.
 */
export default function FolderTree({ root, selectedId, onSelect, defaultExpanded = new Set(), onDropFiles, onDeleteFolder }) {
  if (!root) return <div className="ws-tree-empty">No folders yet.</div>;
  return (
    <div className="ws-tree" role="tree">
      <FolderNode
        node={root}
        depth={0}
        selectedId={selectedId}
        onSelect={onSelect}
        defaultExpanded={defaultExpanded}
        onDropFiles={onDropFiles}
        onDeleteFolder={onDeleteFolder}
        isRoot
      />
    </div>
  );
}

function FolderNode({ node, depth, selectedId, onSelect, defaultExpanded, onDropFiles, onDeleteFolder, isRoot = false }) {
  const [expanded, setExpanded] = useState(depth === 0 || defaultExpanded.has(node.id));
  const [dragHover, setDragHover] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedId;

  // Drop target plumbing. We accept only our own internal drag payload — OS file
  // drops onto folder nodes are NOT used as upload targets in Phase 2 (the upload
  // dropzone is in the file pane). Doing so here would conflict with desktop
  // drag-OUT, since browsers fire dragenter on intermediate elements.
  const onDragEnter = (e) => {
    if (!hasInternalDrag(e)) return;
    e.preventDefault();
    setDragHover(true);
  };
  const onDragOver = (e) => {
    if (!hasInternalDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDragLeave = () => setDragHover(false);
  const onDrop = (e) => {
    if (!hasInternalDrag(e)) return;
    e.preventDefault();
    setDragHover(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData(INTERNAL_DRAG_MIME) || '{}');
      const docUuids = Array.isArray(payload.docUuids) ? payload.docUuids : [];
      if (docUuids.length > 0) onDropFiles?.(node.id, docUuids);
    } catch {
      // Ignore malformed payloads
    }
  };

  return (
    <div role="treeitem" aria-expanded={expanded}>
      <div
        className={`ws-tree-row${isSelected ? ' ws-tree-row--selected' : ''}${dragHover ? ' ws-tree-row--drophover' : ''}`}
        style={{ paddingLeft: depth * 16 + 4 }}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
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
        {/* Delete button — only shown for user-created subfolders. The root folder
         *  and any folder seeded by FolderService.DEFAULT_SUBFOLDERS (isSystem=true)
         *  cannot be deleted; the backend rejects it too as a safety net. */}
        {!isRoot && !node.isSystem && onDeleteFolder && (
          <button
            type="button"
            className="ws-tree-delete btn-icon btn-icon--danger"
            title="Delete folder"
            aria-label={`Delete ${node.displayName}`}
            onClick={(e) => { e.stopPropagation(); onDeleteFolder(node); }}
          >
            <FaTrash />
          </button>
        )}
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
              onDropFiles={onDropFiles}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function hasInternalDrag(e) {
  // dataTransfer.types is a DOMStringList in some browsers, array in others.
  return Array.from(e.dataTransfer?.types || []).includes(INTERNAL_DRAG_MIME);
}
