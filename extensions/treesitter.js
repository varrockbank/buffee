/**
 * @fileoverview BuffeeTreeSitter - Tree-sitter syntax highlighting extension for Buffee.
 * Provides syntax highlighting using Tree-sitter parsers.
 * @version 1.0.0
 */

/**
 * Initializes Tree-sitter syntax highlighting for a Buffee instance.
 * Renders at 60fps using a dirty flag pattern.
 *
 * @param {Buffee} vbuf - The Buffee instance to extend
 * @param {Object} options - Tree-sitter configuration
 * @param {Object} options.parser - Tree-sitter parser instance
 * @param {Object} options.query - Tree-sitter query for capturing syntax nodes
 * @returns {Object} The TreeSitter API object
 * @example
 * const editor = new Buffee(document.getElementById('editor'));
 * const TreeSitter = BuffeeTreeSitter(editor, { parser: jsParser, query: jsQuery });
 * TreeSitter.enabled = true;
 */
function BuffeeTreeSitter(vbuf, { parser, query }) {
  const { $e, render, renderHooks } = vbuf._internals;
  const { Viewport, Model } = vbuf;

  /** @type {boolean} */
  let enabled = false;
  /** @type {boolean} Dirty flag - when true, needs re-parsing */
  let dirty = false;
  /** @type {Object|null} Current parse tree */
  let tree = null;
  /** @type {Array} Current captures from query */
  let captures = [];

  /**
   * Marks syntax highlighting as dirty, will be re-parsed on next frame.
   */
  function markDirty() {
    dirty = true;
  }

  /**
   * Render loop - runs at 60fps, re-parses and renders if dirty.
   * @private
   */
  function renderLoop() {
    if (dirty && enabled) {
      dirty = false;
      // Re-parse the document
      const text = Model.lines.join("\n");
      tree = parser.parse(text);
      captures = query.captures(tree.rootNode);
      render(false);
    }
    requestAnimationFrame(renderLoop);
  }
  // Start the render loop
  requestAnimationFrame(renderLoop);

  /**
   * Applies syntax highlighting to a viewport line.
   * @private
   * @param {HTMLElement} $line - The line element
   * @param {number} absoluteRow - The absolute row number in the document
   * @param {number} startIndex - Starting index in captures array for optimization
   * @returns {number} The index where we stopped searching (for optimization)
   */
  function highlightLine($line, absoluteRow, startIndex) {
    for (let j = startIndex; j < captures.length; j++) {
      const capture = captures[j];
      const startPosition = capture.node.startPosition;

      if (startPosition.row === absoluteRow) {
        const startCol = startPosition.column;
        const endCol = startCol + capture.node.text.length;

        const line = $line.textContent;
        const left = line.slice(0, startCol);
        const right = line.slice(endCol);

        // Apply highlighting based on capture name
        if (capture.name === "function") {
          if (left.length > 8) {
            const leftA = left.slice(0, left.length - 9);
            const leftB = left.slice(left.length - 9);
            $line.innerHTML = `${leftA}<span class="highlight-function">${leftB}</span><span class="highlight-function-name">${capture.node.text}</span>${right}`;
          }
        } else if (capture.name === "string") {
          $line.innerHTML = `${left}<span class="highlight-string">${capture.node.text}</span>${right}`;
        }

        return j;
      }

      // If we've passed the row, stop searching
      if (startPosition.row > absoluteRow) {
        return j;
      }
    }
    return captures.length;
  }

  // Register render hook for syntax highlighting
  renderHooks.onRenderContent.push(($container, viewport) => {
    if (!enabled || !tree || captures.length === 0) return;

    let minJ = 0;
    for (let i = 0; i < viewport.size; i++) {
      const $line = $container.children[i];
      // Clear any previous HTML and reset to text
      $line.innerHTML = "";
      $line.textContent = viewport.lines[i] || null;

      // Apply highlighting
      minJ = highlightLine($line, viewport.start + i, minJ);
    }
  });

  /**
   * Tree-sitter syntax highlighting API.
   * @namespace TreeSitter
   */
  const TreeSitter = {
    /**
     * Whether syntax highlighting is enabled.
     * @type {boolean}
     */
    get enabled() { return enabled; },
    set enabled(value) {
      enabled = !!value;
      if (enabled) {
        markDirty();
      } else {
        render(false);
      }
    },

    /**
     * Marks the document as needing re-parsing.
     * Call this after modifying document content.
     */
    markDirty,

    /**
     * Current parse tree (read-only).
     * @type {Object|null}
     */
    get tree() { return tree; },

    /**
     * Current captures from query (read-only).
     * @type {Array}
     */
    get captures() { return captures; },

    /**
     * Forces an immediate re-parse of the document.
     */
    reparse() {
      const text = Model.lines.join("\n");
      tree = parser.parse(text);
      captures = query.captures(tree.rootNode);
      render(false);
    }
  };

  // Attach to vbuf instance
  vbuf.TreeSitter = TreeSitter;

  return TreeSitter;
}
