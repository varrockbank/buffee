/**
 * @fileoverview BuffeeTUI - Terminal User Interface extension for Buffee.
 * Renders text-based UI elements (buttons, prompts, scrollboxes) by modifying line content.
 * Depends on BuffeeHighlights for rendering selection highlights.
 * @version 3.0.0
 */

/**
 * Initializes TUI mode for a Buffee instance.
 * Requires BuffeeHighlights to be initialized first.
 * @param {Buffee} vbuf - The Buffee instance to extend
 * @returns {Object} The TUI API object
 */
function BuffeeTUI(vbuf) {
  // Initialize highlights extension if not already done
  if (!vbuf.Highlights) {
    BuffeeHighlights(vbuf);
  }
  const Highlights = vbuf.Highlights;

  const { $textLayer, render, renderHooks } = vbuf._internals;
  const { Viewport, Model } = vbuf;

  let enabled = false;
  let currentIndex = 0;
  let showHighlights = true;
  const elements = [];

  // ============================================================================
  // Content Builders
  // ============================================================================

  function buildButtonContents(label, border) {
    if (border) {
      const line = '+' + '-'.repeat(label.length) + '+';
      return [line, '|' + label + '|', line];
    }
    return [label];
  }

  function buildPromptContents(width, title, input) {
    const innerWidth = width - 2;
    const titleLine = '┌─ ' + title + ' ' + '─'.repeat(innerWidth - title.length - 3) + '┐';
    const maxInput = innerWidth - 3;
    const displayInput = input.length > maxInput ? input.slice(-maxInput) : input;
    const inputLine = '│ > ' + displayInput + ' '.repeat(maxInput - displayInput.length) + '│';
    const bottomLine = '└' + '─'.repeat(innerWidth) + '┘';
    return [titleLine, inputLine, bottomLine];
  }

  function buildScrollBoxContents(width, height, title, lines, offset) {
    const innerWidth = width - 2;
    const innerHeight = height - 2;
    const contents = [];

    // Top border with title
    contents.push('┌─ ' + title + ' ' + '─'.repeat(innerWidth - title.length - 3) + '┐');

    // Content lines
    for (let i = 0; i < innerHeight; i++) {
      const line = lines[offset + i] || '';
      const padded = line.length > innerWidth
        ? line.slice(0, innerWidth)
        : line + ' '.repeat(innerWidth - line.length);
      contents.push('│' + padded + '│');
    }

    // Bottom border with scroll indicator
    const maxOffset = Math.max(0, lines.length - innerHeight);
    const pct = maxOffset === 0 ? 100 : Math.round((offset / maxOffset) * 100);
    const pctStr = ' ' + pct + '% ';
    contents.push('└' + '─'.repeat(innerWidth - pctStr.length) + pctStr + '┘');

    return contents;
  }

  // ============================================================================
  // Element Management
  // ============================================================================

  /**
   * Sorts elements by row-column order (row first, then column).
   * @private
   */
  function sortElements() {
    elements.sort((a, b) => a.row - b.row || a.col - b.col);
  }

  function addElement(el) {
    elements.push(el);
    sortElements();
    if (enabled) render(true);
    return el.id;
  }

  let nextId = 1;

  // ============================================================================
  // TUI API
  // ============================================================================

  const TUI = {
    get enabled() { return enabled; },
    set enabled(v) {
      const wasEnabled = enabled;
      enabled = !!v;
      vbuf.interactive = enabled ? -1 : 1;  // -1 = read-only (no cursor/selection)
      // Only reset currentIndex when transitioning from disabled to enabled
      if (enabled && !wasEnabled && elements.length > 0) {
        currentIndex = 0;
      }
      render(true);
    },

    get elements() { return elements; },

    addButton({ row, col, label, border = false, onActivate }) {
      const contents = buildButtonContents(label, border);
      return addElement({
        id: nextId++,
        type: 'button',
        row, col,
        width: contents[0].length,
        height: contents.length,
        contents,
        onActivate
      });
    },

    addPrompt({ row, col, width, title, onActivate }) {
      const contents = buildPromptContents(width, title, '');
      return addElement({
        id: nextId++,
        type: 'prompt',
        row, col, width,
        height: 3,
        contents,
        title,
        input: '',
        onActivate
      });
    },

    addScrollBox({ row, col, width, height, title, lines, onActivate }) {
      const contents = buildScrollBoxContents(width, height, title, lines, 0);
      return addElement({
        id: nextId++,
        type: 'scrollbox',
        row, col, width, height,
        contents,
        title,
        lines,
        scrollOffset: 0,
        onActivate
      });
    },

    removeElement(id) {
      const idx = elements.findIndex(e => e.id === id);
      if (idx !== -1) {
        elements.splice(idx, 1);
        // Adjust currentIndex: if removed element was before current, shift down
        if (idx < currentIndex) {
          currentIndex--;
        } else if (currentIndex >= elements.length) {
          currentIndex = Math.max(0, elements.length - 1);
        }
        render(true);
        return true;
      }
      return false;
    },

    clear() {
      elements.length = 0;
      currentIndex = 0;
      render(true);
    },

    currentElement() {
      return elements[currentIndex] || null;
    },

    /**
     * Sets the current focused element by index.
     * Wraps to 0 if index is out of bounds.
     * @param {number} idx - Index of element to focus
     */
    setCurrentIndex(idx) {
      if (elements.length === 0) return;
      if (idx >= 0 && idx < elements.length) {
        currentIndex = idx;
      } else {
        currentIndex = 0;
      }
      render(true);
    },

    nextElement() {
      if (elements.length === 0) return;
      currentIndex = (currentIndex + 1) % elements.length;
      render(true);
    },

    prevElement() {
      if (elements.length === 0) return;
      currentIndex = (currentIndex - 1 + elements.length) % elements.length;
      render(true);
    },

    activateElement() {
      const el = elements[currentIndex];
      if (el && el.onActivate) {
        el.onActivate(el);
        return true;
      }
      return false;
    },

    setHighlight(v) {
      showHighlights = !!v;
      render(true);
    },

    handleKeyDown(key) {
      const el = elements[currentIndex];
      if (!el) return false;

      if (el.type === 'button') {
        if (key === 'Enter') {
          if (el.onActivate) el.onActivate(el);
          return true;
        }
      } else if (el.type === 'prompt') {
        if (key === 'Enter') {
          if (el.onActivate) el.onActivate(el);
          return true;
        } else if (key === 'Backspace') {
          if (el.input.length > 0) {
            el.input = el.input.slice(0, -1);
            el.contents = buildPromptContents(el.width, el.title, el.input);
            render(true);
          }
          return true;
        } else if (key.length === 1 && key >= ' ' && key <= '~') {
          el.input += key;
          el.contents = buildPromptContents(el.width, el.title, el.input);
          render(true);
          return true;
        }
      } else if (el.type === 'scrollbox') {
        const maxOffset = Math.max(0, el.lines.length - (el.height - 2));
        if (key === 'ArrowDown' || key === 'j') {
          if (el.scrollOffset < maxOffset) {
            el.scrollOffset++;
            el.contents = buildScrollBoxContents(el.width, el.height, el.title, el.lines, el.scrollOffset);
            render(true);
          }
          return true;
        } else if (key === 'ArrowUp' || key === 'k') {
          if (el.scrollOffset > 0) {
            el.scrollOffset--;
            el.contents = buildScrollBoxContents(el.width, el.height, el.title, el.lines, el.scrollOffset);
            render(true);
          }
          return true;
        } else if (key === 'Enter') {
          if (el.onActivate) el.onActivate(el);
          return true;
        }
      }

      return false;
    }
  };

  // ============================================================================
  // Render Hooks
  // ============================================================================

  // Render element text content into the text layer
  renderHooks.onRenderContent.push(($container, viewport) => {
    if (!enabled || elements.length === 0) return;

    for (const el of elements) {
      for (let i = 0; i < el.contents.length; i++) {
        const absRow = el.row + i;
        const viewportRow = absRow - viewport.start;

        if (viewportRow >= 0 && viewportRow < viewport.size) {
          const $line = $textLayer.children[viewportRow];
          if (!$line) continue;

          let text = $line.textContent || '';

          // Ensure line is long enough
          while (text.length < el.col + el.width) {
            text += ' ';
          }

          // Splice in element content
          const before = text.slice(0, el.col);
          const after = text.slice(el.col + el.width);
          $line.textContent = before + el.contents[i] + after;
        }
      }
    }
  });

  // Render highlights using Highlights extension
  renderHooks.onRenderComplete.push(($container, viewport) => {
    Highlights.clear();

    if (!enabled || !showHighlights || elements.length === 0) return;

    const currentEl = elements[currentIndex];
    if (!currentEl) return;

    // Create highlights for current element
    for (let i = 0; i < currentEl.contents.length; i++) {
      const absRow = currentEl.row + i;
      const viewportRow = absRow - viewport.start;

      if (viewportRow >= 0 && viewportRow < viewport.size) {
        Highlights.create(viewportRow, currentEl.col, currentEl.width);
      }
    }
  });

  vbuf.TUI = TUI;
  return TUI;
}
