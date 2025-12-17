/**
 * @fileoverview BuffeeTUI - Terminal User Interface extension for Buffee.
 * Provides interactive UI elements like buttons, prompts, and scrollboxes.
 * @version 1.0.0
 */

/**
 * @typedef {Object} TUIElement
 * @property {number} id - Unique element identifier
 * @property {string} type - Element type: 'button', 'prompt', or 'scrollbox'
 * @property {number} row - Absolute row position in the buffer
 * @property {number} col - Column position
 * @property {number} width - Element width in characters
 * @property {number} height - Element height in lines
 * @property {string[]} contents - Array of strings representing each line of the element
 * @property {function(TUIElement): void} [onActivate] - Callback when element is activated
 * @property {string} input - Current input text (for prompts)
 * @property {string} title - Title text (for prompts and scrollboxes)
 * @property {string[]} contentLines - Scrollable content (for scrollboxes)
 * @property {number} scrollOffset - Current scroll position (for scrollboxes)
 */

/**
 * Initializes TUI (Terminal User Interface) mode for a Buffee instance.
 * When enabled, editing is disabled and navigation between elements is active.
 *
 * @param {Buffee} vbuf - The Buffee instance to extend with TUI functionality
 * @returns {Object} The TUI API object
 * @example
 * const editor = new Buffee(document.getElementById('editor'));
 * const TUI = BuffeeTUI(editor);
 * TUI.addButton({ row: 0, col: 0, label: 'Click me', onActivate: () => alert('clicked') });
 * TUI.enabled = true;
 */
function BuffeeTUI(vbuf) {
  const { head, $e, render, renderHooks } = vbuf._internals;
  const { Viewport, Selection, Model, lineHeight } = vbuf;

  /** @type {boolean} */
  let tuiModeEnabled = false;
  /** @type {number} */
  let tuiElementIdCounter = 0;
  /** @type {boolean} */
  let tuiHighlightState = true;
  /** @type {TUIElement[]} */
  const tuiElements = [];
  /** @type {Map<number, TUIElement[]>} */
  const tuiElementsByRow = new Map();
  /** @type {boolean} Dirty flag - when true, TUI needs re-rendering */
  let tuiDirty = false;
  /** @type {Map<number, HTMLDivElement[]>} Map from viewport row to array of highlight elements */
  const $highlights = new Map();

  /**
   * Creates a highlight element for TUI at a specific viewport row.
   * @private
   * @param {number} viewportRow - The viewport row index
   * @returns {HTMLDivElement} The highlight element
   */
  function createHighlightElement(viewportRow) {
    const hl = document.createElement("div");
    hl.className = "wb-highlight";
    Object.assign(hl.style, {
      display: 'block',
      visibility: 'hidden',
      width: '1ch',
      height: lineHeight+'px',
      fontSize: lineHeight+'px',
      top: viewportRow * lineHeight+'px',
      left: '0ch',
      backgroundColor: '#EDAD10',
      position: 'absolute',
      mixBlendMode: 'difference'
    });
    return hl;
  }

  /**
   * Adds an additional highlight element for a viewport row.
   * @private
   * @param {number} viewportRow - The viewport row index
   * @returns {HTMLDivElement} The new highlight element
   */
  function addHighlightForRow(viewportRow) {
    const hl = createHighlightElement(viewportRow);
    $e.appendChild(hl);
    if (!$highlights.has(viewportRow)) {
      $highlights.set(viewportRow, []);
    }
    $highlights.get(viewportRow).push(hl);
    return hl;
  }

  /**
   * Marks TUI as dirty, will be rendered on next frame.
   * @private
   */
  function markTuiDirty() {
    tuiDirty = true;
  }

  /**
   * TUI render loop - runs at 60fps, renders if dirty.
   * @private
   */
  function tuiRenderLoop() {
    if (tuiDirty) {
      tuiDirty = false;
      render(true);
    }
    requestAnimationFrame(tuiRenderLoop);
  }
  // Start the render loop
  requestAnimationFrame(tuiRenderLoop);

  /**
   * Adds a TUI element at the specified coordinate.
   * Width and height are derived from contents - all content lines must have same length.
   * @private
   * @param {Object} params - Element parameters
   * @param {string} params.type - Element type ('button', 'prompt', 'scrollbox')
   * @param {number} params.row - Absolute row position
   * @param {number} params.col - Column position
   * @param {string[]} params.contents - Array of strings for each line of the element
   * @param {function(TUIElement): void} [params.onActivate] - Activation callback
   * @returns {number} The element ID
   * @throws {Error} If contents is empty or lines have inconsistent lengths
   * @throws {Error} If element overlaps with existing element
   */
  function addElement({ type, row, col, contents, onActivate }) {
    if (!contents || contents.length === 0) {
      throw new Error('Element must have at least one content line');
    }

    const height = contents.length;
    const width = contents[0].length;

    // Validate all lines have the same length
    for (let i = 1; i < contents.length; i++) {
      if (contents[i].length !== width) {
        throw new Error(`Content line ${i} has length ${contents[i].length}, expected ${width}`);
      }
    }

    const newStart = col;
    const newEnd = col + width;

    // Check for overlaps on this row
    const rowElements = tuiElementsByRow.get(row) || [];
    for (const el of rowElements) {
      const elEnd = el.col + el.width;
      if (newStart < elEnd && newEnd > el.col) {
        throw new Error(`Element overlaps with existing element at row ${row}, col ${el.col}`);
      }
    }

    const id = ++tuiElementIdCounter;
    const element = {
      id, type, row, col, width, height, contents,
      onActivate: onActivate || null,
      input: '',           // For prompts
      title: '',           // For prompts and scrollboxes
      contentLines: [],    // For scrollboxes
      scrollOffset: 0      // For scrollboxes
    };
    tuiElements.push(element);

    // Add to row map
    if (!tuiElementsByRow.has(row)) {
      tuiElementsByRow.set(row, []);
    }
    tuiElementsByRow.get(row).push(element);

    render(true);
    return id;
  }

  /**
   * Builds the visual contents for a prompt element.
   * @private
   * @param {number} width - Total width of the prompt box
   * @param {string} title - Title displayed in the top border
   * @param {string} input - Current input text
   * @returns {string[]} Array of 3 strings representing the prompt box lines
   */
  function buildPromptContents(width, title, input) {
    const dashesAfterTitle = width - 5 - title.length;
    const line1 = '┌─ ' + title + ' ' + '─'.repeat(dashesAfterTitle) + '┐';

    // Line 2: │ > input     │
    const maxInputLen = width - 5; // space for "│ > " and "│"
    const displayInput = input.length > maxInputLen ? input.slice(-maxInputLen) : input;
    const padding = ' '.repeat(maxInputLen - displayInput.length);
    const line2 = '│ > ' + displayInput + padding + '│';

    const line3 = '└' + '─'.repeat(width - 2) + '┘';

    return [line1, line2, line3];
  }

  /**
   * Builds the visual contents for a scrollbox element.
   * @private
   * @param {number} width - Total width of the scrollbox
   * @param {number} height - Total height of the scrollbox
   * @param {string} title - Title displayed in the top border
   * @param {string[]} lines - All scrollable content lines
   * @param {number} scrollOffset - Current scroll position (first visible line index)
   * @returns {string[]} Array of strings representing the scrollbox lines
   */
  function buildScrollBoxContents(width, height, title, lines, scrollOffset) {
    const contents = [];
    const contentWidth = width - 2; // space inside │ │
    const contentHeight = height - 2; // lines between top and bottom border

    // Line 1: ┌─ title ─────┐
    const dashesAfterTitle = width - 5 - title.length;
    contents.push('┌─ ' + title + ' ' + '─'.repeat(dashesAfterTitle) + '┐');

    // Content lines
    for (let i = 0; i < contentHeight; i++) {
      const lineIndex = scrollOffset + i;
      const lineContent = lines[lineIndex] || '';
      // Truncate or pad to fit contentWidth
      const displayContent = lineContent.length > contentWidth
        ? lineContent.slice(0, contentWidth)
        : lineContent + ' '.repeat(contentWidth - lineContent.length);
      contents.push('│' + displayContent + '│');
    }

    // Bottom border with scroll percentage
    const maxOffset = Math.max(0, lines.length - contentHeight);
    const percent = maxOffset === 0 ? 100 : Math.round((scrollOffset / maxOffset) * 100);
    const percentStr = ' ' + percent + '% ';
    const dashesTotal = width - 2 - percentStr.length; // minus corners and percent string
    const dashesLeft = dashesTotal - 1; // leave 1 dash before corner
    contents.push('└' + '─'.repeat(dashesLeft) + percentStr + '─┘');

    return contents;
  }

  /**
   * TUI (Terminal User Interface) mode API.
   * Provides methods for creating interactive terminal-style UI elements.
   * When enabled, editing is disabled and navigation between elements is active.
   * @namespace TUI
   */
  const TUI = {
    /**
     * Whether TUI mode is currently enabled.
     * When set to true, cursor moves to first element if not already on one.
     * @type {boolean}
     */
    get enabled() { return tuiModeEnabled; },
    set enabled(value) {
      const wasEnabled = tuiModeEnabled;
      tuiModeEnabled = !!value;
      // Tell vbuf to disable/enable navigation
      vbuf.editMode = tuiModeEnabled ? 'read' : 'write';
      // Move cursor to first element only when transitioning to enabled
      if (!wasEnabled && tuiModeEnabled && tuiElements.length > 0) {
        // Find first element (sort by row, then col)
        const sorted = [...tuiElements].sort((a, b) => a.row - b.row || a.col - b.col);
        const first = sorted[0];
        // Scroll only if element is not in view
        if (first.row < Viewport.start) {
          // Element is above viewport, scroll up so element is at top
          Viewport.start = first.row;
        } else if (first.row >= Viewport.start + Viewport.size) {
          // Element is below viewport, scroll down so element is at bottom
          Viewport.start = first.row - Viewport.size + 1;
        }
        // Set cursor to element position (viewport-relative)
        Selection.setCursor({ row: first.row - Viewport.start, col: first.col });
      }
      render(true);
    },

    /**
     * Adds a button element at the specified position.
     * @param {Object} params - Button parameters
     * @param {number} params.row - Absolute row position
     * @param {number} params.col - Column position
     * @param {string} params.label - Button text
     * @param {boolean} [params.border=false] - Whether to draw a border around the button
     * @param {function(TUIElement): void} [params.onActivate] - Callback when button is activated
     * @returns {number} The element ID
     */
    addButton({ row, col, label, border, onActivate }) {
      if (border) {
        const line = '+' + '-'.repeat(label.length) + '+';
        const contents = [line, '|' + label + '|', line];
        return addElement({ type: 'button', row, col, contents, onActivate });
      } else {
        return addElement({ type: 'button', row, col, contents: [label], onActivate });
      }
    },

    /**
     * Adds a prompt (text input) element at the specified position.
     * @param {Object} params - Prompt parameters
     * @param {number} params.row - Absolute row position
     * @param {number} params.col - Column position
     * @param {number} params.width - Total width of the prompt box
     * @param {string} params.title - Title displayed in the top border
     * @param {function(TUIElement): void} [params.onActivate] - Callback when Enter is pressed
     * @returns {number} The element ID
     * @throws {Error} If width is too small for the title
     */
    addPrompt({ row, col, width, title, onActivate }) {
      const minWidth = title.length + 5; // 2 corners + 1 dash + 2 spaces + title
      if (width < minWidth) {
        throw new Error(`Width must be at least ${minWidth} for title "${title}"`);
      }

      const contents = buildPromptContents(width, title, '');
      const id = addElement({ type: 'prompt', row, col, width, height: 3, contents, onActivate });

      // Store title on the element for rebuilding contents when input changes
      const el = tuiElements.find(e => e.id === id);
      if (el) el.title = title;

      return id;
    },

    /**
     * Adds a scrollbox element at the specified position.
     * Scrollboxes display scrollable content with up/down navigation.
     * @param {Object} params - Scrollbox parameters
     * @param {number} params.row - Absolute row position
     * @param {number} params.col - Column position
     * @param {number} params.width - Total width of the scrollbox
     * @param {number} params.height - Total height of the scrollbox
     * @param {string} params.title - Title displayed in the top border
     * @param {string[]} params.lines - Content lines to display
     * @param {function(TUIElement): void} [params.onActivate] - Callback when Enter is pressed
     * @returns {number} The element ID
     * @throws {Error} If width is too small for the title or height < 3
     */
    addScrollBox({ row, col, width, height, title, lines, onActivate }) {
      const minWidth = title.length + 5;
      if (width < minWidth) {
        throw new Error(`Width must be at least ${minWidth} for title "${title}"`);
      }
      if (height < 3) {
        throw new Error('Height must be at least 3');
      }

      const contents = buildScrollBoxContents(width, height, title, lines, 0);
      const id = addElement({ type: 'scrollbox', row, col, width, height, contents, onActivate });

      // Store additional properties for scrolling
      const el = tuiElements.find(e => e.id === id);
      if (el) {
        el.title = title;
        el.contentLines = lines;
        el.scrollOffset = 0;
      }

      return id;
    },

    /**
     * Removes an element by its ID.
     * @param {number} id - The element ID to remove
     * @returns {boolean} True if element was found and removed
     */
    removeElement(id) {
      const index = tuiElements.findIndex(el => el.id === id);
      if (index !== -1) {
        const element = tuiElements[index];
        tuiElements.splice(index, 1);

        // Remove from row map
        const rowElements = tuiElementsByRow.get(element.row);
        if (rowElements) {
          const rowIndex = rowElements.findIndex(el => el.id === id);
          if (rowIndex !== -1) {
            rowElements.splice(rowIndex, 1);
          }
          if (rowElements.length === 0) {
            tuiElementsByRow.delete(element.row);
          }
        }

        render(true);
        return true;
      }
      return false;
    },

    /**
     * Direct access to the elements array for inspection.
     * @type {TUIElement[]}
     */
    elements: tuiElements,

    /**
     * Enables or disables highlight rendering for all elements.
     * @param {boolean} enabled - Whether to show highlights
     */
    setHighlight(enabled) {
      tuiHighlightState = !!enabled;
      render(true);
    },

    /**
     * Removes all TUI elements.
     */
    clear() {
      tuiElements.length = 0;
      tuiElementsByRow.clear();
      render(true);
    },

    /**
     * Moves cursor to the next element after current position.
     * Wraps to the first element if at the end.
     */
    nextElement() {
      if (tuiElements.length === 0) return;

      // Sort elements by row, then col
      const sorted = [...tuiElements].sort((a, b) => a.row - b.row || a.col - b.col);

      // Get absolute cursor position
      const cursorRow = Viewport.start + head.row;
      const cursorCol = head.col;

      // Find first element after cursor
      let next = sorted.find(el => el.row > cursorRow || (el.row === cursorRow && el.col > cursorCol));

      // If none found, wrap to first element
      if (!next) {
        next = sorted[0];
      }

      // Scroll if needed
      if (next.row < Viewport.start) {
        Viewport.start = next.row;
      } else if (next.row >= Viewport.start + Viewport.size) {
        Viewport.start = next.row - Viewport.size + 1;
      }

      // Move cursor
      Selection.setCursor({ row: next.row - Viewport.start, col: next.col });
      render(true);
    },

    /**
     * Gets the element at the current cursor position.
     * @returns {TUIElement|null} Copy of the element, or null if cursor is not on an element
     */
    currentElement() {
      const cursorRow = Viewport.start + head.row;
      const cursorCol = head.col;

      for (const el of tuiElements) {
        if (el.row === cursorRow && cursorCol >= el.col && cursorCol < el.col + el.width) {
          return { ...el };
        }
      }
      return null;
    },

    /**
     * Activates the element at cursor position by calling its onActivate callback.
     * @returns {boolean} True if an element was activated
     */
    activateElement() {
      const cursorRow = Viewport.start + head.row;
      const cursorCol = head.col;

      for (const el of tuiElements) {
        if (el.row === cursorRow && cursorCol >= el.col && cursorCol < el.col + el.width) {
          if (el.onActivate) {
            el.onActivate(el);
          }
          return true;
        }
      }
      return false;
    },

    /**
     * Handles keydown events for the current element with type-specific behavior.
     * - Buttons: Enter activates
     * - Prompts: printable chars insert, Backspace deletes, Enter submits
     * - Scrollboxes: Arrow keys/j/k scroll, Enter activates
     * @param {string} key - The key that was pressed (e.g., 'Enter', 'a', 'ArrowDown')
     * @returns {boolean} True if the key was handled
     */
    handleKeyDown(key) {
      const cursorRow = Viewport.start + head.row;
      const cursorCol = head.col;

      // Find current element
      let currentEl = null;
      for (const el of tuiElements) {
        if (cursorRow >= el.row && cursorRow < el.row + el.height &&
            cursorCol >= el.col && cursorCol < el.col + el.width) {
          currentEl = el;
          break;
        }
      }

      if (!currentEl) return false;

      if (currentEl.type === 'button') {
        if (key === 'Enter') {
          if (currentEl.onActivate) currentEl.onActivate(currentEl);
          return true;
        }
      } else if (currentEl.type === 'prompt') {
        if (key === 'Enter') {
          if (currentEl.onActivate) currentEl.onActivate(currentEl);
          return true;
        } else if (key === 'Backspace') {
          if (currentEl.input.length > 0) {
            currentEl.input = currentEl.input.slice(0, -1);
            currentEl.contents = buildPromptContents(currentEl.width, currentEl.title, currentEl.input);
            markTuiDirty();
          }
          return true;
        } else if (key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) < 127) {
          // Printable ASCII
          currentEl.input += key;
          currentEl.contents = buildPromptContents(currentEl.width, currentEl.title, currentEl.input);
          markTuiDirty();
          return true;
        }
      } else if (currentEl.type === 'scrollbox') {
        const contentHeight = currentEl.height - 2;
        const maxOffset = Math.max(0, currentEl.contentLines.length - contentHeight);

        if (key === 'ArrowDown' || key === 'j') {
          if (currentEl.scrollOffset < maxOffset) {
            currentEl.scrollOffset++;
            currentEl.contents = buildScrollBoxContents(
              currentEl.width, currentEl.height, currentEl.title,
              currentEl.contentLines, currentEl.scrollOffset
            );
            markTuiDirty();
          }
          return true;
        } else if (key === 'ArrowUp' || key === 'k') {
          if (currentEl.scrollOffset > 0) {
            currentEl.scrollOffset--;
            currentEl.contents = buildScrollBoxContents(
              currentEl.width, currentEl.height, currentEl.title,
              currentEl.contentLines, currentEl.scrollOffset
            );
            markTuiDirty();
          }
          return true;
        } else if (key === 'Enter') {
          if (currentEl.onActivate) currentEl.onActivate(currentEl);
          return true;
        }
      }

      return false;
    },

  };

  // ============================================================================
  // Register render hooks with vbuf
  // ============================================================================

  /**
   * Sets up highlight elements when viewport containers are rebuilt.
   */
  renderHooks.onContainerRebuild.push(($container, viewport) => {
    // Remove existing highlight elements
    for (const [_, hlArray] of $highlights) {
      for (const hl of hlArray) hl.remove();
    }
    $highlights.clear();

    // Create initial highlight elements for each viewport row
    for (let i = 0; i < viewport.size; i++) {
      const hl = createHighlightElement(i);
      $container.appendChild(hl);
      $highlights.set(i, [hl]);
    }
  });

  /**
   * Renders TUI elements text content into the viewport.
   */
  renderHooks.onRenderContent.push(($container, viewport) => {
    if (!tuiModeEnabled || tuiElements.length === 0) return;

    for (const el of tuiElements) {
      for (let i = 0; i < el.contents.length; i++) {
        const viewportRow = el.row + i - viewport.start;
        if (viewportRow >= 0 && viewportRow < viewport.size) {
          const $line = $container.children[viewportRow];
          let text = $line.textContent || '';

          // Pad with spaces if line is shorter than element position
          while (text.length < el.col + el.width) {
            text += ' ';
          }

          // Overwrite characters at element position
          const before = text.slice(0, el.col);
          const after = text.slice(el.col + el.width);
          $line.textContent = before + el.contents[i] + after;
        }
      }
    }
  });

  /**
   * Renders TUI element highlights.
   */
  renderHooks.onRenderComplete.push(($container, viewport) => {
    // Hide all highlights first
    for (const [_, hlArray] of $highlights) {
      for (const hl of hlArray) {
        hl.style.visibility = 'hidden';
      }
    }

    if (!tuiModeEnabled || tuiElements.length === 0) return;

    // Group highlighted elements by viewport row (for each content line)
    const highlightedByRow = new Map();
    for (const el of tuiElements) {
      if (tuiHighlightState) {
        for (let i = 0; i < el.contents.length; i++) {
          const viewportRow = el.row + i - viewport.start;
          if (viewportRow >= 0 && viewportRow < viewport.size) {
            if (!highlightedByRow.has(viewportRow)) {
              highlightedByRow.set(viewportRow, []);
            }
            highlightedByRow.get(viewportRow).push(el);
          }
        }
      }
    }

    // Render highlights, adding extra highlight elements if needed
    for (const [viewportRow, elements] of highlightedByRow) {
      let hlArray = $highlights.get(viewportRow);
      if (!hlArray) {
        hlArray = [];
        $highlights.set(viewportRow, hlArray);
      }

      // Add more highlight elements if needed (never remove)
      while (hlArray.length < elements.length) {
        addHighlightForRow(viewportRow);
      }

      // Show highlights for each element
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const hl = hlArray[i];
        hl.style.left = el.col + 'ch';
        hl.style.width = el.width + 'ch';
        hl.style.visibility = 'visible';
      }
    }
  });

  // Attach TUI to the vbuf instance
  vbuf.TUI = TUI;

  return TUI;
}
