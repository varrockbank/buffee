/**
 * @fileoverview Buffee - A high-performance virtual buffer text editor for the browser.
 * Renders fixed-width character cells in a grid layout with virtual scrolling.
 * @version 6.1.3-alpha.1
 */

/**
 * @typedef {Object} BuffeeConfig
 * @property {number} [initialViewportSize=20] - Number of visible lines in the viewport
 * @property {number} [lineHeight=24] - Height of each line in pixels
 * @property {number} [editorPaddingPX=4] - Padding around the editor in pixels
 * @property {number} [indentation=4] - Number of spaces per indentation level
 * @property {string} [colorPrimary="#B2B2B2"] - Primary text color
 * @property {string} [colorSecondary="#212026"] - Secondary/background color for gutter and status
 * @property {number} [gutterSize=2] - Initial width of line number gutter in characters
 * @property {number} [gutterPadding=1] - Padding for the gutter in characters
 * @property {function(string): void} [logger=console] - Logger with log and warning methods
 * @property {boolean} [showGutter=true] - Whether to show line numbers
 * @property {boolean} [showStatusLine=true] - Whether to show the status line
 * @property {boolean} [autoFitViewport=false] - Automatically size viewport to fit container height
 * @property {BuffeeAdvancedConfig} [advanced={}] - Advanced configuration options
 */

/**
 * @typedef {Object} BuffeeAdvancedConfig
 * @property {string} [rightScrollBuffer='2ch'] - Extra space after line end for horizontal scrolling
 */

/**
 * @typedef {Object} Position
 * @property {number} row - Row index (viewport-relative, 0-indexed)
 * @property {number} col - Column index (0-indexed)
 */

/**
 * Creates a new Buffee virtual buffer editor instance.
 * @constructor
 * @param {HTMLElement} node - Container element with required child elements:
 *   - .wb-lines: Container for text lines
 *   - .wb-status: Status bar container
 *   - .wb-coordinate: Cursor position display
 *   - .wb-linecount: Line count display
 *   - .wb-indentation: Indentation display
 *   - .wb-clipboard-bridge: Hidden textarea for clipboard operations
 *   - .wb-gutter: Line number gutter
 * @param {BuffeeConfig} [config={}] - Configuration options
 * @example
 * const editor = new Buffee(document.getElementById('editor'), {
 *   initialViewportSize: 25,
 *   showGutter: true,
 *   lineHeight: 20
 * });
 * editor.Model.text = 'Hello, World!';
 */
function Buffee(node, config = {}) {
  this.version = "6.1.3-alpha.1";

  // Extract configuration with defaults
  const {
    initialViewportSize = 20,
    lineHeight = 24,
    editorPaddingPX = 4,
    indentation: initialIndentation = 4,
    expandtab: initialExpandtab = 4,
    colorPrimary = "#B2B2B2",
    colorSecondary = "#212026",
    gutterSize: initialGutterSize = 2,
    gutterPadding = 1,
    logger = console,
    showGutter = true,
    showStatusLine = true,
    autoFitViewport = false,
    advanced = {}
  } = config;

  // Advanced configuration with defaults
  const {
    rightScrollBuffer = '2ch'  // Extra space after line end for horizontal scrolling
  } = advanced;

  let gutterSize = initialGutterSize;
  let indentation = initialIndentation;
  let expandtab = initialExpandtab;

  /** Replaces tabs with spaces (expandtab = number of spaces, 0 = keep tabs) */
  const expandTabs = (s) => expandtab ? s.replace(/\t/g, ' '.repeat(expandtab)) : s;

  const $e = node.querySelector('.wb-lines');
  Object.assign($e.style, {
    lineHeight: lineHeight+'px',
    fontSize: lineHeight+'px',
    position: 'relative',
    margin: editorPaddingPX+'px',
    tabSize: expandtab || 4
  });

  // Layer z-indexes (from bottom to top):
  // - Selection: 100 (background highlights)
  // - Text: 200 (actual content)
  // - Cursor: 300 (visible above text)
  // - Elements: 400 (UI elements like buttons, prompts)
  const zIndexSelection = 100;
  const zIndexText = 200;
  const zIndexCursor = 300;
  const zIndexElements = 400;

  // Text layer - contains all pre elements for line content
  const $textLayer = document.createElement("div");
  $textLayer.className = "wb-layer-text";
  Object.assign($textLayer.style, {
    position: 'relative',
    zIndex: zIndexText,
    display: 'inline-block',  // Width based on content, not container
    minWidth: '100%',         // At least fill container
    paddingRight: rightScrollBuffer  // Extra space to allow scrolling past end of line
  });
  $e.appendChild($textLayer);

  // Element layer - for UI elements (buttons, prompts, etc.) added by extensions
  const $elementLayer = document.createElement("div");
  $elementLayer.className = "wb-layer-elements";
  Object.assign($elementLayer.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: zIndexElements,
    pointerEvents: 'none'  // Allow clicks to pass through to elements below
  });
  $e.appendChild($elementLayer);

  // Cursor layer - shows head position distinctly within a selection
  const $cursor = document.createElement("div");
  $cursor.className = "wb-cursor";
  Object.assign($cursor.style, {
    position: 'absolute',
    visibility: 'hidden',
    width: '1ch',
    height: lineHeight+'px',
    fontSize: lineHeight+'px',
    zIndex: zIndexCursor
  });
  $e.appendChild($cursor);

  const $status = node.querySelector('.wb-status');
  Object.assign($status.style, {
    padding: '6px',
    background: colorSecondary,
    color: colorPrimary,
    display: showStatusLine ? '' : 'none'
  });
  const $statusLineCoord = node.querySelector('.wb-coordinate');
  const $lineCounter = node.querySelector('.wb-linecount');
  const $indentation = node.querySelector('.wb-indentation');

  const $clipboardBridge = node.querySelector('.wb-clipboard-bridge');

  const $gutter = node.querySelector('.wb-gutter');
  Object.assign($gutter.style, {
    fontSize: lineHeight+'px',
    lineHeight: lineHeight+'px',
    textAlign: 'right',
    paddingTop: editorPaddingPX+'px',
    paddingRight: editorPaddingPX*2+'px',
    backgroundColor: colorSecondary,
    color: colorPrimary,
    width: gutterSize+gutterPadding+'ch',
    display: showGutter ? '' : 'none'
  });

  const $selections = [];   // We place an invisible selection on each viewport line. We only display the active selection.
  let lastDisplayLines = 0; // Track display lines for delta-based updates
  let renderExtraLine = false; // When autoFitViewport, render +1 line for partial space

  const fragmentLines = document.createDocumentFragment();
  const fragmentSelections = document.createDocumentFragment();
  const fragmentGutters = document.createDocumentFragment();

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
  const Selection = {
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
          head.row++;
          // Adjust column to fit new line's length
          const lineLen = Model.lines[head.row].length;
          head.col = Math.min(maxCol, lineLen);

          // Scroll viewport if cursor went below visible area
          if (head.row > Viewport.end) {
            Viewport.start = head.row - Viewport.size + 1;
          }
        }
        // else: at last line of file, No-Op
      } else {
        // Move up
        if (head.row > 0) {
          head.row--;
          // Adjust column to fit new line's length
          const lineLen = Model.lines[head.row].length;
          head.col = Math.min(maxCol, lineLen);

          // Scroll viewport if cursor went above visible area
          if (head.row < Viewport.start) {
            Viewport.start = head.row;
          }
        }
        // else: at first line of file, No-Op
      }
      render(true);
    },

    /**
     * Moves the cursor/selection head horizontally.
     * head.row is an ABSOLUTE line number (Model index).
     * Handles line wrapping when moving past line boundaries.
     * @param {number} value - Direction to move: 1 for right, -1 for left
     */
    moveCol(value) {
      if (value === 1) {
        const lineLen = Model.lines[head.row].length;
        if (head.col < lineLen) {                             // Move right 1 character (including to newline position).
          maxCol = ++head.col;
        } else {
          if (head.row < Model.lastIndex) {                   // Move to beginning of next line.
            maxCol = head.col = 0;
            head.row++;
            // Scroll viewport if cursor went below visible area
            if (head.row > Viewport.end) {
              Viewport.start = head.row - Viewport.size + 1;
            }
          }
          // else: at end of file, No-Op
        }
      } else if (value === -1) {
        if (head.col > 0) {                                   // Move left 1 character.
          maxCol = --head.col;
        } else {
          if (head.row > 0) {                                 // Move to end of previous line (on last char, not past it)
            head.row--;
            maxCol = head.col = Math.max(0, Model.lines[head.row].length - 1);
            // Scroll viewport if cursor went above visible area
            if (head.row < Viewport.start) {
              Viewport.start = head.row;
            }
          }
          // else: at start of file, No-Op
        }
      } else {
        logger.warning(`Do not support moving by multiple values (${value}) yet `);
      }
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
     * Sets cursor position with bounds checking for iOS compatibility.
     * Takes viewport-relative coordinates from touch input.
     * @param {Position} position - Target cursor position (viewport-relative)
     */
    iosSetCursorAndRender({row, col}) {
      const linesFromViewportStart = Model.lastIndex - Viewport.start;
      // Case 1: linesFromViewportStart is outside viewport. case 2: linesFromViewportStart is less than viewport.
      const lastMeaningfulViewportRow = Math.min(Viewport.size-1, linesFromViewportStart);
      row = Math.min(row, lastMeaningfulViewportRow);
      // Convert to absolute row
      const absRow = Viewport.start + row;
      // Cursor 1 past last character
      let positionOfLastChar = Model.lines[absRow].length;
      this.setCursor({
        row: absRow,
        col: Math.min(col, positionOfLastChar)}
      );
      render(true);
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
        const isLastLine = left.row === Model.lastIndex;
        const selectedText = text.slice(left.col, right.col + 1);

        // If selection extends to phantom newline position and there is a newline
        if (right.col >= text.length && !isLastLine) {
          return [selectedText, ''];  // Include empty string to represent newline
        }
        return [selectedText];
      } else {
        const firstLine = Model.lines[left.row].slice(left.col);
        const lastLine = Model.lines[right.row].slice(0, right.col + 1);
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
      let col = 0;
      const line = Model.lines[head.row];
      for(let i = 0; i < line.length; i++) {
        if(line.charAt(i) !== ' ') {
          col = i;
          break;
        }
      }
      maxCol = head.col = col < tail.col ? col : 0
      render(true);
    },

    /**
     * Moves cursor to end of current line.
     */
    moveCursorEndOfLine() {
      maxCol = head.col = Model.lines[head.row].length;
      render(true);
    },

    /**
     * Inserts multiple lines at cursor/selection, handling line breaks.
     * @param {string[]} lines - Array of lines to insert
     */
    insertLines(lines) {
      // Delegate to insert() which handles multi-line via History primitives
      this.insert(lines.join('\n'));
    },

    /**
     * Inserts a string at cursor position, replacing any selection.
     * @param {string} s - String to insert
     * @param {boolean} [skipRender=false] - Skip rendering (for batched operations)
     */
    insert(s, skipRender = false) {
      s = expandTabs(s);
      const t0 = performance.now();
      if (this.isSelection) {
        const [first, second] = this.ordered;

        // Get selected text before deleting
        const selectedText = this.lines.join('\n');

        // Delete selection, then insert new text (marked as combined for atomic undo)
        History._delete(first.row, first.col, selectedText);
        if (s.length > 0) {
          History._insert(first.row, first.col, s, true, true); // combined=true
        }

        // Update cursor to end of inserted text
        const insertedLines = s.split('\n');
        if (insertedLines.length === 1) {
          head.row = first.row;
          head.col = first.col + s.length;
        } else {
          head.row = first.row + insertedLines.length - 1;
          head.col = insertedLines[insertedLines.length - 1].length;
        }
        this.makeCursor();
      } else {
        History._insert(tail.row, tail.col, s);

        // Update cursor
        const insertedLines = s.split('\n');
        if (insertedLines.length === 1) {
          maxCol = head.col += s.length;
        } else {
          head.row += insertedLines.length - 1;
          maxCol = head.col = insertedLines[insertedLines.length - 1].length;
        }
      }
      if (!skipRender) render(true);
      const t1 = performance.now();
      const millis = parseFloat(t1 - t0);
      logger.log(`Took ${millis.toFixed(2)} millis to insert with ${Model.lines.length} lines. That's ${1000/millis} FPS.`);
    },

    /**
     * Deletes the character before cursor or the current selection.
     */
    delete() {
      if (this.isSelection) {
        return this.insert('');
      }

      const t0 = performance.now();

      if (tail.col > 0) {
        // Delete character before cursor
        const charToDelete = Model.lines[tail.row][tail.col - 1];
        History._delete(tail.row, tail.col - 1, charToDelete);
        head.col--;
      } else if (tail.row > 0) {
        // At start of line - delete newline (join with previous line)
        const prevLineLen = Model.lines[tail.row - 1].length;
        History._delete(tail.row - 1, prevLineLen, '\n');
        head.col = prevLineLen;
        head.row--;
        // Scroll viewport if cursor went above visible area
        if (head.row < Viewport.start) {
          Viewport.start = head.row;
        }
      }

      render(true);

      const t1 = performance.now();
      const millis = parseFloat(t1 - t0);
      logger.log(`Took ${millis.toFixed(2)} millis to delete with ${Model.lines.length} lines. That's ${1000/millis} FPS.`);
    },

    /**
     * Inserts a new line at cursor position, splitting the current line.
     */
    newLine() {
      if (this.isSelection) Selection.insert('', true); // skipRender - we render below

      const t0 = performance.now();

      // Insert newline character
      History._insert(tail.row, tail.col, '\n');

      // Move cursor to start of new line
      head.col = 0;
      head.row++;

      // Scroll viewport if cursor went below visible area
      if (head.row > Viewport.end) {
        Viewport.start = head.row - Viewport.size + 1;
      }

      render(true);
      const t1 = performance.now();
      const millis = parseFloat(t1 - t0);
      logger.log(`Took ${millis.toFixed(2)} millis to insert new line with ${Model.lines.length} lines. That's ${1000/millis} FPS.`);
    },

    /**
     * Moves cursor backward by one word.
     * Word boundaries are whitespace, word characters, or punctuation runs.
     */
    moveBackWord() {
      const s = Model.lines[head.row];
      const n = s.length;

      if(head.col === 0) {
        if(head.row > 0) {
          head.row--;
          head.col = Model.lines[head.row].length;
          // Scroll viewport if cursor went above visible area
          if (head.row < Viewport.start) {
            Viewport.start = head.row;
          }
        }
        // else: at first line of file - do nothing
      } else {
        const isSpace = ch => /\s/.test(ch);
        const isWord = ch => /[\p{L}\p{Nd}_]/u.test(ch);
        let j = head.col;
        if (isSpace(s[j])) { // Case 1: at whitespace → skip to next non-space character
          while (j > 0 && isSpace(s[j])) j--;
          while (j > 0 && isWord(s[j])) j--;
        } else if (isWord(s[j])) { // Case 2: at word-chars → consume word run to 1 past the word
          while (j > 0 && isWord(s[j])) j--;
        } else { // Case 3: at punctuation/symbols
          const c = s[j];
          j--;
          // Consuming continuous sequence of the same char
          while( j > 0 && s[j] === c) j--;
        }
        head.col = j;
      }

      render(true);
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
          // Not at last line - move to next line
          head.col = 0;
          head.row++;
          // Scroll viewport if cursor went below visible area
          if (head.row > Viewport.end) {
            Viewport.start = head.row - Viewport.size + 1;
          }
        }
        // else: at end of file - do nothing
      } else {
        const isSpace = ch => /\s/.test(ch);
        const isWord = ch => /[\p{L}\p{Nd}_]/u.test(ch);
        let j = head.col;
        if (isSpace(s[j])) { // Case 1: at whitespace → skip run to end of spaces, then next non-word
          while (j < n && isSpace(s[j])) j++;
          while (j < n && isWord(s[j])) j++;
        } else if (isWord(s[j])) { // Case 2: at word-chars → consume word run to 1 past the word
          while (j < n && isWord(s[j])) j++;
        } else { // Case 3: at punctuation/symbols
          const c = s[j];
          j++;
          // Consuming continuous sequence of the same char
          while( j < n && s[j] === c) j++;
        }
        head.col = j;
      }

      render(true);
    },

    /**
     * Indents all lines in the current selection by the configured indentation.
     * No-op if there is no selection.
     */
    indent() {
      if(!this.isSelection) return;
      const [first, second] = this.ordered;

      for(let i = first.row; i <= second.row; i++) {
          logger.log("Before: " + Model.lines[i]);
          Model.lines[i] = " ".repeat(indentation) + Model.lines[i];
          logger.log("After: " + Model.lines[i]);
      }
      first.col += indentation;
      second.col += indentation;

      render(true);
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
          const unindentationsFirstLine = Math.min(indentation,
            indentableSpacesLeftOfCursor + indentableSpacesFromCursor);
          Model.lines[cursor.row] = Model.lines[cursor.row].slice(unindentationsFirstLine);
          if(indentableSpacesFromCursor < unindentationsFirstLine)
            cursor.col -= unindentationsFirstLine - indentableSpacesFromCursor;
        } else {
          const line = Model.lines[i];
          let maxUnindent = 0;
          for(let k = 0; k < Math.min(indentation, line.length); k++) {
            if (line.charAt(0) === " ") {
              maxUnindent++;
            } else {
              break;
            }
          }
          Model.lines[i] = line.slice(maxUnindent);
        }
      }

      render(true);
    },

    /**
     * Partitions a line into left and right segments at the given position.
     * @param {Position} position - Position to partition at (absolute row)
     * @returns {{index: number, left: string, right: string, rightExclusive: string}}
     *   - index: Absolute line index in Model.lines
     *   - left: Text before the column
     *   - right: Text from the column onwards
     *   - rightExclusive: Text after the column (excludes character at column)
     */
    partitionLine({ row, col }) {
      const line = Model.lines[row];
      return {
        index: row,
        left: line.slice(0, col),
        right: line.slice(col),
        // In the case where the partitioning point is a selection, we exclude the character
        // at th cursor
        rightExclusive: line.slice(col+1)
      }
    }
  };

  // ============================================================================
  // Extension hooks - allows extensions to hook into vbuf without vbuf knowing about them
  // ============================================================================

  /**
   * Render hooks that extensions can register callbacks with.
   * @type {Object}
   */
  const renderHooks = {
    /** Called when the viewport container is rebuilt (for setting up DOM elements) */
    onContainerRebuild: [],
    /** Called during render after text content is set (for overlaying elements) */
    onRenderContent: [],
    /** Called at the end of render (for highlights and final touches) */
    onRenderComplete: []
  };

  /**
   * Editor mode: 'write' (full editing), 'navigate' (read + arrow keys), 'read' (view only)
   * @type {'write'|'navigate'|'read'}
   */
  let editMode = 'write';

  /**
   * Document model managing text content.
   * @namespace Model
   */
  const Model = {
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
      render(true);
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

    /**
     * Appends lines to the end of the document.
     * @param {string[]} newLines - Lines to append
     * @param {boolean} [skipRender=false] - Whether to skip re-rendering
     */
    appendLines(newLines, skipRender = false) {
      this.lines.push(...newLines.map(expandTabs));
      if (!skipRender) render();
    },
  }

  /**
   * Edit history for undo/redo operations.
   * Uses primitive insert/delete operations that can be inverted.
   * @namespace History
   */
  const History = {
    /** @type {Array} Stack of operations for undo */
    undoStack: [],
    /** @type {Array} Stack of undone operations for redo */
    redoStack: [],
    /** @type {number} Timestamp of last operation for coalescing */
    _lastOpTime: 0,
    /** @type {number} Max ms between ops to coalesce */
    coalesceTimeout: 500,

    /** Capture current cursor/selection state */
    _captureCursor() {
      return {
        headRow: head.row, headCol: head.col,
        tailRow: tail.row, tailCol: tail.col
      };
    },

    /** Restore cursor/selection state */
    _restoreCursor(cursor) {
      head.row = cursor.headRow;
      head.col = cursor.headCol;
      tail.row = cursor.tailRow;
      tail.col = cursor.tailCol;
    },

    /** Check if we can coalesce with the last operation */
    _canCoalesce(type, row, col, text) {
      if (this.undoStack.length === 0) return false;
      if (Date.now() - this._lastOpTime > this.coalesceTimeout) return false;

      const last = this.undoStack[this.undoStack.length - 1];
      if (last.type !== type) return false;
      if (text.includes('\n') || last.text.includes('\n')) return false;

      if (type === 'insert') {
        // Can coalesce if inserting right after the last insert
        return last.row === row && last.col + last.text.length === col;
      } else {
        // Can coalesce backspace if deleting right before the last delete
        return last.row === row && col + text.length === last.col;
      }
    },

    /**
     * Primitive insert operation. Inserts text at position, handling newlines.
     * @param {number} row - Row index (absolute, not viewport-relative)
     * @param {number} col - Column index
     * @param {string} text - Text to insert (may contain newlines)
     * @param {boolean} [recordHistory=true] - Whether to record in undo stack
     * @param {boolean} [combined=false] - Mark as combined with previous operation (undo/redo together)
     */
    _insert(row, col, text, recordHistory = true, combined = false) {
      if (text.length === 0) return;

      const cursorBefore = recordHistory ? this._captureCursor() : null;

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

      if (recordHistory) {
        if (this._canCoalesce('insert', row, col, text)) {
          // Merge with last operation
          const last = this.undoStack[this.undoStack.length - 1];
          last.text += text;
        } else {
          this.undoStack.push({ type: 'insert', row, col, text, cursorBefore, combined });
        }
        this._lastOpTime = Date.now();
        this.redoStack = [];
      }
    },

    /**
     * Primitive delete operation. Deletes text at position, handling newlines.
     * @param {number} row - Row index (absolute, not viewport-relative)
     * @param {number} col - Column index
     * @param {string} text - Text to delete (must match what's at position, may contain newlines)
     * @param {boolean} [recordHistory=true] - Whether to record in undo stack
     * @param {boolean} [combined=false] - Mark as combined with previous operation (undo/redo together)
     */
    _delete(row, col, text, recordHistory = true, combined = false) {
      if (text.length === 0) return;

      const cursorBefore = recordHistory ? this._captureCursor() : null;

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

      if (recordHistory) {
        if (this._canCoalesce('delete', row, col, text)) {
          // Merge with last operation (prepend since backspace goes backwards)
          const last = this.undoStack[this.undoStack.length - 1];
          last.text = text + last.text;
          last.col = col;
        } else {
          this.undoStack.push({ type: 'delete', row, col, text, cursorBefore, combined });
        }
        this._lastOpTime = Date.now();
        this.redoStack = [];
      }
    },

    /**
     * Undo a single operation (internal helper).
     * @param {Object} op - Operation to undo
     * @returns {Object} Operation with cursorAfter for redo
     */
    _undoOp(op) {
      const cursorBefore = this._captureCursor();

      // Apply inverse operation without recording to history
      if (op.type === 'insert') {
        this._delete(op.row, op.col, op.text, false);
      } else if (op.type === 'delete') {
        this._insert(op.row, op.col, op.text, false);
      }

      return { ...op, cursorAfter: cursorBefore };
    },

    /**
     * Undo the last operation.
     * @returns {boolean} True if an operation was undone
     */
    undo() {
      if (this.undoStack.length === 0) return false;

      const op = this.undoStack.pop();
      const undoneOp = this._undoOp(op);
      this.redoStack.push(undoneOp);

      // If this operation was combined with the previous, undo that too
      if (op.combined && this.undoStack.length > 0) {
        const prevOp = this.undoStack.pop();
        const undonePrevOp = this._undoOp(prevOp);
        this.redoStack.push(undonePrevOp);
        // Restore cursor to before the first (delete) operation
        this._restoreCursor(prevOp.cursorBefore);
      } else {
        // Restore cursor to before the original operation
        this._restoreCursor(op.cursorBefore);
      }

      render(true);
      return true;
    },

    /**
     * Redo a single operation (internal helper).
     * @param {Object} op - Operation to redo
     */
    _redoOp(op) {
      // Re-apply operation without recording to history
      if (op.type === 'insert') {
        this._insert(op.row, op.col, op.text, false);
      } else if (op.type === 'delete') {
        this._delete(op.row, op.col, op.text, false);
      }
      this.undoStack.push(op);
    },

    /**
     * Redo the last undone operation.
     * @returns {boolean} True if an operation was redone
     */
    redo() {
      if (this.redoStack.length === 0) return false;

      const op = this.redoStack.pop();
      this._redoOp(op);

      // If next operation is combined, redo that too
      if (this.redoStack.length > 0 && this.redoStack[this.redoStack.length - 1].combined) {
        const nextOp = this.redoStack.pop();
        this._redoOp(nextOp);
        // Restore cursor to after the second (insert) operation
        if (nextOp.cursorAfter) {
          this._restoreCursor(nextOp.cursorAfter);
        }
      } else {
        // Restore cursor to after the original operation
        if (op.cursorAfter) {
          this._restoreCursor(op.cursorAfter);
        }
      }

      render(true);
      return true;
    },

    /**
     * Clear all history.
     */
    clear() {
      this.undoStack = [];
      this.redoStack = [];
    },
  }

  /**
   * Viewport management for virtual scrolling.
   * Controls which portion of the document is currently visible.
   * @namespace Viewport
   */
  const Viewport = {
    /** @type {number} Index of the first visible line (0-indexed) */
    start: 0,
    /** @type {number} Number of visible lines */
    size: autoFitViewport ? 0 : initialViewportSize,

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
      const t0 = performance.now();
      this.start += i;
      this.start = $clamp(this.start, 0, Model.lastIndex);
      render();
      const t1 = performance.now();
      const millis = parseFloat(t1 - t0);
      const lineCount = Model.lines.length;
      logger.log(`Took ${millis.toFixed(2)} millis to scroll viewport with ${lineCount} lines. That's ${1000/millis} FPS.`);
    },

    /**
     * Sets the viewport position and size.
     * @param {number} start - Line number to start at (1-indexed for user display)
     * @param {number} size - Number of lines to display
     */
    set(start, size) {
      this.start = $clamp(start-1, 0, Model.lastIndex);
      if(this.size !== size) {
        this.size = size;
        render(true);
      } else {
        render();
      }
    },

    /**
     * Gets the lines currently visible in the viewport.
     * @returns {string[]} Array of visible line contents
     */
    get lines() {
      return Model.lines.slice(this.start, this.end + 1);
    },
  };

  /** @private Tracks last render state for optimization */
  const lastRender = {
    lineCount: -1
  };

  /**
   * Creates and appends selection overlay elements for viewport rows [fromIndex, toIndex).
   * @private
   */
  function addSelections(fromIndex, toIndex) {
    for (let i = fromIndex; i < toIndex; i++) {
      const sel = document.createElement("div");
      sel.className = "wb-selection";
      Object.assign(sel.style, {
        display: 'block',
        visibility: 'hidden',
        width: '1ch',
        height: lineHeight+'px',
        fontSize: lineHeight+'px',
        top: i * lineHeight+'px'
      });
      $selections[i] = fragmentSelections.appendChild(sel);
    }
    $e.appendChild(fragmentSelections);
  }

  /**
   * Renders the editor viewport, selection, and calls extension hooks.
   * @private
   * @param {boolean} [renderLineContainers=false] - Whether to rebuild line containers
   *   (needed when viewport size changes or on initial render)
   * @returns {Buffee} The Buffee instance for chaining
   */
  function render(renderLineContainers = false) {
    if (lastRender.lineCount !== Model.lastIndex + 1 ) {
      const lineCount = lastRender.lineCount = Model.lastIndex + 1;
      $lineCounter.textContent = `${lineCount.toLocaleString()}L, originally: ${Model.originalLineCount}L ${Model.byteCount} bytes`;
    }

    // Use total line count so gutter doesn't resize while scrolling
    // Minimum of 2 digits to avoid resize jitter for small documents (1-99 lines)
    const digitsInLargestLineNumber = Math.max(2, Model.lines.length.toString().length);
    if(digitsInLargestLineNumber !== gutterSize) {
      gutterSize = digitsInLargestLineNumber;
      $gutter.style.width = gutterSize + gutterPadding + 'ch';
    }

    // Display size includes extra partial line when autoFitViewport
    const displayLines = Viewport.size + (renderExtraLine ? 1 : 0);

    $gutter.textContent = null;
    for (let i = 0; i < displayLines; i++) {
      const div = document.createElement("div")
      div.textContent = Viewport.start + i + 1;
      fragmentGutters.appendChild(div);
    }

    $gutter.appendChild(fragmentGutters);

    // Renders the containers for the viewport lines, as well as selections and highlights
    // Only adds/removes the delta of elements when viewport size changes
    if(renderLineContainers) {
      const delta = displayLines - lastDisplayLines;

      if (delta > 0) {
        // Add new line containers and selections
        for (let i = 0; i < delta; i++) {
          fragmentLines.appendChild(document.createElement("pre"));
        }
        $textLayer.appendChild(fragmentLines);
        addSelections(lastDisplayLines, displayLines);
      } else if (delta < 0) {
        // Remove excess line containers and selections
        for (let i = 0; i < -delta; i++) {
          $textLayer.lastChild?.remove();
          $selections.pop()?.remove();
        }
      }

      lastDisplayLines = displayLines;

      // Call extension hooks for container rebuild
      for (const hook of renderHooks.onContainerRebuild) {
        hook($e, Viewport);
      }
    }

    // Update contents of line containers
    for(let i = 0; i < displayLines; i++) {
      const lineIndex = Viewport.start + i;
      $textLayer.children[i].textContent = Model.lines[lineIndex] ?? null;
    }

    // Call extension hooks for content overlay
    for (const hook of renderHooks.onRenderContent) {
      hook($e, Viewport);
    }

    // * BEGIN render selection
    // Hide all selections
    for (let i = 0; i < $selections.length; i++) {
      $selections[i].style.visibility = 'hidden';
    }
    const [firstEdge, secondEdge] = Selection.ordered;

    // Convert absolute rows to viewport-relative
    const firstViewportRow = firstEdge.row - Viewport.start;
    const secondViewportRow = secondEdge.row - Viewport.start;

    // Render middle selection lines (only those within viewport)
    for (let absRow = firstEdge.row + 1; absRow <= secondEdge.row - 1; absRow++) {
      const viewportRow = absRow - Viewport.start;
      if (viewportRow >= 0 && viewportRow < Viewport.size) {
        $selections[viewportRow].style.visibility = 'visible';
        $selections[viewportRow].style.left = 0;
        const content = Model.lines[absRow];
        // +1 for phantom newline character (shows newline is part of selection)
        $selections[viewportRow].style.width = (content.length + 1) + 'ch';
      }
    }

    // Render the first edge line (if within viewport)
    if (firstViewportRow >= 0 && firstViewportRow < Viewport.size) {
      $selections[firstViewportRow].style.left = firstEdge.col + 'ch';

      if (secondEdge.row === firstEdge.row) {
        // Single-line selection
        let width = secondEdge.col - firstEdge.col + 1;
        const text = Model.lines[firstEdge.row];
        const isLastLine = firstEdge.row === Model.lastIndex;

        // When selecting backwards from EOL position, don't show phantom newline
        if (!Selection.isForwardSelection && secondEdge.col > firstEdge.col && secondEdge.col >= text.length) {
          width--;
        }
        // When on last line (no newline exists), clamp width to actual text
        else if (isLastLine && secondEdge.col >= text.length && firstEdge.col < secondEdge.col) {
          width = Math.min(width, text.length - firstEdge.col);
        }

        $selections[firstViewportRow].style.width = width + 'ch';
        $selections[firstViewportRow].style.visibility = 'visible';
      } else {
        // Multi-line selection - first line
        const text = Model.lines[firstEdge.row];
        // +1 for phantom newline character
        $selections[firstViewportRow].style.width = (text.length - firstEdge.col + 1) + 'ch';
        $selections[firstViewportRow].style.visibility = 'visible';
      }
    }

    // Render the second edge line (if within viewport and multi-line selection)
    if (secondEdge.row !== firstEdge.row && secondViewportRow >= 0 && secondViewportRow < Viewport.size) {
      const text = Model.lines[secondEdge.row];
      const isLastLine = secondEdge.row === Model.lastIndex;

      $selections[secondViewportRow].style.left = '0';  // Last line of selection starts from column 0

      let width;
      if (secondEdge.col >= text.length && !isLastLine) {
        // Selection extends to phantom newline position, and there is a newline
        width = text.length + 1;
      } else {
        width = Math.min(secondEdge.col + 1, text.length);
      }
      $selections[secondViewportRow].style.width = width + 'ch';
      $selections[secondViewportRow].style.visibility = 'visible';
    }
    // * END render selection

    // Render cursor overlay (always shows head position)
    const headViewportRow = head.row - Viewport.start;
    if (headViewportRow >= 0 && headViewportRow < Viewport.size) {
      $cursor.style.top = headViewportRow * lineHeight + 'px';
      $cursor.style.left = head.col + 'ch';
      $cursor.style.visibility = 'visible';

      // Horizontal scroll to keep cursor in view
      const containerRect = $e.getBoundingClientRect();
      const cursorRect = $cursor.getBoundingClientRect();
      const charWidth = cursorRect.width || 14;

      if (cursorRect.left < containerRect.left) {
        const deficit = containerRect.left - cursorRect.left;
        const charsToScroll = Math.ceil(deficit / charWidth);
        $e.scrollLeft -= charsToScroll * charWidth;
      } else if (cursorRect.right > containerRect.right) {
        const deficit = cursorRect.right - containerRect.right;
        const charsToScroll = Math.ceil(deficit / charWidth);
        $e.scrollLeft += charsToScroll * charWidth;
      }
      // Snap to character boundary to prevent accumulated drift
      $e.scrollLeft = Math.round($e.scrollLeft / charWidth) * charWidth;
    } else {
      $cursor.style.visibility = 'hidden';
    }

    // Call extension hooks for render complete
    for (const hook of renderHooks.onRenderComplete) {
      hook($e, Viewport);
    }

    $statusLineCoord.innerHTML = `Ln ${head.row + 1}, Col ${tail.col + 1}`;
  
    return this;
  }

  // ============================================================================
  // Public API - exposed on the Buffee instance
  // ============================================================================

  /**
   * Viewport management API.
   * @type {Object}
   */
  this.Viewport = Viewport;

  /**
   * Document model API.
   * @type {Object}
   */
  this.Model = Model;

  /**
   * Selection and cursor management API.
   * @type {Object}
   */
  this.Selection = Selection;

  /**
   * Edit history for undo/redo operations.
   * @type {Object}
   */
  this.History = History;

  /**
   * Registers an extension with this editor instance.
   * @param {Function} extension - Extension initializer function
   * @param {Object} [options] - Optional configuration for the extension
   * @returns {Buffee} This editor instance for chaining
   * @example
   * const editor = new Buffee(element)
   *   .use(BuffeeSyntax)
   *   .use(BuffeeElementals)
   */
  this.use = (extension, options) => {
    extension(this, options);
    return this;
  };

  /**
   * Editor mode controlling input behavior.
   * - 'write': Full editing (default)
   * - 'navigate': View and navigate with arrow keys, no editing
   * - 'read': View only, no navigation or editing
   * @type {'write'|'navigate'|'read'}
   */
  Object.defineProperty(this, 'editMode', {
    get: () => editMode,
    set: (value) => { editMode = value; },
    enumerable: true
  });

  /**
   * Line height in pixels. Used for positioning elements and calculating viewport.
   * @type {number}
   * @readonly
   * @warning Do not modify - changing this value will cause rendering issues.
   */
  this.lineHeight = lineHeight;

  /**
   * Number of spaces per indentation level.
   * @type {number}
   */
  Object.defineProperty(this, 'indentation', {
    get: () => indentation,
    set: (value) => {
      indentation = value;
      $indentation.innerHTML = `Spaces: ${indentation}`;
    },
    enumerable: true
  });
  this.indentation = indentation; // trigger setter to initialize display

  Object.defineProperty(this, 'expandtab', {
    get: () => expandtab,
    set: (value) => {
      expandtab = value;
      $e.style.tabSize = expandtab || 4;
    },
    enumerable: true
  });

  /**
   * Internal API for extensions.
   * Extensions can use renderHooks to register callbacks.
   * @private
   */
  this._internals = {
    get head() { return head; },
    $e,
    $textLayer,
    $elementLayer,
    render,
    renderHooks,
    zIndex: { selection: zIndexSelection, text: zIndexText, cursor: zIndexCursor, elements: zIndexElements }
  };

  /**
   * Appends a line at the end of the document and scrolls to show it.
   * @deprecated Use Model.appendLines instead
   * @param {string} s - Line to append
   */
  this.appendLineAtEnd = (s) => {
    s = expandTabs(s);
    if(Model.lines[0] == '') {
      Model.lines[0] = s;
    } else {
      Model.lines[Model.lines.length] = s;
    }
   
    Viewport.start = Math.max(0, Model.lines.length - Viewport.size - 1);
    render(true);
  };

  // Auto-fit viewport to container height
  if (autoFitViewport) {
    const $status = node.querySelector('.wb-status');
    const fitViewport = () => {
      const statusHeight = showStatusLine && $status ? $status.offsetHeight : 0;
      const availableHeight = node.clientHeight - statusHeight - (editorPaddingPX * 2);
      const exactLines = availableHeight / lineHeight;
      const newSize = Math.floor(exactLines);
      const hasPartialSpace = exactLines > newSize;
      if (newSize > 0 && (newSize !== Viewport.size || hasPartialSpace !== renderExtraLine)) {
        Viewport.size = newSize;
        renderExtraLine = hasPartialSpace;
        render(true);
      }
    };
    // Use requestAnimationFrame to ensure layout is complete before measuring
    requestAnimationFrame(fitViewport);
    new ResizeObserver(fitViewport).observe(node);
  } else {
    render(true);
  }

  // Reading clipboard from the keydown listener involves a different security model.
  node.addEventListener('paste', e => {
    e.preventDefault(); // stop browser from inserting raw clipboard text
    const text = e.clipboardData.getData("text/plain");
    if (text) {
      Selection.insertLines(text.split("\n"));
    }
  });

  // Triggered by a keydown paste event. a copy event handler can read the clipboard
  // by the standard security model. Meanwhile, we don't have to make the editor "selectable".
  node.addEventListener('copy', e => {
    e.preventDefault();                    // take over the clipboard contents
    e.clipboardData.setData('text/plain', Selection.lines.join("\n"));
  });

  // Bind keyboard control to move viewport
  node.addEventListener('keydown', event => {
    // Do nothing for Meta+V (on Mac) or Ctrl+V (on Windows/Linux) as to avoid conflict with the paste event.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
      // just return, no preventDefault, no custom handling
      return;
    }

    // On Ctrl/⌘+C, *don't* preventDefault. Just redirect selection briefly.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      $clipboardBridge.focus({ preventScroll: true }); // Prevent browser from scrolling to textarea
      $clipboardBridge.select();
      return;
    }

    // Undo: Ctrl/⌘+Z
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      History.undo();
      return;
    }

    // Redo: Ctrl/⌘+Shift+Z
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && event.shiftKey) {
      event.preventDefault();
      History.redo();
      return;
    }

    if(event.key.startsWith("Arrow")) {
      event.preventDefault(); // prevents page scroll
      if (editMode === 'read') return; // read mode: no navigation

      if(event.metaKey) {
        if(!event.shiftKey && Selection.isSelection) Selection.makeCursor();
        if(event.shiftKey && !Selection.isSelection) Selection.makeSelection();

        if(event.key === "ArrowLeft") {
          Selection.moveCursorStartOfLine();
        } else if (event.key === "ArrowRight") {
          Selection.moveCursorEndOfLine();
        }
      } else if (event.altKey) {
        if(!event.shiftKey && Selection.isSelection) Selection.makeCursor();
        if(event.shiftKey && !Selection.isSelection) Selection.makeSelection();

        if(event.key === "ArrowLeft") {
          Selection.moveBackWord();
        } else if (event.key === "ArrowRight") {
          Selection.moveWord();
        }
      } else if (!event.shiftKey && Selection.isSelection) { // no meta key, no shift key, selection.
        if(event.key === "ArrowLeft") {
          Selection.setCursor(Selection.ordered[0]); // Move cursor to the first edge
          render(true);
        } else if (event.key === "ArrowRight") {
          Selection.setCursor(Selection.ordered[1]); // Move cursor to the second edge
          render(true);
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          const movingDown = event.key === "ArrowDown";
          const edge = Selection.ordered[movingDown ? 1 : 0];
          // edge.row is already absolute
          const targetAbsRow = $clamp(
            edge.row + (movingDown ? 1 : -1),
            0,
            Model.lastIndex
          );

          // Scroll viewport if target is outside visible area
          if (targetAbsRow < Viewport.start) {
            Viewport.start = targetAbsRow;
          } else if (targetAbsRow > Viewport.end) {
            Viewport.start = targetAbsRow - Viewport.size + 1;
          }

          const targetCol = Math.min(edge.col, Model.lines[targetAbsRow].length);
          maxCol = targetCol;
          Selection.setCursor({
            row: targetAbsRow,
            col: targetCol
          });
          render(true);
        }
      } else { // no meta key.
        if (event.shiftKey && !Selection.isSelection) Selection.makeSelection();

        if (event.key === "ArrowDown") {
          Selection.moveRow(1);
        } else if (event.key === "ArrowUp") {
          Selection.moveRow(-1);
        } else if (event.key === "ArrowLeft") {
          Selection.moveCol(-1);
        } else if (event.key === "ArrowRight") {
          Selection.moveCol(1);
        }
      }
    } else if (editMode !== 'write') { // navigate/read mode: no editing
      return;
    } else if (event.key === "Backspace") {
      Selection.delete();
    } else if (event.key === "Enter") {
      Selection.newLine();
    } else if (event.key === "Escape") {
    } else if (event.key === "Tab" ) {
      // Capture Tab for indentation (standard code editor behavior).
      // Users needing keyboard navigation can use browser shortcuts or focus the editor container.
      event.preventDefault();

      if(Selection.isSelection) {
        if(event.shiftKey) {
          Selection.unindent();
        } else {
          Selection.indent();
        }
      } else {
        if(event.shiftKey) {
          Selection.unindent();
        } else {
          Selection.insert(" ".repeat(expandtab));
        }
      }
    } else if (event.key.length > 1) {
      logger.warn('Ignoring unknown key: ', event.code, event.key);
    } else if (event.key === "Shift") {
    } else if (event.key === " ") {
      event.preventDefault();
      Selection.insert(" ");
    } else {
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
  if (value < min) {
    logger.warn("Out of bounds");
    return min;
  }
  if (value > max) {
    logger.warn("Out of bounds");
    return max;
  }
  return value;
}
