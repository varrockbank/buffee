/**
 * @fileoverview BuffeeElementals - Layer-based UI elements for Buffee.
 * Unlike tui-legacy which manipulates textContent, Elementals creates
 * actual DOM elements in a dedicated layer above the text.
 * @version 1.0.0
 */

/**
 * Initializes Elementals extension for a Buffee instance.
 * Creates UI elements (buttons, labels, inputs) as DOM nodes in the element layer.
 *
 * @param {Buffee} editor - The Buffee instance to extend
 * @returns {Object} The Elementals API object
 */
function BuffeeElementals(editor) {
  const $e = editor._$e;
  const render = editor._render;
  const renderHooks = editor._renderHooks;
  const { Viewport, lineHeight } = editor;
  const $elementLayer = $e.querySelector('.buffee-layer-elements');

  let enabled = false;
  let clickable = false;
  let elementIdCounter = 0;
  const elements = [];
  let focusedIndex = -1;

  /**
   * Creates a positioned container for an element.
   * @private
   */
  function createContainer(row, col, opts = {}) {
    const container = document.createElement("div");
    container.className = "buffee-elemental";
    Object.assign(container.style, {
      position: 'absolute',
      top: row * lineHeight + 'px',
      left: col + 'ch',
      height: lineHeight + 'px',
      lineHeight: lineHeight + 'px',
      fontSize: lineHeight + 'px',
      pointerEvents: 'auto',
      whiteSpace: 'nowrap',
      ...opts
    });
    return container;
  }

  /**
   * Updates element positions based on viewport scroll.
   * @private
   */
  function updatePositions() {
    for (const el of elements) {
      const viewportRow = el.row - Viewport.start;
      if (viewportRow >= 0 && viewportRow < Viewport.size) {
        el.$container.style.top = viewportRow * lineHeight + 'px';
        el.$container.style.display = '';
      } else {
        el.$container.style.display = 'none';
      }
    }
  }

  /**
   * Updates focus styling on elements.
   * @private
   */
  function updateFocus() {
    elements.forEach((el, i) => {
      if (i === focusedIndex) {
        el.$container.classList.add('buffee-elemental-focused');
      } else {
        el.$container.classList.remove('buffee-elemental-focused');
      }
    });
  }

  // Register render hook to update positions when viewport changes
  renderHooks.onRenderComplete.push(() => {
    if (enabled) {
      updatePositions();
    }
  });

  const Elementals = {
    /**
     * Whether Elementals mode is enabled.
     * When enabled, keyboard navigation between elements is active.
     */
    get enabled() { return enabled; },
    set enabled(value) {
      enabled = !!value;
      if (enabled && elements.length > 0 && focusedIndex === -1) {
        focusedIndex = 0;
        updateFocus();
      }
      // Set read-only mode to hide cursor/selection when elementals is enabled
      editor.Mode.interactive = enabled ? -1 : 1;
      render();
    },

    /**
     * Whether elements respond to mouse clicks.
     * Must be set before adding elements. Default: false
     */
    get clickable() { return clickable; },
    set clickable(value) { clickable = !!value; },

    /**
     * Adds a button element.
     * @param {Object} opts - Button options
     * @param {number} opts.row - Absolute row position
     * @param {number} opts.col - Column position
     * @param {string} opts.label - Button text
     * @param {function} [opts.onActivate] - Callback when activated
     * @returns {number} Element ID
     */
    addButton({ row, col, label, onActivate }) {
      const id = ++elementIdCounter;
      const $container = createContainer(row, col);

      const $button = document.createElement("span");
      $button.className = "buffee-elemental-button";
      $button.textContent = label;
      if (clickable) $button.style.cursor = 'pointer';

      $container.appendChild($button);
      $elementLayer.appendChild($container);

      const element = {
        id,
        type: 'button',
        row,
        col,
        $container,
        $button,
        onActivate: onActivate || null
      };
      elements.push(element);

      // Click handler (only when clickable is enabled)
      if (clickable) {
        $button.addEventListener('click', () => {
          if (element.onActivate) element.onActivate(element);
        });
      }

      updatePositions();
      return id;
    },

    /**
     * Adds a label element (non-interactive text).
     * @param {Object} opts - Label options
     * @param {number} opts.row - Absolute row position
     * @param {number} opts.col - Column position
     * @param {string} opts.text - Label text
     * @returns {number} Element ID
     */
    addLabel({ row, col, text }) {
      const id = ++elementIdCounter;
      const $container = createContainer(row, col);
      $container.style.pointerEvents = 'none';

      const $label = document.createElement("span");
      $label.className = "buffee-elemental-label";
      $label.textContent = text;

      $container.appendChild($label);
      $elementLayer.appendChild($container);

      const element = {
        id,
        type: 'label',
        row,
        col,
        $container,
        $label,
        focusable: false
      };
      elements.push(element);

      updatePositions();
      return id;
    },

    /**
     * Adds an input field element.
     * @param {Object} opts - Input options
     * @param {number} opts.row - Absolute row position
     * @param {number} opts.col - Column position
     * @param {number} opts.width - Width in characters
     * @param {string} [opts.placeholder] - Placeholder text
     * @param {function} [opts.onSubmit] - Callback when Enter is pressed
     * @returns {number} Element ID
     */
    addInput({ row, col, width, placeholder, onSubmit }) {
      const id = ++elementIdCounter;
      const $container = createContainer(row, col);

      const $input = document.createElement("input");
      $input.type = "text";
      $input.className = "buffee-elemental-input";
      $input.placeholder = placeholder || '';
      Object.assign($input.style, {
        width: width + 'ch',
        height: lineHeight + 'px',
        lineHeight: lineHeight + 'px',
        fontSize: (lineHeight - 4) + 'px',
        border: '1px solid currentColor',
        background: 'inherit',
        color: 'inherit',
        padding: '0 4px',
        boxSizing: 'border-box'
      });

      $container.appendChild($input);
      $elementLayer.appendChild($container);

      const element = {
        id,
        type: 'input',
        row,
        col,
        $container,
        $input,
        onSubmit: onSubmit || null,
        get value() { return $input.value; },
        set value(v) { $input.value = v; }
      };
      elements.push(element);

      // Enter key handler
      $input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && element.onSubmit) {
          e.preventDefault();
          element.onSubmit(element);
        }
        // Stop propagation so editor doesn't handle these keys
        e.stopPropagation();
      });

      updatePositions();
      return id;
    },

    /**
     * Removes an element by ID.
     * @param {number} id - Element ID
     * @returns {boolean} True if removed
     */
    removeElement(id) {
      const index = elements.findIndex(el => el.id === id);
      if (index !== -1) {
        const el = elements[index];
        el.$container.remove();
        elements.splice(index, 1);
        if (focusedIndex >= elements.length) {
          focusedIndex = elements.length - 1;
        }
        updateFocus();
        return true;
      }
      return false;
    },

    /**
     * Gets all focusable elements sorted by position.
     * @returns {Array} Sorted elements
     */
    getFocusableElements() {
      return elements
        .filter(el => el.focusable !== false && el.type !== 'label')
        .sort((a, b) => a.row - b.row || a.col - b.col);
    },

    /**
     * Moves focus to the next element.
     */
    nextElement() {
      const focusable = this.getFocusableElements();
      if (focusable.length === 0) return;

      const currentEl = focusedIndex >= 0 ? elements[focusedIndex] : null;
      const currentFocusableIndex = currentEl ? focusable.indexOf(currentEl) : -1;
      const nextIndex = (currentFocusableIndex + 1) % focusable.length;

      focusedIndex = elements.indexOf(focusable[nextIndex]);
      updateFocus();

      // If it's an input, focus it
      const focused = elements[focusedIndex];
      if (focused && focused.type === 'input') {
        focused.$input.focus();
      }
    },

    /**
     * Moves focus to the previous element.
     */
    prevElement() {
      const focusable = this.getFocusableElements();
      if (focusable.length === 0) return;

      const currentEl = focusedIndex >= 0 ? elements[focusedIndex] : null;
      const currentFocusableIndex = currentEl ? focusable.indexOf(currentEl) : 0;
      const prevIndex = (currentFocusableIndex - 1 + focusable.length) % focusable.length;

      focusedIndex = elements.indexOf(focusable[prevIndex]);
      updateFocus();

      const focused = elements[focusedIndex];
      if (focused && focused.type === 'input') {
        focused.$input.focus();
      }
    },

    /**
     * Activates the currently focused element.
     */
    activateFocused() {
      if (focusedIndex >= 0 && focusedIndex < elements.length) {
        const el = elements[focusedIndex];
        if (el.onActivate) {
          el.onActivate(el);
        } else if (el.onSubmit) {
          el.onSubmit(el);
        }
      }
    },

    /**
     * Handles keydown events for navigation.
     * @param {string} key - Key that was pressed
     * @returns {boolean} True if handled
     */
    handleKeyDown(key) {
      if (!enabled) return false;

      if (key === 'Tab') {
        this.nextElement();
        return true;
      } else if (key === 'Enter') {
        this.activateFocused();
        return true;
      }
      return false;
    },

    /**
     * Clears all elements.
     */
    clear() {
      for (const el of elements) {
        el.$container.remove();
      }
      elements.length = 0;
      focusedIndex = -1;
    },

    /**
     * Direct access to elements array.
     */
    elements
  };

  // Attach to editor instance
  editor.Elementals = Elementals;

  return Elementals;
}
