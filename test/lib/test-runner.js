/**
 * Buffee Test Runner
 *
 * Single file containing everything needed to run tests:
 * - TestRunner class (describe, it, run)
 * - EditorTestHarness (press, type)
 * - Key constants and utilities
 */

// ===========================================
// Key Constants
// ===========================================

const Key = {
  Enter: 'Enter',
  Backspace: 'Backspace',
  Tab: 'Tab',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown'
};

const VALID_KEYS = new Set(Object.values(Key));

// ===========================================
// Key Dispatch Utility
// ===========================================

function dispatchKey(node, key, modifiers = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
    bubbles: false,
    cancelable: true,
    metaKey: modifiers.meta || false,
    ctrlKey: modifiers.ctrl || false,
    shiftKey: modifiers.shift || false,
    altKey: modifiers.alt || false
  });
  node.dispatchEvent(event);
}

// ===========================================
// Test Runner
// ===========================================

class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.failFast = false;
  }

  describe(name, fn) {
    const suite = { name, tests: [], beforeEach: null };
    this.suites.push(suite);
    this.currentSuite = suite;
    fn();
    this.currentSuite = null;
  }

  it(name, fn, opts = {}) {
    if (!this.currentSuite) throw new Error('it() must be called inside describe()');
    this.currentSuite.tests.push({
      name, fn,
      fnSource: fn.toString(),
      description: opts.desc || '',
      file: opts.file || null,
      line: opts.line || null,
      status: 'pending'
    });
  }

  xit(name, fn, opts = {}) {
    if (!this.currentSuite) throw new Error('xit() must be called inside describe()');
    this.currentSuite.tests.push({ name, fn, description: opts.desc || '', status: 'skipped' });
  }

  beforeEach(fn) {
    if (!this.currentSuite) throw new Error('beforeEach() must be called inside describe()');
    this.currentSuite.beforeEach = fn;
  }

  async run() {
    const results = { total: 0, passed: 0, failed: 0, skipped: 0, stopped: false };

    for (const suite of this.suites) {
      const suiteResults = [];

      for (const test of suite.tests) {
        if (this.failFast && results.failed > 0) {
          results.stopped = true;
          test.status = 'skipped';
          results.skipped++;
          suiteResults.push(test);
          continue;
        }

        results.total++;

        if (test.status === 'skipped') {
          results.skipped++;
          suiteResults.push(test);
          continue;
        }

        // Wrap expect to capture errors but continue
        let firstError = null;
        const expectResults = [];
        let expectSequence = 0;
        const originalExpect = window.expect;

        window.expect = function(actual) {
          const matchers = originalExpect(actual);
          const wrapped = {};
          for (const key in matchers) {
            wrapped[key] = function(...args) {
              const seq = expectSequence++;
              try {
                matchers[key](...args);
                expectResults.push({ success: true, sequenceNum: seq });
              } catch (error) {
                expectResults.push({ success: false, sequenceNum: seq });
                if (!firstError) firstError = error;
              }
            };
          }
          return wrapped;
        };

        try {
          if (suite.beforeEach) suite.beforeEach();
          await test.fn();
          window.expect = originalExpect;

          test.status = firstError ? 'fail' : 'pass';
          if (firstError) {
            test.error = firstError;
            results.failed++;
          } else {
            results.passed++;
          }
          test.fixture = window.currentTestFixture;
          test.expectResults = expectResults;
        } catch (error) {
          window.expect = originalExpect;
          test.status = 'fail';
          test.error = firstError || error;
          test.fixture = window.currentTestFixture;
          test.expectResults = expectResults;
          results.failed++;
        }

        suiteResults.push(test);
      }

      suite.results = suiteResults;
    }

    return results;
  }
}

// ===========================================
// Editor Test Harness
// ===========================================

function createEditorNode() {
  const container = document.querySelector('.editor-container');
  const node = document.createElement('div');
  node.className = 'buffee';
  node.innerHTML = `
    <textarea class="buffee-clipboard-bridge" aria-hidden="true"></textarea>
    <div class="no-select buffee-elements">
      <div class="buffee-gutter"></div>
      <div class="buffee-lines" tabindex="0"><blockquote class="buffee-layer-text"></blockquote><div class="buffee-layer-elements"></div><div class="buffee-cursor"></div></div>
    </div>
    <div class="buffee-status">
      <div class="buffee-status-left"><span class="buffee-linecount"></span></div>
      <div class="buffee-status-right">
        Ln <span class="buffee-head-row"></span>, Col <span class="buffee-head-col"></span>
        <span class="buffee-status-divider">|</span>
        <span class="buffee-spaces"></span>
      </div>
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(node);
  return node;
}

class EditorTestHarness {
  constructor(node, size = 10) {
    this.node = node;
    this.blockquote = node.querySelector('.buffee-lines') || node;
    this.editor = new Buffee(node, { rows: size, callbacks: BuffeeStatusLine(node) });
    this.walkthrough = new Walkthrough();
    window.currentTestFixture = this;
  }

  press(key) {
    if (key.length > 1 && !VALID_KEYS.has(key)) {
      throw new Error(`Invalid key: '${key}'. Use type() for text or Key constant.`);
    }

    const blockquote = this.blockquote;
    const fixture = this;

    return {
      _key: key,
      _modifiers: {},

      withMetaKey() { this._modifiers.meta = true; return this; },
      withShiftKey() { this._modifiers.shift = true; return this; },
      withAltKey() { this._modifiers.alt = true; return this; },

      once() {
        const modStr = Object.keys(this._modifiers).filter(k => this._modifiers[k]).join('+');
        fixture.walkthrough.recordStep(modStr ? `press(${modStr}+${this._key})` : `press(${this._key})`, {
          type: 'press', key: this._key, modifiers: { ...this._modifiers }, count: 1
        });
        dispatchKey(blockquote, this._key, this._modifiers);
        return this;
      },

      times(count) {
        const modStr = Object.keys(this._modifiers).filter(k => this._modifiers[k]).join('+');
        fixture.walkthrough.recordStep(modStr ? `press(${modStr}+${this._key}).times(${count})` : `press(${this._key}).times(${count})`, {
          type: 'press', key: this._key, modifiers: { ...this._modifiers }, count
        });
        for (let i = 0; i < count; i++) dispatchKey(blockquote, this._key, this._modifiers);
        return this;
      }
    };
  }

  type(text) {
    this.walkthrough.recordStep(`type('${text}')`, { type: 'type', text });
    for (const char of text) dispatchKey(this.blockquote, char);
  }
}

const FixtureFactory = {
  forTest: () => new EditorTestHarness(createEditorNode(), 10),
  forWalkthrough: (node) => new EditorTestHarness(node, 10)
};
