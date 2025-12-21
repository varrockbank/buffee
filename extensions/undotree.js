/**
 * BuffeeUndoTree - Tree-based undo/redo for Buffee
 *
 * Unlike linear history where new edits discard the redo stack,
 * undo tree preserves all branches. When you undo and make a new edit,
 * you create a new branch instead of losing the previous future.
 *
 * Usage:
 *   const tree = BuffeeUndoTree(editor);
 *   // Now editor.UndoTree is available
 *   editor.UndoTree.undo();           // Go to parent node
 *   editor.UndoTree.redo();           // Go to most recent child
 *   editor.UndoTree.redo(0);          // Go to first child branch
 *   editor.UndoTree.branches();       // Get available branches at current node
 *   editor.UndoTree.goToNode(id);     // Jump to any node in tree
 *   editor.UndoTree.getTree();        // Get tree structure for visualization
 */

function BuffeeUndoTree(editor) {
  const _insert = editor._insert;
  const _delete = editor._delete;
  const { Selection, Model } = editor;

  // Node ID counter
  let nextId = 1;

  // Create root node (initial empty state)
  const root = {
    id: 0,
    parent: null,
    children: [],
    operation: null,
    cursorBefore: null,
    cursorAfter: { headRow: 0, headCol: 0, tailRow: 0, tailCol: 0 },
    timestamp: Date.now(),
    activeChild: null  // Index of most recently visited child
  };

  let current = root;
  let _lastOpTime = 0;
  const coalesceTimeout = 500;

  // Capture cursor position
  // Access via getters each time - head/tail references can change
  function captureCursor() {
    const head = editor._head;
    const tail = editor._tail;
    return {
      headRow: head.row, headCol: head.col,
      tailRow: tail.row, tailCol: tail.col
    };
  }

  // Restore cursor position
  // Access via getters each time - head/tail references can change
  function restoreCursor(pos) {
    if (!pos) return;

    const isSelection = pos.headRow !== pos.tailRow || pos.headCol !== pos.tailCol;

    // If restoring a selection but currently have cursor (head === tail), need to detach
    if (isSelection) {
      Selection.makeSelection();
    } else {
      Selection.makeCursor();
    }

    // Access via getters AFTER makeSelection/makeCursor - references change
    const head = editor._head;
    const tail = editor._tail;
    head.row = pos.headRow;
    head.col = pos.headCol;
    tail.row = pos.tailRow;
    tail.col = pos.tailCol;
  }

  // Check if operation can be coalesced with current node
  function canCoalesce(type) {
    if (!current.operation) return false;
    if (current.operation.type !== type) return false;
    if (current.children.length > 0) return false;
    const now = Date.now();
    return (now - _lastOpTime) < coalesceTimeout;
  }

  // Record an operation
  function recordOperation(type, row, col, text, cursorBefore) {
    const now = Date.now();

    // Try to coalesce with current node
    if (canCoalesce(type)) {
      const op = current.operation;
      if (type === 'insert') {
        // Append to existing insert
        op.text += text;
        current.cursorAfter = captureCursor();
      } else {
        // Prepend to existing delete (backspace accumulates backwards)
        op.text = text + op.text;
        op.col = col;
        current.cursorAfter = captureCursor();
      }
      _lastOpTime = now;
      return;
    }

    // Create new node
    const node = {
      id: nextId++,
      parent: current,
      children: [],
      operation: { type, row, col, text },
      cursorBefore,
      cursorAfter: captureCursor(),
      timestamp: now,
      activeChild: null
    };

    current.children.push(node);
    current.activeChild = current.children.length - 1;
    current = node;
    _lastOpTime = now;
  }

  // Wrap _insert to record history
  editor._insert = function(row, col, text) {
    const cursorBefore = captureCursor();
    const result = _insert(row, col, text);
    recordOperation('insert', row, col, text, cursorBefore);
    return result;
  };

  // Wrap _delete to record history
  editor._delete = function(row, col, text) {
    const cursorBefore = captureCursor();
    const result = _delete(row, col, text);
    recordOperation('delete', row, col, text, cursorBefore);
    return result;
  };

  // Undo: apply inverse of current operation and move to parent
  function undo() {
    if (!current.parent) return false;
    if (!current.operation) return false;

    const op = current.operation;

    // Apply inverse operation
    if (op.type === 'insert') {
      _delete(op.row, op.col, op.text);
    } else {
      _insert(op.row, op.col, op.text);
    }

    restoreCursor(current.cursorBefore);

    // Move to parent, marking this as the active child for redo
    const parent = current.parent;
    parent.activeChild = parent.children.indexOf(current);
    current = parent;
    _lastOpTime = 0;

    return true;
  }

  // Redo: move to child and apply its operation
  function redo(branchIndex) {
    if (current.children.length === 0) return false;

    // Use specified branch, active child, or first child
    const index = branchIndex !== undefined ? branchIndex :
                  current.activeChild !== null ? current.activeChild : 0;

    if (index < 0 || index >= current.children.length) return false;

    const child = current.children[index];
    const op = child.operation;

    // Apply operation
    if (op.type === 'insert') {
      _insert(op.row, op.col, op.text);
    } else {
      _delete(op.row, op.col, op.text);
    }

    restoreCursor(child.cursorAfter);
    current = child;
    _lastOpTime = 0;

    return true;
  }

  // Get available branches at current node
  function branches() {
    return current.children.map((child, index) => ({
      index,
      isActive: index === current.activeChild,
      operation: child.operation,
      timestamp: child.timestamp,
      descendants: countDescendants(child)
    }));
  }

  // Count total descendants of a node
  function countDescendants(node) {
    let count = 0;
    for (const child of node.children) {
      count += 1 + countDescendants(child);
    }
    return count;
  }

  // Find node by ID
  function findNode(id, node = root) {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(id, child);
      if (found) return found;
    }
    return null;
  }

  // Get path from root to a node
  function pathTo(node) {
    const path = [];
    let n = node;
    while (n) {
      path.unshift(n);
      n = n.parent;
    }
    return path;
  }

  // Go to any node in the tree
  function goToNode(id) {
    const target = findNode(id);
    if (!target) return false;

    // Find path from current to target
    const currentPath = pathTo(current);
    const targetPath = pathTo(target);

    // Find common ancestor
    let commonIdx = 0;
    while (commonIdx < currentPath.length && commonIdx < targetPath.length &&
           currentPath[commonIdx].id === targetPath[commonIdx].id) {
      commonIdx++;
    }

    // Undo back to common ancestor
    const undoCount = currentPath.length - commonIdx;
    for (let i = 0; i < undoCount; i++) {
      undo();
    }

    // Redo forward to target
    for (let i = commonIdx; i < targetPath.length; i++) {
      const node = targetPath[i];
      const parent = node.parent;
      if (parent) {
        const branchIdx = parent.children.indexOf(node);
        redo(branchIdx);
      }
    }

    return true;
  }

  // Get tree structure for visualization
  function getTree() {
    function nodeToObj(node) {
      return {
        id: node.id,
        isCurrent: node === current,
        operation: node.operation ? {
          type: node.operation.type,
          text: node.operation.text.length > 20
            ? node.operation.text.slice(0, 20) + '...'
            : node.operation.text
        } : null,
        timestamp: node.timestamp,
        children: node.children.map(nodeToObj),
        activeChild: node.activeChild
      };
    }
    return nodeToObj(root);
  }

  // Clear all history
  function clear() {
    root.children = [];
    root.activeChild = null;
    current = root;
    nextId = 1;
    _lastOpTime = 0;
  }

  // Expose API
  editor.UndoTree = {
    undo,
    redo,
    branches,
    goToNode,
    getTree,
    clear,
    get current() { return current; },
    get root() { return root; },
    get canUndo() { return current.parent !== null && current.operation !== null; },
    get canRedo() { return current.children.length > 0; },
    get hasBranches() { return current.children.length > 1; },
    // Expose for testing
    _lastOpTime: 0,
    get _coalesceTimeout() { return coalesceTimeout; }
  };

  // Make _lastOpTime settable for tests
  Object.defineProperty(editor.UndoTree, '_lastOpTime', {
    get: () => _lastOpTime,
    set: (v) => { _lastOpTime = v; }
  });

  return editor.UndoTree;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BuffeeUndoTree;
}
