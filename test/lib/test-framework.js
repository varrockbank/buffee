// Simple test framework
class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.failFast = false;
  }

  describe(name, fn) {
    const suite = { name, tests: [], beforeEach: null, afterEach: null };
    this.suites.push(suite);
    this.currentSuite = suite;
    fn();
    this.currentSuite = null;
  }

  it(name, fn, description = '') {
    if (!this.currentSuite) throw new Error('it() must be called inside describe()');
    this.currentSuite.tests.push({
      name,
      fn,
      fnSource: fn.toString(), // Save source code for walkthrough
      description,
      status: 'pending'
    });
  }

  xit(name, fn, description = '') {
    if (!this.currentSuite) throw new Error('xit() must be called inside describe()');
    this.currentSuite.tests.push({ name, fn, description, status: 'skipped' });
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
        // Fail-fast: stop if we already failed
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

        // Wrap expect to capture errors but continue execution
        let firstError = null;
        const expectResults = []; // Array of {success: boolean, sequenceNum: number}
        let expectSequence = 0;
        const originalExpect = window.expect;
        window.expect = function(actual) {
          const matchers = originalExpect(actual);
          const wrappedMatchers = {};

          for (const key in matchers) {
            wrappedMatchers[key] = function(...args) {
              const sequenceNum = expectSequence++;

              try {
                const result = matchers[key](...args);
                // Record successful expect with sequence number
                expectResults.push({ success: true, sequenceNum });
                return result;
              } catch (error) {
                // Record failed expect with sequence number
                expectResults.push({ success: false, sequenceNum });
                if (!firstError) {
                  firstError = error;
                }
                // Don't throw, just record the error and continue
              }
            };
          }

          return wrappedMatchers;
        };

        try {
          if (suite.beforeEach) suite.beforeEach();
          await test.fn();

          // Restore original expect
          window.expect = originalExpect;

          if (firstError) {
            test.status = 'fail';
            test.error = firstError;
            results.failed++;
          } else {
            test.status = 'pass';
            results.passed++;
          }

          // Capture fixture and expect results from global (set by EditorTestHarness constructor)
          test.fixture = window.currentTestFixture;
          test.expectResults = expectResults;
        } catch (error) {
          // Restore original expect
          window.expect = originalExpect;

          test.status = 'fail';
          test.error = firstError || error;
          // Capture fixture and expect results even on failure for debugging
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

// Low-level key dispatch utility
function dispatchKey(node, key, modifiers = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
    bubbles: false,  // Don't bubble - only for test/walkthrough simulation
    cancelable: true,
    metaKey: modifiers.meta || false,
    ctrlKey: modifiers.ctrl || false,
    shiftKey: modifiers.shift || false,
    altKey: modifiers.alt || false
  });
  node.dispatchEvent(event);
}
