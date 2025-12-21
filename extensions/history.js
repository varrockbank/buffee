/**
 * @fileoverview BuffeeHistory - Undo/redo extension for Buffee.
 * Enables history tracking with undo/redo support.
 * @version 1.0.0
 */

/**
 * Initializes history support for a Buffee instance.
 * Wraps _insert and _delete to record operations for undo/redo.
 * @param {Buffee} editor - The Buffee instance to extend
 * @returns {Object} The History API object
 */
function BuffeeHistory(editor) {
  const { render, _insert, _delete } = editor._internals;

  // State
  const undoStack = [];
  const redoStack = [];
  let _lastOpTime = 0;
  const coalesceTimeout = 500;

  // Combined operation state (for selection replacement: delete + insert as atomic)
  let _combinedPending = null;

  /** Capture current cursor/selection state */
  function captureCursor() {
    // Access via getters each time - head/tail references can change after makeSelection()
    const head = editor._internals.head;
    const tail = editor._internals.tail;
    return {
      headRow: head.row, headCol: head.col,
      tailRow: tail.row, tailCol: tail.col
    };
  }

  /** Restore cursor/selection state */
  function restoreCursor(cursor) {
    const isSelection = cursor.headRow !== cursor.tailRow || cursor.headCol !== cursor.tailCol;

    // If restoring a selection but currently have cursor (head === tail), need to detach
    if (isSelection) {
      editor.Selection.makeSelection();
    } else {
      editor.Selection.makeCursor();
    }

    // Access via getters AFTER makeSelection/makeCursor - references change
    const head = editor._internals.head;
    const tail = editor._internals.tail;
    head.row = cursor.headRow;
    head.col = cursor.headCol;
    tail.row = cursor.tailRow;
    tail.col = cursor.tailCol;
  }

  /** Check if we can coalesce with the last operation */
  function canCoalesce(type, row, col, text) {
    if (undoStack.length === 0) return false;
    if (Date.now() - _lastOpTime > coalesceTimeout) return false;

    const last = undoStack[undoStack.length - 1];
    if (last.type !== type) return false;
    if (text.includes('\n') || last.text.includes('\n')) return false;

    if (type === 'insert') {
      return last.row === row && last.col + last.text.length === col;
    } else {
      return last.row === row && col + text.length === last.col;
    }
  }

  // Wrap _insert to record history
  editor._internals._insert = function(row, col, text) {
    if (text.length === 0) return null;

    const cursorBefore = captureCursor();
    const result = _insert(row, col, text);

    // Check if this insert is part of a combined operation (selection replacement)
    if (_combinedPending && _combinedPending.row === row && _combinedPending.col === col) {
      // Combine with pending delete - add insert info to existing entry
      const last = undoStack[undoStack.length - 1];
      last.insertText = text;
      last.combined = true;
      _combinedPending = null;
    } else if (canCoalesce('insert', row, col, text)) {
      const last = undoStack[undoStack.length - 1];
      last.text += text;
    } else {
      _combinedPending = null; // Clear any stale pending
      undoStack.push({ type: 'insert', row, col, text, cursorBefore });
    }
    _lastOpTime = Date.now();
    redoStack.length = 0;

    return result;
  };

  // Wrap _delete to record history
  editor._internals._delete = function(row, col, text) {
    if (text.length === 0) return;

    const cursorBefore = captureCursor();
    _delete(row, col, text);

    // Check if this might be the start of a combined operation
    // (selection delete followed by insert at same position)
    const isSelectionDelete = text.includes('\n') || text.length > 1;

    if (canCoalesce('delete', row, col, text)) {
      const last = undoStack[undoStack.length - 1];
      last.text = text + last.text;
      last.col = col;
      _combinedPending = null;
    } else {
      undoStack.push({ type: 'delete', row, col, text, cursorBefore });
      // Mark as potentially combined if it looks like a selection delete
      if (isSelectionDelete) {
        _combinedPending = { row, col };
      } else {
        _combinedPending = null;
      }
    }
    _lastOpTime = Date.now();
    redoStack.length = 0;
  };

  function undoOp(op) {
    const cursorBefore = captureCursor();

    if (op.combined) {
      // Combined operation: undo insert first, then restore deleted text
      _delete(op.row, op.col, op.insertText);
      _insert(op.row, op.col, op.text);
    } else if (op.type === 'insert') {
      _delete(op.row, op.col, op.text);
    } else {
      _insert(op.row, op.col, op.text);
    }
    return { ...op, cursorAfter: cursorBefore };
  }

  function redoOp(op) {
    if (op.combined) {
      // Combined operation: delete original text, then insert replacement
      _delete(op.row, op.col, op.text);
      _insert(op.row, op.col, op.insertText);
    } else if (op.type === 'insert') {
      _insert(op.row, op.col, op.text);
    } else {
      _delete(op.row, op.col, op.text);
    }
    undoStack.push(op);
  }

  // Create History object on editor
  const History = editor.History = {
    get undoStack() { return undoStack; },
    get redoStack() { return redoStack; },

    undo() {
      if (undoStack.length === 0) return false;

      const op = undoStack.pop();
      const undoneOp = undoOp(op);
      redoStack.push(undoneOp);
      restoreCursor(op.cursorBefore);

      render();
      return true;
    },

    redo() {
      if (redoStack.length === 0) return false;

      const op = redoStack.pop();
      redoOp(op);
      if (op.cursorAfter) {
        restoreCursor(op.cursorAfter);
      }

      render();
      return true;
    },

    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    }
  };

  return History;
}
