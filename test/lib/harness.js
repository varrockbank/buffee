/**
 * Test DSL for Buffee
 *
 * Object-oriented test environment that encapsulates a node and provides
 * literate methods for user interactions.
 *
 * Design Principles:
 * - Each test gets its own TestEditorEnvironment instance
 * - Literate syntax that reads like user actions
 * - Deferred execution (modifiers chain, execute on .once() or .times(n))
 *
 * Usage Example:
 *
 *   runner.beforeEach(() => {
 *     ({ wb, node, editor } = setupTestEditor());
 *   });
 *
 *   runner.it('should delete across line boundary', () => {
 *     editor.type('Hello');
 *     editor.press(Key.Enter).once();
 *     editor.type('World');
 *     editor.press(Key.ArrowLeft).withMetaKey().once();
 *     editor.press(Key.Backspace).once();
 *
 *     expect(wb.Model.lines).toEqual(['HelloWorld']);
 *   }, "Delete across boundaries");
 */

// DSL Constants
const Key = {
  Enter: 'Enter',
  Backspace: 'Backspace',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown'
};

// Valid key names for validation
const VALID_KEYS = new Set(Object.values(Key));

/**
 * Helper to create a new DOM node for EditorTestHarness
 */
function createEditorNode() {
  const container = document.querySelector('.editor-container');
  const node = document.createElement('div');
  node.className = 'wb';
  node.innerHTML = `
    <textarea class="wb-clipboard-bridge" aria-hidden="true"></textarea>
    <div class="no-select wb-elements">
      <div class="wb-gutter"></div>
      <div class="wb-lines" tabindex="0"><blockquote class="wb-layer-text"></blockquote><div class="wb-layer-elements"></div><div class="wb-cursor"></div></div>
    </div>
    <div class="wb-status">
      <div class="wb-status-left"><span class="wb-linecount"></span></div>
      <div class="wb-status-right">
        Ln <span class="wb-head-row"></span>, Col <span class="wb-head-col"></span>
        <span class="wb-status-divider">|</span>
        <span class="wb-indentation"></span>
      </div>
    </div>
  `;

  container.innerHTML = '';
  container.appendChild(node);
  return node;
}

/**
 * Test environment for a single editor instance.
 * Provides literate methods for user interactions.
 *
 * @param {HTMLElement} node - Required DOM node to attach to
 */
class EditorTestHarness {
  constructor(node, size = 10) {
    this.node = node;
    this.blockquote = node.querySelector('.wb-lines') || node;  // Event target
    this.wb = new Buffee(node, { viewportRows: size, callbacks: BuffeeStatusLine(node) });
    this.walkthrough = new Walkthrough();

    // Store reference for test framework
    window.currentTestFixture = this;
  }

  /**
   * Press a key with optional modifiers and repetition.
   *
   * @param {string} key - Single character or Key constant
   * @returns {Object} Builder with .withMetaKey(), .withShiftKey(), .once(), .times(n)
   *
   * @example
   *   editor.press(Key.Enter).once();
   *   editor.press(Key.Backspace).times(5);
   *   editor.press(Key.ArrowLeft).withMetaKey().once();
   *   editor.press(Key.ArrowRight).withShiftKey().withMetaKey().once();
   */
  press(key) {
    // Validate key
    if (key.length > 1 && !VALID_KEYS.has(key)) {
      throw new Error(`Invalid key: '${key}'. Use type() for typing text or use a Key constant.`);
    }

    const blockquote = this.blockquote;
    const fixture = this;
    const builder = {
      _key: key,
      _modifiers: {},

      withMetaKey() {
        this._modifiers.meta = true;
        return this;
      },

      withShiftKey() {
        this._modifiers.shift = true;
        return this;
      },

      withAltKey() {
        this._modifiers.alt = true;
        return this;
      },

      once() {
        const modStr = Object.keys(this._modifiers).filter(k => this._modifiers[k]).join('+');
        const desc = modStr ? `press(${modStr}+${this._key})` : `press(${this._key})`;
        fixture.walkthrough.recordStep(desc, {
          type: 'press',
          key: this._key,
          modifiers: { ...this._modifiers },
          count: 1
        });
        dispatchKey(blockquote, this._key, this._modifiers);
        return this;
      },

      times(count) {
        const modStr = Object.keys(this._modifiers).filter(k => this._modifiers[k]).join('+');
        const desc = modStr ? `press(${modStr}+${this._key}).times(${count})` : `press(${this._key}).times(${count})`;
        fixture.walkthrough.recordStep(desc, {
          type: 'press',
          key: this._key,
          modifiers: { ...this._modifiers },
          count: count
        });
        for (let i = 0; i < count; i++) {
          dispatchKey(blockquote, this._key, this._modifiers);
        }
        return this;
      }
    };

    return builder;
  }

  /**
   * Type text into the editor.
   *
   * @param {string} text - Text to type
   *
   * @example
   *   editor.type('Hello World');
   */
  type(text) {
    this.walkthrough.recordStep(`type('${text}')`, {
      type: 'type',
      text: text
    });
    for (const char of text) {
      dispatchKey(this.blockquote, char);
    }
  }
}

// EditorTestHarness factory
const FixtureFactory = {
  forTest: () => new EditorTestHarness(createEditorNode(), 10),
  forWalkthrough: (node) => new EditorTestHarness(node, 10)
};
