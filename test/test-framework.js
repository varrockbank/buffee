// Simple test framework
class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
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
    this.currentSuite.tests.push({ name, fn, description, status: 'pending' });
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
    const results = { total: 0, passed: 0, failed: 0, skipped: 0 };

    for (const suite of this.suites) {
      const suiteResults = [];

      for (const test of suite.tests) {
        results.total++;

        if (test.status === 'skipped') {
          results.skipped++;
          suiteResults.push(test);
          continue;
        }

        try {
          if (suite.beforeEach) suite.beforeEach();
          await test.fn();

          test.status = 'pass';
          results.passed++;
        } catch (error) {
          test.status = 'fail';
          test.error = error;
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
    bubbles: true,
    cancelable: true,
    metaKey: modifiers.meta || false,
    ctrlKey: modifiers.ctrl || false,
    shiftKey: modifiers.shift || false,
    altKey: modifiers.alt || false
  });
  node.dispatchEvent(event);
}
