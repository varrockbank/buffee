/**
 * @fileoverview Buffee, the text slayer
 */

/**
 * @typedef {Object} BuffeeConfig
 * @property {number} [rows] - Fixed number of visible lines (if omitted, auto-fits to container height)
 * @property {number} [cols] - Fixed number of text columns (auto-calculates container width including gutter)
 * @property {number} [spaces=4] - Number of spaces per tab/indentation level
 */

/**
 * @typedef {Object} Position
 * @property {number} row - Row index (viewport-relative, 0-indexed)
 * @property {number} col - Column index (0-indexed)
 */

/**
 * Creates a new Buffee virtual buffer editor instance.
 * @constructor
 * @param {HTMLElement} $parent - Container element
 * @param {BuffeeConfig} [config={}] - Configuration options
 * @example
 * const editor = new Buffee(document.getElementById('editor'), { rows: 25 });
 * editor.Model.text = 'Hello, World!';
 */
function Buffee($parent, { rows, cols, spaces = 4 } = {}) {
  this.version = "12.6.4-alpha.1";
  const self = this;
  /** Replaces tabs with spaces (spaces = number of spaces, 0 = keep tabs) */
  const expandTabs = s => Mode.spaces ? s.replace(/\t/g, ' '.repeat(Mode.spaces)) : s,
      isSpace = ch => /\s/.test(ch),
      isWord = ch => /[\p{L}\p{Nd}_]/u.test(ch);

  /**
   * Editor mode settings (shared between internal and external code).
   * @namespace Mode
   */
  const Mode = {
    spaces,
    /**
     * Interactive mode: 1 (normal), 0 (navigation-only), -1 (read-only)
     * - 1: Full editing (default)
     * - 0: Navigation only (can move cursor, no editing) - used by UltraHighCapacity
     * - -1: Read-only (no cursor/selection rendering, no navigation) - used by TUI
     * @type {-1|0|1}
     */
    interactive: 1
  };

  const prop = p => parseFloat(getComputedStyle($parent).getPropertyValue(p));
  const lineHeight = prop("--buffee-cell");
  const editorPaddingPX = prop("--buffee-padding");
  const gutterDigitsMinimum = prop("--buffee-gutter-digits-initial");
  let gutterDigits = -1; // as long as different from guggers digit minimum, we trigger setting gutter on first render
  const gutterCols = () => gutterDigits + prop("--buffee-gutter-digits-padding");
  const $ = (n, q) => n.querySelector(q); 
  const $e = $($parent, '.buffee-elements');
  const $l = $($e, '.buffee-lines');
  const $cursor = $($e, '.buffee-cursor');
  const $textLayer = $($e, '.buffee-layer-text');
  const $selectionLayer = $($e, '.buffee-layer-selection');
  const $clipboardBridge = $($parent, '.buffee-clipboard-bridge');
  const $gutter = $($e, '.buffee-gutter');

  // [array, fragment, parent, tagName, updateFn]
  const viewportLayers = [
    [[], document.createDocumentFragment(), $textLayer, 'pre', (el, i) => el.textContent = Model.lines[Viewport.start + i] ?? null],
    [[], document.createDocumentFragment(), $gutter, 'div', (el, i) => el.textContent = Viewport.start + i + 1],
    [[], document.createDocumentFragment(), $selectionLayer, 'div', (el) => el.style.width = 0]
  ];

  // Set container width if cols specified
  // Width = gutter(ch) + lines(ch) + margins(px): gutter has margin*2, lines has margin*2
  cols && !$gutter && ($e.style.width = `calc(${cols}ch + ${editorPaddingPX * 2}px)`);
  // Set container height if rows specified (don't use flex: 1). TODO: perhaps can just set on parent
  rows && viewportLayers.forEach(([, , p]) => p && (p.style.height = rows * lineHeight + 'px'));

  const detachedHead = { row : 0, col : 0};
  // head.row and tail.row are ABSOLUTE line numbers (Model indices, not viewport-relative).
  // This allows selections to span beyond the viewport.
  // In case where we have cursor, we want head === tail.
  let head = { row: 0, col: 0 };
  let tail = head;
  let maxCol = head.col;

  /**
   * Selection management for cursor and text selection operations.
   * Handles cursor movement, text selection, insertion, and deletion.
   * @namespace Selection
   */
  const Selection = this.Selection = {
    /**
     * Returns selection bounds in document order [start, end].
     * @returns {[Position, Position]} Array of [start, end] positions
     */
    get ordered() { return this.isForwardSelection ? [tail, head] : [head, tail] },

    /**
     * Moves the cursor/selection head vertically.
     * head.row is an ABSOLUTE line number (Model index).
     * @param {number} value - Direction to move: 1 for down, -1 for up
     */
    moveRow(value) {
      if (value > 0) {
        // Move down
        if (head.row < Model.lastIndex) {
          // Adjust column to fit new line's length
          head.col = Math.min(maxCol, Model.lines[++head.row].length);

          // Scroll viewport if cursor went below visible area
          if (head.row > Viewport.end) Viewport.start = head.row - Viewport.size + 1;
        }
        // else: at last line of file, No-Op
      } else if (head.row > 0) { // Move up
        // Adjust column to fit new line's length
        head.col = Math.min(maxCol, Model.lines[--head.row].length);
        // Scroll viewport if cursor went above visible area
        if (head.row < Viewport.start) Viewport.start = head.row;
      }
      // else: at first line of file, No-Op
      render();
    },

    /**
     * Moves the cursor/selection head horizontally.
     * head.row is an ABSOLUTE line number (Model index).
     * Handles line wrapping when moving past line boundaries.
     * @param {number} value - Direction to move: 1 for right, -1 for left
     */
    moveCol(value) {
      if (value === 1) {
        if (head.col < Model.lines[head.row].length) {                             // Move right 1 character (including to newline position).
          maxCol = ++head.col;
        } else if (head.row < Model.lastIndex) {                   // Move to beginning of next line.
          maxCol = head.col = 0;
          // Scroll viewport if cursor went below visible area
          if (++head.row > Viewport.end) Viewport.start = head.row - Viewport.size + 1;
        } // else: at end of file, No-Op
      } else if (head.col > 0) {
          maxCol = --head.col;
      } else if (head.row > 0) {                                 // Move to end of previous line (phantom newline position)
          maxCol = head.col = Model.lines[--head.row].length;
          // Scroll viewport if cursor went above visible area
          if (head.row < Viewport.start) Viewport.start = head.row;
      } // else: at start of file, No-Op
      render();
    },

    /**
     * Whether there is an active text selection (vs just a cursor).
     * @returns {boolean} True if text is selected
     */
    get isSelection() {
      return head !== tail
    },

    /**
     * Whether the selection direction is forward (tail before head).
     * @returns {boolean} True if selection goes left-to-right/top-to-bottom
     */
    get isForwardSelection() {
      return tail.row === head.row && tail.col < head.col || tail.row < head.row;
    },

    /**
     * Sets the cursor to an absolute position.
     * @param {Position} position - Target cursor position (absolute row)
     */
    setCursor({row, col}) {
      head.row = row;
      head.col = col;
      this.makeCursor();
    },

    /**
     * Gets the selected text as an array of lines.
     * @returns {string[]} Array of selected line contents
     */
    get lines() {
      const [left, right] = this.ordered;
      if(left.row === right.row) {
        const text = Model.lines[left.row];
        const texts = [text.slice(left.col, right.col)];
        
        // If selection extends to phantom newline position and there is a newline
        if (right.col >= text.length && left.row < Model.lastIndex) texts.push('');

        return texts;
      } else {
        const firstLine = Model.lines[left.row].slice(left.col);
        const lastLine = Model.lines[right.row].slice(0, right.col);
        const middle = Model.lines.slice(left.row + 1, right.row);
        return [firstLine, ...middle, lastLine]
      }
    },

    /**
     * Collapses selection to a cursor (head === tail).
     */
    makeCursor() {
      tail.row = head.row;
      tail.col = head.col;
      head = tail;
    },

    /**
     * Begins a new selection from current cursor position.
     * Detaches head from tail to allow independent movement.
     */
    makeSelection() {
      head = detachedHead;
      head.row = tail.row;
      head.col = tail.col;
    },

    /**
     * Moves cursor to start of current line (first non-space character).
     * If already at first non-space, moves to column 0.
     */
    moveCursorStartOfLine() {
      maxCol = head.col = (c => c > 0 && c < tail.col ? c : 0)(Model.lines[head.row].search(/[^ ]/));
      render();
    },

    /**
     * Moves cursor to end of current line.
     */
    moveCursorEndOfLine() {
      maxCol = head.col = Model.lines[head.row].length;
      render();
    },

    /**
     * Inserts a string at cursor position, replacing any selection.
     * @param {string} s - String to insert
     * @param {boolean} [skipRender=false] - Skip rendering (for batched operations)
     */
    insert(s, skipRender = false) {
      s = expandTabs(s);
      if (this.isSelection) {
        const [first] = this.ordered;

        // Get selected text before deleting
        const selectedText = this.lines.join('\n');
        self._._delete(first.row, first.col, selectedText);
        const insertedLines = self._._insert(first.row, first.col, s);

        head.row = first.row;
        // Update cursor to end of inserted text
        if (insertedLines?.length > 1) {
          head.row += insertedLines.length - 1;
          head.col = insertedLines[insertedLines.length - 1].length;
        } else head.col = first.col + s.length;
        
        this.makeCursor();
      } else {
        const insertedLines = self._._insert(tail.row, tail.col, s);

        // Update cursor
        if (insertedLines?.length > 1) {
          head.row += insertedLines.length - 1;
          maxCol = head.col = insertedLines[insertedLines.length - 1].length;
        } else maxCol = head.col += s.length;
      }
      if (!skipRender) render();
    },

    /**
     * Deletes the character before cursor or the current selection.
     */
    delete() {
      if (this.isSelection) return this.insert('');

      if (tail.col > 0) {
        // Delete character before cursor
        const charToDelete = Model.lines[tail.row][tail.col - 1];
        self._._delete(tail.row, tail.col - 1, charToDelete);
        head.col--;
      } else if (tail.row > 0) {
        // At start of line - delete newline (join with previous line)
        const prevLineLen = Model.lines[tail.row - 1].length;
        self._._delete(tail.row - 1, prevLineLen, '\n');
        head.col = prevLineLen;
        if (--head.row < Viewport.start) Viewport.start = head.row;
      }

      render();
    },

    /**
     * Inserts a new line at cursor position, splitting the current line.
     */
    newLine() {
      if (this.isSelection) Selection.insert('', true); // skipRender - we render below

      // Insert newline character
      self._._insert(tail.row, tail.col, '\n');

      head.col = 0, head.row++;
      if (head.row > Viewport.end) Viewport.start = head.row - Viewport.size + 1;

      render();
    },

    /**
     * Moves cursor backward by one word.
     * Word boundaries are whitespace, word characters, or punctuation runs.
     */
    moveBackWord() {
      if(head.col === 0) {
        if(head.row > 0) {
          head.col = Model.lines[--head.row].length;
          if (head.row < Viewport.start) Viewport.start = head.row;
        }
      } else {
        const s = Model.lines[head.row];
        let j = head.col;
        if (isSpace(s[j])) { while (j > 0 && isSpace(s[j])) j--; while (j > 0 && isWord(s[j])) j--; } // whitespace
        else if (isWord(s[j])) while (j > 0 && isWord(s[j])) j--; // word
        else { const c = s[j--]; while(j > 0 && s[j] === c) j--; } // punctuation
        head.col = j;
      }

      render();
    },

    /**
     * Moves cursor forward by one word.
     * Word boundaries are whitespace, word characters, or punctuation runs.
     */
    moveWord() {
      const s = Model.lines[head.row];
      const n = s.length;
      if(head.col === n) { // Edge case: At end of line
        if (head.row < Model.lastIndex) {
          head.col = 0;
          if (++head.row > Viewport.end) Viewport.start = head.row - Viewport.size + 1;
        }
        // else: at end of file - do nothing
      } else {
        let j = head.col;
        if (isSpace(s[j])) { while (j < n && isSpace(s[j])) j++; while (j < n && isWord(s[j])) j++; } // whitespace
        else if (isWord(s[j])) while (j < n && isWord(s[j])) j++; // word
        else { const c = s[j++]; while(j < n && s[j] === c) j++; } // punctuation
        head.col = j;
      }

      render();
    },

    /**
     * Indents all lines in the current selection by the configured indentation.
     * No-op if there is no selection.
     */
    indent() {
      if(!this.isSelection) return;
      const [first, second] = this.ordered;

      for(let i = first.row; i <= second.row; i++)
        Model.lines[i] = " ".repeat(Mode.spaces) + Model.lines[i];

      first.col += Mode.spaces;
      second.col += Mode.spaces;

      render();
    },

    /**
     * Removes indentation from all lines in the current selection.
     * Follows IntelliJ-style behavior: removes up to `indentation` spaces from line start.
     */
    unindent() {
      // Note: Vim, VSCode, Intellij all has slightly different unindent behavior.
      // VSCode: for lines not aligned at a multiple of indentation number of spaces, align them to the
      // first such position.
      // vim: removes the selection, although it does keep a hidden memory of the most recent indentation operation which you can repeat.
      // intellij: move all selected lines by indentation of number spaces, unless there is not enough to unindent
      // Currently we follow intellij implementation but perhaps VSCode's is the best.
      const [first, second] = this.ordered;

      for(let i = first.row; i <= second.row; i++) {
        if( i  === first.row || i === second.row) {
          const cursor = i === first.row ? first : second;
          // Cursor movement of first and second depends on spaces left and right of it .
          let indentableSpacesLeftOfCursor = 0;
          let indentableSpacesFromCursor = 0 ;
          const s = Model.lines[cursor.row];
          let j = cursor.col;
          while (j < s.length && s.charAt(j) === ' ') j++;
          indentableSpacesFromCursor = j - cursor.col ;
          j = 0; while (j < cursor.col && s.charAt(j) === ' ') j++;
          indentableSpacesLeftOfCursor = j;
          const unindentationsFirstLine = Math.min(Mode.spaces,
            indentableSpacesLeftOfCursor + indentableSpacesFromCursor);
          Model.lines[cursor.row] = Model.lines[cursor.row].slice(unindentationsFirstLine);
          if(indentableSpacesFromCursor < unindentationsFirstLine)
            cursor.col -= unindentationsFirstLine - indentableSpacesFromCursor;
        } else {
          const line = Model.lines[i];
          let k = 0;
          while (k < Mode.spaces && line[k] === ' ') k++;
          Model.lines[i] = line.slice(k);
        }
      }

      render();
    },
  };

  // ============================================================================
  // Extension hooks - allows extensions to hook into editor without Buffee knowing about them
  // ============================================================================

  /** Render hooks - called after text content is set. Args: ($l, Viewport, rebuilt) */
  const renderHooks = [];

  /**
   * Document model managing text content.
   * @namespace Model
   */
  const Model = this.Model = {
    /** @type {string[]} Array of text lines */
    lines: [''],

    /** @type {string} Total byte count of the document */
    byteCount: "",
    /** @type {number} Original line count when document was loaded */
    originalLineCount: 0,

    /**
     * Index of the last line in the document.
     * @returns {number} Zero-based index of the last line
     */
    get lastIndex() { return this.lines.length - 1 },

    /**
     * Sets the document content from a string.
     * Splits on newlines.
     * @param {string} text - The full document text
     */
    set text(text) {
      text = expandTabs(text);
      this.lines = text.split("\n");
      this.byteCount = new TextEncoder().encode(text).length
      this.originalLineCount = this.lines.length;
      render();
    },

    /**
     * Splices lines into the document at the given index.
     * @param {number} i - Index to insert at
     * @param {string[]} lines - Lines to insert
     * @param {number} [n=0] - Number of lines to remove
     */
    splice(i, lines, n = 0) {
      this.lines.splice(i , n, ...lines);
      render();
    },

    /**
     * Deletes a single line at the given index.
     * @param {number} i - Index of line to delete
     */
    delete(i) {
      this.lines.splice(i, 1);
    },
  }

  /**
   * Primitive insert operation. Inserts text at position, handling newlines.
   * @param {number} row - Row index (absolute, not viewport-relative)
   * @param {number} col - Column index
   * @param {string} text - Text to insert (may contain newlines)
   */
  function _insert(row, col, text) {
    if (text.length === 0) return null;

    // Fast path: single character (no newline)
    if (text.length === 1 && text !== '\n') {
      Model.lines[row] = Model.lines[row].slice(0, col) + text + Model.lines[row].slice(col);
      return null; // Caller knows it's single char
    }

    const lines = text.split('\n');

    if (lines.length === 1) {
      // Single line insert
      Model.lines[row] = Model.lines[row].slice(0, col) + text + Model.lines[row].slice(col);
    } else {
      // Multi-line insert
      const before = Model.lines[row].slice(0, col);
      const after = Model.lines[row].slice(col);

      // First line: before + first segment
      Model.lines[row] = before + lines[0];

      // Middle lines: insert as new lines
      const middleLines = lines.slice(1, -1);

      // Last line: last segment + after
      const lastLine = lines[lines.length - 1] + after;

      Model.lines.splice(row + 1, 0, ...middleLines, lastLine);
    }

    return lines; // Return split result for caller reuse
  }

  /**
   * Primitive delete operation. Deletes text at position, handling newlines.
   * @param {number} row - Row index (absolute, not viewport-relative)
   * @param {number} col - Column index
   * @param {string} text - Text to delete (must match what's at position, may contain newlines)
   */
  function _delete(row, col, text) {
    if (text.length === 0) return;

    const lines = text.split('\n');

    if (lines.length === 1) {
      // Single line delete
      Model.lines[row] = Model.lines[row].slice(0, col) + Model.lines[row].slice(col + text.length);
    } else {
      // Multi-line delete
      const before = Model.lines[row].slice(0, col);
      const afterRow = row + lines.length - 1;
      const afterCol = lines[lines.length - 1].length;
      const after = Model.lines[afterRow].slice(afterCol);

      // Join first and last line portions, remove middle lines
      Model.lines[row] = before + after;
      Model.lines.splice(row + 1, lines.length - 1);
    }
  }

  /**
   * Viewport management for virtual scrolling.
   * Controls which portion of the document is currently visible.
   * @namespace Viewport
   */
  const Viewport = this.Viewport = {
    /** @type {number} Index of the first visible line (0-indexed) */
    start: 0,
    /** @type {0|1} Whether viewport auto-fits to container height */
    autoFit: rows ? 0 : 1,
    /** @type {number} Number of visible lines */
    size: rows ? rows : 0,
    /** @type {number} Pending container delta (0 = up to date) */
    delta: rows ? rows : 1,
    /** @type {number} Number of DOM line containers */
    get displayLines() { return this.size + this.autoFit; },

    /**
     * Index of the last visible line.
     * @returns {number} Index of the last line in the viewport
     */
    get end() {
      return Math.min(this.start + this.size - 1, Model.lastIndex);
    },

    /**
     * Scrolls the viewport by a relative amount.
     * @param {number} i - Number of lines to scroll (positive = down, negative = up)
     */
    scroll(i) {
      this.start = $clamp(this.start + i, 0, Model.lastIndex);
      render();
    },

    /**
     * Sets the viewport position and size.
     * @param {number} start - Line number to start at (1-indexed for user display)
     * @param {number} size - Number of lines to display
     */
    set(start, size) {
      this.start = $clamp(start-1, 0, Model.lastIndex);
      this.delta += size - this.size;
      this.size = size;
      render();
    },

    /**
     * Gets the lines currently visible in the viewport.
     * @returns {string[]} Array of visible line contents
     */
    get lines() {
      return Model.lines.slice(this.start, this.end + 1);
    },
  };
  
  let frameCount = 0;

  function sizeSelection(i, left, width) {
    const style = viewportLayers[2][0][i].style;
    style.left = left + 'ch';
    style.width = width + 'ch';
  }

  /**
   * Renders the editor viewport, selection, and calls extension hooks.
   * @private
   */
  function render() {
    frameCount++;

    // Adjust gutter width based on largest visible line number
    // Minimum width from CSS variable to avoid jitter for small documents
    if ($gutter) {
      // TODO: move into viewport
      const digits = Math.max(gutterDigitsMinimum, (Viewport.start + Viewport.displayLines).toString().length);
      if (digits !== gutterDigits) {
        gutterDigits = digits;
        $gutter.style.width = gutterCols() + 'ch';
        // TODO: refactor into function
        if (cols) $e.style.width = `calc(${gutterCols() + cols}ch + ${editorPaddingPX * 4}px)`;
      }
    }

    // Renders the containers for the viewport lines, as well as selections and highlights
    // Only adds/removes the delta of elements when viewport size changes
    const rebuilt = Viewport.delta;
    if (rebuilt) {
      if (rebuilt > 0) {
        // Add new line containers and selections
        for (let i = 0; i < rebuilt; i++) {
          viewportLayers.forEach(([arr, frag, , tag]) => arr.push(frag.appendChild(document.createElement(tag))));
        }
        viewportLayers.forEach(([, frag, parent]) => parent?.appendChild(frag));
      } else {
        // Remove excess line containers and selections
        for (let i = 0; i < -rebuilt; i++) {
          viewportLayers.forEach(([arr]) => arr.pop()?.remove());
        }
      }
      Viewport.delta = 0;
    }

    // Update contents of line containers
    for(let i = 0; i < Viewport.displayLines; i++) {
      viewportLayers.forEach(([arr, , , , update]) => arr[i] && update(arr[i], i));
    }

    // In read-only mode (-1), hide cursor off screen and skip selection rendering
    if (Mode.interactive < 0) {
      $cursor.style.left = '-1ch';
    } else {
      const [firstEdge, secondEdge] = Selection.ordered;

      // Convert absolute rows to viewport-relative
      const firstViewportRow = firstEdge.row - Viewport.start;
      const secondViewportRow = secondEdge.row - Viewport.start;

      // Render middle selection lines (only those within viewport)
      for (let absRow = firstEdge.row + 1; absRow <= secondEdge.row - 1; absRow++) {
        const viewportRow = absRow - Viewport.start;
        if (viewportRow >= 0 && viewportRow < Viewport.size)
          // +1 for phantom newline character (shows newline is part of selection)
          sizeSelection(viewportRow, 0, Model.lines[absRow].length + 1);
      }

      // Render the first edge line (if within viewport)
      if (firstViewportRow >= 0 && firstViewportRow < Viewport.size) {
        // Single-line: width = secondEdge.col - firstEdge.col
        // Multi-line: width = text.length - firstEdge.col + 1 (includes phantom newline)
        const width = secondEdge.row === firstEdge.row
          ? secondEdge.col - firstEdge.col
          : Model.lines[firstEdge.row].length - firstEdge.col + 1;
        sizeSelection(firstViewportRow, firstEdge.col, width);
      }

      // Render the second edge line (if within viewport and multi-line selection)
      // Excludes cursor head position
      if (secondEdge.row !== firstEdge.row && secondViewportRow >= 0 && secondViewportRow < Viewport.size) {
        sizeSelection(secondViewportRow, 0, Math.min(secondEdge.col, Model.lines[secondEdge.row].length));
      }
      // * END render selection

      // Render cursor overlay (always shows head position)
      const headViewportRow = head.row - Viewport.start;
      if (headViewportRow >= 0 && headViewportRow < Viewport.size) {
        $cursor.style.top = headViewportRow * lineHeight + 'px';
        $cursor.style.left = head.col + 'ch';

        // Horizontal scroll to keep cursor in view
        const containerRect = $l.getBoundingClientRect();
        const cursorRect = $cursor.getBoundingClientRect();
        const charWidth = cursorRect.width || 14;

        if (cursorRect.left < containerRect.left) {
          const deficit = containerRect.left - cursorRect.left;
          const charsToScroll = Math.ceil(deficit / charWidth);
          $l.scrollLeft -= charsToScroll * charWidth;
        } else if (cursorRect.right > containerRect.right) {
          const deficit = cursorRect.right - containerRect.right;
          const charsToScroll = Math.ceil(deficit / charWidth);
          $l.scrollLeft += charsToScroll * charWidth;
        }
        // Snap to character boundary to prevent accumulated drift
        $l.scrollLeft = Math.round($l.scrollLeft / charWidth) * charWidth;
      }
    }

    // Call extension hooks
    for (const hook of renderHooks) {
      hook($l, Viewport, rebuilt);
    }
  }

  // ============================================================================
  // Public API - exposed on the Buffee instance
  // ============================================================================

  /**
   * Line height in pixels. Used for positioning elements and calculating viewport.
   * @type {number}
   * @readonly
   * @warning Do not modify - changing this value will cause rendering issues.
   */
  this.lineHeight = lineHeight;

  /**
   * Editor mode settings (indentation, etc.)
   * @type {Object}
   */
  this.Mode = Mode;

  /**
   * Internal API for extensions (decorator pattern).
   * @private
   */
  this._ = {
    get head() { return head; },
    get tail() { return tail; },
    get frameCount() { return frameCount; },
    get contentOffset() {
      return {
        ch: $gutter ? gutterCols() : 0,
        px: $gutter ? (editorPaddingPX * 3) : editorPaddingPX,
        top: editorPaddingPX
      };
    },
    $e,
    $l,
    $textLayer,
    render,
    renderHooks,
    _insert,
    _delete,
    appendLines(newLines, skipRender = false) {
      Model.lines.push(...newLines.map(expandTabs));
      if (!skipRender) render();
    }
  };

  // Auto-fit viewport to container height
  if (Viewport.autoFit) {
    const fitViewport = () => {
      // .buffee-elements is flex: 1, so it fills remaining space after status line
      const newSize = Math.floor($e.clientHeight / lineHeight);
      if (newSize > 0 && newSize !== Viewport.size) {
        Viewport.delta += newSize - Viewport.size;
        Viewport.size = newSize;
        render();
      }
    };
    // Use requestAnimationFrame to ensure layout is complete before measuring
    requestAnimationFrame(fitViewport);
    new ResizeObserver(fitViewport).observe($e);
  } else {
    render();
  }

  // Reading clipboard from the keydown listener involves a different security model.
  $l.addEventListener('paste', e => {
    e.preventDefault(); // stop browser from inserting raw clipboard text
    const text = e.clipboardData.getData("text/plain");
    if (text) Selection.insert(text);
  });
  const copy = e => {
    e.preventDefault(); // take over the clipboard contents                   
    e.clipboardData.setData('text/plain', Selection.lines.join("\n"));
  }
  // Triggered by a keydown paste event. a copy event handler can read the clipboard
  // by the standard security model. Meanwhile, we don't have to make the editor "selectable".
  // Listen on $clipboardBridge since that's where focus moves on Ctrl+C/X.
  $clipboardBridge.addEventListener('copy', copy);
  $clipboardBridge.addEventListener('cut', e => {
    copy(e);
    Selection.delete();
    $l.focus({ preventScroll: true });     // Return focus to editor
  });

  // Arrow key encoding: ±1 = horizontal, ±2 = vertical, sign = direction
  const arrowMap = { ArrowDown: 2, ArrowUp: -2, ArrowLeft: -1, ArrowRight: 1 };
  $l.addEventListener('keydown', event => {
    // Do nothing for Meta+V (on Mac) or Ctrl+V (on Windows/Linux) as to avoid conflict with the paste event.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
      // just return, no preventDefault, no custom handling
      return;
    }

    // On Ctrl/⌘+C or Ctrl/⌘+X, *don't* preventDefault. Just redirect selection briefly.
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === 'c' || event.key.toLowerCase() === 'x')) {
      $clipboardBridge.focus({ preventScroll: true }); // Prevent browser from scrolling to textarea
      $clipboardBridge.select();
      return;
    }

    // Undo: Ctrl/⌘+Z (requires BuffeeHistory extension)
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      if (self.History) self.History.undo();
      return;
    }

    // Redo: Ctrl/⌘+Shift+Z (requires BuffeeHistory extension)
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && event.shiftKey) {
      event.preventDefault();
      if (self.History) self.History.redo();
      return;
    }

    const arrowCode = arrowMap[event.key] || 0;
    if (arrowCode) {
      // arrowCode: ±1 horizontal, ±2 vertical. direction: -1 (up/left), 1 (down/right)
      const direction = arrowCode >> 31 | 1;
      event.preventDefault(); // prevents page scroll
      if (Mode.interactive === -1) return; // read-only mode: no navigation

      if(event.metaKey) {
        if(!event.shiftKey && Selection.isSelection) Selection.makeCursor();
        if(event.shiftKey && !Selection.isSelection) Selection.makeSelection();

        if (arrowCode % 2) Selection[direction > 0 ? 'moveCursorEndOfLine' : 'moveCursorStartOfLine']();
      } else if (event.altKey) {
        if(!event.shiftKey && Selection.isSelection) Selection.makeCursor();
        if(event.shiftKey && !Selection.isSelection) Selection.makeSelection();

        if (arrowCode % 2) Selection[direction > 0 ? 'moveWord' : 'moveBackWord']();
      } else if (!event.shiftKey && Selection.isSelection) { // no meta key, no shift key, selection.
        if (arrowCode % 2) {
          Selection.setCursor(Selection.ordered[direction > 0 | 0]);
          render();
        } else {
          const edge = Selection.ordered[direction > 0 | 0];
          // edge.row is already absolute
          const targetAbsRow = $clamp(
            edge.row + direction,
            0,
            Model.lastIndex
          );

          // Scroll viewport if target is outside visible area
          if (targetAbsRow < Viewport.start) Viewport.start = targetAbsRow;
          else if (targetAbsRow > Viewport.end) Viewport.start = targetAbsRow - Viewport.size + 1;

          maxCol = Math.min(edge.col, Model.lines[targetAbsRow].length);
          Selection.setCursor({ row: targetAbsRow, col: maxCol});
          render();
        }
      } else { // no meta key.
        if (event.shiftKey && !Selection.isSelection) Selection.makeSelection();
        Selection[arrowCode % 2 ? 'moveCol' : 'moveRow'](direction);
      }
    } else if (Mode.interactive !== 1 || event.key === "Escape") { // navigation-only or read-only mode: no editing
    } else if (event.key === "Backspace") {
      Selection.delete();
    } else if (event.key === "Enter") {
      Selection.newLine();
    } else if (event.key === "Tab" ) {
      // Capture Tab for indentation (standard code editor behavior).
      // Users needing keyboard navigation can use browser shortcuts or focus the editor container.
      event.preventDefault();

      if(event.shiftKey) Selection.unindent();
      else if(Selection.isSelection) Selection.indent();
      else Selection.insert(" ".repeat(Mode.spaces));
    } else if (event.key.length == 1) {
      event.key === " " && event.preventDefault();
      Selection.insert(event.key);
    }
  });
}

/**
 * Clamps a value between a minimum and maximum, logging a warning if out of bounds.
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} The clamped value
 */
function $clamp(value, min, max) {
  return value < min ? min : ( value > max ? max : value);
}
